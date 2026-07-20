# Forio Base Build — PowerPoint example

> **This branch (`powerpoint`) extends the [`example`](../../tree/example) Bike Shop
> game with a facilitator "Download Results" button that generates a styled
> PowerPoint deck through Epicenter's PowerPoint API.** Jump to
> [PowerPoint results export](#powerpoint-results-export) for everything specific to
> this example. The Quickstart below is inherited from the base build.

## Quickstart

### Create a project

Create a project in Epicenter. Make note of the `Project ID`, known internally as
`project.projectShortName`.

### Project settings

Set the following project settings in the Epicenter UI:

- Web Access: Allow access to all URLs by default
- Push Channel: Enabled
- Allow Channel Workshop Default: Enabled

### Deploy project files to Epicenter

1. `npx degit forio/dev-base-build#example my-project`
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

Create a workshop for the project. Add at least one facilitator user and one participant
to the workshop.

On the workshop page, impersonate the facilitator to run initial setup tasks.

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

Log in as the participant you created above and play the game!

---

## PowerPoint results export

This example demonstrates the **Epicenter PowerPoint API**: a facilitator plays back
participant results on screen and clicks **Download Results** to get a polished,
data-filled `.pptx` deck.

### The game (unchanged from `example`)

A single-player **Bike Shop** simulation. Each participant sets a bike **price** for
several years; the model returns unit sales, revenue, costs, and profit for each year.
Players make a handful of pricing decisions, then their results roll up to the
facilitator.

### What a developer should take away

The pattern is deliberately simple and lives in three files:

| File | Responsibility |
| --- | --- |
| `src/adapters/powerpoint.ts` | Thin wrapper over the PowerPoint endpoint (`generate` + `stream`). Vendored copy of the forthcoming `epicenter-libs` adapter — see [Swapping to the official adapter](#swapping-to-the-official-adapter). |
| `src/query/powerpoint.ts` | Aggregates episode runs into view-models (`buildResults`), shapes them into the API's `DocumentShadow` (`buildDocument`), and exposes the `useDownloadPresentation` mutation. |
| `src/routes/facilitator/index/index.tsx` | Facilitator UI: episode picker, three tabbed result views (table + bar + line + pie), and the **Download Results** button. |

The three on-screen result views map **1:1** to the three result slides in the deck, so
`buildResults()` is the single source of truth for both the screen and the download.

### The API contract

```
POST  /api/v3/{account}/{project}/powerpoint/{TEMPLATE_DIRECTORY}/{TEMPLATE_PATH}   → streamed .pptx
PUT   /api/v3/{account}/{project}/powerpoint/{TEMPLATE_DIRECTORY}/{TEMPLATE_PATH}   → JSON-encoded binary
```

- `TEMPLATE_DIRECTORY` — `'MODEL'` or `'DATA'` (which project file area the template lives in). This example uses `MODEL`.
- `TEMPLATE_PATH` — path to the `.pptx` template within that directory (`results-template.pptx`).
- **Body** — a `DocumentShadow`: `{ output, environment, slides[] }`. Each slide's
  `environment` carries `parameters` (text), `charts`, `tables`, and `pictures` that the
  service merges into the template.
- **`generate` (PUT)** returns the file as `BinaryData` (hex/base64) — handy for
  server-side use. **`stream` (POST)** returns the raw `Response`, which the download
  button turns straight into a Blob. The button uses `stream` to avoid a decode step.

The service supplies **data only**; all slide **design** lives in the template.

### The template and its naming conventions

The template is `model/results-template.pptx` (deployed to the project's `MODEL` area by
`npm run deploy:model`). It has five slides:

1. **Title** — text placeholders only
2. **How to read this deck** — static design + a `${generatedOn}` stamp
3. **Final Standings** — a named **table** + KPI text placeholders
4. **Profit by Player** — a named **bar** chart
5. **The Market** — a named **line** chart + a named **pie** chart

The service matches your data to template shapes **by name**. Those names must line up
with the `name` fields in `buildDocument()`:

| Kind | Template shape name | Where it's filled |
| --- | --- | --- |
| Table | `FinalStandings` | slide 3 |
| Chart (bar) | `ProfitByParticipant` | slide 4 |
| Chart (line) | `ProfitOverTime` | slide 5 |
| Chart (pie) | `RevenueShare` | slide 5 |

Text placeholders use `${token}` syntax and are filled from each slide's
`environment.parameters`: `${title}`, `${subtitle}`, `${groupName}`, `${episodeLabel}`,
`${participantCount}`, `${generatedOn}`, `${topPerformer}`, `${topProfit}`,
`${averageProfit}`.

The template is regenerated from `tools/build_template.py` (kept in the repo so the deck
design is reviewable and reproducible). Re-run it and re-deploy to restyle the deck:

```bash
python3 tools/build_template.py model/results-template.pptx
npm run deploy:model
```

> **Chart series use Jackson wrapper-object form.** Confirmed against the live v4
> service: each chart series is keyed by its type rather than carrying an `objectType`
> discriminator — e.g. `{ bar: { name, data: [{ n: 10 }] } }`, and likewise `line` and
> `pie`. Numeric points are wrapped as `{ n: value }`. This is reflected in the
> `SeriesShadow` types in `src/adapters/powerpoint.ts` and in `buildDocument()`.
>
> **⚠️ Doc-handoff note — verify the template conventions against a live server.** The
> exact placeholder syntax the service uses to *locate shapes in the template* was not
> published at the time of writing, so this example assumes **shape-name matching for
> charts/tables** and **`${token}` substitution for text**. Both are applied and clearly
> labeled in `tools/build_template.py`. Run one real export and confirm the deck fills as
> expected; if the service expects different tokens (e.g. `{{token}}` or alt-text
> matching), adjust the template generator — the `DocumentShadow` in `buildDocument()`
> should not need to change.

### Swapping to the official adapter

`src/adapters/powerpoint.ts` is a stand-in. When `epicenter-libs` ships the
`powerpointAdapter`, delete that file and update the import in `src/query/powerpoint.ts`:

```ts
// from:
import { DocumentShadow, powerpointAdapter } from '~/adapters/powerpoint';
// to:
import { powerpointAdapter, type DocumentShadow } from 'epicenter-libs';
```

The method signatures (`generate`, `stream`) and type shapes (`DocumentShadow`,
`ChartShadow`, `TableShadow`, …) were written to match the forthcoming adapter, so no
other changes should be required.
