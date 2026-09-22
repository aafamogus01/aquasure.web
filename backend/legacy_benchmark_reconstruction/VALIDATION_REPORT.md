# AQUASURE Validation Report

## Overall Assessment: Share with caveats

All five notebooks execute successfully from top to bottom. The nine-variable schema, 240,000-row scenario population, policy guardrails, payout ladder, basis-risk calculation, and pricing reconciliation passed independent checks.

## Verified Checks

- **PASS — Notebook count:** exactly five stage notebooks
- **PASS — Input schema:** temperature_c, dissolved_oxygen_mg_l, ph, salinity_ppt, ammonia_mg_l, nitrite_mg_l, turbidity_ntu, alkalinity_mg_l, pathogen_pressure
- **PASS — Scenario population:** 240,000 rows
- **PASS — Farm balance:** 20,000 scenarios per farm
- **PASS — Unique scenario grain:** scenario_id unique
- **PASS — Completeness:** zero missing values
- **PASS — Payout ladder:** only 0/10/20/35%
- **PASS — Persistence guardrail:** all triggered rows >=48 hours
- **PASS — Completeness guardrail:** all triggered rows >=85%
- **PASS — Stress guardrail:** all triggered rows >=3 parameters
- **PASS — Negative basis risk:** 0.428603
- **PASS — Basis-risk reduction:** 57.1397 pp
- **PASS — AUC reconciliation:** 0.824588
- **PASS — Brier reconciliation:** 0.164200
- **PASS — Log-loss reconciliation:** 0.496900
- **PASS — Expected payout:** IDR 59,862,853.00
- **PASS — Wang premium:** IDR 90,858,557.99
- **PASS — Gross premium:** IDR 112,664,611.00

## Material Caveat

The recovered reference reports ECE = 0.0823, but the saved probabilities produce ECE = 0.0387 under the explicitly implemented 10 equal-width-bin definition. The original binning or calibration implementation was not recovered, so the archive preserves the reference number but does not claim to reproduce it.

## Required Stakeholder Caveat

The results are calibrated synthetic reconstruction evidence at TRL/TKT 4. They are not field validation, observed claims performance, or an insurance quotation.

Forecast notebook execution mode: `numpy_lstm_state_mdn_fallback`. Install the optional PyTorch requirement to run the full trainable MDN-LSTM path.
