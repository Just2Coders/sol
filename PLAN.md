# Solaris — Plan de desarrollo (Fase 1: hasta compra manual vía Zelle)

Marketplace de paneles solares y kits de energía. Los proveedores se registran por el admin (tú), publican productos y kits, los usuarios ven qué proveedores operan en su zona y compran. El pago en esta fase es manual vía Zelle a una cuenta central; la integración automática (suby.fi) queda para la Fase 2.

## Stack

| Capa | Elección | Notas |
|---|---|---|
| Framework | Next.js 16 (App Router, TypeScript) | Fullstack: UI + Server Actions |
| Estilos | Tailwind CSS + shadcn/ui | Componentes listos para admin y catálogo |
| Base de datos | Neon (Postgres serverless) | Rama `dev` y `prod` separadas |
| ORM | Drizzle ORM | Ligero, migraciones SQL claras (alternativa: Prisma) |
| Auth | Sesión JWT propia (`jose`) + `bcryptjs` | Email/password; cookie httpOnly. Ver `docs/ARCHITECTURE.md` §6 |
| Imágenes | Vercel Blob | Fotos de productos y comprobantes de pago |
| Emails | Resend | Confirmaciones de orden y pago |
| Deploy | Vercel | Conectado al repo desde el día 1 |

## Modelo de datos

```
users          id, name, email, password_hash, role (ADMIN | CUSTOMER), phone, zone_id
zones          id, name, state, parent_id?        ← jerarquía: estado → ciudad/municipio
suppliers      id, name, slug, logo, phone, email, notes, payout_info (datos para
               liquidarles), default_equipment_scope   ← con qué alcance nacen sus servicios
supplier_zones supplier_id, zone_id               ← en qué zonas opera cada proveedor
products       id, supplier_id, name, slug, description, specs (jsonb), price_usd,
               stock, images[], active
kits           id, supplier_id, name, slug, description, price_usd, images[], active
kit_items      kit_id, product_id, quantity       ← un kit = combo de productos del proveedor
service_categories  id, name, slug, description, position   ← paneles · kit completo · cableado
services       id, supplier_id, category_id, name, slug, description,
               pricing (FLAT | PER_UNIT), price_usd, unit_label?, images[], active,
               equipment_scope (OWN | PLATFORM | ANY)  ← sobre qué equipo trabaja
installation_offers service_id, target_type (PRODUCT | KIT), target_id
                                                   ← qué instalación se ofrece con qué item;
                                                     cruza de proveedor si el servicio no es OWN
orders         id, order_number, user_id, zone_id, status, subtotal, total, created_at
order_suppliers id, order_id, supplier_id, subtotal, status (PENDING | DELIVERED | CANCELLED)
                                                   ← la parte del pedido de cada proveedor
order_items    id, order_supplier_id, item_type (PRODUCT | KIT | SERVICE), item_id,
               name_snapshot, price_snapshot, quantity
payments       id, order_id, method (ZELLE | SUBY), status, zelle_reference,
               receipt_url, reported_at, confirmed_at, confirmed_by
```

Decisiones clave:

- **Un pedido, varios proveedores, un solo pago.** El comprador arma lo que necesita —los paneles de uno, las baterías de otro, la instalación de un tercero— y paga **una vez** a la cuenta central. El pedido se parte por dentro, no por fuera: `orders` es lo que el cliente compró y pagó (un número, un total, un Zelle) y `order_suppliers` guarda la parte de cada proveedor, con su subtotal escrito y su propio estado de entrega. Eso deja la liquidación manual igual de trivial que antes —el número que le toca a cada uno ya está guardado, no hay que recalcularlo— y además permite que una parte se caiga (sin stock, el proveedor no puede) sin arrastrar al pedido entero.
  _Lo que **no** se parte es el pago: pedirle al comprador un Zelle por proveedor sería peor para él y peor para conciliar. Un pedido = una transferencia = una fila en `payments`._
