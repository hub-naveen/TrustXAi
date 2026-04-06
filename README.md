# TrustXAi

<p align="center">
	<strong>AI + Blockchain powered fraud intelligence dashboard for institutional finance.</strong>
</p>

<p align="center">
	<a href="https://github.com/itzdineshx/TrustXAi/stargazers">
		<img src="https://img.shields.io/github/stars/itzdineshx/TrustXAi?style=for-the-badge" alt="Stars" />
	</a>
	<a href="https://github.com/itzdineshx/TrustXAi/network/members">
		<img src="https://img.shields.io/github/forks/itzdineshx/TrustXAi?style=for-the-badge" alt="Forks" />
	</a>
	<a href="https://github.com/itzdineshx/TrustXAi/issues">
		<img src="https://img.shields.io/github/issues/itzdineshx/TrustXAi?style=for-the-badge" alt="Issues" />
	</a>
	<a href="https://github.com/itzdineshx/TrustXAi/commits/main">
		<img src="https://img.shields.io/github/last-commit/itzdineshx/TrustXAi?style=for-the-badge" alt="Last Commit" />
	</a>
</p>

<p align="center">
	<img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React" />
	<img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
	<img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
	<img src="https://img.shields.io/badge/TailwindCSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind" />
	<img src="https://img.shields.io/badge/Vitest-Tested-6E9F18?style=flat-square&logo=vitest&logoColor=white" alt="Vitest" />
</p>

## Overview

TrustXAi is a modern frontend prototype for cross-institution fraud intelligence. It combines:

- Real-time transaction monitoring
- Fraud pattern intelligence (Fraud DNA)
- Blockchain activity exploration for tamper-resistant audit traces
- Federated learning analytics across institutions
- Role-based dashboard access with demo accounts

The product UX is built around a high-signal operations console for analysts, admins, and viewers.

## Backend (FastAPI)

This repository now includes a complete backend implementation under `backend/`.

- Framework: FastAPI + MongoDB (PyMongo)
- Auth: JWT login with role-based access (`admin`, `analyst`, `viewer`)
- Database: MongoDB with automatic startup seeding (mongomock fallback for local dev)
- API coverage: auth, role dashboards, transactions, fraud intelligence,
	blockchain explorer + internal ledger anchoring, federated learning,
	admin governance, and user settings

Backend quick start:

```bash
cd backend
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

API docs: `http://localhost:8000/docs`

## Core Modules

- Landing + institutional sign-in experience
- Protected multi-page dashboard shell
- Dashboard overview with KPIs and detection trend charts
- Transaction monitoring with search and status filters
- Fraud Intelligence page with fingerprinted fraud patterns
- Blockchain Explorer for recent on-chain anti-fraud events
- Federated Learning metrics and model quality views
- Admin and Settings routes for governance flows

## Tech Stack

- React 18 + TypeScript
- Vite 5
- React Router DOM
- TanStack Query
- Tailwind CSS + shadcn/ui + Radix UI
- Framer Motion
- Recharts
- Vitest + Testing Library
- Playwright scaffold (config present)

## Project Structure

```text
src/
	components/
		auth/
		dashboard/
		layout/
		shared/
		ui/
	contexts/
	data/
	hooks/
	pages/
	test/
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start development server

```bash
npm run dev
```

### 3. Build for production

```bash
npm run build
```

### 4. Preview production build

```bash
npm run preview
```

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build production assets |
| `npm run build:dev` | Build in development mode |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest test suite once |
| `npm run test:watch` | Run Vitest in watch mode |

## Demo Access

Use these demo users on the login screen:

- admin@rbi.gov.in
- analyst@sbi.co.in
- viewer@hdfc.com

Demo password:

- demo1234

## Current Data Model

The app currently runs on mock data for:

- Transactions
- Alerts
- Fraud DNA signatures
- Blockchain entries
- Institutions
- Federated model updates

This keeps the frontend fast for iteration and demo-ready for feature validation.

## Roadmap Ideas

- Backend API integration for live telemetry
- Persistent auth and token lifecycle
- CI workflow badges + pipeline health
- End-to-end Playwright suites integrated into scripts
- Real-time streaming via WebSocket/SSE
- Observability and audit export features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit focused changes
4. Open a pull request

If you add workflows, tests, or release automation, update the badges section to keep repository status accurate.

## License

No license file is currently included. Add a `LICENSE` file to define usage terms.