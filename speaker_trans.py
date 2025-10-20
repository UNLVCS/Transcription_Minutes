import os
import torch
import whisperx
import numpy as np
from pydub import AudioSegment
from pathlib import Path
import gc
from pyannote.audio import Pipeline
from langdetect import detect, DetectorFactory


# Fix random language detection results
DetectorFactory.seed = 0

# ---- CONFIGURATION ---- #
AUDIO_PATH = "DL-3224001001_2025.01.03.wav"
CHUNK_LENGTH_MS = 60 * 1000  # 1 minute chunks
HUGGINGFACE_TOKEN = ""
# Convert string to torch.device object
DEVICE_STR = "cuda" if torch.cuda.is_available() else "cpu"
DEVICE = torch.device(DEVICE_STR)
# ---- STEP 1: Split Audio into Chunks ---- #
def split_audio(audio_path, chunk_length_ms=60 * 1000):
    audio = AudioSegment.from_wav(audio_path)
    chunks = []
    
    base_name = Path(audio_path).stem
    chunk_dir = Path("chunks") / base_name
    chunk_dir.mkdir(parents=True, exist_ok=True)

    for i in range(0, len(audio), chunk_length_ms):
        chunk = audio[i:i + chunk_length_ms]
        chunk_path = chunk_dir / f"chunk_{i // chunk_length_ms}.wav"
        chunk.export(chunk_path, format="wav")
        chunks.append(str(chunk_path))
    
    return chunks


# ---- STEP 2: Load Models ---- #
def load_models():
    # Load the WhisperX model - explicitly disable translation
    whisper_model = whisperx.load_model("large-v2", device=DEVICE_STR)  # WhisperX uses string
    
    try:
        # Load the diarization pipeline with more sensitive speaker detection
        diarization_pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.0", 
            use_auth_token=HUGGINGFACE_TOKEN
        )
        
        # Check if pipeline loaded correctly
        if diarization_pipeline is None:
            raise ValueError("Failed to load diarization pipeline - returned None")
            
        # Move to device after confirming it's not None
        # pyannote expects torch.device object, not string
        diarization_pipeline = diarization_pipeline.to(DEVICE)
        
    except Exception as e:
        print(f"Error loading diarization pipeline: {e}")
        print("Make sure your Hugging Face token is correct and has access to this model")
        raise
    
    return whisper_model, diarization_pipeline

# ---- STEP 3: Process Each Audio Chunk ---- #
def process_chunk(chunk_path, whisper_model, diarization_pipeline):
    print(f"Transcribing {chunk_path}...")
    
    # Clear GPU memory
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        gc.collect()
    
    # Critical settings to preserve Spanish:
    # - task="transcribe" (not "translate") 
    # - language=None (auto-detect)
    result = whisper_model.transcribe(
        chunk_path, 
        task="transcribe",  # Important: use "transcribe" not "translate"
        language=None,      # Auto-detect language
        batch_size=8
        # decode_options={"language_detection": True}
    )
   # Debug information
    detected_language = result.get("language", "unknown")
    print(f"Detected language: {detected_language}")
    
    # Print sample of raw transcription to verify languages
    if "segments" in result and result["segments"]:
        print("Sample transcription:")
        for i, seg in enumerate(result["segments"][:2]):  # Print first 2 segments
            print(f"Segment {i}: {seg['text']}")

    if "segments" not in result or not result["segments"]:
        print(f"Warning: No segments found in transcription for {chunk_path}. Skipping...")
        return []
    
    detected_language = result["language"]
    print(f"Detected language: {detected_language}")

    # Align the segments to get word-level timestamps
    try:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()
            
        model_a, metadata = whisperx.load_align_model(language_code=detected_language, device=DEVICE)
        aligned = whisperx.align(result["segments"], model_a, metadata, chunk_path, device=DEVICE)
        print(f"Aligned {len(aligned['segments'])} segments")
        # Detect language per segment
        for seg in aligned["segments"]:
            try:
                seg["language"] = detect(seg["text"])
            except:
                seg["language"] = detected_language  # fallback if detection fails

    except Exception as e:
        print(f"Error during alignment for {chunk_path}: {e}")
        return result["segments"]  # Return unaligned segments if alignment fails

    # Run speaker diarization with improved settings
    try:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()
            
        # Use PyAnnote's diarization directly
        diarization = diarization_pipeline({"audio": chunk_path})
        
        # Debug speaker detection
        speakers = list(diarization.labels())
        print(f"Detected {len(speakers)} speakers: {speakers}")
        
        # Convert PyAnnote output to WhisperX format
        diarize_segments = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            diarize_segments.append({
                "segment": {"start": turn.start, "end": turn.end},
                "speaker": speaker
            })
        
        if diarize_segments:
            print(f"Created {len(diarize_segments)} diarization segments")
            
            # Map the diarization to segments
            speaker_segments = []
            for seg in aligned["segments"]:
                seg_start = seg["start"]
                seg_end = seg["end"]
                
                # Find overlapping speaker segments
                matching_speakers = []
                for d_seg in diarize_segments:
                    d_start = d_seg["segment"]["start"]
                    d_end = d_seg["segment"]["end"]
                    
                    # Check for overlap
                    if max(seg_start, d_start) < min(seg_end, d_end):
                        matching_speakers.append(d_seg["speaker"])
                
                # Assign most frequent speaker if found
                if matching_speakers:
                    speaker = max(set(matching_speakers), key=matching_speakers.count)
                    seg["speaker"] = speaker
                else:
                    seg["speaker"] = "UNKNOWN"
                
                speaker_segments.append(seg)
                
            return speaker_segments
        else:
            print("No diarization segments found")
            return aligned["segments"]
            
    except Exception as e:
        print(f"Error during diarization for {chunk_path}: {e}")
        print("Returning aligned segments without speaker information")
        return aligned["segments"]

