# Audio Transcription Tool with Speaker Identification For Minutes

This tool transcribes audio files, figures out who's speaking, and detects languages. Works great for phone calls, meetings, interviews - basically any recording with multiple people talking.

## What it does

You give it a WAV file of people talking, and it gives you back a transcript that shows:
- What was said (transcribed text)
- Who said it (Speaker 1, Speaker 2, etc.)
- When they said it (timestamps)
- What language they were speaking (English/Spanish detection)

Example output:
```
[en][0.50:5.30] Speaker 1: Hello, how can I help you today?
[es][5.80:10.20] Speaker 2: Hola, necesito información sobre mi cuenta.
[en][10.50:15.40] Speaker 1: Of course, let me pull up your account.
```

## Project Structure

Here's what your folder should look like:

```
Transcription_Minutes/
├── speaker_trans.py          # The main script
├── your_audio_file.wav          # Your audio file (WAV format)
├── chunks/                      # Created automatically - stores audio chunks
│   └── your_audio_file/
│       ├── chunk_0.wav
│       ├── chunk_1.wav
│       └── ...
├── transcriptions/              # Created automatically - individual chunk transcripts
│   ├── chunk_0_transcription.txt
│   ├── chunk_1_transcription.txt
│   └── ...
├── full_conversation_transcript.txt    # Generated - main output file
└── final_transcript_raw.txt            # Generated - raw format transcript
```

**What gets created automatically:**
- `chunks/` folder - holds split audio pieces (can delete after processing)
- `transcriptions/` folder - individual transcripts for each chunk
- `full_conversation_transcript.txt` - the clean conversation format (what you want)
- `final_transcript_raw.txt` - same content but with technical speaker IDs

You only need to create the main folder and put the script + audio file in it. Everything else gets created when you run the script.

## Requirements

**Computer specs:**
- 8GB RAM minimum (16GB better)
- 5-10GB free disk space
- GPU helps a lot but not required

