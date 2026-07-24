"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSession, deleteSession, getSession } from "@/lib/session";

export type AuthFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

const passwordSchema = z
  .string()
  .min(8, { error: "Mínimo 8 caracteres." })
  .regex(/[a-zA-Z]/, { error: "Debe incluir al menos una letra." })
  .regex(/[0-9]/, { error: "Debe incluir al menos un número." });

const registerSchema = z.object({
  name: z.string().trim().min(2, { error: "El nombre es muy corto." }),
  email: z.email({ error: "Correo inválido." }).trim().toLowerCase(),
  phone: z.string().trim().optional(),
  zoneId: z.uuid({ error: "Selecciona tu zona." }),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.email({ error: "Correo inválido." }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Ingresa tu contraseña." }),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Ingresa tu contraseña actual." }),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    error: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export async function register(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    zoneId: formData.get("zoneId"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { name, email, phone, zoneId, password } = parsed.data;

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    return { errors: { email: ["Ya existe una cuenta con este correo."] } };
  }

  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      phone,
      zoneId,
      passwordHash: await bcrypt.hash(password, 10),
    })
    .returning({ id: users.id, role: users.role });

  if (!user) {
    return { message: "No se pudo crear la cuenta. Intenta de nuevo." };
  }

  await createSession({ userId: user.id, role: user.role });
  redirect("/");
}

export async function login(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  });

  const valid = user && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!valid) {
    return { message: "Correo o contraseña incorrectos." };
  }

  await createSession({ userId: user.id, role: user.role });
  redirect(user.role === "ADMIN" ? "/admin" : "/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

export async function changePassword(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  // Sesión huérfana (usuario eliminado): aquí sí podemos borrar la cookie
  // directamente por ser una Server Action.
  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user) {
    await deleteSession();
    redirect("/login");
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return { errors: { currentPassword: ["La contraseña actual es incorrecta."] } };
  }

  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) })
    .where(eq(users.id, user.id));

  return { message: "ok" };
}
