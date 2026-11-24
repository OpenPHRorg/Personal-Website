#!/usr/bin/env python3
"""
Fetch and compile official U.S. Census Bureau ACS 5-Year property tax and
demographic data across all 9 San Francisco Bay Area counties by ZCTA.

Sources (keyless, official Census bulk files):
- 2020 ZCTA-to-County & ZCTA-to-Place relationship files
- 2024 U.S. Census ZCTA Gazetteer (centroids & land area)
- 2014 & 2019 ACS 5-Year Sequence Summary Files
- 2021-2024 ACS 5-Year Table-Based Summary Files (B25090, B01003, B25003, B19013, B25077)
"""

from __future__ import annotations

import csv
import io
import json
import os
import re
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

BAY_COUNTIES = {
    "06001": "Alameda",
    "06013": "Contra Costa",
    "06041": "Marin",
    "06055": "Napa",
    "06075": "San Francisco",
    "06081": "San Mateo",
    "06085": "Santa Clara",
    "06095": "Solano",
    "06097": "Sonoma",
}

NEIGHBORHOOD_HINTS = {
    "94102": "Tenderloin / Civic Center",
    "94103": "SoMa",
    "94104": "Financial District",
    "94105": "Rincon Hill / South Beach",
    "94107": "Potrero Hill / Mission Bay",
    "94108": "Chinatown / Nob Hill",
    "94109": "Nob Hill / Polk Gulch",
    "94110": "Mission / Bernal Heights",
    "94111": "Financial District / Embarcadero",
    "94112": "Excelsior / Ingleside",
    "94114": "Castro / Noe Valley",
    "94115": "Pacific Heights / Japantown",
    "94116": "Sunset / Parkside",
    "94117": "Haight / Lower Haight",
    "94118": "Inner Richmond",
    "94121": "Outer Richmond",
    "94122": "Outer Sunset",
    "94123": "Marina / Cow Hollow",
    "94124": "Bayview / Hunters Point",
    "94127": "West Portal / St. Francis Wood",
    "94129": "Presidio",
    "94130": "Treasure Island",
    "94131": "Twin Peaks / Glen Park",
    "94132": "Lake Merced / Stonestown",
    "94133": "North Beach / Telegraph Hill",
    "94134": "Visitacion Valley / Portola",
    "94158": "Mission Bay",
    "94611": "Piedmont / Montclair",
    "94618": "Rockridge",
    "95125": "Willow Glen",
    "95120": "Almaden Valley",
}

SEQUENCE_CONFIG = {
    2014: {
        "0003": [("pop", 129)],
        "0058": [("medIncome", 176)],
        "0102": [("occUnits", 10), ("ownerUnits", 11)],
        "0105": [("medHomeVal", 237)],
        "0106": [("aggTax", 87)],
    },
    2019: {
        "0002": [("pop", 129)],
        "0058": [("medIncome", 176)],
        "0111": [("occUnits", 10), ("ownerUnits", 11)],
        "0114": [("medHomeVal", 245)],
        "0115": [("aggTax", 104)],
    },
}

TABLE_YEARS = [2021, 2022, 2023, 2024]
ALL_YEARS = [2014, 2019, 2021, 2022, 2023, 2024]
ZBP_YEARS = [2014, 2019, 2021, 2022, 2023]

TABLE_COLS = {
    "b01003": [("pop", "B01003_E001"), ("popMoe", "B01003_M001")],
    "b25090": [("aggTax", "B25090_E001"), ("taxMoe", "B25090_M001")],
    "b25003": [("occUnits", "B25003_E001"), ("ownerUnits", "B25003_E002")],
    "b19013": [("medIncome", "B19013_E001")],
    "b25077": [("medHomeVal", "B25077_E001")],
}


def fetch_bytes(url: str, timeout: int = 90) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "BayAreaPropertyTaxTracker/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def parse_num(raw: str | None) -> int | None:
    if raw is None:
        return None
    s = raw.strip()
    if not s or s in {".", "..", "-", "***", "(X)", "N"}:
        return None
    try:
        val = int(round(float(s)))
    except ValueError:
        return None
    if val <= 0 or val <= -222222222:
        return None
    return val