- **La instalación es un servicio, no un producto.** Vive en su propia tabla porque no tiene existencias ni entrega, y su precio puede ser cerrado (`FLAT`) o por unidad de obra (`PER_UNIT`: por panel, por metro de cable). Se vende de dos maneras con el mismo modelo: **sola** —es un item más del catálogo, con su ficha— o **añadida a la compra** de un producto o kit, y ahí `installation_offers` dice qué instalación se ofrece con qué item. La puede prestar quien vendió el equipo o un instalador ajeno —eso lo decide cada servicio, ver la decisión siguiente—, y qué instalaciones llegan a cada zona ya lo resuelve `supplier_zones`. Las categorías las administra el admin en una tabla, no son un enum: añadir "mantenimiento" no debería requerir un deploy.
  _No hay servicios "a presupuestar": un item sin precio no puede ser línea de carrito, así que necesitaría su propio flujo solicitud → cotización. Cuando haga falta, es un valor más de `service_pricing` y un módulo nuevo._
- **Cada servicio dice sobre qué equipo trabaja** (`services.equipment_scope`). Instalación, mantenimiento o lo que se invente después: la pregunta siempre es de quién es el equipo sobre el que se trabaja, y tiene tres respuestas, cada una más ancha que la anterior.

  | valor | trabaja sobre | ¿la plataforma sabe qué equipo es? |
  |---|---|---|
  | `OWN` | solo lo que vendió su propio proveedor | sí, por el historial de pedidos |
  | `PLATFORM` | también lo que vendió **otro** proveedor de Solaris | sí, por el historial de pedidos |
  | `ANY` | también lo que el comprador consiguió fuera de Solaris | no, se lo cuenta el cliente |

  `PLATFORM` y `ANY` son los dos "sí acepto equipo ajeno" y casi siempre se tratan juntos —la pregunta operativa es `scope !== "OWN"`—. Se separan en un punto y solo uno: **de quién es el equipo es un dato, no una promesa**. Si lo vendió Solaris está en `order_items` de un pedido pagado, con su proveedor al lado, y se consulta; si viene de fuera, no hay nada que consultar. Por eso `ANY` es el único que puede venderse a ciegas desde su propia ficha.
- **El alcance es del servicio, no del proveedor.** En este negocio la misma empresa quiere las dos cosas a la vez: "instalación de kit completo" solo sobre el suyo —responde por la garantía del conjunto— y "limpieza de paneles" sobre el de cualquiera. El proveedor sí fija con qué valor **nacen** sus servicios (`suppliers.default_equipment_scope`), que es comodidad del formulario y nada más: el alcance siempre queda escrito en la fila del servicio, y **ninguna consulta lee el default del proveedor** para resolver qué se ofrece.
  _El default es `OWN` en los dos sitios. Abrirse a equipo ajeno es una decisión con consecuencias —quien instala responde por lo que no vendió— y esas se toman a mano, no por omisión. Un **instalador puro** (proveedor sin productos ni kits) es el caso contrario: con todos sus servicios en `OWN` no podría vender ninguno, así que el formulario se lo avisa._
- **La propiedad del equipo se consulta, no se supone.** Un servicio se puede contratar sobre equipo que el comprador ya tiene, y "ya tiene" significa una línea de `order_items` en un pedido suyo pagado. De ahí sale quién se lo vendió, y de ahí sale si un `OWN` le sirve. Es la mitad del requisito que hoy **no existe de ninguna forma**: el catálogo solo sabe vender servicios junto al equipo que se compra en el mismo pedido.
- **Snapshots en `order_items`**: se copia nombre y precio al momento de la compra, para que cambios posteriores de precio no alteren órdenes viejas. El subtotal de cada `order_suppliers` es un snapshot más: es lo que se le liquida a ese proveedor, no una suma que se recalcula en cada lectura.
- **Estados de orden**: `PENDING_PAYMENT → PAYMENT_REPORTED → PAID → COMPLETED` (+ `CANCELLED`). El pago es del pedido entero; la **entrega** es de cada proveedor (`order_suppliers.status`: `PENDING → DELIVERED`, o `CANCELLED` si esa parte se cae). El pedido llega a `COMPLETED` cuando todas sus partes vivas están entregadas.
- **Estados de pago**: `PENDING → REPORTED → CONFIRMED / REJECTED`.
- `payments.method` ya contempla `SUBY` para que la Fase 2 no requiera migración.

