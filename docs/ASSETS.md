# Assets — Solaris

> Qué imágenes, vídeos y grafismos le faltan a la landing para dejar de estar
> hueca, dónde va cada uno, con qué medidas, y el prompt listo para pegar.
>
> Los **iconos** no están aquí: viven en [`ICONS.md`](ICONS.md) y se dibujan
> como SVG, nunca se generan como imagen. Las **reglas de color y tokens**
> tampoco: están en [`../AGENTS.md`](../AGENTS.md#design-system).

---

## 1. Antes de generar nada: qué se puede inventar y qué no

La landing tiene dos clases de hueco y no se rellenan igual.

**Generable sin problema** — atmósfera, producto y fondo. Nadie afirma nada que
no sea verdad: una casa cubana al atardecer es una imagen de lo que vendemos,
no el testimonio de un cliente.

- Hero y sus variantes.
- Fondo de la banda de proveedores.
- Producto sobre fondo neutro (catálogo).
- Texturas, OG, marca.

**Placeholder de desarrollo, nunca producción** — todo lo que la página
presenta como *un proveedor real*: las nueve fotos de `KitProviders` y las
cinco de `Trust`. `photo-hole.tsx` lo dice con todas las letras y tiene razón:
la sección de confianza existe para que el visitante sepa quién le entra en
casa; llenarla con un equipo generado —caras sintéticas incluidas— es el
engaño que esa sección venía a evitar.

Si igualmente quieres verlas para juzgar la forma, los prompts están abajo
marcados con ⚠️. Van a `public/images/_placeholder/`, esa carpeta entra en
`.gitignore`, y no salen de local. Lo que sale a producción son las fotos que
manden los proveedores; hasta entonces, el hueco rotulado de `PhotoHole` es
más honesto que cualquier cosa que genere un modelo.

---

## 2. Dirección de arte común

Pega este bloque **delante de cada prompt fotográfico**. Es lo que hace que
catorce imágenes generadas en catorce sesiones distintas parezcan la misma
campaña.

```
DIRECCIÓN DE ARTE — "Taller Solar Caribeño"

Fotografía documental real, no render ni ilustración. Cámara full frame, focal
35–50 mm, diafragma medio: el sujeto nítido y el fondo legible, nunca un bokeh
cremoso de foto de producto. Plano amplio y calmado, horizonte recto, sin
picados ni contrapicados dramáticos.

Luz: natural cubana de media tarde o atardecer temprano — cálida, lateral,
sombras largas y blandas. Nada de flash, nada de HDR, nada de cielo azul
saturado de postal. Las altas luces pueden quemarse un poco; el grano fino es
bienvenido.

Paleta: neutros cálidos y polvorientos. Hueso #f2ecdf, tinta verdosa #2b2a24,
terracota #a34e22, verde apagado #b8c4ac. El único acento saturado permitido es
un naranja #f2550c, y solo si aparece como un objeto pequeño (un casco, una
brida, un cable). Nada de azul frío ni de verde eléctrico.

Contexto: Cuba. Arquitectura de barrio real —bloque, mampostería pintada y
descascarillada, rejas, techo plano con pretil, tanque de agua, tendedero,
palma o mata de plátano al fondo—. Ropa de trabajo sencilla y usada, no
uniformes corporativos nuevos.

Evita: gente sonriendo a cámara, estética de banco de imágenes, poses de
"equipo triunfador" con los brazos cruzados, cascos y chalecos impecables de
catálogo, iluminación de estudio, viñeteado, marcas de agua.

SIN TEXTO DE NINGÚN TIPO en la imagen: ni rótulos, ni logotipos, ni marcas en
la ropa, ni números en los equipos. Todo el texto lo pone la interfaz.
```

**Cómo pedir el formato en GPT Image 2:** las tres proporciones nativas son
`1024×1024` (cuadrado), `1536×1024` (apaisado 3:2) y `1024×1536` (vertical
2:3). Cada ficha de abajo dice cuál pedir y a qué encuadre final se recorta.
Para el hero hace falta subir de resolución después (§7).

---

## 3. Inventario por sección

| # | Dónde | Qué falta | Formato pedido | Archivo final | Estado |
|---|---|---|---|---|---|
| H1 | `hero.tsx` | Foto del hero | 1536×1024 → 2560×1440 | `public/images/hero-home.jpg` | ✅ existe, opcional rehacer |
| H2 | `hero.tsx` | Recorte vertical para móvil | 1024×1536 | `public/images/hero-home-portrait.jpg` | ❌ falta |
| S1 | `supplier-cta-band.tsx` | Fondo de la banda oscura | 1536×1024 → 2560×1200 | `public/images/supplier-band-bg.jpg` | ❌ falta — **es el hueco que preguntabas** |
| S2 | `supplier-cta-band.tsx` | 3 retratos de proveedor | 1024×1024 ×3 | `public/images/suppliers/*.jpg` | ❌ falta (⚠️ ver §1) |
| O1–O3 | `kit-providers.tsx` | 9 fotos de kit instalado (3 kits × 3 proveedores) | 1536×1024 ×9 | `public/images/offers/<kitSlug>-<supplierSlug>.jpg` | ⚠️ placeholder |
| T1 | `trust.tsx` (equipo 1) | 1 plano grande de cuadrilla | 1536×1024 | `public/images/trust/team-install.jpg` | ⚠️ placeholder |
| T2–T5 | `trust.tsx` (equipo 2) | Tira de 4 verticales | 1024×1536 ×4 | `public/images/trust/strip-*.jpg` | ⚠️ placeholder |
| M1 | `app/icon.svg` | Isotipo / favicon | SVG dibujado | `app/icon.svg` | ❌ falta (hoy, el `favicon.ico` de Next) |
| M2 | `app/opengraph-image.tsx` | Tarjeta social 1200×630 | **código**, no imagen | `app/opengraph-image.tsx` | ❌ falta |
| X1 | `globals.css` | Grano de papel sobre `--background` | **SVG en CSS** | inline | opcional |
| V1 | `hero.tsx` | Loop de vídeo del hero | mp4 + webm, 6 s | `public/video/hero-loop.*` | opcional |
| V2 | `supplier-cta-band.tsx` | Loop de obra detrás de la banda | mp4 + webm, 8 s | `public/video/supplier-loop.*` | opcional |

Aparte: `public/next.svg`, `vercel.svg`, `file.svg`, `globe.svg` y `window.svg`
son el boilerplate de `create-next-app` y no los usa nadie. Se borran.

---

## 4. Prompts — fotografía

### H1 · Hero (rehacer, opcional)

Ya hay una en `public/images/hero-home.jpg`. Si la rehaces, ten en cuenta que
el encuadre se muestra al **72% horizontal** (`object-[72%_center]`) y que el
tercio inferior lo tapa el scrim y el titular: **el sujeto tiene que vivir en
la mitad derecha y en los dos tercios de arriba**.

Pide `1536×1024`.

```
[DIRECCIÓN DE ARTE]

Plano general de una casa cubana de barrio al atardecer, vista desde la calle
en diagonal. Techo plano con pretil bajo y, sobre él, cuatro paneles solares
montados en estructura metálica sencilla, inclinados hacia el sol bajo. La casa
ocupa la mitad derecha del encuadre; la mitad izquierda es cielo abierto de
atardecer, limpio, con degradado de naranja polvoriento a azul grisáceo.

Ventanas iluminadas por dentro con luz cálida —la casa está encendida mientras
la calle empieza a oscurecer—. Un tanque de agua, un tendedero y una palma
detrás. La acera y parte de la calle en el borde inferior, en penumbra.

El tercio inferior de la imagen debe quedar tranquilo y sin detalle importante:
ahí va texto encima. Nada de gente en primer plano.

Formato apaisado 3:2.
```

### H2 · Hero vertical para móvil

Mismo momento, encuadre de pie. Pide `1024×1536`.

```
[DIRECCIÓN DE ARTE]

La misma casa cubana del atardecer con paneles solares en el techo plano, pero
en encuadre vertical y más cerrado: la fachada llena el tercio superior, el
cielo de atardecer entra por arriba, y los dos tercios inferiores son la calle
en penumbra y la acera, tranquilos y sin detalle.

Ventanas encendidas con luz cálida. Sin gente. Formato vertical 2:3.
```

### S1 · Fondo de la banda de proveedores ← *el hueco de tu pregunta*

Hoy la sección `#supplier` es tipografía sobre lienzo de tinta y nada más. La
cifra grande aguanta sola, pero la sección le habla a otro interlocutor y no
tiene ni una imagen que le diga «esto va contigo».

La forma correcta aquí **no es una foto que compita con el número**, sino una
imagen de fondo muy oscurecida detrás del lienzo: se percibe la escena, no se
lee el detalle. Genera claro y luego la oscurece el scrim en CSS (mismo patrón
que `--scrim-hero`, en tono `--canvas`).

Pide `1536×1024`.

```
[DIRECCIÓN DE ARTE]

Plano cenital, desde arriba, de un techo plano cubano con una instalación solar
recién terminada: seis paneles alineados sobre estructura metálica, las
canaletas del cableado bajando ordenadas hacia un lateral, y alrededor el
material del techo —impermeabilizante gris, un pretil bajo, un tanque de agua,
la sombra alargada de la estructura sobre la losa—.

Composición geométrica y ordenada, casi abstracta: rectángulos oscuros de los
paneles contra el gris cálido del techo. Luz de media tarde, sombras largas y
diagonales. Sin personas. Sin texto.

El centro del encuadre debe ser el más tranquilo y uniforme de toda la imagen:
encima va a ir un número enorme y un titular. El interés visual vive en los
bordes.

Formato apaisado 3:2, encuadre amplio.
```

**Cómo montarla** (para cuando la tengas): `next/image` con `fill` dentro de la
`<section>`, `object-cover`, y encima un `div` con el scrim en tono `--canvas`
al 88–92% de opacidad. Habrá que añadir un token `--scrim-canvas` en
`globals.css` — no se escribe el degradado inline.

### S2 · ⚠️ Retratos de proveedor (placeholder)

Tres cuadrados para una tira de credibilidad debajo del botón de la banda
(«los que ya vendían por su cuenta y ahora venden aquí»). Cara sintética
presentada como proveedor real: **solo local**.

Pide `1024×1024` ×3, cambiando la línea marcada.

```
[DIRECCIÓN DE ARTE]

Retrato ambiental de medio cuerpo de un instalador solar cubano en su lugar de
trabajo, mirando ligeramente fuera de cámara, expresión serena y seria — no
sonriente. Ropa de trabajo real, usada. Detrás, desenfocado pero reconocible,
su taller o el techo donde trabaja.

VARIANTE: [1: hombre de unos 50 años, en un patio con paneles apoyados en la
pared | 2: mujer de unos 35 años, con multímetro en la mano, junto a un tablero
eléctrico | 3: hombre joven de unos 25 años, sentado en el borde de un techo
plano al atardecer]

Luz natural lateral. Formato cuadrado 1:1, el sujeto descentrado hacia un lado.
```

### O1–O3 · ⚠️ Fotos de las fichas de oferta (9, placeholder)

Se ven a ~420×300 px en la ficha, así que **la instalación tiene que leerse de
un vistazo**: paneles grandes en el encuadre, nada de planos generales donde el
kit sea un detalle. Pide `1536×1024` y recorta a 7:5.

Un prompt por kit, y dentro tres variantes de entorno para los tres proveedores
(`solarcaribe`, `techo-solar-habana`, `energia-oriente`). Los nombres de archivo
usan los slugs que ya están en `lib/kits/offers.ts`.

**Kit básico** — 2 paneles, poca cosa, casa modesta:

```
[DIRECCIÓN DE ARTE]

Instalación solar pequeña recién terminada, vista desde el techo mismo a la
altura del pecho: dos paneles solares sobre estructura metálica ligera en el
techo plano de una casa cubana modesta. Junto a ellos, en la pared, una batería
compacta y un pequeño inversor montados y cableados con orden.

La instalación llena el encuadre y se entiende sin esfuerzo. Media tarde, luz
lateral. Sin personas, sin texto.

ENTORNO: [solarcaribe: pueblo del centro de la isla, casas bajas y mucha
vegetación al fondo | techo-solar-habana: azotea urbana de La Habana, otros
techos y depósitos de agua alrededor | energia-oriente: casa de campo
oriental, montañas azuladas en el horizonte]

Formato apaisado 3:2.
```

**Kit casa** — 4 paneles y sistema visible en pared:

```
[DIRECCIÓN DE ARTE]

Instalación solar doméstica completa y terminada, vista desde el techo: cuatro
paneles solares alineados sobre estructura metálica en un techo plano cubano,
y en la pared del cuarto de servicio un inversor híbrido con dos baterías
debajo, todo cableado en canaleta, limpio y ordenado.

Los paneles ocupan la mitad superior del encuadre, el equipo de pared la
inferior derecha. Luz de media tarde. Sin personas, sin texto.

ENTORNO: [solarcaribe: pueblo del centro, vegetación al fondo |
techo-solar-habana: azotea habanera con la ciudad detrás | energia-oriente:
casa oriental con montañas al fondo]

Formato apaisado 3:2.
```

**Kit negocio** — 8 paneles, escala de local comercial:

```
[DIRECCIÓN DE ARTE]

Instalación solar de escala comercial terminada sobre el techo plano de un
pequeño negocio cubano: ocho paneles solares en dos filas sobre estructura
metálica robusta, con el cableado recogido en canaletas que bajan por un
lateral hacia un tablero eléctrico exterior.

Plano ligeramente elevado que abarca las dos filas enteras. Media tarde, sombras
largas. Sin personas, sin texto.

ENTORNO: [solarcaribe: cafetería de pueblo, toldo y sillas abajo |
techo-solar-habana: local urbano, azotea con otros edificios detrás |
energia-oriente: taller o almacén rural, terreno abierto alrededor]

Formato apaisado 3:2.
```

### T1 · ⚠️ Plano grande del equipo 1 (placeholder)

Se ve a ~760×420 px al lado de la columna de datos. Alineación `center`.

Pide `1536×1024`.

```
[DIRECCIÓN DE ARTE]

Cuadrilla de tres instaladores trabajando en el montaje de paneles solares
sobre un techo plano cubano, a media faena: uno arrodillado apretando la
estructura, otro sosteniendo el borde de un panel, el tercero de pie
comprobando el cableado. Nadie mira a cámara.

Plano general desde una esquina del techo que incluye el cielo de media tarde y
el barrio al fondo. Herramientas y material repartidos por el suelo del techo.
Ropa de trabajo sencilla, gastada, nada de uniformes nuevos.

Sin texto ni logotipos. Formato apaisado 3:2.
```

### T2–T5 · ⚠️ Tira de cuatro verticales (placeholder)

En escritorio, las cuatro se ponen en fila dentro de un bloque de 420 px de
alto: cada una queda **estrecha y alta** (~1:2). Genera en `1024×1536` y
recorta al centro. La alineación es `bottom`: la parte de abajo lleva un rótulo
mono encima, así que **el detalle importante va arriba**.

Los rótulos del código son los cuatro temas, en este orden:

```
[DIRECCIÓN DE ARTE]

Plano vertical y cerrado, formato 2:3, con el sujeto en la mitad superior del
encuadre y la parte inferior más tranquila y oscura.

TEMA: [1 · «cuadrilla en obra»: dos instaladores de espaldas subiendo un panel
por una escalera hacia el techo | 2 · «panel instalado, techo plano»: un panel
solar montado, visto desde abajo en contrapicado suave contra el cielo de
atardecer, con la estructura metálica y el pretil del techo | 3 · «tablero e
inversor»: detalle frontal de un inversor híbrido y un tablero eléctrico en una
pared exterior encalada, cableado ordenado en canaleta | 4 · «entrega y
capacitación»: un instalador señalando la pantalla del inversor a una mujer
mayor que escucha, los dos de perfil, en el pasillo de una casa]

Luz natural. Sin texto, sin logotipos, sin miradas a cámara.
```

---

## 5. Assets que NO son fotografía

### M1 · Isotipo y favicon — **se dibuja, no se genera**

Hoy la marca es la palabra `solaris` compuesta en Bricolage, y en el pie va
estirada con `textLength` de margen a margen. Funciona. Lo que falta es la
marca **cuadrada** para la pestaña, el móvil y el avatar: ahí la palabra no
cabe.

Mismo razonamiento que `ICONS.md` §1: un glifo a 32 px es geometría exacta, no
una ilustración. Que salga SVG, no PNG.

```
Dibuja un ISOTIPO en SVG para "Solaris", una plataforma cubana de kits solares.
Devuelve solo el código SVG.

- viewBox "0 0 32 32". Fondo transparente (sin <rect> de fondo).
- Una sola forma, rellena, fill="currentColor". Ni stroke, ni degradados, ni
  segundo color, ni opacidades.
- Todo el dibujo dentro de 3–29. Ópticamente centrado.

El dibujo: una "s" minúscula geométrica de palo seco, muy pesada, cuyo trazo se
resuelve como un sol partido — el contorno exterior de la letra sugiere un
disco y el corte interior, el horizonte. La lectura debe funcionar en los dos
sentidos: quien busca una S la ve; quien busca un sol, también.

Alternativa a explorar en la misma respuesta: un disco sólido cortado por una
banda horizontal del ancho del hueco, con la mitad inferior desplazada un paso
a la derecha — el sol partiéndose al ponerse.

Que se lea a 16px sin empastarse: ningún hueco interior más estrecho que 2
unidades. Esquinas redondeadas generosas, radio 1 o mayor.

Devuelve ambas variantes como dos SVG separados.
```

Después: `app/icon.svg` (Next lo sirve como favicon solo, sin config) y
`app/apple-icon.png` a 180×180 exportado del mismo SVG sobre `--background`.
El `app/favicon.ico` de Next se borra en el mismo commit.

### M2 · Tarjeta Open Graph — **se construye en código**

`app/layout.tsx` ya declara `openGraph`, pero no hay imagen: cada enlace que se
comparta por WhatsApp —el canal real de este producto— sale gris.

**No la generes con un modelo de imagen.** Va con `ImageResponse` de
`next/og` en `app/opengraph-image.tsx`: tipografía nítida a 1200×630, los
tokens de verdad, y la cifra de provincias con cobertura leída del servidor —
o sea, una tarjeta que se actualiza sola cuando entra un proveedor nuevo. Un
PNG generado envejece el día que cambie la cifra.

Composición propuesta: fondo `--canvas`, `solaris` en Bricolage 800 arriba a la
izquierda, el titular del hero a `text-display-1` en `--foreground-inverse`, y
abajo la marginalia mono `N provincias con proveedor`.

### X1 · Grano de papel — **se genera en CSS**

El fondo `#f2ecdf` es un hueso plano y en pantallas grandes se nota liso. Un
grano finísimo lo asienta.

Tampoco es un PNG: `feTurbulence` en un SVG embebido pesa 300 bytes y escala a
cualquier resolución. Va como token en `globals.css`:

```css
--texture-grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
```

Se aplica en un pseudoelemento del `body` con `pointer-events: none`. Ojo:
`check:tokens` querrá verlo registrado en el `@theme inline`.

### Logotipos de proveedor

Los tres proveedores del mock no tienen marca, y **no hay que inventársela**:
una tarjeta con un logotipo generado es la misma mentira que la foto falsa. En
el alta manual se les pide el suyo; mientras tanto, el nombre compuesto en
Bricolage ya es la marca provisional y se ve bien.

---

## 6. Movimiento

Todo esto es opcional y ninguno bloquea el lanzamiento. Por orden de lo que de
verdad aporta:

### V1 · Loop del hero

El argumento entero del producto es «se va la luz, tu casa sigue encendida», y
eso es un cambio en el tiempo que una foto fija no puede contar.

- 6 s, sin sonido, `loop muted playsinline`, `poster` = la foto H1.
- mp4 (H.264) + webm (VP9), ≤ 1.5 MB cada uno.
- Detrás de `prefers-reduced-motion`: si el usuario lo pide, se queda la foto.

El camino más fiable es **imagen a vídeo** partiendo de H1 ya aprobada, no
texto a vídeo. Tienes el MCP de Higgsfield conectado (`generate_video`).

```
Anima esta fotografía con movimiento mínimo y realista, como un plano fijo de
cámara en trípode. Sin movimiento de cámara: ni zoom, ni paneo, ni dolly.

Lo único que se mueve: las hojas de la palma y el tendedero con la brisa, un
leve cambio de la luz del atardecer, y —en el segundo 3— las ventanas de las
casas del fondo se apagan de golpe mientras las de la casa con paneles siguen
encendidas.

6 segundos. Sin gente. Sin texto sobreimpreso. El último fotograma debe casar
con el primero para poder repetirse en bucle.
```

### V2 · Loop detrás de la banda de proveedores

Mismo tratamiento que V1 partiendo de S1: el plano cenital del techo con las
sombras de la estructura desplazándose muy despacio. Casi imperceptible, que es
el punto — debajo hay un número de 100 px que no se puede perturbar.

### Lo que NO hace falta como asset

- **GIF: ninguno.** Pesa diez veces más que un webm y se ve peor. Si algo tiene
  que moverse en bucle, es vídeo o es CSS.
- **La animación del apagón** (bombilla que parpadea y se apaga) es un SVG con
  `animate` o un keyframe, no un archivo. Cae dentro del encargo de `blackout`
  en [`ICONS.md`](ICONS.md) §4.8.
- **Lottie:** no está en el proyecto y no compensa meter el runtime por un solo
  detalle.

---

## 7. Cómo entregar las imágenes

- **Formato:** exporta a `.jpg` de calidad 82. Next convierte a AVIF/WebP en
  `next/image`; guardar el original ya en webp solo pierde calidad dos veces.
- **Peso:** hero ≤ 400 KB, el resto ≤ 150 KB. Comprueba con `ls -lh` antes de
  commitear.
- **Resolución:** GPT Image 2 devuelve como mucho 1536 px de lado. Para el hero
  hay que reescalar a 2560 px de ancho — hazlo con el `upscale_image` de
  Higgsfield o con `sips -Z 2560`, no estirándolo en el CSS.
- **Dónde:** `public/images/<sección>/<nombre-en-inglés>.jpg`. Los placeholders
  de §1, en `public/images/_placeholder/`, y esa ruta va al `.gitignore`.
- **`alt` obligatorio y descriptivo, en español.** Ninguna de estas imágenes es
  decorativa; el `alt=""` solo vale para la textura y el fondo de la banda, que
  sí lo son. Cuando llegue la foto real, el `alt` lo escribe quien la sube, no
  el prompt.
- **Sustituir el hueco:** `PhotoHole` está escrito para desaparecer sin tocar a
  quien lo usa — mismo encuadre, mismas medidas, `next/image` en su lugar. No
  hace falta rehacer la ficha.

---

## 8. Resumen de lo que falta, en una línea

Para poder publicar: **S1** (fondo de la banda), **M1** (isotipo) y **M2** (OG).
Para dejar de mentir por omisión: las fotos reales de proveedor de **O** y **T**,
que no salen de ningún modelo — salen del alta manual.
