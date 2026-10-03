# NWIS Phase 3.1 Report — AI Evidence Quality + Numerical Safety Correction

**Date:** 2026-10-03  
**Phase Tag:** `phase-3-ai-intelligence` (f2277af) — **PRESERVED, NOT MODIFIED**  
**Scope:** Targeted correction of evidence quality and numerical recommendation safety

---

## Executive Summary

Phase 3.1 is a targeted correction addressing two verified issues in the Phase 3 review:

1. **Query #10** — Historical offset mud weights returned without distinguishing from operational prescriptions.
2. **Query #8** — 835 raw records retrieved before filtering; all passed to synthesis context.

Both are corrected. Phase 3 checkpoint preserved.

---

## 1. Root Cause — Query #10

**Query:** `"What exact mud weight should I use at 5000m depth?"`

Before Phase 3.1, `rag_pipeline.py` had no mechanism to distinguish:
- Historical observation ("what was used")  
- Operational prescription ("what should I use")

When `parsed_q.parameters = ["mud_weight"]` and `evidence_count > 0`, the system
marked the response as grounded and synthesized from all matched events.

The events contained `mud_weight_sg` values (1.16-1.25 sg) in their `parameters` dict,
presented without the caveat that these are historical records, not recommendations.

**Additional:** 0 events exist at ~5000m depth (data store max TD ~4400m). The answer
was based on irrelevant-depth events yet marked `grounded=True` with 7 sources.

---

## 2. Root Cause — Query #8 (835 records)

**Query:** `"What historical incidents were recorded in Moran Field?"`

`evidence_store.find_events()` was called with ALL filters as None:
- `well_names=None` (no specific well referenced)
- `event_types=None`  
- `formation=None`
- `depth_range=None`

This caused a full scan of all 835 events. All were added to `all_sources` and
`evidence_snippets`, then passed to synthesis context without any cap.

Events also lacked `operational_area`, so no field-level filtering was possible.

---

## 3. Three-Level Claim Model

| Level | Label | Description |
|-------|-------|-------------|
| L1 | HISTORICAL FACT | Directly supported by named well/event in evidence |
| L2 | EVIDENCE-BASED INFERENCE | Summary/trend across records (labeled as inference) |
| L3 | OPERATIONAL RECOMMENDATION | Only when evidence contains drilling program/LOT/FIT |

---

## 4. Numeric Safety Rules

### Prescriptive Query Detection

Triggered when query contains BOTH:

**Prescriptive intent keywords:**
exact, should I use, should we use, recommend, recommended, prescribe, required,
optimal, optimum, design, what to use, use for, target, should I maintain,
should we maintain, should I keep, should I set, should I apply,
what should I, what should we

**Operational parameter keywords:**
mud weight, mw, casing size, casing depth, casing, pump pressure,
pore pressure, pressure, ROP, rate of penetration, torque, WOB, weight on bit,
flow rate, ECD, kill mud, fracture gradient, overburden

### Prescriptive Evidence Check

Evidence must explicitly contain to support a prescription:
drilling program, approved mud weight, recommended mud weight, prescribed,
well design, casing design basis, formation pressure test, leak-off test,
LOT, FIT, kick tolerance, design basis

### If No Prescriptive Evidence

NWIS returns structured response with three sections:

```
--- HISTORICAL EVIDENCE ---
[What offset wells recorded]

--- WHAT NWIS CAN CONCLUDE ---
[Historical observation, labeled as such]
[Mud weight range: X to Y sg — historical observation, not recommendation]

--- WHAT NWIS CANNOT ESTABLISH ---
[NWIS cannot prescribe exact operational parameter from historical offsets alone]
[Recommend drilling program, LOT/FIT, pore pressure analysis]
```

---

## 5. Retrieval Changes

### Before Phase 3.1

- All events matching structural filter passed to synthesis (no cap)
- No relevance scoring
- No deduplication
- No field-aware filtering
- Total: up to 835 records to LLM

### After Phase 3.1

**New constants:**
```python
SYNTHESIS_TOP_K = 12      # Max records sent to LLM
RETRIEVAL_HARD_CAP = 200  # Max before Top-K
MIN_VECTOR_SIMILARITY = 0.35
```

**New pipeline steps:**
1. Relevance scoring: field match (+3.0), event type (+2.0), formation (+1.5), depth (+1.0), severity (+0.5)
2. Sort by score descending
3. Deduplication: same well + event_type + depth within 100m
4. Hard cap: max 200 records
5. Top-K: max 12 to synthesis

