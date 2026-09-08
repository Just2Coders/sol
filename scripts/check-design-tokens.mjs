#!/usr/bin/env node
/**
 * Guard del design system.
 *
 * Tres reglas, todas con el mismo fin: que cambiar la paleta, la tipografía o
 * el ritmo del sistema sea editar un archivo de app/tokens/ y nada más.
 *
 *   1. Ningún componente escribe un color a mano (hex ni paleta cruda de
 *      Tailwind). Todo sale de un rol semántico: bg-primary, text-success…
 *   2. Ningún componente llama a una variable inline con corchetes de valor
 *      arbitrario. Cada token está registrado en su namespace de Tailwind y se
 *      usa como utilidad: text-display-1, px-gutter, duration-slow, ease-standard.
 *   3. Ninguna ruta en español. Los segmentos de app/ y los nombres de query
 *      params son parte de la URL pública y van en inglés.
 *   4. La lista de roles de texto de lib/utils.ts (TEXT_ROLES) cubre todos los
 *      --text-* del @theme. Si se desincronizan, tailwind-merge vuelve a tomar
 *      el rol nuevo por un color y borra en silencio los colores que lo
 *      precedan en un cn() — ver el comentario de TEXT_ROLES.
 *
 * Se salta app/globals.css (ahí es donde los valores crudos SÍ viven) y
 * components/ui/** (código generado por el CLI de shadcn, no lo escribimos).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN = ["app", "components", "lib"];
const SKIP_DIRS = new Set(["node_modules", ".next", "ui"]);
const SKIP_FILES = new Set(["globals.css"]);
const EXT = /\.(tsx|ts|jsx|js|css)$/;

// Paletas crudas de Tailwind: usarlas salta el sistema de tokens.
const RAW_PALETTE =
  /\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|shadow|accent|caret|divide)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
// Valor arbitrario de Tailwind que envuelve un token: -[var(--x)], -[length:var(--x)]…
const INLINE_TOKEN = /-\[[^\]]*var\(--[^)]+\)[^\]]*\]/g;

// Palabras que delatan una ruta o un param en español. No es un diccionario:
// son las que ya aparecieron en el proyecto, y crece si aparece otra.
const SPANISH_SEGMENT =
  /\b(catalogo|cuenta|registro|nuevo|nueva|editar|productos?|proveedores?|zonas?|pedidos?|carrito|ajustes|desde|hasta|buscar|pagina)\b/i;

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
    else if (EXT.test(name) && !SKIP_FILES.has(name)) out.push(full);
  }
  return out;
}

// Segmentos de ruta = nombres de carpeta bajo app/, sin grupos (auth) ni params [id].
function routeSegments(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    const bare = entry.name.replace(/^[([]|[)\]]$/g, "");
    if (SPANISH_SEGMENT.test(bare)) {
      out.push({ rel: relative(ROOT, full), line: 0, text: entry.name, why: "segmento de ruta en español" });
    }
    routeSegments(full, out);
  }
  return out;
}

/**
 * Los roles de texto declarados en el @theme, frente a los que conoce
 * tailwind-merge. Un rol que falte en TEXT_ROLES no rompe nada visible: lo que
 * hace es borrar colores ajenos al fusionar clases, que es mucho peor de
 * encontrar. Por eso se compara aquí y no se confía en la memoria de nadie.
 */
function textRoleDrift() {
  const css = readFileSync(join(ROOT, "app", "globals.css"), "utf8");
  // Solo la declaración del rol (`--text-body: 16px`), no sus modificadores
  // (`--text-body--line-height`), que no generan utilidad propia.
  const declared = new Set(
    [...css.matchAll(/^\s+--text-([a-z0-9-]+):/gm)]
      .map((m) => m[1])
      .filter((name) => !name.includes("--")),
  );

  const utils = readFileSync(join(ROOT, "lib", "utils.ts"), "utf8");
  const block = utils.match(/export const TEXT_ROLES = \[([^\]]*)\]/s);
  if (!block) {
    return [
      {
        rel: "lib/utils.ts",
        line: 0,
        text: "TEXT_ROLES",
        why: "no se encontró la lista; sin ella cn() borra colores",
      },
    ];
  }
  const known = new Set(
    [...block[1].matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]),
  );

  const out = [];
  for (const role of declared) {
    if (!known.has(role)) {
      out.push({
        rel: "lib/utils.ts",
        line: 0,
        text: `text-${role}`,
        why: "rol de texto ausente en TEXT_ROLES",
      });
    }
  }
  for (const role of known) {
    if (!declared.has(role)) {
      out.push({
        rel: "lib/utils.ts",
        line: 0,
        text: `text-${role}`,
        why: "en TEXT_ROLES pero ya no existe en el @theme",
      });
    }
  }
  return out;
}

const findings = [...routeSegments(join(ROOT, "app")), ...textRoleDrift()];
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
      for (const m of line.matchAll(INLINE_TOKEN)) {
        findings.push({ rel, line: i + 1, text: m[0], why: "token llamado inline; usa su utilidad" });
      }
      // Query params en español dentro de URLs o searchParams.
      for (const m of line.matchAll(/[?&]([a-zA-Z]+)=/g)) {
        if (SPANISH_SEGMENT.test(m[1])) {
          findings.push({ rel, line: i + 1, text: m[0], why: "query param en español" });
        }
      }
    });
  }
}

if (findings.length === 0) {
  console.log(
    "✓ Design system limpio: sin colores a mano, sin tokens inline, sin rutas\n" +
      "  en español y los roles de texto sincronizados con TEXT_ROLES.",
  );
  process.exit(0);
}

console.error(`\n✗ ${findings.length} incumplimiento(s) del design system:\n`);
for (const f of findings) {
  const where = f.line ? `${f.rel}:${f.line}` : f.rel;
  console.error(`  ${where}  ${f.text}  (${f.why})`);
}
console.error(
  "\n  · Color → usa un rol semántico (bg-primary, text-muted-foreground, fill-support)\n" +
    "    o define el que falte en app/tokens/colors.css.\n" +
    "  · Token inline → usa su utilidad (text-display-1, px-gutter, duration-slow);\n" +
    "    si no existe, añade el token al namespace correcto en app/tokens/.\n" +
    "  · Ruta o param → renómbralo a inglés (/catalog, /account, ?from=).\n" +
    "  · Rol de texto → añádelo (o quítalo) en TEXT_ROLES, en lib/utils.ts.\n" +
    "  Si un caso es intencional, añade el comentario check-design-tokens-ignore\n" +
    "  en esa línea.\n",
);
process.exit(1);
