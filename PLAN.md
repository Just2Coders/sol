# Solaris — Plan de desarrollo (Fase 1: hasta compra manual vía Zelle)

Marketplace de paneles solares y kits de energía. Los proveedores se registran por el admin (tú), publican productos y kits, los usuarios ven qué proveedores operan en su zona y compran.

**Sobre el pago:** los medios principales van a ser **QvaPay** y **suby.fi**, y ninguno de los dos está disponible todavía —faltan las integraciones y los permisos—, así que quedan para una etapa posterior. El Zelle manual a una cuenta central **no es el destino, es el puente**: es lo que permite cobrar de verdad mientras tanto, y por eso es la meta de la Fase 1. El modelo de pagos se diseña sabiendo que van a entrar los tres, para que llegar a ellos no pida migración.

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
users          id, name, email, password_hash, role (ADMIN | SUPPLIER | CUSTOMER),
               phone, zone_id
zones          id, name, state, parent_id?        ← jerarquía: estado → ciudad/municipio
suppliers      id, name, slug, logo, phone, email, notes, payout_info (datos para
               liquidarles), default_equipment_scope,  ← con qué alcance nacen sus servicios
               reservation_hold_hours?            ← cuánto aguanta reservado lo suyo (null = el
                                                    default de la plataforma, 72 h)
supplier_zones supplier_id, zone_id               ← en qué zonas opera cada proveedor
supplier_users supplier_id, user_id               ← quién puede gestionar en nombre de quién
impersonation_sessions  id, actor_user_id, target_user_id, reason, started_at,
                        ended_at, expires_at      ← el admin actuando como otro, con motivo
products       id, supplier_id, name, slug, description, specs (jsonb), price_usd,
               stock, reserved, images[], active   ← vendible = stock − reserved
kits           id, supplier_id, name, slug, description, price_usd, images[], active
kit_items      kit_id, product_id, quantity       ← un kit = combo de productos del proveedor
service_categories  id, name, slug, description, position   ← paneles · kit completo · cableado
services       id, supplier_id, category_id, name, slug, description,
               pricing (FLAT | PER_UNIT), price_usd, unit_label?, images[], active,
               equipment_scope (OWN | PLATFORM | ANY)  ← sobre qué equipo trabaja
installation_offers service_id, target_type (PRODUCT | KIT), target_id
                                                   ← qué instalación se ofrece con qué item;
                                                     cruza de proveedor si el servicio no es OWN
orders         id, order_number, user_id, zone_id, status, subtotal, total,
                                                   ← `total` es lo que se pidió: inmutable.
                                                     Lo que se paga hoy se suma de las partes
                                                     vivas; no se guarda ni se reescribe
               acknowledged_total,                 ← la última cifra que el comprador aceptó
               expires_at,                         ← la más temprana de sus reservas vivas;
                                                     al llegar cae esa parte, no el pedido
               created_at
order_suppliers id, order_id, supplier_id, subtotal, confirmation_due_at,
                confirmed_at, resolved_at, decline_reason,
                status (PENDING | CONFIRMED | DELIVERED |
                        DECLINED | EXPIRED | CANCELLED)
                                                   ← la parte del pedido de cada proveedor:
                                                     la acepta, la entrega y se liquida sola.
                                                     Se cae de tres formas y cada una tiene su
                                                     actor: el proveedor, el reloj, una persona.
                                                     En `EXPIRED`, `confirmed_at` distingue
                                                     "no contestó" de "aceptó y se le venció"
order_items    id, order_supplier_id, item_type (PRODUCT | KIT | SERVICE), item_id,
               name_snapshot, price_snapshot, quantity, confirmed_quantity?
                                                   ← `quantity` es lo que se pidió y no cambia;
                                                     `confirmed_quantity` lo que el proveedor
                                                     sí puede (null mientras no conteste)
payments       id, order_id, method (ZELLE | QVAPAY | SUBY), status, reference,
               receipt_url, reported_at, confirmed_at, confirmed_by
stock_movements     id, product_id, delta, reason (OPENING | RESTOCK | SALE | RELEASE |
                    ADJUSTMENT | LOSS | RETURN), order_supplier_id?, note,
                    actor_user_id, on_behalf_of_supplier_id, occurred_at
                                                   ← el porqué de cada cambio de saldo
stock_reservations  id, order_supplier_id, product_id, quantity, expires_at,
                    status (HELD | CONSUMED | RELEASED)
                                                   ← lo comprometido y todavía sin cobrar;
                                                     `expires_at` es absoluto y se escribe una
                                                     vez, como el snapshot de precio
restocks            id, product_id, quantity, eta_from, eta_to, note, resolved_at,
                    status (ANNOUNCED | ARRIVED | CANCELLED | EXPIRED)
                                                   ← la reposición prometida, con ventana
stock_alerts        id, product_id, user_id, created_at, notified_at
                                                   ← "avísame cuando vuelva"
price_schedules     id, target_type (PRODUCT | KIT | SERVICE), target_id, price_usd,
                    starts_at, note                ← el precio como línea de tiempo
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
- **Lo que existe y lo que se promete no comparten tabla.** El stock actual es un
  hecho verificable —se cuenta en el almacén, se descuenta al vender, tiene que ser
  transaccional—; la reposición futura es una intención con fecha borrosa. Juntas,
  cada lectura de "¿puedo vender esto?" tendría que filtrar por fecha y un proveedor
  optimista contaminaría lo vendible. Por eso el saldo vive en `products.stock` y la
  promesa en `restocks`, y **anunciar no es vender**: en la Fase 1 nada que no haya
  llegado entra al carrito (ver `stock_alerts`, y la pre-orden en la Fase 2).
- **El saldo se queda; el porqué se va a un libro mayor.** `products.stock` sigue
  siendo la columna que el catálogo lee en cada tarjeta, y `stock_movements` —solo
  añadir, nunca editar— guarda el delta y el motivo de cada cambio. El histórico
  sale gratis, y la doble contabilidad es segura porque su invariante se comprueba
  con una query: `products.stock = sum(delta)`. Lo mismo con `products.reserved` y
  las reservas `HELD`.
- **La ventana *es* la incertidumbre.** Una reposición no lleva fecha, lleva
  `eta_from`/`eta_to`. Estrecha significa "seguro", ancha significa "creo que sí", y
  la UI no puede renderizarla como promesa aunque quiera: "entre el 10 y el 15" no
  se lee igual que "el 12". Y caduca al leerse (`eta_to >= today`), porque un
  anuncio rancio de hace un mes hace más daño que no tener ninguno.
  _`restocks.quantity` es lo estimado y el movimiento `RESTOCK` de la llegada es lo
  real: la distancia entre ambos, acumulada, dice qué proveedor cumple lo que anuncia._
- **El precio es una línea de tiempo con una proyección cacheada.** `price_schedules`
  es la verdad —filas pasadas: histórico; futuras: anunciado; el efectivo es el de
  mayor `starts_at <= now()`— y `price_usd` de cada tabla se queda como caché de ese
  efectivo. No es redundancia por pereza: el listado ordena y filtra por rango sobre
  esa columna indexada, y resolverlo con un lateral join por fila mataría el índice
  en la consulta principal del catálogo.
- **El catálogo puede ir desfasado unos minutos; el checkout no.** De ahí sale todo
  el mecanismo: un cron promueve los precios vencidos y libera las reservas
  caducadas, y aun así el checkout **relee el precio efectivo del schedule**, nunca
  la caché. Si el cron llega tarde, el listado enseña un precio viejo un rato; nadie
  cobra mal.
