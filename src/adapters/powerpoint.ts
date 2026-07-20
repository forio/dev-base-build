/**
 * PowerPoint adapter (vendored)
 * ---------------------------------------------------------------------------
 * Epicenter exposes a PowerPoint generation service at
 *   `{apiHost}/api/v3/{account}/{project}/powerpoint/{TEMPLATE_DIRECTORY}/{TEMPLATE_PATH}`
 *
 * At the time this example was written, `epicenter-libs` did **not yet ship** a
 * `powerpointAdapter`, so this file vendors a faithful copy of the adapter that
 * is slated for release. It is written against the library's *public* exports
 * (`Router`, `config`, `authAdapter`) so it works today with `epicenter-libs`
 * v3.32. When the official `powerpointAdapter` ships, delete this file and
 * replace imports of `~/adapters/powerpoint` with:
 *
 *   import { powerpointAdapter } from 'epicenter-libs';
 *
 * The type shapes and method signatures below are intentionally identical to
 * the forthcoming adapter, so that swap is a one-line change.
 *
 * ── How the service works ──────────────────────────────────────────────────
 * You author a *styled* `.pptx` template and deploy it into the project's
 * `MODEL` (or `DATA`) file directory. The template contains named placeholders:
 *   • text placeholders (filled from `environment.parameters`)
 *   • named charts        (filled from `environment.charts`)
 *   • named tables        (filled from `environment.tables`)
 *   • named pictures      (filled from `environment.pictures`)
 * You then POST a `DocumentShadow` describing which data goes on which slide.
 * The service merges your data into the template and streams back a finished
 * `.pptx`. All slide *design* lives in the template; the API only supplies data.
 */

import { Router, config, authAdapter } from 'epicenter-libs';

/** Directories in a project where a `.pptx` template may live. */
export type TemplateDirectory = 'DATA' | 'MODEL';

// ──────────────────────────────────────────────
// Data Points
// ──────────────────────────────────────────────

/** A single numeric value (bar/area/line/pie series). */
export interface NDataPoint {
  n?: number | null;
}

/** A single {x, y} pair (scatter / xy series). */
export interface XYDataPoint {
  x?: number | null;
  y?: number | null;
}

// ──────────────────────────────────────────────
// Chart Series
// ──────────────────────────────────────────────

export interface BarSeriesShadow {
  objectType: 'bar';
  name?: string;
  data?: NDataPoint[] | null;
}

export interface AreaSeriesShadow {
  objectType: 'area';
  name?: string;
  data?: NDataPoint[] | null;
}

export interface LineSeriesShadow {
  objectType: 'line';
  name?: string;
  data?: NDataPoint[] | null;
}

export interface PieSeriesShadow {
  objectType: 'pie';
  name?: string;
  data?: NDataPoint[] | null;
}

export interface ScatterSeriesShadow {
  objectType: 'scatter';
  name?: string;
  data?: XYDataPoint[] | null;
}

export interface YSeriesShadow {
  objectType: 'y';
  name?: string;
  data?: number[] | null;
}

export interface XYSeriesShadow {
  objectType: 'xy';
  name?: string;
  data?: XYDataPoint[] | null;
}

export type SeriesShadow =
  | BarSeriesShadow
  | AreaSeriesShadow
  | LineSeriesShadow
  | PieSeriesShadow
  | ScatterSeriesShadow
  | YSeriesShadow
  | XYSeriesShadow;

// ──────────────────────────────────────────────
// Chart, Table, Picture
// ──────────────────────────────────────────────

/** Fills a named chart placeholder in the template. */
export interface ChartShadow {
  /** Must match the chart's shape name in the template. */
  name?: string;
  /** Category axis labels (shared across series). */
  categories?: unknown[] | null;
  series?: SeriesShadow[] | null;
}

/** Fills a named table placeholder in the template. */
export interface TableShadow {
  /** Must match the table's shape name in the template. */
  name?: string;
  /** Optional header row. */
  header?: unknown;
  /** Body rows; each row is an array of cell values. */
  data?: unknown[] | null;
}

/** Fills a named picture placeholder in the template. */
export interface PictureShadow {
  name?: string;
  data?: BinaryData;
}

// ──────────────────────────────────────────────
// Binary Data
// ──────────────────────────────────────────────

