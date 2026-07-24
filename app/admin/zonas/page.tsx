import { verifyAdmin } from "@/lib/dal";
import { getZoneTree } from "@/lib/zones/queries";
import { ZoneCreateForm } from "@/components/admin/zone-create-form";
import { ZoneItem } from "@/components/admin/zone-item";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Zonas — Solaris Admin" };
export const dynamic = "force-dynamic";

export default async function ZonasPage() {
  await verifyAdmin();
  const states = await getZoneTree();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Zonas</h1>
        <p className="text-muted-foreground">
          Jerarquía estado → ciudad. Los clientes se registran en una ciudad y los
          proveedores declaran cobertura por ciudad.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agregar estado</CardTitle>
        </CardHeader>
        <CardContent>
          <ZoneCreateForm placeholder="Nombre del estado (ej. Miranda)" />
        </CardContent>
      </Card>

      {states.length === 0 && (
        <p className="text-muted-foreground">Aún no hay zonas. Agrega el primer estado.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {states.map((state) => (
          <Card key={state.id}>
            <CardHeader>
              <CardTitle>
                <ZoneItem zone={state} />
              </CardTitle>
              <CardDescription>
                {state.children.length === 0
                  ? "Sin ciudades"
                  : `${state.children.length} ciudad${state.children.length === 1 ? "" : "es"}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <ul className="grid gap-1 text-sm">
                {state.children.map((city) => (
                  <li key={city.id}>
                    <ZoneItem zone={city} />
                  </li>
                ))}
              </ul>
              <ZoneCreateForm parentId={state.id} placeholder="Nueva ciudad" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
