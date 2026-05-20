# SlipSense

**SlipSense is an AI-powered bet slip analyzer.**

It grades wagers, parlays, odds risk, bankroll exposure, and hidden weak legs before a bettor places a bet.

This is not a pick-selling app. It does not promise winners. It is a pre-bet risk review tool that helps users slow down and understand what they are risking.

## What it does

SlipSense lets a user:

- load a demo betting slip
- manually build single bets and parlays
- upload a betting slip screenshot for optional AI extraction
- calculate American-odds break-even percentage
- calculate potential profit and total return
- grade every leg
- grade every ticket
- grade the full slip
- flag risky parlays
- flag heavy juice
- flag same-game exposure
- flag too much NRFI/YRFI exposure
- flag player props that need news checks
- enter bankroll and get a stake-size warning
- export the full analysis as JSON

## Important disclaimer

SlipSense is educational software.

It does **not**:

- guarantee winning bets
- place bets
- connect to sportsbooks
- tell users to gamble
- provide financial advice
- prove positive expected value without live market data
- replace injury, lineup, weather, matchup, and odds research

The app reviews the structure and risk of a slip. It cannot know future outcomes.

## Tech stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Zod
- Vitest
- Optional OpenAI Responses API image extraction
- Local browser storage for the MVP

No database is required for V1.

## Current MVP status

Built:

- polished dark-mode UI
- demo slip loader
- manual bet slip builder
- single and parlay support
- core grading engine
- American odds math
- parlay risk penalty
- bankroll risk warnings
- leg-level analysis
- ticket-level analysis
- slip-level analysis
- screenshot upload route
- OpenAI-key missing fallback
- image type validation
- image size validation
- AI JSON parsing
- AI schema validation
- safe API error responses
- local storage with fallback warning
- JSON report export
- unit tests for grading math
- GitHub Actions CI workflow

Not built yet:

- user accounts
- Supabase database
- cloud-saved history
- sportsbook syncing
- live odds API
- closing line value tracking
- automatic result settlement
- paid subscription flow

## Quick start

### 1. Clone the repo

```bash
git clone https://github.com/Srb709/SlipSense.git
cd SlipSense
```

### 2. Install Node

Use Node 22 or newer.

Check your version:

```bash
node -v
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### 5. Run tests

```bash
npm test
```

### 6. Type-check

```bash
npm run typecheck
```

### 7. Build for production

```bash
npm run build
```

Then start the production server:

```bash
npm start
```

## Optional screenshot extraction setup

Manual entry and demo mode work without any API key.

Screenshot extraction needs an OpenAI API key.

### 1. Copy `.env.example`

Mac/Linux:

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

### 2. Add your key

Open `.env.local` and add:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
MAX_IMAGE_UPLOAD_MB=8
```

### 3. Restart the dev server

Stop the server with `CTRL + C`.

Start it again:

```bash
npm run dev
```

Then upload a screenshot in the app.

Always check the extracted legs before trusting the grade. Screenshot reading can misread odds, teams, or stakes.

## Error handling

### Missing OpenAI key

If `OPENAI_API_KEY` is missing, screenshot upload returns:

```json
{
  "code": "MISSING_OPENAI_API_KEY",
  "message": "Screenshot extraction is not configured yet. Add OPENAI_API_KEY to .env.local or use manual entry."
}
```

The app still works through manual entry and demo mode.

### Bad form data

If the upload cannot be read:

```json
{
  "code": "BAD_FORM_DATA",
  "message": "The upload could not be read. Try a normal PNG, JPG, or WEBP screenshot."
}
```

### Missing image

If no image is included:

```json
{
  "code": "MISSING_IMAGE",
  "message": "No image file was uploaded."
}
```

### Unsupported image type

Allowed file types:

- PNG
- JPG/JPEG
- WEBP

Blocked files return:

```json
{
  "code": "UNSUPPORTED_IMAGE_TYPE",
  "message": "Upload a PNG, JPG, or WEBP screenshot."
}
```

### Image too large

Default max size is 8MB.

```json
{
  "code": "IMAGE_TOO_LARGE",
  "message": "The screenshot is too large. Compress it or raise MAX_IMAGE_UPLOAD_MB."
}
```

Change the limit in `.env.local`:

```bash
MAX_IMAGE_UPLOAD_MB=12
```

### OpenAI request failed

If the AI request fails:

```json
{
  "code": "OPENAI_REQUEST_FAILED",
  "message": "OpenAI could not analyze the screenshot. Use manual entry for now."
}
```

### Bad AI output

Handled codes:

```text
EMPTY_AI_OUTPUT
BAD_AI_JSON
INVALID_AI_SCHEMA
```

The app does not save bad extracted data. It asks the user to use manual entry.

### Local storage failure

If the browser blocks storage, the app shows a warning and still works for the current session. Users can export the report as JSON.

## Project structure

```text
SlipSense/
  .github/workflows/ci.yml
  src/
    app/
      api/
        analyze-image/route.ts
        health/route.ts
      globals.css
      layout.tsx
      page.tsx
    components/
      Badge.tsx
      SlipSenseApp.tsx
      StatCard.tsx
    lib/
      demo-data.ts
      grading.test.ts
      grading.ts
      types.ts
      utils.ts
  .env.example
  .gitignore
  next-env.d.ts
  next.config.mjs
  package.json
  postcss.config.mjs
  tailwind.config.ts
  tsconfig.json
```

## Key files

### `src/lib/grading.ts`

Core grading logic.

Includes:

- American odds to implied probability
- American odds to profit
- grade mapping
- leg analysis
- ticket analysis
- full slip analysis
- parlay penalties
- bankroll warning logic
- NRFI/YRFI concentration warnings

### `src/components/SlipSenseApp.tsx`

Main user interface.

Includes:

- demo slip loading
- manual slip editing
- screenshot upload
- local storage
- analysis dashboard
- JSON export

### `src/app/api/analyze-image/route.ts`

Optional screenshot extraction API.

Includes:

- image validation
- size limits
- OpenAI request
- JSON parsing
- Zod schema validation
- safe error codes

## Vercel deployment

1. Push this repo to GitHub.
2. Go to Vercel.
3. Import `Srb709/SlipSense`.
4. Framework should auto-detect as Next.js.
5. Add optional environment variables:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
MAX_IMAGE_UPLOAD_MB=8
```

6. Deploy.

The app works without the OpenAI key, but screenshot extraction will be disabled.

## Next build priorities

1. Add saved user accounts with Supabase.
2. Add a real saved slip history.
3. Add a cleaner screenshot correction screen.
4. Add a live odds API for price comparison.
5. Add result tracking.
6. Add weekly leak reports.
7. Add bankroll rules and unit-size recommendations.
8. Add paid Pro tier later.

## Product positioning

Clean pitch:

> Before you bet it, grade it.

Longer pitch:

> SlipSense reviews your bet slip before you place it, explains what is risky, calculates break-even math, and helps you avoid dumb parlay and bankroll mistakes.
