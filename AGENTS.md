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
- **Idioma:** UI, mensajes y comentarios en español; identificadores de código en
  inglés (como ya está el codebase).

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
