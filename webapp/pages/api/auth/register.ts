import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { email, username, password, name } = req.body

    // Validation
    if (!email || !username || !password) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    })

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email
          ? 'Email already registered'
          : 'Username already taken'
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user (not approved by default)
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name: name || username,
        approved: false,
        role: 'USER'
      }
    })

    return res.status(201).json({
      message: 'Registration successful! Your account is pending approval.',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
