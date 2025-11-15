# Audio Transcription Web Application

A full-stack web application for audio transcription with speaker diarization, built with Next.js, Prisma, and AI-powered transcription models.

## Features

- 🎤 **Speaker Diarization**: Automatically identifies and labels different speakers
- 🌍 **Multi-Language Support**: Supports English, Spanish, and automatic language detection
- 👥 **User Management**: Secure authentication with admin approval system
- 📊 **Admin Dashboard**: Manage users and monitor system usage
- 📥 **Easy Downloads**: Download transcripts in both raw and formatted versions
- ⚡ **Background Processing**: Long audio files process in the background
- 🔒 **Secure**: User authentication with NextAuth.js and approval workflow

## Tech Stack

### Frontend
- **Next.js 14** - React framework with server-side rendering
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **NextAuth.js** - Authentication system

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma** - Type-safe ORM
- **SQLite** - Database (easily upgradable to PostgreSQL)
- **Python Integration** - For AI transcription processing

### AI Models
- **WhisperX (large-v2)** - Speech recognition
- **PyAnnote Audio 3.0** - Speaker diarization
- **LangDetect** - Language identification

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Python 3.8+** with the following packages:
   - torch
   - whisperx
   - pyannote.audio
   - pydub
   - langdetect
3. **HuggingFace Account** - For PyAnnote model access
4. **CUDA** (optional, for GPU acceleration)

## Installation

### 1. Clone the repository

```bash
cd Transcription_Minutes/webapp
```

### 2. Install Node.js dependencies

```bash
npm install
```

### 3. Install Python dependencies

```bash
cd ..
pip install torch whisperx pyannote.audio pydub langdetect
```

### 4. Configure environment variables

Edit `webapp/.env.local`:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-change-this-in-production

# HuggingFace Token for PyAnnote
HUGGINGFACE_TOKEN=your_huggingface_token_here

# Python path
PYTHON_PATH=python3
```

**Get your HuggingFace token:**
1. Create an account at https://huggingface.co
2. Go to Settings → Access Tokens
3. Create a new token
4. Accept the PyAnnote model license at: https://huggingface.co/pyannote/speaker-diarization-3.0

### 5. Set up the database

```bash
cd webapp
chmod +x scripts/setup-db.sh
./scripts/setup-db.sh
```

This will:
- Create the SQLite database
- Run Prisma migrations
- Generate Prisma client
- Create an initial admin user

**Initial Admin Credentials:**
- Email: `admin@localhost`
- Password: `admin123`

⚠️ **IMPORTANT**: Change this password after first login and delete this account after creating a real admin user!

## Running the Application

### Development Mode

```bash
cd webapp
npm run dev
```

Visit http://localhost:3000

### Production Mode

```bash
npm run build
npm start
```

## Usage Guide

### For Users

1. **Register**: Create an account at `/auth/register`
2. **Wait for Approval**: An admin must approve your account
3. **Sign In**: Log in at `/auth/signin`
4. **Upload Audio**: Go to `/transcribe` and upload your audio file
5. **Wait for Processing**: Processing happens in the background
6. **Download Transcript**: Download when status shows "COMPLETED"

### For Admins

1. **Sign In**: Use initial admin credentials or your admin account
2. **Access Admin Panel**: Navigate to `/admin`
3. **Approve Users**: Review and approve pending user registrations
4. **Manage Users**: Change roles, revoke approval, or delete users
5. **Monitor Activity**: View user statistics and transcription counts

## Project Structure

```
webapp/
├── pages/
│   ├── api/
│   │   ├── auth/          # Authentication endpoints
│   │   ├── admin/         # Admin management endpoints
│   │   └── transcribe/    # Transcription endpoints
│   ├── auth/              # Auth pages (signin, register)
│   ├── admin.tsx          # Admin dashboard
│   ├── transcribe.tsx     # Transcription interface
│   └── index.tsx          # Home page
├── components/
│   └── Layout.tsx         # Main layout component
├── lib/
│   └── prisma.ts          # Prisma client
├── prisma/
│   └── schema.prisma      # Database schema
├── scripts/
│   ├── create-admin.ts    # Admin creation script
│   └── setup-db.sh        # Database setup script
├── public/
│   ├── uploads/           # Uploaded audio files (temporary)
│   └── transcriptions/    # Generated transcripts
└── styles/
    └── globals.css        # Global styles