**Software:**
- Python 3.8 or newer
- FFmpeg (for audio processing)
- Hugging Face account (free, I'll explain why below)

Check Python version:
```bash
python --version
```

## Installation

### Install Python packages

```bash
# Main AI framework
pip install torch torchvision torchaudio

# Audio transcription
pip install git+https://github.com/m-bain/whisperx.git

# Audio file handling
pip install pydub

# Speaker identification
pip install pyannote.audio

# Language detection
pip install langdetect

# Math/array operations
pip install numpy
```

Or install everything at once:
```bash
pip install torch torchvision torchaudio pydub pyannote.audio langdetect numpy && pip install git+https://github.com/m-bain/whisperx.git
```

### Install FFmpeg

FFmpeg handles audio file formats and conversions.

**Windows:**
```bash
choco install ffmpeg
```
Or download from ffmpeg.org and add to PATH

**Mac:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get install ffmpeg
```

Verify it worked:
```bash
ffmpeg -version
```

## Hugging Face Setup

You need this for the speaker identification part. The transcription uses an AI model that requires authentication.

### Why do I need a Hugging Face account?

The tool uses a model called `pyannote/speaker-diarization-3.0` to identify different speakers. This model is behind a "gate" - meaning you have to agree to their terms before downloading it. It's free, they just want to make sure people use it responsibly.

The speech-to-text part (Whisper) doesn't need any authentication. Only the speaker identification needs it.

### Getting your token

1. Go to huggingface.co and sign up (free)
2. Click your profile → Settings
3. Go to Access Tokens
4. Click "New token"
5. Name it whatever (like "audio-transcription")
6. Pick "Read" permission
7. Copy the token (starts with `hf_`)

### Request model access

1. Visit: https://huggingface.co/pyannote/speaker-diarization-3.0
2. Click "Agree and access repository"
3. Fill in the form (name, why you're using it)
4. Submit

Usually takes a few minutes to get approved, sometimes up to a day.

## Project Structure

Here's what your folder should look like:

```
Transcription_Minutes/
├── speaker_trans.py          # The main script
├── your_audio_file.wav          # Your audio file (WAV format)
├── chunks/                      # Created automatically - stores audio chunks
│   └── your_audio_file/
│       ├── chunk_0.wav
│       ├── chunk_1.wav
│       └── ...
├── transcriptions/              # Created automatically - individual chunk transcripts
│   ├── chunk_0_transcription.txt
│   ├── chunk_1_transcription.txt
│   └── ...
├── full_conversation_transcript.txt    # Generated - main output file
└── final_transcript_raw.txt            # Generated - raw format transcript
```

**What gets created automatically:**
- `chunks/` folder - holds split audio pieces (can delete after processing)
- `transcriptions/` folder - individual transcripts for each chunk
- `full_conversation_transcript.txt` - the clean conversation format (what you want)
- `final_transcript_raw.txt` - same content but with technical speaker IDs

You only need to create the main folder and put the script + audio file in it. Everything else gets created when you run the script.

## Configuration

Open the script and edit these lines at the top:

```python
AUDIO_PATH = "your_file.wav"                    # Your audio file
CHUNK_LENGTH_MS = 60 * 1000                     # Process in 1-minute chunks
HUGGINGFACE_TOKEN = "hf_paste_your_token_here"  # Your token from above
```

**About chunk length:**
- Larger = faster but uses more memory
- 60 seconds is a good default
- Try 30 seconds if you run out of memory
- Try 120 seconds if you have lots of RAM

## Preparing your audio

The script needs WAV files. If you have MP3, M4A, or other formats, convert first:

```bash
ffmpeg -i yourfile.mp3 output.wav
```

Put the WAV file in the same folder as the script.

## Running it

```bash
python transcribe_audio.py
```

That's it. You'll see progress messages as it works through the audio.

Processing time varies:
- With GPU: 1 hour of audio takes about 10-30 minutes
- Without GPU: 1 hour of audio takes 1-3 hours

## Output files

After it finishes, you get three things:

**full_conversation_transcript.txt** - The main file you probably want
```
[en][0.50:5.30] Speaker 1: Hello, how can I help you?
[es][5.80:10.20] Speaker 2: Necesito información.
```

**final_transcript_raw.txt** - Same but with original speaker IDs
```
[0.50s - 5.30s] Speaker SPEAKER_00: Hello, how can I help you?
[5.80s - 10.20s] Speaker SPEAKER_01: Necesito información.
```

**transcriptions/** folder - Individual chunk transcripts (can delete after)

## How it works

Here's what happens under the hood:

**1. Split audio into chunks**
Large audio files get split into smaller pieces (default 1 minute each). This prevents memory issues and makes processing more reliable.

**2. Transcribe each chunk**
Uses OpenAI's Whisper model to convert speech to text. Whisper is really good - it handles accents, background noise, and multiple languages. The model we use (large-v2) is the most accurate one.

**3. Get precise word timings**
WhisperX adds exact timestamps for each word. This is important for matching words to speakers later.

**4. Identify speakers**
Pyannote analyzes voice characteristics - pitch, tone, speaking patterns. It groups similar voices together and labels them. This is why you see Speaker 1, Speaker 2, etc.

**5. Detect languages**
Each segment gets checked to see if it's English or Spanish. Uses Google's language detection algorithm.

**6. Put it all together**
Combines all chunks, adjusts timestamps, maps speakers to numbers, and generates the final transcript.

## Libraries explained

Since you asked about the specific libraries:

**torch (PyTorch)** - The deep learning framework that runs the AI models. Think of it as the engine. Size: ~2GB

**whisperx** - Enhanced version of OpenAI's Whisper for speech-to-text. Better at getting precise word timings than the regular Whisper. Downloads the actual Whisper model (~3GB) on first run.

**pydub** - Handles audio file operations. Lets us split audio into chunks, read different formats, export files.

**pyannote.audio** - The speaker identification library. This is the one that needs the Hugging Face token. It downloads the diarization model (~180MB).

**langdetect** - Figures out what language text is in. Fast and lightweight, works for 55+ languages but we mainly use it for English/Spanish.

**numpy** - Foundational library for numerical operations. Other libraries use it internally for array/matrix math.

**ffmpeg** - Not a Python library but a command-line tool. Handles audio codecs and format conversions. Pydub uses it behind the scenes.

## What models get downloaded

On first run, several AI models get downloaded and cached:

**openai/whisper-large-v2** (~3GB)
- Does the speech-to-text transcription
- Trained on 680,000 hours of audio
- Supports 99 languages
- No token needed, fully open source

**pyannote/speaker-diarization-3.0** (~180MB)
- Identifies different speakers
- Made by French research institute CNRS
- Needs Hugging Face token (this is the gated one)
- Contains 3 sub-models: voice detection, voice fingerprinting, and clustering

**Alignment models** (~300-400MB per language)
- Gets precise word-level timestamps
- Language-specific (downloads English, Spanish, etc. as needed)
- No token needed

Total disk space: 4-5GB after everything downloads.

These get saved to `.cache` folder in your home directory. After first run, no re-downloading happens (works offline).

## About the Hugging Face token

The token is only used to download the speaker identification model. Here's what actually happens:

1. Script contacts Hugging Face servers
2. Sends your token to authenticate
3. Hugging Face checks if you have permission
4. If yes, downloads the model files to your computer
5. Model gets cached locally

Important things to know:
- Your audio files never leave your computer
- Token is only for downloading the model
- After first download, you don't need internet anymore
- Hugging Face doesn't see or track your audio
- You can work completely offline after initial setup

If you're concerned about security, you can use the CLI method instead:

```bash
huggingface-cli login
# Paste token when prompted
```

Then remove the token from the script. The CLI saves it securely.

## Common issues

**"CUDA out of memory"**
Your GPU ran out of space. Either reduce chunk size (`CHUNK_LENGTH_MS = 30 * 1000`) or force CPU mode by changing `DEVICE_STR = "cpu"`.

**"No module named X"**
Didn't install that package. Run the pip install commands again.

**"Authentication error"**
Token issue. Make sure you:
- Copied the token correctly
- Requested access to the diarization model
- Got the approval email from Hugging Face

**"FFmpeg not found"**
FFmpeg not installed or not in PATH. Follow the FFmpeg installation instructions for your OS.

**"No speakers detected"**
Audio quality might be too poor, or it's actually just one person talking. The model needs clear, distinct voices to separate speakers.

## Tips for best results

Audio quality matters:
- Clear recordings work way better than noisy ones
- Multiple people talking over each other constantly confuses the speaker identification
- Background music can mess up transcription accuracy
- Phone recordings usually work fine
- Zoom/Teams recordings work great

File preparation:
- Convert to mono (single channel) if you can
- 16kHz sample rate is optimal for speech
- Trim long silent sections at the beginning/end
- WAV format is most reliable

Processing tips:
- Use GPU if you have one (way faster)
- Close other programs to free up RAM
- Larger chunks = faster but more memory needed
- Start with a short test file to make sure everything works

## Customization

Change the Whisper model for speed vs accuracy:

```python
whisper_model = whisperx.load_model("base", device=DEVICE_STR)  # Faster, less accurate
whisper_model = whisperx.load_model("large-v2", device=DEVICE_STR)  # Slower, more accurate
```

Options: tiny, base, small, medium, large-v2

Force a specific language instead of auto-detect:

```python
result = whisper_model.transcribe(
    chunk_path,
    task="transcribe",
    language="es",  # Force Spanish
    batch_size=8
)
```

Adjust speaker sensitivity:

```python
diarization = diarization_pipeline(
    {"audio": chunk_path},
    min_speakers=2,  # Expected minimum
    max_speakers=5   # Expected maximum
)
```

## Summary

This tool combines three different AI systems:
- Whisper for transcription (OpenAI's model)
- WhisperX for precise timing
- Pyannote for speaker identification

The Hugging Face token is specifically for downloading the Pyannote speaker identification model, which is the only component that requires authentication. Everything else downloads automatically without any login.

Total setup time: ~15 minutes
First-run download: ~5GB
Processing speed: 10-30 minutes per audio hour (with GPU)

Once it's set up, you can process unlimited audio files offline.
