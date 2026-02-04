# Consensus Bike Shop Base Build

This branch is the Consensus Bike Shop example. It demonstrates a role-based,
round-based multiplayer flow where Sales, Operations, and Finance each submit
their decision for the current year, and Epicenter Consensus advances the shared
run once all required roles have arrived.

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
- Role Name: Sales; Minimum: 1; Maximum: 1
- Role Name: Operations; Minimum: 1; Maximum: 1
- Role Name: Finance; Minimum: 1; Maximum: 1
- On the Multiplayer Assignments page, start with assignments belonging to the: Most
  Recent Run Configuration

### Deploy project files to Epicenter

1. `npx degit forio/dev-base-build#consensus my-project`
2. `cd my-project`
3. `npm install`
4. `npm run deploy`

`npm run deploy` builds the React app into `public/`, uploads the built frontend, and
uploads the checked-in model files from `model/`.

During `npm run deploy`, you will be prompted to enter your project information and
administrator credentials:

- `SERVER`: The Epicenter server URL (default `https://forio.com`)
- `ACCOUNT_SHORT_NAME`: `account.shortName` of the organization that owns the project.
  This is exposed in the Epicenter UI on organization settings as `Organization ID`.
- `PROJECT_SHORT_NAME`: `project.projectShortName` of the project.
- `ADMIN_HANDLE`: The email for an administrator account that belongs to the organization.
  Probably email you use to log in to the Epicenter UI.
- `ADMIN_PASSWORD`: The password for the administrator account.

This is saved to `cli/config.json`, which you can edit later.

### Model files

The model for this branch is the checked-in workbook at `model/model.xlsx`, with
role write guards in `model/model.ctx2`. There is no generator script in this branch;
edit the workbook directly if the model contract changes.

### Set up a workshop and user accounts

Create a workshop for the project. Add at least one facilitator user and at least
three participant users to the workshop, one for each role in a world.

On the workshop page, impersonate the facilitator once before players join. The app
creates the first episode for the workshop when the facilitator opens it. Facilitators
land on `#/facilitator`, which shows runs for the selected episode.

### Set up Multiplayer Assignments

On the Multiplayer Assignments page, assign participants to worlds. Each playable
world should have exactly one Sales participant, one Operations participant, and one
Finance participant. If the workshop has more than three participants, create one
complete Sales/Operations/Finance set per world.

### Run locally

Change the values in `.env` to match your project details:

- VITE_PROJECT_NAME: The name of your project (shown in the site title)
- VITE_DEV_ACCOUNT_SHORT_NAME: The `account.shortName` of the organization that owns the
  project. Same as `ACCOUNT_SHORT_NAME` above.
- VITE_DEV_PROJECT_SHORT_NAME: The `project.projectShortName` of the project. Same as
  `PROJECT_SHORT_NAME` above.
- VITE_DEV_API_HOST: The Epicenter API host for your server. Corresponds to `SERVER`
  above, but without the `https://` prefix.

Start the development server with `npm run dev`. Visit the app at `http://localhost:8888`.

Log in as a participant you created above and play the game. Participant users land on
`#/` and see their role-specific decision form. The header includes example debug
controls for creating a new run and stepping the run forward or backward; those controls
are intentionally exposed in this example code interface.

## Branch Notes

- `CONSENSUS.md` explains the Consensus barrier pattern used by this branch.
- `model/README.md` documents the workbook ranges and role responsibilities.
- Consensus barriers are named with both the run key and the current step so a new run
  attached to the same world starts with fresh barriers.
