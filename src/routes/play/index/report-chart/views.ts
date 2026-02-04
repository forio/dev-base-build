import type { BaseVariables } from '~/schemas/model';
import { formatDollarSI } from '~/utils/formatter';

export type ViewType = 'inputs' | 'pnl' | 'operations';

export type SeriesConfig = {
  key: keyof BaseVariables;
  label: string;
  color: string;
  yAxisId: 'left' | 'right';
  isDollar: boolean;
  strokeWidth?: number;
  isGradient?: boolean;
};

export type ViewConfig = {
  id: ViewType;
  label: string;
  title: string;
  series: SeriesConfig[];
  leftAxisFormatter: (value: number) => string;
  rightAxisFormatter: (value: number) => string;
};

const PROFIT_SERIES: SeriesConfig = {
  key: 'Report_Profit',
  label: 'Profit',
  color: '#16a34a',
  yAxisId: 'right',
  isDollar: true,
  strokeWidth: 3,
  isGradient: true,
};

export const VIEWS: ViewConfig[] = [
  {
    id: 'inputs',
    label: 'Inputs',
    title: 'All Inputs vs Profit',
    series: [
      { key: 'Report_Price', label: 'Price ($)', color: 'var(--role-sales-9)', yAxisId: 'left', isDollar: true },
      { key: 'Report_Demand', label: 'Demand', color: 'var(--role-sales-6)', yAxisId: 'left', isDollar: false },
      { key: 'Report_Capacity', label: 'Capacity', color: 'var(--role-operations-9)', yAxisId: 'left', isDollar: false },
      { key: 'Report_Variable_Cost', label: 'Unit Cost ($)', color: 'var(--role-operations-6)', yAxisId: 'left', isDollar: true },
      { key: 'Report_Fixed_Costs', label: 'Fixed Costs ($)', color: 'var(--role-finance-9)', yAxisId: 'left', isDollar: true },
      PROFIT_SERIES,
    ],
    leftAxisFormatter: (v) => v.toLocaleString(),
    rightAxisFormatter: formatDollarSI,
  },
  {
    id: 'pnl',
    label: 'P&L',
    title: 'Revenue, Costs & Profit',
    series: [
      { key: 'Report_Revenue', label: 'Revenue', color: 'var(--success-9)', yAxisId: 'left', isDollar: true, strokeWidth: 2 },
      { key: 'Report_Total_Costs', label: 'Total Costs', color: 'var(--danger-9)', yAxisId: 'left', isDollar: true, strokeWidth: 2 },
      { ...PROFIT_SERIES, yAxisId: 'left' },
    ],
    leftAxisFormatter: formatDollarSI,
    rightAxisFormatter: formatDollarSI,
  },
  {
    id: 'operations',
    label: 'Operations',
    title: 'Capacity Utilization',
    series: [
      { key: 'Report_Demand', label: 'Market Demand', color: 'var(--role-sales-9)', yAxisId: 'left', isDollar: false, strokeWidth: 2 },
      { key: 'Report_Capacity', label: 'Production Capacity', color: 'var(--role-operations-9)', yAxisId: 'left', isDollar: false, strokeWidth: 2 },
      { key: 'Report_Units_Sold', label: 'Units Sold', color: 'var(--success-10)', yAxisId: 'left', isDollar: false, strokeWidth: 3 },
    ],
    leftAxisFormatter: (v) => v.toLocaleString(),
    rightAxisFormatter: (v) => v.toLocaleString(),
  },
];

export const VIEWS_MAP = Object.fromEntries(VIEWS.map((v) => [v.id, v])) as Record<ViewType, ViewConfig>;
