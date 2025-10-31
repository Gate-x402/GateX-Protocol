# PowerShell setup script for Windows

Write-Host "🚀 Setting up GateX Protocol..." -ForegroundColor Cyan

# Check prerequisites
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ pnpm is not installed. Please install it first." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker is not installed. Please install it first." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
pnpm install

# Start infrastructure
Write-Host "🐳 Starting Docker services..." -ForegroundColor Yellow
docker-compose up -d

# Wait for services to be ready
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Generate Prisma Client
Write-Host "🔧 Generating Prisma Client..." -ForegroundColor Yellow
Set-Location packages/common/prisma
pnpm generate

# Run migrations
Write-Host "🗄️  Running database migrations..." -ForegroundColor Yellow
pnpm migrate

Set-Location ..\..\..\..

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Copy .env.example to .env and configure your environment variables"
Write-Host "2. Run 'pnpm dev' to start both services"
Write-Host "3. Visit http://localhost:3000/health for merchant health check"
Write-Host "4. Visit http://localhost:3001/health for facilitator health check"

