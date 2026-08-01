"use client";

import type { ComponentType, SVGProps } from "react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { ChevronDown } from "reicon-react";

/**
 * Las secciones de una ficha, plegadas: una fila por cosa.
 *
 * Antes eran bloques apilados y la columna medía tres pantallas: para llegar al
 * proveedor había que pasar por la descripción, el desglose y la instalación,
 * quisiera verlos o no. Plegadas, la columna entera cabe de un vistazo y el
 * visitante abre lo que le importa — que en una ficha de catálogo no es lo mismo
 * para quien compara precios que para quien ya decidió y busca la cobertura.
 *
 * Es `multiple` y no `single`: abrir el proveedor no debería cerrarte la ficha
 * técnica que estabas leyendo. La página decide cuál llega abierta.
 *
 * La fila usa el mismo vocabulario que tenían los rótulos de sección —mono en
 * minúscula, con su icono— porque es el mismo rótulo: lo único que cambia es que
 * ahora también es el interruptor. El icono no decora: dice de qué es la fila
 * antes de leerla, y el galón de la derecha es el que anuncia que se abre.
 */
export function CatalogDetailAccordion({
  defaultOpen,
  children,
}: {
  /** Las filas que llegan abiertas, por su `value`. */
  defaultOpen?: string[];
  children: React.ReactNode;
}) {
  return (
    <AccordionPrimitive.Root
      type="multiple"
      defaultValue={defaultOpen}
      className="border-border-strong border-t"
    >
      {children}
    </AccordionPrimitive.Root>
  );
}

/**
 * Una fila del acordeón. La línea de abajo llega de canto a canto —el `padding`
 * va dentro, no fuera— para que la separación se lea como un pliegue del papel y
 * no como el borde de una tarjeta.
 *
 * ## Que se vea dónde acaba una fila y empieza la siguiente
 *
 * El problema no era solo distinguir un contenido de su rótulo: era que con
 * todas las filas abiertas el bloque entero se leía como una sola cosa. Y la
 * causa es de jerarquía, no de color — la línea que separa **dos filas** era la
 * misma que las líneas de dentro de una fila (el filete de una tabla, el de una
 * lista de componentes), así que nada decía cuál de todas era el corte de
 * verdad. Pintar lo abierto de otro tono lo tapaba, no lo resolvía: con todo
 * abierto, todo era del otro tono.
 *
 * Se arregla ordenando las líneas y el aire, sin rellenos:
 *
 * 1. **El pliegue entre filas es la línea más fuerte de la columna**
 *    (`border-border-strong`). Las de dentro del contenido siguen en
 *    `border-border`, un peldaño por debajo: ahora se ve de un golpe cuál
 *    separa secciones y cuál solo ordena datos.
 * 2. **Cada fila está más cerca de su propio contenido que del pliegue
 *    siguiente**: 20px del rótulo a lo suyo, 32px de lo suyo al corte. La
 *    proximidad es la que agrupa, y no hace falta dibujarla.
 * 3. **El contenido cuelga del rótulo**, sangrado el ancho del icono, en vez de
 *    arrancar del canto de la fila como arrancaba una sección.
 * 4. **El rótulo abierto se enciende** a `text-foreground` y deja de ser
 *    marginalia: es la cabecera del bloque mientras esté abierto.
 */
export function CatalogDetailAccordionRow({
  value,
  label,
  icon: Icon,
  children,
}: {
  /** Identificador estable de la fila; es lo que nombra `defaultOpen`. */
  value: string;
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
}) {
  return (
    <AccordionPrimitive.Item
      value={value}
      className="border-border-strong border-b"
    >
      <AccordionPrimitive.Header className="flex">
        <AccordionPrimitive.Trigger className="group text-muted-foreground data-[state=open]:text-foreground data-[state=closed]:hover:bg-background data-[state=closed]:hover:text-foreground text-label lg:px-gutter focus-visible:outline-ring ease-standard flex flex-1 items-center gap-2 px-6 py-5 font-mono transition-colors duration-base focus-visible:outline-2 focus-visible:-outline-offset-2">
          {Icon && <Icon aria-hidden className="size-3.5 shrink-0" />}
          <span className="flex-1 text-left">{label}</span>
          <ChevronDown
            aria-hidden
            className="ease-standard size-3.5 shrink-0 transition-transform duration-base group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>

      <AccordionPrimitive.Content className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down ease-standard overflow-hidden duration-base">
        <div className="lg:px-gutter px-6 pb-8">
          {/* El sangrado es el ancho del icono más su hueco (`size-3.5` +
              `gap-2`): el contenido arranca justo bajo la primera letra del
              rótulo, no bajo su icono. */}
          <div className="pl-5.5">{children}</div>
        </div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}
