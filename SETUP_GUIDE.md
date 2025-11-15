# Quick Setup Guide

This guide will help you get the Audio Transcription Web Application running in minutes.

## Prerequisites Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Python 3.8+ installed (`python3 --version`)
- [ ] Git installed
- [ ] HuggingFace account created

## Step-by-Step Setup

### 1. Install Python Dependencies

```bash
# Navigate to project root
cd Transcription_Minutes

# Install required Python packages
pip install torch whisperx pyannote.audio pydub langdetect

# Or if you have requirements.txt
pip install -r requirements.txt
```

**Note**: If you have a GPU, install PyTorch with CUDA support for faster processing:
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### 2. Get HuggingFace Token

1. Go to https://huggingface.co and create an account
2. Navigate to Settings → Access Tokens
3. Click "New token" and create a token with READ permissions
4. Accept the PyAnnote model license:
   - Visit: https://huggingface.co/pyannote/speaker-diarization-3.0
   - Click "Agree and access repository"

### 3. Install Node.js Dependencies

```bash
cd webapp
npm install
```

### 4. Configure Environment

Edit `webapp/.env.local` and add your HuggingFace token:

```env
HUGGINGFACE_TOKEN=hf_your_token_here
```

Optional: Generate a secure NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### 5. Initialize Database

```bash
# Make setup script executable
chmod +x scripts/setup-db.sh

# Run setup
./scripts/setup-db.sh
```

This creates:
- SQLite database
- Initial admin user (username: `admin`, password: `admin123`)

### 6. Start the Application

```bash
npm run dev
```

Visit: http://localhost:3000

### 7. First Login

1. Go to http://localhost:3000/auth/signin
2. Login with:
   - Email: `admin@localhost`
   - Password: `admin123`
3. **IMPORTANT**: Consider creating a new admin account and deleting the default one

## Testing the Setup

### Test Transcription

1. Sign in as admin
2. Go to `/transcribe`
3. Upload a short audio file (WAV, MP3, or MP4)
4. Wait for processing (check status updates)
5. Download the transcript when complete

### Test User Management

1. Open incognito/private browser window
2. Register a new user at `/auth/register`
3. In your admin session, go to `/admin`
4. Approve the new user
5. Sign in as the new user and test transcription

## Quick Troubleshooting

### "Port 3000 already in use"
```bash
npm run dev -- -p 3001
```

### "Python command not found"
Update `.env.local`:
```env
PYTHON_PATH=/usr/bin/python3
```

### "HuggingFace token error"
- Verify you accepted the PyAnnote model license
- Check token is correctly copied (no extra spaces)
- Ensure token has READ permissions

### "Database migration failed"
```bash
# Reset database
rm -rf prisma/dev.db
npx prisma migrate reset
./scripts/setup-db.sh
```

### Transcription stays in "PROCESSING"
- Check Node.js console for Python errors
- Verify Python dependencies are installed
- Check HuggingFace token is valid
- For large files, processing can take 10+ minutes

## File Locations

- **Uploaded files**: `webapp/public/uploads/` (temporary)
- **Transcripts**: `webapp/public/transcriptions/`
- **Database**: `webapp/prisma/dev.db`
- **Logs**: Check terminal running `npm run dev`

## Next Steps

1. Change the default admin password
2. Configure `.env.local` for your environment
3. Test with various audio files
4. Set up regular users and test approval workflow
5. Consider deploying to a server for team access

## Production Deployment

For production deployment:

1. **Build the application**:
   ```bash
   npm run build
   npm start
   ```

2. **Use a production database**:
   - Switch from SQLite to PostgreSQL
   - Update `DATABASE_URL` in `.env.local`

3. **Set up a reverse proxy** (nginx/Apache)

4. **Enable HTTPS**

5. **Configure environment variables** securely

6. **Set up monitoring and logging**

7. **Implement backups** for database and transcripts

## Getting Help

- Check `webapp/README.md` for detailed documentation
- Review API endpoints in the code
- Check browser console for frontend errors
- Check terminal for backend errors
- Review Prisma schema for database structure

## Common Use Cases

### Meeting Transcription
1. Record your meeting as WAV/MP3
2. Upload to the application
3. Download formatted transcript
4. Feed to ChatGPT: "Create meeting minutes from this transcript"

### Interview Documentation
1. Upload interview recording
2. Get speaker-separated transcript
3. Identify speakers by number
4. Use for documentation or analysis

### Podcast Transcription
1. Upload podcast episode
2. Get timestamped transcript
3. Use for show notes or blog posts
4. Generate summaries with AI

---

**Ready to go!** 🚀

For detailed documentation, see `webapp/README.md`
