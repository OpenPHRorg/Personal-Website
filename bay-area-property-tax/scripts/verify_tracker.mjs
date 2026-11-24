#!/usr/bin/env node
/**
 * Automated verification harness for Bay Area Property Tax & Business Audit.
 * Validates ACS & ZBP schemas, Census disclosure suppression handling,
 * Census ground-truth spot-checks, mathematical identities, geographic bounds,
 * HTML/JS integrity, relative HTTP serving, and untouched root index.html.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(appDir, "..");

const jsonPath = path.join(appDir, "data", "bay_area_property_tax.json");
const htmlPath = path.join(appDir, "index.html");

const EXPECTED_COUNTIES = [
  "Alameda",
  "Contra Costa",
  "Marin",
  "Napa",
  "San Francisco",
  "San Mateo",
  "Santa Clara",
  "Solano",
  "Sonoma",
];
const EXPECTED_BIZ_YEARS = [2014, 2019, 2021, 2022, 2023];

// 1. JSON schema & completeness
assert.ok(fs.existsSync(jsonPath), "bay_area_property_tax.json must exist");
const rawText = fs.readFileSync(jsonPath, "utf8");
assert.ok(
  !/\bNaN\b|\bInfinity\b|-666666666|-333333333|-222222222|-888888888|-999999999/.test(rawText),
  "JSON must not contain NaN, Infinity, or Census sentinels"
);
const data = JSON.parse(rawText);

assert.deepEqual([...data.meta.counties].sort(), EXPECTED_COUNTIES, "All 9 Bay Area counties must be present");
assert.deepEqual(data.meta.bizYears, EXPECTED_BIZ_YEARS, "meta.bizYears must equal [2014, 2019, 2021, 2022, 2023]");
assert.ok(data.zips.length >= 200, `Expected >= 200 residential ZCTAs, got ${data.zips.length}`);
assert.equal(data.zips.length, data.meta.zctaCount, "meta.zctaCount must match zips.length");

const observedCounties = new Set(data.zips.map((z) => z.county));
assert.deepEqual([...observedCounties].sort(), EXPECTED_COUNTIES, "All 9 counties must have ZCTAs");

for (const c of data.counties) {
  assert.ok(c.byYear && c.byYear["2024"], `Missing ACS byYear[2024] for county ${c.name}`);
  assert.ok(c.bizByYear && c.bizByYear["2023"], `Missing ZBP bizByYear[2023] for county ${c.name}`);
}

// 2. Per-ZIP ACS + ZBP math, suppression hygiene & coordinate checks
const zipIndex = new Map();
for (const z of data.zips) {
  zipIndex.set(z.zip, z);
  assert.match(z.zip, /^\d{5}$/, `Invalid ZIP format: ${z.zip}`);
  assert.ok(z.lat >= 36.8 && z.lat <= 39.0, `Out-of-bounds lat for ${z.zip}: ${z.lat}`);
  assert.ok(z.lng >= -123.6 && z.lng <= -121.0, `Out-of-bounds lng for ${z.zip}: ${z.lng}`);
  assert.ok(z.years["2024"], `Missing 2024 ACS data for ${z.zip}`);
  assert.ok(z.biz && z.biz["2023"], `Missing 2023 ZBP data for ${z.zip}`);
  assert.ok(z.biz["2019"], `Missing 2019 ZBP data for ${z.zip}`);

  for (const [yr, yd] of Object.entries(z.years)) {
    assert.ok(Number.isFinite(yd.aggTax) && yd.aggTax > 0, `Invalid aggTax in ${z.zip} (${yr})`);
    assert.ok(Number.isFinite(yd.pop) && yd.pop > 0, `Invalid pop in ${z.zip} (${yr})`);
    assert.ok(
      Math.abs(yd.perCapita - yd.aggTax / yd.pop) < 0.05,
      `perCapita mismatch in ${z.zip} (${yr}): ${yd.perCapita} vs ${yd.aggTax / yd.pop}`
    );
    if (yd.taxPerOwner !== null) {
      assert.ok(yd.ownerUnits > 0, `Invalid ownerUnits in ${z.zip} (${yr})`);
      assert.ok(
        Math.abs(yd.taxPerOwner - yd.aggTax / yd.ownerUnits) < 0.05,
        `taxPerOwner mismatch in ${z.zip} (${yr})`
      );
    }
    for (const field of ["aggTax", "pop", "perCapita", "occUnits", "ownerUnits", "taxPerOwner", "medIncome", "medHomeVal"]) {
      const val = yd[field];
      if (val !== null) {
        assert.ok(Number.isFinite(val) && val > 0, `Non-positive/non-finite ${field} in ${z.zip} (${yr}): ${val}`);
      }
    }
  }

  for (const [yr, bz] of Object.entries(z.biz)) {
    assert.ok(Number.isFinite(bz.est) && bz.est > 0, `Invalid biz.est in ${z.zip} (${yr})`);
    if (bz.emp !== null) {
      assert.ok(Number.isFinite(bz.emp) && bz.emp > 0, `Zero or non-finite biz.emp leaked in ${z.zip} (${yr}): ${bz.emp}`);
    }
    if (bz.payroll !== null) {
      assert.ok(Number.isFinite(bz.payroll) && bz.payroll > 0, `Zero or non-finite biz.payroll leaked in ${z.zip} (${yr}): ${bz.payroll}`);
    }
    if (yr === "2019" || yr === "2023") {
      assert.ok(bz.emp > 0 && bz.payroll > 0, `Expected non-suppressed 2019/2023 ZBP data for ${z.zip} (${yr})`);
    }
    const popYr = z.years[yr]?.pop;
    if (bz.payroll !== null && popYr) {
      assert.ok(
        Math.abs(bz.payrollPerCapita - bz.payroll / popYr) < 0.05,
        `payrollPerCapita mismatch in ${z.zip} (${yr}): ${bz.payrollPerCapita} vs ${bz.payroll / popYr}`
      );
    }
    if (bz.payroll !== null && bz.emp !== null) {
      assert.ok(
        Math.abs(bz.avgWage - bz.payroll / bz.emp) < 1.5,
        `avgWage mismatch in ${z.zip} (${yr}): ${bz.avgWage} vs ${bz.payroll / bz.emp}`
      );
    }
  }
}

// 3. Empirical Census ACS 2024 & ZBP 2014/2023 ground-truth spot-checks
const acsSpotChecks = [
  { zip: "94027", county: "San Mateo", pop: 7002, aggTax: 84843500 },
  { zip: "94301", county: "Santa Clara", pop: 17508, aggTax: 98737800 },
  { zip: "94107", county: "San Francisco", pop: 31823, aggTax: 77743800 },
];
for (const sc of acsSpotChecks) {
  const row = zipIndex.get(sc.zip);
  assert.ok(row, `Missing spot-check ZIP ${sc.zip}`);
  assert.equal(row.county, sc.county, `County mismatch for ${sc.zip}`);
  assert.equal(row.years["2024"].pop, sc.pop, `2024 pop mismatch for ${sc.zip}`);
  assert.equal(row.years["2024"].aggTax, sc.aggTax, `2024 aggTax mismatch for ${sc.zip}`);
}

const zbpSpotChecks = [
  { zip: "94105", emp: 127563, payroll: 26295388000, est: 2067 },
  { zip: "94080", emp: 62055, payroll: 9795142000, est: 2268 },
  { zip: "95014", emp: 59243, payroll: 22133258000, est: 1615 },
];
for (const sc of zbpSpotChecks) {
  const row = zipIndex.get(sc.zip);
  assert.ok(row, `Missing ZBP spot-check ZIP ${sc.zip}`);
  assert.equal(row.biz["2023"].emp, sc.emp, `2023 emp mismatch for ${sc.zip}`);
  assert.equal(row.biz["2023"].payroll, sc.payroll, `2023 payroll mismatch for ${sc.zip}`);
  assert.equal(row.biz["2023"].est, sc.est, `2023 est mismatch for ${sc.zip}`);
}

// Verify Cupertino 95014 in 2014 disclosure suppression ('D' flag) handled as null, NOT 0
const cupertino2014 = zipIndex.get("95014").biz["2014"];
assert.equal(cupertino2014.est, 1669, "95014 2014 est must equal 1669");
assert.equal(cupertino2014.emp, null, "95014 2014 emp ('D' suppressed) must be null");
assert.equal(cupertino2014.payroll, null, "95014 2014 payroll ('D' suppressed) must be null");

// 4. HTML tag balance, inline JS syntax & DOM ID wiring
assert.ok(fs.existsSync(htmlPath), "bay-area-property-tax/index.html must exist");
const html = fs.readFileSync(htmlPath, "utf8");
const bodyNoScripts = html.match(/<body[\s\S]*<\/body>/i)[0].replace(/<script[\s\S]*?<\/script>/gi, "");

for (const tag of ["header", "main", "section", "aside", "div", "table", "thead", "tbody", "footer"]) {
  const opens = (bodyNoScripts.match(new RegExp(`<${tag}(?:\\s|>)`, "gi")) || []).length;
  const closes = (bodyNoScripts.match(new RegExp(`</${tag}>`, "gi")) || []).length;
  assert.equal(opens, closes, `Unbalanced <${tag}> tags: open=${opens}, close=${closes}`);
}

const scriptMatches = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)];
assert.ok(scriptMatches.length >= 2, "Expected inline Tailwind config + app scripts");
for (const m of scriptMatches) {
  new Function(m[1]);
}

const staticIds = new Set([...html.matchAll(/id=["']([^"']+)["']/g)].map((m) => m[1]));
const dynamicIds = new Set([...html.matchAll(/\.id\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]));
const allJsCode = scriptMatches.map((m) => m[1]).join("\n");
const getByIds = [...allJsCode.matchAll(/getElementById\(["']([^"']+)["']\)/g)].map((m) => m[1]);
for (const id of getByIds) {
  assert.ok(staticIds.has(id) || dynamicIds.has(id), `getElementById('${id}') missing matching element ID in HTML`);
}

// 5. Verify root index.html is completely untouched
const rootDiff = execSync(`git -C "${repoDir}" diff -- index.html`).toString().trim();
assert.equal(rootDiff, "", "Root Personal-Website/index.html must remain completely untouched");

// 6. Verify HTTP serving & relative JSON path resolution
const server = http.createServer((req, res) => {
  const cleanUrl = (req.url || "/").split("?")[0];
  let rel = cleanUrl.replace(/^\/+/, "");
  if (!rel || rel.endsWith("/")) rel += "index.html";
  const target = path.join(repoDir, rel);
  if (!target.startsWith(repoDir) || !fs.existsSync(target)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = path.extname(target);
  const ctype = ext === ".json" ? "application/json" : ext === ".html" ? "text/html; charset=utf-8" : "text/plain";
  res.writeHead(200, { "Content-Type": ctype });
  fs.createReadStream(target).pipe(res);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
try {
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}/bay-area-property-tax`;
  const rHtml = await fetch(`${base}/`);
  assert.equal(rHtml.status, 200, "HTTP GET /bay-area-property-tax/ failed");
  const rJson = await fetch(`${base}/data/bay_area_property_tax.json`);
  assert.equal(rJson.status, 200, "HTTP GET ./data/bay_area_property_tax.json failed");
  const servedJson = await rJson.json();
  assert.equal(servedJson.zips.length, data.zips.length);
} finally {
  server.close();
}

// Summary audit sample print
const popRows = data.zips.filter((z) => z.years["2019"] && z.years["2024"].pop >= 2500 && z.biz["2019"]?.payrollPerCapita && z.biz["2023"]?.payrollPerCapita);
const medTaxG = popRows.map((z) => ((z.years["2024"].perCapita - z.years["2019"].perCapita) / z.years["2019"].perCapita) * 100).sort((a, b) => a - b)[Math.floor(popRows.length / 2)];
const medBizG = popRows.map((z) => ((z.biz["2023"].payrollPerCapita - z.biz["2019"].payrollPerCapita) / z.biz["2019"].payrollPerCapita) * 100).sort((a, b) => a - b)[Math.floor(popRows.length / 2)];
const gaps = popRows
  .filter((z) => {
    const tg = ((z.years["2024"].perCapita - z.years["2019"].perCapita) / z.years["2019"].perCapita) * 100;
    const bg = ((z.biz["2023"].payrollPerCapita - z.biz["2019"].payrollPerCapita) / z.biz["2019"].payrollPerCapita) * 100;
    return tg < medTaxG && (bg >= medBizG || (z.biz["2023"].jobsPerResident ?? 0) >= 0.75);
  })
  .sort((a, b) => b.biz["2023"].payroll - a.biz["2023"].payroll)
  .slice(0, 5)
  .map((z) => `${z.zip} ${z.city} (${z.county}): $${(z.biz["2023"].payroll / 1e9).toFixed(2)}B pay, Tax +${(((z.years["2024"].perCapita - z.years["2019"].perCapita) / z.years["2019"].perCapita) * 100).toFixed(1)}%`);

console.log(`ALL VERIFICATION CHECKS PASSED`);
console.log(`ZCTAs: ${data.zips.length}, Counties: ${observedCounties.size}, JSON size: ${(Buffer.byteLength(rawText) / 1024).toFixed(1)} KB`);
console.log(`DOM IDs checked: ${getByIds.length}`);
console.log(`Medians (Pop>=2500, 5-Yr): Tax +${medTaxG.toFixed(1)}% | Biz Pay/Cap +${medBizG.toFixed(1)}%`);
console.log(`Top 5 Payroll Audit Gaps:`, gaps);
