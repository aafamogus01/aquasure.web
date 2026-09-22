# AQUASURE backend evidence bundle

This folder is packaged with the static GitHub Pages demo so reviewers can inspect the R&D evidence behind the UI.

## Current forecasting source of truth

- `notebooks/01_copula_data_generator.ipynb` — synthetic pond trajectories.
- `notebooks/02_biological_risk_model.ipynb` — synthetic biological target generation.
- `notebooks/03_mdn_lstm_forecasting.ipynb` — **actual trained PyTorch MDN-LSTM** using seven core inputs and nested farm-grouped validation.
- `trained_model/forecast_model_trained.json` — model card and validation metrics.
- `trained_model/mdn_lstm_core7_trained.pt` — trained model artifact.
- `trained_model/mdn_lstm_oof_nested.csv` — out-of-farm predictions used for model metrics and website cycle PHRI values.

The trained model uses temperature, dissolved oxygen, pH, salinity, ammonia, nitrite, and turbidity; lookback = 60 days; target = end-cycle harvest-health distribution.

## Explicitly legacy material

`legacy_untrained_fallback/` contains the earlier untrained NumPy fallback and is retained only for audit history. It is **not** used as the current forecasting evidence.

`legacy_benchmark_reconstruction/` contains the earlier 240,000-scenario calibrated insurance pricing/basis-risk reconstruction. Those numbers are shown in the UI only as a **separate legacy insurance benchmark**, not as independent validation of the trained MDN-LSTM.

## Validation boundary

The training/validation protocol is real, but the underlying pond trajectories and biological outcomes remain synthetic. Therefore the current evidence is synthetic development evidence, not field validation.
