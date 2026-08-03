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
| Estado de cliente | **Zustand** — solo el carrito; el resto vive en la URL o en el servidor |

## 2. Estructura de carpetas

```
app/                    Presentación: rutas, páginas (RSC) y Server Actions
  (auth)/               Grupo de rutas de autenticación (login, signup)
  actions/              Server Actions ("use server") — punto de entrada de mutaciones
  admin/                Panel de administración (rol ADMIN): zones, suppliers, products, kits
  account/              Área del cliente autenticado
  catalog/              Catálogo público: listado y fichas de /products/[slug],
                        /kits/[slug] y /services/[slug]
  globals.css           Design system: roles de color/tipografía y su registro en Tailwind
components/
  ui/                   Primitivos de shadcn/ui (button, input, card, ...)
  auth/                 Componentes de cliente por feature (formularios de auth)
  admin/                Componentes de cliente del panel admin (formularios CRUD)
  landing/              Home: hero, mapa de provincias, barra del sitio
  catalog/              Catálogo público: filtros, tarjeta, foto, instalaciones
    detail/             La ficha a dos columnas: armazón, columna de fotos,
                        cabecera fija (identidad + compra), acordeón de
                        secciones, componentes del kit, proveedor y su cobertura,
                        y la tira de "más de este proveedor"
  cart/                 Carrito: botón de la ficha y panel lateral del header
lib/                    Lógica de servidor reutilizable (NO específica de una ruta)
  cart/
    lines.ts            El carrito como dato puro: la línea, sus sumas y su
                        reparto por proveedor
    store.ts            El store de zustand, persistido en localStorage
  db/
    schema.ts           Definición de tablas y relaciones Drizzle (fuente del modelo)
    index.ts            Cliente `db` (Neon + Drizzle)
    seed.ts             Datos iniciales (zonas, admin, proveedor demo)
    migrations/         SQL generado por drizzle-kit (versionado en git)
  catalog/
    filters.ts          Los filtros del catálogo tal como viven en la URL (puro)
    photos.ts           La columna de fotos de una ficha y sus anclas (puro)
    queries.ts          Lecturas del catálogo público (solo activo, por zona)
  products/queries.ts   Lecturas de productos (panel admin)
  kits/queries.ts       Lecturas de kits con sus componentes (panel admin)
  zones/queries.ts      Lecturas de zonas (jerarquía estado → ciudad)
  zones/preference.ts   Cookie con la zona que eligió el visitante
  suppliers/queries.ts  Lecturas de proveedores (con zonas de cobertura)
  session.ts            Emisión/lectura/borrado de la cookie de sesión JWT
  dal.ts                Data Access Layer: verificación de sesión + lectura de usuario
  utils.ts              Helpers compartidos (cn, slugify, safeInternalPath)
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

### Lecturas públicas vs. lecturas del panel

Un mismo dato se lee distinto según quién mire, así que cada uno tiene su
módulo en vez de una query con banderas:

- `lib/products/queries.ts` y `lib/kits/queries.ts` sirven al **admin**: lo ven
  todo, activo o no.
- `lib/catalog/queries.ts` sirve al **catálogo público**: solo items activos de
  proveedores activos, filtrados por la zona donde el visitante instala, y con
  kits y productos unificados en un mismo tipo (`CatalogItem`) para que la
  grilla no sepa de qué tabla viene cada tarjeta. Nunca expone datos internos
  del proveedor (`payoutInfo`, teléfono, notas).

### La ficha son dos columnas y tres regiones que no se empujan

Fotos a la izquierda, datos a la derecha, y en escritorio ninguna de las dos mueve
a la otra: recorrer las fotos no debería empujar el precio fuera de pantalla. En
móvil vuelve a haber un solo scroll y la tira de fotos se acuesta como carrusel
con imán. Todo está en `components/catalog/detail/`, y la columna de fotos **no se
hidrata**: el paso de foto lo hace `scroll-snap` y el salto desde el nombre de un
componente es un ancla de verdad (`lib/catalog/photos.ts` calcula el id en el
único sitio que lo conocen las dos columnas).

La columna derecha se reparte en tres, y solo una se mueve: la **cabecera**
(`detail-head.tsx`: qué es, cuánto cuesta y el botón) queda clavada arriba porque
es la decisión de compra; el **pie** (`CatalogSupplierCoverage`) queda clavado
abajo porque la cobertura decide si ese botón sirve de algo donde vive quien mira;
y entre los dos scrollea lo demás — el acordeón de secciones y la tira de más
cosas del proveedor. Las secciones van plegadas (`detail-accordion.tsx`) para que
la columna quepa de un vistazo, y la jerarquía de líneas es lo que las separa: el
pliegue entre filas es `border-border-strong` y todo filete de dentro de una fila
es `border-border`, un peldaño por debajo.

Las fotos las trae cada proveedor, así que una pared mezcla estudio con fondo
blanco, render y foto de obra. `CatalogMedia` con `duotone` las imprime en la
paleta con dos capas de mezcla —`--photo-highlight` recorta las altas luces al
papel de la ficha y `--photo-shadow` levanta los negros— y devuelve el color bajo
el cursor. La capa del papel se queda puesta siempre: es la que hace desaparecer
el fondo blanco de estudio, y recortar altas luces no le quita color a un
producto. El duotono completo solo se monta donde hay cursor para deshacerlo
(`pointer-fine`).

Una ficha lee dos cosas —el item y las instalaciones que ofrece— y las pide **en
paralelo**: `getInstallationsFor` entra por el slug del item y no por su id
justamente para no depender de la otra consulta, porque con Neon por HTTP dos
saltos en serie son dos latencias.

Quien instala no es siempre quien vende: un servicio que no sea `OWN` puede
ofrecerse junto al equipo de otro proveedor (pendiente de la migración `0005`,
ver §4). Por eso cada fila de esa lista dice de quién es, la
línea de carrito que arma guarda **el proveedor del servicio** (no el del equipo:
es lo que decide en qué grupo del pedido cae y a quién se le liquida), y la
consulta filtra por zona cuando el instalador es ajeno — si fuera el mismo que
vende, la cobertura ya se dio por buena al llegar a la ficha. Ojo con `extras` de la query relacional de
drizzle: reescribe las referencias de columna apuntándolas a la tabla exterior,
así que una subconsulta correlacionada contra otras tablas **no** se puede
escribir ahí.

Los filtros del catálogo viven en la **URL**, no en estado de cliente
(`lib/catalog/filters.ts` los traduce en ambos sentidos): así una búsqueda se
comparte, el botón atrás deshace filtro a filtro y la página se sigue
resolviendo en el servidor. La única preferencia que además se recuerda es la
zona, en una cookie httpOnly (`lib/zones/preference.ts`), que se escribe desde
la Action `selectZone` — y se borra cuando el visitante quita el filtro, o
volvería a aparecer sola en la siguiente visita.

### El carrito es la excepción: vive en el cliente

Es el único estado de la app que no está ni en la URL ni en el servidor. Hasta
el checkout no hay nada que guardar —ni orden, ni sesión obligatoria—, así que
armarlo es trabajo del navegador y el catálogo se sigue sirviendo sin sesión.
La única huella es `localStorage`, para que cerrar la pestaña no borre lo
elegido.

- `lib/cart/lines.ts` — el dato puro: qué es una línea y cómo se suma. No
  depende de zustand ni del navegador, así que lo importan los dos lados (igual
  que `lib/catalog/filters.ts`).
- `lib/cart/store.ts` — el store (`"use client"`) con el middleware `persist`.

El carrito **admite varios proveedores** y no ordena por ellos: las líneas se
guardan en el orden en que se eligieron, y agrupar por quién entrega es cosa de
quien pinta (`cartGroups` en `lines.ts`), no del almacenamiento. Así el panel
puede enseñar el reparto —un encabezado y un subtotal por proveedor— sin que
añadir un panel reordene lo que ya estaba puesto delante de los ojos.

`cartGroups()` es quien hace el reparto, y el panel solo lo **dibuja** cuando hay
más de un proveedor: con uno solo, un encabezado y un subtotal por grupo
repetirían lo que ya dicen la cabecera y el pie.

Lo que se guarda es una **foto** de la ficha (nombre, precio, stock del
momento) para poder pintar el panel sin volver al servidor. Nunca se cobra
desde ahí: la Server Action del checkout vuelve a leer el catálogo y son sus
valores los que se copian a `order_items` (§4, snapshots).

Como el HTML lo pinta el servidor, que no tiene `localStorage`, todo lector del
carrito pasa por `useCartLines()`: devuelve vacío hasta que la lectura termina,
de modo que la pintada con la que React hidrata coincide con la del servidor.

## 4. Modelo de datos (resumen)

Definido en [`lib/db/schema.ts`](../lib/db/schema.ts). Entidades principales:

- **zones** — jerarquía estado → ciudad (`parentId` auto-referencia).
- **users** — cuenta con `role: ADMIN | CUSTOMER`, opcionalmente ligada a una zona.
- **suppliers** — proveedores **gestionados por el admin** (no hay auto-registro).
  Cobertura por zona vía `supplier_zones`. `payoutInfo` = cómo se le liquida.
- **products** / **kits** — catálogo de cada proveedor. Un kit agrupa productos
  (`kit_items`) y tiene su propio precio.
- **services** — mano de obra (instalación), clasificada por
  **service_categories** (tabla, no enum: el admin añade categorías sin deploy).
  Tabla aparte de `products` porque un servicio no tiene existencias ni entrega y
  su precio puede ser cerrado (`FLAT`) o por unidad de obra (`PER_UNIT` +
  `unitLabel`). `equipmentScope` dice sobre qué equipo trabaja, de más estrecho a
  más ancho: `OWN` solo sobre lo que vendió su propio proveedor, `PLATFORM`
  también sobre lo que vendió otro proveedor de Solaris, `ANY` también sobre lo
  que el comprador consiguió fuera. Los dos últimos son "acepto equipo ajeno" y
  la pregunta operativa suele ser `scope !== "OWN"`; se separan en una sola cosa
  —de quién es el equipo es un **dato** mientras lo vendiera Solaris (está en
  `order_items` de un pedido pagado) y una promesa del cliente cuando no—, y por
  eso solo `ANY` se puede vender a ciegas. Es del servicio, no del proveedor
  —la misma empresa quiere las dos cosas a la vez—;
  `suppliers.defaultEquipmentScope` solo prefija el formulario y **no se lee en
  ninguna consulta**.
  **installation_offers** dice qué servicio se ofrece junto a qué producto o kit,
  y cruza de proveedor cuando el servicio no es `OWN`. Sin filas ahí, un servicio
  `ANY` se sigue vendiendo solo; los otros dos solo existen pegados a su equipo.
- **orders** — lo que el cliente compró y pagó: un número, un total y **un solo
  pago**, aunque lleve cosas de varios proveedores. No tiene `supplierId`.
- **order_suppliers** — la parte del pedido que le toca a cada proveedor, con su
  `subtotalUsd` guardado y su propio `status` de entrega
  (`PENDING | DELIVERED | CANCELLED`). Es la fila que se liquida y la que puede
  caerse sola sin arrastrar al pedido. `unique(orderId, supplierId)`: un
  proveedor no aparece dos veces en el mismo pedido.
- **order_items** — líneas con **snapshot** de nombre y precio al momento de la
  compra; cuelgan de `order_suppliers` (no de `orders`), así que la línea sabe
  quién la entrega sin repetir la columna. `itemId` es una FK "blanda" a
  `products.id`, `kits.id` o `services.id` según `itemType`.
- **payments** — pago por **Zelle** (MVP) o Suby.fi (futuro), con su propio ciclo
  de verificación manual por el admin. Uno por **orden**, no por proveedor:
  partir el Zelle sería peor para quien compra y peor para conciliar.

> **Pendiente.** Falta la migración **`0005`**: `equipmentScope` y
> `defaultEquipmentScope` no existen aún, así que hoy la instalación la presta
> siempre quien vende (lo impone el filtro de `getInstallationsFor`) y cualquier
> servicio se puede contratar suelto, quiera o no su proveedor. Entra antes que
> el CRUD de servicios de la Etapa 4, que tampoco existe todavía. Está detallada
> en [`PLAN.md`](../PLAN.md) §«Pedidos multi-proveedor y servicios sobre equipo
> ajeno», paso 2.
>
> Y falta una columna que **todavía no toca decidir**: de qué equipo ya comprado
> es un servicio contratado después de la venta. Es la Etapa 9 del plan y depende
> de que existan pedidos pagados, así que se diseña cuando los haya.

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
orders.status            PENDING_PAYMENT → PAYMENT_REPORTED → PAID → COMPLETED
   (el pago, uno)                                              │
                                                           CANCELLED

order_suppliers.status   PENDING → DELIVERED        ← una por proveedor
   (la entrega, N)          └───── CANCELLED
```

`payments.status`: `PENDING → REPORTED → CONFIRMED` (o `REJECTED`). El admin
verifica el Zelle manualmente y confirma, lo que hace avanzar la orden.

Los dos carriles se cruzan en un solo sitio: la orden llega a `COMPLETED` cuando
**todas** sus partes vivas están en `DELIVERED`. Si se cancelan todas, la orden
queda `CANCELLED`. Nada más: el pago es global —se cobra o no se cobra el pedido
entero— y la entrega es de cada proveedor por separado, que es exactamente lo
que el admin coordina y liquida por su lado.

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
  `/admin` y `/account`, pero **no** es la última línea de defensa: cada página
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
