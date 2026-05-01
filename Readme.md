# Blockchain Document Notary

A production-grade, decentralized document notarization platform leveraging blockchain technology to create immutable, timestamped records of document authenticity. Upload documents, generate cryptographic hashes, and anchor them on-chain for permanent verification.

### Deployment Details
1. `Frontend`: Deployed on Vercel
            - [Deployed Link](https://decentralized-image-processing.vercel.app)

2. `Backend`: Deployed on Hugging Face Spaces - [Deployed Link](https://pranavpai0309-decentralized-image-processing.hf.space/docs)

## Overview

**Blockchain Document Notary** is a full-stack Web3 application that enables users to:
- Upload and hash documents (PDF, PNG, JPG , JPEG)
- Anchor document hashes on the Ethereum blockchain - Sepolia TestNet for Test transactions
- Verify document authenticity and ownership at any time
- Maintain a transparent, immutable audit trail

This solution is ideal for:
- Legal document verification
- Intellectual property protection
- Certificate authentication
- Compliance and regulatory purposes
- Proof of existence for documents

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Upload UI • Wallet Connection • Verification    │  │
│  │  Technologies: React, TypeScript, Wagmi   │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────┬──────────────────────────────────────┬─┘
                 │ HTTP Requests                       │ Web3
                 │                                      │
        ┌────────▼──────────┐            ┌─────────────▼──────────┐
        │  Backend (FastAPI)│            │  Smart Contract (Solidity)
        │  ┌──────────────┐ │            │  ┌──────────────────┐  │
        │  │ Hash Document│ │            │  │ Anchor Hashes    │  │
        │  │ File Validate│ │            │  │ Verify Ownership │  │
        │  │ SHA-256 Hash │ │            │  │ Query Records    │  │
        │  └──────────────┘ │            │  └──────────────────┘  │
        └───────────────────┘            └──────────────────────┘
```

## Features

### Core Functionality
- **Document Upload**: Secure file upload with format validation
- **SHA-256 Hashing**: Industry-standard cryptographic hashing
- **Blockchain Anchoring**: Immutable record creation on Ethereum
- **Ownership Tracking**: Record who and when a document was notarized
- **Timestamp Verification**: Blockchain-backed timestamps for legal validity
- **Multi-Chain Support**: Extensible for Polygon, Arbitrum, and other chains

### User Experience
- **Wallet Integration**: Seamless connection via MetaMask and other Web3 wallets
- **Real-time Status**: Live transaction confirmation feedback
- **QR Code Export**: Share verification proof via QR codes
- **Copy & Download**: Easy sharing of document hashes and proofs

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend | Next.js | 16.2.4 |
| Frontend Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Web3 Connection | Wagmi + Viem | 2.19+ |
| Wallet UI | RainbowKit | 2.2.10 |
| Backend | FastAPI | 0.110.0 |
| Blockchain | Solidity | ^0.8.19 |

## Prerequisites

### System Requirements
- Node.js ≥ 18.0
- Python ≥ 3.9
- Git
- A Web3 wallet (MetaMask, WalletConnect, etc.)

### External Requirements
- Deployed DocumentNotary smart contract
- Connected to an Ethereum-compatible network (Mainnet, Sepolia, Polygon, etc.)
- RPC endpoint for blockchain interaction

## Installation

### 1. Clone Repository
```bash
git clone https://github.com/Pranava-Pai-N/BlockChain-Assignment.git
cd BlockChain-Assignment
```

### 2. Backend Setup (FastAPI)

```bash
cd backend
```
### Create a Virtual Environment
```bash
python -m venv venv
```
###  Activate virtual environment
### On Windows:
```bash
./venv/Scripts/activate

# On macOS/Linux:
source venv/bin/activate
```

### Install dependencies
```
pip install -r requirements.txt
```

###  Start the server
```bash
uvicorn main:app --reload 
```

The API will be available at `http://localhost:8000`  
API Documentation: `http://localhost:8000/docs`

### 3. Frontend Setup (Next.js)

```bash
cd frontend

# Install dependencies
npm install


cp .env.example .env

npm run dev
```

The frontend will be available at `http://localhost:3000`



### Smart Contract Deployment

Deploy the `DocumentNotary.sol` contract using Foundry, Hardhat, or Remix.


After deployment:
1. Copy the contract address
2. Update `NEXT_PUBLIC_CONTRACT_ADDRESS` in `.env.local`

## Usage

### For End Users

1. **Connect Wallet**
   - Click "Connect" button
   - Select your Web3 wallet
   - Approve connection

2. **Upload Document**
   - Click upload area or drag & drop
   - Select PDF, PNG, or JPG file
   - Maximum file size: Unlimited (consider network constraints)

3. **Generate Hash**
   - Backend generates SHA-256 hash
   - Hash displayed with "0x" prefix for blockchain compatibility

4. **Anchor on Blockchain**
   - Review transaction details
   - Approve transaction in wallet
   - Wait for confirmation

5. **Verify**
   - Access verification page with document hash
   - View notarization timestamp and uploader address
   - Download QR code proof

### API Endpoints

#### Hash Document
```http
POST /hash-document
Content-Type: multipart/form-data

file: <binary file data>
```

**Response:**
```json
{
  "success": true,
  "file_name": "document.pdf",
  "hash": "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
  "algorithm": "SHA-256"
}
```

#### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy"
}
```

## Smart Contract Reference

### DocumentNotary Contract Functions

#### Write Functions

**`anchorHash(bytes32 _fileHash)`**
- Anchors a document hash on the blockchain
- Prevents duplicate anchoring of the same hash
- Emits `HashAnchored` event
- **Access**: Public (requires wallet connection)

#### Read Functions

**`hashExists(bytes32 _fileHash)`**
- Returns true if hash has been anchored
- **Returns**: Boolean

**`getHashDetails(bytes32 _fileHash)`**
- Returns complete record: uploader address and timestamp
- **Returns**: Record struct {address uploader, uint256 timestamp}

**`getUploader(bytes32 _fileHash)`**
- Returns wallet address that anchored the hash
- **Returns**: Address

**`getTimestamp(bytes32 _fileHash)`**
- Returns blockchain timestamp when hash was anchored
- **Returns**: Unix timestamp (uint256)

### Events

**`HashAnchored(bytes32 indexed fileHash, address indexed uploader, uint256 timestamp)`**
- Emitted when a hash is successfully anchored
- Indexed fields enable efficient filtering

## Development

### Project Structure
```
BlockChain-Assignment/
├── backend/                    # FastAPI backend
│   ├── main.py                # Application entry point
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile             # Container configuration
├── contracts/                  # Smart contracts
│   └── DocumentNotary.sol      # Main notary contract
└── frontend/                   # Next.js frontend
    ├── app/                    # Next.js app directory
    │   ├── page.tsx           # Home page
    │   ├── layout.tsx         # Root layout
    │   └── providers.tsx      # Wagmi & RainbowKit setup
    ├── components/
    │   └── BlockchainNotary.tsx # Main component
    ├── lib/
    │   ├── wagmi.ts           # Wagmi configuration
    │   └── utils.ts           # Utility functions
    └── package.json           # NPM dependencies
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please ensure:
- Code follows project conventions
- Commit messages are descriptive

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions:
- Open an [GitHub Issue](https://github.com/Pranava-Pai-N/BlockChain-Assignment/issues)
- Check existing documentation
- Review contract interactions and blockchain logs

## Disclaimer

This is an educational project. Before deploying to mainnet:
- Conduct security audits
- Test thoroughly on testnet
- Review smart contract logic
- Ensure compliance with local regulations

---

**Last Updated**: May 2026  
**Maintainer**: Pranava Pai N  
**GitHub**: [Pranava-Pai-N/BlockChain-Assignment](https://github.com/Pranava-Pai-N/BlockChain-Assignment)