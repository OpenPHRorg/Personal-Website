#!/usr/bin/env node
/**
 * Automated verification gate for calebli.com/executive-ops/ dashboard & Personal-Website nav tab.
 * Validates schema parity, P0-P5 completeness across all 6 public areas, inline JS syntax,
 * root navigation integration, and strict privacy / NDA confidentiality boundaries.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXEC_OPS_DIR = path.resolve(__dirname, "..");
const SITE_ROOT = path.resolve(EXEC_OPS_DIR, "..");

const EXPECTED_PUBLIC_AREAS = [
  "openphr",
  "public-investing",
  "venture-capital",
  "personal-website",
  "civic-tools",
  "vivid-vision-advisory",
];
const PRIORITIES = ["P0", "P1", "P2", "P3", "P4", "P5"];

const dataJsonPath = path.join(EXEC_OPS_DIR, "data", "dashboard_data.json");
const dataJsPath = path.join(EXEC_OPS_DIR, "data", "dashboard_data.js");
const dashHtmlPath = path.join(EXEC_OPS_DIR, "index.html");
const rootHtmlPath = path.join(SITE_ROOT, "index.html");

for (const p of [dataJsonPath, dataJsPath, dashHtmlPath, rootHtmlPath]) {
  assert.ok(fs.existsSync(p), `Missing required file: ${p}`);
}

// 1. Validate dashboard_data.json and dashboard_data.js parity
const dashJsonRaw = fs.readFileSync(dataJsonPath, "utf8");
const dashJsRaw = fs.readFileSync(dataJsPath, "utf8");
const dashData = JSON.parse(dashJsonRaw);

const prefix = "window.EXEC_OPS_DASHBOARD = ";
assert.ok(dashJsRaw.startsWith(prefix), "dashboard_data.js must assign window.EXEC_OPS_DASHBOARD");
const parsedFromJs = JSON.parse(dashJsRaw.slice(prefix.length).replace(/;\s*$/, ""));
assert.deepEqual(parsedFromJs, dashData, "dashboard_data.js must match dashboard_data.json");

// 2. Validate 6 public areas + full P0-P5 priority coverage per area
const areasById = Object.fromEntries((dashData.areas || []).map((a) => [a.id, a]));
for (const aid of EXPECTED_PUBLIC_AREAS) {
  const area = areasById[aid];
  assert.ok(area, `Missing public area in dashboard_data.json: ${aid}`);
  for (const prio of PRIORITIES) {
    const pStats = area.prioritySummary?.[prio];
    assert.ok(pStats && pStats.total >= 1, `Area '${aid}' missing priority tier '${prio}'`);
    assert.ok(
      area.tasks.some((t) => t.priority === prio),
      `Area '${aid}' tasks list missing '${prio}' task`
    );
  }
}
assert.equal(dashData.summary.publicAreasCount, EXPECTED_PUBLIC_AREAS.length);
assert.ok(dashData.telemetry?.totalCycles >= 5, "Expected >= 5 logged public cycles");
assert.equal(dashData.telemetry?.readyForWebsiteShowcase, true, "Expected readyForWebsiteShowcase=true");

// 3. Validate root index.html integration cleanly preserves existing sections
const rootHtml = fs.readFileSync(rootHtmlPath, "utf8");
const navMatches = rootHtml.match(/href="executive-ops\/"/g) || [];
assert.ok(navMatches.length >= 2, `Expected >= 2 AI Ops nav links (desktop + mobile) in root index.html, found ${navMatches.length}`);
for (const anchor of ['href="#products"', 'href="#expertise"', 'href="#portfolio"', 'href="#ai-agents"']) {
  assert.ok(rootHtml.includes(anchor), `Root index.html missing preserved section link: ${anchor}`);
}

// 4. Validate inline <script> syntax in executive-ops/index.html
const dashHtml = fs.readFileSync(dashHtmlPath, "utf8");
for (const reqId of ['id="framework"', 'id="strategy"', 'id="telemetry"', 'id="tracker"', 'id="matrix-tbody"', 'id="area-cards-container"']) {
  assert.ok(dashHtml.includes(reqId), `executive-ops/index.html missing required element ${reqId}`);
}
const scriptBlocks = [...dashHtml.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi)];
let inlineScriptsChecked = 0;
for (const match of scriptBlocks) {
  const openTag = match[0].slice(0, match[0].indexOf(">") + 1);
  if (/\bsrc=/i.test(openTag)) continue;
  const body = match[1].trim();
  if (!body) continue;
  new Function(body);
  inlineScriptsChecked++;
}
assert.ok(inlineScriptsChecked >= 2, `Expected >= 2 inline scripts validated, got ${inlineScriptsChecked}`);

// 5. Strict Privacy, PII, Token & NDA Confidentiality Leak Gate
const FORBIDDEN_PATTERNS = [
  /family-finance/i,
  /\bOPS-006\b/i,
  /\bGenentech\b/i,
  /\bTopcon\b/i,
  /\bVSP\b/i,
  /C:[\\/]+Users[\\/]/i,
  /G:[\\/]+My Drive/i,
  /H:[\\/]+My Drive/i,
  /x-access-token/i,
  /\bghp_[A-Za-z0-9_]+/,
  /\bSinnie\b/i,
  /Rental call sheet/i,
  /Mover Quotes/i,
  /SECRET_BALANCE/i,
];

const filesToScan = [
  { name: "executive-ops/index.html", text: dashHtml },
  { name: "executive-ops/data/dashboard_data.json", text: dashJsonRaw },
  { name: "executive-ops/data/dashboard_data.js", text: dashJsRaw },
  { name: "Personal-Website/index.html", text: rootHtml },
];

for (const f of filesToScan) {
  for (const re of FORBIDDEN_PATTERNS) {
    assert.ok(!re.test(f.text), `PRIVACY/CONFIDENTIALITY LEAK (${re}) detected in ${f.name}`);
  }
}

console.log(
  `VERIFIED: executive-ops dashboard (${dashData.summary.publicAreasCount} areas x P0-P5, ${dashData.summary.totalTasks} tasks, ${dashData.summary.doneTasks} done, ${inlineScriptsChecked} inline scripts, 0 leaks)`
);
