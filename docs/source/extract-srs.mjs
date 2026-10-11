import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = path.join(__dirname, "Bashundhara-SSCOS-URS-SRS-v2N.pdf");
const outPath = path.join(__dirname, "srs-full.txt");
const idsPath = path.join(__dirname, "srs-ids.json");

const dataBuffer = fs.readFileSync(pdfPath);
const data = await pdfParse(dataBuffer);
fs.writeFileSync(outPath, data.text, "utf8");

const text = data.text;
const patterns = {
  FR: /FR-[A-Z0-9]+-\d{3}/g,
  US: /US-[A-Z0-9]+-\d{3}/g,
  UC: /UC-[A-Z0-9]+-\d{3}/g,
  NFR: /NFR-[A-Z0-9]+-\d{3}/g,
  KPI: /KPI-[A-Z0-9]+-\d{3}/g,
  AC: /AC-[A-Z0-9]+-\d{3}/g,
  SLA: /SLA-[A-Z0-9]+-\d{3}/g,
  SEC: /SEC-[A-Z0-9]+-\d{3}/g,
  INT: /INT-[A-Z0-9]+-\d{3}/g,
  API: /API-[A-Z0-9]+-\d{3}/g,
  UI: /UI-[A-Z0-9]+-\d{3}/g,
  DR: /DR-[A-Z0-9]+-\d{3}/g,
};

function unique(re) {
  return [...new Set(text.match(re) ?? [])].sort();
}

const ids = Object.fromEntries(Object.entries(patterns).map(([k, re]) => [k, unique(re)]));

// Also catch other ID styles commonly used in SRS docs
const extra = {
  MUST: [...new Set(text.match(/\bMUST\b/g) ?? [])].length,
  SHOULD: [...new Set(text.match(/\bSHOULD\b/g) ?? [])].length,
  COULD: [...new Set(text.match(/\bCOULD\b/g) ?? [])].length,
  MoSCoW_lines: (text.match(/Must|Should|Could|Won't|MoSCoW/g) ?? []).length,
  numbered_FR: [...new Set(text.match(/\bFR[-_]?\d{1,4}\b/g) ?? [])],
  section_headers: (text.match(/^\d+(\.\d+)*\s+[A-Z].{8,80}$/gm) ?? []).slice(0, 200),
};

const allIdLike = [...new Set(text.match(/\b[A-Z]{2,6}-[A-Z]{2,8}-\d{3}\b/g) ?? [])].sort();
const prefixes = {};
for (const id of allIdLike) {
  const p = id.split("-").slice(0, 2).join("-");
  prefixes[p] = (prefixes[p] ?? 0) + 1;
}

const summary = {
  pages: data.numpages,
  chars: text.length,
  ids,
  extra,
  allIdLikeCount: allIdLike.length,
  prefixes,
  sampleStart: text.slice(0, 4000),
};

fs.writeFileSync(idsPath, JSON.stringify({ ...summary, allIdLike }, null, 2), "utf8");
console.log(JSON.stringify({
  pages: data.numpages,
  chars: text.length,
  counts: Object.fromEntries(Object.entries(ids).map(([k, v]) => [k, v.length])),
  prefixCount: Object.keys(prefixes).length,
  prefixes,
}, null, 2));
