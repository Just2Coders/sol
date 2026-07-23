# Deploy — Vercel + Neon

> Cómo desplegar Solaris de forma profesional con la **integración Git de Vercel**
> (deploys automáticos por rama) y **Neon** como base de datos.
>
> Convención de entornos:
>
> | Rama / evento GitHub | Deploy Vercel | Base de datos Neon |
> |---|---|---|
> | push a `main`        | **Production**  | Neon rama `prod` (BD real) |
> | PR / push a `dev`    | **Preview**     | Neon rama `dev` (BD de pruebas) |
>
> Los pasos marcados **[TÚ]** requieren tu cuenta (login, OAuth, escribir
> secretos): no se pueden automatizar desde el repo por seguridad.

## 0. Prerrequisitos (ya listos)

- Repo en GitHub (`Just2Coders/sol`) con el CI en verde.
- `npm run build` pasa sin BD (las páginas que consultan Neon son dinámicas).
- `engines.node = "24.x"` en `package.json` → Vercel usa Node 24 (su default).
- `package-lock.json` completo multiplataforma → `npm install` en el runner Linux de Vercel funciona.

## 1. Neon: separar dev y prod

La BD actual (la de tu `.env`) sirve como **prod**. Para no probar contra datos reales, crea una **rama `dev` en Neon** (Neon → tu proyecto → Branches → New branch, a partir de `main`/`prod`). Copia las dos connection strings (usa el endpoint **-pooler**, ideal para serverless):

- `DATABASE_URL` de **prod** → irá al entorno Production de Vercel.
- `DATABASE_URL` de **dev**  → irá al entorno Preview de Vercel.

## 2. Importar el proyecto en Vercel  **[TÚ]**

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository**.
2. Autoriza la app de Vercel en GitHub para `Just2Coders/sol` (OAuth). Elige el repo.
3. Vercel detecta **Next.js** solo. **No** toques Build/Output/Install command
   (el zero-config de Next es lo correcto). Root Directory: `./`.
4. **Antes de darle Deploy**, configura las variables de entorno (paso 3).

## 3. Variables de entorno en Vercel  **[TÚ]**

En el import (o luego en Settings → Environment Variables) agrega, **por entorno**:

| Variable | Production | Preview |
|---|---|---|
| `DATABASE_URL`   | connection string de Neon **prod** | connection string de Neon **dev** |
| `SESSION_SECRET` | un secreto **nuevo** (ver abajo)   | otro secreto nuevo |

> **Nunca** reuses el `SESSION_SECRET` de tu `.env` local en producción, ni lo
> commitees. Genera uno fresco:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
> ```

## 4. Rama de producción  **[TÚ]**

Settings → **Git** → **Production Branch** = `main`.
Así `main` despliega a Production y `dev` + los PR generan **Preview** automáticos.

## 5. Primer deploy

El import dispara el primer deploy desde la rama por defecto. A partir de ahí es
automático: `git push` a `main` → Production; PR/`dev` → Preview con URL propia
para probar antes de mergear.

## 6. Migraciones de base de datos  ⚠️ importante

**Las migraciones NO corren en el build de Vercel** (correrlas en cada Preview
sería peligroso: concurrencia, BD equivocada). Se aplican como paso deliberado
cuando cambia el schema, apuntando `DATABASE_URL` a la BD correspondiente:

```bash
# contra dev (antes de probar en Preview)
DATABASE_URL="<neon-dev>" npm run db:migrate

# contra prod (al liberar a Production)
DATABASE_URL="<neon-prod>" npm run db:migrate
```

La primera vez, siembra cada BD (zonas + admin) una sola vez:
```bash
DATABASE_URL="<neon-...>" npm run db:seed
```

> **Regla:** el `db:migrate` de prod se corre **junto con** el merge a `main`,
> no después de días. Código y schema de prod deben ir sincronizados.
>
> _Mejora futura:_ automatizar con un job de GitHub Actions disparado en `main`
> que corra `db:migrate` usando un secreto `DATABASE_URL` del repo. Se añade
> cuando el ritmo de cambios de schema lo justifique.

## 7. Checklist post-deploy

- [ ] La Production URL carga (`/`, `/login`, `/registro`).
- [ ] `/registro` muestra las zonas (confirma que Production lee Neon prod).
- [ ] Login del admin funciona (tras `db:seed` en prod).
- [ ] Un PR genera una Preview URL y esa Preview apunta a Neon dev.

## Notas

- **Corepack:** Vercel lo tiene desactivado por defecto, así que el campo
  `packageManager` del `package.json` se ignora en el build y Vercel usa su
  propio npm — sin problema, el lockfile completo se instala igual. No lo
  actives salvo necesidad.
- **Blob / Emails:** `Vercel Blob` (imágenes) y `Resend` (correos) llegan en
  etapas posteriores; añadirán sus propias variables de entorno aquí.
