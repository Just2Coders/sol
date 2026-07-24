# Arquitectura — Solaris (marketplace de kits/paneles solares)

> Este documento describe **cómo está construido el proyecto hoy** y las
> convenciones que seguimos al añadir código. Es la fuente de verdad técnica:
> si el código y este documento se contradicen, uno de los dos es un bug —
> arréglalo y actualiza este archivo en el mismo PR.
>
> Para el _porqué_ del negocio (actores, flujo, decisiones abiertas) ver
> [`../PLAN.md`](../PLAN.md). Para las reglas rápidas del día a día ver
> [`../AGENTS.md`](../AGENTS.md).

## 1. Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, React Server Components) + React 19 |
| Lenguaje | TypeScript en modo `strict` |
| Base de datos | PostgreSQL en **Neon** (driver serverless HTTP) |
| ORM | **Drizzle ORM** + `drizzle-kit` para migraciones |
| Validación | **Zod** v4 |
| Auth | Sesión propia por **JWT** (`jose`) en cookie httpOnly + `bcryptjs` |
| UI | **shadcn/ui** (Radix) + Tailwind CSS v4 |

## 2. Estructura de carpetas

```
app/                    Presentación: rutas, páginas (RSC) y Server Actions
  (auth)/               Grupo de rutas de autenticación (login, registro)
  actions/              Server Actions ("use server") — punto de entrada de mutaciones
  admin/                Panel de administración (rol ADMIN)
  cuenta/               Área del cliente autenticado
components/
  ui/                   Primitivos de shadcn/ui (button, input, card, ...)
  auth/                 Componentes de cliente por feature (formularios de auth)
lib/                    Lógica de servidor reutilizable (NO específica de una ruta)
  db/
    schema.ts           Definición de tablas y relaciones Drizzle (fuente del modelo)
    index.ts            Cliente `db` (Neon + Drizzle)
    seed.ts             Datos iniciales (zonas, admin, proveedor demo)
    migrations/         SQL generado por drizzle-kit (versionado en git)
  session.ts            Emisión/lectura/borrado de la cookie de sesión JWT
  dal.ts                Data Access Layer: verificación de sesión + lectura de usuario
  utils.ts              Helpers de UI (cn, etc.)
proxy.ts                Middleware de Next 16 (protección de rutas por cookie)
docs/                   Documentación (este archivo)
```

## 3. Capas y regla de dependencias

El flujo de dependencias va **en un solo sentido**, de fuera hacia dentro:

```
app/ (páginas RSC + Server Actions)
        │  importa
        ▼
lib/   (session · dal · db · utils)
        │  importa
        ▼
lib/db/schema.ts  (modelo de datos — no importa nada del proyecto)
```

Reglas concretas:

- **La UI no arma queries ad-hoc.** Los componentes y páginas obtienen datos
  llamando a funciones de `lib/` (hoy: `lib/dal.ts`), nunca importando las
  tablas de `schema.ts` para construir un `db.select(...)` suelto dentro de un
  componente. El acceso a datos vive en `lib/`, del lado servidor.
- **Toda mutación entra por una Server Action** (`app/actions/*.ts` con
  `"use server"`), que: (1) valida la entrada con Zod, (2) ejecuta la escritura,
  (3) revalida/redirige. Ver el patrón en [`app/actions/auth.ts`](../app/actions/auth.ts).
- **`schema.ts` es la única fuente del modelo.** Los tipos de dominio se derivan
  de él (`typeof users.$inferSelect`), no se redefinen a mano.
- Ficheros que tocan servidor exclusivamente (`db`, `session`, `dal`) empiezan
  con `import "server-only"` para que nunca acaben en un bundle de cliente.

> **Nota de evolución.** Hoy la validación y el acceso a datos conviven dentro de
> cada Server Action porque el dominio es pequeño. A medida que un módulo crezca
> (p. ej. órdenes con su máquina de estados), extraemos su lógica a un
> **service** en `lib/<módulo>/` y la Action pasa a ser una capa fina que llama
> al service. Ver la receta en la sección 7.

## 4. Modelo de datos (resumen)

Definido en [`lib/db/schema.ts`](../lib/db/schema.ts). Entidades principales:

- **zones** — jerarquía estado → ciudad (`parentId` auto-referencia).
- **users** — cuenta con `role: ADMIN | CUSTOMER`, opcionalmente ligada a una zona.
- **suppliers** — proveedores **gestionados por el admin** (no hay auto-registro).
  Cobertura por zona vía `supplier_zones`. `payoutInfo` = cómo se le liquida.
- **products** / **kits** — catálogo de cada proveedor. Un kit agrupa productos
  (`kit_items`) y tiene su propio precio.
- **orders** — una orden pertenece a **un solo proveedor** (simplifica la
  liquidación). No se mezclan proveedores en un mismo pedido.
