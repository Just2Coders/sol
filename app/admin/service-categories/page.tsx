import { verifyAdmin } from "@/lib/dal";
import { getServiceCategories } from "@/lib/service-categories/queries";
import { ServiceCategoryCreateForm } from "@/components/admin/service-category-create-form";
import { ServiceCategoryRow } from "@/components/admin/service-category-row";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Categorías de servicio — Solaris Admin" };
export const dynamic = "force-dynamic";

export default async function ServiceCategoriesPage() {
  await verifyAdmin();
  const categories = await getServiceCategories();

  // La nueva nace al final. Se calcula aquí y no en la Action porque el
  // formulario ya tiene la lista delante: es el mismo orden que se está viendo.
  const nextPosition = categories.reduce((max, c) => Math.max(max, c.position + 1), 0);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Categorías de servicio</h1>
        <p className="text-muted-foreground">
          Cómo se agrupan las instalaciones y mantenimientos. El orden de aquí es
          el que ve el cliente en la ficha de cada equipo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agregar categoría</CardTitle>
          <CardDescription>
            Se añade al final del orden; para moverla, edítala.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceCategoryCreateForm nextPosition={nextPosition} />
        </CardContent>
      </Card>

      {categories.length === 0 ? (
        <p className="text-muted-foreground">
          Aún no hay categorías. Sin al menos una no se pueden crear servicios.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-right">Orden</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">En uso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <ServiceCategoryRow key={category.id} category={category} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
