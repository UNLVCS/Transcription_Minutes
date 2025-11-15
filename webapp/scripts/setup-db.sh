#!/bin/bash
# Database setup script

echo "Setting up database..."

# Run Prisma migrations
echo "Running Prisma migrations..."
npx prisma migrate dev --name init

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Create initial admin user
echo ""
echo "Creating initial admin user..."
npx ts-node scripts/create-admin.ts

echo ""
echo "✅ Database setup complete!"
echo ""
echo "To start the development server, run:"
echo "  npm run dev"