- **order_items** — líneas con **snapshot** de nombre y precio al momento de la
  compra; `itemId` es una FK "blanda" a `products.id` o `kits.id` según `itemType`.
- **payments** — pago por **Zelle** (MVP) o Suby.fi (futuro), con su propio ciclo
  de verificación manual por el admin.

### Convenciones del modelo

- **Dinero:** columnas `numeric(10,2)` en **USD**, leídas como `number` en TS
  (`mode: "number"` de Drizzle). Postgres `numeric` es decimal exacto (no float),
  así que es seguro para dinero. Los nombres de columna llevan sufijo `Usd`
  (`priceUsd`, `totalUsd`, `subtotalUsd`, `priceSnapshotUsd`).
  _Aún no hay fee de plataforma ni tabla de config de fee: el total = subtotal.
  Cuando se introduzca la comisión del marketplace, se documenta aquí._
- **IDs:** `uuid` con `defaultRandom()`.
- **Timestamps:** `timestamp({ withTimezone: true })` con `defaultNow()`.
- **Enums:** `pgEnum` en MAYÚSCULAS (`ADMIN`, `PENDING_PAYMENT`, ...).
- **Snapshots vs referencias vivas:** los datos que no deben cambiar tras
  registrarse (precio y nombre en una orden) se copian; no se referencian.

## 5. Máquina de estados de la orden (implementada)

```
PENDING_PAYMENT → PAYMENT_REPORTED → PAID → COMPLETED
                                       │
                                   CANCELLED
```

`payments.status`: `PENDING → REPORTED → CONFIRMED` (o `REJECTED`). El admin
verifica el Zelle manualmente y confirma, lo que hace avanzar la orden.

> Esta máquina de estados coincide con el flujo Zelle descrito en
> [`PLAN.md`](../PLAN.md) (Fase 1). La integración automática con suby.fi queda
> para la Fase 2, reutilizando `payments.method = SUBY`.

## 6. Autenticación y autorización

- **Sesión:** JWT HS256 firmado con `SESSION_SECRET`, guardado en cookie
  `session` httpOnly, `sameSite=lax`, 7 días. Ver [`lib/session.ts`](../lib/session.ts).
- **Dos niveles de verificación** (ver [`lib/dal.ts`](../lib/dal.ts)):
  - `verifySession()` / `verifyAdmin()` — chequeo **optimista** (solo cookie),
    para gate rápido de páginas. Redirige si no cumple.
  - `getCurrentUser()` — chequeo **seguro** (va a la BD), cuando se necesitan
    datos reales del usuario. Nunca devuelve `passwordHash`. Si la cookie es
    válida pero el usuario ya no existe (sesión huérfana, p. ej. cuenta
    eliminada), redirige a `/api/auth/logout` — un Route Handler que borra la
    cookie y manda a `/login` (un RSC no puede borrar cookies; solo Server
    Actions y Route Handlers).
- **`proxy.ts`** (middleware de Next 16) hace un primer filtro por cookie para
  `/admin` y `/cuenta`, pero **no** es la última línea de defensa: cada página
  protegida vuelve a llamar al DAL. Nunca confíes solo en el middleware.

## 7. Receta: añadir un módulo nuevo (p. ej. `orders`)

1. **Modelo** — añade/ajusta tablas y relaciones en `lib/db/schema.ts`.
2. **Migración** — `npm run db:generate` (crea el SQL en `lib/db/migrations/`),
   revísalo, y `npm run db:migrate` para aplicarlo. **Commitea la migración.**
3. **Validación** — define los `zod` schemas de entrada (en la Action, o en
   `lib/orders/schemas.ts` si se reutilizan).
4. **Lógica** — para algo con reglas de negocio (transiciones de estado, cálculo
   de totales) crea `lib/orders/service.ts` con funciones puras/testables que
   reciban `db` y devuelvan resultados; que **no** dependan de `next/headers`.
5. **Server Action** — en `app/actions/orders.ts`: valida con Zod → llama al
   service → `revalidatePath`/`redirect`. Mantenla fina.
6. **UI** — página RSC en `app/...` que lee vía DAL/service y renderiza;
   componentes de cliente (formularios) en `components/orders/`.
7. **Docs** — si cambian convenciones o el modelo, actualiza este archivo.

## 8. Comandos

```bash
npm run dev          # servidor de desarrollo
npm run build        # build de producción
npm run lint         # eslint
npm run db:generate  # generar migración desde el schema
npm run db:migrate   # aplicar migraciones
npm run db:push      # empujar el schema directo (solo prototipado local)
npm run db:studio    # UI de Drizzle para inspeccionar la BD
npm run db:seed      # cargar datos iniciales
```

Variables de entorno (ver [`.env.example`](../.env.example)): `DATABASE_URL`
(Neon) y `SESSION_SECRET`.
