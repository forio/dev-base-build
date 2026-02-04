import * as z from 'zod';
import type { Role } from './world';

const numberArray = z.array(z.number());
const reportSeries = z.tuple([z.null()], z.number());

// Base schema: fields all roles can read (Time, Step, all Reports)
export const BaseVariablesSchema = z.looseObject({
  Time: numberArray,
  Step: z.number(),
  Report_Units_Sold: reportSeries,
  Report_Revenue: reportSeries,
  Report_Total_Costs: reportSeries,
  Report_Profit: reportSeries,
  Report_Price: reportSeries,
  Report_Demand: reportSeries,
  Report_Capacity: reportSeries,
  Report_Variable_Cost: reportSeries,
  Report_Fixed_Costs: reportSeries,
});

// Role-specific schemas extend base with their permitted inputs
export const SalesVariablesSchema = BaseVariablesSchema.extend({
  Price: numberArray,
  Demand: numberArray,
});

export const OperationsVariablesSchema = BaseVariablesSchema.extend({
  Capacity: numberArray,
  Variable_Cost: numberArray,
});

export const FinanceVariablesSchema = BaseVariablesSchema.extend({
  Fixed_Costs: numberArray,
});

// Full schema (for facilitator) - base + ALL inputs
export const ModelVariablesSchema = BaseVariablesSchema.extend({
  Price: numberArray,
  Demand: numberArray,
  Capacity: numberArray,
  Variable_Cost: numberArray,
  Fixed_Costs: numberArray,
});

// Inferred types
export type BaseVariables = z.infer<typeof BaseVariablesSchema>;
export type SalesVariables = z.infer<typeof SalesVariablesSchema>;
export type OperationsVariables = z.infer<typeof OperationsVariablesSchema>;
export type FinanceVariables = z.infer<typeof FinanceVariablesSchema>;
export type ModelVariables = z.infer<typeof ModelVariablesSchema>;

// Role-to-schema lookup
export const ROLE_SCHEMAS = {
  Sales: SalesVariablesSchema,
  Operations: OperationsVariablesSchema,
  Finance: FinanceVariablesSchema,
} as const satisfies Record<Role, z.ZodTypeAny>;

type ModelVariableKey = keyof ModelVariables;

// Semantic subsets — `satisfies` ensures these are valid schema keys
export const MODEL_INPUTS = [
  'Price',
  'Demand',
  'Capacity',
  'Variable_Cost',
  'Fixed_Costs',
] as const satisfies readonly ModelVariableKey[];

export type ModelInputKey = (typeof MODEL_INPUTS)[number];

export const MODEL_REPORTS = [
  'Report_Units_Sold',
  'Report_Revenue',
  'Report_Total_Costs',
  'Report_Profit',
  // Report inputs (previous period decision values)
  'Report_Price',
  'Report_Demand',
  'Report_Capacity',
  'Report_Variable_Cost',
  'Report_Fixed_Costs',
] as const satisfies readonly ModelVariableKey[];

export type ModelReportKey = (typeof MODEL_REPORTS)[number];

export const MODEL_RANGES = Object.keys(ModelVariablesSchema.shape);
