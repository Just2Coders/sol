# Iconos a medida — Solaris

> Las reglas de uso de iconografía (familia, peso, tamaño, color, `aria-hidden`)
> están en [`../AGENTS.md`](../AGENTS.md#iconografía). Este documento es otra
> cosa: el **encargo de los iconos que Reicon no tiene** y hay que dibujar.
>
> La familia del proyecto es [Reicon](https://reicon.dev) (`reicon-react`,
> 2674 iconos). Cubre todo el chrome —flechas, chevrons, filtros, papelera,
> mapa, carrito, electrodomésticos— pero **no tiene vocabulario solar**: ni panel
> fotovoltaico, ni inversor, ni breaker, ni medidor. Verificado contra el índice:
> cero resultados, no "pocos". Esos son los que van aquí.

## 1. Cómo se usa este documento

Cada icono de la sección 4 trae un prompt en bloque de código, listo para pegar.
El flujo por icono:

1. Pega el prompt. Devuelve **un SVG**, no una imagen.
2. Contrasta contra el icono de referencia que el propio prompt nombra —
   `npx reicon-mcp view <nombre>` escupe su SVG real. Si el trazo o el aire no
   casan, se corrige sobre el de referencia, no a ojo.
3. Guárdalo como componente en `components/icons/` (§3) y pásalo por la lista de
   aceptación (§5).

Estos iconos **no se generan como imagen** (Higgsfield, Midjourney y compañía).
Un glifo de 24px es geometría exacta sobre una retícula, no una ilustración: lo
que sale de un generador de imágenes hay que revectorizarlo y acaba con curvas
sucias y grosores que bailan. El prompt está escrito para que la salida sea
código SVG.

## 2. Contrato geométrico

Medido sobre los iconos reales de Reicon (`ac`, `battery-full`, `plug`, `home`,
`socket`, `truck`, `fridge` — todos coinciden). Cualquier glifo nuevo que cumpla
esto es indistinguible de la familia:

| Regla | Valor |
|---|---|
| Lienzo | `viewBox="0 0 24 24"`, `fill="none"` en el `<svg>` |
| Área útil | todo dentro de **1.25 – 22.75**; la línea central del dibujo vive en **2 – 22** |
| Grosor | **1.5** constante. Sin excepciones, sin jerarquía de grosores |
| Técnica | **rutas rellenas, no contornos.** Cada `<path>` lleva `fill="currentColor"`. Prohibido `stroke`, `stroke-width`, `stroke-linecap` |
| Huecos | `fill-rule="evenodd" clip-rule="evenodd"` en la ruta que los tenga |
| Terminales | redondeados con radio **0.75** (la mitad del grosor) |
| Esquinas | generosas y redondeadas; nada de ángulos vivos de 90° |
| Color | uno solo, heredado. Ni un segundo tono, ni opacidades, ni degradados |
| Rutas | de 1 a 4 `<path>` por icono. Si necesitas más, el dibujo es demasiado detallado |

Lo importante de la tercera fila: en Reicon **el contorno está dibujado como
relleno**. Una línea horizontal de 1.5 no es un `stroke`, es un rectángulo
redondeado de `y=7.75` a `y=9.25` relleno de `currentColor`. Por eso el prop
`strokeWidth` que expone `reicon-react` no hace nada, y por eso un SVG con
`stroke="currentColor"` canta a kilómetros aunque el grosor coincida.

## 3. Dónde vive lo dibujado

`components/icons/<nombre-en-kebab>.tsx`, un icono por archivo, componente en
PascalCase y **la misma forma de props que Reicon**, para que sea intercambiable
en el markup:

```tsx
import type { SVGProps } from "react";

/** Panel fotovoltaico. Dibujado a medida: Reicon no tiene vocabulario solar. */
export function SolarPanel(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path fillRule="evenodd" clipRule="evenodd" d="…" fill="currentColor" />
    </svg>
  );
}
```

Sin `width`/`height` en el `<svg>`: el tamaño lo pone la utilidad (`size-4`,
`size-5`, `size-8`), igual que con Reicon. El `aria-hidden` lo pone quien lo usa.

## 4. El encargo

Nueve iconos. Los cinco primeros son producto —salen en catálogo y ficha— y los
cuatro últimos son de apoyo.

### 4.1 `solar-panel` — panel fotovoltaico

El icono del producto. Hoy no existe y es el que más se va a repetir: ficha de
producto, chip de tipo en la tarjeta, desglose de componentes de un kit.

```
Dibuja un icono SVG de un PANEL SOLAR FOTOVOLTAICO siguiendo este contrato exacto:

- viewBox "0 0 24 24", fill="none" en el <svg>. Sin width ni height.
- Todo el dibujo dentro de 1.25–22.75; la línea central de las formas, entre 2 y 22.
- Grosor visual constante de 1.5. NO uses stroke: dibuja el contorno como ruta
  RELLENA (una línea de 1.5 es un rectángulo redondeado de 1.5 de alto relleno de
  color). Cada <path> lleva fill="currentColor" y, si tiene huecos,
  fill-rule="evenodd" clip-rule="evenodd".
- Terminales y esquinas redondeados, radio 0.75 o mayor. Un solo color, sin
  opacidades ni degradados. Máximo 3 <path>.

El dibujo: un panel rectangular en perspectiva ligeramente trapezoidal —más
estrecho arriba que abajo, como visto desde el suelo—, con la retícula interior
de celdas marcada por dos líneas verticales y una horizontal, y una pata o
soporte corto saliendo del borde inferior. El marco es la forma dominante; la
retícula, secundaria y del mismo grosor.

Que se lea a 16px: la retícula debe ser de 6 celdas (3×2), no de 12 —a tamaño
pequeño más celdas se empastan en una mancha gris.

Evita: sol, rayos, rayo eléctrico, nubes o cualquier añadido junto al panel; el
panel solo. Evita el rectángulo plano de frente sin perspectiva, que se confunde
con una ventana o una tabla.

Referencia de estilo de la misma familia: el icono "fridge" de Reicon
(npx reicon-mcp view fridge) — mira cómo resuelve un cuerpo rectangular con
divisiones interiores y qué radio usa en las esquinas. Cópiale el aire.

Devuelve solo el SVG.
```

### 4.2 `inverter` — inversor

El corazón del kit y lo que el cliente compara entre proveedores. Aparece en el
desglose de componentes y en las especificaciones de la ficha.

```
Dibuja un icono SVG de un INVERSOR SOLAR (el equipo de pared que convierte
corriente continua en alterna) siguiendo este contrato exacto:

- viewBox "0 0 24 24", fill="none" en el <svg>. Sin width ni height.
- Todo el dibujo dentro de 1.25–22.75; la línea central de las formas, entre 2 y 22.
- Grosor visual constante de 1.5. NO uses stroke: dibuja el contorno como ruta
  RELLENA. Cada <path> lleva fill="currentColor" y, si tiene huecos,
  fill-rule="evenodd" clip-rule="evenodd".
- Terminales y esquinas redondeados, radio 0.75 o mayor. Un solo color. Máximo 3 <path>.

El dibujo: una caja vertical de esquinas redondeadas —más alta que ancha, como
un equipo montado en pared— con, dentro y centrado, el símbolo que distingue a
un inversor: una línea RECTA que se convierte en ONDA SENOIDAL a mitad de
camino. Ese contraste recta→onda es todo el significado del icono; que ocupe al
menos la mitad del ancho interior de la caja.

Opcional, si no ensucia: dos terminales cortos saliendo del borde inferior.

Evita: rayos, enchufes, engranajes, paneles. Evita meter texto o siglas (DC, AC)
—no se leen a 16px—. Evita que la onda tenga más de dos ciclos: a tamaño pequeño
se convierte en una raya temblorosa.

Referencia de estilo de la misma familia: "accumulator" y "socket" de Reicon
(npx reicon-mcp view accumulator) — mira cómo mete símbolo dentro de un cuerpo
sin que se toquen las formas. Deja el mismo aire entre el símbolo y la caja.

Devuelve solo el SVG.
```

### 4.3 `battery-bank` — banco de baterías

Reicon tiene `battery-*` y `accumulator`, pero son **una** batería. Un kit vende
un banco, y esa diferencia es precio y autonomía.

```
Dibuja un icono SVG de un BANCO DE BATERÍAS (varias baterías de almacenamiento
apiladas, no una sola pila) siguiendo este contrato exacto:

- viewBox "0 0 24 24", fill="none" en el <svg>. Sin width ni height.
- Todo el dibujo dentro de 1.25–22.75; la línea central de las formas, entre 2 y 22.
- Grosor visual constante de 1.5. NO uses stroke: dibuja el contorno como ruta
  RELLENA. Cada <path> lleva fill="currentColor" y, si tiene huecos,
  fill-rule="evenodd" clip-rule="evenodd".
- Terminales y esquinas redondeados, radio 0.75 o mayor. Un solo color. Máximo 3 <path>.

El dibujo: DOS módulos rectangulares horizontales apilados uno sobre otro,
ligeramente separados, cada uno con sus dos bornes pequeños asomando arriba. La
lectura tiene que ser "más de una batería" de un vistazo; ahí está toda la
diferencia con el icono de batería que ya existe.

Que se lea a 16px: dos módulos, nunca tres o cuatro. Con tres, la separación
entre ellos baja de 1.5 y se empastan.

Evita: el indicador de carga por celdas (rayitas interiores) —eso es "nivel de
batería", otro concepto—. Evita rayos y enchufes.

Referencia de estilo de la misma familia: "battery-full" y "accumulator" de
Reicon (npx reicon-mcp view battery-full) — respeta su proporción de cuerpo y el
tamaño de los bornes para que el banco parezca de la misma serie.

Devuelve solo el SVG.
```

### 4.4 `power-meter` — medidor de consumo (kWh)

Para hablar de consumo y respaldo sin recurrir a un gráfico genérico. Hoy el
sustituto sería `gauge` o `speedometer`, que dicen "velocidad", no "energía".

```
Dibuja un icono SVG de un MEDIDOR ELÉCTRICO DE CONSUMO (contador de kWh)
siguiendo este contrato exacto:

- viewBox "0 0 24 24", fill="none" en el <svg>. Sin width ni height.
- Todo el dibujo dentro de 1.25–22.75; la línea central de las formas, entre 2 y 22.
- Grosor visual constante de 1.5. NO uses stroke: dibuja el contorno como ruta
  RELLENA. Cada <path> lleva fill="currentColor" y, si tiene huecos,
  fill-rule="evenodd" clip-rule="evenodd".
- Terminales y esquinas redondeados, radio 0.75 o mayor. Un solo color. Máximo 3 <path>.

El dibujo: un cuerpo cuadrado de esquinas redondeadas —la caja del contador— con
una esfera circular dentro, y en la esfera una aguja corta apuntando en
diagonal hacia arriba a la derecha, más dos marcas de escala en el arco superior.
Debajo de la esfera, una ranura horizontal corta que sugiere la lectura numérica.

Que se lea a 16px: dos marcas de escala, no seis. La aguja tiene que despegar
visiblemente del centro y no tocar el borde de la esfera.

Evita: el velocímetro de coche (arco abierto sin caja) —ese ya existe en la
librería como "speedometer" y es otra cosa—. Evita rayos, números y texto.

Referencia de estilo de la misma familia: "gauge" y "speedometer" de Reicon
(npx reicon-mcp view gauge) — mira el grosor de la aguja y cuánto aire deja
respecto al borde; luego métela en una caja como hace "fridge".

Devuelve solo el SVG.
```

### 4.5 `installer` — instalador / técnico

La instalación en provincia es media propuesta de valor y no hay con qué
señalarla: en Reicon no existen casco, llave inglesa, destornillador ni operario.

```
Dibuja un icono SVG de un INSTALADOR / TÉCNICO (persona con casco de trabajo)
siguiendo este contrato exacto:

- viewBox "0 0 24 24", fill="none" en el <svg>. Sin width ni height.
- Todo el dibujo dentro de 1.25–22.75; la línea central de las formas, entre 2 y 22.
- Grosor visual constante de 1.5. NO uses stroke: dibuja el contorno como ruta
  RELLENA. Cada <path> lleva fill="currentColor" y, si tiene huecos,
  fill-rule="evenodd" clip-rule="evenodd".
- Terminales y esquinas redondeados, radio 0.75 o mayor. Un solo color. Máximo 3 <path>.

El dibujo: busto de una persona —cabeza circular y hombros en arco por debajo,
la construcción clásica de un icono de usuario— con un CASCO DE OBRA encima: una
cúpula sobre la cabeza y un ala corta que sobresale a ambos lados, con la
crestita central del casco marcada.

El casco es lo único que distingue este icono del de usuario, así que tiene que
ser inequívoco: el ala debe sobresalir de la silueta de la cabeza a los dos
lados.

Que se lea a 16px: sin rasgos faciales, sin brazos, sin herramientas en la mano.

Evita: gorra, sombrero redondo o auriculares, que a este tamaño se confunden con
el casco. Evita la persona de cuerpo entero.

Referencia de estilo de la misma familia: "user" de Reicon
(npx reicon-mcp view user) — parte literalmente de su cabeza y sus hombros, y
añádele el casco. Así el icono queda emparentado con el resto de la familia de
usuarios.

Devuelve solo el SVG.
```

### 4.6 `breaker` — breaker / protección eléctrica

Para el desglose técnico del kit: lo que protege la instalación.

```
Dibuja un icono SVG de un BREAKER / INTERRUPTOR TERMOMAGNÉTICO (la protección
eléctrica del cuadro) siguiendo este contrato exacto:

- viewBox "0 0 24 24", fill="none" en el <svg>. Sin width ni height.
- Todo el dibujo dentro de 1.25–22.75; la línea central de las formas, entre 2 y 22.
- Grosor visual constante de 1.5. NO uses stroke: dibuja el contorno como ruta
  RELLENA. Cada <path> lleva fill="currentColor" y, si tiene huecos,
  fill-rule="evenodd" clip-rule="evenodd".
- Terminales y esquinas redondeados, radio 0.75 o mayor. Un solo color. Máximo 3 <path>.

El dibujo: un cuerpo rectangular vertical de esquinas redondeadas —el módulo de
carril— con una PALANCA basculante saliendo de su cara frontal, claramente
inclinada hacia arriba (posición cerrada), y dos terminales cortos, uno arriba y
otro abajo, en el eje vertical del cuerpo.

La palanca es la información: tiene que sobresalir del cuerpo y estar en
diagonal, nunca centrada ni horizontal, o el icono se convierte en una caja.

Que se lea a 16px: un solo módulo, no una fila de tres.

Evita: el símbolo de interruptor de circuito de los esquemas eléctricos (línea
con un pivote), demasiado abstracto aquí. Evita rayos y enchufes.

Referencia de estilo de la misma familia: "socket" y "plug" de Reicon
(npx reicon-mcp view socket) — cópiale el largo y el grosor de los terminales.

Devuelve solo el SVG.
```

### 4.7 `mounting-rail` — estructura de montaje

Lo que se instala en el techo y sostiene los paneles. Va en el desglose de un
kit, donde hoy no hay forma de nombrarlo con un glifo.

```
Dibuja un icono SVG de una ESTRUCTURA DE MONTAJE PARA TECHO (los rieles y
soportes sobre los que se atornillan los paneles solares) siguiendo este
contrato exacto:

- viewBox "0 0 24 24", fill="none" en el <svg>. Sin width ni height.
- Todo el dibujo dentro de 1.25–22.75; la línea central de las formas, entre 2 y 22.
- Grosor visual constante de 1.5. NO uses stroke: dibuja el contorno como ruta
  RELLENA. Cada <path> lleva fill="currentColor" y, si tiene huecos,
  fill-rule="evenodd" clip-rule="evenodd".
- Terminales y esquinas redondeados, radio 0.75 o mayor. Un solo color. Máximo 3 <path>.

El dibujo: una superficie inclinada —una línea larga en diagonal, la del riel—
sostenida por DOS patas verticales de distinta altura que bajan hasta una base
horizontal corta. Es un triángulo rectángulo insinuado, no cerrado: la
inclinación es el significado.

Que se lea a 16px: dos patas, no cuatro. La diagonal debe cruzar al menos la
mitad del ancho del lienzo para que la inclinación se note.

Evita: dibujar el panel encima —eso es otro icono de esta misma tanda y se
usarán juntos—. Evita andamios, escaleras y tejados con tejas.

Referencia de estilo de la misma familia: "ruler" de Reicon
(npx reicon-mcp view ruler) — mira cómo resuelve una forma alargada en diagonal
sin que los extremos se salgan del área útil.

Devuelve solo el SVG.
```

### 4.8 `blackout` — apagón

En Cuba el apagón no es un estado de error: es el problema que el producto
resuelve, y merece su propio glifo en vez de un triángulo de alerta genérico.

```
Dibuja un icono SVG de un APAGÓN / CORTE DE CORRIENTE siguiendo este contrato
exacto:

- viewBox "0 0 24 24", fill="none" en el <svg>. Sin width ni height.
- Todo el dibujo dentro de 1.25–22.75; la línea central de las formas, entre 2 y 22.
- Grosor visual constante de 1.5. NO uses stroke: dibuja el contorno como ruta
  RELLENA. Cada <path> lleva fill="currentColor" y, si tiene huecos,
  fill-rule="evenodd" clip-rule="evenodd".
- Terminales y esquinas redondeados, radio 0.75 o mayor. Un solo color. Máximo 3 <path>.

El dibujo: una bombilla —cúpula redonda arriba, casquillo con dos ranuras
abajo— APAGADA, cruzada por una diagonal limpia de esquina a esquina. La
diagonal debe llevar un pequeño hueco de separación a cada lado por donde cruza
el contorno de la bombilla, para que se lea como tachado y no como un trazo
pegado encima.

Que se lea a 16px: la bombilla sin rayos ni destellos alrededor —está apagada—,
y sin filamento interior, que a este tamaño ensucia.

Evita: el triángulo de alerta y el símbolo de power (círculo con muesca); ambos
ya existen en la librería y significan otra cosa.

Referencia de estilo de la misma familia: "bulb" y "eye-off" de Reicon
(npx reicon-mcp view eye-off) — de "eye-off" cópiale exactamente cómo resuelve
la diagonal tachada y el hueco de separación; es la convención de la familia.

Devuelve solo el SVG.
```

### 4.9 `fan` — ventilador

El despiste de la librería: están `ac`, `fridge`, `tv`, `washer`, `bulb` y
`lamp` para "qué puede alimentar este kit", pero no el ventilador, que en Cuba
es de los primeros de esa lista.

```
Dibuja un icono SVG de un VENTILADOR (electrodoméstico) siguiendo este contrato
exacto:

- viewBox "0 0 24 24", fill="none" en el <svg>. Sin width ni height.
- Todo el dibujo dentro de 1.25–22.75; la línea central de las formas, entre 2 y 22.
- Grosor visual constante de 1.5. NO uses stroke: dibuja el contorno como ruta
  RELLENA. Cada <path> lleva fill="currentColor" y, si tiene huecos,
  fill-rule="evenodd" clip-rule="evenodd".
- Terminales y esquinas redondeados, radio 0.75 o mayor. Un solo color. Máximo 3 <path>.

El dibujo: tres aspas curvas idénticas girando alrededor de un buje circular
pequeño en el centro, distribuidas a 120°. Las aspas nacen del buje y se
ensanchan hacia fuera, con la punta redondeada.

Que se lea a 16px: TRES aspas, no cuatro ni cinco, y separación clara entre
ellas —al menos 1.5 de hueco en la parte ancha—. El buje central debe quedar
visible como círculo, no tapado por el arranque de las aspas.

Evita: la rejilla circular exterior y el pie del ventilador; solo el rotor.
Evita que las aspas parezcan pétalos simétricos —tienen que insinuar giro,
todas curvadas en el mismo sentido.

Referencia de estilo de la misma familia: "ac" y "washer" de Reicon
(npx reicon-mcp view ac) — son los electrodomésticos junto a los que va a
aparecer; iguala su peso visual para que la fila no cojee.

Devuelve solo el SVG.
```

## 5. Lista de aceptación

Antes de dar un icono por bueno:

- [ ] `viewBox="0 0 24 24"`, sin `width`/`height` en el `<svg>`.
- [ ] Ni un `stroke`, `stroke-width` o `stroke-linecap` en todo el archivo.
- [ ] Todo `fill` es `currentColor`. Ni un hex, ni `opacity`, ni `<defs>`.
- [ ] Nada del dibujo se sale de 1.25–22.75.
- [ ] Puesto al lado de dos iconos de Reicon del mismo tamaño, no canta: mismo
      grosor aparente, mismo aire respecto al borde, mismo peso de mancha.
- [ ] Legible a 16px, en gris `text-muted-foreground` sobre `bg-background` —
      que es el caso real más exigente, no el negro sobre blanco.
- [ ] Ninguna forma interior separada de otra por menos de 1.5.
- [ ] Tres o cuatro rutas como mucho.
- [ ] Se distingue de su vecino más parecido de Reicon (el banco de baterías, de
      `battery-full`; el instalador, de `user`; el medidor, de `speedometer`).

## 6. Lo que NO se dibuja

- **Logos de marca — WhatsApp, Telegram, Facebook.** Faltan en Reicon (solo hay
  `instagram`) y WhatsApp hace falta de verdad: es la vía de contacto real con
  los proveedores. Pero un logo no se estiliza para que pegue con tu familia —
  tiene guías propias y redibujarlo es incorrecto de marca. Se usan los oficiales
  tal cual, en `components/icons/brands/`, exentos de la regla de familia única.
- **Generador / planta eléctrica.** Tampoco está, pero es competencia, no
  producto: no le hace falta glifo en el catálogo. Si aparece en una comparativa,
  se dibuja entonces.
- **Cableado y horas de sol pico.** Son datos, no objetos. El cableado se
  resuelve listándolo con texto en el desglose, y las horas de sol pico son una
  cifra en mono; forzarles un icono es decorar.
