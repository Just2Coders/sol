/**
 * Lo que las tres variantes de pie comparten: a dónde llevan los enlaces y con
 * quién se habla. No hay componente compartido a propósito — cada variante
 * compone estos datos a su manera, que es justo lo que se está comparando.
 */

/**
 * ⚠️ PLACEHOLDER — ni el correo ni el número son reales. Cámbialos aquí y las
 * tres variantes quedan al día. Mientras sigan inventados, este pie no puede
 * salir a producción.
 */
export const CONTACT = {
  email: "hola@solaris.cu",
  /** Como se enseña, con espacios. */
  whatsapp: "+53 5 555 0000",
  /** Como lo quiere wa.me: solo dígitos, con código de país. */
  whatsappHref: "https://wa.me/5355550000",
} as const;

export type FooterLink = { label: string; href: string };

/** Qué se puede comprar. Los tres pies abren por aquí. */
export const CATALOG_LINKS: FooterLink[] = [
  { label: "Todo el catálogo", href: "/catalog" },
  { label: "Kits armados", href: "/catalog?type=kit" },
  { label: "Equipos sueltos", href: "/catalog?type=product" },
];

/**
 * Cuenta. `/account` exige sesión y el middleware manda a login con `?from=`,
 * así que sirve tanto al que ya entró como al que no.
 */
export const ACCOUNT_LINKS: FooterLink[] = [
  { label: "Mi cuenta", href: "/account" },
  { label: "Entrar", href: "/login" },
  { label: "Crear cuenta", href: "/signup" },
];

/**
 * El ancla de la sección de proveedores de la home. Vive aquí porque los tres
 * pies la usan y el id lo pone `SupplierCtaBand`.
 */
export const SUPPLIER_ANCHOR = "/#supplier";

/**
 * La letra pequeña. Son afirmaciones que el producto sostiene hoy: los precios
 * son `numeric(10,2)` en USD y la instalación la ejecuta el proveedor, no
 * Solaris. No hay enlaces legales porque todavía no existen esas páginas.
 */
export const FINE_PRINT = [
  "Precios en USD",
  "La instalación la hace el proveedor",
] as const;
