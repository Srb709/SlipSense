# My Philly Leads Tool

Production-ready Next.js 14 App Router tool for Philadelphia lead generation using public data.

## Features
- Server-side auth with middleware (`admin` / `philly2026`) and logout.
- Neighborhood filters mapped to zip codes.
- Lead intelligence from `opa_properties_public` + `rtt_summary` (recent transfers, doc types, sheriff/tax-like signals).
- Address normalization for better absentee detection.
- 0-100 lead scoring and tags.
- Script generator customized for Steven Brooks.
- Robust CSV export via safe CSV escaping logic.

## Local setup
```bash
npm install
npm run dev
```
Open `http://localhost:3000` and login with:
- Username: `admin`
- Password: `philly2026`

## Deploy to GitHub + Vercel (beginner walkthrough)
1. Create a new GitHub repo named `my-philly-leads-tool`.
2. In this project folder run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: My Philly Leads Tool"
   git branch -M main
   git remote add origin https://github.com/<your-username>/my-philly-leads-tool.git
   git push -u origin main
   ```
3. Go to Vercel, click **Add New Project**, import that GitHub repo.
4. Framework preset should auto-detect **Next.js**.
5. Click **Deploy**.
6. After deploy, open your Vercel URL and sign in.

## Data sources
- Carto SQL API: `https://phl.carto.com/api/v2/sql`
- Main tables used: `opa_properties_public`, `rtt_summary`

## Automated Contact Enrichment Module
This repo now includes a real backend enrichment pipeline that processes owner/property leads, performs web search discovery, extracts phones/emails, normalizes contact data, scores confidence, and stores review-ready records.

### What was added
- Queue-backed enrichment service: `src/lib/enrichmentService.ts`
- JSON datastore schema + persistence: `src/lib/enrichmentStore.ts`, `src/lib/enrichmentTypes.ts`
- Trigger endpoint (batch lead enrichment): `POST /api/enrichment/trigger`
- Results endpoint (jobs + enriched contacts): `GET /api/enrichment/results`
- Human-review dashboard: `/enrichment`

### Data schema (stored in `data/enrichment-db.json`)
- `jobs[]`: `jobId`, `leadIds[]`, `status`, `createdAt`, `startedAt`, `finishedAt`, `error`
- `records[]`: `leadId`, normalized owner/address fields, generated search queries, processing status, and `contacts[]`
- each `contacts[]` entry: `phoneNumbers[]` (E.164), `emails[]`, `sourceUrl`, `confidence` (0-100), `notes`, `dncChecked`, `dncResult`, `lastVerifiedDate`, `humanReviewRequired`

### Trigger enrichment (example)
```bash
curl -X POST http://localhost:3000/api/enrichment/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "leads": [
      {
        "leadId": "OPA-123",
        "ownerName": "Jane Doe",
        "propertyAddress": "1234 N Front St, Philadelphia, PA 19122",
        "mailingAddress": "889 Main Street",
        "mailingCity": "Cherry Hill",
        "mailingState": "NJ",
        "mailingZip": "08002"
      }
    ]
  }'
```

### Review results
1. Open `http://localhost:3000/enrichment`
2. Refresh jobs/results.
3. Review each candidate contact and source URL.
4. Keep `humanReviewRequired=true` before any outbound usage.
