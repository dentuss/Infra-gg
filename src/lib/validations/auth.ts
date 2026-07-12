import { z } from "zod";

type Translate = (key: string) => string;

export function createLoginSchema(t: Translate) {
  return z.object({
    email: z.email(t("errorEmail")),
    password: z.string().min(1, t("errorPasswordRequired")),
  });
}

export function createInviteCodeSchema(t: Translate) {
  return z.uuid(t("errorInvalidCode"));
}
