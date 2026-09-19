# AQUASURE Web Demo

Versi dashboard yang dipoles untuk presentasi dan GitHub Pages. Frontend ini menggunakan data yang diekspor dari artefak Python AQUASURE, bukan angka acak terpisah.

## Yang sudah diselaraskan

- **12 petambak / farm profiles**, sama dengan arsip Python.
- **7 variabel inti yang tampil di produk**: suhu, dissolved oxygen, pH, salinitas, amonia, nitrit, dan kekeruhan.
- Alkalinity dan pathogen pressure tetap dicatat sebagai **offline R&D auxiliaries**, bukan variabel inti yang tampil di dashboard.
- **PHRI Day-60**, lookback 60 hari, siklus 120 hari, trigger 75% + 48 jam + data completeness 85% + konfirmasi multivariat, dan payout ladder mengikuti artefak Python.
- Mode **Operational** memakai `C080` tiap petambak.
- Mode **Stress test** memakai siklus dengan PHRI tertinggi yang benar-benar ada pada `forecast_training_results.csv`.
- Pemilih tanggal hanya membuka **Day 1–60**, sesuai jendela input forecasting.
- Halaman underwriter memakai 12 profil yang sama, bukan 20 kolam/5 tambak seperti prototype lama.

## Deploy ke GitHub Pages

Tidak ada build step.

1. Buat repository GitHub baru.
2. Upload **isi folder ini** ke root repository.
3. Commit dan push ke branch `main`.
4. Buka **Settings → Pages**.
5. Pada **Build and deployment**, pilih **Deploy from a branch**.
6. Pilih `main` dan `/ (root)`.
7. Save.

Setelah GitHub selesai deploy, website dapat dibuka dari URL GitHub Pages repository tersebut.

## Hubungan dengan Python

GitHub Pages adalah hosting **static**, jadi ia tidak dapat menjalankan server Python secara langsung. Karena itu alurnya dibuat:

```text
Python notebooks / artifacts
        ↓
scripts/export_web_data.py
        ↓
src/data/generatedData.js
        ↓
GitHub Pages frontend
```

Setelah notebook Python diperbarui, jalankan:

```bash
python scripts/export_web_data.py /path/to/AQUASURE_final
```

untuk membuat ulang bundle data website.

Folder `backend/` menyimpan lima notebook dan artefak ringkas yang menjadi source of truth. Dua CSV terbesar tidak diduplikasi agar repository website tetap ringan.

## Preview lokal

Karena frontend menggunakan ES modules, jalankan melalui HTTP server:

```bash
python -m http.server 8080
```

kemudian buka:

```text
http://localhost:8080
```