- **Reservar con caducidad no es opcional con pago manual.** Entre "pedido creado" y
  "pago confirmado" pasan días. Si el stock baja al confirmar, dos personas compran
  el último panel y a una hay que devolverle; si baja al hacer checkout, un carrito
  abandonado mata esa unidad para siempre. La reserva cuelga de `order_suppliers`,
  así que cancelar la parte de un proveedor devuelve exactamente su stock y el de
  nadie más.
- **El admin puede actuar como cualquier usuario, y eso es una sola pieza.** Mucho
  de este negocio se cierra fuera de la aplicación —por teléfono o WhatsApp— y
  después alguien tiene que dejarlo escrito dentro: el proveedor que confirma de
  palabra, el comprador que dicta su pedido. El admin elige a un usuario de una
  lista y opera como él. La sesión lleva `userId` (**quién eres de verdad, nunca
  cambia**) y `impersonatedUserId` (opcional); todo lo que la app lee y escribe usa
  el usuario **efectivo**, que es el suplantado si lo hay y tú si no.
  _`actingSupplierId` no es una segunda pieza: es una derivada del efectivo contra
  `supplier_users`, y por eso el proveedor en su portal y el admin en su nombre
  recorren exactamente el mismo código._
- **Toda escritura firma con el real, no con el efectivo.** El libro mayor de stock,
  el pedido creado, la parte confirmada: cada uno guarda quién lo hizo de verdad
  junto a en nombre de quién. Así el histórico dice "el admin confirmó la parte de
  Solar Caribe" y nunca miente, que es justo lo que se pierde si suplantar fuera
  cambiar de sesión.
- **Suplantar tiene cosas prohibidas, y son las que protegen al suplantado.** No se
  puede cambiar su contraseña ni su email (sería robarle la cuenta), no se puede
  borrar la cuenta, no se puede encadenar otra suplantación, y **no se puede
  confirmar un pago**: si el mismo actor crea el pedido y da el cobro por bueno, no
  queda nadie mirando. La sesión suplantada caduca sola, lleva un banner que no se
  puede quitar y queda registrada en `impersonation_sessions` con el motivo — "lo
  acordamos por WhatsApp" es un dato del negocio, no una excusa.
- **Snapshots en `order_items`**: se copia nombre y precio al momento de la compra, para que cambios posteriores de precio no alteren órdenes viejas. El subtotal de cada `order_suppliers` es un snapshot más: es lo que se le liquida a ese proveedor, no una suma que se recalcula en cada lectura.
- **Tres ejes, no uno.** El **pago** es del pedido entero; la **aceptación** y la
  **entrega** son de cada proveedor. Los tres avanzan por su cuenta y ninguno vive
  en la columna del otro: `orders.status` es
  `PENDING_PAYMENT → PAYMENT_REPORTED → PAID → COMPLETED` (+ `CANCELLED`) y habla
  solo de dinero; `order_suppliers.status` es `PENDING → CONFIRMED → DELIVERED`
  (+ `DECLINED` si el proveedor dice que no, `CANCELLED` si se cae por cualquier
  otro motivo) y habla solo de esa parte. El pedido llega a `COMPLETED` cuando
  todas sus partes vivas están entregadas.
  _Meter la aceptación en `orders.status` volvería a juntar lo que costó separar:
  un pedido no está "medio aceptado", son sus partes las que lo están._
- **Aceptar no es entregar, y la orden aceptada es una derivada.** El proveedor
  confirma que tiene lo suyo y que puede llevarlo; entregarlo es más tarde. "La
  orden está aceptada" no se guarda en ninguna columna — se lee de las partes,
  igual que `COMPLETED`. Y **la puerta ya existe**: es el admin confirmando el
  Zelle. Un pedido no pasa a `PAID` si alguna parte viva sigue sin confirmar, así
  que no hace falta un estado nuevo, hace falta una comprobación en la Action que
  ya vamos a escribir.
- **El proveedor callado no congela el pedido.** Sin plazo, uno que no contesta
  deja la orden en el limbo y el stock reservado de rehén. Por eso la parte nace
  con `confirmation_due_at` y la barre el mismo cron que las reservas: al vencer
  **cae la parte, nunca el pedido** — el resto sigue su curso. Los que sí
  confirmaron pueden ir preparando lo suyo sin esperar al último.
- **Se confirma la parte, no la línea.** La parte es lo que tiene subtotal y lo que
  se liquida; media parte aceptada no significa nada. Y con el stock ya reservado
  en el checkout, que un proveedor descubra que no tiene es la excepción y no la
  regla —es un descuadre físico, no una sorpresa de disponibilidad—: para eso está
  ajustar la cantidad de la línea o rechazar la parte entera.
- **Si una parte se cae, decide el comprador — no el sistema.** Que un proveedor
  rechace no puede reescribir el pedido por su cuenta: el comprador quizá quería
  esos paneles precisamente de ese vendedor, y quedarse con el resto puede no
  tener ningún sentido. Se le avisa de **quién** no pudo y **por qué**, con el total
  que quedaría, y elige entre tres: **seguir** con los que aceptaron, **editar**
  el pedido, o **cancelarlo** entero. Mientras no elija, el pedido no avanza.
- **Un solo reloj, y lo pone el proveedor más impaciente.** Retener stock le cuesta
  dinero a quien lo tiene —es mercancía que no le vende al que entra por la puerta—,
  así que cuánto aguanta reservado lo suyo lo decide él (`reservation_hold_hours`,
  72 h por defecto). Pero un pedido con tres proveedores tendría tres vencimientos, y
  eso no se le puede enseñar a nadie: lo que vale es **el más temprano**, que es lo
  próximo que le va a pasar al pedido. `orders.expires_at` es esa derivada, y es el
  único número que ve el comprador.
  _Y por eso el plazo del comprador para pagar **no es un ajuste aparte**: es ese
  mismo instante. Dos relojes distintos tarde o temprano se contradicen; aquí no
  hay dos._
- **Que venza una reserva tumba esa parte, no el pedido.** Al llegar `expires_at`
  cae la parte cuya reserva era, se libera su stock, y el mínimo **se recalcula
  sobre las que quedan**: el pedido sigue vivo con una fecha nueva, más lejana. Solo
  muere cuando no le queda ninguna parte viva o cuando el comprador lo cancela.
  _Un pedido no se cancela solo por llegar a una fecha; se cancela por quedarse sin
  nada que entregar, que no es lo mismo._
- **Caducar es un desenlace más, y sale por la misma puerta que un rechazo.** Para
  quien compra da igual si el proveedor dijo que no o si se le acabó el tiempo: en
  los dos casos falta algo de lo que pidió, y en los dos decide él —seguir con el
  resto, editar o abandonar—. Un vencimiento **nunca** recorta el pedido por su
  cuenta ni lo cancela en silencio.
- **Tres formas de caerse, y cada una tiene un actor distinto.** `DECLINED` lo dijo
  el proveedor (con motivo), `EXPIRED` lo dijo el reloj, `CANCELLED` lo dijo una
  persona —el comprador al editar, o el admin—. Y dentro de `EXPIRED`, si llegó a
  aceptar antes de caerse ya está escrito en `confirmed_at`: no hace falta un estado
  más para distinguir "no contestó nunca" de "aceptó y luego se le venció la
  reserva", que son las dos cosas que el comprador necesita leer distintas.
