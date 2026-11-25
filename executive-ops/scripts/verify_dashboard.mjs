#!/usr/bin/env node
/**
 * Automated verification gate for calebli.com/executive-ops/
 * - Confirms legacy plaintext dashboard_data.* files are absent
 * - Validates public_overview.* parity & zero dev/task-ID leakage on public surfaces
 * - Validates protected_vault.* envelope & ChaCha20/PBKDF2/HMAC round-trip when EXEC_OPS_DASHBOARD_PASSWORD is set
 * - Validates inline JS syntax, DOM ID bindings, nav links, and strict privacy/NDA rules
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
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

function rotl(v, n) {
  return ((v << n) | (v >>> (32 - n))) >>> 0;
}

function qr(s, a, b, c, d) {
  s[a] = (s[a] + s[b]) >>> 0;
  s[d] = rotl(s[d] ^ s[a], 16);
  s[c] = (s[c] + s[d]) >>> 0;
  s[b] = rotl(s[b] ^ s[c], 12);
  s[a] = (s[a] + s[b]) >>> 0;
  s[d] = rotl(s[d] ^ s[a], 8);
  s[c] = (s[c] + s[d]) >>> 0;
  s[b] = rotl(s[b] ^ s[c], 7);
}

function chacha20Block(key, counter, nonce) {
  const kdv = new DataView(key.buffer, key.byteOffset, 32);
  const ndv = new DataView(nonce.buffer, nonce.byteOffset, 12);
  const init = new Uint32Array([
    0x61707865,
    0x3320646e,
    0x79622d32,
    0x6b206574,
    kdv.getUint32(0, true),
    kdv.getUint32(4, true),
    kdv.getUint32(8, true),
    kdv.getUint32(12, true),
    kdv.getUint32(16, true),
    kdv.getUint32(20, true),
    kdv.getUint32(24, true),
    kdv.getUint32(28, true),
    counter >>> 0,
    ndv.getUint32(0, true),
    ndv.getUint32(4, true),
    ndv.getUint32(8, true),
  ]);
  const st = new Uint32Array(init);
  for (let i = 0; i < 10; i++) {
    qr(st, 0, 4, 8, 12);
    qr(st, 1, 5, 9, 13);
    qr(st, 2, 6, 10, 14);
    qr(st, 3, 7, 11, 15);
    qr(st, 0, 5, 10, 15);
    qr(st, 1, 6, 11, 12);
    qr(st, 2, 7, 8, 13);
    qr(st, 3, 4, 9, 14);
  }
  const out = new Uint8Array(64);
  const odv = new DataView(out.buffer);
  for (let i = 0; i < 16; i++) odv.setUint32(i * 4, (st[i] + init[i]) >>> 0, true);
  return out;
}

function chacha20Xor(key, nonce, data) {
  const out = new Uint8Array(data.length);
  for (let i = 0, ctr = 1; i < data.length; i += 64, ctr++) {
    const ks = chacha20Block(key, ctr, nonce);
    const n = Math.min(64, data.length - i);
    for (let j = 0; j < n; j++) out[i + j] = data[i + j] ^ ks[j];
  }
  return out;
}

function decryptVaultNode(envelope, password) {
  const salt = Buffer.from(envelope.salt, "base64");
  const nonce = Buffer.from(envelope.nonce, "base64");
  const mac = Buffer.from(envelope.mac, "base64");
  const ct = Buffer.from(envelope.ct, "base64");
  const dk = crypto.pbkdf2Sync(Buffer.from(password, "utf8"), salt, Number(envelope.iter), 64, "sha256");
  const encKey = new Uint8Array(dk.subarray(0, 32));
  const macKey = dk.subarray(32, 64);
  const macInput = Buffer.concat([salt, nonce, ct]);
  const expectedMac = crypto.createHmac("sha256", macKey).update(macInput).digest();
  if (mac.length !== expectedMac.length || !crypto.timingSafeEqual(mac, expectedMac)) {
    return null;
  }
  const pt = chacha20Xor(encKey, new Uint8Array(nonce), new Uint8Array(ct));
  return JSON.parse(Buffer.from(pt).toString("utf8"));
}

// 1. Legacy plaintext files must be gone
for (const legacyName of ["dashboard_data.json", "dashboard_data.js"]) {
  const legacyPath = path.join(EXEC_OPS_DIR, "data", legacyName);
  assert.ok(!fs.existsSync(legacyPath), `Legacy plaintext file must not exist: ${legacyPath}`);
}

const pubJsonPath = path.join(EXEC_OPS_DIR, "data", "public_overview.json");
const pubJsPath = path.join(EXEC_OPS_DIR, "data", "public_overview.js");
const vaultJsonPath = path.join(EXEC_OPS_DIR, "data", "protected_vault.json");
const vaultJsPath = path.join(EXEC_OPS_DIR, "data", "protected_vault.js");
const dashHtmlPath = path.join(EXEC_OPS_DIR, "index.html");
const rootHtmlPath = path.join(SITE_ROOT, "index.html");

for (const p of [pubJsonPath, pubJsPath, vaultJsonPath, vaultJsPath, dashHtmlPath, rootHtmlPath]) {
  assert.ok(fs.existsSync(p), `Missing required file: ${p}`);
}

// 2. Validate public_overview parity & business-friendly contents
const pubJsonRaw = fs.readFileSync(pubJsonPath, "utf8");
const pubJsRaw = fs.readFileSync(pubJsPath, "utf8");
const pubData = JSON.parse(pubJsonRaw);
const pubPrefix = "window.EXEC_OPS_PUBLIC = ";
assert.ok(pubJsRaw.startsWith(pubPrefix), "public_overview.js missing window.EXEC_OPS_PUBLIC prefix");
assert.deepEqual(JSON.parse(pubJsRaw.slice(pubPrefix.length).replace(/;\s*$/, "")), pubData);
assert.equal(pubData.kpis.activeWorkstreams, 6);
assert.equal(pubData.workstreams.length, 6);
assert.ok(pubData.workstreams.some((w) => w.id === "vivid-vision-advisory"), "Missing vivid-vision-advisory in public_overview");

// 3. Validate protected_vault parity & zero plaintext leaks
const vaultJsonRaw = fs.readFileSync(vaultJsonPath, "utf8");
const vaultJsRaw = fs.readFileSync(vaultJsPath, "utf8");
const vaultEnv = JSON.parse(vaultJsonRaw);
const vaultPrefix = "window.EXEC_OPS_VAULT = ";
assert.ok(vaultJsRaw.startsWith(vaultPrefix), "protected_vault.js missing window.EXEC_OPS_VAULT prefix");
assert.deepEqual(JSON.parse(vaultJsRaw.slice(vaultPrefix.length).replace(/;\s*$/, "")), vaultEnv);
assert.equal(vaultEnv.v, 1);
assert.ok(Number(vaultEnv.iter) >= 100000, "Vault PBKDF2 iterations must be >= 100000");
for (const k of ["salt", "nonce", "mac", "ct"]) {
  assert.ok(typeof vaultEnv[k] === "string" && vaultEnv[k].length > 8, `Missing vault field ${k}`);
}
assert.ok(!/\bOPS-\d{3}\b/.test(vaultJsonRaw), "Plaintext task ID leaked inside protected_vault.json");

// 4. Validate root index.html integration cleanly preserves existing sections
const rootHtml = fs.readFileSync(rootHtmlPath, "utf8");
const navMatches = rootHtml.match(/href="executive-ops\/"/g) || [];
assert.ok(navMatches.length >= 2, `Expected >= 2 AI Ops nav links in root index.html, found ${navMatches.length}`);
for (const anchor of ['href="#products"', 'href="#expertise"', 'href="#portfolio"', 'href="#ai-agents"']) {
  assert.ok(rootHtml.includes(anchor), `Root index.html missing preserved section link: ${anchor}`);
}

// 5. Validate HTML DOM IDs, inline JS syntax, and zero dev/task leaks on public HTML
const dashHtml = fs.readFileSync(dashHtmlPath, "utf8");
for (const reqId of ['id="model"', 'id="strategy"', 'id="workstreams"', 'id="vault-section"', 'id="vault-locked-card"', 'id="vault-unlocked-panel"']) {
  assert.ok(dashHtml.includes(reqId), `executive-ops/index.html missing required element ${reqId}`);
}
const htmlIds = new Set([...dashHtml.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
const referencedIds = [...dashHtml.matchAll(/getElementById\("([^"]+)"\)/g)].map((m) => m[1]);
for (const rid of referencedIds) {
  assert.ok(htmlIds.has(rid), `getElementById("${rid}") missing matching element ID in HTML`);
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

// 6. Strict Privacy, NDA Confidentiality & Public Jargon Gate
const FORBIDDEN_ALL = [
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

const FORBIDDEN_PUBLIC_ONLY = [
  /\bOPS-\d{3}\b/,
  /\bmgr-[a-z-]+/i,
  /\bsnapshot\.py\b/i,
  /\bops_cli\.py\b/i,
  /\btsc\s+--noEmit\b/i,
];

const allFiles = [
  { name: "executive-ops/index.html", text: dashHtml, publicOnly: true },
  { name: "executive-ops/data/public_overview.json", text: pubJsonRaw, publicOnly: true },
  { name: "executive-ops/data/public_overview.js", text: pubJsRaw, publicOnly: true },
  { name: "executive-ops/data/protected_vault.json", text: vaultJsonRaw, publicOnly: false },
  { name: "executive-ops/data/protected_vault.js", text: vaultJsRaw, publicOnly: false },
  { name: "Personal-Website/index.html", text: rootHtml, publicOnly: false },
];

for (const f of allFiles) {
  for (const re of FORBIDDEN_ALL) {
    assert.ok(!re.test(f.text), `PRIVACY/CONFIDENTIALITY LEAK (${re}) detected in ${f.name}`);
  }
  if (f.publicOnly) {
    for (const re of FORBIDDEN_PUBLIC_ONLY) {
      assert.ok(!re.test(f.text), `PUBLIC VIEW LEAK (${re}) detected in ${f.name}`);
    }
  }
}

// 7. Optional full Node decryption verification when EXEC_OPS_DASHBOARD_PASSWORD is supplied
const pw = process.env.EXEC_OPS_DASHBOARD_PASSWORD;
let decryptedSummary = "skipped (no env pw)";
if (pw) {
  assert.equal(decryptVaultNode(vaultEnv, "wrong-password-123"), null, "Wrong password must fail HMAC verification");
  const dec = decryptVaultNode(vaultEnv, pw);
  assert.ok(dec && Array.isArray(dec.areas), "Correct password must decrypt vault JSON cleanly");

  const areasById = Object.fromEntries(dec.areas.map((a) => [a.id, a]));
  for (const aid of EXPECTED_PUBLIC_AREAS) {
    const area = areasById[aid];
    assert.ok(area, `Missing area in decrypted vault: ${aid}`);
    for (const prio of PRIORITIES) {
      const pStats = area.prioritySummary?.[prio];
      assert.ok(pStats && pStats.total >= 1, `Area '${aid}' missing priority '${prio}'`);
    }
  }
  const decTxt = JSON.stringify(dec);
  for (const re of FORBIDDEN_ALL) {
    assert.ok(!re.test(decTxt), `PRIVACY/NDA LEAK (${re}) inside decrypted vault JSON`);
  }
  // Confirm plaintext passcode is NEVER stored in any repository file
  for (const f of [...allFiles, { name: "verify_dashboard.mjs", text: fs.readFileSync(path.join(__dirname, "verify_dashboard.mjs"), "utf8") }]) {
    assert.ok(!f.text.includes(pw), `SECURITY FAILURE: plaintext password found in ${f.name}`);
  }
  decryptedSummary = `decrypted (${dec.summary.publicAreasCount} areas x P0-P5, ${dec.summary.totalTasks} tasks, ${dec.summary.doneTasks} done)`;
}

console.log(
  `VERIFIED: executive-ops two-tier showcase (6 public workstreams, ${inlineScriptsChecked} inline scripts, ${referencedIds.length} DOM refs, vault=${decryptedSummary}, 0 leaks)`
);