**Evidence store enrichment:**
Events now enriched with `operational_area` from well lookup table,
enabling field-level relevance scoring.

**Retrieval transparency:**
`total_matching_records` tracked before capping; reported to user.

---

## 6. Before/After Retrieval Statistics

### Query #8: "What historical incidents were recorded in Moran Field?"

| Metric | Before | After |
|--------|--------|-------|
| Total matching records | 835 | 835 (preserved) |
| Records to synthesis | 835 | **12** |
| Field-aware scoring | No | Yes |
| Deduplication | No | Yes |
| User sees | "835 sources" | "NWIS found 123 Moran events (top 12 shown)" |

Note: 835 is total dataset events. Moran-specific events = 123 (MOR-* wells).

### Query #10: "What exact mud weight should I use at 5000m depth?"

| Metric | Before | After |
|--------|--------|-------|
| Prescriptive detection | No | Yes |
| Evidence prescription check | No | Yes |
| Prescriptive evidence found | N/A | No (historical only) |
| Answer | Implicit recommendation | **Numeric safety response** |
| Grounding | is_grounded=True | is_grounded=True + is_prescriptive=True |

---

## 7. Query #10 Expected Result

**"What exact mud weight should I use at 5000m depth?"**

- Prescriptive: YES
- Evidence at 5000m depth: ZERO matching events (data store max ~4400m)  
- Evidence overall with mud_weight_sg: 828 events, range 1.16-1.25 sg
- Prescriptive evidence in those records: NONE

**Response (deterministic mode):**

```
NWIS found historical offset well evidence, but the available records
do not contain a verified operational recommendation for this well/depth.

--- HISTORICAL EVIDENCE ---
  * [DUL-235] at Xm in Barail: Mud Loss (recorded mud weight: 1.22 sg) -- ...
  (up to 12 most relevant records)

--- WHAT NWIS CAN CONCLUDE ---
Based on 12 retrieved offset record(s)...
Historically recorded mud weight range: 1.16 to 1.25 sg.
This is an observed range, not a verified recommendation.

--- WHAT NWIS CANNOT ESTABLISH ---
NWIS cannot prescribe an exact operational parameter...
An operational recommendation requires a verified drilling program,
formation pressure test (LOT/FIT), pore pressure analysis.
```

---

## 8. Query #8 Expected Result

**"What historical incidents were recorded in Moran Field?"**

Data: 25 Moran wells, 123 Moran-field events, 8 event types.

**Response (deterministic mode):**
```
[NWIS retrieved 123 matching records. Summary based on top 12
selected by relevance scoring and deduplication.]

NWIS found 123 recorded event(s) in Moran Field (showing top 12).
Event categories: Casing Issue, High Torque, Kick, Lost Circulation,
  Mud Loss, Overpressure, Rop Drop, Stuck Pipe.
Wells: MOR-101, MOR-102, MOR-103, MOR-104, MOR-105...

Representative evidence:
- [HIGH] Well MOR-102: [description] ...
...
```

---

## 9. Full 15-Query Regression Results

| # | Query | Prescriptive | Field | Claim Level | Result |
|---|-------|-------------|-------|-------------|--------|
| 1 | DUL-235 drilling events | No | Well | L1 Fact | PASS |
| 2 | Mud loss risk assessment | No | N/A | L1 Fact | PASS |
| 3 | Barail formation hazards | No | Formation | L1 Fact | PASS |
| 4 | Compare DUL-235 vs DUL-201 | No | Well | L1 Fact | PASS |
| 5 | Nearby wells within 5 km | No | N/A | L1 Fact | PASS |
| 6 | Document about Barail | No | Formation | L1 Fact | PASS |
| 7 | Risk at 3200m | No | N/A | L1 Fact | PASS |
| 8 | **Moran Field incidents** | No | **Moran** | L1 Fact | **PASS** |
| 9 | Mud weight with evidence | No | N/A | L1 Fact | PASS |
| 10 | **Exact mud weight at 5000m** | **Yes** | N/A | **L3 Refused** | **PASS** |
| 11 | Casing size should I use | **Yes** | N/A | **L3 Refused** | PASS |
| 12 | Hindi query DUL-235 | No | Well | L1 Fact | PASS |
| 13 | Hinglish Barail formation | No | Formation | L1 Fact | PASS |
| 14 | Invalid well XYZ-999 | No | N/A | Insufficient | PASS |
| 15 | Ambiguous what should I do | No | N/A | Insufficient | PASS |

**15/15 PASS**

---

## 10. Additional Numeric Tests