## Flujo de compra Zelle (el corazón de la Fase 1)

1. Usuario elige su zona → ve proveedores y catálogo disponibles ahí.
2. Arma el carrito (productos, kits y/o instalación, de **uno o varios proveedores**) → checkout.
3. Se crea la orden en `PENDING_PAYMENT` —con una fila de `order_suppliers` por
   proveedor del carrito— y se muestran las instrucciones Zelle (email/teléfono de
   la cuenta central, monto exacto **total**, número de orden como concepto).
4. Usuario reporta el pago: número de referencia Zelle + captura del comprobante (opcional).
   La orden pasa a `PAYMENT_REPORTED`.
5. Tú verificas el Zelle en tu banco y desde el panel admin confirmas o rechazas.
   Al confirmar: orden → `PAID`, email de confirmación al cliente.
6. Coordinas la entrega con **cada** proveedor del pedido, marcas su parte como
   entregada y le liquidas manualmente (fuera del sistema en esta fase; el
   subtotal de su fila en `order_suppliers` ya dice cuánto le toca).

## Etapas de trabajo

### Etapa 0 — Fundaciones (½ día) ✅
- [x] `create-next-app` con TypeScript, Tailwind, App Router; instalar shadcn/ui.
- [x] Repo en GitHub + proyecto en Vercel conectado (deploy automático desde el inicio).
- [x] Crear proyecto en Neon con ramas `dev` y `prod`; variables de entorno en `.env.local` y Vercel.
- [x] Instalar Drizzle + `drizzle-kit`, configurar conexión y primera migración de prueba.

### Etapa 1 — Esquema de datos (1 día) ✅
- [x] Definir todas las tablas del modelo de arriba en Drizzle.
- [x] Migraciones aplicadas en Neon.
- [x] Script de seed: zonas iniciales (estados/ciudades donde vas a arrancar), un admin, un proveedor y productos de prueba.

### Etapa 2 — Autenticación (1 día) ✅
- [x] Sesión JWT propia (`jose`) con credenciales (email + password) — no se usó Auth.js.
- [x] Registro de clientes con selección de zona.
- [x] Middleware (`proxy.ts`): `/admin/**` solo para rol `ADMIN`, `/account/**` requiere sesión.
- [x] El catálogo es público; el login solo se exige al hacer checkout: el
      middleware solo protege `/admin` y `/account`, y el flujo `?from=` devuelve
      al usuario a la página de origen tras login o registro.

### Etapa 3 — Panel admin: proveedores y zonas (1–2 días) ✅
- [x] CRUD de zonas (jerarquía estado → ciudad).
- [x] CRUD de proveedores: datos de contacto, logo (URL; subida a Blob en Etapa 4),
      notas, info de liquidación.
- [x] Asignación de zonas de cobertura a cada proveedor.

### Etapa 4 — Panel admin: productos, kits y servicios (2 días)
- [x] CRUD de productos por proveedor: precio, stock, specs, activar/desactivar.
- [x] Subida de imágenes a Vercel Blob (múltiples fotos por producto).
      *Los bytes van del navegador a Blob (`@vercel/blob/client`);
      `app/api/blob/upload/route.ts` firma el token y es la puerta de rol.
      El logo del proveedor sigue registrándose por URL.*
- [x] CRUD de kits: seleccionar productos del proveedor + cantidades, precio propio del kit.
- [x] Validación: un kit solo puede contener productos de su mismo proveedor.
> Nada de esta etapa existe todavía en el admin: no hay `app/admin/services`, ni
> `app/actions/services.ts`, ni `lib/services/`. Las tablas sí existen y el seed
> las llena, que es de donde saca datos la ficha pública. **El alcance del
> servicio (`equipment_scope`) ya está en el schema, a propósito antes que estos
> formularios** — mismo razonamiento que con `orders`: se construyen una sola
> vez, ya sabiendo lo que tienen que preguntar. Ver «Pedidos multi-proveedor y
> servicios sobre equipo ajeno» más abajo.

