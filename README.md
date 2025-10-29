# Forio Base Build

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

### Deploy project files to Epicenter

1. `npx degit forio/dev-base-build#become-editor my-project`
2. `cd my-project`
3. `npm install`
4. `npm run deploy`

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

### Set up a workshop and user accounts

Create a workshop for the project. Add at least one facilitator user and two or more
participants to the workshop.

On the workshop page, impersonate the facilitator to run initial setup tasks.

### Set up Multiplayer Assignments

On the Multiplayer Assignments page, assign participants to worlds.

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

Log in as a participant you created above and play the game!
