# DroneWatch

DroneWatch is a TIGERMACH situational-awareness demo built entirely around synthetic airspace observations. It includes four scenario controls, a local-grid map, deterministic notifications, an AI-generated incident summary, and a virtual AR eyewear preview.

## Run & Operate

- Start `artifacts/api-server: API Server` to serve `/api` and the server-side Muse Ember endpoint.
- Start `artifacts/dronewatch: web` to serve the dashboard at `/`.
- Add `OPENROUTER_API_KEY` through Replit Secrets. Never put it in browser code or a committed file.
- Run `pnpm run typecheck` for a full workspace typecheck.
- Run `pnpm --filter @workspace/api-spec run codegen` after changing the OpenAPI contract.

## Stack

- pnpm workspace, Node.js 24, TypeScript 5.9
- Frontend: React and Vite
- API: Express 5
- API contract and validation: OpenAPI, Orval, and Zod
- AI summaries: OpenRouter `meta/muse-ember`, called by the API server

## Where things live

- `artifacts/dronewatch/` — dashboard and synthetic scenario interactions
- `artifacts/api-server/src/routes/dronewatch.ts` — validated server-side summary endpoint
- `lib/api-spec/openapi.yaml` — API source of truth
- `lib/api-client-react/` and `lib/api-zod/` — generated client and schema packages

## Safety boundary

All observations, feed states, alerts, and AR eyewear output are synthetic. Do not add real sensor connections or drone control. Deterministic UI rules create notifications; Muse Ember only summarizes synthetic observations and uncertainty.
