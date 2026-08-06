import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { slugify } from "../utils";
import { db } from "./index";
import {
  installationOffers,
  kitItems,
  kits,
  products,
  serviceCategories,
  services,
  supplierZones,
  suppliers,
  users,
  zones,
} from "./schema";

// Zonas iniciales de ejemplo (estado → ciudades). Ajusta a las zonas reales
// donde va a operar la plataforma; se pueden editar luego desde el panel admin.
const ZONE_TREE: Record<string, string[]> = {
  "Distrito Capital": ["Caracas"],
  Miranda: ["Los Teques", "Guarenas"],
  Carabobo: ["Valencia"],
  Zulia: ["Maracaibo"],
};

// Categorías de instalación con las que arranca la plataforma. El admin las
// edita y añade desde el panel: la lista de abajo es solo el punto de partida.
const SERVICE_CATEGORIES = [
  {
    name: "Paneles",
    slug: "panels",
    description: "Montaje y conexión de paneles sueltos, en techo o estructura.",
    position: 1,
  },
  {
    name: "Kit completo",
    slug: "full-kit",
    description: "Instalación llave en mano de un sistema completo.",
    position: 2,
  },
  {
    name: "Cableado",
    slug: "wiring",
    description: "Tendido, canalización y protecciones del cableado.",
    position: 3,
  },
];

const ADMIN_EMAIL = "cesarfpna@gmail.com";

/**
 * Fotos de demo del catálogo, ya subidas al store de Blob (`BLOB_READ_WRITE_TOKEN`).
 *
 * La clave es el slug del item, así que la misma tabla sirve a productos y kits
 * sin repetir la URL en cada `insert`: el bloque de abajo la aplica al final,
 * cuando las filas ya existen —recién creadas por este seed o de una corrida
 * anterior—. Solo rellena las que están **vacías**, para no pisar lo que el admin
 * haya cargado después.
 */
const CATALOG_PHOTOS: Record<string, string[]> = {
  "panel-solar-mono-450w": [
    "https://9lphmnrf8luyomrq.public.blob.vercel-storage.com/catalog/panel-solar-mono-450w/01.avif",
  ],
  "inversor-hibrido-3kw-24v": [
    "https://9lphmnrf8luyomrq.public.blob.vercel-storage.com/catalog/inversor-hibrido-3kw-24v/01.avif",
  ],
  "bateria-lifepo4-24v-100ah": [
    "https://9lphmnrf8luyomrq.public.blob.vercel-storage.com/catalog/bateria-lifepo4-24v-100ah/01.avif",
  ],
  "kit-solar-residencial-3kw": [
    "https://9lphmnrf8luyomrq.public.blob.vercel-storage.com/catalog/kit-solar-residencial-3kw/01.avif",
  ],
};

