import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

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
    const { transcriptionId } = req.body

    if (!transcriptionId) {
      return res.status(400).json({ message: 'Missing transcription ID' })
    }

    // Get transcription record
    const transcription = await prisma.transcription.findUnique({
      where: { id: transcriptionId }
    })

    if (!transcription) {
      return res.status(404).json({ message: 'Transcription not found' })
    }

    // Verify ownership
    if (transcription.userId !== (session.user as any).id) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Update status to PROCESSING
    await prisma.transcription.update({
      where: { id: transcriptionId },
      data: { status: 'PROCESSING' }
    })

    // Start processing in background (don't await)
    processTranscription(transcriptionId, transcription.audioFilePath)
      .catch(err => console.error('Background processing error:', err))

    return res.status(200).json({
      message: 'Processing started',
      transcriptionId
    })

  } catch (error) {
    console.error('Process error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

async function processTranscription(transcriptionId: string, audioFilePath: string) {
  try {
    // Path to the Python script
    const scriptPath = path.join(process.cwd(), '..', 'transcribe_api.py')
    const pythonPath = process.env.PYTHON_PATH || 'python3'

    // Create output directory
    const outputDir = path.join(process.cwd(), 'public', 'transcriptions', transcriptionId)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const outputRaw = path.join(outputDir, 'transcript_raw.txt')
    const outputFinal = path.join(outputDir, 'transcript_final.txt')

    // Run Python script
    const python = spawn(pythonPath, [
      scriptPath,
      audioFilePath,
      outputRaw,
      outputFinal,
      process.env.HUGGINGFACE_TOKEN || ''
    ])

    let stdout = ''
    let stderr = ''

    python.stdout.on('data', (data) => {
      stdout += data.toString()
      console.log(`Python stdout: ${data}`)
    })

    python.stderr.on('data', (data) => {
      stderr += data.toString()
      console.error(`Python stderr: ${data}`)
    })

    python.on('close', async (code) => {
      if (code === 0) {
        // Success - read output files
        const transcriptRaw = fs.existsSync(outputRaw)
          ? fs.readFileSync(outputRaw, 'utf-8')
          : ''
        const transcriptFinal = fs.existsSync(outputFinal)
          ? fs.readFileSync(outputFinal, 'utf-8')
          : ''

        await prisma.transcription.update({
          where: { id: transcriptionId },
          data: {
            status: 'COMPLETED',
            transcriptRaw,
            transcriptFinal
          }
        })

        console.log(`Transcription ${transcriptionId} completed successfully`)
      } else {
        // Failed
        await prisma.transcription.update({
          where: { id: transcriptionId },
          data: {
            status: 'FAILED',
            errorMessage: stderr || `Process exited with code ${code}`
          }
        })

        console.error(`Transcription ${transcriptionId} failed:`, stderr)
      }

      // Clean up audio file
      try {
        fs.unlinkSync(audioFilePath)
      } catch (err) {
        console.error('Error deleting audio file:', err)
      }
    })

  } catch (error) {
    console.error('Processing error:', error)
    await prisma.transcription.update({
      where: { id: transcriptionId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
}
