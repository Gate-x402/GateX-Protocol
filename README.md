# GateX Protocol - BNB Chain x402 API

> **The future of API monetization on BNB Chain.** Pay-per-request blockchain data access with zero registration.

License: MIT | BNB Chain Status

## 🚀 What is GateX?

GateX is a revolutionary protocol that enables **autonomous agents and developers** to access BNB Chain blockchain data through a pay-per-request model using the HTTP 402 Payment Required standard. No registration, no API keys, no rate limits—just code, payment, and data.

### Key Features

* 🔓 **Zero Registration** - No sign-up forms, no email verification, no waiting
* ⚡ **Instant Access** - Make a request, pay with crypto, get your data instantly
* 🔐 **Payment IS Authentication** - Cryptographic payment proof replaces API keys
* 🤖 **Agent Native** - Designed for autonomous systems from day one
* 📈 **Unlimited Scale** - Pay per request, no artificial limits or throttling
* 💰 **Multi-Token Support** - Pay with BNB, BUSD, USDT, or native $GTX token

## 🎯 Why GateX?

### The Problem with Traditional APIs

* ❌ **API Key Hell** - Manual registration, key rotation, security overhead
* ❌ **Rate Limiting** - Artificial constraints, throttling, unpredictable access
* ❌ **Subscription Lock-in** - Monthly fees, tier limitations, unused capacity waste
* ❌ **Human Required** - Agents can't autonomously discover and pay for services

### The GateX Solution

* ✅ **Zero Registration** - Instant access, payment IS authentication
* ✅ **Unlimited Scale** - Pay per request, no artificial limits
* ✅ **Multi-Token Payments** - BNB, BUSD, USDT, or $GTX token
* ✅ **Agent Native** - Fully autonomous discovery, payment, and consumption
* ✅ **BNB Chain Native** - Built specifically for BNB Chain ecosystem

## 🏗️ How It Works

```
1. REQUEST     → Agent makes HTTP call to endpoint
2. 402 RESPONSE → Server returns payment challenge with quote
3. ON-CHAIN PAY → BNB Chain micropayment (BNB/BUSD/USDT/GTX)
4. PROOF SENT   → Payment transaction hash attached to retry
5. DATA DELIVERED → Instant response with requested data
```

## 📡 API Endpoints

### Quote & Payment Flow

| Endpoint                     | Description                          | Price        |
| ---------------------------- | ------------------------------------ | ------------ |
| GET /v1/route-quote/:slug   | Get payment quote for protected API  | Variable     |
| POST /api/verify             | Verify on-chain payment (Facilitator) | Internal     |

### Example Endpoints

Developers can register their own endpoints with custom pricing. Examples include:

| Endpoint                     | Description                          | Price    |
| ---------------------------- | ------------------------------------ | -------- |
| GET /api/account/{address}  | BNB Chain account details            | $0.01    |
| GET /api/token/{address}     | Token metadata and price data        | $0.01    |
| GET /api/transaction/{hash}  | Transaction details and analysis     | $0.01    |
| GET /api/price/{token}       | Real-time token price feed           | $0.01    |
| GET /api/defi/positions      | DeFi position analytics              | $0.05    |
| POST /api/swap/quote         | DEX swap quote with optimal routing  | $0.01    |

## 💻 Quick Start

### Basic Request Flow

```javascript
// 1. Make initial request
const response = await fetch("https://api.gatex.xyz/v1/route-quote/my-api");

// 2. Receive 402 Payment Required
if (response.status === 402) {
  const challenge = await response.json();
  // {
  //   "standard": "x402",
  //   "price": "0.01",
  //   "currency": "USD",
  //   "network": "bsc",
  //   "payToken": "BNB",
  //   "treasury": "0x...",
  //   "quoteId": "uuid-here",
  //   "nonce": "nonce-here",
  //   "expiresAt": "2024-01-01T00:02:00Z",
  //   "facilitator": {
  //     "url": "https://facilitator.gatex.xyz/api/verify",
  //     "signer": "0x..."
  //   },
  //   "requestHash": "sha256:..."
  // }

  // 3. Make BNB Chain payment
  const txHash = await sendPayment(
    challenge.treasury,
    challenge.amountWei,
    challenge.payToken // BNB, BUSD, USDT, or GTX
  );

  // 4. Get verification from facilitator
  const verification = await fetch(challenge.facilitator.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteId: challenge.quoteId,
      tx: txHash,
      token: challenge.payToken,
      amountWei: challenge.amountWei,
      requestHash: challenge.requestHash,
    }),
  });

  const { verdict, signature, signer } = await verification.json();

  // 5. Retry with payment proof
  const dataResponse = await fetch("https://api.gatex.xyz/v1/route-quote/my-api", {
    headers: {
      "X-PAYMENT": JSON.stringify({
        quoteId: challenge.quoteId,
        tx: txHash,
        token: challenge.payToken,
        amountWei: challenge.amountWei,
        requestHash: challenge.requestHash,
        verdict,
        signature,
        signer,
      }),
    },
  });

  // 6. Receive data
  const data = await dataResponse.json();
  console.log(data);
}
```