- [ ] CRUD de categorías de servicio (nombre, orden en que se listan).
- [ ] CRUD de servicios por proveedor: categoría, precio `FLAT` o `PER_UNIT` con
      su unidad, **alcance** (`OWN` / `PLATFORM` / `ANY`, prefijado con el default
      del proveedor), activar/desactivar.
- [ ] Aviso en el formulario del servicio: si el proveedor no tiene productos ni
      kits, un servicio `OWN` no se podrá vender nunca. No se prohíbe —puede
      estar a punto de cargar su catálogo—, se avisa.
- [ ] Asignar a qué productos/kits se ofrece cada servicio (`installation_offers`).
      La validación ya no es "solo items del mismo proveedor": un servicio `OWN`
      solo puede apuntar a items de su proveedor; uno `PLATFORM` o `ANY`, a los de
      cualquiera.

### Etapa 5 — Catálogo público (2–3 días)
- [ ] Landing con propuesta de valor y selector de zona (persistido en cookie).
      *La persistencia ya existe (`lib/zones/preference.ts` + la Action
      `selectZone` en `app/actions/preferences.ts`); falta que el selector del
      mapa la use.*
- [ ] Listado de proveedores que operan en la zona elegida.
      *La resolución zona → proveedores ya está en `lib/catalog/queries.ts` y
      alimenta el filtro del catálogo; queda la página propia de proveedores.*
- [x] Catálogo filtrado por zona, con filtros por proveedor, tipo (producto/kit) y rango de precio.
- [x] Página de detalle de producto (galería, specs, proveedor) y de kit (qué incluye).
- [x] Ficha del servicio en `/catalog/services/[slug]`: la instalación contratada
      sola, con cómo se cobra (fijo o por unidad de obra).
- [ ] Los servicios entran al **listado**: tercera rama de la unión y contador
      propio en el selector (Todo · Kits · Productos · Instalación). Hoy la ficha
      existe y se llega a ella desde el equipo, pero no sale en la grilla; por eso
      `CATALOG_TYPES` (el filtro) sigue teniendo dos valores y `PURCHASABLE_TYPES`
      (lo que cabe en el carrito) tiene tres. **Solo entran los `ANY`**: son los
      únicos que se contratan sin que la plataforma sepa sobre qué equipo van.
- [ ] La ficha de un servicio `OWN` o `PLATFORM` deja de vender a ciegas. La
      página sigue existiendo —la enlazan las fichas de los equipos—, pero el
      bloque de compra solo aparece si el visitante trae el equipo: uno que
      encaje en el carrito, o uno suyo de un pedido pagado (cuando exista «Mis
      equipos», Etapa 9). Si no lo trae, la ficha explica sobre qué equipo
      trabaja ese servicio y adónde ir a buscarlo.
      *Es lo único incoherente que hay hoy: un servicio se vende suelto a
      cualquiera aunque su proveedor solo quiera trabajar sobre lo suyo. No es
      una decisión que haya que tomar aparte — sale del propio alcance.*
- [x] SEO básico: metadata, slugs limpios, Open Graph.

### Etapa 6 — Carrito y checkout (2 días)
- [x] Carrito client-side (Zustand) persistido en localStorage.
      *`lib/cart/lines.ts` (el dato puro, importable desde servidor) +
      `lib/cart/store.ts` (el store con `persist`). La UI es el botón de la
      ficha y el panel lateral del header.*
- [x] **Carrito multi-proveedor**: se puede mezclar, y el panel se lee agrupado
      por quién entrega cada cosa, con su subtotal por grupo y el total abajo.
      *`cartGroups()` en `lib/cart/lines.ts` hace el reparto; el panel solo lo
      dibuja cuando hay más de un proveedor. Ver «Pedidos multi-proveedor y
      servicios sobre equipo ajeno», paso 1.*
