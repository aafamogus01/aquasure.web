# AQUASURE final code archive

This archive reconstructs the final AQUASURE **pure parametric shrimp-aquaculture insurance** architecture recovered from the project conversations. It replaces the earlier incorrect four-variable weather/crop reconstruction.

## What each notebook does

| Order | Notebook | Purpose | Main output |
|---:|---|---|---|
| 1 | `01_copula_data_generator.ipynb` | Generates dependent nine-variable shrimp-pond sequences across 12 farms. | `pond_timeseries.csv` |
| 2 | `02_biological_risk_model.ipynb` | Converts pond stress into survival, growth, harvest health, and labels. | `biological_cycles.csv` |
| 3 | `03_mdn_lstm_forecasting.ipynb` | Forecasts harvest-health distributions and Day-60 PHRI. | `forecast_training_results.csv` |
| 4 | `04_monte_carlo_pricing.ipynb` | Runs 240,000 scenarios, trigger/payout rules, and Wang pricing. | `monte_carlo_scenarios.csv` |
| 5 | `05_evaluation_basis_risk.ipynb` | Recomputes metrics, basis risk, and pricing reconciliation. | `evaluation_metrics.json` |

Every notebook states its goal, use, inputs, outputs, assumptions, checks, and next stage.

## Final nine-variable architecture

Dissolved oxygen, pH, temperature, salinity, ammonia, nitrite, turbidity, alkalinity, and pathogen-pressure indicator. The practical MVP sensor layer uses temperature, DO, pH, salinity/EC/TDS, and turbidity; the remaining four can be periodic manual, test-kit, laboratory, or partner inputs.

## Locked contract

- PHRI ≥75% for 48 hours.
- ≥85% data completeness in the rolling seven-day window.
- ≥3 of 6 critical parameters confirm stress.
- Payout: 0%, 10%, 20%, or 35% of Sum Insured.
- Pre-agreed payout; no post-harvest loss adjustment.
- Wang transform prices payout random variable `Z`.

## Recovered calibrated-synthetic benchmark

- 12 farms × 20,000 scenarios = 240,000.
- Day-60 AUC 0.8249; Brier 0.1642; Log Loss 0.4969; reported ECE 0.0823.
- Trigger probability 24.49%.
- AQUASURE negative basis risk 42.86%; coarse weather benchmark 100%.
- Reduction: 57.14 **percentage points**.
- Expected payout IDR 59,862,853; Wang premium IDR 90,858,558; gross premium IDR 112,664,611.

These are reconstruction targets from calibrated synthetic evaluation, not recovered original data or field performance.

## Run

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
jupyter lab
```

Run notebooks 01–05 in order. `torch` is optional. Without it, notebook 03 uses and discloses a tested NumPy LSTM-state/mixture fallback. Install `requirements-torch-optional.txt` for the full trainable MDN-LSTM path.

## Validation boundary

This is a TRL/TKT 4 laboratory prototype. TRL/TKT 5 requires real sensor data, realized biological outcomes, operational calibration, and insurer-reviewed trigger and claim validation.
