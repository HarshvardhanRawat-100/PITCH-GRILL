/**
 * SecondBrain contracts - TypeScript mirror of contracts/schemas.py.
 * schemas.py is the source of truth. Keep 1:1. Additive-only after H1.
 * Money = INR rupees (number). Percent = 0-100.
 */

export type SourceType = "deck" | "web" | "inference" | "calc" | "cache" | "kb"; // kb = Meko knowledge base
export type Status = "verified" | "contradicted" | "unverified" | "assumed";
export type Persona = "finance" | "market" | "tech";
export type Speaker = Persona | "moderator" | "founder" | "system";
export type Severity = "critical" | "major" | "minor";
export type Category = "market" | "finance" | "tech" | "traction" | "team" | "competition" | "legal" | "other";
export type Resolution = "open" | "partial" | "resolved";
export type Outcome = "accepted" | "partial" | "rejected";
export type EvidenceType = "none" | "assertion" | "data_cited" | "document_referenced";
export type Verdict = "invest" | "pass" | "need_more_data";
export type DealStatus = "created" | "parsing" | "analyzing" | "ready" | "grilling" | "complete" | "error";

export interface SourceRef { type: SourceType; ref: string; quote?: string | null; retrieved_at?: string | null }
export interface Sourced { value: number | null; origin: "deck" | "assumed" | "founder"; slide?: number | null; note?: string | null }

export interface FinancialInputs {
  arpu_monthly: Sourced; cac: Sourced; gross_margin_pct: Sourced; monthly_churn_pct: Sourced;
  cash_in_bank: Sourced; fixed_opex_monthly: Sourced; current_customers: Sourced;
  new_customers_monthly: Sourced; new_customer_growth_pct_monthly: Sourced;
}
export type FinancialInputKey = keyof FinancialInputs;

export interface SlideText { n: number; text: string; used_vision: boolean }
export interface Claim { id: string; text: string; category: Category; slide?: number | null; quote?: string | null }
export interface Ask { amount_inr?: number | null; valuation_inr?: number | null; use_of_funds: string[] }
export interface DeckFacts {
  company_name: string; one_liner: string; sector: string; stage: string;
  website_url?: string | null; github_url?: string | null; ask: Ask; claims: Claim[];
  financial_inputs: FinancialInputs; tam_claim_text?: string | null; tam_claim_inr?: number | null;
  no_competitor_claim: boolean; stated_competitors: string[]; tech_claims: string[];
  missing_data: string[]; slides: SlideText[];
}

export interface Finding {
  id: string; persona: Persona; title: string; detail: string; severity: Severity; category: Category;
  claim_id?: string | null; sources: SourceRef[]; status: Status; question: string;
  resolved: Resolution; missing_proof?: string | null;
}
export interface PersonaReport { persona: Persona; headline: string; findings: Finding[] }

export interface Funding { text: string; source_url: string }
export interface Competitor {
  name: string; url: string; what_they_do: string; overlap: "high" | "medium" | "low";
  funding?: Funding | null; evidence_quote: string; verified: boolean;
}
export interface TamEvidence { figure_text: string; figure_inr?: number | null; source_url: string; year?: number | null; quote: string }
export interface Funnel { tam_inr?: number | null; sam_inr?: number | null; som_inr?: number | null; assumptions: string[] }
export interface MarketGrounding {
  competitors: Competitor[]; tam_evidence: TamEvidence[];
  tam_verdict: "supported" | "contradicted" | "unverified"; tam_note: string;
  no_competitor_claim_contradicted: boolean; funnel?: Funnel | null; from_cache: boolean; generated_at?: string | null;
}
export interface GithubStats { repo: string; stars: number; last_commit?: string | null; languages: string[] }
export interface TechSignals {
  site_url?: string | null; site_reachable: boolean; site_summary: string; claims_supported: string[];
  claims_unsupported: string[]; github?: GithubStats | null; notes: string[]; from_cache: boolean;
}

