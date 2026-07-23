<!--
  Completa las secciones. El objetivo es que quien revise entienda de un vistazo
  QUÉ cambia y POR QUÉ, sin leer todo el diff.
-->

## Resumen

<!-- 2–4 líneas: qué hace este PR y por qué. -->

## Principales cambios / diferencias

<!-- Bullets con lo relevante respecto a como estaba antes. -->
-

## Impacto

- [ ] Requiere migración de BD (`npm run db:generate` + commitear el SQL)
- [ ] Introduce nuevas variables de entorno (documentadas en `.env.example`)
- [ ] Breaking change
- [ ] Afecta documentación (`AGENTS.md` / `docs/ARCHITECTURE.md` / `PLAN.md`)

## Checklist

- [ ] `npm run lint` pasa
- [ ] `npx --no-install tsc --noEmit` pasa
- [ ] `npm run build` pasa
- [ ] La descripción de arriba resume los cambios principales
