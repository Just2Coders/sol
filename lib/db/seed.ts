import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  kitItems,
  kits,
  products,
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

const ADMIN_EMAIL = "cesarfpna@gmail.com";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

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

  console.log("\nSeed completado.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
