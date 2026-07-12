"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateEvent,
  useDeleteEvent,
  useExcludeOccurrence,
  useUpdateEventForm,
} from "@/hooks/use-events";
import { formattingLocale } from "@/i18n/config";
import { isoToDateValue, isoToTimeValue, type EventRow } from "@/lib/events";
import {
  createEventSchema,
  type EventFormValues,
} from "@/lib/validations/event";
import { Constants } from "@/types/database";

export type EventDialogState = {
  open: boolean;
  event: EventRow | null;
  /** Set when the dialog was opened from a recurring occurrence. */
  occurrenceDate: string | null;
  range: { start: Date; end: Date } | null;
};

// Half-hour steps across the day, 24-hour labels.
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = String(Math.floor(i / 2)).padStart(2, "0");
  const minutes = i % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});

function timeOptionsFor(value: string) {
  // Keep odd values (from drag-created events) selectable.
  return value && !TIME_OPTIONS.includes(value)
    ? [value, ...TIME_OPTIONS]
    : TIME_OPTIONS;
}

function initialValues(state: EventDialogState): EventFormValues {
  if (state.event) {
    return {
      title: state.event.title,
      type: state.event.type,
      date: isoToDateValue(state.event.starts_at),
      startTime: isoToTimeValue(state.event.starts_at),
      endTime: isoToTimeValue(state.event.ends_at),
      description: state.event.description ?? "",
      recursWeekly: state.event.recurs_weekly,
      recurUntil: state.event.recur_until ?? "",
    };
  }

  const start = state.range?.start ?? new Date();
  const end = state.range?.end ?? new Date(start.getTime() + 60 * 60 * 1000);
  let startTime = isoToTimeValue(start.toISOString());
  let endTime = isoToTimeValue(end.toISOString());
  // A month-view selection carries no meaningful times (00:00 to 00:00);
  // fall back to a typical evening session.
  if (startTime === endTime) {
    startTime = "19:00";
    endTime = "21:00";
  }

  return {
    title: "",
    type: "theory",
    date: isoToDateValue(start.toISOString()),
    startTime,
    endTime,
    description: "",
    recursWeekly: false,
    recurUntil: "",
  };
}

export function EventDialog({
  state,
  onClose,
}: {
  state: EventDialogState;
  onClose: () => void;
}) {
  const t = useTranslations("eventDialog");
  const tValidation = useTranslations("eventDialog.validation");
  const locale = useLocale();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEventForm();
  const deleteEvent = useDeleteEvent();
  const excludeOccurrence = useExcludeOccurrence();

  const schema = useMemo(() => createEventSchema(tValidation), [tValidation]);
  const form = useForm<EventFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues(state),
  });

  // Re-seed the form whenever the dialog opens for a different target.
  useEffect(() => {
    if (state.open) {
      form.reset(initialValues(state));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const recursWeekly = useWatch({
    control: form.control,
    name: "recursWeekly",
  });
  const pending =
    createEvent.isPending ||
    updateEvent.isPending ||
    deleteEvent.isPending ||
    excludeOccurrence.isPending;
  const mutationError =
    createEvent.error ??
    updateEvent.error ??
    deleteEvent.error ??
    excludeOccurrence.error;

  const onSubmit = form.handleSubmit(async (values) => {
    if (state.event) {
      await updateEvent.mutateForm(state.event.id, values);
    } else {
      await createEvent.mutateAsync(values);
    }
    onClose();
  });

  const onDeleteSeries = async () => {
    if (!state.event) return;
    await deleteEvent.mutateAsync(state.event.id);
    onClose();
  };

  const onDeleteOccurrence = async () => {
    if (!state.event || !state.occurrenceDate) return;
    await excludeOccurrence.mutateAsync({
      event: state.event,
      date: state.occurrenceDate,
    });
    onClose();
  };

  const errors = form.formState.errors;

  return (
    <Dialog open={state.open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {state.event ? t("editTitle") : t("newTitle")}
          </DialogTitle>
          <DialogDescription>
            {state.event ? t("editDescription") : t("newDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="event-title">{t("titleLabel")}</Label>
            <Input id="event-title" {...form.register("title")} />
            {errors.title ? (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="event-type">{t("typeLabel")}</Label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="event-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.event_type.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`types.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="event-date">{t("dateLabel")}</Label>
            <Input
              id="event-date"
              type="date"
              lang={formattingLocale(locale)}
              {...form.register("date")}
            />
            {errors.date ? (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="event-start">{t("startsLabel")}</Label>
              <Controller
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="event-start" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptionsFor(field.value).map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="event-end">{t("endsLabel")}</Label>
              <Controller
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="event-end" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptionsFor(field.value).map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.endTime ? (
                <p className="text-sm text-destructive">
                  {errors.endTime.message}
                </p>
              ) : null}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{t("midnightHint")}</p>

          <div className="flex items-center gap-6">
            <Controller
              control={form.control}
              name="recursWeekly"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  {t("repeatsWeekly")}
                </label>
              )}
            />
          </div>

          {recursWeekly ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="event-until">{t("repeatsUntil")}</Label>
              <Input
                id="event-until"
                type="date"
                {...form.register("recurUntil")}
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="event-description">{t("descriptionLabel")}</Label>
            <Textarea
              id="event-description"
              rows={3}
              {...form.register("description")}
            />
          </div>

          {mutationError ? (
            <p role="alert" className="text-sm text-destructive">
              {mutationError.message}
            </p>
          ) : null}

          <DialogFooter className="gap-2">
            {state.event &&
            state.event.recurs_weekly &&
            state.occurrenceDate ? (
              <div className="mr-auto flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pending}
                  onClick={onDeleteOccurrence}
                >
                  {t("deleteOccurrence")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={onDeleteSeries}
                  className="text-destructive"
                >
                  {t("deleteSeries")}
                </Button>
              </div>
            ) : state.event ? (
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={onDeleteSeries}
                className="mr-auto"
              >
                {t("delete")}
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("saving") : state.event ? t("save") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
