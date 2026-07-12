import { z } from "zod";

import { Constants } from "@/types/database";

type Translate = (key: string) => string;

export function createEventSchema(t: Translate) {
  return z
    .object({
      title: z.string().trim().min(1, t("titleRequired")).max(120),
      type: z.enum(Constants.public.Enums.event_type),
      date: z.string().min(1, t("dateRequired")),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, t("startRequired")),
      endTime: z.string().regex(/^\d{2}:\d{2}$/, t("endRequired")),
      description: z.string().max(2000).optional(),
      recursWeekly: z.boolean(),
      recurUntil: z.string().optional(),
    })
    .refine((values) => values.startTime !== values.endTime, {
      message: t("sameTime"),
      path: ["endTime"],
    });
}

export type EventFormValues = z.infer<ReturnType<typeof createEventSchema>>;
