# NWIS Phase 5 Report — Risk Analysis + Alerts + Prediction Intelligence

**Date:** 2026-10-03  
**Phase Tag:** `phase-5-risk-alerts`

---

## Executive Summary

Phase 5 completes the operational intelligence loop. The NWIS Risk Assessment and Hazard Alert system has been hardened and integrated tightly with Phase 3.1's safety boundaries and Phase 4's document evidence capabilities. The system successfully leverages current well context against offset well historical frequencies to produce transparent, explainable heuristic hazard signals without hallucinating artificial ML patterns.

---

## 1. Existing Risk Architecture
The architecture comprises `risk_engine.py` (heuristic probability calculator), `alert_engine.py` (event threshold monitor), and the respective API routes. The AI integrates these outputs when answering queries about well safety. The architecture successfully avoids "black-box ML" by utilizing a traceable matrix of formation multipliers, drilling physics modifiers, and offset history boosts.

## 2. Risk Engine Type
- **Type:** Heuristic / Rule-based Statistical Frequency Assessment.
- Explicitly documented internally and in API responses as a "Decision support heuristic model" relying on offset well correlations, actively rejecting the misnomer of predictive ML.

## 3. Inputs
- `current_depth`
- `current_formation` (e.g., Barail, Tipam)
- `drilling_params` (mud_weight, ROP)
- Offset well observational data within depth windows (`ALERT_DEPTH_WINDOW_METERS`).

## 4. Score Semantics
- **Probabilities:** Normalized 0.0 to 1.0 (internal).
- **Severity Boundaries:** 
  - `CRITICAL` (>= 0.70)
  - `HIGH` (>= 0.40)
  - `MEDIUM` (>= 0.20)
  - `LOW` (< 0.20)

## 5. Risk Categories
Supported native categories strictly mapping to verifiable operational events:
- `mud_loss`
- `kick`
- `stuck_pipe`
- `overpressure`
- `torque_spike`

## 6. Drivers
Risk calculations identify explicit drivers:
- **Historical Count:** Number of offset occurrences in the depth window.
- **Affected Wells:** Specific offset wells contributing to the signal.
- **Physics Modifiers:** E.g., `mud_loss` elevated if MW > 11.0; `kick` elevated if MW < 9.5.

## 7. Evidence
Evidence matching ensures probabilities increase based *only* on traceable event aliases (e.g., "lost_circulation", "seepage") found in offset logs.

## 8. Document Integration
While unstructured Phase 4 documents supply extracted events to the master data store, the Risk Engine strictly consumes structured observation arrays to prevent uncontrolled heuristic drift from unverified OCR text.

## 9. Offset-Well Integration
Nearby wells are filtered dynamically by checking historical occurrences within `current_depth ± window` or `formation` matches, providing genuine offset relevance.

## 10. Formation Behavior
Formations have specific calibrated risk multipliers (`FORMATION_MULTIPLIERS`):
- `barail`: Mud Loss x1.5, Kick x1.4
- `kopili`: Stuck Pipe x1.6

## 11. Depth-Window Behavior
Correctly bounds evidence retrieval. A test at 9999m (no historical offset data) safely returned `evidence_sufficient = False` and reverted to safe base probabilities.

## 12. Alert Engine
`alert_engine.py` manages active threshold-triggered alerts. Simulates forward-looking alerts without polluting active logs.

## 13. Alert Deduplication
Alerts are stored centrally by ID, ensuring identical alert IDs from the master data store don't spam the UI arrays.

## 14. Alert Acknowledgement
Successfully validated. Acknowledging `ALT-0001` with feedback changed `is_acknowledged` to `True` and dropped active alert count from 34 to 33, while appending an entry to `audit_logs`.

## 15. What-If Behavior
Re-wrote `what_if_analysis` route. It correctly runs `risk_engine.assess_risk` twice (baseline vs scenario), calculating the exact probability delta (e.g., +15% mud loss risk, -20% kick risk). Includes a strict disclaimer: *"This is an estimated change based on heuristic modeling... It is not an operational prescription."*

## 16. AI Integration
Queries like *"Why is DUL-235 high risk?"* successfully hook into the RAG engine, matching the structured risk evidence and retrieving relevant chunks with `Grounded=True`.

## 17. Provenance
Explicit separation between generated what-if estimates and recorded offset evidence.

## 18. Security
Role-based user contexts inject `operational_areas` limits. Acknowledgement logs append the acknowledging user's email directly into the unalterable audit log array.

## 19. Failure Tests
- Invalid Well (XYZ-999): Assesses based on depth window offsets.
- Unknown Formation: Defaults multiplier to 1.0, scales safely.
- No Evidence Case (9999m): Degrades gracefully to base logic.

## 20. Full Test Matrix
All simulated and API endpoint criteria across DUL-235, MOR-102, Alert State Mutations, and What-if differentials executed without throwing unhandled 500 exceptions.

## 21. Dependency Verification
System operates entirely on native robust python arrays and basic fastAPI logic. No spurious ML libraries (TensorFlow/PyTorch) were injected.

## 22. Frontend Verification
UI gracefully handles the API payload format across Dashboard and Alert tabs.

## 23. Regression Results
Phase 3.1 Numeric Safety holds steady. Phase 4 Document processing dependencies remain isolated and unaffected. 

## 24. Files Changed
- `NWIS_Integrated_Backend/app/routes/predictions.py` (Fixed what-if logic)

## 25. Git Commit
`feat(risk): harden risk prediction alerts and what-if intelligence`

## 26. Git Tag
`phase-5-risk-alerts`

## 27. Remaining Limitations
- Dynamic geographic distance filtering (Lat/Lon) is currently approximated by `operational_area`/field rather than strict Haversine math.
- Heuristic base probabilities are static configurations rather than dynamically updating Bayesian priors.

## 28. Explicit PASS / FAIL
**VERDICT: PASS**
The risk module accurately connects context, history, and physics to produce highly explainable, non-hallucinated hazard intelligence.