async function main() {
  // ── Zonas ──
  for (const [stateName, cities] of Object.entries(ZONE_TREE)) {
    const [state] = await db
      .insert(zones)
      .values({ name: stateName, slug: slugify(stateName) })
      .onConflictDoNothing({ target: zones.slug })
      .returning();

    const stateId =
      state?.id ??
      (await db.query.zones.findFirst({ where: eq(zones.slug, slugify(stateName)) }))!.id;

    for (const city of cities) {
      await db
        .insert(zones)
        .values({ name: city, slug: slugify(city), parentId: stateId })
        .onConflictDoNothing({ target: zones.slug });
    }
  }
  console.log("✓ Zonas creadas");

  // ── Admin ──
  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.email, ADMIN_EMAIL),
  });

  if (!existingAdmin) {
    const tempPassword = randomBytes(9).toString("base64url");
    await db.insert(users).values({
      name: "Admin",
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(tempPassword, 10),
      role: "ADMIN",
    });
    console.log(`✓ Admin creado: ${ADMIN_EMAIL}`);
    console.log(`  Contraseña temporal: ${tempPassword}`);
    console.log("  (cámbiala cuando el login esté listo en la Etapa 2)");
  } else {
    console.log("✓ Admin ya existe, sin cambios");
  }

  // ── Categorías de servicio ──
  await db
    .insert(serviceCategories)
    .values(SERVICE_CATEGORIES)
    .onConflictDoNothing({ target: serviceCategories.slug });
  console.log("✓ Categorías de servicio creadas");

  // ── Proveedor de prueba con productos y kit ──
  const supplierSlug = "solar-demo";
  let supplier = await db.query.suppliers.findFirst({
    where: eq(suppliers.slug, supplierSlug),
  });

  if (!supplier) {
    [supplier] = await db
      .insert(suppliers)
      .values({
        name: "Solar Demo C.A.",
        slug: supplierSlug,
        phone: "+58 412 0000000",
        email: "ventas@solardemo.example",
        notes: "Proveedor de prueba — eliminar antes de salir a producción.",
        payoutInfo: "Zelle: pagos@solardemo.example",
      })
      .returning();

    const caracas = await db.query.zones.findFirst({ where: eq(zones.slug, "caracas") });
    const valencia = await db.query.zones.findFirst({ where: eq(zones.slug, "valencia") });
    await db.insert(supplierZones).values(
      [caracas, valencia]
        .filter((z) => z != null)
        .map((z) => ({ supplierId: supplier!.id, zoneId: z.id })),
    );

    const [panel] = await db
      .insert(products)
      .values({
        supplierId: supplier.id,
        name: "Panel Solar Monocristalino 450W",
        slug: "panel-solar-mono-450w",
        description:
          "Panel monocristalino de alta eficiencia, ideal para instalaciones residenciales.",
        specs: { potencia: "450W", tipo: "Monocristalino", garantia: "10 años" },
        priceUsd: 185,
        stock: 25,
      })
      .returning();

    const [inverter] = await db
      .insert(products)
      .values({
        supplierId: supplier.id,
        name: "Inversor Híbrido 3KW 24V",
        slug: "inversor-hibrido-3kw-24v",
        description: "Inversor híbrido con cargador MPPT integrado.",
        specs: { potencia: "3000W", voltaje: "24V", tipo: "Híbrido MPPT" },
        priceUsd: 420,
        stock: 10,
      })
      .returning();

    const [battery] = await db
      .insert(products)
      .values({
        supplierId: supplier.id,
        name: "Batería LiFePO4 24V 100Ah",
        slug: "bateria-lifepo4-24v-100ah",
        description: "Batería de litio de ciclo profundo, más de 4000 ciclos.",
        specs: { capacidad: "100Ah", voltaje: "24V", quimica: "LiFePO4" },
        priceUsd: 650,
        stock: 8,
      })
      .returning();

    const [kit] = await db
      .insert(kits)
      .values({
        supplierId: supplier.id,
        name: "Kit Solar Residencial 3KW",
        slug: "kit-solar-residencial-3kw",
        description:
          "Sistema completo para respaldo residencial: 4 paneles de 450W, inversor híbrido de 3KW y batería de litio.",
        priceUsd: 1699, // menor que comprar los componentes por separado ($1.810)
      })
      .returning();

    await db.insert(kitItems).values([
      { kitId: kit.id, productId: panel.id, quantity: 4 },
      { kitId: kit.id, productId: inverter.id, quantity: 1 },
      { kitId: kit.id, productId: battery.id, quantity: 1 },
    ]);

    console.log("✓ Proveedor de prueba creado con 3 productos y 1 kit");
  } else {
    console.log("✓ Proveedor de prueba ya existe, sin cambios");
  }

  // ── Servicios de instalación del proveedor de prueba ──
  // En bloque propio (no dentro del `if` de arriba) para que el seed los añada
  // también en una base que ya tenía el proveedor de antes.
  const kitServiceSlug = "full-kit-installation";
  const existingService = await db.query.services.findFirst({
    where: eq(services.slug, kitServiceSlug),
  });

  if (!existingService) {
    const categoryBySlug = new Map(
      (
        await db.query.serviceCategories.findMany({
          columns: { id: true, slug: true },
        })
      ).map((category) => [category.slug, category.id]),
    );

    const [kitInstall] = await db
      .insert(services)
      .values({
        supplierId: supplier.id,
        categoryId: categoryBySlug.get("full-kit")!,
        name: "Instalación de kit completo",
        slug: kitServiceSlug,
        description:
          "Montaje, conexión y puesta en marcha del sistema completo. Incluye materiales de fijación y una revisión a los 30 días.",
        pricing: "FLAT",
        priceUsd: 350,
        // Solo sobre kits propios: la revisión a los 30 días es responder por el
        // conjunto, y eso no se hace sobre equipo que no vendiste.
        equipmentScope: "OWN",
      })
      .returning();

    const [panelInstall] = await db
      .insert(services)
      .values({
        supplierId: supplier.id,
        categoryId: categoryBySlug.get("panels")!,
        name: "Instalación de paneles",
        slug: "panel-installation",
        description:
          "Montaje y conexión de paneles ya comprados, sobre techo o estructura existente.",
        pricing: "PER_UNIT",
        priceUsd: 25,
        unitLabel: "panel",
        // "Ya comprados" es literal: este trabajo no pregunta de dónde salió el
        // panel, así que es el ejemplo del extremo abierto.
        equipmentScope: "ANY",
      })
      .returning();

    // Las dos formas de vender lo mismo: estas ofertas ponen el "añadir
    // instalación" en la ficha del kit y del panel; sin ellas, los servicios se
    // seguirían vendiendo solos desde su propia ficha.
    const kit = await db.query.kits.findFirst({
      where: eq(kits.slug, "kit-solar-residencial-3kw"),
      columns: { id: true },
    });
    const panel = await db.query.products.findFirst({
      where: eq(products.slug, "panel-solar-mono-450w"),
      columns: { id: true },
    });

    const offers = [
      kit && { serviceId: kitInstall.id, targetType: "KIT" as const, targetId: kit.id },
      panel && {
        serviceId: panelInstall.id,
        targetType: "PRODUCT" as const,
        targetId: panel.id,
      },
    ].filter((offer) => offer != null);

    if (offers.length > 0) await db.insert(installationOffers).values(offers);

    console.log("✓ Servicios de instalación creados (uno fijo, uno por unidad)");
  } else {
    console.log("✓ Servicios de instalación ya existen, sin cambios");
  }

  // ── Fotos del catálogo ──
  // También fuera del `if`, y por el mismo motivo que los servicios: una base que
  // ya tenía el proveedor de antes se quedó sin fotos, y este bloque se las pone.
  let photographed = 0;
  for (const [slug, images] of Object.entries(CATALOG_PHOTOS)) {
    const table = slug.startsWith("kit-") ? kits : products;
    const updated = await db
      .update(table)
      .set({ images })
      // `cardinality` en vez de comparar con `'{}'`: dice lo mismo y se lee.
      .where(sql`${table.slug} = ${slug} and cardinality(${table.images}) = 0`)
      .returning({ id: table.id });
    photographed += updated.length;
  }
  console.log(
    photographed > 0
      ? `✓ Fotos de Blob asignadas a ${photographed} item(s) del catálogo`
      : "✓ Los items del catálogo ya tienen fotos, sin cambios",
  );

  // ── Libro mayor y línea de precios ──
  // Lo mismo que hizo el backfill de la migración `0007`, pero para lo que nazca
  // después: una base recién sembrada tiene que cumplir las dos invariantes desde
  // el primer minuto, o `scripts/check-inventory-invariants.ts` sale en rojo.
  //
  // Va al final y fuera de cualquier `if` a propósito: recoge lo que haya, lo
  // acabe de crear este seed o estuviera de antes. Los `not exists` lo hacen
  // repetible.
  const opened = await db.execute(sql`
    insert into stock_movements (product_id, delta, reason, note)
    select p.id, p.stock, 'OPENING'::stock_movement_reason,
           'Saldo de apertura al crear el libro mayor'
      from products p
     where not exists (
       select 1 from stock_movements m
        where m.product_id = p.id and m.reason = 'OPENING'
     )
    returning id
  `);
  console.log(
    opened.rows.length > 0
      ? `✓ Saldo de apertura escrito para ${opened.rows.length} producto(s)`
      : "✓ Todos los productos ya tienen saldo de apertura",
  );

  // El precio se fecha en el nacimiento del item, no en el de hoy: así la línea
  // de tiempo cubre toda su vida sin un hueco en el que no había precio.
  let priced = 0;
  for (const [kind, table] of [
    ["PRODUCT", products],
    ["KIT", kits],
    ["SERVICE", services],
  ] as const) {
    const inserted = await db.execute(sql`
      insert into price_schedules (target_type, target_id, price_usd, starts_at, note)
      select ${kind}::priceable_type, t.id, t.price_usd, t.created_at,
             'Precio vigente al crear la línea de tiempo'
        from ${table} t
       where not exists (
         select 1 from price_schedules s
          where s.target_type = ${kind}::priceable_type and s.target_id = t.id
       )
      returning id
    `);
    priced += inserted.rows.length;
  }
  console.log(
    priced > 0
      ? `✓ Precio inicial escrito para ${priced} item(s)`
      : "✓ Todos los items ya tienen su línea de precios",
  );

  console.log("\nSeed completado.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
