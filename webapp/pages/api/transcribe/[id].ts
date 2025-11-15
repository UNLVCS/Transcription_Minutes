import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid transcription ID' })
    }

    const transcription = await prisma.transcription.findUnique({
      where: { id }
    })

    if (!transcription) {
      return res.status(404).json({ message: 'Transcription not found' })
    }

    // Verify ownership
    if (transcription.userId !== (session.user as any).id) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    return res.status(200).json(transcription)

  } catch (error) {
    console.error('Get transcription error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
