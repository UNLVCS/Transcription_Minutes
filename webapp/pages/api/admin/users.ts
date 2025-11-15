import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)

  // Check if user is authenticated and is admin
  if (!session || (session.user as any).role !== 'ADMIN') {
    return res.status(403).json({ message: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    // Get all users
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
          approved: true,
          createdAt: true,
          _count: {
            select: {
              transcriptions: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return res.status(200).json(users)
    } catch (error) {
      console.error('Error fetching users:', error)
      return res.status(500).json({ message: 'Internal server error' })
    }
  }

  if (req.method === 'PATCH') {
    // Update user (approve/reject, change role, delete)
    try {
      const { userId, action, role, approved } = req.body

      if (!userId || !action) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      // Prevent admin from modifying themselves
      if (userId === (session.user as any).id) {
        return res.status(400).json({ message: 'Cannot modify your own account' })
      }

      if (action === 'approve') {
        const user = await prisma.user.update({
          where: { id: userId },
          data: { approved: true }
        })
        return res.status(200).json({ message: 'User approved', user })
      }

      if (action === 'reject' || action === 'unapprove') {
        const user = await prisma.user.update({
          where: { id: userId },
          data: { approved: false }
        })
        return res.status(200).json({ message: 'User approval revoked', user })
      }

      if (action === 'delete') {
        await prisma.user.delete({
          where: { id: userId }
        })
        return res.status(200).json({ message: 'User deleted' })
      }

      if (action === 'update') {
        const updateData: any = {}
        if (role) updateData.role = role
        if (typeof approved === 'boolean') updateData.approved = approved

        const user = await prisma.user.update({
          where: { id: userId },
          data: updateData
        })
        return res.status(200).json({ message: 'User updated', user })
      }

      return res.status(400).json({ message: 'Invalid action' })

    } catch (error) {
      console.error('Error updating user:', error)
      return res.status(500).json({ message: 'Internal server error' })
    }
  }

  return res.status(405).json({ message: 'Method not allowed' })
}
