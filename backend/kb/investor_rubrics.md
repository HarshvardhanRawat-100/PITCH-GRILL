# Investor Diligence Rubrics & Evaluation Criteria

This document defines the rigorous due diligence standards and evaluation criteria utilized by investment committees to evaluate founder defenses during investor interrogations.

---

## 1. Core Evaluation Criteria

During an investor grill session, founder responses to critical red-team findings are evaluated against three objective dimensions:

### A. Addresses Objection
- **True**: The response directly answers the core risk, counter-argument, or concern raised by the investor without deflecting, changing the topic, or responding with vague generalities.
- **False**: The response avoids answering the specific question, pivots to an unrelated strength, offers evasive rhetoric, or ignores the negative implication of the finding.

### B. Quantified
- **True**: The founder backs their statement with explicit, concrete numbers, percentages, dates, currency amounts, or volume metrics (e.g., specific rupee CAC, payback duration in months, measured cohort retention percentage, or contract values).
- **False**: The response relies purely on qualitative adjectives (e.g., "very fast growth", "huge market interest", "strong retention", "industry-standard margins") without verifiable numerical bounds.

### C. Evidence Type
Every founder defense is classified strictly by the highest tier of verifiable proof presented:

1. **`document_referenced` (Highest Tier)**:
   - The founder references an existing, verifiable legal, regulatory, or operational document, statutory filing, or executed third-party contract.
   - *Examples*: Signed Customer Master Services Agreement (MSA), Bank statement, Audited CA financial report, GSTR-3B tax filing, Ministry of Corporate Affairs (MCA) Form AOC-4, Patent filing number, CERT-In VAPT audit certificate.

2. **`data_cited` (High Tier)**:
   - The founder provides granular, empirical internal data points, cohort analysis numbers, or system logs from their production environment.
   - *Examples*: "Month-3 retention is 42% across 180 paying merchants", "Meta blended CAC increased from ₹2,500 to ₹3,100 after 500 customers", "Server cost is ₹18 per voice-transcription minute".

3. **`assertion` (Low Tier - Not Evidence)**:
   - The founder makes an unproven, subjective statement or relies on personal belief, reputation, advisor opinions, or intent without supporting documentation or raw telemetry.
   - *Examples*: "Our customers love the product and will never leave", "We are confident margins will improve with scale", "Prominent angel investors agree with our TAM estimation".

4. **`none` (Zero Tier)**:
   - No supporting evidence or data is presented whatsoever.

---

## 2. Decision Outcomes & Anti-Sycophancy Clamping

Investment decisions require mathematical and empirical rigor. In-code evaluation logic applies an anti-sycophancy clamp to prevent unwarranted optimism:

### A. Accepted
- **Requirement**: `addresses_objection == true` AND `quantified == true` AND `evidence_type` is either `data_cited` or `document_referenced`.
- **Result**: The finding status transitions to `resolved`. Readiness score increases.

### B. Partial
- **Requirement**: The response addresses the objection and is quantified, but evidence is limited or resting on preliminary estimates; OR a qualitative explanation addresses the concern but lacks full audited documentation.
- **Result**: The finding status transitions to `partial`. Partial score credit is awarded. A follow-up due diligence item is noted.

### C. Rejected
- **Requirement**: `addresses_objection == false` OR `evidence_type == "none"` OR `evidence_type == "assertion"` without verifiable data.
- **Anti-Sycophancy Rule**: If a founder provides pure assertion (even if confidently stated), the outcome MUST be clamped to `rejected` or `partial`. Confidence is not evidence.
- **Result**: Finding remains open. Follow-up interrogation or mandatory data room item is issued.
