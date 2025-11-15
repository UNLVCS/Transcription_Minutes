#!/usr/bin/env python3
"""
API wrapper for the audio transcription system.
Called by the web application to process audio files.

Usage:
    python transcribe_api.py <audio_path> <output_raw> <output_final> <hf_token>
"""

import sys
import os
import torch
import whisperx
from pathlib import Path
import gc
from pyannote.audio import Pipeline
from langdetect import detect, DetectorFactory

# Fix random language detection results
DetectorFactory.seed = 0

def process_audio(audio_path, output_raw_path, output_final_path, hf_token):
    """Process an audio file and generate transcriptions."""

    # Configuration
    DEVICE_STR = "cuda" if torch.cuda.is_available() else "cpu"
    DEVICE = torch.device(DEVICE_STR)

    print(f"Using device: {DEVICE_STR}")
    print(f"Processing: {audio_path}")

    try:
        # Load models
        print("Loading WhisperX model...")
        whisper_model = whisperx.load_model("large-v2", device=DEVICE_STR)

        print("Loading diarization pipeline...")
        diarization_pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.0",
            use_auth_token=hf_token
        )

        if diarization_pipeline is None:
            raise ValueError("Failed to load diarization pipeline")

        diarization_pipeline = diarization_pipeline.to(DEVICE)

        # Transcribe
        print("Transcribing audio...")
        result = whisper_model.transcribe(
            audio_path,
            task="transcribe",
            language=None,
            batch_size=8
        )

        if "segments" not in result or not result["segments"]:
            print("Warning: No segments found in transcription")
            return

        detected_language = result.get("language", "unknown")
        print(f"Detected language: {detected_language}")

        # Align segments
        print("Aligning segments...")
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()

        model_a, metadata = whisperx.load_align_model(
            language_code=detected_language,
            device=DEVICE
        )
        aligned = whisperx.align(
            result["segments"],
            model_a,
            metadata,
            audio_path,
            device=DEVICE
        )

        # Add language detection per segment
        for seg in aligned["segments"]:
            try:
                seg["language"] = detect(seg["text"])
            except:
                seg["language"] = detected_language

        # Speaker diarization
        print("Running speaker diarization...")
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()

        diarization = diarization_pipeline({"audio": audio_path})
        speakers = list(diarization.labels())
        print(f"Detected {len(speakers)} speakers: {speakers}")

        # Convert diarization to segments
        diarize_segments = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            diarize_segments.append({
                "segment": {"start": turn.start, "end": turn.end},
                "speaker": speaker
            })

        # Map speakers to aligned segments
        speaker_segments = []
        for seg in aligned["segments"]:
            seg_start = seg["start"]
            seg_end = seg["end"]

            matching_speakers = []
            for d_seg in diarize_segments:
                d_start = d_seg["segment"]["start"]
                d_end = d_seg["segment"]["end"]

                if max(seg_start, d_start) < min(seg_end, d_end):
                    matching_speakers.append(d_seg["speaker"])

            if matching_speakers:
                speaker = max(set(matching_speakers), key=matching_speakers.count)
                seg["speaker"] = speaker
            else:
                seg["speaker"] = "UNKNOWN"

            speaker_segments.append(seg)

        # Generate outputs
        print("Generating transcripts...")

        # Sort by time
        speaker_segments.sort(key=lambda x: x["start"])

        # Create speaker mapping
        speaker_map = {}
        for seg in speaker_segments:
            speaker = seg.get("speaker", "UNKNOWN")
            if speaker not in speaker_map:
                speaker_map[speaker] = len(speaker_map) + 1

        # Save raw transcript
        with open(output_raw_path, "w", encoding="utf-8") as f:
            for seg in speaker_segments:
                speaker = seg.get("speaker", "UNKNOWN")
                f.write(f"[{seg['start']:.2f}s - {seg['end']:.2f}s] Speaker {speaker}: {seg['text']}\n")

        # Save formatted conversation
        with open(output_final_path, "w", encoding="utf-8") as f:
            for seg in speaker_segments:
                language = seg.get("language", "en")
                speaker = seg.get("speaker", "UNKNOWN")
                speaker_num = speaker_map.get(speaker, "?")
                start = f"{seg['start']:.2f}"
                end = f"{seg['end']:.2f}"
                f.write(f"[{language}][{start}:{end}] Speaker {speaker_num}: {seg['text']}\n\n")

        print("Transcription completed successfully!")
        print(f"Raw transcript: {output_raw_path}")
        print(f"Final transcript: {output_final_path}")

        # Cleanup
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()

    except Exception as e:
        print(f"Error during transcription: {e}", file=sys.stderr)
        raise

if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Usage: python transcribe_api.py <audio_path> <output_raw> <output_final> <hf_token>")
        sys.exit(1)

    audio_path = sys.argv[1]
    output_raw = sys.argv[2]
    output_final = sys.argv[3]
    hf_token = sys.argv[4]

    if not os.path.exists(audio_path):
        print(f"Error: Audio file not found: {audio_path}", file=sys.stderr)
        sys.exit(1)

    try:
        process_audio(audio_path, output_raw, output_final, hf_token)
    except Exception as e:
        print(f"Fatal error: {e}", file=sys.stderr)
        sys.exit(1)
