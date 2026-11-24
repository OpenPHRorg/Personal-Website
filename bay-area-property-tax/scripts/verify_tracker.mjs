#!/usr/bin/env node
/**
 * Automated verification harness for Bay Area Property Tax Per Capita Tracker.
 * Validates dataset schema, Census ground-truth spot-checks, mathematical
 * identities, geographic bounds, HTML/JS integrity, relative HTTP serving,
 * and ensures root Personal-Website/index.html remains untouched.
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

// 1. JSON schema & completeness
assert.ok(fs.existsSync(jsonPath), "bay_area_property_tax.json must exist");
const rawText = fs.readFileSync(jsonPath, "utf8");
assert.ok(!/\bNaN\b|\bInfinity\b|-666666666|-333333333|-222222222|-888888888|-999999999/.test(rawText), "JSON must not contain NaN, Infinity, or Census sentinels");
const data = JSON.parse(rawText);

assert.deepEqual([...data.meta.counties].sort(), EXPECTED_COUNTIES, "All 9 Bay Area counties must be present");
assert.ok(data.zips.length >= 200, `Expected >= 200 residential ZCTAs, got ${data.zips.length}`);
assert.equal(data.zips.length, data.meta.zctaCount, "meta.zctaCount must match zips.length");

const observedCounties = new Set(data.zips.map((z) => z.county));
assert.deepEqual([...observedCounties].sort(), EXPECTED_COUNTIES, "All 9 counties must have ZCTAs");

// 2. Per-ZIP math, coordinates & sentinel checks
const zipIndex = new Map();
for (const z of data.zips) {
  zipIndex.set(z.zip, z);
  assert.match(z.zip, /^\d{5}$/, `Invalid ZIP format: ${z.zip}`);
  assert.ok(z.lat >= 36.8 && z.lat <= 39.0, `Out-of-bounds lat for ${z.zip}: ${z.lat}`);
  assert.ok(z.lng >= -123.6 && z.lng <= -121.0, `Out-of-bounds lng for ${z.zip}: ${z.lng}`);
  assert.ok(z.years["2024"], `Missing 2024 data for ${z.zip}`);

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
}

// 3. Empirical Census 2024 ground-truth spot-checks
const spotChecks = [
  { zip: "94027", county: "San Mateo", pop: 7002, aggTax: 84843500 },
  { zip: "94301", county: "Santa Clara", pop: 17508, aggTax: 98737800 },
  { zip: "94107", county: "San Francisco", pop: 31823, aggTax: 77743800 },
];
for (const sc of spotChecks) {
  const row = zipIndex.get(sc.zip);
  assert.ok(row, `Missing spot-check ZIP ${sc.zip}`);
  assert.equal(row.county, sc.county, `County mismatch for ${sc.zip}`);
  assert.equal(row.years["2024"].pop, sc.pop, `2024 pop mismatch for ${sc.zip}`);
  assert.equal(row.years["2024"].aggTax, sc.aggTax, `2024 aggTax mismatch for ${sc.zip}`);
}

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

// Summary insight print for sanity check
const with2019 = data.zips.filter((z) => z.years["2019"] && z.years["2024"].pop >= 2500);
const top5Yr = [...with2019]
  .map((z) => ({
    zip: z.zip,
    city: z.city,
    county: z.county,
    g: ((z.years["2024"].perCapita - z.years["2019"].perCapita) / z.years["2019"].perCapita) * 100,
    pc24: z.years["2024"].perCapita,
  }))
  .sort((a, b) => b.g - a.g)
  .slice(0, 5);

console.log(`ALL VERIFICATION CHECKS PASSED`);
console.log(`ZCTAs: ${data.zips.length}, Counties: ${observedCounties.size}, JSON size: ${(Buffer.byteLength(rawText) / 1024).toFixed(1)} KB`);
console.log(`DOM IDs checked: ${getByIds.length}`);
console.log(`Top 5 ZCTAs (2019->2024, pop>=2500):`, top5Yr.map((x) => `${x.zip} ${x.city} (${x.county}): +${x.g.toFixed(1)}% ($${x.pc24.toFixed(0)}/cap)`));