- [ ] Aviso de cobertura en el panel: si hay zona elegida, el grupo cuyo proveedor
      no llega hasta ahí se marca ahí mismo, no en el checkout. El panel es
      cliente y no conoce la cookie de zona, así que los slugs que sí cubren la
      zona bajan desde el layout (es la consulta que el catálogo ya hace).
- [x] Bloque "añadir instalación" en la ficha de producto/kit (lo que diga
      `installation_offers`) y línea de servicio en el carrito: sin stock, y en
      `PER_UNIT` la cantidad son unidades de obra, no piezas.
- [ ] Checkout: resumen **agrupado por proveedor**, datos de contacto/entrega,
      confirmación → crea la orden `PENDING_PAYMENT` con una fila de
      `order_suppliers` por grupo. Si la orden lleva instalación, la dirección de
      entrega es la de la obra; la fecha se coordina a mano en esta fase.
- [ ] Revalidación del carrito en el servidor, grupo a grupo: proveedor activo,
      item activo y de ese proveedor, precio releído, stock suficiente y
      **cobertura de la zona de entrega**. Si un grupo falla se para el checkout
      y se dice cuál — nunca se descarta una línea en silencio.
- [ ] Y una validación que no es por grupo sino entre grupos: un servicio que no
      sea `ANY` tiene que llegar con su equipo. En el carrito eso es un item del
      proveedor que toque —el suyo si es `OWN`, el de cualquiera si es
      `PLATFORM`— y sale de los propios grupos, sin ir a la base. Con «Mis
      equipos» (Etapa 9) el equipo podrá venir además de un pedido anterior, y
      entonces sí hay que consultarlo.
- [ ] La zona de entrega deja de ser opcional cuando hay algo que entregar:
      `orders.zone_id` es lo que se compara contra `supplier_zones`, así que sin
      ella no hay nada que validar. Se propone la de la cookie o la del usuario,
      y se puede cambiar en el formulario.
- [ ] Un servicio `ANY` contratado solo es trabajo sobre equipo que el cliente ya
      tiene y la plataforma no conoce: el checkout le pide describirlo, y eso va
      a `orders.notes` para que el instalador sepa a qué va.
- [ ] Página "Mis órdenes" en la cuenta del usuario, con estado en tiempo real:
      el del pago para el pedido y el de entrega para cada proveedor.

### Etapa 7 — Pago manual Zelle (2 días) ★ meta de la fase
- [ ] Página de instrucciones de pago post-checkout: datos Zelle de la cuenta central, monto, número de orden como referencia.
- [ ] Formulario de reporte de pago: referencia Zelle + subida de comprobante → `PAYMENT_REPORTED`.
- [ ] Panel admin de pagos: cola de pagos reportados, ver comprobante, confirmar o rechazar (rechazo con motivo, el usuario puede re-reportar).
- [ ] Emails con Resend: orden creada (con instrucciones), pago recibido/en revisión, pago confirmado, pago rechazado.
- [ ] Vista admin de órdenes: el pedido con sus partes, y marcar entregada la de
      cada proveedor.
- [ ] Vista de liquidaciones: totales por proveedor, que ahora es un `group by`
      sobre `order_suppliers` de las órdenes pagadas (base para tus
      liquidaciones manuales).

### Etapa 8 — Pulido y salida a producción (1–2 días)
- [ ] Responsive completo (la mayoría comprará desde el móvil).
- [ ] Estados vacíos, loading y manejo de errores en todos los flujos.
- [ ] Dominio propio en Vercel, rama `prod` de Neon, variables de producción.
- [ ] Prueba end-to-end real: registrar usuario → comprar → reportar Zelle → confirmar como admin → recibir email.

**Total estimado: ~2 a 3 semanas** de trabajo enfocado hasta aquí.

### Etapa 9 — Servicio post-venta sobre equipo ya comprado (2 días)

La otra mitad del requisito de servicios: hasta aquí un servicio solo se contrata
**junto al equipo que se compra en el mismo pedido**, y lo que se quiere es que
también se pueda contratar sobre lo que el comprador ya tiene. Va después de la
salida a producción por un motivo de calendario, no de diseño: **no puede existir
antes de que haya pedidos pagados**, y hoy no hay ninguno.

