/**
 * PowerPoint results module
 * ---------------------------------------------------------------------------
 * This is the heart of the example. It shows the end-to-end pattern for the
 * Epicenter PowerPoint API:
 *
 *   1. Aggregate model-run results for an episode into plain view-models
 *      ({@link buildResults}). The facilitator UI renders these directly, so
 *      what you see on screen is exactly what lands in the deck.
 *   2. Shape those view-models into a {@link DocumentShadow} — the JSON contract
 *      the PowerPoint service merges into a styled `.pptx` template
 *      ({@link buildDocument}). This is where charts and tables are declared.
 *   3. Stream the generated file back and trigger a browser download
 *      ({@link useDownloadPresentation}).
 *
 * The template (`model/results-template.pptx`) supplies all slide *design*; the
 * document below only supplies *data*, matched to the template by shape name.
 */

import { useMutation } from '@tanstack/react-query';
import { UserSession } from 'epicenter-libs';
import { EpisodeReadOutView } from '~/types/episode';
import { GroupPermissionReadOutView } from '~/types/group';
import { RunReadOutView } from '~/types/run';
import { Variables } from '~/query/run';
import { DocumentShadow, powerpointAdapter } from '~/adapters/powerpoint';

/**
 * Where the `.pptx` template lives and what it is called. The template is
 * deployed into the project's MODEL directory via `npm run deploy:model`, so it
 * sits next to `model.xlsx`. Swap the directory to `'DATA'` if you prefer to
 * host the template under the project's data files instead.
 */
export const TEMPLATE_DIRECTORY = 'MODEL' as const;
export const TEMPLATE_PATH = 'results-template.pptx';

/* ─────────────────────────── View models ─────────────────────────── */

/** One participant's aggregated performance across the rounds they played. */
export interface StandingRow {
  rank: number;
  userKey: string;
  name: string;
  yearsPlayed: number;
  avgPrice: number;
  totalRevenue: number;
  totalProfit: number;
  /** Per-year profit, aligned to {@link Results.years}; `null` before a round is played. */
  profitByYear: Array<number | null>;
}

export interface Results {
  /** Union of the year labels seen across all participants (category axis). */
  years: number[];
  standings: StandingRow[];
  participantCount: number;
  topPerformer?: StandingRow;
  averageProfit: number;
}

const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0);
const mean = (values: number[]): number =>
  values.length ? sum(values) / values.length : 0;

/**
 * Turn the raw runs for an episode into ranked, chart-ready results.
 * Pure and framework-free so it is trivial to unit-test and reason about.
 *
 * The Bike model exposes parallel arrays indexed by year: `Time`, `Price`,
 * `Revenue`, `Profit`, etc. `Step` is the index of the round the participant
 * is currently on, so indices `0..Step` are the rounds they have completed.
 */
export const buildResults = (
  runs: Array<RunReadOutView<Variables>>,
  participants: Map<string, GroupPermissionReadOutView>
): Results => {
  // Longest timeline drives the shared category axis for the line chart.
  const longest = runs.reduce(
    (max, run) => Math.max(max, run.variables.Step),
    0
  );
  const reference = runs.find((run) => run.variables.Step === longest);
  const years = reference
    ? reference.variables.Time.slice(0, longest + 1)
    : [];

  const rows: StandingRow[] = runs.map((run) => {
    const { Step, Time, Price, Revenue, Profit } = run.variables;
    const played = Array.from({ length: Step + 1 }, (_, i) => i);
    const userKey = run.scope.userKey ?? run.runKey;

    return {
      rank: 0,
      userKey,
      name: participants.get(userKey)?.user.displayName ?? 'Unknown player',
      yearsPlayed: Step,
      avgPrice: mean(played.map((i) => Price[i] ?? 0)),
      totalRevenue: sum(played.map((i) => Revenue[i] ?? 0)),
      totalProfit: sum(played.map((i) => Profit[i] ?? 0)),
      profitByYear: (years.length ? years : Time).map((_, i) =>
        i <= Step ? (Profit[i] ?? null) : null
      ),
    };
  });

  rows.sort((a, b) => b.totalProfit - a.totalProfit);
  rows.forEach((row, i) => (row.rank = i + 1));

  return {
    years,
    standings: rows,
    participantCount: rows.length,
    topPerformer: rows[0],
    averageProfit: mean(rows.map((r) => r.totalProfit)),
  };
};

/* ─────────────────── Document (DocumentShadow) shaping ─────────────────── */

const usd = (n: number): string =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