export interface FinanceRequest { overrides: Partial<Record<FinancialInputKey, number>>; mode: "hold_growth" | "hold_spend"; target_runway_months: number }
export interface MonthPoint { month: number; customers: number; revenue: number; gross_profit: number; acquisition_spend: number; net_burn: number; cash: number }
export interface FinanceMetrics {
  ltv?: number | null; ltv_cac?: number | null; payback_months?: number | null;
  runway_months?: number | null; runway_capped: boolean; breakeven_month?: number | null; month0_net_burn: number;
}
export interface BreakPoint {
  target_runway_months: number; base_cac?: number | null; breaking_cac?: number | null;
  pct_increase?: number | null; already_below_target: boolean;
}
export interface TornadoBar { variable: string; label: string; runway_low: number; runway_high: number; delta_months: number }
export interface FinanceResult {
  inputs: FinancialInputs; mode: "hold_growth" | "hold_spend"; horizon_months: number; metrics: FinanceMetrics;
  series: MonthPoint[]; break_point: BreakPoint; tornado: TornadoBar[]; assumptions_used: string[]; formulas: string[];
}

export interface LedgerEntry {
  id: string; claim_text: string; source: SourceRef; status: Status; confidence: number;
  persona?: Persona | null; finding_id?: string | null; updated_at?: string | null;
}
export interface ChecklistItem {
  id: string; title: string; why: string; finding_id?: string | null; priority: "P0" | "P1" | "P2";
  owner: "founder" | "legal" | "finance" | "tech"; status: "todo" | "addressed" | "uploaded"; india_specific: boolean;
}

export interface EvalCriteria { addresses_objection: boolean; quantified: boolean; evidence_type: EvidenceType }
export interface Evaluation {
  criteria: EvalCriteria; proposed_outcome: Outcome; outcome: Outcome; reason: string;
  followup?: string | null; missing_proof?: string | null; injection_attempt: boolean;
}
export interface GrillTurn {
  id: string; persona: Persona; finding_id: string; kind: "question" | "followup"; question_text: string;
  answer?: string | null; evaluation?: Evaluation | null; finance_override?: Record<string, number> | null;
}
export interface Concession { finding_id: string; persona: Persona; outcome: Outcome; score_delta: number; reason: string; turn_id: string }
export interface CrossTalk { from_persona: Persona; to_persona: Persona; text: string; after_turn_id?: string | null }
export interface PersonaScore { persona: Persona; initial: number; current: number }
export interface ReadinessScore { initial: number; current: number; by_persona: PersonaScore[] }
export interface FinalVerdict { persona: Persona; verdict: Verdict; rationale: string }
export interface Narrative { positioning: string; one_liner: string; tam_reframe: string; narrative_md: string; changes: string[] }

export interface MemoryRecord {
  id: string; deal_id: string; persona?: Persona | null;
  kind: "memory_add" | "memory_recall" | "kb_search" | "trace" | "promote" | "forget";
  text: string; hits: string[]; source: "meko_live" | "local_fallback";
  status: "pending" | "ok" | "failed" | "skipped"; latency_ms?: number | null; meko_id?: string | null; created_at?: string | null;
}
export interface MekoStatus {
  mode: "live" | "local" | "off"; connected: boolean; datapack_id?: string | null;
  conversation_id?: string | null; calls_made: number; call_budget: number; note: string;
}

export interface Deal {
  id: string; status: DealStatus; created_at?: string | null; error?: string | null;
  deck?: DeckFacts | null; finance?: FinanceResult | null; market?: MarketGrounding | null; tech?: TechSignals | null;
  reports: PersonaReport[]; top_issues: string[]; ledger: LedgerEntry[]; checklist: ChecklistItem[];
  grill_turns: GrillTurn[]; concessions: Concession[]; crosstalk: CrossTalk[];
  score?: ReadinessScore | null; verdicts: FinalVerdict[]; narrative?: Narrative | null;
  memory_log: MemoryRecord[]; meko?: MekoStatus | null;
}

export type SSEType =
  | "stage" | "deck" | "finance" | "market" | "tech" | "persona_report" | "ledger" | "score"
  | "question" | "evaluation" | "concession" | "crosstalk" | "checklist" | "verdict" | "narrative" | "memory" | "done" | "error";
export interface SSEEvent<T = unknown> { type: SSEType; deal_id: string; seq: number; ts: string; data: T }

export const PENALTY = { critical: 25, major: 12, minor: 5 } as const;
export const PERSONA_META = {
  finance: { name: "Finance Investor", color: "#F59E0B", emoji: "💰" },
  market: { name: "Market Investor", color: "#3B82F6", emoji: "📈" },
  tech: { name: "Technical Investor", color: "#A855F7", emoji: "🛠️" },
} as const;
