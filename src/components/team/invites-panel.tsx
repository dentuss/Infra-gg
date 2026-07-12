"use client";

import { Check, Copy, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useCreateInvite,
  useInvites,
  useRevokeInvite,
  type InviteRow,
} from "@/hooks/use-team";
import { formattingLocale } from "@/i18n/config";

function inviteStatus(invite: InviteRow): "used" | "expired" | "active" {
  if (invite.used_by) return "used";
  if (new Date(invite.expires_at) < new Date()) return "expired";
  return "active";
}

export function InvitesPanel() {
  const t = useTranslations("team");
  const locale = useLocale();
  const { data: invites, isPending, error } = useInvites(true);
  const createInvite = useCreateInvite();
  const revokeInvite = useRevokeInvite();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = async (invite: InviteRow) => {
    await navigator.clipboard.writeText(
      `${window.location.origin}/invite/${invite.code}`,
    );
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const mutationError = createInvite.error ?? revokeInvite.error;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          onClick={() => createInvite.mutate()}
          disabled={createInvite.isPending}
        >
          <Plus /> {t("createInvite")}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {t("loadError", { message: error.message })}
        </p>
      ) : null}
      {mutationError ? (
        <p role="alert" className="text-sm text-destructive">
          {mutationError.message}
        </p>
      ) : null}

      {isPending ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : invites?.length ? (
        <ul className="flex flex-col gap-2">
          {invites.map((invite) => {
            const status = inviteStatus(invite);
            return (
              <li
                key={invite.id}
                className="flex flex-wrap items-center gap-3 border border-border p-3"
              >
                <code className="min-w-0 flex-1 truncate font-mono text-xs">
                  /invite/{invite.code}
                </code>

                {status === "active" ? (
                  <>
                    <span className="text-xs text-muted-foreground">
                      {t("expires", {
                        date: new Date(invite.expires_at).toLocaleDateString(
                          formattingLocale(locale),
                          { day: "numeric", month: "short" },
                        ),
                      })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("copy")}
                      onClick={() => copy(invite)}
                    >
                      {copiedId === invite.id ? <Check /> : <Copy />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      aria-label={t("revoke")}
                      disabled={revokeInvite.isPending}
                      onClick={() => revokeInvite.mutate(invite.id)}
                    >
                      <X />
                    </Button>
                  </>
                ) : status === "used" ? (
                  <Badge variant="secondary">
                    {t("usedBy", {
                      username: invite.used_by_profile?.username ?? "?",
                    })}
                  </Badge>
                ) : (
                  <Badge variant="outline">{t("expired")}</Badge>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noInvites")}</p>
      )}
    </div>
  );
}