/** JSON-encoded binary payload used for pictures and `generate()` output. */
export interface BinaryData {
  encoding: 'HEX' | 'BASE_64';
  data: unknown;
  encryption?: 'AES' | null;
  name?: string | null;
  content_type?: string | null;
  contentType?: unknown;
}

// ──────────────────────────────────────────────
// Environment, Slide, Document
// ──────────────────────────────────────────────

/** The bag of data that can be merged into a slide (or the whole document). */
export interface EnvironmentShadow {
  /** Text token replacements, keyed by placeholder name. */
  parameters?: Record<string, unknown> | null;
  charts?: ChartShadow[] | null;
  tables?: TableShadow[] | null;
  pictures?: PictureShadow[] | null;
}

export interface SlideShadow {
  /** Slide number (1-based) this environment targets in the template. */
  number?: number;
  environment?: EnvironmentShadow;
}

export interface DocumentShadow {
  /** Suggested output filename, e.g. `bike-shop-results.pptx`. */
  output?: string;
  /** Document-wide environment (parameters/charts applied across slides). */
  environment?: EnvironmentShadow;
  /** Per-slide environments. */
  slides?: SlideShadow[] | null;
}

/** Network-call overrides (mirrors epicenter-libs' RoutingOptions subset). */
export interface PowerPointOptions {
  server?: string;
  accountShortName?: string;
  projectShortName?: string;
  useProjectProxy?: boolean;
  query?: Record<string, unknown> | string | string[][] | URLSearchParams;
  headers?: Record<string, string>;
  authorization?: string;
  includeAuthorization?: boolean;
  body?: unknown;
}

/**
 * Generate a PowerPoint from a template and return it as JSON-encoded binary.
 * Base URL: PUT `.../powerpoint/{TEMPLATE_DIRECTORY}/{TEMPLATE_PATH}`
 *
 * Prefer {@link stream} when you want to download the file directly in the
 * browser — it avoids the base64/hex decode step.
 *
 * @example
 * const binary = await powerpointAdapter.generate('MODEL', 'results-template.pptx', doc);
 */
export async function generate(
  templateDirectory: TemplateDirectory,
  templatePath: string,
  document: DocumentShadow,
  optionals: PowerPointOptions = {}
): Promise<BinaryData> {
  // `Router.put` automatically attaches the current session's bearer token.
  return new Router()
    .put(`/powerpoint/${templateDirectory}/${templatePath}`, {
      body: document,
      ...optionals,
    })
    .then(({ body }) => body as BinaryData);
}

/**
 * Generate a PowerPoint from a template and return the raw `Response` so the
 * file can be streamed / turned into a Blob for download.
 * Base URL: POST `.../powerpoint/{TEMPLATE_DIRECTORY}/{TEMPLATE_PATH}`
 *
 * @example
 * const res = await powerpointAdapter.stream('MODEL', 'results-template.pptx', doc);
 * const blob = await res.blob();
 */
export async function stream(
  templateDirectory: TemplateDirectory,
  templatePath: string,
  document: DocumentShadow,
  optionals: PowerPointOptions = {}
): Promise<Response> {
  const {
    server,
    accountShortName,
    projectShortName,
    useProjectProxy,
    query,
    headers: headersOverride,
    authorization,
    includeAuthorization,
  } = optionals;

  const url = new Router().getURL(`/powerpoint/${templateDirectory}/${templatePath}`, {
    server,
    accountShortName,
    projectShortName,
    useProjectProxy,
    query,
  });

  const headers: Record<string, string> = {
    'Content-type': 'application/json; charset=UTF-8',
    ...headersOverride,
  };

  // Resolve the bearer token from (in priority order): an explicit override,
  // the SDK's auth override, then the logged-in session. The official adapter
  // reads this from the library's internal `identification`; we use the public
  // `authAdapter.getLocalSession()` to achieve the same result.
  if (includeAuthorization !== false && !headers.Authorization) {
    const session = authAdapter.getLocalSession();
    if (session?.token) headers.Authorization = `Bearer ${session.token}`;
    if (authorization) headers.Authorization = authorization;
    if (config.authOverride) headers.Authorization = config.authOverride;
  }

  return fetch(url.toString(), {
    method: 'POST',
    cache: 'no-cache',
    redirect: 'follow',
    headers,
    body: JSON.stringify(document),
  });
}

export const powerpointAdapter = { generate, stream };
