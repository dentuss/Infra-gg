import { z } from "zod";

type Translate = (key: string) => string;

export function createLoginSchema(t: Translate) {
  return z.object({
    email: z.email(t("errorEmail")),
    password: z.string().min(1, t("errorPasswordRequired")),
  });
}

export function createRegisterSchema(t: Translate) {
  return z
    .object({
      email: z.email(t("errorEmail")),
      password: z.string().min(8, t("errorPasswordShort")),
      confirmPassword: z.string(),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: t("errorMismatch"),
      path: ["confirmPassword"],
    });
}
