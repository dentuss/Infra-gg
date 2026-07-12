import { cache } from "react";

import { upcomingOccurrences, type EventOccurrence } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";

export const getUpcomingEvents = cache(async (): Promise<EventOccurrence[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase.from("events").select("*");
  if (error) {
    console.error("Failed to load events:", error.message);
    return [];
  }

  return upcomingOccurrences(data, new Date(), 10);
});
