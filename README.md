# Market Signal Base Build

This branch is the Market Signal example. It demonstrates **world-scoped runs with an
intentionally narrow proxy carveout**. Each team runs a desk on a trading floor: it picks
a market **signal**, **talks its book** with a one-line public **pitch**, and keeps a
sealed **private note** to itself. Once a desk locks, it can read the *public* posture of
every other desk in the episode — but never their private notes.

The narrow, read-only window onto other desks is served by a small **proxy** server in
[`proxy/`](proxy/README.md). The proxy also includes a no-op `/completion` stub to show the
other common proxy pattern: holding a private service key server-side without exposing it
to the browser. The proxy README covers both examples, when a proxy is the right tool, and
Forio's guidance on using one sparingly and with least permission.

## Quickstart

### Create a project

Create a project in Epicenter. Make note of the `Project ID`, known internally as
`project.projectShortName`.

### Project settings

Set the following project settings in the Epicenter UI:

- Web Access: Allow access to all URLs by default
- Push Channel: Enabled
- Allow Channel Workshop Default: Enabled

#### Project multiplayer settings

- Multiplayer: Enabled
- Role Name: Player; Minimum: 1; Maximum: No Max
- On the Multiplayer Assignments page, start with assignments belonging to the: Most
  Recent Run Configuration

Each world is one desk. The floor is more interesting with more than one desk, so plan on
at least two worlds.

#### Proxy

This branch deploys a proxy server, which requires an account enabled for project-scoped
proxies. See [`proxy/README.md`](proxy/README.md) for that prerequisite and the details; it
is set up as part of the deploy below.

### Deploy project files to Epicenter

1. `npx degit forio/dev-base-build#proxy my-project`
2. `cd my-project`
3. `npm install`
4. `npm install --prefix proxy` (installs the proxy server's dependencies)
5. `npm run deploy`

`npm run deploy` builds the React app into `public/`, uploads the built frontend and the
checked-in model files from `model/`, and deploys the proxy server from `proxy/` —
including its installed `node_modules` and any local, git-ignored `proxy/env.json` you
choose to provide — then resets the proxy so it boots the freshly deployed code. Re-run
`npm install --prefix proxy` whenever the proxy's dependencies change.

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

The model for this branch is `model/model.py`, a Python model with four variables:
`signal`, `pitch`, `private_note`, and `ready`. Edit it directly if the model contract
changes, then redeploy with `npm run deploy` (or `npm run deploy:model` for the model
alone).

### Set up a workshop and user accounts

Create a workshop for the project. Add at least one facilitator user and two or more
participants to the workshop.

On the workshop page, impersonate the facilitator once before players join. The app
creates the first episode for the workshop when the facilitator opens it. Facilitators
land on `#/facilitator`.

### Set up Multiplayer Assignments

On the Multiplayer Assignments page, assign participants to worlds. Create at least two
worlds so each desk has peers to reveal on the floor; assign one or more participants to
each world.

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

Log in as a participant you created above and play. Lock your desk to set `ready`, then
reveal the floor to read every other desk's public signal and pitch. The local app calls
the **deployed** proxy at `/proxy/<account>/<project>`, so the proxy must be deployed
(above) for the reveal to work — you do not run the proxy locally for normal play.

## Branch notes

- Deploy granularity: `npm run deploy:model`, `npm run deploy:public`, and
  `npm run deploy:proxy` each deploy one piece; `npm run deploy` runs all of them after a
  build. `npm run reset:proxy` resets the proxy without deploying.
- The proxy — how the carveout works, when to use a proxy, its files, prerequisite, and
  local development — is documented in [`proxy/README.md`](proxy/README.md).
