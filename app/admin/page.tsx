import Link from "next/link";
import { verifyAdmin } from "@/lib/dal";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Panel admin — Solaris" };

const SECTIONS = [
  {
    href: "/admin/zonas",
    title: "Zonas",
    description: "Estados y ciudades donde opera la plataforma.",
  },
  {
    href: "/admin/proveedores",
    title: "Proveedores",
    description: "Datos de contacto, liquidación y zonas de cobertura.",
  },
] as const;

export default async function AdminPage() {
  await verifyAdmin();

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Panel de administración</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full transition-colors hover:bg-accent/50">
              <CardHeader>
                <CardTitle>{s.title}</CardTitle>
                <CardDescription>{s.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Productos, kits y pagos llegan en las Etapas 4 y 7.
      </p>
    </div>
  );
}
