# Task-target proxy

This proxy provides one protected route for the scheduled task: `POST /tick`. Epicenter
hosts it at `/proxy/<account>/<project>/tick` and calls it on the task's schedule.

## Request flow

1. The facilitator creates a task whose payload contains `target: 'PROXY'` and
   `url: '/tick'`.
2. Epicenter sends each request with a platform-issued account credential.
3. `verifyTaskRunner` verifies the credential and account.
4. `/tick` creates or updates the episode's `task-tick` vault in one atomic request.

The first fire creates the vault. Later fires increment `tickCount` and replace
`lastTickAt`. Participants may read the vault directly; they do not need a proxy read
route.

## `POST /tick`

Request body:

```json
{
  "episodeKey": "<episodeKey>"
}
```

Success response:

```json
{
  "tickCount": 3
}
```

The `episodeKey` is stored in the task payload and replayed on every fire.

## Error handling

Epicenter treats response classes as task control flow:

- **2xx:** the fire succeeded.
- **4xx:** the request cannot succeed later, so Epicenter cancels the task.
- **5xx:** the failure may recover, so Epicenter does not cancel the recurring task.

`recordTick` preserves Epicenter Fault statuses by default. Its `switch` is the
extension point: add a case only when a particular 4xx is genuinely recoverable and
should be returned as 5xx instead. Authentication failures remain 401/403 so a broken
system-to-system boundary fails loudly.

Unexpected non-Epicenter errors return 500.

## Timeout behavior

Epicenter waits `payload.timeoutSeconds` (required at task creation, integer 1–30) for
each fire's response, and proxy startup uses part of that time. A cold proxy may finish
its write after Epicenter has recorded a timeout. Therefore:

- keep the operation atomic;
- avoid read-then-write updates;
- treat a timeout as an unknown outcome, not proof that nothing happened.

This example uses one `ALLOW` vault upsert with `inc`, so the first and later fires follow
the same atomic path.

## Protecting the route

Do not expose a scheduled-task target as an anonymous or general-purpose proxy endpoint.
`verifyTaskRunner` checks the account credential before the vault write and passes that
same credential to Epicenter.

The credential proves account authority, but it does not identify a particular task.
Keep every protected route narrowly limited to the operation the task needs. In this
example, the credential can perform one update on one named vault.

Use a proxy only when work must run without a browser or requires server-side authority.
Task management and ordinary participant/facilitator operations should remain in the
client when Epicenter already permits them there.

## Deploying

The account must have project-scoped proxies enabled. From the project root:

```bash
npm install --prefix proxy
npm run deploy:proxy
```

Deployment uploads this directory and resets the running proxy. The next request starts a
new process with the deployed code. A scheduled task always calls that deployed process,
not your local Express server.

For local proxy development only, create a git-ignored `proxy/env.json`:

```json
{
  "API_HOST": "forio.com",
  "ACCOUNT_SHORT_NAME": "your-account",
  "PROJECT_SHORT_NAME": "your-project"
}
```

Do not commit environment files. If one exists during deployment, it is included in the
proxy bundle.

## Files

- `index.js` — Express app and `/tick` implementation
- `middleware/verifyTaskRunner.js` — task credential verification
- `index.ctx2` — proxy runtime declaration
- `package.json` — proxy dependencies
