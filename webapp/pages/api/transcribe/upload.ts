import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import formidable, { File } from 'formidable'
import fs from 'fs'
import path from 'path'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // Parse form data
    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 500 * 1024 * 1024, // 500MB
      filename: (name, ext, part) => {
        return `${Date.now()}-${part.originalFilename}`
      }
    })

    const [fields, files] = await form.parse(req)

    const audioFile = files.audio?.[0]

    if (!audioFile) {
      return res.status(400).json({ message: 'No audio file provided' })
    }

    // Validate file type
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-wav']
    if (!allowedTypes.includes(audioFile.mimetype || '')) {
      fs.unlinkSync(audioFile.filepath)
      return res.status(400).json({
        message: 'Invalid file type. Please upload WAV, MP3, or MP4 audio files.'
      })
    }

    // Create transcription record
    const transcription = await prisma.transcription.create({
      data: {
        userId: (session.user as any).id,
        originalFilename: audioFile.originalFilename || 'unknown.wav',
        audioFilePath: audioFile.filepath,
        status: 'PENDING'
      }
    })

    return res.status(200).json({
      message: 'File uploaded successfully',
      transcriptionId: transcription.id
    })

  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
