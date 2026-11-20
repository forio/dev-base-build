# Forio Epicenter React Template

A batteries‑included starter for building **participant‑facing** and
**facilitator‑facing** web apps on the [Forio Epicenter](https://forio.com/epicenter/)
simulation platform. It combines Epicenter’s **`epicenter-libs` v3** adapters with a
modern React + Vite stack, disciplined data‑fetching via **TanStack Query**, and an
extensible component system powered by **Radix UI, CSS Modules, and
class‑variance‑authority (`cva`)**.

---

## Table of contents

1. [Quick start](#quick-start)
2. [.env configuration](#env-configuration)
3. [Project scripts](#project-scripts)
4. [Architecture overview](#architecture-overview) • [Routing & guards](#routing--guards)
   • [Authentication flow](#authentication-flow) •
   [Data‑fetching conventions (`query/`)](#data-fetching-conventions-query) •
   [Push channels (`query/channel.ts`)](#push-channels-querychannelts) •
   [Extending the UI component system (`components/ui/`)](#extending-the-ui-component-system-componentsui)
5. [Internationalization (i18n)](#internationalization-i18n)

---

## Quick start

```bash
# 1  Use the Node version declared in .nvmrc
nvm use

# 2  Install deps
npm install

# 3  Create a local‑only .env and fill in the three vars below
cp .env .env            # if the file doesn’t exist, create it manually

# 4  Run the dev server
npm run dev             # http://localhost:8888
```

> **Production note** When this bundle is served from
> `https://forio.com/app/<account>/<project>/…`, Epicenter automatically reads the
> **account** and **project** from the URL and injects them into every API call. The
> `.env` file is **only** used when you develop on `localhost`, because the browser URL no
> longer contains that information.

---

## .env configuration

`src/main.tsx` switches the Epicenter SDK into _local mode_ (`config.isLocal() === true`)
whenever the app is served by Vite. Provide the following variables in a top‑level
**`.env`** file:

| Variable                         | Example             | Purpose                                      |
| -------------------------------- | ------------------- | -------------------------------------------- |
| `VITE_DEV_ACCOUNT_SHORT_NAME`    | `acme-simulations`  | Your Epicenter account slug                  |
| `VITE_DEV_PROJECT_SHORT_NAME`    | `supply-chain-game` | The project (simulation) slug                |
| `VITE_DEV_API_HOST` _(optional)_ | `forio.com`         | Override only if you proxy the Epicenter API |

If `VITE_DEV_API_HOST` is omitted it falls back to `forio.com` – the public cloud.

```ts
// src/main.tsx – excerpt
if (config.isLocal()) {
  config.accountShortName = import.meta.env.VITE_DEV_ACCOUNT_SHORT_NAME;
  config.projectShortName = import.meta.env.VITE_DEV_PROJECT_SHORT_NAME;
  config.apiHost = import.meta.env.VITE_DEV_API_HOST; // default: "forio.com"
}
```

---

## Project scripts

| Script            | Description                                                           |
| ----------------- | --------------------------------------------------------------------- |
| `npm run dev`     | Launches Vite with React Fast‑refresh on **`localhost:8888`**         |
| `npm run build`   | Type‑checks (`tsc -b`) then builds a production bundle into `public/` |
| `npm run preview` | Serves the **built** bundle locally                                   |
| `npm run lint`    | ESLint + TypeScript rules (see `.eslintrc.cjs`)                       |
| `postinstall`     | Applies any **patch‑package** overrides                               |

---

## Architecture overview

### Routing & guards

File‑based routes live under **`src/routes/`**. A single HashRouter tree is created in
`main.tsx`:

| URL             | Guard                | Shell              | Purpose                                                |
| --------------- | -------------------- | ------------------ | ------------------------------------------------------ |
| `#/`            | `RequireFocusedAuth` | `PlayerShell`      | Participant view                                       |
| `#/facilitator` | `RequireFocusedAuth` | `FacilitatorShell` | Facilitator dashboard (lazy‑loaded)                    |
| `#/login`       | `RedirectIfAuthed`   | –                  | Public login page                                      |
| `#/logout`      | –                    | –                  | Triggers `authAdapter.logout()` and clears local state |

- **`RequireFocusedAuth`** – redirects to `/login` unless a _session + group_ exist.
- **`RedirectIfAuthed`** – keeps logged‑in users away from `/login`, forwarding them to
  the correct shell.

### Authentication flow

All auth calls use the **`authAdapter`** from `epicenter-libs` v3, wrapped in
TanStack Query **mutations** (`src/query/auth.ts`).

1. **Login** `authAdapter.login({ handle, password, groupKey? })` – if the response has
   `multipleGroups: true` we fetch the list of groups, render a radio table, and re‑submit
   with a chosen `groupKey`.
2. **Session regeneration** Epicenter expires tokens after inactivity. Errors with codes
   `AUTHENTICATION_EXPIRED` or `AUTHENTICATION_INVALIDATED` trigger the
   `regenerateSession()` helper, which calls `authAdapter.regenerate()` and then retries
   the failed query transparently.
3. **Logout (`#/logout`)** The dedicated route calls `authAdapter.logout()`, clears the
   QueryClient, wipes Jotai atoms, and finally navigates to `/login`.

### Data‑fetching conventions (`query/`)

Every _read_ lives in its own module, returning a **`queryOptions`** object. Components
consume them via `useQuery(...)`.

#### Key design rules

1. **Include every variable the `queryFn` depends on in `queryKey`.** This guarantees that
   a change in any dependency results in a _new_ cache entry instead of stale data reuse.
2. **Order key parts from broad → narrow.** Doing so lets you selectively invalidate
   coarse slices (e.g. `['episode']`) without evicting unrelated child caches.

#### Example – `EpisodeQuery.current`

```ts
const current = ({ session }: { session: UserSession }) =>
  queryOptions({
    queryKey: ['episode', 'current', session.groupName, session.groupRole],
    queryFn: async () => {
      const [current] = await episodeAdapter
        .query({
          sort: ['-episode.created'],
          max: 1,
        })
        .then((response) => response.values as Array<EpisodeReadOutView>);
      if (current) return current;
      if (session.groupRole === 'FACILITATOR') {
        const episodeName = 'ep'.concat(Date.now().toString());
        return episodeAdapter
          .create(episodeName, session.groupName!)
          .then((episode) => episode as unknown as EpisodeReadOutView);
      }
      throw new Error('No episode found');
    },
    staleTime: Infinity,
    enabled: Boolean(session.groupName),
  });
```

> When you pass this object to `useQuery(EpisodeQuery.current({ session }))` the key is
> guaranteed to change whenever **`session.groupName`** does, which forces a refetch
> instead of leaking data across groups.

### Push channels (`query/channel.ts`)

Real‑time updates arrive over Epicenter push channels (CometD) via the `Channel` class
from `epicenter-libs`. Two hooks wrap it:

- **`useChannel({ scopeBoundary, scopeKey, pushCategory })`** – returns a memoized
  `Channel` for that scope, or `undefined` until every part of the scope is known.
- **`useChannelEffect({ token, channel, callback })`** – subscribes when the component
  mounts and unsubscribes when it unmounts or when `channel`, `callback`, or `token`
  changes. Subscribes and unsubscribes are serialized through a queue so the newest
  subscription always wins, and errors are caught and logged so one failed subscribe
  cannot block the ones after it.

```tsx
const groupChannel = useChannel({
  scopeBoundary: SCOPE_BOUNDARY.GROUP,
  scopeKey: session.groupKey,
  pushCategory: PUSH_CATEGORY.GROUP,
});

useChannelEffect({
  token: session.token, // re-subscribe after the session is regenerated
  channel: groupChannel,
  callback: onGroupChannelPush, // keep it stable with useCallback
});
```

#### Guidelines

1. **Do not cache channels or listeners outside React.** Derive the `Channel` from the
   current scope, and pass `session.token` as the effect dependency. Logging out and then
   into another group changes the scope and token, so fresh subscriptions are made; a
   module‑level cache would keep delivering to the old group until a page refresh.
2. **Treat push as a hint, not the source of truth.** On a push, invalidate the
   affected queries (as `PlayerShell` does for episodes) rather than patching state from
   the message. Messages are not replayed for the time a connection was down, and a push
   can occasionally never arrive, so every push‑driven view must be refetchable.
3. **Refetch on reconnect.** `main.tsx` registers an `errorManager` handler for
   `COMETD_RECONNECTED` that invalidates all active queries. The library raises that code
   on every not‑connected → connected transition, so the handler skips the first one
   (the initial connect, when queries are already fresh) and runs on later reconnects,
   including the one after `regenerateSession()`.
4. **Use `epicenter-libs` 3.35 or later.** From 3.35 the library restores subscriptions
   after a re‑handshake, treats a failed CometD disconnect as best‑effort (so
   `regenerate()` and `logout()` do not fail or lose the session when the socket closes
   before the disconnect reply), and resolves `unsubscribe` after a disconnect. Earlier
   versions could drop the new session on that race, leaving a user with no session or
   dead channels until they refreshed.

#### Testing push resilience

These cases are worth checking after changing session or channel code. They come from
testing a production simulation (Root Beer Game) built on the same libraries:

- **Failed regeneration** – make `PATCH /authentication` return an error (for example
  with a Playwright `route`) while a push triggers `regenerateSession()`. The template sets
  `awaitingLogoutAtom` (so it stops retrying) and rethrows; it does not log the user out
  on its own. With `epicenter-libs` 3.35+ the failed PATCH happens before anything is
  disconnected, so existing subscriptions should keep receiving pushes.
- **Socket closing during disconnect** – close the WebSocket at the moment the client
  sends `/meta/disconnect`. Regenerate and logout must still succeed.
- **Reconnect** – close the WebSocket and confirm the `PUSH_RECONNECTED` handler refetches.
- **Logout, then log in to another group** (without reloading the page) – pushes for the
  new group must arrive.

### Extending the UI component system (`components/ui/`)

- **CSS Modules** – local, hashed class names.
- **Radix UI primitives** – accessibility & behaviour (e.g. `@radix-ui/react-dialog`).
- **Design tokens** – all colours, spacing, and radii live in `src/styles/tokens.scss`
  (Radix colour scales mapped to CSS variables).
- **`cva` (class‑variance‑authority)** – declarative styling variants.

#### `cva` primer

```ts
import { cva, type VariantProps } from 'class-variance-authority';
import styles from './tag.module.scss';

// 1 Define once
export const tagVariants = cva(styles.base, {
  variants: {
    intent: {
      info: styles.info,
      success: styles.success,
      danger: styles.danger,
    },
    size: {
      sm: styles.sm,
      lg: styles.lg,
    },
  },
  compoundVariants: [
    {
      intent: 'danger',
      size: 'lg',
      class: styles.dangerLgShadow,
    },
  ],
  defaultVariants: {
    intent: 'info',
    size: 'sm',
  },
});

// 2 Consume in the component
export interface TagProps extends VariantProps<typeof tagVariants> {}

export const Tag: React.FC<React.PropsWithChildren<TagProps>> = ({ intent, size, children }) => (
  <span className={tagVariants({ intent, size })}>{children}</span>
);
```

**Guidelines**

- Keep _layout_ (flex, grid) out of variants – reserve variants for _visual‑state_
  concerns (intent, size, emphasis).
- The first argument (`styles.base`) should contain all structural CSS; variants add or
  override.
- If a component accepts `asChild`, remember to forward the `className` to `Slot`.

---

## Internationalization (i18n)

This template includes built-in support for localization using [react-i18next](https://react.i18next.com/) and the custom `Lang` component.

Translation files live under `src/assets/lang/<language>/<namespace>.json` and are loaded at build time via [vite-plugin-i18next-loader](https://github.com/i18next/vite-plugin-i18next-loader). By default, the app is initialized with:

```ts
// src/main.tsx – excerpt
i18n.use(initReactI18next).init({
  resources,
  lng: 'en',             // default language
  fallbackLng: 'en',     // fallback language
  defaultNS: 'common',   // default namespace
  fallbackNS: 'common',
  interpolation: { escapeValue: false },
});
```

Use the `Lang` component to translate strings in your JSX:

```tsx
import { Lang } from '~/components/lang';

// Default namespace ('common')
<Lang>sim_title</Lang>

// Specify another namespace (e.g. 'error')
<Lang ns="error">not_found</Lang>

// Interpolation via the `d` prop
<Lang ns="password-reset" d={{ handle: username }}>
  no_account
</Lang>
```

`Lang` props:
- `children`: translation key (string)
- `ns?`: optional namespace (defaults to `common`)
- `d?`: optional dictionary for interpolation
- `kp?`: optional keyPrefix for nested keys

For more complex translations with JSX markup, use the `Trans` component from `react-i18next`:

```tsx
import { Trans } from 'react-i18next';

<Trans ns="error" i18nKey="GENERIC_ERROR" components={{ 0: <a href="/logout" /> }} />
```

---

Happy sim-building! 🚀
