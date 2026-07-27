<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Estándares del proyecto (Solaris)

Todo el código debe ser **CLEAN**, **DRY**, seguir los patrones ya establecidos
y pensarse para **escalar**. La arquitectura, las capas y la receta para añadir
módulos están en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — **léelo antes
de escribir código**. El plan de negocio y las fases están en [`PLAN.md`](PLAN.md).

## Reglas rápidas

- **Flujo de dependencias en un sentido:** `app/` (páginas RSC + Server Actions)
  → `lib/` (session · dal · db) → `lib/db/schema.ts`. Nunca al revés.
- **La UI no arma queries sueltas.** El acceso a datos vive en `lib/`, del lado
  servidor. Los componentes/páginas no importan tablas de `schema.ts` para
  construir un `db.select(...)` ad-hoc.
- **Toda mutación entra por una Server Action** (`app/actions/*.ts`, `"use server"`):
  valida con Zod → escribe → `revalidatePath`/`redirect`. Mantenla fina; si crece
  la lógica, extráela a un service en `lib/<módulo>/` (ver receta en ARCHITECTURE §7).
- **Validación con Zod** en el borde (entrada de cada Action). No confíes en datos
  del cliente.
- **`schema.ts` es la única fuente del modelo.** Deriva los tipos con
  `typeof tabla.$inferSelect`; no los redefinas a mano.
- **Dinero:** columnas `numeric(10,2)` en **USD**, sufijo `Usd` en el nombre.
  Postgres `numeric` es decimal exacto — no uses `float` para dinero.
- **Server-only:** ficheros que tocan `db`/sesión empiezan con `import "server-only"`.
- **Seguridad de rutas:** `proxy.ts` es un primer filtro por cookie, **no** la
  última defensa. Cada página protegida vuelve a verificar vía `lib/dal.ts`.
- **Migraciones:** al cambiar `schema.ts`, `npm run db:generate`, revisa el SQL y
  **commitéalo** junto al cambio. Nunca edites una migración ya aplicada.
- **Idioma:** UI, mensajes y comentarios en español; **todo identificador en
  inglés**: variables, componentes, tokens, y también **rutas, segmentos de URL
  y query params** (`/catalog`, `/account`, `/admin/suppliers/new`, `?from=`).
  Nunca crees una ruta en español. Ver el bloque de design system abajo.

## Design system

Todo vive en un solo archivo, [`app/globals.css`](app/globals.css): los roles con
su valor en `:root`, y debajo un `@theme inline` que los registra como utilidades
de Tailwind. Lo vigila `npm run check:tokens` (falla el CI si se rompe alguna de
estas reglas; excepción puntual: comentario `check-design-tokens-ignore` en la
línea).

- **Los tokens son utilidades, nunca variables inline.** Cada token está
  registrado en su namespace de Tailwind v4, así que en el markup se escribe
  `text-display-1`, `px-gutter`, `duration-slow`, `ease-standard`, `shadow-md`,
  `rounded-md`. **Prohibido** el valor arbitrario que envuelve una variable —la
  forma `px-[ var(--token) ]` con corchetes—. Si te falta un valor, añade el
  token al namespace correcto en `globals.css`; no lo llames inline.
  _(Ojo al documentar: Tailwind escanea también los `.md`, así que un ejemplo de
  esa forma escrito sin espacios acaba compilado como clase real.)_
- **Un rol de texto ya trae tamaño, interlineado, tracking y peso.** No le
  añadas `font-bold` ni `leading-*` encima salvo que quieras romperlo a
  propósito.
- **Espaciado:** la escala de 4px es la nativa de Tailwind (`p-4`, `gap-6`,
  `mt-12`). En el theme solo viven las literales de layout del sketch
  (`px-gutter`, `py-section-md`, `py-header`, `gap-grid`).
- **Ningún nombre describe el color que tiene hoy.** Los roles son lo único que
  ve el markup: `bg-background`, `text-foreground`, `text-muted-foreground`,
  `bg-primary`, `text-primary-foreground`, `border-border`, `fill-support`,
  `bg-canvas`, `text-foreground-inverse`, `text-emphasis`, `bg-muted`,
  `ring-ring`, `text-success|warning|info`. Prohibido nombrar un token por su
  tono (`terra`, `hueso`, `verde`) o en español, y prohibido escribir un hex o
  una paleta cruda de Tailwind (`text-green-600`) fuera de `globals.css`.
- **Para recolorear el proyecto** se editan los valores del `:root` y nada más:
  ningún componente escribe un color. En el `@theme inline` no se escriben
  valores nuevos, solo se apunta a un rol.

## Flujo de Git y Pull Requests

- **Ramas:**
  - `main` — producción (protegida). Solo entra por PR con CI en verde.
  - `dev` — integración/staging. Destino por defecto de los PR de trabajo.
  - `feature/*` · `fix/*` · `chore/*` — ramas de trabajo, salen de `dev` y
    vuelven a `dev` por PR. `dev → main` es un release (otro PR).
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org)
  (`feat:`, `fix:`, `chore:`, `docs:`, `ci:`, `refactor:`, ...).
- **Todo PR debe describir, resumido, los principales cambios/diferencias que
  trae:** qué cambia, por qué, y su impacto (migraciones de BD, variables de
  entorno nuevas, breaking changes, docs afectados). Usa la plantilla
  [`.github/pull_request_template.md`](.github/pull_request_template.md) — no la
  borres, complétala.
- **No se mergea con el CI en rojo.** Lint, typecheck y build deben pasar.

## Antes de dar por terminado un cambio

```bash
npm run lint
npx --no-install tsc --noEmit
```
Ambos deben pasar sin errores.