- [ ] "Mis equipos" en `/account`: lo que el usuario ha comprado, leído de las
      líneas `PRODUCT`/`KIT` de sus pedidos pagados, con quién se lo vendió. Es la
      fuente de verdad de qué equipo tiene — un dato, no una promesa.
- [ ] Desde cada equipo, "contratar servicio": los servicios que ese equipo
      admite. Salen de cruzar tres cosas — el alcance del servicio contra quién
      vendió el equipo (`OWN` solo su vendedor; `PLATFORM` cualquiera), la
      cobertura del proveedor del servicio contra la zona del usuario, y que el
      servicio siga activo.
- [ ] La línea del servicio recuerda **para qué equipo** es: una referencia blanda
      a la línea de pedido del equipo, para que el instalador sepa a qué va y para
      que se pueda enseñar en "Mis equipos". Es la columna que hace falta añadir a
      `order_items`, y por eso conviene decidirla aquí y no antes.
- [ ] El bloque de compra de la ficha de un servicio `OWN`/`PLATFORM` aprende esta
      segunda puerta: ya no solo mira el carrito, también los equipos del usuario.

## Pedidos multi-proveedor y servicios sobre equipo ajeno (cambio en curso)

Las decisiones ya están tomadas arriba; esto es lo que hay que tocar para que el
código las cumpla, **en este orden**. Los dos cambios son de schema y los dos se
hacen ahora por el mismo motivo: la parte del código que los usaría todavía no
existe.

- **`orders` no tiene encima ni una lectura ni una escritura.** El checkout es
  Etapa 6 y aún no está escrito, así que cambiar la forma de la tabla no rompe
  ningún flujo. Hacerlo después sería migrar órdenes reales.
- **Los servicios no tienen panel admin.** Las tablas existen y el seed las
  llena —de ahí saca datos la ficha pública—, pero no hay `app/admin/services`
  ni `app/actions/services.ts`. La columna del alcance entra antes de que se
  escriba ese formulario, no después: así se construye una vez y ya pregunta lo
  que tiene que preguntar.

El orden importa en un punto: el paso 2 permite que un instalador ajeno se
ofrezca junto al equipo de otro, y eso **solo tiene sentido si un pedido puede
llevar dos proveedores**. El paso 1 va primero.

### Paso 1 — El pedido deja de ser de un proveedor

✅ **Hecho** en `feature/multi-supplier-orders`.

**Modelo** (`lib/db/schema.ts` + migraciones `0003` y `0004`). Son dos y no una
por una limitación de la herramienta, no del diseño: `drizzle-kit generate` para
a preguntar si un `DROP` + `ADD` en la misma tabla es en realidad un `RENAME`, y
eso no se puede contestar sin terminal interactiva. Partido en dos, la pregunta
no aparece y **cada estado intermedio es válido**: la `0003` añade
`order_supplier_id` conviviendo con la vieja, la `0004` retira `order_id`.
_(La `0003` añade una columna `NOT NULL` sin default: solo funciona porque
`order_items` está vacía, que es justo la razón de hacer esto ahora.)_

- `orders.supplierId` **se elimina**. El pedido ya no pertenece a un proveedor.
- Nueva tabla `order_suppliers`: `id`, `orderId`, `supplierId`, `subtotalUsd`,
  `status` (nuevo enum `fulfillment_status`: `PENDING | DELIVERED | CANCELLED`),
  `notes`, timestamps. `unique(orderId, supplierId)` —un proveedor no aparece dos
  veces en el mismo pedido— e índice por `supplierId`, que es por donde entran la
  liquidación y la guarda de borrado.
- `order_items.orderId` pasa a ser `order_supplier_id`: una línea cuelga de la
  parte de su proveedor, no del pedido. Con índice propio, que hoy le falta
  incluso a `orderId` (Postgres no indexa una FK por serlo).
- `payments` **no cambia**: sigue habiendo uno por orden.

