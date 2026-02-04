import { useId, useMemo } from 'react';
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, YAxis } from 'recharts';
import type { BaseVariables } from '~/schemas/model';
import { formatDollar, formatDollarSI } from '~/utils/formatter';
import styles from './small-multiples.module.scss';

type MetricConfig = {
  key: keyof BaseVariables;
  label: string;
  shortLabel: string;
  color: string;
  fillColor: string;
  isDollar: boolean;
  isHero?: boolean;
};

const METRICS: MetricConfig[] = [
  {
    key: 'Report_Price',
    label: 'Unit Price',
    shortLabel: 'Price',
    color: 'var(--role-sales-9)',
    fillColor: 'var(--role-sales-4)',
    isDollar: true,
  },
  {
    key: 'Report_Demand',
    label: 'Market Demand',
    shortLabel: 'Demand',
    color: 'var(--role-sales-9)',
    fillColor: 'var(--role-sales-4)',
    isDollar: false,
  },
  {
    key: 'Report_Capacity',
    label: 'Production Capacity',
    shortLabel: 'Capacity',
    color: 'var(--role-operations-9)',
    fillColor: 'var(--role-operations-4)',
    isDollar: false,
  },
  {
    key: 'Report_Variable_Cost',
    label: 'Variable Cost',
    shortLabel: 'Unit Cost',
    color: 'var(--role-operations-9)',
    fillColor: 'var(--role-operations-4)',
    isDollar: true,
  },
  {
    key: 'Report_Fixed_Costs',
    label: 'Fixed Costs',
    shortLabel: 'Fixed',
    color: 'var(--role-finance-9)',
    fillColor: 'var(--role-finance-4)',
    isDollar: true,
  },
  {
    key: 'Report_Profit',
    label: 'Net Profit',
    shortLabel: 'Profit',
    color: '#16a34a',
    fillColor: '#22c55e',
    isDollar: true,
    isHero: true,
  },
];

type SmallMultiplesChartProps = {
  variables: BaseVariables;
  step: number;
};

export const SmallMultiplesChart = ({ variables, step }: SmallMultiplesChartProps) => {
  const gradientId = useId().replace(/:/g, '');
  const time = variables.Time;

  // Prepare data for all metrics
  const data = useMemo(() => {
    const cappedLength = Math.min(time.length, step);
    return Array.from({ length: cappedLength }, (_, index) => {
      const record: Record<string, number> = { index };
      for (const metric of METRICS) {
        const series = variables[metric.key];
        record[metric.key] = Array.isArray(series) ? (series[index + 1] ?? 0) : 0;
      }
      return record;
    });
  }, [step, time, variables]);

  const stepMarker = Math.min(step, Math.max(0, data.length - 1));

  // Get current value for a metric
  const getCurrentValue = (key: keyof BaseVariables): number => {
    const series = variables[key];
    if (!Array.isArray(series)) return 0;
    const idx = Math.min(step, series.length - 1);
    return series[idx] ?? 0;
  };

  // Format value based on metric type
  const formatValue = (value: number, isDollar: boolean, compact = false): string => {
    if (!Number.isFinite(value)) return '—';
    if (isDollar) return compact ? formatDollarSI(value) : formatDollar(value);
    return value.toLocaleString();
  };

  return (
    <div className={styles.grid}>
      {METRICS.map((metric) => {
        const currentValue = getCurrentValue(metric.key);
        const values = data.map((d) => d[metric.key] as number).filter(Number.isFinite);
        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const padding = (maxVal - minVal) * 0.1 || 1;

        return (
          <div
            key={metric.key}
            className={`${styles.cell} ${metric.isHero ? styles.heroCell : ''}`}
          >
            {/* Gradient definition for hero (profit) */}
            {metric.isHero && (
              <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                  <linearGradient
                    id={`profit-fill-${gradientId}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient
                    id={`profit-stroke-${gradientId}`}
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
              </svg>
            )}

            {/* Header */}
            <div className={styles.cellHeader}>
              <span
                className={styles.cellLabel}
                style={{ color: metric.isHero ? '#16a34a' : metric.color }}
              >
                {metric.shortLabel}
              </span>
              <span className={styles.cellValue}>
                {formatValue(currentValue, metric.isDollar)}
              </span>
            </div>

            {/* Mini chart */}
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={72}>
                <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
                  <defs>
                    {!metric.isHero && (
                      <linearGradient id={`fill-${metric.key}-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={metric.color} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={metric.color} stopOpacity={0.02} />
                      </linearGradient>
                    )}
                  </defs>
                  <YAxis
                    hide
                    domain={[minVal - padding, maxVal + padding]}
                  />
                  <Area
                    isAnimationActive={false}
                    type="monotone"
                    dataKey={metric.key}
                    stroke={metric.isHero ? `url(#profit-stroke-${gradientId})` : metric.color}
                    strokeWidth={metric.isHero ? 2.5 : 1.5}
                    fill={metric.isHero ? `url(#profit-fill-${gradientId})` : `url(#fill-${metric.key}-${gradientId})`}
                  />
                  <ReferenceLine
                    x={stepMarker}
                    stroke="var(--surface-7)"
                    strokeDasharray="2 2"
                    strokeWidth={1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Range indicators */}
            <div className={styles.rangeRow}>
              <span className={styles.rangeValue}>
                {formatValue(minVal, metric.isDollar, true)}
              </span>
              <span className={styles.rangeSeparator}>—</span>
              <span className={styles.rangeValue}>
                {formatValue(maxVal, metric.isDollar, true)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
