# Crossfire Crew

A top-down multiplayer shooter for 2–8 players. Two balanced teams race to 25 eliminations with a three-minute limit. Rifle and SMG loadouts, assisted aim, cover, no friendly fire, and three-second respawns.

## Deploy to Vercel

This version uses standard Next.js with a Node.js API route and shared Upstash Redis storage. The original Cloudflare/Vinext build scripts are no longer used by `npm run build`.

1. Import this GitHub repository into Vercel. Use the repository root as **Root Directory** and select **Next.js** as **Framework Preset**.
2. Use **Build Command** `npm run build`, **Install Command** `npm ci`, and leave **Output Directory** at the Next.js default. Remove any old `dist` output override.
3. Connect an Upstash Redis database using Vercel's Storage/Marketplace integration, or use an existing Upstash database. Set these environment variables for the deployment environments you use:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   Marketplace aliases `KV_REST_API_URL` and `KV_REST_API_TOKEN` also work.
4. Redeploy after adding environment variables. Creating rooms requires storage; building the application does not. No schema migration is needed for Redis.
5. Open the Vercel URL, enter a callsign, create a room, and invite a second player using its code or link. The host can then start a match.

Keep database credentials server-only. Do not add `NEXT_PUBLIC_` to their names or commit a populated `.env.local` file.

Official setup references:
- https://vercel.com/docs/frameworks/full-stack/nextjs
- https://vercel.com/docs/redis
- https://upstash.com/docs/redis/howto/vercelintegration

## Local development

Requires Node.js >=22.13.0 and npm. Run `npm ci`, copy `.env.example` to `.env.local`, enter your Redis credentials, and run `npm run dev`. Visit http://localhost:3000.

For a production preview: `npm run build`, then `npm start`.

Laptop controls: WASD/arrows move, mouse aims, click/Space fires. Phone controls: left stick moves, right stick aims and fires.

## Verification

- `node --test tests/engine.test.mjs` — game-rule tests.
- `npm run build` — Next.js production compilation and type checks.
- `node tests/vercel-multiplayer.mjs` — starts a built Next.js server against an isolated mock of the Redis REST API, then tests independent player sessions and concurrent updates.
- `GAME_TEST_URL=http://localhost:3000 node tests/multiplayer.mjs` — integration checks against a running app with real Redis configured. This creates a disposable test room and two test players.

The mock checks our HTTP command contract and compare-and-swap behavior. It does not replace testing against an actual Upstash database.

## Shared state

Each room is a Redis key with a two-hour inactivity expiry. Players send inputs and poll shared state approximately ten times per second. Lua compare-and-swap commits protect against competing updates from separate serverless instances. Process memory is not used for production match storage.

The polling prototype needs real-device and internet-latency testing. It sends frequent storage commands during play, so monitor your database usage while testing larger groups.

Legacy Cloudflare helper files remain in the repository for reference; they are excluded from the Next.js type-check scope and are not the deployment path.
