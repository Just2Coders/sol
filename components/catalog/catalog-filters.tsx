/**
 * Variante activa de la barra de filtros del catálogo.
 *
 * Las tres viven en `./filters/`, reciben las mismas props y escriben los
 * mismos query params —la lógica está en `./filters/controls.tsx`, no
 * duplicada—, así que probar otra es mover el comentario de una línea a otra.
 * Cuando esté decidida, se borran las dos que sobren y este archivo desaparece.
 *
 *   A · inline-filters      — todo en una fila, nada escondido.
 *   B · sheet-filters       — barra mínima + panel lateral.  ← activa
 *   C · disclosure-filters  — barra + segunda fila plegable.
 */
export { SheetFilters as CatalogFilters } from "./filters/sheet-filters";
// export { InlineFilters as CatalogFilters } from "./filters/inline-filters";
// export { DisclosureFilters as CatalogFilters } from "./filters/disclosure-filters";
