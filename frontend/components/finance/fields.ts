import type { FinancialInputKey } from "@/contracts/types";

export type UnitType = "inr" | "pct" | "count";

export interface FieldDefinition {
  key: FinancialInputKey;
  label: string;
  unit: UnitType;
  isMustHave: boolean;
  validate: (val: number) => string | null;
}

export const FINANCIAL_FIELD_DEFS: Record<FinancialInputKey, FieldDefinition> = {
  arpu_monthly: {
    key: "arpu_monthly",
    label: "Monthly ARPU",
    unit: "inr",
    isMustHave: true,
    validate: (v: number) => {
      if (!Number.isFinite(v)) return "Must be a valid finite number";
      if (v <= 0) return "ARPU must be strictly greater than 0";
      return null;
    },
  },
  cac: {
    key: "cac",
    label: "Customer Acquisition Cost (CAC)",
    unit: "inr",
    isMustHave: true,
    validate: (v: number) => {
      if (!Number.isFinite(v)) return "Must be a valid finite number";
      if (v <= 0) return "CAC must be strictly greater than 0";
      return null;
    },
  },
  gross_margin_pct: {
    key: "gross_margin_pct",
    label: "Gross Margin %",
    unit: "pct",
    isMustHave: false,
    validate: (v: number) => {
      if (!Number.isFinite(v)) return "Must be a valid finite number";
      if (v < 0 || v > 100) return "Gross margin must be between 0% and 100%";
      return null;
    },
  },
  monthly_churn_pct: {
    key: "monthly_churn_pct",
    label: "Monthly Churn %",
    unit: "pct",
    isMustHave: false,
    validate: (v: number) => {
      if (!Number.isFinite(v)) return "Must be a valid finite number";
      if (v < 0 || v > 100) return "Monthly churn must be between 0% and 100%";
      return null;
    },
  },
  cash_in_bank: {
    key: "cash_in_bank",
    label: "Cash in Bank",
    unit: "inr",
    isMustHave: true,
    validate: (v: number) => {
      if (!Number.isFinite(v)) return "Must be a valid finite number";
      if (v < 0) return "Cash in bank cannot be negative";
      return null;
    },
  },
  fixed_opex_monthly: {
    key: "fixed_opex_monthly",
    label: "Fixed Monthly Opex",
    unit: "inr",
    isMustHave: true,
    validate: (v: number) => {
      if (!Number.isFinite(v)) return "Must be a valid finite number";
      if (v < 0) return "Monthly opex cannot be negative";
      return null;
    },
  },
  current_customers: {
    key: "current_customers",
    label: "Current Customers",
    unit: "count",
    isMustHave: false,
    validate: (v: number) => {
      if (!Number.isFinite(v)) return "Must be a valid finite number";
      if (v < 0) return "Customer count cannot be negative";
      return null;
    },
  },
  new_customers_monthly: {
    key: "new_customers_monthly",
    label: "New Customers / mo",
    unit: "count",
    isMustHave: true,
    validate: (v: number) => {
      if (!Number.isFinite(v)) return "Must be a valid finite number";
      if (v < 0) return "New customers cannot be negative";
      return null;
    },
  },
  new_customer_growth_pct_monthly: {
    key: "new_customer_growth_pct_monthly",
    label: "New Customer Growth % / mo",
    unit: "pct",
    isMustHave: false,
    validate: (v: number) => {
      if (!Number.isFinite(v)) return "Must be a valid finite number";
      if (v < -100 || v > 100) return "Growth rate must be between -100% and +100%";
      return null;
    },
  },
};

export const ORDERED_FINANCIAL_KEYS: FinancialInputKey[] = [
  "arpu_monthly",
  "cac",
  "gross_margin_pct",
  "monthly_churn_pct",
  "cash_in_bank",
  "fixed_opex_monthly",
  "current_customers",
  "new_customers_monthly",
  "new_customer_growth_pct_monthly",
];