- **El vencimiento se escribe al reservar y ya no se mueve.** `expires_at` es
  absoluto, calculado con el `reservation_hold_hours` que el proveedor tenía en ese
  momento — mismo criterio que el snapshot de precio de `order_items`. Si mañana
  cambia de idea, los pedidos en curso no se le mueven debajo. _Ojo a la diferencia
  con `default_equipment_scope`, que solo prefija un formulario y no lo lee nadie:
  este sí se lee, pero una sola vez y para dejarlo escrito._
- **El suelo no lo pone la plataforma, lo pone el medio de pago.** Un proveedor que
  solo retenga 12 h no es irrazonable, pero con Zelle manual —que tarda días entre
  reportar y verificar— sus productos no se pueden llegar a comprar. Así que el
  mínimo no es una regla arbitraria: es el tiempo que necesita la pasarela más lenta
  que esté habilitada. Con QvaPay (Etapa 11) el pago es inmediato y ese suelo baja
  solo, sin tocar nada.
- **Una parte que se cae alarga el pedido, nunca lo acorta.** Como `expires_at` es
  el mínimo de las reservas **vivas**, en cuanto una se va el mínimo se recalcula
  sobre las que quedan — el comprador gana tiempo para decidir sin que nadie se lo
  regale, y sin que ningún proveedor retenga más de lo que dijo. Lo que **no** hay
  en la Fase 1 es prórroga.
- **Nada se borra, nada se reescribe: el pedido se enseña entero.** El comprador ve
  siempre lo que pidió —todas sus líneas, con lo que pasó con cada una— y no una
  versión recortada a sus espaldas. Por eso `orders.total` es **inmutable**: es lo
  que pidió, y sigue siendo verdad aunque ya no sea lo que va a pagar. Lo que se
  paga hoy es la suma de las partes vivas, que se calcula; y lo que aceptó pagar
  está en `acknowledged_total`. Tres cifras que dicen tres cosas distintas, y
  ninguna pisa a la otra.
  _La regla de fondo: un pedido es el registro de lo que alguien pidió, no un
  borrador que el sistema va limpiando. Si una línea no llegó a buen puerto, se
  cuenta — no se hace desaparecer._
- **Una parte puede confirmarse a medias, y también se ve.** Si el proveedor tiene
  dos de los tres paneles, `order_items.confirmed_quantity` guarda lo que sí puede
  y `quantity` sigue diciendo lo que se pidió. Es la misma disciplina una capa más
  abajo, y entra por la misma puerta: cambia lo que se pagaría, así que decide el
  comprador.
- **Lo que el comprador aceptó pagar se guarda** (`orders.acknowledged_total_usd`).
  De ahí sale todo lo demás sin inventar estados: si el total vivo se separa del
  aceptado, es que hay una decisión pendiente, y las instrucciones Zelle se congelan
  hasta que la tome. No hace falta un `NEEDS_REVIEW` en `orders.status` —que volvería
  a mezclar ejes— porque la pregunta "¿tiene algo que decidir?" es una comparación.
  _Y es lo único que mantiene honesto el monto exacto del Zelle, que es la referencia
  con la que se concilia: nadie ve nunca una cifra que no haya aceptado._
- **Después de `PAID` ya no se decide, se devuelve.** Una parte que se cae con el
  dinero dentro es una devolución, y en esta fase se hace a mano como todo lo demás.
- **Esa decisión también se puede tomar en su nombre.** Es el caso de uso exacto de
  la suplantación: el comprador contesta por WhatsApp "dale, mándame lo que haya" y
  el admin lo deja escrito dentro, firmado como él mismo actuando por el comprador.
- **Estados de pago**: `PENDING → REPORTED → CONFIRMED / REJECTED`.
- **`payments.method` ya contempla `QVAPAY` y `SUBY`**, que son los medios de
  destino, para que llegar a ellos no requiera migración. Lo mismo con el nombre de
  la columna de la referencia: `reference` y no `zelle_reference`, porque las tres
  pasarelas tienen una y sería absurdo guardar la de QvaPay en una columna que dice
  Zelle. Lo que **sí** cambiará al llegar la integración automática es quién mueve
  el estado: hoy `REPORTED → CONFIRMED` lo hace el admin a mano tras mirar el banco;
  con QvaPay o suby lo hará un webhook. Por eso `payments` ya guarda quién confirmó
  (`confirmed_by`, nulo cuando confirme la máquina).

## Flujo de compra Zelle (el corazón de la Fase 1)

1. Usuario elige su zona → ve proveedores y catálogo disponibles ahí.
2. Arma el carrito (productos, kits y/o instalación, de **uno o varios proveedores**) → checkout.
3. Se crea la orden en `PENDING_PAYMENT` —con una fila de `order_suppliers` por
   proveedor del carrito y el stock ya **reservado**— y se muestran las
   instrucciones Zelle (email/teléfono de la cuenta central, monto exacto **total**,
   número de orden como concepto). El comprador no espera a nadie para poder pagar.
4. **En paralelo**, cada proveedor confirma su parte (él desde su portal, o tú por
   teléfono en su nombre). El comprador ve el marcador en su pedido —"2 de 3
   confirmados"—, no una caja negra. La parte que no se confirme dentro de su plazo
   se cae sola y libera su reserva; las demás siguen.
4b. Si alguna se cayó —porque la rechazaron o porque venció, que para el comprador
   es lo mismo—, **el pedido se para y pregunta**. Se le enseña su pedido original
   entero, con lo que pasó con cada línea escrito al lado, y debajo lo que queda y
   lo que costaría. Sigue con el resto, edita o abandona; hasta que conteste no se
   le pide dinero. Al seguir se guarda el nuevo total aceptado y se reemiten las
   instrucciones con esa cifra. Nada se recorta ni desaparece de la lista.
5. Usuario reporta el pago: número de referencia Zelle + captura del comprobante (opcional).
   La orden pasa a `PAYMENT_REPORTED`.
6. Tú verificas el Zelle en tu banco y desde el panel admin confirmas o rechazas.
   **Confirmar exige que no quede ninguna parte viva sin confirmar** — es la puerta
   donde los dos caminos se juntan. Al confirmar: orden → `PAID`, las reservas se
   consumen y bajan el stock, y sale el email al cliente.
7. Coordinas la entrega con **cada** proveedor del pedido, marcas su parte como
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
> El alcance del servicio (`equipment_scope`) entró en el schema **antes** que
> estos formularios, a propósito — mismo razonamiento que con `orders`: se
> construyen una sola vez, ya sabiendo lo que tienen que preguntar. Ver «Pedidos
> multi-proveedor y servicios sobre equipo ajeno» más abajo.

- [x] CRUD de categorías de servicio (nombre, orden en que se listan).
      *`/admin/service-categories`, con edición en línea como las zonas: son
      pocos campos y el orden solo se decide viendo la lista entera. No se borra
      una categoría en uso — `services.categoryId` no lleva cascade.*
- [x] CRUD de servicios por proveedor: categoría, precio `FLAT` o `PER_UNIT` con
      su unidad, **alcance** (`OWN` / `PLATFORM` / `ANY`, prefijado con el default
      del proveedor), activar/desactivar.
      *`/admin/services` con listado, alta y edición. La unidad de obra solo
      aparece con `PER_UNIT` y se descarta en `FLAT`, para no dejar rótulos
      huérfanos. El alcance lleva debajo qué significa cada valor: es la decisión
      con más consecuencias del formulario. Y no se puede cerrar a `OWN` —ni
      mudar de proveedor— un servicio ya ofrecido sobre equipo ajeno, porque
      dejaría en el catálogo ofertas que no se podrían cumplir.*