# ---- STEP 4: Save Transcription to File ---- #
def save_transcription_for_chunk(chunk_name, segments):
    if not segments:
        print(f"No segments found for {chunk_name}. Skipping file creation.")
        return

    # Create the 'transcriptions' folder if it doesn't exist
    os.makedirs('transcriptions', exist_ok=True)

    # Save the transcription to a file
    chunk_transcription_filename = f"transcriptions/{chunk_name}_transcription.txt"
    with open(chunk_transcription_filename, "w", encoding="utf-8") as f:
        for seg in segments:
            speaker = seg.get("speaker", "UNKNOWN")
            f.write(f"[{seg['start']:.2f}s - {seg['end']:.2f}s] Speaker {speaker}: {seg['text']}\n")
    
    print(f"Transcription for {chunk_name} saved to {chunk_transcription_filename}")

def detect_language(text):
    try:
        detected_lang = detect(text)
        if detected_lang not in ['en', 'es']:  # Limit to English and Spanish
            return 'en'  # Default to English if the language is not Spanish or English
        return detected_lang
    except Exception as e:
        print(f"Error in language detection: {e}")
        return 'en'  # Default to English in case of an error

def generate_conversation_transcript(segments):
    if not segments:
        return "No conversation detected."

    # Sort segments by start time
    segments.sort(key=lambda x: x["start"])

    # Map internal speaker IDs to numbers (1, 2, 3...)
    speaker_map = {}
    for seg in segments:
        speaker = seg.get("speaker", "UNKNOWN")
        if speaker not in speaker_map:
            speaker_map[speaker] = len(speaker_map) + 1

    # Generate the conversation transcript with language and time range
    lines = []
    for seg in segments:
        # Detect the language for each segment and limit it to English or Spanish
        language = detect_language(seg['text'])  # Use the language detection function
        speaker = seg.get("speaker", "UNKNOWN")
        speaker_num = speaker_map.get(speaker, "?")
        start = f"{seg['start']:.2f}"
        end = f"{seg['end']:.2f}"
        lines.append(f"[{language}][{start}:{end}] Speaker {speaker_num}: {seg['text']}")

    return "\n\n".join(lines)


# ---- STEP 6: Main Pipeline ---- #
def main(audio_path):
    # Load the required modules
    from pyannote.audio import Pipeline
    
    # Load models
    print("Loading models")
    whisper_model, diarization_pipeline = load_models()
    
    # Split audio into chunks
    print(f"Splitting audio file: {audio_path}")
    chunks = split_audio(audio_path, CHUNK_LENGTH_MS)
    print(f"Created {len(chunks)} chunks")
    
    all_segments = []

    # Process each chunk
    for i, chunk in enumerate(chunks):
        chunk_name = Path(chunk).stem
        print(f"\n Processing {chunk} ({i+1}/{len(chunks)}) ---")
        
        segments = process_chunk(chunk, whisper_model, diarization_pipeline)

        if not segments:
            print(f"No segments found for {chunk}.")
            continue

        # Apply time offset based on chunk position
        chunk_offset_sec = i * (CHUNK_LENGTH_MS / 1000)
        for seg in segments:
            seg["start"] += chunk_offset_sec
            seg["end"] += chunk_offset_sec

        # Save individual chunk transcription
        save_transcription_for_chunk(chunk_name, segments)
        
        # Add to complete transcript
        all_segments.extend(segments)

        # Clean up memory
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()

    # Generate final transcripts
    if all_segments:
        # Sort all segments by start time
        all_segments.sort(key=lambda x: x["start"])
        
        # Save as raw transcript with original speaker IDs
        with open("final_transcript_raw.txt", "w", encoding="utf-8") as f:
            for seg in all_segments:
                speaker = seg.get("speaker", "UNKNOWN")
                f.write(f"[{seg['start']:.2f}s - {seg['end']:.2f}s] Speaker {speaker}: {seg['text']}\n")
        
        # Save as conversation with numbered speakers
        language = all_segments[0].get("language", "unknown") if all_segments else "unknown"
        conversation_transcript = generate_conversation_transcript(all_segments)


        with open("full_conversation_transcript.txt", "w", encoding="utf-8") as f:
            f.write(conversation_transcript)
        
        print("\n--- SAMPLE OF CONVERSATION TRANSCRIPT ---\n")
        preview = conversation_transcript[:1000] + "..." if len(conversation_transcript) > 1000 else conversation_transcript
        print(preview)
        print("\n Full conversation saved to full_conversation_transcript.txt")
        print("Raw transcript saved to final_transcript_raw.txt")
    else:
        print("No segments to save in final transcription.")

if __name__ == "__main__":
    main(AUDIO_PATH)
