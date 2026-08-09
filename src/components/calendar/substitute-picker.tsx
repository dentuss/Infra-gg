"use client";

import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Profile } from "@/lib/team";
import { cn } from "@/lib/utils";

/** Bench roles that can be attached to an event. */
export const BENCH_ROLES: ReadonlySet<Profile["role"]> = new Set([
  "substitute",
  "trial",
]);

export function SubstitutePicker({
  members,
  value,
  onChange,
  disabled,
}: {
  members: readonly Profile[];
  value: readonly string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("eventDialog");
  const bench = members.filter((member) => BENCH_ROLES.has(member.role));
  // Open on mount when the event already has stand-ins, so an edit does not
  // hide them behind a collapsed button.
  const [open, setOpen] = useState(value.length > 0);

  if (bench.length === 0) return null;

  const toggle = (id: string) =>
    onChange(
      value.includes(id)
        ? value.filter((current) => current !== id)
        : [...value, id],
    );

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="w-fit"
      >
        <UserPlus /> {t("substitutesLabel")}
        {value.length > 0 ? (
          <span className="rounded-full bg-primary/15 px-1.5 text-xs font-semibold">
            {value.length}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">
            {t("substitutesHint")}
          </p>
          {bench.map((member) => {
            const id = `substitute-${member.id}`;
            const checked = value.includes(member.id);
            return (
              <div key={member.id} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={() => toggle(member.id)}
                />
                <Label htmlFor={id} className="flex items-center gap-2">
                  {member.username}
                  <span
                    className={cn(
                      "rounded-sm px-1 py-0.5 text-[0.6rem] font-semibold tracking-wide uppercase",
                      member.role === "trial"
                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                        : "bg-sky-500/20 text-sky-700 dark:text-sky-300",
                    )}
                  >
                    {t(`roleTag.${member.role}`)}
                  </span>
                </Label>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
