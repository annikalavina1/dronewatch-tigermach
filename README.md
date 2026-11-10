# DroneWatch — TIGERMACH

DroneWatch is a counter-drone situational-awareness **web demo** for exploring synthetic airspace observations. It includes a simulated airspace map, scenario controls, rule-based notifications, an AI incident summary, and a virtual augmented-reality eyewear preview.

## Demo scope

Everything shown is simulated. The map uses a local exercise grid, and the app has no real sensor connections, live aircraft data, or drone control.

## Muse Ember through OpenRouter

When a scenario is selected, the browser sends its synthetic observations to `POST /api/dronewatch/summary`. The Express API server calls OpenRouter with the `meta/muse-ember` model and asks it for a concise summary and explicit uncertainty cues. Notifications are generated separately by deterministic UI rules; the model does not decide whether to notify.

The server returns the model name, provider token counts (prompt, completion, and total), and an estimated cost. It uses OpenRouter's reported request cost when available, with a token-rate estimate as a fallback.

The OpenRouter credential is read only by the API server from `OPENROUTER_API_KEY`. Add it as a Replit Secret for this project. Do not put it in browser code, a `VITE_` variable, or a committed file. This repository does not need or include a `.env` file.

## Run in Replit

1. Import the repository into Replit.
2. Add `OPENROUTER_API_KEY` in **Tools → Secrets**.
3. Start the managed **API Server** and **DroneWatch web** workflows.
4. Open the web preview at `/`.

The managed workflows run:

- API: `pnpm --filter @workspace/api-server run dev`
- Web: `pnpm --filter @workspace/dronewatch run dev`

Replit routes `/` to the web app and `/api/*` to the API server. A local clone outside Replit needs a reverse proxy with those path mappings for the AI summary flow to work.

## Development checks

Requirements: Node.js 24 and pnpm.

```bash
pnpm install
pnpm run typecheck
```

If you change `lib/api-spec/openapi.yaml`, regenerate the API client and validation schemas:

```bash
pnpm --filter @workspace/api-spec run codegen
```

## Main project areas

- `artifacts/dronewatch/` — React/Vite dashboard
- `artifacts/api-server/` — Express API, including the server-side OpenRouter call
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/api-client-react/` and `lib/api-zod/` — generated client hooks and validation schemas
