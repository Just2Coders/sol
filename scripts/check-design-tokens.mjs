#!/usr/bin/env node
/**
 * Guard del design system.
 *
 * Regla: ningún componente escribe un color a mano. Todo sale de un token
 * semántico (bg-primary, text-success, var(--verde)…). Es lo que mantiene
 * barato cambiar la paleta: se edita app/tokens/colors.css y se propaga sola.
 *
 * Se salta app/tokens/** — ahí es donde los valores crudos SÍ viven.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN = ["app", "components", "lib"];
const SKIP_DIRS = new Set(["node_modules", ".next", "tokens"]);
const EXT = /\.(tsx|ts|jsx|js|css)$/;

// Paletas crudas de Tailwind: usarlas salta el sistema de tokens.
const RAW_PALETTE =
  /\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|shadow|accent|caret|divide)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.test(name)) out.push(full);
  }
  return out;
}

const findings = [];
for (const base of SCAN) {
  for (const file of walk(join(ROOT, base))) {
    const rel = relative(ROOT, file);
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (line.includes("check-design-tokens-ignore")) return;
      for (const m of line.matchAll(RAW_PALETTE)) {
        findings.push({ rel, line: i + 1, text: m[0], why: "paleta cruda de Tailwind" });
      }
      for (const m of line.matchAll(HEX)) {
        findings.push({ rel, line: i + 1, text: m[0], why: "color hexadecimal" });
      }
    });
  }
}

if (findings.length === 0) {
  console.log("✓ Sin colores escritos a mano: todo consume tokens del design system.");
  process.exit(0);
}

console.error(`\n✗ ${findings.length} color(es) fuera del design system:\n`);
for (const f of findings) {
  console.error(`  ${f.rel}:${f.line}  ${f.text}  (${f.why})`);
}
console.error(
  "\nUsa un token semántico (bg-primary, text-success, bg-verde…) o define el rol\n" +
    "que falte en app/tokens/colors.css. Si un caso es intencional, añade el\n" +
    "comentario check-design-tokens-ignore en esa línea.\n",
);
process.exit(1);
