# Meko MCP Server Integration Notes

## Overview
- **MCP Endpoint:** `https://mcp.mekodata.ai/mcp`
- **Protocol:** Streamable HTTP / SSE transport via the official `mcp` Python SDK (`mcp.client.streamable_http`).
- **Auth Header:** `x-api-key: <MEKO_API_KEY>` or `Authorization: Bearer <MEKO_API_KEY>`
- **Scope Hierarchy:**
  - `MEKO_DATAPACK_ID`: UUID identifying the workspace.
  - `agent_id`: `<persona>:<deal_id>` (e.g. `finance:d-1234`, `system:d-1234`).
  - `conversation_id`: deal_id string or session UUID for tracing.
  - Text prefix: All written memory texts must start with `[deal:<id>]` to enable robust client-side filtering even if the server does not filter by agent or deal.

## Discovered Tool Specifications

### 1. `memory_add`
- **Purpose:** Stores text verbatim into private agent memory.
- **Inputs:**
  - `content`: `str` (the verbatim memory text, e.g. `[deal:d-123] FINDING F-1...`)
  - `agent_id`: `str` (`"<persona>:<deal_id>"`)
  - `datapack_id`: `str` (UUID from env)
  - `metadata`: `Optional[dict]` (tags, severity, timestamp)
- **Output:** Returns record with unique ID (e.g. `{"memory_id": "mem_abc123", "status": "created"}`). We store this `memory_id` into `MemoryRecord.meko_id` for later deletion or promotion.

### 2. `memory_search`
- **Purpose:** Vector / semantic similarity search over private memories.
- **Inputs:**
  - `query`: `str` (search text)
  - `datapack_id`: `str`
  - `agent_id`: `Optional[str]`
  - `limit`: `int` (top k, default 3)
- **Output:** List of matching memory records.
- **Client Handling:** Filter returned items to ensure `[deal:<id>]` matches the active deal; trim snippet strings to ≤ 240 chars.

### 3. `knowledgebase_search`
- **Purpose:** Search across Shared Knowledge (promoted memories and uploaded markdown/PDF documents in the datapack).
- **Inputs:**
  - `query`: `str`
  - `datapack_id`: `str`
  - `limit`: `int`
- **Output:** List of passages from shared knowledge docs.

### 4. `conversation_add_message`
- **Purpose:** Log a trace of agent reasoning, inputs, and outputs to Meko's Observe Hub.
- **Inputs:**
  - `conversation_id`: `str` (`deal_id`)
  - `input`: `str` (short label, e.g. `"Grill Turn 1 (Finance)"`)
  - `output`: `str` (the exchange text: question + answer + verdict)
  - `datapack_id`: `str`
- **Note:** Never put long queries or questions into `input` that could pollute the semantic index with questions outranking decisions. Keep label terse.

### 5. `memory_promote`
- **Purpose:** One-way promotion of private memories into Shared Knowledge. Requires owner/maintainer key.
- **Inputs:**
  - `memory_ids`: `List[str]` (Meko IDs to promote)
  - `datapack_id`: `str`
- **Policy Enforcement:** Strictly gated by `backend/app/memory/policy.py`. Only generalized lessons matching `allowed_by_policy()` are ever promoted. No founder PII, company names, URLs, or deal-specific numbers.

### 6. `memory_delete_by_id`
- **Purpose:** Delete specific private memories. Used for `forget_deal` on deal deletion to guarantee session confidentiality.
- **Inputs:**
  - `memory_id`: `str`
  - `datapack_id`: `str`

## Fallback & Degradation Design
1. **Live vs Local Mode:**
   - If `MEKO_MODE=local` or `DEMO_MODE=cached` or `MEKO_API_KEY` missing: all operations run via `LocalMemoryClient` in `local.py`.
   - Records receive `source="local_fallback"` and `status="ok"`.
2. **Circuit Breaker:**
   - Single call timeout: 8s (`MEKO_TIMEOUT_S`).
   - One automatic retry on connection/timeout error.
   - On 3 consecutive failures, trip circuit breaker for 60 seconds (route all calls directly to `local.py` without attempting HTTP).
3. **Call Budget:**
   - Enforce `MEKO_CALL_BUDGET` (default 200). If `calls_made >= budget`, route to local fallback with note `"call budget reached"`.
4. **Safety Guarantee:**
   - NO method in the memory layer ever raises an exception. Unhandled errors return a `MemoryRecord` with `status="failed"`.
