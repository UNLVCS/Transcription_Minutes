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
    const transcriptions = await prisma.transcription.findMany({
      where: {
        userId: (session.user as any).id
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        originalFilename: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        errorMessage: true
      }
    })

    return res.status(200).json(transcriptions)

  } catch (error) {
    console.error('List error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
