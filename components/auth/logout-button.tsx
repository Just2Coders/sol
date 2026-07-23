"use client";

import { useTransition } from "react";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(() => logout())}
    >
      {pending ? "Saliendo..." : "Cerrar sesión"}
    </Button>
  );
}
