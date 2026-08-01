import { CatalogDetailSkeleton } from "@/components/catalog/catalog-detail-skeleton";

/**
 * Sin este archivo la espera de la ficha la resolvía el `loading.tsx` del
 * catálogo —que envuelve también a sus hijos— y entrar a un producto pintaba el
 * título "Catálogo" y una grilla de celdas.
 */
export default function ProductLoading() {
  return <CatalogDetailSkeleton />;
}
