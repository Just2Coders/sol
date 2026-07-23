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
suppliers      id, name, slug, logo, phone, email, notes, payout_info (datos para liquidarles)
supplier_zones supplier_id, zone_id               ← en qué zonas opera cada proveedor
products       id, supplier_id, name, slug, description, specs (jsonb), price_usd,
               stock, images[], active
kits           id, supplier_id, name, slug, description, price_usd, images[], active
kit_items      kit_id, product_id, quantity       ← un kit = combo de productos del proveedor
orders         id, user_id, supplier_id, zone_id, status, subtotal, total, created_at
order_items    order_id, item_type (PRODUCT | KIT), item_id, name_snapshot,
               price_snapshot, quantity
payments       id, order_id, method (ZELLE | SUBY), status, zelle_reference,
               receipt_url, reported_at, confirmed_at, confirmed_by
```

Decisiones clave:

- **Una orden = un proveedor.** El carrito se limita a items de un solo proveedor (si el usuario mezcla, se le avisa). Esto simplifica enormemente la liquidación manual que harás a cada proveedor.
- **Snapshots en `order_items`**: se copia nombre y precio al momento de la compra, para que cambios posteriores de precio no alteren órdenes viejas.
- **Estados de orden**: `PENDING_PAYMENT → PAYMENT_REPORTED → PAID → COMPLETED` (+ `CANCELLED`).
- **Estados de pago**: `PENDING → REPORTED → CONFIRMED / REJECTED`.
- `payments.method` ya contempla `SUBY` para que la Fase 2 no requiera migración.

## Flujo de compra Zelle (el corazón de la Fase 1)

1. Usuario elige su zona → ve proveedores y catálogo disponibles ahí.
2. Arma el carrito (productos y/o kits de un proveedor) → checkout.
3. Se crea la orden en `PENDING_PAYMENT` y se muestran las instrucciones Zelle
   (email/teléfono de la cuenta central, monto exacto, número de orden como concepto).
4. Usuario reporta el pago: número de referencia Zelle + captura del comprobante (opcional).
   La orden pasa a `PAYMENT_REPORTED`.
5. Tú verificas el Zelle en tu banco y desde el panel admin confirmas o rechazas.
   Al confirmar: orden → `PAID`, email de confirmación al cliente.
6. Coordinas entrega con el proveedor y luego le liquidas manualmente (fuera del sistema
   en esta fase; la orden guarda todo lo necesario para calcular cuánto le toca).

## Etapas de trabajo

### Etapa 0 — Fundaciones (½ día) ✅
- [x] `create-next-app` con TypeScript, Tailwind, App Router; instalar shadcn/ui.
- [ ] Repo en GitHub + proyecto en Vercel conectado (deploy automático desde el inicio).
- [ ] Crear proyecto en Neon con ramas `dev` y `prod`; variables de entorno en `.env.local` y Vercel.
- [x] Instalar Drizzle + `drizzle-kit`, configurar conexión y primera migración de prueba.

### Etapa 1 — Esquema de datos (1 día) ✅
- [x] Definir todas las tablas del modelo de arriba en Drizzle.
- [x] Migraciones aplicadas en Neon.
- [x] Script de seed: zonas iniciales (estados/ciudades donde vas a arrancar), un admin, un proveedor y productos de prueba.

### Etapa 2 — Autenticación (1 día) ✅
- [x] Sesión JWT propia (`jose`) con credenciales (email + password) — no se usó Auth.js.
- [x] Registro de clientes con selección de zona.
- [x] Middleware (`proxy.ts`): `/admin/**` solo para rol `ADMIN`, `/cuenta/**` requiere sesión.
- [ ] El catálogo es público; el login solo se exige al hacer checkout.

### Etapa 3 — Panel admin: proveedores y zonas (1–2 días)
- [ ] CRUD de zonas (jerarquía estado → ciudad).
- [ ] CRUD de proveedores: datos de contacto, logo, notas, info de liquidación.
- [ ] Asignación de zonas de cobertura a cada proveedor.

### Etapa 4 — Panel admin: productos y kits (2 días)
- [ ] CRUD de productos por proveedor: precio, stock, specs, activar/desactivar.
- [ ] Subida de imágenes a Vercel Blob (múltiples fotos por producto).
- [ ] CRUD de kits: seleccionar productos del proveedor + cantidades, precio propio del kit.
- [ ] Validación: un kit solo puede contener productos de su mismo proveedor.

### Etapa 5 — Catálogo público (2–3 días)
- [ ] Landing con propuesta de valor y selector de zona (persistido en cookie).
- [ ] Listado de proveedores que operan en la zona elegida.
- [ ] Catálogo filtrado por zona, con filtros por proveedor, tipo (producto/kit) y rango de precio.
- [ ] Página de detalle de producto (galería, specs, proveedor) y de kit (qué incluye).
- [ ] SEO básico: metadata, slugs limpios, Open Graph.

### Etapa 6 — Carrito y checkout (2 días)
- [ ] Carrito client-side (Context o Zustand) persistido en localStorage.
- [ ] Regla de un solo proveedor por carrito, con aviso claro al usuario.
- [ ] Checkout: resumen, datos de contacto/entrega, confirmación → crea orden `PENDING_PAYMENT`.
- [ ] Página "Mis órdenes" en la cuenta del usuario, con estado en tiempo real.

### Etapa 7 — Pago manual Zelle (2 días) ★ meta de la fase
- [ ] Página de instrucciones de pago post-checkout: datos Zelle de la cuenta central, monto, número de orden como referencia.
- [ ] Formulario de reporte de pago: referencia Zelle + subida de comprobante → `PAYMENT_REPORTED`.
- [ ] Panel admin de pagos: cola de pagos reportados, ver comprobante, confirmar o rechazar (rechazo con motivo, el usuario puede re-reportar).
- [ ] Emails con Resend: orden creada (con instrucciones), pago recibido/en revisión, pago confirmado, pago rechazado.
- [ ] Vista admin de órdenes con totales por proveedor (base para tus liquidaciones manuales).

### Etapa 8 — Pulido y salida a producción (1–2 días)
- [ ] Responsive completo (la mayoría comprará desde el móvil).
- [ ] Estados vacíos, loading y manejo de errores en todos los flujos.
- [ ] Dominio propio en Vercel, rama `prod` de Neon, variables de producción.
- [ ] Prueba end-to-end real: registrar usuario → comprar → reportar Zelle → confirmar como admin → recibir email.

**Total estimado: ~2 a 3 semanas** de trabajo enfocado.

## Fase 2 (fuera de alcance por ahora)
- Integración de pago automático con suby.fi (todo a la cuenta central), reutilizando `payments.method = SUBY`.
- Liquidaciones a proveedores registradas dentro del sistema.
- Portal para que los proveedores gestionen sus propios productos.
- Notificaciones por WhatsApp.