- [x] Aviso en el formulario del servicio: si el proveedor no tiene productos ni
      kits, un servicio `OWN` no se podrá vender nunca. No se prohíbe —puede
      estar a punto de cargar su catálogo—, se avisa.
- [x] Asignar a qué productos/kits se ofrece cada servicio (`installation_offers`).
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
- [x] Los servicios entran al **listado**: tercera rama de la unión y contador
      propio en el selector (Todo · Kits · Productos · Instalación). Hoy la ficha
      existe y se llega a ella desde el equipo, pero no sale en la grilla; por eso
      `CATALOG_TYPES` (el filtro) sigue teniendo dos valores y `PURCHASABLE_TYPES`
      (lo que cabe en el carrito) tiene tres. **Solo entran los `ANY`**: son los
      únicos que se contratan sin que la plataforma sepa sobre qué equipo van.
- [x] La ficha de un servicio `OWN` o `PLATFORM` deja de vender a ciegas. La
      página sigue existiendo —la enlazan las fichas de los equipos—, pero el
      bloque de compra solo aparece si el visitante trae el equipo: uno que
      encaje en el carrito, o uno suyo de un pedido pagado (cuando exista «Mis
      equipos», Etapa 9). Si no lo trae, la ficha explica sobre qué equipo
      trabaja ese servicio y adónde ir a buscarlo.
      *Es lo único incoherente que hay hoy: un servicio se vende suelto a
      cualquiera aunque su proveedor solo quiera trabajar sobre lo suyo. No es
      una decisión que haya que tomar aparte — sale del propio alcance.*