def load_bay_area_zctas() -> dict[str, str]:
    url = "https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt"
    print("Fetching 2020 ZCTA-to-County relationship file...")
    text = fetch_bytes(url).decode("utf-8-sig")
    lines = text.splitlines()
    hdr = lines[0].split("|")
    zi = hdr.index("GEOID_ZCTA5_20")
    ci = hdr.index("GEOID_COUNTY_20")
    ai = hdr.index("AREALAND_PART")

    best: dict[str, tuple[int, str]] = {}
    for line in lines[1:]:
        parts = line.split("|")
        if len(parts) <= max(zi, ci, ai):
            continue
        z = parts[zi].strip()
        c = parts[ci].strip()
        if not z:
            continue
        area = int(parts[ai].strip() or 0)
        if z not in best or area > best[z][0]:
            best[z] = (area, c)

    bay_zips = {z: BAY_COUNTIES[c] for z, (_, c) in best.items() if c in BAY_COUNTIES}
    print(f"  Identified {len(bay_zips)} Bay Area primary ZCTAs across 9 counties.")
    return bay_zips


def load_places(bay_zips: dict[str, str]) -> dict[str, str]:
    url = "https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_place20_natl.txt"
    print("Fetching 2020 ZCTA-to-Place relationship file...")
    text = fetch_bytes(url).decode("utf-8-sig")
    lines = text.splitlines()
    hdr = lines[0].split("|")
    zi = hdr.index("GEOID_ZCTA5_20")
    pi = hdr.index("NAMELSAD_PLACE_20")
    ai = hdr.index("AREALAND_PART")

    best: dict[str, tuple[int, str]] = {}
    for line in lines[1:]:
        parts = line.split("|")
        if len(parts) <= max(zi, pi, ai):
            continue
        z = parts[zi].strip()
        if z not in bay_zips:
            continue
        place = parts[pi].strip()
        if not place:
            continue
        area = int(parts[ai].strip() or 0)
        if z not in best or area > best[z][0]:
            best[z] = (area, place)

    cities: dict[str, str] = {}
    for z, county in bay_zips.items():
        if z in best:
            raw_name = best[z][1]
            cleaned = re.sub(r"\s+(?:city|town|CDP)$", "", raw_name)
            cities[z] = cleaned
        else:
            cities[z] = f"Unincorporated {county}"
    return cities


def load_gazetteer(bay_zips: dict[str, str]) -> dict[str, tuple[float, float, float]]:
    url = "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_zcta_national.zip"
    print("Fetching 2024 ZCTA Gazetteer...")
    zf = zipfile.ZipFile(io.BytesIO(fetch_bytes(url)))
    fname = zf.namelist()[0]
    lines = zf.open(fname).read().decode("utf-8-sig").splitlines()
    hdr = [c.strip() for c in lines[0].split("\t")]
    gi = hdr.index("GEOID")
    lati = hdr.index("INTPTLAT")
    lngi = hdr.index("INTPTLONG")
    sqi = hdr.index("ALAND_SQMI")

    coords: dict[str, tuple[float, float, float]] = {}
    for line in lines[1:]:
        parts = [c.strip() for c in line.split("\t")]
        if len(parts) <= max(gi, lati, lngi, sqi):
            continue
        z = parts[gi]
        if z not in bay_zips:
            continue
        coords[z] = (
            round(float(parts[lati]), 4),
            round(float(parts[lngi]), 4),
            round(float(parts[sqi]), 2),
        )
    print(f"  Matched Gazetteer centroids for {len(coords)}/{len(bay_zips)} ZCTAs.")
    return coords


