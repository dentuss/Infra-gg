import { z } from "zod";

import { Constants } from "@/types/database";

export const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Give the event a title.").max(120),
    type: z.enum(Constants.public.Enums.event_type),
    startsAt: z.string().min(1, "Set a start time."),
    endsAt: z.string().min(1, "Set an end time."),
    allDay: z.boolean(),
    description: z.string().max(2000).optional(),
    recursWeekly: z.boolean(),
    recurUntil: z.string().optional(),
  })
  .refine((values) => new Date(values.endsAt) >= new Date(values.startsAt), {
    message: "The event cannot end before it starts.",
    path: ["endsAt"],
  });

export type EventFormValues = z.infer<typeof eventSchema>;
