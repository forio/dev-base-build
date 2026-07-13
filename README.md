# Scheduled task example

This project shows how to create an Epicenter task that calls a project proxy on a
recurring schedule. Each call to `POST /tick` updates an episode-scoped vault, giving the
facilitator page a visible count and timestamp.

## How it works

1. A facilitator chooses a schedule and creates the task directly through the Task API,
   scoped to the selected episode.
2. The task payload uses `target: 'PROXY'` and `url: '/tick'`, with the episode key in
   the body.
3. Epicenter calls the deployed proxy with a platform-issued credential on each fire.
4. The proxy verifies that credential and atomically updates the vault.

The proxy is only the task's target. Creating, listing, and cancelling tasks stays in the
client because those operations already accept a facilitator session.

## Platform behavior to design for

- **Five minutes is the minimum interval.** Faster schedules are delayed to the platform
  minimum rather than rejected.
- **A 4xx response cancels the task.** Return 4xx only when another attempt cannot help.
  Return 5xx for a condition that may recover. The proxy's `switch` statement is where a
  known, recoverable 4xx can be translated to 5xx; by default it preserves the status.
- **Each fire waits `payload.timeoutSeconds` for a response (required, integer 1–30).**
  A proxy cold start spends part of that window booting, so Epicenter may record a failed
  fire even if the proxy finishes its work afterward. Keep the target operation atomic,
  and do not assume that a timeout means no effect occurred.

See [proxy/README.md](proxy/README.md) for the route and security details.

## Quickstart

### Create a project

Create a project in Epicenter. Make note of the `Project ID`, known internally as
`project.projectShortName`.

### Project settings

Set the following project settings in the Epicenter UI:

- Web Access: Allow access to all URLs by default
- Push Channel: Enabled
- Allow Channel Workshop Default: Enabled

#### Proxy

This branch deploys a proxy server, which requires an account enabled for project-scoped
proxies. See [`proxy/README.md`](proxy/README.md) for that prerequisite and the details;
it is set up as part of the deploy below.

### Deploy project files to Epicenter

1. `npx degit forio/dev-base-build#task-proxy my-project`
2. `cd my-project`
3. `npm install`
4. `npm install --prefix proxy` (installs the proxy server's dependencies)
5. `npm run deploy`

`npm run deploy` builds the React app into `public/`, uploads the built frontend, and
deploys the proxy server from `proxy/` — including its installed `node_modules` and any
local, git-ignored `proxy/env.json` you choose to provide — then resets the proxy so it
boots the freshly deployed code. Re-run `npm install --prefix proxy` whenever the proxy's
dependencies change.

During `npm run deploy`, you will be prompted to enter your project information and
administrator credentials:

- `SERVER`: The Epicenter server URL (default `https://forio.com`)
- `ACCOUNT_SHORT_NAME`: `account.shortName` of the organization that owns the project.
  This is exposed in the Epicenter UI on organization settings as `Organization ID`.
- `PROJECT_SHORT_NAME`: `project.projectShortName` of the project.
- `ADMIN_HANDLE`: The email for an administrator account that belongs to the organization.
  Probably the email you use to log in to the Epicenter UI.
- `ADMIN_PASSWORD`: The password for the administrator account.

This is saved to `cli/config.json`, which you can edit later.

### Model files

This example has no simulation model. The proxy is the project's only model context — the
platform treats `proxy/` and `model/` as independent, so nothing here requires a `model/`
directory at all.

### Set up a workshop and user accounts

Create a workshop for the project and add at least one facilitator user. Participants are
not needed — this example has no participant experience. Facilitators land on
`#/facilitator`.

### Run locally

Change the values in `.env` to match your project details:

- `VITE_PROJECT_NAME`: The name of your project (shown in the site title)
- `VITE_DEV_ACCOUNT_SHORT_NAME`: The `account.shortName` of the organization that owns the
  project. Same as `ACCOUNT_SHORT_NAME` above.
- `VITE_DEV_PROJECT_SHORT_NAME`: The `project.projectShortName` of the project. Same as
  `PROJECT_SHORT_NAME` above.
- `VITE_DEV_API_HOST`: The Epicenter API host for your server. Corresponds to `SERVER`
  above, but without the `https://` prefix.

Start the development server with `npm run dev`. Visit the app at `http://localhost:8888`.

Log in as the facilitator, pick an interval, and start the task. The status flips from
`initialized` to `succeeded` after the first fire (~5 minutes), and the tick state under
the panel updates on each fire. The scheduled fire hits the **deployed** proxy at
`/proxy/<account>/<project>/tick`, so the proxy must be deployed (above) for ticks to land
— you do not run the proxy locally for normal development.

## Branch notes

- Deploy granularity: `npm run deploy:public` and `npm run deploy:proxy` each deploy one
  piece; `npm run deploy` runs all of them after a build. `npm run reset:proxy` resets the
  proxy without deploying.
- The proxy — the `/tick` contract, when to use a proxy, its files, prerequisite, and
  local development — is documented in [`proxy/README.md`](proxy/README.md).
- The Task API surface the client uses (create, list, cancel) is facilitator-gated on the
  platform, so the client calls it directly with the facilitator session
  (`src/query/task.ts`); the proxy is not a middleman for any of it.
- Known issue in Epicenter 6.0 (fixed in the next release): cancelling a task shortly
  after a fire may not take effect immediately. If the task panel still shows the task
  after stopping it, stop it again.
