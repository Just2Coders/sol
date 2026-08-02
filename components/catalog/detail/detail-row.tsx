/**
 * Una fila de dato: término a la izquierda, valor en mono a la derecha. Va dentro
 * de un `<dl>` —de ahí el `dt`/`dd`—, que es lo que es una ficha técnica.
 */
export function CatalogDetailRow({
  term,
  value,
  last = false,
}: {
  term: React.ReactNode;
  value: React.ReactNode;
  /** La última fila no lleva línea: ya la cierra el pliegue de su sección. */
  last?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 ${
        last ? "" : "border-border border-b"
      }`}
    >
      <dt className="text-muted-foreground text-body-sm">{term}</dt>
      <dd className="text-foreground text-data font-mono">{value}</dd>
    </div>
  );
}