def load_sequence_year(
    year: int, bay_zips: dict[str, str], store: dict[str, dict[int, dict[str, int | None]]]
) -> None:
    base = f"https://www2.census.gov/programs-surveys/acs/summary_file/{year}/data/5_year_seq_by_state/UnitedStates/All_Geographies_Not_Tracts_Block_Groups"
    geo_url = f"{base}/g{year}5us.csv"
    print(f"Fetching ACS {year} sequence geography lookup...")
    geo_text = fetch_bytes(geo_url).decode("latin1")
    logrec_to_zcta: dict[str, str] = {}
    for row in csv.reader(geo_text.splitlines()):
        if len(row) > 5 and row[2] == "860":
            zcta = next(
                (cell[-5:] for cell in row if cell.startswith("86000US") and len(cell) == 12),
                None,
            )
            if zcta and zcta in bay_zips:
                logrec_to_zcta[row[4]] = zcta
    print(f"  ACS {year}: mapped {len(logrec_to_zcta)} Bay Area ZCTA LOGRECNO keys.")

    for seq, fields in SEQUENCE_CONFIG[year].items():
        zip_url = f"{base}/{year}5us{seq}000.zip"
        print(f"  Fetching ACS {year} seq {seq}...")
        zf = zipfile.ZipFile(io.BytesIO(fetch_bytes(zip_url)))
        ename = [n for n in zf.namelist() if n.startswith("e")][0]
        raw = zf.open(ename).read().decode("latin1")
        for row in csv.reader(raw.splitlines()):
            if len(row) <= 5:
                continue
            zcta = logrec_to_zcta.get(row[5])
            if not zcta:
                continue
            yr_dict = store.setdefault(zcta, {}).setdefault(year, {})
            for key, idx in fields:
                if idx < len(row):
                    yr_dict[key] = parse_num(row[idx])


def load_table_year(
    year: int, bay_zips: dict[str, str], store: dict[str, dict[int, dict[str, int | None]]]
) -> None:
    base = f"https://www2.census.gov/programs-surveys/acs/summary_file/{year}/table-based-SF/data/5YRData"
    print(f"Fetching ACS {year} table-based files...")
    for tbl, fields in TABLE_COLS.items():
        url = f"{base}/acsdt5y{year}-{tbl}.dat"
        raw = fetch_bytes(url).decode("utf-8")
        lines = raw.splitlines()
        hdr = lines[0].split("|")
        col_idx = [(key, hdr.index(col)) for key, col in fields]
        for line in lines[1:]:
            if not line.startswith("860Z200US"):
                continue
            zcta = line[9:14]
            if zcta not in bay_zips:
                continue
            parts = line.split("|")
            yr_dict = store.setdefault(zcta, {}).setdefault(year, {})
            for key, idx in col_idx:
                if idx < len(parts):
                    yr_dict[key] = parse_num(parts[idx])


def load_zbp_data(bay_zips: dict[str, str]) -> dict[str, dict[int, dict[str, int | None]]]:
    zbp_store: dict[str, dict[int, dict[str, int | None]]] = {}
    for yr in ZBP_YEARS:
        yy = str(yr)[2:]
        url = f"https://www2.census.gov/programs-surveys/cbp/datasets/{yr}/zbp{yy}totals.zip"
        print(f"Fetching ZBP {yr} business patterns...")
        zf = zipfile.ZipFile(io.BytesIO(fetch_bytes(url)))
        fname = zf.namelist()[0]
        lines = zf.open(fname).read().decode("latin1").splitlines()
        rdr = csv.DictReader(lines)
        matched = 0
        for row in rdr:
            r = {k.strip().lower(): (v or "").strip() for k, v in row.items() if k}
            zcta = r.get("zip", "").strip('"')
            if zcta not in bay_zips:
                continue
            est = parse_num(r.get("est"))
            if est is None:
                continue

            emp_nf = r.get("emp_nf", "").upper()
            empflag = r.get("empflag", "")
            raw_emp = parse_num(r.get("emp"))
            emp = None if (emp_nf == "D" or (empflag and raw_emp is None)) else raw_emp

            ap_nf = r.get("ap_nf", "").upper()
            raw_ap = parse_num(r.get("ap"))
            payroll = None if (ap_nf == "D" or raw_ap is None) else raw_ap * 1000

            zbp_store.setdefault(zcta, {})[yr] = {
                "est": est,
                "emp": emp,
                "payroll": payroll,
            }
            matched += 1
        print(f"  ZBP {yr}: loaded {matched}/{len(bay_zips)} Bay Area ZCTAs.")
    return zbp_store


