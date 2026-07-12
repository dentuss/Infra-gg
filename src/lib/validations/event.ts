import { z } from "zod";

import { Constants } from "@/types/database";

export const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Give the event a title.").max(120),
    type: z.enum(Constants.public.Enums.event_type),
    date: z.string().min(1, "Pick a date."),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time."),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Pick an end time."),
    description: z.string().max(2000).optional(),
    recursWeekly: z.boolean(),
    recurUntil: z.string().optional(),
  })
  .refine((values) => values.startTime !== values.endTime, {
    message: "Start and end cannot be the same time.",
    path: ["endTime"],
  });

export type EventFormValues = z.infer<typeof eventSchema>;
