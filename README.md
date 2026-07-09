# GrowEasy — AI CSV Importer

An intelligent CSV importer that uses an LLM to map **any** spreadsheet — regardless of its
column names or layout — into a fixed set of **15 standardized CRM fields**. Upload a CSV,
preview it, confirm, and the backend batches the rows through the model and returns clean,
validated CRM records, skipping rows that have no contact info.


- **Frontend:** Next.js (App Router) + TypeScript + Tailwind
- **Backend:** Node.js + Express + TypeScript
- **LLM:** [NVIDIA NIM](https://build.nvidia.com) free API (OpenAI-compatible) — `mistralai/mistral-medium-3.5-128b`
- **Shared:** a `@groweasy/shared` workspace package holds the CRM schema (types + enums + zod), used by both apps so there is one source of truth.

---

## Architecture

```
groweasy-assignment/            npm workspaces monorepo
├── shared/     @groweasy/shared — CrmRecord, CRM_STATUSES, DATA_SOURCES, zod schema
├── backend/    Express API: CSV → batched LLM calls → validated CRM records
└── frontend/   Next.js UI: upload → preview → confirm → progress → results
```

**Request flow**

1. The browser parses the CSV with PapaParse to render the preview.
2. On confirm, it uploads the CSV **file** (`multipart/form-data`) to `/api/import/stream`; the
   backend parses it server-side with the same PapaParse config.
3. The backend chunks rows into batches (`BATCH_SIZE`, default 6) and calls the LLM per batch,
   asking for strict JSON keyed by row index so output order is preserved.
4. Every returned record is re-validated in code (`services/validate.ts`) — the model is never
   trusted blindly (see below).
5. Progress is streamed back over Server-Sent Events; the final event carries the full result.

**Two-layer correctness.** The prompt asks the model to follow all the rules, but the backend
*independently enforces* them: enum whitelists, `new Date()` parseability, the skip rule, and
single-line sanitization. If the model returns an invalid `crm_status`, a bad `data_source`, an
unparseable date, or drops a row, the code corrects it. This is what makes the output reliable.

---

## Getting started

### Prerequisites
- Node.js ≥ 20
- A free NVIDIA API key (no credit card): sign in at <https://build.nvidia.com>, open any model,
  and copy your key (`nvapi-...`).

### Setup
```bash
git clone <this-repo>
cd "groweasy assignment"
cp .env.example .env          # then paste your NVIDIA_API_KEY into .env
npm install
npm run dev                   # builds shared, then runs backend :4000 + frontend :3000
```

Open <http://localhost:3000>.

### Environment variables
All configured in `.env` (see [`.env.example`](.env.example)):

| Var | Used by | Default |
|-----|---------|---------|
| `NVIDIA_API_KEY` | backend | — (required) |
| `NVIDIA_BASE_URL` | backend | `https://integrate.api.nvidia.com/v1` |
| `LLM_MODEL` | backend | `mistralai/mistral-medium-3.5-128b` |
| `LLM_MAX_TOKENS` | backend | `8192` |
| `BATCH_SIZE` | backend | `6` |
| `PORT` | backend | `4000` |
| `CORS_ORIGIN` | backend | `http://localhost:3000` (use `*` to reflect any origin) |
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:4000` |

> **A note on speed.** The free NVIDIA NIM endpoint for `mistral-medium-3.5` generates at roughly
> **~15 tokens/sec**, so mapping is dominated by model latency, not the app. `BATCH_SIZE` defaults to
> `6` so the progress bar updates every batch rather than making you wait minutes for one giant call.
> Large files (e.g. the 200-row sample) can still take several minutes — that's the endpoint, not the
> code. Raise `BATCH_SIZE` for fewer/larger calls, or point `LLM_MODEL` at a faster NIM model.

---

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Build shared, run backend + frontend together |
| `npm run dev:backend` / `npm run dev:frontend` | Run one app |
| `npm run build` | Build all three workspaces |
| `npm test` | Run backend tests (vitest) |

## Testing

```bash
npm test
```

Covers (in `backend/test/`, LLM fully mocked — no live API calls):
- **validate**: enum coercion, invalid `data_source` → blank, unparseable date → blank, the skip
  rule, phone/email normalization, single-line sanitization.
- **csv**: quoted fields with commas/newlines, trimming, empty-line handling, batching.
- **llm**: batching + index-based order preservation, malformed-JSON retry recovery, and the
  deterministic fallback when the model omits a row.

A sample messy CSV that exercises every rule lives at
[`backend/test/fixtures/messy-leads.csv`](backend/test/fixtures/messy-leads.csv).


## API

One endpoint, one contract:

```
POST /api/import/stream
Content-Type: multipart/form-data   (field: file)

curl -F "file=@leads.csv" http://localhost:4000/api/import/stream
```

The uploaded CSV is parsed **server-side** by `parseCsv`; progress is streamed back over
Server-Sent Events, and the final `done` event carries the full `ImportResult`. Column names are
not assumed — the LLM maps whatever headers it finds into the standard CRM fields. Uploads are
capped at 10 MB and a UTF-8 BOM is stripped so Excel-exported files map cleanly. Any other request
(wrong field name, raw body, JSON, or no file) is rejected.

### Health check

```
GET /health
```

Returns `{ "ok": true, "model": "<LLM_MODEL>", "llmConfigured": <boolean> }` — a lightweight
liveness probe (e.g. for Render) that also reports the active model and whether an API key is set.