def build_dataset() -> dict:
    bay_zips = load_bay_area_zctas()
    cities = load_places(bay_zips)
    coords = load_gazetteer(bay_zips)

    raw_store: dict[str, dict[int, dict[str, int | None]]] = {}
    for yr in sorted(SEQUENCE_CONFIG):
        load_sequence_year(yr, bay_zips, raw_store)
    for yr in TABLE_YEARS:
        load_table_year(yr, bay_zips, raw_store)
    zbp_store = load_zbp_data(bay_zips)

    zips_out = []
    for zcta in sorted(bay_zips):
        y2024 = raw_store.get(zcta, {}).get(2024, {})
        pop24 = y2024.get("pop")
        tax24 = y2024.get("aggTax")
        if not pop24 or pop24 < 100 or not tax24:
            continue
        if zcta not in coords:
            continue

        lat, lng, sq_mi = coords[zcta]
        tax_moe24 = y2024.get("taxMoe")
        tax_cv24 = (
            round((tax_moe24 / 1.645) / tax24 * 100, 1)
            if tax_moe24 is not None and tax24 > 0
            else None
        )

        years_clean: dict[str, dict[str, int | float | None]] = {}
        for yr in ALL_YEARS:
            rec = raw_store.get(zcta, {}).get(yr)
            if not rec:
                continue
            agg_tax = rec.get("aggTax")
            pop = rec.get("pop")
            if not agg_tax or not pop or pop <= 0:
                continue
            owner_units = rec.get("ownerUnits")
            occ_units = rec.get("occUnits")
            per_capita = round(agg_tax / pop, 2)
            tax_per_owner = (
                round(agg_tax / owner_units, 2)
                if owner_units is not None and owner_units > 0
                else None
            )
            years_clean[str(yr)] = {
                "aggTax": agg_tax,
                "pop": pop,
                "perCapita": per_capita,
                "occUnits": occ_units,
                "ownerUnits": owner_units,
                "taxPerOwner": tax_per_owner,
                "medIncome": rec.get("medIncome"),
                "medHomeVal": rec.get("medHomeVal"),
            }

        if "2024" not in years_clean:
            continue

        biz_clean: dict[str, dict[str, int | float | None]] = {}
        for yr in ZBP_YEARS:
            brec = zbp_store.get(zcta, {}).get(yr)
            if not brec:
                continue
            ystr = str(yr)
            est = brec["est"]
            emp = brec["emp"]
            payroll = brec["payroll"]
            pop_yr = years_clean.get(ystr, {}).get("pop")
            payroll_pc = (
                round(payroll / pop_yr, 2)
                if payroll is not None and pop_yr is not None and pop_yr > 0
                else None
            )
            jobs_res = (
                round(emp / pop_yr, 3)
                if emp is not None and pop_yr is not None and pop_yr > 0
                else None
            )
            avg_wage = (
                round(payroll / emp)
                if payroll is not None and emp is not None and emp > 0
                else None
            )
            biz_clean[ystr] = {
                "est": est,
                "emp": emp,
                "payroll": payroll,
                "payrollPerCapita": payroll_pc,
                "jobsPerResident": jobs_res,
                "avgWage": avg_wage,
            }

        zips_out.append(
            {
                "zip": zcta,
                "city": cities[zcta],
                "area": NEIGHBORHOOD_HINTS.get(zcta, ""),
                "county": bay_zips[zcta],
                "lat": lat,
                "lng": lng,
                "sqMi": sq_mi,
                "taxCv2024": tax_cv24,
                "years": years_clean,
                "biz": biz_clean,
            }
        )

    county_names = sorted(set(BAY_COUNTIES.values()))
    counties_out = []
    for cname in county_names:
        czips = [z for z in zips_out if z["county"] == cname]
        by_year: dict[str, dict[str, int | float]] = {}
        for yr in ALL_YEARS:
            ystr = str(yr)
            agg_tax_sum = 0
            pop_sum = 0
            owner_sum = 0
            occ_sum = 0
            for z in czips:
                yd = z["years"].get(ystr)
                if not yd:
                    continue
                agg_tax_sum += yd["aggTax"]
                pop_sum += yd["pop"]
                if yd["ownerUnits"]:
                    owner_sum += yd["ownerUnits"]
                if yd["occUnits"]:
                    occ_sum += yd["occUnits"]
            if pop_sum > 0 and agg_tax_sum > 0:
                by_year[ystr] = {
                    "aggTax": agg_tax_sum,
                    "pop": pop_sum,
                    "perCapita": round(agg_tax_sum / pop_sum, 2),
                    "ownerUnits": owner_sum,
                    "occUnits": occ_sum,
                }

        biz_by_year: dict[str, dict[str, int | float | None]] = {}
        for yr in ZBP_YEARS:
            ystr = str(yr)
            est_sum = 0
            emp_sum = 0
            pay_sum = 0
            pop_pay_sum = 0
            pop_emp_sum = 0
            wage_pay_sum = 0
            wage_emp_sum = 0
            for z in czips:
                bz = z["biz"].get(ystr)
                if not bz:
                    continue
                pop_yr = z["years"].get(ystr, {}).get("pop")
                if bz["est"]:
                    est_sum += bz["est"]
                if bz["emp"] is not None:
                    emp_sum += bz["emp"]
                    if pop_yr:
                        pop_emp_sum += pop_yr
                if bz["payroll"] is not None:
                    pay_sum += bz["payroll"]
                    if pop_yr:
                        pop_pay_sum += pop_yr
                if bz["payroll"] is not None and bz["emp"] is not None and bz["emp"] > 0:
                    wage_pay_sum += bz["payroll"]
                    wage_emp_sum += bz["emp"]
            if est_sum > 0:
                biz_by_year[ystr] = {
                    "est": est_sum,
                    "emp": emp_sum if emp_sum > 0 else None,
                    "payroll": pay_sum if pay_sum > 0 else None,
                    "payrollPerCapita": round(pay_sum / pop_pay_sum, 2) if pay_sum > 0 and pop_pay_sum > 0 else None,
                    "jobsPerResident": round(emp_sum / pop_emp_sum, 3) if emp_sum > 0 and pop_emp_sum > 0 else None,
                    "avgWage": round(wage_pay_sum / wage_emp_sum) if wage_pay_sum > 0 and wage_emp_sum > 0 else None,
                }

        counties_out.append(
            {
                "name": cname,
                "zctaCount": len(czips),
                "byYear": by_year,
                "bizByYear": biz_by_year,
            }
        )

    return {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "source": "U.S. Census Bureau ACS 5-Year (B25090, B01003, B25003, B19013, B25077) & ZIP Code Business Patterns (ZBP 2014–2023)",
            "years": ALL_YEARS,
            "bizYears": ZBP_YEARS,
            "counties": county_names,
            "zctaCount": len(zips_out),
            "methodologyNotes": {
                "writeInRedesignYear": 2019,
                "medianIncomeTopCode": 250001,
                "medianHomeValueTopCode": 2000001,
            },
        },
        "counties": counties_out,
        "zips": zips_out,
    }


def main() -> None:
    root_dir = Path(__file__).resolve().parent.parent
    out_path = root_dir / "data" / "bay_area_property_tax.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    dataset = build_dataset()
    out_text = json.dumps(dataset, separators=(",", ":"))
    out_path.write_text(out_text, encoding="utf-8")
    size_kb = out_path.stat().st_size / 1024
    print(f"Wrote {out_path} ({size_kb:.1f} KB, {dataset['meta']['zctaCount']} ZCTAs)")


if __name__ == "__main__":
    main()
