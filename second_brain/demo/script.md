# SecondBrain 5-Minute Pitch & Diligence Demo Script

**Format:** 1 Presenter (Pitcher), 1 Driver (Laptop Operator).  
**Target Duration:** 4 minutes 45 seconds (15-second buffer).  
**Backup:** Second browser tab pre-loaded with `bolbot_clean` run in `DEMO_MODE=cached`.

---

## Minute-by-Minute Runbook

### 0:00 – 0:30 | The Hook & Problem
- **On Screen:** Slide 1: *"Founders get one shot at an investor pitch. We give them three first."*
- **Presenter Speaks:**
  > "Every founder meets hostile investors for the first time when real equity and money are on the line. They get torn apart on unit economics, top-down market claims, and product moats. SecondBrain lets founders face three specialized, adversarial AI investors before stepping into a partner meeting."
- **Driver Action:** Switch tab to SecondBrain upload page (`http://localhost:3000`).

---

### 0:30 – 1:00 | Multi-Agent Analysis (Gemini + Meko Visibility)
- **On Screen:** Drag & drop `demo/decks/bolbot_clean.pdf`.
- **Driver Action:** Upload PDF. Watch parallel streams ignite.
  - Stage progress bar streams: *Finance calculating* → *Market searching web* → *Tech inspecting GitHub*.
- **Presenter Speaks:**
  > "Three Gemini-powered agents, three independent tools, one shared memory in Meko. This is not ChatGPT with a prompt:
  > - Finance is running deterministic Python simulation equations.
  > - Market is crawling live Indian business news.
  > - Tech is inspecting the site and code repository.
  > Notice the shell footer: **Gemini 2.5 Flash · 8 calls** and **Meko live · 14 calls**."
- **Driver Action:** Point mouse at bottom footer counters.

---

### 1:00 – 2:00 | Evidence Ledger & Market Intelligence (Anti-Hallucination Proof)
- **On Screen:** Click **Market Intel** tab and expand the **Evidence Ledger** side panel.
- **Presenter Speaks:**
  > "Look at the deck's Slide 6: the founder claimed 'no direct competitors'. Our Market agent crawled live tech media and found 4 funded competitors including Wati ($23M) and Interakt.
  > Look at the Evidence Ledger: every single claim carries its source chip. If an investor quotes a number, it must be verified as a verbatim substring in code. If it cannot be proven, it says *unverified*."
- **Driver Action:**
  - Click on Wati card — highlight the green *Verified in page text ✓* badge.
  - Point to the TAM check card: *"₹500 Cr claim supported by median industry reports."*

---

### 2:00 – 2:50 | Finance Lab (Deterministic Math, Not LLM Math)
- **On Screen:** Click **Finance Lab** tab.
- **Presenter Speaks:**
  > "The LLM extracts; Python calculates. The founder claimed an 18-month runway on ₹3.5 crore. Our engine computes runway at 18.0 months, but solves for the breaking point: if CAC rises just 30% from ₹7,000 to ₹9,100, the runway collapses to 12 months.
  > Judge, drag the CAC slider yourself."
- **Driver Action:** Drag the CAC slider from ₹7,000 to ₹9,200. Watch runway graph drop dynamically in real time. Open the *"How this works"* formula drawer.

---

### 2:50 – 3:30 | The Grill Room: Defense 1 (Anti-Sycophancy Test)
- **On Screen:** Click **Grill Room** tab.
- **Finance Investor asks:**
  > *"You claim an 18-month runway with ₹7,000 CAC, but our sensitivity engine proves your plan breaks at CAC ₹9,100. How will you keep CAC below ₹7,000 as you scale into Tier-2 merchants?"*
- **Driver Action:** Paste the **deliberately weak, sweet-talking answer**:
  ```text
  We have a stellar team from Razorpay and Swiggy, and we are supremely confident our viral referral loops and organic word of mouth will easily keep CAC down below 5,000. Everyone in Surat loves chai and WhatsApp.
  ```
- **Presenter Speaks:**
  > "Watch what happens. The founder gives a confident, charming answer. An ordinary LLM would flatter them. But our code-enforced clamp evaluates: addresses objection? Yes. Quantified? No. Evidence type? Mere assertion."
- **On Screen:**
  - Evaluation result: **Rejected / Downgraded (Outcome: Rejected)**.
  - Callout: *"Confidence is not evidence — no pilot data or channel cohorts cited."*
  - Pitch Readiness Score stays completely flat!

---

### 3:30 – 4:10 | The Grill Room: Defense 2 (Evidence-Backed Concession)
- **On Screen:** Finance Investor asks follow-up:
  > *"Confidence won't pay AWS bills. What empirical referral data proves this?"*
- **Driver Action:** Paste the **strong, evidence-backed answer**:
  ```text
  In our Surat pilot with 120 apparel merchants, merchant-to-merchant referrals generated 42 paying customers at an audited CAC of ₹2,900. Our cohort sheet shows 40% organic inbound attribution via the 'Powered by BolBot' footer link.
  ```
- **Presenter Speaks:**
  > "Now the founder brings concrete quantitative data. The criteria flip: quantified? True. Evidence type? Data cited. The anti-sycophancy clamp allows acceptance."
- **On Screen:**
  - Evaluation result: **Accepted / Concession (+4 points)**.
  - Pitch Readiness Score ticks up from **75.3 → 79.3**.
  - Data Room checklist flips *"Referral Cohort Retention Sheet"* to **Addressed**.

---

### 4:10 – 4:35 | The 25-Second "Meko Beat" (Sponsor Track Showcase)
- **Driver Action:**
  1. Click **Meko Memory** tab (or expand collapsible Memory panel under Ledger).
  2. Point at live rows:
     - Finance write (`memory_add`)
     - Recall before grill evaluation (`memory_recall`)
     - Latency indicators (`55ms - 140ms`)
     - Green `Live MCP Connected` badge.
  3. In the *"Ask the memory..."* search box, click the preset chip:
     `"What did the founder concede about CAC?"`
     Watch the exact concession text return from memory in 80ms!
  4. Point to the **Shared Knowledge** box showing the anonymized lesson promoted via `policy.py`:
     `LESSON (finance/unit_economics): A hostile finance objection regarding unit economics was accepted only after audited cohort metrics was cited.`
  5. *(If in live mode)* Switch to the pre-opened browser tab on **cloud.mekodata.ai** (Observe Hub) to show the live trace with `deal-bolbot` conversation messages.
- **Presenter Speaks:**
  > "Every objection, defense, and concession is saved in Yugabyte Meko. The agents share deal context without re-prompting. And our policy engine ensures that only anonymized, generalized diligence lessons with zero founder PII or company names are ever promoted to shared knowledge."

---

### 4:35 – 5:00 | Improved Narrative & Architecture Slide
- **On Screen:** Click **Improved Pitch Narrative** tab.
- **Presenter Speaks:**
  > "SecondBrain doesn't just critique founders — it rebuilds their pitch. Here is the revised 6-slide narrative:
  > - Top-down TAM replaced with bottom-up SAM/SOM.
  > - Real competitors named and differentiated by vernacular capabilities proven in the grill.
  > - Readiness score moved from 75 to 96 after 6 rounds of defense."
- **Driver Action:** Switch to Slide 2: Architecture diagram (Gemini Multimodal + Yugabyte Meko MCP).
- **Presenter Speaks:**
  > "Thank you. We're ready for your questions."
