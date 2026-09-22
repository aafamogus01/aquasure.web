# AQUASURE Web Demo — retrained MDN-LSTM version

Dashboard static untuk presentasi dan GitHub Pages. Frontend ini memakai artefak Python AQUASURE dan **memisahkan dengan jelas** hasil trained MDN-LSTM terbaru dari legacy calibrated insurance benchmark.

## Konsistensi data

- **12 petambak / farm profiles**.
- **7 core inputs trained MDN-LSTM**: temperature, dissolved oxygen, pH, salinity, ammonia, nitrite, turbidity.
- **Lookback 60 hari**, target = end-cycle harvest-health distribution.
- PHRI resmi dihitung sebagai `P(harvest_health < H* | X1:60)` pada **Day 60**.
- Kalender baru **Kalender Forecast Harian** menampilkan trajectory water-quality harian yang benar-benar ada di `generatedData.js`. Warna kalender hanya menunjukkan jumlah parameter yang melewati R&D reference threshold; **tidak mengarang PHRI harian** sebelum Day 60.
- Operational mode memakai `C080` tiap petambak; Stress-test mode memakai cycle dengan trained out-of-fold PHRI tertinggi untuk petambak tersebut.
- **Total portfolio Sum Insured prototype = Rp768.915.000**, dibagi ke 12 petambak memakai `sum_insured_weight` agar total dashboard konsisten dengan business-report benchmark.
- Legacy pricing benchmark tetap: expected payout Rp59.862.853, Wang/distortion premium Rp90.858.558, gross premium Rp112.664.611. Ini **portfolio-level prototype benchmark**. Dashboard juga menampilkan **ilustrasi per petambak** yang dialokasikan dari benchmark tersebut menurut synthetic payout-risk share masing-masing farm; seluruh angka farm-level dijaga agar menjumlah tepat kembali ke total portfolio. Ini masih bukan independent commercial quotation.

## Model terbaru

`backend/trained_model/forecast_model_trained.json` adalah model card untuk actual trained PyTorch MDN-LSTM.

Validation design: nested farm-grouped validation, 6 outer folds, entire farms held out.

Main out-of-fold metrics:

- PHRI AUC: 0.9473
- Brier: 0.0767
- Log Loss: 0.2360
- ECE: 0.0298
- RMSE: 0.0319
- MAE: 0.0259
- CRPS: 0.0182

Semua angka tersebut tetap **synthetic development evidence, not field validation**.

## Deploy GitHub Pages

Tidak ada build step.

1. Upload **isi folder ini** ke root repository GitHub.
2. Commit ke branch `main`.
3. Buka `Settings → Pages`.
4. Source: `Deploy from a branch`.
5. Branch: `main`, folder: `/(root)`.
6. Save.

Karena frontend memakai ES modules, jangan membuka `index.html` langsung dengan `file://`. Untuk preview lokal:

```bash
python -m http.server 8080
```

lalu buka `http://localhost:8080`.

## Regenerate web data

Gunakan **retrained AQUASURE package**:

```bash
python scripts/export_web_data.py /path/to/AQUASURE_final
```

Expected layout source:

```text
AQUASURE_final/
├── artifacts/
├── artifacts_trained/
└── legacy_benchmark_reconstruction/
    └── artifacts/
```

Alurnya:

```text
01 synthetic pond trajectories
        ↓
02 synthetic biological labels
        ↓
03 trained PyTorch MDN-LSTM + grouped OOF validation
        ↓
web exporter
        ↓
src/data/generatedData.js
        ↓
GitHub Pages frontend

04–05 legacy pricing/evaluation are shown separately as calibrated synthetic insurance benchmark.
```
