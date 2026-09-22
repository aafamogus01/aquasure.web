# AQUASURE model integrity correction — trained MDN-LSTM

## What was corrected
The previous notebook 03 contained a PyTorch training branch but the archived execution used an untrained NumPy recurrent fallback. That fallback cannot be presented as a trained MDN-LSTM.

The corrected package therefore:

1. requires PyTorch;
2. uses the seven core variables in the presentation: temperature, dissolved oxygen, pH, salinity, ammonia, nitrite, and turbidity;
3. trains an actual LSTM + Gaussian mixture-density head by backpropagation;
4. separates whole farms across train/validation/test partitions;
5. performs nested architecture selection using validation negative log-likelihood;
6. saves out-of-fold predictions separately from the final full-data deployment fit;
7. moves the old benchmark-reconstruction notebooks 04 and 05 to `legacy_benchmark_reconstruction/` because they do not independently validate this trained model.

## Actual synthetic out-of-farm results
From six outer grouped folds (960 cycles total):

- RMSE: 0.03190
- MAE: 0.02593
- CRPS: 0.01822
- PHRI ROC-AUC: 0.94733
- PHRI Brier score: 0.07671
- PHRI log loss: 0.23601
- PHRI ECE (10 equal-width bins): 0.02980
- PIT KS statistic: 0.01972; p = 0.84184

These are genuine predictions from held-out farms under the **synthetic** AQUASURE development dataset. They are not field performance.

## Selected final model
The candidate `H64_K2_D10` (64 hidden units, 2 Gaussian components, dropout 0.10) had the best average validation NLL and was selected in four of six outer folds. The final artifact `artifacts_trained/mdn_lstm_core7_trained.pt` was refit on all 960 synthetic cycles for 74 epochs.

## Important baseline result
A simple grouped ridge-regression baseline using hand-engineered 60-day summary statistics produced RMSE ≈ 0.02938 and PHRI AUC ≈ 0.95319, slightly better than the current MDN-LSTM on this synthetic dataset. Therefore this package does **not** claim that MDN-LSTM is superior to simpler models. The synthetic generator/label mechanism is relatively structured and can be learned well by simpler models. Real sensor data are needed to test whether temporal nonlinear modeling adds value.