/**
 * Build the {@link DocumentShadow} sent to the PowerPoint service.
 *
 * The template has five slides:
 *   1. Title / intro          — text parameters only
 *   2. How to read the deck   — static design + a generated-on stamp
 *   3. Final Standings        — a table (`FinalStandings`) + KPI text
 *   4. Profit by Participant  — a bar chart (`ProfitByParticipant`)
 *   5. The Market            — a line chart (`ProfitOverTime`) + pie (`RevenueShare`)
 *
 * Every `name` below must match the corresponding shape name in the template.
 */
export const buildDocument = ({
  results,
  session,
  episode,
}: {
  results: Results;
  session: UserSession;
  episode: EpisodeReadOutView;
}): DocumentShadow => {
  const { standings, years, participantCount, topPerformer, averageProfit } =
    results;
  const generatedOn = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const episodeLabel = new Date(episode.created).toLocaleDateString('en-US', {
    dateStyle: 'medium',
  });

  return {
    output: `bike-shop-results-${episodeLabel.replace(/\W+/g, '-')}.pptx`,
    slides: [
      // ── Slide 1: title ──────────────────────────────────────────────
      // NOTE: The service only substitutes a token that is the *entire* text of
      // its box; multiple tokens in one line get corrupted (epicenter-1553).
      // So we compose the summary/footer lines here and pass each as one token.
      {
        number: 1,
        environment: {
          parameters: {
            title: 'Bike Shop Challenge',
            subtitle: 'Facilitator Results Debrief',
            summary: `${session.groupName ?? ''}  •  ${episodeLabel}  •  ${participantCount} players`,
            generated: `Generated ${generatedOn}`,
          },
        },
      },
      // ── Slide 2: how to read ────────────────────────────────────────
      {
        number: 2,
        environment: {
          parameters: { generated: `Generated ${generatedOn}` },
        },
      },
      // ── Slide 3: final standings (TABLE + KPI text) ─────────────────
      {
        number: 3,
        environment: {
          parameters: {
            topPerformer: topPerformer?.name ?? '—',
            topProfit: topPerformer ? usd(topPerformer.totalProfit) : '—',
            averageProfit: usd(averageProfit),
          },
          tables: [
            {
              name: 'FinalStandings',
              header: [
                'Rank',
                'Player',
                'Rounds',
                'Avg. Price',
                'Total Revenue',
                'Total Profit',
              ],
              data: standings.map((row) => [
                row.rank,
                row.name,
                row.yearsPlayed,
                usd(row.avgPrice),
                usd(row.totalRevenue),
                usd(row.totalProfit),
              ]),
            },
          ],
        },
      },
      // ── Slide 4: profit by participant (BAR CHART) ──────────────────
      {
        number: 4,
        environment: {
          charts: [
            {
              name: 'ProfitByParticipant',
              categories: standings.map((row) => row.name),
              series: [
                {
                  bar: {
                    name: 'Total Profit',
                    data: standings.map((row) => ({ n: row.totalProfit })),
                  },
                },
              ],
            },
          ],
        },
      },
      // ── Slide 5: the market (LINE CHART + PIE CHART) ────────────────
      {
        number: 5,
        environment: {
          charts: [
            {
              name: 'ProfitOverTime',
              categories: years,
              series: standings.map((row) => ({
                line: {
                  name: row.name,
                  data: row.profitByYear.map((val) => ({ n: val })),
                },
              })),
            },
            {
              name: 'RevenueShare',
              categories: standings.map((row) => row.name),
              series: [
                {
                  pie: {
                    name: 'Total Revenue',
                    data: standings.map((row) => ({ n: row.totalRevenue })),
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };
};

/* ───────────────────────────── Download ───────────────────────────── */

/** Save a Blob to disk by clicking a transient object-URL anchor. */
const saveBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

/**
 * Mutation hook that generates the deck and downloads it. Uses
 * {@link powerpointAdapter.stream} (POST) because it hands back a raw
 * `Response` we can turn straight into a Blob — no base64/hex decode needed.
 */
export const useDownloadPresentation = () =>
  useMutation({
    mutationFn: async (document: DocumentShadow) => {
      const response = await powerpointAdapter.stream(
        TEMPLATE_DIRECTORY,
        TEMPLATE_PATH,
        document
      );
      if (!response.ok) {
        throw new Error(
          `PowerPoint generation failed (${response.status} ${response.statusText})`
        );
      }
      const blob = await response.blob();
      saveBlob(blob, document.output ?? 'results.pptx');
      return true;
    },
  });

export const PowerPointResults = { buildResults, buildDocument };
