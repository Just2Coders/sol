/**
 * Las dos invariantes del inventario, como una query cada una.
 *
 * Son lo que hace segura la doble contabilidad: `products.stock` y
 * `products.price_usd` son cachés de algo que vive en otra tabla, y esto
 * comprueba que no han descuadrado. Se puede correr en cualquier momento.
 *
 *   npx tsx --conditions=react-server --env-file=.env.local \
 *     scripts/check-inventory-invariants.ts
 *
 * Sale con código 1 si algo no cuadra, para poder colgarlo de CI el día que
 * `lib/inventory/` empiece a escribir de verdad.
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

type Row = Record<string, unknown>;

async function query(text: string): Promise<Row[]> {
  const result = await db.execute(sql.raw(text));
  return (result.rows ?? result) as unknown as Row[];
}

async function main() {
  let failed = false;

  // 1 — El saldo es la suma de su libro mayor.
  const stockDrift = await query(`
    select p.name, p.stock, coalesce(sum(m.delta), 0)::int as ledger
    from products p
    left join stock_movements m on m.product_id = p.id
    group by p.id, p.name, p.stock
    having p.stock <> coalesce(sum(m.delta), 0)
  `);

  console.log("── stock = sum(movimientos) ──");
  if (stockDrift.length === 0) {
    console.log("  ✓ cuadra en todos los productos");
  } else {
    failed = true;
    console.log(`  ✗ ${stockDrift.length} producto(s) descuadrados:`);
    for (const row of stockDrift) console.log(`    ${JSON.stringify(row)}`);
  }

  // 2 — Lo reservado es la suma de las reservas vivas.
  const reservedDrift = await query(`
    select p.name, p.reserved, coalesce(sum(r.quantity), 0)::int as held
    from products p
    left join stock_reservations r
      on r.product_id = p.id and r.status = 'HELD'
    group by p.id, p.name, p.reserved
    having p.reserved <> coalesce(sum(r.quantity), 0)
  `);

  console.log("\n── reserved = sum(reservas HELD) ──");
  if (reservedDrift.length === 0) {
    console.log("  ✓ cuadra en todos los productos");
  } else {
    failed = true;
    console.log(`  ✗ ${reservedDrift.length} producto(s) descuadrados:`);
    for (const row of reservedDrift) console.log(`    ${JSON.stringify(row)}`);
  }

  // 3 — El precio de la tabla es el efectivo de su línea de tiempo.
  //
  // `distinct on` toma la fila de mayor `starts_at` que ya haya empezado, que es
  // exactamente la definición de "precio efectivo".
  const priceDrift = await query(`
    with effective as (
      select distinct on (target_type, target_id)
             target_type, target_id, price_usd
      from price_schedules
      where starts_at <= now()
      order by target_type, target_id, starts_at desc
    )
    select 'PRODUCT' as kind, p.name, p.price_usd as cached, e.price_usd as scheduled
      from products p left join effective e
        on e.target_type = 'PRODUCT' and e.target_id = p.id
     where e.price_usd is distinct from p.price_usd
    union all
    select 'KIT', k.name, k.price_usd, e.price_usd
      from kits k left join effective e
        on e.target_type = 'KIT' and e.target_id = k.id
     where e.price_usd is distinct from k.price_usd
    union all
    select 'SERVICE', s.name, s.price_usd, e.price_usd
      from services s left join effective e
        on e.target_type = 'SERVICE' and e.target_id = s.id
     where e.price_usd is distinct from s.price_usd
  `);

  console.log("\n── price_usd = precio efectivo del schedule ──");
  if (priceDrift.length === 0) {
    console.log("  ✓ cuadra en productos, kits y servicios");
  } else {
    failed = true;
    console.log(`  ✗ ${priceDrift.length} item(s) descuadrados:`);
    for (const row of priceDrift) console.log(`    ${JSON.stringify(row)}`);
  }

  const [counts] = await query(`
    select (select count(*) from stock_movements) as movimientos,
           (select count(*) from price_schedules) as precios,
           (select count(*) from products) as productos,
           (select count(*) from kits) as kits,
           (select count(*) from services) as servicios
  `);
  console.log("\n── filas tras el backfill ──");
  console.log(`  ${JSON.stringify(counts)}`);

  if (failed) process.exit(1);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
