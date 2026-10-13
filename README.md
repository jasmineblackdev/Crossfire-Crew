# Crossfire Crew

A top-down multiplayer training-yard shooter for 2–8 players. Two balanced teams race to 25 eliminations, with a three-minute limit. Equal scores at the time limit draw. Rifle and SMG loadouts, assisted aim, cover, friendly-fire protection, three-second respawns, and spawn shields are implemented.

## Play

Enter a callsign and choose a weapon. Create a room, share its six-character code or invitation URL, and have friends join from their own browsers. The host starts the match when at least two players are on opposing teams. No game account is needed.

Laptop: WASD or arrow keys move; mouse aims; click or Space fires. Phone: left touch stick moves; right touch stick aims and fires. Landscape is recommended. Weapons can be changed in the lobby or during respawn.

## Local development

Requires Node.js >=22.13.0 and npm.

1. Run `npm run install:ci`.
2. Run `npm run build`.
3. Apply the local schema:
   `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_medical_iron_fist.sql`
4. Run `npm run start`. The local preview uses http://127.0.0.1:8787.

The loopback preview is accessible on the host computer only. To play from separate devices, deploy the Worker with its D1 database to Sites or configure suitable hosting. Do not treat the local preview URL as the public game link.

## Verification

- `node --test tests/engine.test.mjs` — 8 game-rule tests.
- `node node_modules/typescript/bin/tsc --noEmit` — type checking.
- `node tests/multiplayer.mjs` — integration test against a running local preview with its database initialized.

Local tests verified independent player credentials, room creation/joining, balanced teams, shared movement/scores, host permissions, weapon locking, and host migration. Browser checks verified the lobby and starting a live match. Actual-device touch testing and internet latency/load testing remain outstanding.

## Architecture and limits

Cloudflare Worker API with D1-backed authoritative rooms. Clients send inputs and poll state about ten times per second. Server updates use revision-based compare-and-swap to prevent concurrent state overwrites. Clients interpolate remote movement and predict their own movement. This is a first prototype; this polling approach should be assessed under real internet latency before treating it as a competitive shooter.

Inactive players expire after 15 seconds and abandoned rooms after two hours. Invitations contain only room codes; player credentials stay in session storage and are omitted from shared state. There are no bots, paid features, accounts, analytics, or chat.

The Sites project has been registered, but source upload and public deployment did not complete in this session. No live public URL or challenge submission is claimed.
