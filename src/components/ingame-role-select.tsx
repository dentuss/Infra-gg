"use client";

import { useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INGAME_ROLE_GROUPS } from "@/lib/ingame-roles";

/** Radix Select needs a non-empty value, so map "no role" to a sentinel. */
const NONE = "__none__";

export function IngameRoleSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("ingameRoles");

  return (
    <Select
      value={value ?? NONE}
      onValueChange={(next) => onChange(next === NONE ? null : next)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={t("placeholder")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{t("none")}</SelectItem>
        {INGAME_ROLE_GROUPS.map((group) => (
          <SelectGroup key={group.key}>
            <SelectLabel>{t(group.key)}</SelectLabel>
            {group.roles.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
