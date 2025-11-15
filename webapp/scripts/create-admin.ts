/**
 * Script to create the initial admin user
 *
 * Usage:
 *   npx ts-node scripts/create-admin.ts
 *
 * Default credentials:
 *   Username: admin
 *   Email: admin@localhost
 *   Password: admin123
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const defaultAdmin = {
    email: 'admin@localhost',
    username: 'admin',
    password: 'admin123',
    name: 'System Administrator'
  }

  console.log('Creating initial admin user...')
  console.log('Email:', defaultAdmin.email)
  console.log('Username:', defaultAdmin.username)
  console.log('Password:', defaultAdmin.password)
  console.log('')

  // Check if admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { email: defaultAdmin.email },
        { username: defaultAdmin.username }
      ]
    }
  })

  if (existingAdmin) {
    console.log('⚠️  Admin user already exists!')
    console.log('Email:', existingAdmin.email)
    console.log('Username:', existingAdmin.username)
    console.log('')
    console.log('If you need to reset the password, please delete the user from the database first.')
    return
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(defaultAdmin.password, 10)

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: defaultAdmin.email,
      username: defaultAdmin.username,
      password: hashedPassword,
      name: defaultAdmin.name,
      role: 'ADMIN',
      approved: true
    }
  })

  console.log('✅ Admin user created successfully!')
  console.log('')
  console.log('Login credentials:')
  console.log('Email:', defaultAdmin.email)
  console.log('Password:', defaultAdmin.password)
  console.log('')
  console.log('⚠️  IMPORTANT: Please change the password after first login!')
  console.log('⚠️  You can delete this admin account after creating a real admin user.')
}

main()
  .catch((e) => {
    console.error('Error creating admin user:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
