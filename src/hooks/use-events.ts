"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  combineDateAndTimes,
  type ClearPlan,
  type EventRow,
} from "@/lib/events";
import { createClient } from "@/lib/supabase/client";
import type { EventFormValues } from "@/lib/validations/event";
import type { TablesUpdate } from "@/types/database";

const EVENTS_KEY = ["events"] as const;

export function useEvents() {
  return useQuery({
    queryKey: EVENTS_KEY,
    // One shared team calendar — volumes are small enough to load whole.
    queryFn: async (): Promise<EventRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("starts_at");
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

function toEventColumns(values: EventFormValues) {
  const { start, end } = combineDateAndTimes(
    values.date,
    values.startTime,
    values.endTime,
  );
  return {
    title: values.title,
    type: values.type,
    description: values.description?.trim() ? values.description.trim() : null,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    // All-day events are not part of the team's workflow.
    all_day: false,
    recurs_weekly: values.recursWeekly,
    recur_until:
      values.recursWeekly && values.recurUntil ? values.recurUntil : null,
  };
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: EventFormValues) => {
      const supabase = createClient();
      const { data: claims } = await supabase.auth.getClaims();
      const userId = claims?.claims.sub;
      if (!userId) throw new Error("Not signed in.");

      const { error } = await supabase
        .from("events")
        .insert({ ...toEventColumns(values), created_by: userId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EVENTS_KEY }),
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      patch: TablesUpdate<"events">;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("events")
        .update(input.patch)
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EVENTS_KEY }),
  });
}

export function useUpdateEventForm() {
  const updateEvent = useUpdateEvent();
  return {
    ...updateEvent,
    mutateForm: (id: string, values: EventFormValues) =>
      updateEvent.mutateAsync({ id, patch: toEventColumns(values) }),
  };
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EVENTS_KEY }),
  });
}

/** Remove a single occurrence from a weekly series. */
export function useExcludeOccurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { event: EventRow; date: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("events")
        .update({
          excluded_dates: [...input.event.excluded_dates, input.date],
        })
        .eq("id", input.event.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EVENTS_KEY }),
  });
}

/** Apply a Clear plan: delete one-offs, exclude recurring occurrences. */
export function useClearRange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (plan: ClearPlan) => {
      const supabase = createClient();
      if (plan.deleteIds.length > 0) {
        const { error } = await supabase
          .from("events")
          .delete()
          .in("id", plan.deleteIds);
        if (error) throw new Error(error.message);
      }
      for (const { event, dates } of plan.exclusions) {
        const { error } = await supabase
          .from("events")
          .update({ excluded_dates: [...event.excluded_dates, ...dates] })
          .eq("id", event.id);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EVENTS_KEY }),
  });
}