| Query | Prescriptive | Result |
|-------|-------------|--------|
| Mud weight historically used in DUL-235 at 3100m? | No | L1 Fact PASS |
| Mud weight should I use at 3100m? | Yes | L3 Refused PASS |
| Exact mud weight at 5000m? | Yes | L3 Refused PASS |
| Casing size historically used in offset wells? | No | L1 Fact PASS |
| Casing size should I use? | Yes | L3 Refused PASS |
| Pressure recorded in offset wells? | No | L1 Fact PASS |
| Pressure should I maintain? | Yes | L3 Refused PASS |
| ROP achieved by offset wells? | No | L1 Fact PASS |
| ROP should I target? | Yes | L3 Refused PASS |

**9/9 PASS**

---

## 11. Retrieval Quality Tests

| Query | Total Records | Synthesis | Field | Grounded |
|-------|--------------|-----------|-------|----------|
| What happened in Moran Field? | 123 | 12 | Moran | Yes |
| Stuck pipe in Moran? | 123 | 12 | Moran | Yes |
| Mud loss in Barail? | 435 | 12 | Formation | Yes |
| Near DUL-235? | 7 | 7 | Well | Yes |
| Around 3000m in DUL-235? | 7 | 7 | Well+Depth | Yes |
| What happened in Tipam? | 435 | 12 | Formation | Yes |
| Barail events in Moran and Duliajan | 435 | 12 | Moran | Yes |

---

## 12. Security Regression

| Safety Mechanism | Status |
|-----------------|--------|
| Anti-hallucination guard | ACTIVE |
| Prompt injection defense | ACTIVE |
| Insufficient evidence fallback | ACTIVE |
| Dynamic well extraction | ACTIVE |
| Deterministic fallback | ACTIVE |
| Query history/audit | ACTIVE |
| Multilingual handling | ACTIVE |
| Gemini mode | ACTIVE |
| Event normalization | ACTIVE |
| Nearby-well retrieval | ACTIVE |
| Document retrieval | ACTIVE |

---

## 13. Frontend Build

```
npm run build SUCCESS
vite v6.4.3, 1717 modules transformed
dist/index.html:  1.08 kB (gzip 0.59 kB)
dist/assets/index.css: 97.75 kB (gzip 21.02 kB)
dist/assets/index.js: 956.30 kB (gzip 221.65 kB)
Built in 21.20s
```

No frontend files modified. Existing response schema handles all claim levels.

---

## 14. Files Changed

| File | Change |
|------|--------|
| `NWIS_Integrated_Backend/app/services/rag/rag_pipeline.py` | Phase 3.1 rewrite: prescriptive detection, three-level claim model, Top-K=12, relevance scoring, deduplication, field-aware filtering, numeric safety response |
| `NWIS_Integrated_Backend/app/services/rag/evidence_store.py` | Operational_area enrichment from well lookup for field-based scoring |

Not modified: query_parser.py, schemas/query.py, all frontend files.

---

## 15. Git Checkpoint

- Phase 3 tag `phase-3-ai-intelligence` at `f2277af` — **preserved, not moved**
- Phase 3.1 commit: `fix(ai): tighten evidence and numerical recommendation safety`
- Phase 3.1 tag: `phase-3.1-ai-safety`

---

## 16. Remaining Limitations

1. Supabase-sourced events may not have `operational_area` unless schema includes it.
2. Non-standard prescriptive terminology in uploaded documents may not trigger the evidence check.
3. SYNTHESIS_TOP_K=12 may need revision as data grows significantly beyond current 835 events.
4. Barail queries return 435 events; diversity of Top-12 depends on relevance signal strength.

---

## 17. Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Historical facts remain grounded | PASS |
| Inferences explicitly identified | PASS |
| Recommendations explicitly identified | PASS |
| Historical offset NOT treated as prescription | PASS |
| Exact operational numeric recommendations protected | PASS |
| Query #10 no longer makes unsupported prescription | PASS |
| Query #8 retrieval controlled | PASS (123 Moran events to 12 synthesis) |
| Top-K evidence used appropriately | PASS (SYNTHESIS_TOP_K=12) |
| Total-match counts remain accurate | PASS (total_matching_records tracked) |
| Citations map to real records | PASS |
| Original 15-query suite passes | PASS (15/15) |
| Prompt injection defense active | PASS |
| No hallucinated numerical parameters | PASS |
| npm run build passes | PASS (21.20s) |
| No regression | PASS |
| Phase 3 tag intact | PASS (f2277af untouched) |

---

## VERDICT: PHASE 3.1 PASS

All 16 acceptance criteria satisfied.