- [x] Lo agotado deja de ser un callejón: la tarjeta de un producto sin stock pero
      con reposición anunciada dice hasta cuándo va la ventana ("vuelve aprox. la
      semana del 12"), y la ficha ofrece el aviso de `stock_alerts` en lugar del
      botón de compra. Hoy los agotados ya salen en el listado, así que es enriquecer
      lo que hay y no añadir una rama. **Va después de la Etapa 5.5.**
- [ ] Filtro "incluir lo que llega pronto" en la barra del catálogo, apagado por
      defecto: lo primero que se ve es lo que se puede comprar hoy.
- [x] **Un kit también llega pronto.** Su disponibilidad es derivada, así que la
      futura también lo es: un kit está "por volver" cuando lo único que le falta
      son piezas con reposición anunciada, y su ventana es la **más tardía** de
      ellas —llega cuando llega la última—. Si a una pieza que falta no le espera
      nada, el kit no promete nada: sale agotado y punto.
- [x] **El precio futuro no se enseña en el catálogo.** `price_schedules` lo conoce
      y el proveedor lo programa, pero anunciar "baja a 180 el día 15" mata la venta
      de hoy y convierte una previsión en una promesa de precio. Se ve en el portal
      del proveedor y en el admin; el comprador ve el precio de hoy y ya. _Si algún
      día se quiere enseñar, que sea como una campaña con fecha de inicio y no como
      un efecto secundario de tener la tabla._
- [x] SEO básico: metadata, slugs limpios, Open Graph.

### Etapa 5.5 — Inventario, precios en el tiempo y suplantación (3–4 días)

Va **antes** de la Etapa 6 por el mismo motivo que los dos cambios de schema
anteriores: la validación de stock y el "precio releído" del checkout todavía no
están escritos, así que se escriben una sola vez ya sabiendo que hay reservas y
schedules. Al revés habría que reescribirlos y migrar pedidos reales. Ver
«Inventario, reposiciones y precio en el tiempo» más abajo.

- [x] Schema y migraciones con **backfill**: un movimiento `OPENING` por producto
      con el stock de hoy y una fila de `price_schedules` por producto/kit/servicio
      con su precio actual. Desde el primer minuto las dos invariantes se cumplen y
      se pueden testear — a diferencia de la `0003`, aquí `products` **no** está
      vacía, así que ninguna columna nueva entra `NOT NULL` sin default.
- [x] `lib/inventory/` — el único sitio que escribe stock. Ajuste manual, anuncio y
      llegada de reposición, y las primitivas de reserva. Toda mutación recibe el
      ámbito de proveedor como parámetro (hoy siempre "el admin actuando como X"),
      para que abrir el portal después sea vestir formularios y no reescribirlos.
- [x] `lib/pricing/` — precio efectivo, precio programado y promoción de vencidos.
- [x] Disponibilidad de un kit, que hoy no existe: es la derivada
      `min(floor((stock − reserved) / cantidad))` sobre sus piezas. **Es un bug de
      hoy**, no de este cambio: `catalog/queries.ts` pone `stock: 1` en la rama de
      kits "para cuadrar la unión" y `toItem` solo marca agotado si es `PRODUCT`, así
      que ahora mismo se puede vender un kit cuyos paneles se acabaron. Vender un kit
      descuenta sus **componentes**, nunca el kit.
- [x] Cron en Vercel (hace falta `vercel.ts`, que el repo todavía no tiene): promover
      precios vencidos, liberar reservas caducadas y caducar anuncios pasados de
      ventana. Idempotente — se puede correr dos veces sin descuadrar nada.
- [x] Admin mínimo del inventario: ajustar stock con motivo, anunciar y resolver
      una reposición, y el histórico del libro mayor. El panel de fiabilidad del
      proveedor es Etapa 8.
- [ ] **Programar un precio desde el panel.** `price_schedules` ya acepta filas
      con fecha futura y el cron las promueve, pero la única forma de crear una
      es guardar la ficha —y eso escribe "desde ya"—. Falta la pantalla que deje
      decir "a partir del 15". Es lo último que le queda al bloque de precios.
- [x] `suppliers.reservation_hold_hours` en la ficha del proveedor, vacío por
      defecto (= las 72 h de la plataforma). Debajo, lo único que hay que decirle:
      por debajo del suelo del medio de pago más lento habilitado, sus productos se
      pueden reservar pero no llegar a pagar. No se prohíbe, se avisa — es su
      mercancía y él sabrá.
- [ ] **La suplantación, entera, entra aquí** — no en la Etapa 10. El portal es que
      el proveedor entre por su cuenta; esto es que tú puedas actuar por él, y lo
      necesitas desde el primer día porque en la Fase 1 el inventario ajeno lo
      mueves tú. Es la misma pieza que después usarán la confirmación de partes
      (Etapa 7) y la decisión del comprador ante un rechazo.
      - `impersonatedUserId` en la sesión; el usuario **efectivo** es el suplantado
        o tú, y `actingSupplierId` sale de cruzar el efectivo con `supplier_users`.
      - El botón y la lista de usuarios en el admin —proveedores, compradores,
        cualquiera—, con banner permanente mientras dure y salida a un clic.
      - `impersonation_sessions` con motivo y caducidad, y la columna del actor real
        en todo lo que se escriba (empezando por el libro mayor de stock).
      - Las prohibiciones, que son la mitad del trabajo: ni contraseña, ni email, ni
        borrar cuenta, ni encadenar otra, ni confirmar un pago.

### Etapa 6 — Carrito y checkout (2–3 días)
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
- [x] Checkout: resumen **agrupado por proveedor**, datos de contacto/entrega,
      confirmación → crea la orden `PENDING_PAYMENT` con una fila de
      `order_suppliers` por grupo. Si la orden lleva instalación, la dirección de
      entrega es la de la obra; la fecha se coordina a mano en esta fase.
      *El carrito vive en el navegador, así que el resumen no lo puede armar la
      página: `previewCheckout` manda las líneas y devuelve el pedido ya releído,
      y se repite cada vez que cambia la zona porque la cobertura depende de ella.*
- [x] Revalidación del carrito en el servidor, grupo a grupo: proveedor activo,
      item activo y de ese proveedor, precio releído **del schedule y no de la
      caché**, stock suficiente y **cobertura de la zona de entrega**. Si un grupo
      falla se para el checkout y se dice cuál — nunca se descarta una línea en
      silencio.
      *`lib/orders/revalidate.ts`, y por ahí pasan las dos entradas: la que pinta
      el resumen y la que crea el pedido. Lo que se ve es lo que se cobra.*
- [x] El stock no se comprueba, se **reserva**: `UPDATE products SET reserved =
      reserved + n WHERE id = ? AND stock − reserved >= n`. Cero filas devueltas
      significa que no había, y es atómico en una sola sentencia — sin lock abierto
      entre dos viajes a la base. La reserva nace con su `expires_at` ya calculado
      —`reservation_hold_hours` del proveedor, o las 72 h de la plataforma— y cuelga
      de su `order_suppliers`.
- [x] `orders.expires_at` = la más temprana de las reservas vivas del pedido, y
      `confirmation_due_at` de cada parte = `min(24 h, el hold de su proveedor)`:
      no tiene sentido retener tres días para alguien que aún no ha dicho que sí.
      Se recalcula el mínimo cada vez que una parte se cae; puede alargarse, nunca
      acortarse.
      _Un carrito solo de servicios no reserva nada y el mínimo saldría vacío: ahí
      manda el default de la plataforma. Es el caso que se olvida y deja un pedido
      sin vencimiento._
- [x] El checkout **dice hasta cuándo aguanta antes de que el comprador confirme**,
      no después: "reservado hasta el jueves 14 a las 18:00". Y si esa ventana no le
      da para pagar por el medio disponible, se avisa ahí —con qué proveedor la
      acorta— mientras todavía puede quitarlo del carrito.
- [x] **El driver de base de datos tiene que cambiar en esta etapa.** `lib/db/index.ts`
      usa `drizzle-orm/neon-http`, que es HTTP de un solo tiro: manda un lote de
      queries pero no deja leer, decidir en JS y escribir dentro de la misma
      transacción. Crear la orden son varias escrituras (`orders`,
      `order_suppliers`, `order_items` y N reservas) que o entran todas o no entra
      ninguna, así que el camino de escritura necesita `neon-serverless` con `Pool`.
      Las lecturas se pueden quedar como están.
- [x] Y una validación que no es por grupo sino entre grupos: un servicio que no
      sea `ANY` tiene que llegar con su equipo. En el carrito eso es un item del
      proveedor que toque —el suyo si es `OWN`, el de cualquiera si es
      `PLATFORM`— y sale de los propios grupos, sin ir a la base. Con «Mis
      equipos» (Etapa 9) el equipo podrá venir además de un pedido anterior, y
      entonces sí hay que consultarlo.
- [x] La zona de entrega deja de ser opcional cuando hay algo que entregar:
      `orders.zone_id` es lo que se compara contra `supplier_zones`, así que sin
      ella no hay nada que validar. Se propone la de la cookie o la del usuario,
      y se puede cambiar en el formulario.
      *Acabó siendo obligatoria siempre, no solo con equipo: un servicio también
      se hace en un sitio y el instalador también tiene que llegar hasta ahí, así
      que un pedido de pura mano de obra necesita igualmente su zona para poder
      comprobar la cobertura.*
- [x] Un servicio `ANY` contratado solo es trabajo sobre equipo que el cliente ya
      tiene y la plataforma no conoce: el checkout le pide describirlo, y eso va
      a `orders.notes` para que el instalador sepa a qué va.
      *Quién lo pide lo decide el servidor: el alcance del servicio no viaja en la
      línea del carrito, así que el resumen devuelve `needsEquipmentNote` y el
      formulario cambia la etiqueta del campo con eso.*
- [x] Página "Mis órdenes" en la cuenta del usuario, con los tres ejes en tiempo
      real: el pago para el pedido, y la aceptación y la entrega para cada
      proveedor. El marcador "2 de 3 confirmados" va arriba, y al lado la cuenta
      atrás del pedido: es lo que el comprador mira mientras espera, y no saberlo es
      lo que le hace escribir para preguntar.
      *Los tres ejes están. El marcador solo aparece mientras se espera a alguien:
      «1 de 1 confirmado» en un pedido resuelto compite con lo que sí cambió.*
- [ ] En el detalle, **el pedido original completo y qué pasó con cada línea**: la
      que sigue en pie con su fecha de reserva —para que se vea cuál aprieta—, y la
      que se cayó con el motivo escrito y sin desaparecer de la lista. Un pedido que
      se recorta solo, o que caduca sin decir quién lo frenaba, es el que genera la
      llamada.
      *El detalle enseña el pedido entero, y cada parte lleva al lado lo que le
      pasó en palabras —con el motivo del rechazo, o diciendo cuál de los dos
      relojes venció—. Las caídas se atenúan pero no se van.
      Falta el grano fino: **por línea** y no por parte, que es la confirmación
      parcial («confirma 2 de 3») y necesita `confirmed_quantity`. Se dejó fuera
      porque no es una columna más: cambia el subtotal de la parte, las reservas y
      la cantidad de la línea, y merece su propio paso.*

### Etapa 7 — Pago manual Zelle (2 días) ★ meta de la fase
- [ ] Página de instrucciones de pago post-checkout: datos Zelle de la cuenta central, monto, número de orden como referencia.
- [ ] Formulario de reporte de pago: referencia Zelle + subida de comprobante → `PAYMENT_REPORTED`.
- [ ] Panel admin de pagos: cola de pagos reportados, ver comprobante, confirmar o rechazar (rechazo con motivo, el usuario puede re-reportar).
- [x] **La confirmación de la parte, con sus dos manos.** El proveedor acepta o
      rechaza lo suyo (con motivo), y el admin puede hacerlo en su nombre —que en
      la Fase 1 es el camino normal: se resuelve por teléfono—. Es exactamente el
      `actingSupplierId` del inventario, sin una sola línea de permisos nueva, y el
      registro guarda quién lo hizo de verdad.
      *Está **la mano del admin**, que es la que la Fase 1 usa; la del proveedor no,
      porque todavía no existe su portal (ni `supplier_users`, ni
      `actingSupplierId`). No hace falta rehacer nada para añadirla: la regla vive
      en `confirmPart`/`declinePart` y la Action solo pasa quién firma, así que el
      portal llamará a las mismas funciones con su propio `userId`.
      `order_suppliers` gana `confirmed_at`, `decline_reason` y `decided_by_user_id`
      (migración 0009), y `fulfillment_status` gana `CONFIRMED`, `DECLINED` y
      `EXPIRED`: son tres desenlaces y no uno porque al comprador se le cuentan con
      palabras distintas.*
- [ ] La puerta: confirmar el pago exige que ninguna parte viva siga en `PENDING`.
      La cola de pagos lo enseña en la fila —"1 proveedor sin confirmar"— y la
      Action lo comprueba; no basta con esconder el botón.
      *La regla existe y está probada (`paymentGate`), y `/admin/orders` ya escribe
      el motivo en cada fila. Lo que falta es la Action a la que guardar: todavía no
      hay confirmación de pago que llamarla. Se conecta en el mismo commit que la
      cola de pagos.*
- [x] Los dos vencimientos en el cron, y los dos tumban **una parte**, nunca el
      pedido: el de confirmación (el proveedor no contestó) y el de la reserva (había
      confirmado, pero se acabó el tiempo). Los dos dejan la parte en `EXPIRED`
      —`confirmed_at` ya distingue cuál fue— y liberan su stock. El pedido solo se
      cancela solo cuando no le queda ninguna parte viva.
      *El segundo reloj no pregunta "¿tiene una reserva vencida?" sino "¿le queda
      alguna viva?". La diferencia tapa un agujero real: el checkout suelta lo
      vencido de los productos que va a pedir sin saber de qué parte eran, así que
      una parte confirmada puede quedarse sin reservas y sin ninguna vencida que la
      delate — `CONFIRMED` para siempre, y al cobrar no habría nada que consumir.*
- [ ] **La pantalla de decisión del comprador**, que es donde acaban por igual el
      rechazo y el vencimiento. Enseña **el pedido original entero**, línea por
      línea, con lo que pasó con cada una en palabras: "no pudo atenderlo: sin
      stock", "no respondió a tiempo", "lo aceptó, pero venció la reserva antes de
      completar el pago", "confirma 2 de 3". Debajo, lo que queda y lo que costaría,
      y tres salidas —seguir, editar o abandonar—.
      *Nada de esto recorta el pedido por su cuenta: mientras el total vivo no
      coincida con `acknowledged_total`, el cobro está congelado y el admin no puede
      confirmar nada. Al seguir se guarda el total nuevo; `total` no se toca nunca.
      El admin puede decidir en nombre del comprador (suplantación), que es como se
      va a resolver la mayoría por WhatsApp.*
- [x] Un pedido ya `PAID` no vence: sus reservas están consumidas y el reloj no le
      aplica.
      *La condición va en el `where` de los dos barridos y no en un `if` después:
      es la diferencia entre no hacer nada y deshacer una venta.*
- [ ] Aviso antes de que se caiga, no después: recordatorio al comprador a falta de
      ~24 h con lo que tiene pendiente (pagar, o decidir), y al proveedor que aún no
      ha confirmado. Un pedido perdido por silencio se pierde dos veces.
- [ ] Emails con Resend: orden creada (con instrucciones), parte confirmada o caída
      —con el total nuevo si cambió—, pago recibido/en revisión, pago confirmado,
      pago rechazado. Y al proveedor: "tienes una parte por confirmar", que es lo
      que hace que el plazo signifique algo.
- [ ] El pago cierra el ciclo del stock: al confirmar, las reservas del pedido pasan
      a `CONSUMED` y bajan el saldo con un movimiento `SALE`; al rechazar o cancelar,
      a `RELEASED` y devuelven lo suyo. Marcar `CANCELLED` la parte de un proveedor
      devuelve **solo** su stock.
- [ ] Cuando una reposición llega, sale el mail de `stock_alerts` a quien lo pidió
      (mismo Resend que el resto de la etapa).
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

**Total estimado: ~3 semanas y media** de trabajo enfocado hasta aquí. La Etapa 5.5
es la que sumó, y son los días que evitan reescribir el checkout con pedidos reales
encima. Las Etapas 9, 10 y 11 quedan fuera de esa cuenta: la fase sale a producción
sin ellas.

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

### Etapa 10 — Portal del proveedor (2–3 días)

Que cada proveedor gestione lo suyo sin pasar por el admin. No depende de que haya
pedidos pagados, así que puede adelantarse por delante de la Etapa 9; va después de
producción porque abre una superficie de auth nueva y es mejor estrenarla con el
flujo principal ya rodado. El modelo de inventario y el de confirmación no cambian
ni una columna: lo único que cambia es **quién** rellena el formulario.

Y es la etapa que más se paga sola. En la Fase 1 cada confirmación de parte pasa
por ti al teléfono, así que el admin es el cuello de botella de todos los pedidos
del marketplace a la vez. Aquí eso deja de serlo.

- [ ] Rol `SUPPLIER` en `user_role` y tabla `supplier_users`. Un negocio puede tener
      dos personas sin migrar nada, y la forma es la que ya usa `supplier_zones`.
- [ ] La segunda puerta de `requireSupplierScope()`: hasta ahora el ámbito solo
      podía venir de un admin suplantando (Etapa 5.5); ahora también de un
      `SUPPLIER` en su propia sesión, y ahí sale de `supplier_users` y **nunca** de
      la petición. `proxy.ts` filtra `/portal/**` por el rol de la cookie como primer
      corte, y la página lo vuelve a verificar por el DAL.
- [ ] **Repasar todas las Server Actions que ya existen.** Hoy `products.ts`,
      `kits.ts`, `services.ts` y `service-categories.ts` reciben el `supplierId` del
      formulario y se fían, porque el único que llega hasta ahí es el admin. Con un
      login de proveedor eso es un IDOR: cambiar un campo oculto y editar el catálogo
      de otro. El ámbito pasa a salir de la sesión y el del `FormData` se ignora.
      **Este item es el coste real de la etapa, no el login.**
- [ ] `/portal`: sus productos, kits y servicios; su inventario y sus precios; y
      cuánta gente está esperando cada reposición (`stock_alerts`). Fuera de su
      alcance: zonas de cobertura y `payout_info` —son trato comercial, los toca el
      admin— y todo lo de los proveedores ajenos.
- [ ] **Su cola de partes por confirmar**, que es la razón de verdad para entrar:
      lo que le han pedido, con su plazo a la vista, y aceptar o rechazar desde
      ahí. Lo que hasta ahora hacía el admin por teléfono en su nombre.
- [ ] Sus liquidaciones: el `group by` sobre `order_suppliers` de la Etapa 7, pero
      recortado a los suyos. La fila con lo que le toca existe desde la Fase 1.

### Etapa 11 — Pago automático: QvaPay y suby.fi (2–3 días)

Los medios principales del producto. Están fuera de la Fase 1 porque faltan la
integración y los permisos, no porque sean secundarios: el Zelle manual es el
puente que permite cobrar mientras tanto. Cuando esta etapa entre, el Zelle se
queda como alternativa, no se retira.

- [ ] `payments.method` ya tiene los tres valores desde la Fase 1, así que esto no
      es una migración de datos: es un flujo de checkout nuevo por pasarela.
- [ ] **El cambio de fondo es quién mueve el estado.** Hoy `REPORTED → CONFIRMED` lo
      hace el admin tras mirar el banco; aquí lo hace un webhook. Todo lo que la
      Etapa 7 colgó de esa transición —consumir las reservas, escribir los `SALE`,
      mandar el email— tiene que dispararse igual venga de donde venga, así que vive
      en un service y no dentro de la Action del admin.
- [ ] Webhook idempotente y verificado por firma: una pasarela reintenta, y cobrar
      dos veces el mismo pedido o consumir dos veces la misma reserva no es una
      opción. La clave de idempotencia es el pago, no la petición.
- [ ] Conciliación: qué pasa si el webhook no llega nunca. El admin tiene que poder
      confirmar a mano igual que hoy, y esa puerta no se cierra en esta etapa.
- [ ] La puerta de la Etapa 7 sigue en pie: no se marca `PAID` con partes vivas sin
      confirmar. Con pago automático esto se vuelve **más** importante, no menos —
      antes el dinero esperaba a que tú miraras el banco; ahora entra solo.

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

## Inventario, reposiciones y precio en el tiempo (cambio planificado)

El punto de partida: un proveedor se queda sin paneles hoy y en una semana tiene
otra vez, y el comprador debería poder ver las dos cosas —lo que hay ahora, con su
precio, y lo que va a llegar— sin que lo segundo se lea como una promesa. Las
decisiones están arriba; esto es el mecanismo, y **en este orden**.

**Suena a cambio grande y lo es en superficie, pero no en riesgo.** Todo lo que
toca el pedido —`orders`, `order_suppliers`, `order_items`— está vacío y no tiene
encima ni una lectura ni una escritura del código: cambiar su forma no rompe ningún
flujo porque no hay flujo todavía. Lo demás es aditivo (columnas con default, tablas
nuevas, valores nuevos en dos enums). La única tabla con datos reales que se toca es
`products`, y solo para añadirle `reserved` y sembrarle su saldo de apertura. Los
dos cambios de verdad no son de schema: el driver de escritura, y que las Actions
que hoy se fían del `supplierId` del formulario dejen de hacerlo.

Igual que con `orders` y con `equipment_scope`, el schema entra antes de que exista
el código que lo usaría. La diferencia esta vez es que `products` **no** está vacía:
hay filas del seed y las que se hayan cargado a mano. Ninguna columna nueva puede
entrar `NOT NULL` sin default, y el backfill no es opcional.

### Paso 1 — El saldo, el libro mayor y la reserva

`products.stock` se queda con el mismo nombre —renombrarlo obligaría a contestar el
`DROP`+`ADD` de `drizzle-kit` que ya nos costó partir la `0003` en dos— y a su lado
nace `reserved`. Lo vendible es la resta, y esa resta es lo que mira el catálogo, la
ficha y el checkout.

El movimiento del checkout es una sola sentencia condicional
(`WHERE stock − reserved >= n`), no un `SELECT` seguido de un `UPDATE`: así no hay
ventana entre leer y escribir, que es donde se cuelan las ventas duplicadas del
último ejemplar. Lo que sí necesita transacción es envolver esa reserva con la
creación del pedido — de ahí el cambio de driver anotado en la Etapa 6.

`stock_movements` explica cada cambio y es la única forma de escribir stock: el
ajuste del admin, la llegada de una reposición, la venta, la liberación de una
reserva caducada, la pérdida. Nada toca la columna por su cuenta, y por eso la
invariante se sostiene.

### Paso 2 — La promesa, que vive aparte y caduca sola

`restocks` no toca el saldo. Es lo que el proveedor anuncia: cuánto cree que le
entra y entre qué dos fechas. Cuando llega, la fila pasa a `ARRIVED` **y** se
escribe un movimiento `RESTOCK` con la cantidad real — dos hechos distintos, y la
distancia entre ellos es la métrica de quién cumple.

Lo que la consulta pública lee es solo `ANNOUNCED` con `eta_to >= today`, así que un
anuncio olvidado desaparece del catálogo sin que nadie vaya a limpiarlo. El cron lo
marca `EXPIRED` después para que el proveedor lo vea en su lista y lo resuelva.

Nada de esto entra al carrito en la Fase 1. Lo que se ofrece en su lugar es
`stock_alerts`, que además de no tocar dinero produce el dato que el proveedor
necesita para decidir cuánto pedir.

### Paso 3 — El precio, con dos velocidades

`price_schedules` es la verdad y `price_usd` la caché del efectivo. La única razón
de la caché es el listado: ordena y filtra por rango sobre esa columna indexada, y
resolverlo por fila con un lateral join sería pagar la temporalidad en la consulta
más caliente del sitio para ganar una exactitud que ahí no hace falta.

Donde sí hace falta es en el dinero, y ahí se paga: el checkout relee el efectivo
del schedule antes de escribir el snapshot de `order_items`. El cron promueve, pero
la corrección no depende de que el cron haya corrido.

Aplica a productos, kits y servicios. El stock, solo a productos — un servicio es
mano de obra y no tiene existencias, y eso no cambia; un kit no tiene stock propio
sino derivado de sus piezas.

### Paso 4 — La parte se acepta antes de entregarse

Es el tercer eje —pago, aceptación, entrega— y el único que no existía en ninguna
forma. `fulfillmentStatus` gana `CONFIRMED` y `DECLINED`, y la parte gana su plazo.
No hay estado nuevo en `orders`: "aceptada" se deriva de las partes, igual que
`COMPLETED`.

Encaja con la reserva sin inventar nada. La reserva nace en el checkout y vive
mientras la parte esté viva: si el proveedor rechaza, se libera en ese momento; si
deja vencer su plazo, la libera el cron; si el pago se confirma, se consume. Los
tres finales pasan por el mismo sitio, que es lo que hace que el stock no se quede
colgado en ninguno.

El plazo es lo que impide que un proveedor callado bloquee un pedido ajeno: al
vencer cae **su** parte y el resto sigue. Y como el monto exacto del Zelle es la
referencia con la que se concilia, una parte que cae antes de cobrar reescribe
`orders.total` y reemite instrucciones; después de `PAID` no se reescribe nada,
porque ahí ya es una devolución.

Quién puede confirmar sale del mismo `actingSupplierId` del paso siguiente, sin una
línea de permisos nueva: en la Fase 1 el admin lo hace en nombre del proveedor
—por teléfono, como se verifica el Zelle— y con el portal lo hace el proveedor.
El registro guarda siempre quién lo hizo de verdad.

Y lo que **no** hace el sistema es decidir por el comprador. Un rechazo no reescribe
el pedido: lo para y pregunta. `orders.acknowledged_total_usd` guarda la última
cifra que el comprador aceptó pagar, y con eso "¿hay algo que decidir?" es una
comparación —total vivo contra aceptado— en vez de un estado nuevo que habría que
mantener sincronizado. Mientras difieran, las instrucciones de pago se congelan y
el admin no puede confirmar. Seguir con el resto, editar o cancelar son las tres
salidas, y cualquiera de ellas reescribe el aceptado.

### Paso 4b — Los relojes, que son uno solo

Hay cuatro esperas en un pedido: que el proveedor confirme, que el stock siga
retenido, que el comprador decida si alguien rechazó, y que pague. Modeladas como
cuatro ajustes independientes se contradicen en cuanto alguien toca uno —el clásico
"la reserva dura 48 h pero el plazo de pago son 72"—, y el que pierde es siempre el
comprador, que se queda sin lo que ya creía suyo.

Aquí hay **un** ajuste y todo lo demás se deriva de él:

| Espera | De dónde sale |
|---|---|
| Retención del stock | `suppliers.reservation_hold_hours` (72 h si no dice nada) |
| Confirmación del proveedor | `min(24 h, su propio hold)` |
| Lo próximo que le pasa al pedido | el **más temprano** de sus reservas vivas |
| Decisión del comprador | ese mismo instante |
| Plazo para pagar | ese mismo instante |

Las tres últimas filas son el mismo timestamp escrito una vez
(`orders.expires_at`). No es que se hayan cuadrado dos números: es que no hay dos.

Que lo fije el proveedor no es una concesión, es lo correcto: retener mercancía le
cuesta a él, no a la plataforma. Y que mande el más impaciente tampoco es un
castigo — es simplemente lo primero que va a ocurrir, y enseñar cualquier otra
fecha sería mentir.

**Lo que ese vencimiento tumba es una parte, no el pedido.** Es la diferencia entre
un plazo y una guillotina: al llegar cae la parte cuya reserva era, se libera su
stock, y el mínimo se recalcula sobre las que quedan — el pedido continúa con una
fecha nueva y más lejana. Solo muere cuando se queda sin ninguna parte viva, que no
es una fecha sino un recuento.

De ahí sale gratis un comportamiento que habría que haber programado aparte: **el
comprador gana tiempo para decidir** justo cuando algo se cae, sin que nadie se lo
conceda. Y como el valor solo se recalcula sobre lo vivo, nunca puede acortarse por
sorpresa: únicamente lo mueve algo que ya desapareció.

### Paso 4c — El pedido no se recorta solo

Un vencimiento y un rechazo son lo mismo desde el otro lado del mostrador: falta
algo de lo que se pidió. Así que salen por la misma puerta —la pantalla de
decisión— y ninguno de los dos toca el pedido por su cuenta. El sistema no elige
por el comprador ni cuando la respuesta parece obvia.

Y el pedido que se le enseña es **el que hizo**, entero. Nada se borra ni se
recorta: cada línea sigue en la lista con lo que le pasó escrito al lado, incluidas
—sobre todo— las que no llegaron. Eso obliga a distinguir cosas que un solo estado
`CANCELLED` habría fundido en una:

| Lo que ve el comprador | De dónde sale |
|---|---|
| "No pudo atenderlo: sin stock" | `DECLINED` + `decline_reason` |
| "No respondió a tiempo" | `EXPIRED` con `confirmed_at` nulo |
| "Lo aceptó, pero venció la reserva antes de pagar" | `EXPIRED` con `confirmed_at` escrito |
| "Confirma 2 de los 3 que pediste" | `confirmed_quantity` < `quantity` |
| "Lo quitaste del pedido" | `CANCELLED` |

Ninguna de esas filas necesitó un estado nuevo: `EXPIRED` es uno solo y la columna
que ya existía (`confirmed_at`) hace la distinción que importa.

Y por eso `orders.total` es inmutable. Conviven tres cifras que dicen tres cosas
distintas y que nunca se pisan: lo que se pidió (`total`, escrito una vez), lo que
se pagaría hoy (la suma de las partes vivas, que se calcula y no se guarda) y lo
que el comprador aceptó pagar (`acknowledged_total`). Un pedido es el registro de
lo que alguien pidió, no un borrador que el sistema va limpiando.

Lo que no se deriva y hay que escribir a mano es el suelo. Un hold de 12 h es
perfectamente razonable para quien tiene dos paneles y gente entrando a la tienda,
pero con Zelle manual —reportar, que mires el banco, confirmar— no da tiempo a
completar la compra. Ese mínimo no lo decide la plataforma por gusto: es el tiempo
que necesita la pasarela más lenta que esté habilitada, así que cuando entre QvaPay
(Etapa 11) baja solo y sin tocar código. Y no se prohíbe configurar por debajo: se
avisa al proveedor, y se avisa al comprador en el checkout antes de que se ilusione.

### Paso 5 — Actuar en nombre de otro

Buena parte de este negocio se cierra por teléfono o WhatsApp, y después hay que
dejarlo escrito dentro de la aplicación. Suplantar es la pieza que lo permite sin
mentir en el registro.

La sesión lleva dos identidades: la **real** (`userId`, que no cambia nunca ni
siquiera suplantando) y la **efectiva** (`impersonatedUserId ?? userId`). Todo lo
que la aplicación lee y escribe usa la efectiva, así que el código de una página no
sabe ni le importa si detrás hay un admin — no hay una rama "modo admin" que se
desincronice con la de verdad. Lo que sí cambia es la firma: cada escritura guarda
la real junto a la efectiva.

`actingSupplierId` no es una pieza aparte, es una derivada: la efectiva cruzada
contra `supplier_users`. Por eso el proveedor en su portal (Etapa 10) y el admin
actuando por él recorren el mismo camino, y por eso el portal no es un panel
paralelo que haya que mantener dos veces.

Las prohibiciones son la mitad del diseño, no una lista de cortesía: contraseña,
email, borrado de cuenta y encadenar otra suplantación quedan fuera porque son las
que convierten "operar por alguien" en "quedarse con su cuenta". Y confirmar un
pago queda fuera por separación de funciones: si el mismo actor crea el pedido y da
el cobro por bueno, no queda nadie mirando. Todo ello con caducidad,
`impersonation_sessions` con motivo, y un banner que no se puede quitar — el riesgo
más tonto es olvidarse de que estás suplantando.

### Lo que hay que vigilar

- **La parte huérfana.** Una que nadie confirma y nadie rechaza es la que se lleva
  el pedido por delante. El plazo no es un adorno: es lo único que garantiza que
  toda parte llega a un final.
- **El pedido esperando una decisión que nadie toma.** Ya no se cuelga: cada
  vencimiento se lleva una parte, y cuando no queda ninguna el pedido se cierra por
  recuento. Lo que queda por vigilar no es el modelo sino el aviso — que el
  recordatorio salga antes, porque perder el pedido en silencio se siente como un
  fallo aunque sea la regla.
- **La tentación de limpiar.** En cuanto alguien quiera "simplificar" la pantalla
  escondiendo las líneas caídas, o recalcular `total` para que cuadre con lo que se
  paga, esto se rompe — y se rompe de la peor manera, porque el comprador deja de
  reconocer su propio pedido. Lo que no llegó se cuenta; no se hace desaparecer.
- **Relojes que se separan.** El día que alguien añada un plazo nuevo "solo para
  este caso", esto vuelve a estar roto. Toda espera nueva se deriva de
  `orders.expires_at` o cambia la derivada; ninguna se declara al lado.
- **La suplantación olvidada.** Un admin que se deja la sesión abierta actuando
  como otro escribe cosas a su nombre sin darse cuenta. Caducidad y banner.
- **Doble contabilidad.** `stock`/movimientos y `price_usd`/schedules son dos pares
  que pueden descuadrar. Se aceptan por lectura, no por comodidad, y a cambio las
  dos invariantes son queries que caben en un test.
- **Reservas colgadas.** Un checkout que nunca se paga tiene que devolver su stock
  solo. El barrido del cron es idempotente, y `expires_at` es el que manda.
- **Anuncios rancios.** Resueltos leyendo por ventana, no por limpieza manual.
- **El kit que se vende sin piezas.** Existe hoy y hay que arreglarlo aquí.

## Fase 2 (fuera de alcance por ahora)
- **Agendar la instalación**: fecha y ventana horaria, con sus estados de orden
  (`SCHEDULED` → `INSTALLED`) en una tabla `order_installations` aparte. En Fase 1
  se coordina por teléfono, igual que la verificación del Zelle.
- **Servicios a presupuestar** (`pricing = QUOTE`): solicitud del cliente →
  cotización del admin → orden. No cabe en el carrito, es un flujo propio.
- **Pre-orden de lo anunciado**: comprar hoy lo que llega la semana que viene. Se
  descarta en la Fase 1 a propósito — con el Zelle manual sería cobrar por
  adelantado contra una fecha que nosotros mismos presentamos como aproximada.
  Necesita reservas contra promesa además de contra saldo, un estado de pedido para
  lo que aún no existe y una política de devolución para cuando la reposición no
  llega. Con el pago automático y un historial de `restocks` que diga qué proveedor
  cumple, la conversación es otra.
- El pago automático **ya no vive aquí**: es la Etapa 11, porque QvaPay y suby.fi
  son los medios principales del producto y no un extra de la fase siguiente. Lo
  que los mantiene fuera de la Fase 1 es que faltan integración y permisos, no que
  sean opcionales.
- Liquidaciones a proveedores registradas dentro del sistema: son columnas de
  estado sobre `order_suppliers` (pagada, cuándo, referencia), no una tabla
  nueva — la fila con el monto que le toca a cada uno ya existe desde la Fase 1.
- Portal para que los proveedores gestionen sus propios productos: cada uno vería
  **sus** `order_suppliers`, que es justo el recorte que esa fila define.
- Notificaciones por WhatsApp.