**Código que ya existe y hay que tocar:**

- `lib/cart/lines.ts` — `cartSupplier()` (que asume "mira la primera línea, el
  store no deja entrar otra") se cambia por `cartGroups()`: agrupa por
  `supplierSlug` conservando el orden de llegada y devuelve el subtotal de cada
  grupo. La forma de `CartLine` no cambia, así que un carrito ya guardado en
  `localStorage` sigue siendo válido y no hay que subir la `version` del `persist`.
- `lib/cart/store.ts` — `add()` deja de rechazar; desaparecen el caso
  `other-supplier` de `AddToCartResult` y el campo `conflict` de
  `useCartItemState`.
- `components/cart/cart-panel.tsx` — el panel se pinta agrupado: un encabezado
  por proveedor con su subtotal, y el total del pedido en el pie. La descripción
  de la cabecera deja de ser "lo entrega X".
- `components/catalog/detail/purchase-block.tsx`,
  `components/cart/add-to-cart-button.tsx` y
  `components/cart/add-installation-button.tsx` — fuera el aviso "tu carrito es
  de X" con su atajo de vaciar, y fuera el bloqueo del botón.
- `app/actions/suppliers.ts` — la guarda de borrado consulta hoy
  `orders.supplierId`; pasa a consultar `order_suppliers.supplierId`. **Es el
  único lugar del código que rompe al cambiar el schema.**
- Comentarios que justifican cosas con la regla vieja y ahora mienten:
  `lib/catalog/queries.ts` (`getSupplierRelated`, y el "cinturón" de
  `getInstallationsFor`), `components/catalog/detail/supplier-related.tsx` y
  `components/catalog/catalog-installations.tsx`. Lo que sugiere la tira de
  "más de este proveedor" no cambia —sigue siendo lo relevante—, pero el motivo
  ya no es que sea lo único que cabe en el carrito.

### Paso 2 — El servicio dice sobre qué equipo trabaja

✅ **Hecho** en `feature/multi-supplier-orders`. Queda **inerte hasta la Etapa 4**:
no hay formulario que cree una oferta cruzada ni que ponga un servicio en
`PLATFORM`/`ANY`, así que hoy la consulta admite lo que antes prohibía pero no
existe todavía ningún dato que lo ejerza. Que es justo el orden que se buscaba —
la pregunta ya está en el modelo cuando se escriba el formulario.

**Modelo** (migración `0005`):

- Nuevo enum `equipment_scope`: `OWN | PLATFORM | ANY`, de más estrecho a más
  ancho (ver la decisión de arriba).
- `services.equipmentScope` — `notNull`, default `OWN`.
- `suppliers.defaultEquipmentScope` — `notNull`, default `OWN`. **Solo prefija el
  formulario.** Ninguna consulta lo lee para decidir qué se ofrece: el valor vivo
  siempre es el de la fila del servicio. Si mañana el proveedor cambia su default,
  los servicios que ya existen no se mueven — que es justo lo que se quiere.
- `lib/db/seed.ts` — los dos servicios sembrados ya son un ejemplo de cada
  extremo y conviene que lo digan: "Instalación de kit completo" (incluye revisión
  a los 30 días, responde por el conjunto) se queda `OWN`; "Instalación de
  paneles" —cuya descripción ya dice *"paneles **ya comprados**, sobre techo o
  estructura existente"*— pasa a `ANY`. Sin esto el seed contradice a su propia
  ficha.

**Las tres consecuencias, y dónde se escriben:**

1. **La oferta puede cruzar de proveedor.** En `getInstallationsFor`, el filtro
   `eq(services.supplierId, owner.supplierId)` pasa a
   `or(eq(services.supplierId, owner.supplierId), ne(services.equipmentScope, "OWN"))`.
   Aquí `PLATFORM` y `ANY` valen lo mismo: el equipo es de la plataforma y se
   sabe de quién. La misma regla, del lado de escritura, es la validación del
   formulario de ofertas (Etapa 4).
2. **Vender a ciegas es solo de `ANY`.** Es lo único que separa a `ANY` de
   `PLATFORM`, y decide qué servicios entran al listado y qué ficha lleva bloque
   de compra sin más (Etapa 5).
3. **Lo que no sea `ANY` necesita traer su equipo**: en el carrito, un item del
   proveedor que toque (Etapa 6); más adelante, también uno de un pedido pagado
   anterior (Etapa 9).

**Bug latente que hay que arreglar en el mismo paso:**
`components/catalog/catalog-installations.tsx` arma la línea del carrito con el
proveedor **del equipo** (`supplierSlug: supplier.slug`), no con el del servicio.
Hoy da igual porque la consulta garantiza que son el mismo; en cuanto un
instalador ajeno aparezca en esa lista, la línea se guardaría bajo el proveedor
equivocado — y con el paso 1 eso significa agruparla mal, cobrarla en el grupo de
otro y **liquidarle a quien no trabajó**. El tipo `CatalogInstallation` tiene que
traer su propio proveedor y la línea usar ese. De paso, el texto "La instala X,
el mismo que entrega el equipo" deja de ser cierto y baja a cada fila.

### Paso 3 — Cobertura de zona, en tres capas

Es el riesgo que abren los dos pasos anteriores: el carrito sobrevive a un cambio
de zona, y ahora puede llevar varios proveedores —uno de ellos, quizá, un
instalador que ni siquiera vende en la zona—. Antes el problema era todo o nada;
ahora es parcial, y por eso se ataca en los tres sitios donde se puede:

1. **Prevención, en la ficha.** `getInstallationsFor` filtra por la zona del
   visitante **cuando el instalador no es quien vende** — si es el mismo, la
   cobertura ya se dio por buena al llegar hasta ahí. Sin zona elegida no se
   filtra nada: se enseña de quién es cada instalación y hasta dónde llega, que
   es lo que el pie de la ficha ya hace con el vendedor.
2. **Aviso, en el panel del carrito.** El grupo que no llega a la zona elegida se
   marca ahí, mientras todavía se puede cambiar (Etapa 6).
3. **Puerta, en el checkout.** La comprobación de verdad, contra
   `supplier_zones`, grupo a grupo y con mensaje por grupo (Etapa 6). Las dos
   capas de arriba son comodidad; esta es la que no se puede saltar.

### Paso 4 — El equipo que ya se compró

Es la **Etapa 9**, y no se puede adelantar por mucho que se quiera: leer qué
equipo tiene un comprador es leer sus pedidos pagados, y no habrá ninguno hasta
que el checkout y el flujo Zelle estén vivos. Lo que sí se decide en el paso 2 es
que el alcance ya distinga `OWN` de `PLATFORM`, para que cuando llegue ese
momento la pregunta ya esté escrita en el modelo y no haya que migrar nada.

### Lo que NO cambia

Un kit sigue siendo de un solo proveedor (`kit_items`). El catálogo sigue
filtrando por zona igual que hoy. Y el pago sigue siendo uno por pedido: nada de
esto parte el Zelle.

## Fase 2 (fuera de alcance por ahora)
- **Agendar la instalación**: fecha y ventana horaria, con sus estados de orden
  (`SCHEDULED` → `INSTALLED`) en una tabla `order_installations` aparte. En Fase 1
  se coordina por teléfono, igual que la verificación del Zelle.
- **Servicios a presupuestar** (`pricing = QUOTE`): solicitud del cliente →
  cotización del admin → orden. No cabe en el carrito, es un flujo propio.
- Integración de pago automático con suby.fi (todo a la cuenta central), reutilizando `payments.method = SUBY`.
- Liquidaciones a proveedores registradas dentro del sistema: son columnas de
  estado sobre `order_suppliers` (pagada, cuándo, referencia), no una tabla
  nueva — la fila con el monto que le toca a cada uno ya existe desde la Fase 1.
- Portal para que los proveedores gestionen sus propios productos: cada uno vería
  **sus** `order_suppliers`, que es justo el recorte que esa fila define.
- Notificaciones por WhatsApp.
