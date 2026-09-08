-- Los plazos del pedido y el número que lo nombra.
--
-- Las tres columnas entran `NOT NULL` **sin default** a propósito, y se puede
-- porque las tres tablas están vacías por construcción: hasta este cambio no
-- existía el checkout, así que nadie ha escrito nunca en `orders`. A partir de
-- aquí las escribe siempre quien crea el pedido, y un default las dejaría
-- mintiendo cuando alguien olvidara ponerlas.
ALTER TABLE "order_suppliers" ADD COLUMN "confirmation_due_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "expires_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "acknowledged_total_usd" numeric(10, 2) NOT NULL;--> statement-breakpoint

-- El número corto del pedido (SOL-1042), que es también la referencia del Zelle.
--
-- Lo da una secuencia y no un `count(*)` ni un aleatorio: el contador se lee y
-- se incrementa en el mismo acto, así que dos checkouts simultáneos no pueden
-- sacar el mismo número —y `order_number` es único, de modo que la alternativa
-- sería un bucle de reintentos—. Que una compra abortada queme un número es el
-- precio, y es el correcto: los huecos en la numeración no le importan a nadie,
-- y un `nextval` no vuelve atrás ni siquiera en un ROLLBACK, que es justo lo que
-- garantiza que nunca se repita.
--
-- Arranca en 1000 para que el primer pedido no se llame SOL-1: un número de
-- pedido con cuatro dígitos se dicta por teléfono igual de bien y no anuncia
-- cuántas ventas lleva la plataforma.
CREATE SEQUENCE "order_number_seq" START WITH 1000 INCREMENT BY 1;
