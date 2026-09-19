#!/usr/bin/env python3
"""Regenerate the AQUASURE website data bundle from the Python archive.

Usage:
    python scripts/export_web_data.py /path/to/AQUASURE_final

The website is static (GitHub Pages cannot execute Python). This script is the
bridge from the Python R&D artifacts to the deployed JavaScript data bundle.
"""
from pathlib import Path
import sys, json
import pandas as pd

if len(sys.argv) != 2:
    raise SystemExit("Usage: python scripts/export_web_data.py /path/to/AQUASURE_final")

SRC = Path(sys.argv[1]).resolve()
OUT = Path(__file__).resolve().parents[1] / "src/data/generatedData.js"
A = SRC / "artifacts"

profiles = pd.read_csv(A / "farm_profiles.csv")
pond = pd.read_csv(A / "pond_timeseries.csv")
forecast = pd.read_csv(A / "forecast_training_results.csv")
mc = pd.read_csv(A / "monte_carlo_scenarios.csv")
metrics = json.loads((A / "evaluation_metrics.json").read_text())
pricing = json.loads((A / "pricing_results.json").read_text())

CORE = [
    ("temperature", "temperature_c"),
    ("do", "dissolved_oxygen_mg_l"),
    ("ph", "ph"),
    ("salinity", "salinity_ppt"),
    ("ammonia", "ammonia_mg_l"),
    ("nitrite", "nitrite_mg_l"),
    ("turbidity", "turbidity_ntu"),
]
META = {
    "temperature":{"label":"Suhu","full":"Temperature","unit":"°C","ref":"≤ 31 °C","direction":"high","threshold":31.0,"decimals":1},
    "do":{"label":"DO","full":"Dissolved oxygen","unit":"mg/L","ref":"≥ 4.5 mg/L","direction":"low","threshold":4.5,"decimals":2},
    "ph":{"label":"pH","full":"Derajat keasaman","unit":"","ref":"7.25–8.35","direction":"band","low":7.25,"high":8.35,"decimals":2},
    "salinity":{"label":"Salinitas","full":"Salinity","unit":"ppt","ref":"15–30 ppt","direction":"band","low":15,"high":30,"decimals":1},
    "ammonia":{"label":"Amonia","full":"Ammonia","unit":"mg/L","ref":"≤ 0.32 mg/L","direction":"high","threshold":0.32,"decimals":3},
    "nitrite":{"label":"Nitrit","full":"Nitrite","unit":"mg/L","ref":"≤ 0.28 mg/L","direction":"high","threshold":0.28,"decimals":3},
    "turbidity":{"label":"Kekeruhan","full":"Turbidity","unit":"NTU","ref":"≤ 82 NTU","direction":"high","threshold":82,"decimals":1},
}
START = pd.Timestamp("2026-07-22")  # Day 60 = 2026-09-19 for the demo

def payload(fid, cid):
    ts = pond[(pond.farm_id == fid) & (pond.cycle_id == cid) & (pond.day <= 60)].sort_values("day")
    fr = forecast[forecast.cycle_id == cid].iloc[0]
    series = []
    for _, r in ts.iterrows():
        d = {"day": int(r.day), "date": (START + pd.Timedelta(days=int(r.day)-1)).strftime("%Y-%m-%d")}
        for k, c in CORE:
            d[k] = round(float(r[c]), 6)
        series.append(d)
    return {
        "cycleId": cid,
        "phri": round(float(fr.phri_day60_raw), 6),
        "forecastHarvestHealth": round(float(fr.forecast_harvest_health), 6),
        "actualHarvestHealth": round(float(fr.actual_harvest_health), 6),
        "severeEvent": int(fr.severe_event),
        "split": str(fr.split),
        "series": series,
    }

climate = {"coastal_wet":"Pesisir basah","coastal_dry":"Pesisir kering","estuarine":"Estuari"}
farms = []
for _, p in profiles.iterrows():
    fid = p.farm_id
    fs = forecast[forecast.farm_id == fid]
    ms = mc[mc.farm_id == fid]
    stress_id = fs.loc[fs.phri_day60_raw.idxmax(), "cycle_id"]
    farms.append({
        "id": fid,
        "name": f"Petambak {int(fid.split('_')[1]):02d}",
        "climateZone": p.climate_zone,
        "climateLabel": climate[p.climate_zone],
        "managementQuality": round(float(p.management_quality), 4),
        "stockingIntensity": round(float(p.stocking_intensity), 4),
        "sumInsuredWeight": round(float(p.sum_insured_weight), 4),
        "sumInsuredIdr": round(float(ms.sum_insured_idr.iloc[0])),
        "scenarioStats": {
            "triggerRate": round(float(ms.claim_trigger.mean()), 6),
            "severeRate": round(float(ms.severe_event.mean()), 6),
            "dataCompleteness": round(float(ms.data_completeness.mean()), 6),
            "meanPayoutIdr": round(float(ms.payout_idr.mean())),
            "meanDay60Phri": round(float(ms.phri_day60.mean()), 6),
        },
        "operational": payload(fid, f"{fid}_C080"),
        "stress": payload(fid, stress_id),
    })

obj = {
    "generatedFrom": "AQUASURE Python archive artifacts",
    "generatedAt": "2026-09-19",
    "demoDate": "2026-09-19",
    "lookbackDays": 60,
    "cycleDays": 120,
    "coreVariableCount": 7,
    "coreVariables": META,
    "auxiliaryOffline": ["alkalinity_mg_l", "pathogen_pressure"],
    "contract": {
        "phriThreshold": 0.75,
        "persistenceHours": 48,
        "minDataCompleteness": 0.85,
        "minStressParameters": 3,
        "stressParameterDenominator": 6,
        "payoutLadder": [
            {"min":0,"max":0.75,"ratio":0},
            {"min":0.75,"max":0.85,"ratio":0.10},
            {"min":0.85,"max":0.95,"ratio":0.20},
            {"min":0.95,"max":1.01,"ratio":0.35},
        ],
    },
    "portfolioBenchmark": {
        "scenarioPopulation": metrics["scenario_population"],
        "evidenceStatus": metrics["evidence_status"],
        "auc": metrics["reference"]["day60_roc_auc"],
        "brier": metrics["reference"]["brier_score"],
        "logLoss": metrics["reference"]["log_loss"],
        "ece": metrics["reference"]["ece"],
        "triggerProbability": metrics["reference"]["cycle_trigger_probability"],
        "basisRisk": metrics["reference"]["aquasure_negative_basis_risk"],
        "basisRiskReductionPp": metrics["reference"]["basis_risk_reduction_percentage_points"],
        "expectedPayoutIdr": pricing["expected_payout_idr"],
        "wangPremiumIdr": pricing["wang_distortion_premium_idr"],
        "grossPremiumIdr": pricing["gross_premium_idr"],
        "wangLambda": pricing["wang_lambda"],
    },
    "farms": farms,
}
OUT.write_text("export const AQUASURE_DATA = " + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
print(f"Wrote {OUT} ({OUT.stat().st_size:,} bytes)")
