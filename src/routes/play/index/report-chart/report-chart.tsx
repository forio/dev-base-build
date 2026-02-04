import { useId, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BaseVariables } from '~/schemas/model';
import { formatDollar } from '~/utils/formatter';
import styles from './report-chart.module.scss';
import { SmallMultiplesChart } from './small-multiples';
import { VIEWS, VIEWS_MAP, type ViewConfig, type ViewType } from './views';

type ReportChartProps = {
  variables: BaseVariables;
  step: number;
};

export const ReportChart = ({ variables, step }: ReportChartProps) => {
  const [activeView, setActiveView] = useState<ViewType>('pnl');
  const config = VIEWS_MAP[activeView];
  const gradientId = useId().replace(/:/g, '');
  const time = variables.Time;

  // Prepare data with ALL Report_* fields (views select what to render)
  const data = useMemo(() => {
    const cappedLength = Math.min(time.length, step);
    return Array.from({ length: cappedLength }, (_, index) => ({
      index,
      year: time[index] ?? index + 1,
      Report_Price: variables.Report_Price[index + 1],
      Report_Demand: variables.Report_Demand[index + 1],
      Report_Capacity: variables.Report_Capacity[index + 1],
      Report_Variable_Cost: variables.Report_Variable_Cost[index + 1],
      Report_Fixed_Costs: variables.Report_Fixed_Costs[index + 1],
      Report_Units_Sold: variables.Report_Units_Sold[index + 1],
      Report_Revenue: variables.Report_Revenue[index + 1],
      Report_Total_Costs: variables.Report_Total_Costs[index + 1],
      Report_Profit: variables.Report_Profit[index + 1],
    }));
  }, [step, time, variables]);

  const stepMarker = Math.min(step, Math.max(0, data.length - 1));

  return (
    <div className={styles.chartCard}>
      {/* Tab Navigation */}
      <div className={styles.tabBar}>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`${styles.tab} ${activeView === v.id ? styles.tabActive : ''}`}
            onClick={() => setActiveView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.cardEyebrow}>Performance</p>
          <h3>{config.title}</h3>
        </div>
      </div>

      {/* Chart */}
      <div className={styles.chartContainer}>
        {activeView === 'inputs' ? (
          <SmallMultiplesChart variables={variables} step={step} />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient
                  id={`profit-gradient-${gradientId}`}
                  gradientUnits="userSpaceOnUse"
                  x1="0%"
                  y1="0"
                  x2="100%"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#16a34a" />
                  <stop offset="50%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#86efac" />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="index"
                tickLine={false}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => {
                  const idx = Number(value);
                  if (!Number.isFinite(idx)) return '';
                  return String(time[idx] ?? idx + 1);
                }}
              />

              <YAxis
                yAxisId="left"
                tickFormatter={(value) =>
                  Number.isFinite(value) ? config.leftAxisFormatter(value) : ''
                }
                tick={{ fontSize: 11 }}
              />

              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) =>
                  Number.isFinite(value) ? config.rightAxisFormatter(value) : ''
                }
                tick={{ fontSize: 11 }}
              />

              <Tooltip content={<ChartTooltip config={config} time={time} />} />

              <Legend content={<ChartLegend config={config} />} />

              {/* Dynamic lines based on view config */}
              {config.series.map((s) => (
                <Line
                  isAnimationActive={false}
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  yAxisId={s.yAxisId}
                  stroke={s.isGradient ? `url(#profit-gradient-${gradientId})` : s.color}
                  strokeWidth={s.strokeWidth ?? 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                />
              ))}

              <ReferenceLine
                x={stepMarker}
                stroke="var(--surface-8)"
                strokeDasharray="4 4"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

// Custom Tooltip
const ChartTooltip = ({
  config,
  time,
  active,
  payload,
  label,
}: {
  config: ViewConfig;
  time: number[];
  active?: boolean;
  payload?: Array<{ dataKey?: string; name?: string; value?: number }>;
  label?: number;
}) => {
  if (!active || !payload?.length) return null;

  const labelIndex = Number(label);
  const yearLabel =
    Number.isFinite(labelIndex) && time[labelIndex] ? time[labelIndex] : labelIndex + 1;

  return (
    <div className={styles.customTooltip}>
      <div className={styles.tooltipLabel}>Year {yearLabel}</div>
      <ul className={styles.tooltipList}>
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? entry.name);
          const value = Number(entry.value);
          const seriesConfig = config.series.find((s) => s.key === key);
          const color = seriesConfig?.isGradient
            ? '#16a34a'
            : (seriesConfig?.color ?? 'var(--surface-9)');

          return (
            <li key={key} className={styles.tooltipItem}>
              <span className={styles.tooltipSwatch} style={{ background: color }} />
              <span className={styles.tooltipName} style={{ color }}>
                {seriesConfig?.label ?? key}
              </span>
              <span className={styles.tooltipValue}>
                {seriesConfig?.isDollar ? formatDollar(value) : value.toLocaleString()}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

// Custom Legend
const ChartLegend = ({ config }: { config: ViewConfig }) => (
  <ul className={styles.chartLegend}>
    {config.series.map((item) => (
      <li key={item.key} className={styles.chartLegendItem}>
        <span
          className={styles.chartLegendLine}
          style={{
            background: item.isGradient
              ? 'linear-gradient(90deg, #16a34a, #22c55e, #86efac)'
              : item.color,
          }}
        />
        <span style={{ color: item.isGradient ? '#16a34a' : 'var(--surface-10)' }}>
          {item.label}
        </span>
      </li>
    ))}
  </ul>
);
