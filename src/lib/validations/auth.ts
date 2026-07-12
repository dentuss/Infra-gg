import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const inviteCodeSchema = z.uuid(
  "That does not look like an invite code.",
);
