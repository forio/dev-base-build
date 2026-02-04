import type { BaseVariables } from '~/schemas/model';
import { formatDollar } from '~/utils/formatter';
import styles from './performance-report.module.scss';

type PerformanceReportProps = {
  variables: BaseVariables;
  step: number;
};

const getValue = (value: number | null): number | null =>
  typeof value === 'number' && !Number.isNaN(value) ? value : null;

const formatNumber = (value: number | null, formatter: (n: number) => string): string =>
  value !== null ? formatter(value) : '—';

export const PerformanceReport = ({ variables, step }: PerformanceReportProps) => {
  const profit = getValue(variables.Report_Profit[step]);
  const revenue = getValue(variables.Report_Revenue[step]);
  const unitsSold = getValue(variables.Report_Units_Sold[step]);
  const price = getValue(variables.Report_Price[step]);
  const demand = getValue(variables.Report_Demand[step]);
  const capacity = getValue(variables.Report_Capacity[step]);
  const unitCost = getValue(variables.Report_Variable_Cost[step]);
  const fixedCosts = getValue(variables.Report_Fixed_Costs[step]);

  const variableCosts = unitsSold !== null && unitCost !== null ? unitsSold * unitCost : null;
  const grossMargin = revenue !== null && variableCosts !== null ? revenue - variableCosts : null;
  const profitMargin = revenue !== null && profit !== null && revenue > 0
    ? (profit / revenue) * 100
    : null;

  const isProfitable = profit !== null && profit >= 0;
  const isLoss = profit !== null && profit < 0;

  return (
    <div className={styles.report}>
      {/* Hero Profit Section */}
      <div className={styles.profitHero} data-profitable={isProfitable} data-loss={isLoss}>
        <div className={styles.profitLabel}>
          <span className={styles.profitLabelText}>Net Profit</span>
          <span className={styles.profitYear}>Previous Year</span>
        </div>
        <div className={styles.profitValue}>
          {formatNumber(profit, formatDollar)}
        </div>
        {profitMargin !== null && (
          <div className={styles.profitMargin}>
            {profitMargin >= 0 ? '+' : ''}{profitMargin.toFixed(1)}% margin
          </div>
        )}
      </div>

      {/* Income Statement */}
      <div className={styles.statement}>
        <div className={styles.statementHeader}>
          <span>Income Statement</span>
        </div>

        <div className={styles.lineItem}>
          <span className={styles.lineLabel}>Revenue</span>
          <span className={styles.lineValue}>{formatNumber(revenue, formatDollar)}</span>
        </div>

        <div className={styles.lineItemSub}>
          <span className={styles.lineLabel}>
            <span className={styles.lineBullet} />
            Units Sold
          </span>
          <span className={styles.lineValueMuted}>
            {formatNumber(unitsSold, (v) => v.toLocaleString())}
          </span>
        </div>

        <div className={styles.lineItemSub}>
          <span className={styles.lineLabel}>
            <span className={styles.lineBullet} />
            Price per Unit
          </span>
          <span className={styles.lineValueMuted}>
            {formatNumber(price, formatDollar)}
          </span>
        </div>

        <div className={styles.divider} />

        <div className={styles.lineItem}>
          <span className={styles.lineLabel}>Cost of Goods Sold</span>
          <span className={styles.lineValueNegative}>
            ({formatNumber(variableCosts, formatDollar)})
          </span>
        </div>

        <div className={styles.lineItemSub}>
          <span className={styles.lineLabel}>
            <span className={styles.lineBullet} />
            Unit Cost × {formatNumber(unitsSold, (v) => v.toLocaleString())}
          </span>
          <span className={styles.lineValueMuted}>
            {formatNumber(unitCost, formatDollar)}/unit
          </span>
        </div>

        <div className={styles.divider} />

        <div className={styles.lineItemSubtotal}>
          <span className={styles.lineLabel}>Gross Margin</span>
          <span className={styles.lineValue}>{formatNumber(grossMargin, formatDollar)}</span>
        </div>

        <div className={styles.divider} />

        <div className={styles.lineItem}>
          <span className={styles.lineLabel}>Operating Expenses</span>
          <span className={styles.lineValueNegative}>
            ({formatNumber(fixedCosts, formatDollar)})
          </span>
        </div>

        <div className={styles.lineItemSub}>
          <span className={styles.lineLabel}>
            <span className={styles.lineBullet} />
            Fixed Costs
          </span>
          <span className={styles.lineValueMuted}>
            {formatNumber(fixedCosts, formatDollar)}
          </span>
        </div>

        <div className={styles.dividerThick} />

        <div className={styles.lineItemTotal} data-profitable={isProfitable} data-loss={isLoss}>
          <span className={styles.lineLabel}>Net Profit</span>
          <span className={styles.lineValue}>{formatNumber(profit, formatDollar)}</span>
        </div>
      </div>

      {/* Key Inputs Grid */}
      <div className={styles.inputsGrid}>
        <div className={styles.inputCard} data-role="sales">
          <span className={styles.inputLabel}>Demand</span>
          <span className={styles.inputValue}>
            {formatNumber(demand, (v) => v.toLocaleString())}
          </span>
          <span className={styles.inputRole}>Sales</span>
        </div>
        <div className={styles.inputCard} data-role="operations">
          <span className={styles.inputLabel}>Capacity</span>
          <span className={styles.inputValue}>
            {formatNumber(capacity, (v) => v.toLocaleString())}
          </span>
          <span className={styles.inputRole}>Operations</span>
        </div>
        <div className={styles.inputCard} data-constraint={demand !== null && capacity !== null && demand > capacity}>
          <span className={styles.inputLabel}>Utilization</span>
          <span className={styles.inputValue}>
            {unitsSold !== null && capacity !== null && capacity > 0
              ? `${((unitsSold / capacity) * 100).toFixed(0)}%`
              : '—'}
          </span>
          <span className={styles.inputHint}>
            {demand !== null && capacity !== null && demand > capacity
              ? 'Constrained'
              : 'Unconstrained'}
          </span>
        </div>
      </div>
    </div>
  );
};
