# GateX Protocol - BNB Chain x402 Implementation

A production-ready backend for GateX, a BNB Chain-native implementation of the [x402 standard](https://402.fyi) for pay-per-call APIs.

## 🚀 Features

- **HTTP 402 Payment Required**: Standard-compliant payment challenges
- **Multi-Token Support**: BNB, BUSD, USDT, and native $GTX token
- **On-Chain Verification**: Facilitator service verifies transactions on BNB Chain
- **Replay Protection**: Redis-based nonce and transaction hash tracking
- **Production Ready**: Prometheus metrics, structured logging, health checks
- **Type Safe**: Full TypeScript with Zod validation

## 📁 Architecture

```
gatex-protocol/
├── apps/
│   ├── merchant/      # Issues x402 challenges and fulfills paid requests
│   └── facilitator/   # Verifies on-chain payments and signs verdicts
├── packages/
│   ├── common/        # Shared types, zod schemas, crypto utils, Prisma
│   ├── evm/           # ethers.js v6 helpers (providers, ERC20 parsing)
│   └── config/        # Env loaders and constants
└── docker-compose.yml # PostgreSQL + Redis
```

## 🛠️ Tech Stack

- **Framework**: [Hono](https://hono.dev) (Edge-friendly API)
- **Database**: PostgreSQL via [Prisma](https://www.prisma.io)
- **Cache**: Redis for nonce/replay protection
- **Blockchain**: [ethers.js v6](https://docs.ethers.org) (BNB Chain RPC)
- **Auth**: JWT for developer tokens
- **Env**: zod + dotenv
- **Package Manager**: pnpm
- **Testing**: Vitest
- **CI**: GitHub Actions

## 📦 Installation

### Prerequisites

- Node.js >= 20
- pnpm >= 8
- Docker & Docker Compose (for local development)

### Setup

1. **Clone and install dependencies:**

```bash
git clone <repository-url>
cd gatex-protocol
pnpm install
```

2. **Start infrastructure (PostgreSQL + Redis):**

```bash
docker-compose up -d
```

3. **Set up environment variables:**

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://gatex:gatex_dev_password@localhost:5432/gatex"

# Redis
REDIS_URL="redis://localhost:6379"

# BNB Chain RPC
BSC_RPC_URL="https://bsc-dataseed1.binance.org"
BSC_TESTNET_RPC_URL="https://data-seed-prebsc-1-s1.binance.org:8545"

# Network (mainnet | testnet)
NETWORK="testnet"

# Facilitator
FACILITATOR_PRIVATE_KEY="0x..."  # Private key for signing verdicts
FACILITATOR_SIGNER_ADDRESS="0x..."  # Address derived from private key

# Tokens
TOKEN_BNB="0x0000000000000000000000000000000000000000"
TOKEN_BUSD="0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"  # Mainnet BUSD
TOKEN_USDT="0x55d398326f99059fF775485246999027B3197955"  # Mainnet USDT
TOKEN_GTX="0xYourTokenAddress"  # Your $GTX token address

# Merchant
MERCHANT_JWT_SECRET="your-jwt-secret-key-change-in-production"
MERCHANT_PORT=3000

# Facilitator
FACILITATOR_PORT=3001

# Prometheus
PROMETHEUS_PORT=9090

# Treasury (Merchant)
MERCHANT_TREASURY="0x..."  # Address to receive payments
```

4. **Set up database:**

```bash
# Generate Prisma Client
pnpm db:generate

# Run migrations
pnpm db:migrate
```

5. **Seed initial data (optional):**

Create an endpoint in the database:

```sql
INSERT INTO "Endpoint" (id, slug, "basePriceCents", "tokenPreference", treasury, active)
VALUES ('clx...', 'test-api', 100, 'BNB', '0xYourTreasuryAddress', true);
```

Or use Prisma Studio:

```bash
pnpm db:studio
```

6. **Start development servers:**

```bash
# Start both merchant and facilitator
pnpm dev

# Or start individually:
pnpm --filter @gatex/merchant dev
pnpm --filter @gatex/facilitator dev
```

## 📚 API Documentation

### Merchant API

**Base URL**: `http://localhost:3000`

#### Get Quote (HTTP 402 Challenge)

```bash
GET /v1/route-quote/:slug
```

**Response (402 Payment Required):**

```json
{
  "standard": "x402",
  "price": "0.01",
  "currency": "USD",
  "network": "bsc",
  "payToken": "BNB",
  "treasury": "0x...",
  "quoteId": "uuid-here",
  "nonce": "nonce-here",
  "expiresAt": "2024-01-01T00:02:00Z",
  "facilitator": {
    "url": "http://localhost:3001/api/verify",
    "signer": "0x..."
  },
  "requestHash": "sha256:..."
}
```

#### Request with Payment Proof

```bash
GET /v1/route-quote/:slug
Header: X-PAYMENT: {"quoteId":"...","tx":"0x...","token":"BNB","amountWei":"...","requestHash":"sha256:..."}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Protected resource for test-api",
    "timestamp": "2024-01-01T00:01:00Z",
    "quoteId": "uuid-here"
  }
}
```

#### Health Check

```bash
GET /health
```

### Facilitator API

**Base URL**: `http://localhost:3001`

#### Verify Payment

```bash
POST /api/verify
Content-Type: application/json

{
  "quoteId": "uuid-here",
  "tx": "0x...",
  "token": "BNB",
  "amountWei": "1000000000000000",
  "requestHash": "sha256:..."
}
```

**Response:**

```json
{
  "quoteId": "uuid-here",
  "verdict": "paid",
  "signature": "0x...",
  "signer": "0x...",
  "expiresAt": "2024-01-01T00:11:00Z"
}
```

#### Health Check

```bash
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "signer": "0x...",
  "network": "testnet",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 🔄 Payment Flow

1. **Client requests protected endpoint** → Merchant returns HTTP 402 with quote
2. **Client sends payment** → Transaction on BNB Chain to treasury address
3. **Client requests facilitator** → `/api/verify` with transaction hash
4. **Facilitator verifies** → Checks on-chain transaction, signs verdict
5. **Client retries merchant** → Includes payment proof in `X-PAYMENT` header
6. **Merchant verifies** → Calls facilitator, checks signature, returns resource

## 🔐 Security Features

- **Nonce per quote**: Stored in Redis with 2-minute TTL
- **Transaction replay protection**: Transaction hashes tracked in Redis for 24 hours
- **ECDSA signature verification**: Facilitator signs verdicts with private key
- **Request hash validation**: Ensures payment is for specific request
- **Quote expiration**: Quotes expire after 2 minutes

## 📊 Observability

### Prometheus Metrics

Available at `/metrics` on both services:

- `quotes_issued_total` - Total quotes issued by endpoint and token
- `verifications_total` - Total verifications by status
- `request_latency_seconds` - Request latency histogram

### Health Checks

- **Merchant**: `GET /health` - Checks database and Redis
- **Facilitator**: `GET /health` - Returns signer address and network

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @gatex/common test
```

### Example cURL Flow

```bash
# 1. Request quote (get 402 challenge)
curl http://localhost:3000/v1/route-quote/test-api

# 2. Send payment on BNB Chain (use MetaMask or other wallet)
# Send 0.01 BNB to treasury address from 402 response

# 3. Verify payment with facilitator
curl -X POST http://localhost:3001/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "quoteId": "quote-id-from-step-1",
    "tx": "0x...",
    "token": "BNB",
    "amountWei": "10000000000000000",
    "requestHash": "sha256:..."
  }'

# 4. Retry merchant with payment proof
curl http://localhost:3000/v1/route-quote/test-api \
  -H "X-PAYMENT: {\"quoteId\":\"...\",\"tx\":\"0x...\",\"token\":\"BNB\",\"amountWei\":\"...\",\"requestHash\":\"sha256:...\"}"
```

## 🪙 $GTX Token Integration

$GTX is the native payment and reward token for GateX. It's treated like any ERC-20 token on BNB Chain.

**Configuration:**

- Set `TOKEN_GTX` in `.env` to your token contract address
- Developers can set endpoint pricing in $GTX via `tokenPreference`
- All transactions are tracked in the database for analytics

**Fee Distribution (Future):**

- 0.25% facilitator fee (can be configured)
- Optional burn wallet for deflation
- All metadata stored for analytics

## 🚀 Deployment

### Production Checklist

- [ ] Set `NETWORK="mainnet"` in production environment
- [ ] Use strong `MERCHANT_JWT_SECRET`
- [ ] Secure `FACILITATOR_PRIVATE_KEY` (use secrets manager)
- [ ] Set up production PostgreSQL and Redis
- [ ] Configure CORS for your domain
- [ ] Set up monitoring and alerting
- [ ] Enable SSL/TLS
- [ ] Set up rate limiting
- [ ] Configure logging aggregation

### Docker Deployment

Build and run with Docker:

```bash
# Build images
docker build -t gatex-merchant -f apps/merchant/Dockerfile .
docker build -t gatex-facilitator -f apps/facilitator/Dockerfile .

# Run
docker run -d --env-file .env gatex-merchant
docker run -d --env-file .env gatex-facilitator
```

## 📝 Database Schema

See `packages/common/prisma/schema.prisma` for the full schema.

Key models:
- **Endpoint**: API endpoints with pricing
- **PriceQuote**: Generated quotes with nonces
- **Payment**: On-chain payment records
- **Verification**: Facilitator verdicts with signatures

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

MIT

## 🔗 Links

- [x402 Standard](https://402.fyi)
- [BNB Chain Docs](https://docs.bnbchain.org)
- [Hono Framework](https://hono.dev)
- [Prisma](https://www.prisma.io)