transcribe_api.py          # Python API wrapper for transcription
speaker_trans.py           # Original transcription script
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Admin
- `GET /api/admin/users` - List all users (admin only)
- `PATCH /api/admin/users` - Approve/delete/modify users (admin only)

### Transcription
- `POST /api/transcribe/upload` - Upload audio file
- `POST /api/transcribe/process` - Start transcription processing
- `GET /api/transcribe/list` - List user's transcriptions
- `GET /api/transcribe/[id]` - Get specific transcription

## Supported Audio Formats

- WAV (recommended for best quality)
- MP3
- MP4

Max file size: 500MB

## Output Formats

### Raw Transcript
```
[0.00s - 2.50s] Speaker SPEAKER_00: Hello, how are you?
[2.50s - 5.30s] Speaker SPEAKER_01: I'm doing great, thanks!
```

### Formatted Transcript
```
[en][0.00:2.50] Speaker 1: Hello, how are you?

[en][2.50:5.30] Speaker 2: I'm doing great, thanks!
```

## Feeding Transcripts to ChatGPT for Minutes

After downloading your transcript, you can upload it to ChatGPT with prompts like:

```
Please create professional meeting minutes from this transcript, including:
- Date and attendees
- Key discussion points
- Decisions made
- Action items with assigned owners
- Next steps
```

## Database Schema

### User Model
- `id`: Unique identifier
- `email`: User email (unique)
- `username`: Username (unique)
- `password`: Hashed password
- `name`: Full name (optional)
- `role`: USER or ADMIN
- `approved`: Approval status (boolean)

### Transcription Model
- `id`: Unique identifier
- `userId`: Reference to user
- `originalFilename`: Original audio filename
- `audioFilePath`: Path to uploaded file
- `status`: PENDING | PROCESSING | COMPLETED | FAILED
- `transcriptRaw`: Raw transcript text
- `transcriptFinal`: Formatted transcript text
- `errorMessage`: Error details if failed

## Troubleshooting

### Port Already in Use
```bash
# Use a different port
npm run dev -- -p 3001
```

### Python Not Found
```bash
# Update .env.local with correct Python path
PYTHON_PATH=/usr/bin/python3
```

### GPU/CUDA Issues
The application works on CPU, but GPU significantly improves speed. If CUDA errors occur, the system automatically falls back to CPU.

### HuggingFace Token Issues
Make sure you:
1. Have accepted the PyAnnote model license
2. Token is correctly set in `.env.local`
3. Token has read permissions

### Database Migration Issues
```bash
# Reset database
rm -rf prisma/dev.db
npx prisma migrate reset
./scripts/setup-db.sh
```

## Security Considerations

1. **Change Default Admin Password**: Immediately after setup
2. **Use Strong NEXTAUTH_SECRET**: Generate with `openssl rand -base64 32`
3. **Enable HTTPS**: In production environments
4. **Environment Variables**: Never commit `.env.local` to git
5. **File Uploads**: Validate all uploaded files
6. **Rate Limiting**: Consider adding rate limiting in production

## Performance Tips

1. **Use GPU**: Significantly faster transcription (10x+)
2. **Chunk Size**: Default 60s chunks work well; adjust in `transcribe_api.py` if needed
3. **File Format**: WAV files process fastest
4. **Database**: Upgrade to PostgreSQL for production with many users

## Future Enhancements

- [ ] Support for more audio formats
- [ ] Real-time processing status updates via WebSockets
- [ ] Batch processing multiple files
- [ ] Custom speaker labels
- [ ] Export to different formats (JSON, SRT, VTT)
- [ ] Integration with cloud storage (S3, Google Drive)
- [ ] API key authentication for programmatic access

## License

This project is for educational and internal use.

## Support

For issues or questions, please refer to the documentation or contact the system administrator.

---

Built with ❤️ using Next.js, Prisma, WhisperX, and PyAnnote
