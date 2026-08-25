# Market-signal proxy

This directory is an Epicenter **project-scoped proxy** — a small Express server deployed
alongside the simulation and reachable at `/proxy/<account>/<project>/…`. It holds the
account's shared secret server-side and re-exports a few tightly-scoped capabilities to the
client.

In this example the proxy implements the market-signal **public carveout**: a desk that has
locked may read the *public* posture of every other desk in its episode, and nothing more.

## What this proxy does

- Each team has one world run of `model.xlsx` (`signal`, `pitch`, `private_note`, `ready`).
- Participants use normal Epicenter permissions for full read/write access to their own
  world run. The player UI mutates all four variables on the team's own run.
- After a team locks, the UI reads the **public projection** of every other world in the
  same episode through `world/:episodeKey/:worldKey/public/:variableNames`. Today the
  client asks for `signal;pitch`, and the proxy returns `{ signal, pitch }` and nothing
  else.
- The carveout is **server-owned**: the proxy — not the caller — decides which variables are
  public (`PUBLIC_WORLD_VARIABLES` in `index.js`). The client names the public variables it
  wants, but the proxy rejects anything outside that allowlist as "not found";
  `private_note` is unreachable by construction.
- For each request the proxy verifies the caller's session is for this account+project,
  confirms the target world is in the named episode **and** the caller is assigned in that
  episode, then reads only the public projection with the project token.

The rule "this field is visible to my episode-peers, the rest of the same run stays private"
sits *between* Epicenter's scope boundaries — the platform gates reads at the
world/episode/group level, not per-variable. The proxy expresses that one rule and nothing
more.

## Route contracts

### `GET /world/:episodeKey/:worldKey/public/:variableNames`

Reads public variables from another world in the same episode. `variableNames` is a
semicolon-separated list; the app currently calls the route as
`/public/signal%3Bpitch`.

The route requires a participant bearer token. Middleware order matters:

1. `verify` confirms the session belongs to this account and project.
2. `requireEpisodeWorldAccess` confirms the target world belongs to the episode and the
   caller is assigned to some world in that same episode.
3. `empowerWithProjectToken` mints a project token.
4. `readPublicWorldVariables` reads only the allowlisted public variables.

Success response:

```json
{
  "signal": "build",
  "pitch": "Inventory is cheap; we are leaning in."
}
```

Requesting anything outside `PUBLIC_WORLD_VARIABLES` returns `404` so private variable names
are not confirmed as existing.

### `POST /completion`

Authenticated stub for the "server holds a private service key" pattern. It does not call
OpenAI or any other external service.

Request:

```json
{
  "prompt": "Draft a one-line market pitch."
}
```

Response:

```json
{
  "data": "Draft a one-line market pitch.",
  "hasOpenAIKey": true
}
```

`hasOpenAIKey` only reports whether `OPENAI_API_KEY` is present server-side; it never
returns the key.

## When a proxy is the right tool

A proxy runs with the project's privileged secret, so at Forio our position is to **reach
for one sparingly and to follow the principle of least permission.** Most needs are better
served by organizing the project itself — worlds, episodes, groups, roles, and permissions.
A proxy earns its place when a capability genuinely cannot be expressed within those scopes:

- **Holding secrets the client must never see.** Third-party API keys and other credentials
  stay on the server; the client calls the proxy instead of receiving the key. The
  `/completion` route is a stub of this shape — it reads whether `OPENAI_API_KEY` exists in
  server-side configuration and echoes the prompt, but it makes no external API call and the
  key never reaches the browser.
- **Initiating long-running work that should outlive a single client's engagement cycle.**
  A request can kick off work on the server that keeps running after the participant closes
  their tab, rather than being tied to one client's session.
- **Re-exporting a single capability that sits between scope boundaries** — the market-signal
  carveout above is one such rule.

### Least permission, in practice

- **A caller must belong to the account/project where the proxy is deployed.** `verify` (in
  `middleware/verify.js`) establishes this before anything else runs, rejecting any session
  that is not for this account+project.
- **Upgrade a request to project authorization only when you are sure the project cannot be
  organized otherwise.** In this example the project token is minted *late and narrowly*: the
  middleware chain on the public route runs `verify` → `requireEpisodeWorldAccess` (the caller
  is assigned in the episode they are asking about) → `empowerWithProjectToken`, so the
  privileged read happens only after the caller's own identity and assignment check out, and
  only to fetch the public projection. The `/completion` route never upgrades at all — it just
  holds a secret. Order your own routes the same way: prove the caller, then grant the
  narrowest capability that satisfies the request.
- **Talk to us first.** Before standing up a proxy, contact Forio. We may know a path that
  doesn't need one, or your use case may be worth promoting back upstream into the platform.

## The proxy server

- `index.js` — the Express server. `PUBLIC_WORLD_VARIABLES` is the entire public carveout;
  widening it is a deliberate, reviewable edit to that one array. `/completion` is a
  separate authenticated stub for the "hold a private key server-side" proxy pattern.
- `middleware/verify.js` — confirms the caller's session is for this account+project, and
  (for the public route) that the caller is assigned in the requested episode.
- `middleware/empowerWithProjectToken.js` — mints the project token used to read the public
  projection.
- `index.ctx2` — declares the proxy runtime (`JAVASCRIPT_20`).
- `package.json` — the proxy's dependencies (`express`, `cors`, `epicenter-libs`). Install
  them with `npm install --prefix proxy`; the resulting `node_modules` is bundled into the
  deploy so the proxy has them at runtime. (The proxy declares no dev-only dependencies, so
  the whole `node_modules` ships as-is.)

## Prerequisite: project-scoped proxies

The proxy requires a team organization, a team project, and an eligible plan or an account
specifically enabled by Forio. Follow the Dashboard setup in the root
[`README.md`](../README.md#proxy) to set the organization shared secret and configure the
project's **Project Server** and **Proxy Model Filename**. If **Proxy Settings** displays a
message that the account is not configured for project-scoped models instead of showing the
server controls, contact Forio before continuing.

## Deploying and resetting

From the project root:

```bash
npm install --prefix proxy   # install the proxy's dependencies (re-run when they change)
npm run deploy:proxy         # deploy proxy/ and reset the running proxy
```

`npm run deploy` runs this as part of the full deploy. Deployed code sits on disk, but the
running proxy process keeps serving the previous bundle until it is stopped; Epicenter then
boots a new process with the latest code on the next request. `npm run deploy` and
`npm run deploy:proxy` reset the proxy automatically as their last step. To reset it on its
own — for example after editing `PUBLIC_WORLD_VARIABLES` and deploying just the proxy — run:

```bash
npm run reset:proxy
```

## Developing the proxy locally

Developing the proxy itself locally is an advanced path. For general sim development, use the
deployed proxy; run a local Express server only when the proxy is the focus of the change.
Locally, `index.js` reads connection details and the account shared secret from a
`proxy/env.json` file (git-ignored) instead of the values Epicenter injects in production.

For local proxy development, create `proxy/env.json` with the Epicenter connection fields
the fallback reads:

```json
{
  "API_HOST": "forio.com",
  "ACCOUNT_SHORT_NAME": "your-account",
  "PROJECT_SHORT_NAME": "your-project",
  "API_SHARED_SECRET": "your-account-shared-secret",
  "OPENAI_API_KEY": "sk-..."
}
```

`OPENAI_API_KEY` is optional for the current stub, but including it demonstrates that the
proxy can hold a private key without putting that key in browser-visible code. If
`proxy/env.json` exists when you run `npm run deploy:proxy`, the deploy script packages it
with the proxy bundle; do not commit it.
