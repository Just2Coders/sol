"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

// Tooltip sobre la superficie `popover` del sistema. Escrito a mano con la misma
// forma que los demás primitivos de shadcn (mismo data-slot, mismas variantes
// data-open/data-closed) porque el CLI no lo trae en esta versión.
//
// No usa el lienzo oscuro: `--canvas` está reservado para secciones a sangre,
// nunca para chrome pequeño.

function TooltipProvider({
  delayDuration = 80,
  skipDelayDuration = 300,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    />
  )
}

function Tooltip(props: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger(
  props: React.ComponentProps<typeof TooltipPrimitive.Trigger>,
) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 8,
  collisionPadding = 12,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          "z-50 max-w-[30ch] rounded-md border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md",
          // El tooltip no recibe puntero: si lo recibiera, al asomarse sobre el
          // propio disparador le robaría el hover y entraría en bucle de
          // abrir/cerrar. Es lo que lo hace usable sobre un mapa.
          "pointer-events-none",
          // Crece desde el borde por el que sale, no desde su centro: Radix
          // publica el origen ya resuelto según el lado y las colisiones.
          "origin-(--radix-tooltip-content-transform-origin)",
          "duration-fast ease-standard data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          "data-[side=top]:slide-in-from-bottom-1 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1",
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
