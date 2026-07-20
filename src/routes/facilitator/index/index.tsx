import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Download, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import invariant from 'tiny-invariant';
import { Button } from '~/components/ui/button/button';
import { Card } from '~/components/ui/card/card';
import { Table } from '~/components/ui/table/table';
import { useGuardedSession } from '~/query/auth';
import { EpisodeQuery } from '~/query/episode';
import { GroupQuery } from '~/query/group';
import { buildDocument, buildResults, useDownloadPresentation } from '~/query/powerpoint';
import { RunQuery } from '~/query/run';
import { formatDollar, formatDollarSI } from '~/utils/formatter';
import styles from './index.module.scss';

/** Shared, deterministic color palette so on-screen charts read like the deck. */
const PALETTE = [
  '#2563eb',
  '#f97316',
  '#16a34a',
  '#db2777',
  '#9333ea',
  '#0891b2',
  '#ca8a04',
  '#dc2626',
];

/**
 * The three on-screen result views map 1:1 to the three result slides in the
 * generated deck, so the facilitator previews exactly what they download.
 */
const TABS = [
  { id: 'standings', label: 'Final Standings' },
  { id: 'profit', label: 'Profit by Player' },
  { id: 'market', label: 'The Market' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export const Route = () => {
  const queryClient = useQueryClient();
  const session = useGuardedSession();

  const { data: currentEpisode } = useSuspenseQuery(EpisodeQuery.current({ session }));
  const { data: episodes = [] } = useSuspenseQuery(EpisodeQuery.list({ session }));

  const [selectedEpisodeKey, setSelectedEpisodeKey] = useState(currentEpisode.episodeKey);
  const selectedEpisode = episodes.find((ep) => ep.episodeKey === selectedEpisodeKey);
  invariant(selectedEpisode, 'Selected episode not found in episode list');

  const [tab, setTab] = useState<TabId>('standings');

  const { data: members = [] } = useSuspenseQuery(GroupQuery.members({ session }));
  const participants = useMemo(
    () =>
      new Map(
        members
          .filter((member) => member.role === 'participant')
          .map((p) => [p.user.userKey, p])
      ),
    [members]
  );

  const { data: runs = [] } = useQuery(
    RunQuery.byEpisode({ session, episode: selectedEpisode })
  );

  // buildResults() is the single source of truth for both the UI and the deck.
  const results = useMemo(() => buildResults(runs, participants), [runs, participants]);

  const download = useDownloadPresentation();
  const handleDownload = () => {
    const document = buildDocument({ results, session, episode: selectedEpisode });
    download.mutate(document);
  };

  const newEpisode = () =>
    EpisodeQuery.push(session.groupName!).then(() =>
      Promise.all([
        queryClient.refetchQueries(EpisodeQuery.list({ session })),
        queryClient.refetchQueries(EpisodeQuery.current({ session })),
      ]).then(() => {
        const current = queryClient.getQueryData(
          EpisodeQuery.current({ session }).queryKey
        );
        invariant(current, 'Just created an episode but none found in cache');
        setSelectedEpisodeKey(current.episodeKey);
      })
    );

  // Recharts-friendly reshapes of the same view models.
  const profitOverTime = useMemo(
    () =>
      results.years.map((year, i) => ({
        year,
        ...Object.fromEntries(
          results.standings.map((row) => [row.name, row.profitByYear[i]])
        ),
      })),
    [results]
  );
  const revenueShare = results.standings.map((row) => ({
    name: row.name,
    value: row.totalRevenue,
  }));

  const hasData = results.standings.length > 0;

  return (
    <div className={styles.root}>
      <header className={styles.toolbar}>
        <label className={styles.selectEpisode}>
          Episode
          <select
            value={selectedEpisodeKey}
            onChange={(e) => setSelectedEpisodeKey(e.target.value)}
          >
            {episodes.map((ep) => (
              <option key={ep.episodeKey} value={ep.episodeKey}>
                {new Date(ep.created).toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.toolbarActions}>
          <Button size="sm" variant="secondary" onClick={newEpisode}>
            New Episode
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={handleDownload}
            disabled={!hasData || download.isPending}
          >
            {download.isPending ? (
              <Loader2 className={styles.spin} size={16} />
            ) : (
              <Download size={16} />
            )}
            Download Results
          </Button>
        </div>
      </header>

      {download.isError && (
        <Card className={styles.error}>
          Could not generate the presentation:{' '}
          {(download.error as Error)?.message ?? 'unknown error'}
        </Card>
      )}

      {!hasData ? (
        <Card className={styles.empty}>
          <p>No participant results for this episode yet.</p>
          <p className={styles.muted}>
            Once players submit their pricing decisions, their results will appear here
            and can be exported to PowerPoint.
          </p>
        </Card>
      ) : (
        <>
          <nav className={styles.tabs} role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={tab === t.id ? styles.tabActive : styles.tab}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* ── Slide 3 preview: Final Standings (table) ── */}
          {tab === 'standings' && (
            <div className={styles.panel}>
              <div className={styles.kpis}>
                <Card className={styles.kpi}>
                  <span className={styles.kpiLabel}>Top Performer</span>
                  <span className={styles.kpiValue}>{results.topPerformer?.name}</span>
                </Card>
                <Card className={styles.kpi}>
                  <span className={styles.kpiLabel}>Winning Profit</span>
                  <span className={styles.kpiValue}>
                    {formatDollar(results.topPerformer?.totalProfit)}
                  </span>
                </Card>
                <Card className={styles.kpi}>
                  <span className={styles.kpiLabel}>Average Profit</span>
                  <span className={styles.kpiValue}>
                    {formatDollar(results.averageProfit)}
                  </span>
                </Card>
              </div>
              <Table striped compact numeric hover>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Rounds</th>
                    <th>Avg. Price</th>
                    <th>Total Revenue</th>
                    <th>Total Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {results.standings.map((row) => (
                    <tr key={row.userKey}>
                      <td>{row.rank}</td>
                      <td>{row.name}</td>
                      <td>{row.yearsPlayed}</td>
                      <td>{formatDollar(row.avgPrice)}</td>
                      <td>{formatDollar(row.totalRevenue)}</td>
                      <td>{formatDollar(row.totalProfit)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}

          {/* ── Slide 4 preview: Profit by Player (bar chart) ── */}
          {tab === 'profit' && (
            <Card className={styles.chartCard}>
              <h2>Total Profit by Player</h2>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart
                  data={results.standings.map((row) => ({
                    name: row.name,
                    profit: row.totalProfit,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" style={{ fontSize: 13 }} />
                  <YAxis
                    tickFormatter={(v: number) => formatDollarSI(v)}
                    style={{ fontSize: 13 }}
                  />
                  <Tooltip formatter={(v: number) => formatDollar(v)} />
                  <Bar dataKey="profit" name="Total Profit">
                    {results.standings.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* ── Slide 5 preview: The Market (line + pie) ── */}
          {tab === 'market' && (
            <div className={styles.marketGrid}>
              <Card className={styles.chartCard}>
                <h2>Profit Over Time</h2>
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart data={profitOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" style={{ fontSize: 13 }} />
                    <YAxis
                      tickFormatter={(v: number) => formatDollarSI(v)}
                      style={{ fontSize: 13 }}
                    />
                    <Tooltip formatter={(v: number) => formatDollar(v)} />
                    <Legend />
                    {results.standings.map((row, i) => (
                      <Line
                        key={row.userKey}
                        type="monotone"
                        dataKey={row.name}
                        stroke={PALETTE[i % PALETTE.length]}
                        connectNulls
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Card>
              <Card className={styles.chartCard}>
                <h2>Revenue Share</h2>
                <ResponsiveContainer width="100%" height={360}>
                  <PieChart>
                    <Tooltip formatter={(v: number) => formatDollar(v)} />
                    <Legend />
                    <Pie
                      data={revenueShare}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={120}
                      label={(entry) => (entry as { name?: string }).name ?? ''}
                    >
                      {revenueShare.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};
