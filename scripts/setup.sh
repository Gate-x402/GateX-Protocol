#!/bin/bash

set -e

echo "🚀 Setting up GateX Protocol..."

# Check prerequisites
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install it first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Start infrastructure
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
cd packages/common/prisma
pnpm generate

# Run migrations
echo "🗄️  Running database migrations..."
pnpm migrate

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and configure your environment variables"
echo "2. Run 'pnpm dev' to start both services"
echo "3. Visit http://localhost:3000/health for merchant health check"
echo "4. Visit http://localhost:3001/health for facilitator health check"

