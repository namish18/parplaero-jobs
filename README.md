# Parplaero - Jobs & Billing Backend

A usage-based jobs and billing backend API built with Node.js, Express, Prisma, and PostgreSQL.

## Features

- Client management
- Job creation and execution
- Usage tracking and billing calculations
- Job run history
- Client billing summaries

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with the following content:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/parplaero?schema=public"

# Server
PORT=3000

# Billing Rates (in currency units per usage unit)
CLIENT_RATE_PER_UNIT=10
PARTNER_RATE_PER_UNIT=6
```

Replace `username` and `password` with your PostgreSQL credentials.

### 3. Set Up Database

Run Prisma migrations to create the database schema:

```bash
npx prisma migrate dev --name init
```

This will create the following tables:
- `Client` - Store client information
- `Job` - Store jobs with target URLs
- `JobRun` - Track job executions and billing
- `UrlResult` - Store per-URL processing results

### 4. Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### 1. Create a Client
```http
POST /clients
Content-Type: application/json

{
  "name": "Client Name",
  "email": "client@example.com"
}
```

### 2. Create a Job
```http
POST /jobs
Content-Type: application/json

{
  "clientId": 1,
  "name": "Some monitoring job",
  "targetUrls": [
    "https://example.com/a",
    "https://example.com/b"
  ]
}
```

### 3. Run a Job
```http
POST /jobs/:jobId/run
```

This will:
- Process each target URL
- Generate random usage units (1-5 per URL)
- Calculate billing: 
  - `clientCharge = totalUsageUnits × CLIENT_RATE_PER_UNIT`
  - `partnerPayout = totalUsageUnits × PARTNER_RATE_PER_UNIT`
  - `platformShare = clientCharge - partnerPayout`
- Update status: PENDING → RUNNING → SUCCESS (or FAILED)

### 4. Get Job Run History
```http
GET /jobs/:jobId/runs
```

Returns all runs for a specific job with billing details.

### 5. Get Client Summary
```http
GET /clients/:clientId/summary
```

Returns:
- All jobs for the client
- All runs for each job
- Total usage units across all runs
- Total client charges, partner payouts, and platform share

## Database Schema

```
Client
  ├── id (Int, PK)
  ├── name (String)
  ├── email (String, unique)
  └── jobs (Job[])

Job
  ├── id (Int, PK)
  ├── clientId (Int, FK)
  ├── name (String)
  ├── targetUrls (String[])
  └── runs (JobRun[])

JobRun
  ├── id (Int, PK)
  ├── jobId (Int, FK)
  ├── status (String)
  ├── totalUsageUnits (Int)
  ├── clientCharge (Float)
  ├── partnerPayout (Float)
  ├── platformShare (Float)
  ├── startedAt (DateTime)
  ├── completedAt (DateTime)
  └── urlResults (UrlResult[])

UrlResult
  ├── id (Int, PK)
  ├── jobRunId (Int, FK)
  ├── url (String)
  ├── usageUnits (Int)
  └── result (Float, optional)
```

## Prisma Studio

To view and manage your database visually:

```bash
npm run prisma:studio
```

## Example Usage

```bash
# 1. Create a client
curl -X POST http://localhost:3000/clients \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Corp","email":"contact@acme.com"}'

# 2. Create a job
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{"clientId":1,"name":"Website Monitor","targetUrls":["https://example.com/page1","https://example.com/page2"]}'

# 3. Run the job
curl -X POST http://localhost:3000/jobs/1/run

# 4. Get run history
curl http://localhost:3000/jobs/1/runs

# 5. Get client summary
curl http://localhost:3000/clients/1/summary
```

## Project Structure

```
parplaero-jobs/
├── prisma/
│   └── schema.prisma      # Database schema
├── routes/
│   ├── clients.js         # Client endpoints
│   └── jobs.js            # Job endpoints
├── .env.example           # Environment variables template
├── .gitignore
├── package.json
├── server.js              # Express app entry point
└── README.md
```

## License

ISC