### Example Response

```json
{
  "success": true,
  "data": {
    "message": "Protected resource for my-api",
    "timestamp": "2024-01-01T00:01:00Z",
    "quoteId": "uuid-here"
  }
}
```

## 🪙 $GTX Token

The native payment and reward token for GateX Protocol.

### Token Benefits

**💰 Earn from Usage**

* 0.25% facilitator fee collected on all transactions
* Fee distribution to token holders (staking rewards)
* Optional burn mechanism for deflationary pressure
* Supply reduction over time increases value

**⚡ Save on Requests**

* Token holders get discounted API requests
* Lower costs for high-volume users
* Utility beyond speculation - actual protocol usage

### Tokenomics

| Metric                  | Value        |
| ----------------------- | ------------ |
| API Request Fee         | $0.01        |
| Facilitator Fee         | 0.25%        |
| Fees to Holders         | TBD           |
| Burn Mechanism          | Optional      |
| Supply Model             | Configurable  |

### The Flywheel Effect

```
Usage → Fees → Distribution → Staking → Higher Value → More Usage → Revenue...
```

Higher usage generates more fees, which are distributed to token holders, increasing token value and creating a self-reinforcing cycle.

## 🔧 Implementation Details

* ✅ HTTP 402 Payment Required standard compliance
* ✅ Multi-token payment support (BNB, BUSD, USDT, GTX)
* ✅ On-chain payment verification via facilitator service
* ✅ Cryptographic replay protection with nonces
* ✅ Request hash validation for payment authenticity
* ✅ No rate limits - true pay per request model
* ✅ Failed requests are not charged
* ✅ Sub-second response times

## 🌐 Network Information

* **Network:** BNB Chain (BSC) Mainnet & Testnet
* **Payment Tokens:** BNB, BUSD, USDT, $GTX
* **Average Response Time:** <500ms
* **Transaction Finality:** ~3 seconds

## 📊 Stats

| Metric                | Value        |
| --------------------- | ------------ |
| Registration Required | 0            |
| Response Time         | <500ms       |
| Cost Per Request      | Variable     |
| Payment Tokens        | 4 (BNB/BUSD/USDT/GTX) |
| Replay Protection     | ✅ Nonce-based |
| On-Chain Verification | ✅ Real-time  |

## 🔗 Links

* **Website:** Coming Soon
* **GitHub:** [https://github.com/Gate-x402/GateX-Protocol](https://github.com/Gate-x402/GateX-Protocol)
* **Documentation:** Coming Soon
* **Twitter:** Coming Soon

## 🤝 Use Cases

### For Developers

* Build data-driven dApps without API key management
* Pay only for actual usage, no monthly subscriptions
* Instant access without registration friction
* Multi-token payment flexibility

### For Autonomous Agents

* Discover and consume APIs independently
* No human intervention required
* Programmatic payment and data retrieval
* Native BNB Chain integration

### For DeFi Applications

* Access real-time token prices and market data
* Monitor wallet activities and token movements
* Execute trades through aggregated DEX routing
* Analyze DeFi positions and yields

## 🔐 Security Features

* **On-Chain Verification** - All payments verified on BNB Chain
* **Replay Protection** - Nonce-based system prevents double-spending
* **Request Hashing** - Cryptographic validation of payment requests
* **Facilitator Signing** - ECDSA signatures for payment verification
* **Expiration** - Quotes expire after 2 minutes
* **Transaction Tracking** - 24-hour replay protection window

## 📝 License

MIT License - see LICENSE for details.

## 🚦 Status

* ✅ **Live on BNB Chain Testnet**
* ✅ **Production-Ready Backend**
* ✅ **Multi-Token Support**
* ✅ **Zero Registration Required**
* 🔄 **Mainnet Deployment** - Coming Soon

---

Built with ⚡ for the future of autonomous systems on BNB Chain.

**Ready to build? Start accessing BNB Chain blockchain data in seconds. No registration required. Just pay and go.**
