import { cache } from "react";

import { upcomingOccurrences, type EventOccurrence } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import { getTeamZone } from "@/services/team";

export const getUpcomingEvents = cache(async (): Promise<EventOccurrence[]> => {
  const [supabase, zone] = await Promise.all([createClient(), getTeamZone()]);

  const { data, error } = await supabase.from("events").select("*");
  if (error) {
    console.error("Failed to load events:", error.message);
    return [];
  }

  return upcomingOccurrences(data, new Date(), 10, zone);
});
