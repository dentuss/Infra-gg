"use client";

import { Pencil, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { UserAvatar } from "@/components/layout/user-avatar";
import { EditMemberDialog } from "@/components/team/edit-member-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useMembers,
  useRemoveMember,
  useSetMemberRole,
} from "@/hooks/use-team";
import type { Profile } from "@/lib/team";
import { Constants } from "@/types/database";

export function MembersList({
  currentUserId,
  canManage,
}: {
  currentUserId: string;
  canManage: boolean;
}) {
  const t = useTranslations("team");
  const tRoles = useTranslations("roles");
  const { data: members, isPending, error } = useMembers();
  const setRole = useSetMemberRole();
  const removeMember = useRemoveMember();
  const [removeTarget, setRemoveTarget] = useState<Profile | null>(null);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("loadError", { message: error.message })}
      </p>
    );
  }
  if (isPending) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }

  const mutationError = setRole.error ?? removeMember.error;

  return (
    <div className="flex flex-col gap-3">
      {mutationError ? (
        <p role="alert" className="text-sm text-destructive">
          {mutationError.message}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex flex-wrap items-center gap-3 border border-border p-3"
          >
            <UserAvatar
              username={member.username}
              avatarUrl={member.avatar_url}
              className="size-9"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{member.username}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[
                  member.id === currentUserId ? t("you") : null,
                  member.full_name,
                  member.ingame_role,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>

            {canManage ? (
              <Select
                value={member.role}
                onValueChange={(role) =>
                  setRole.mutate({
                    memberId: member.id,
                    role: role as Profile["role"],
                  })
                }
              >
                <SelectTrigger
                  className="w-36"
                  aria-label={t("roleLabel")}
                  disabled={setRole.isPending}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Constants.public.Enums.team_role.map((role) => (
                    <SelectItem key={role} value={role}>
                      {tRoles(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="secondary">{tRoles(member.role)}</Badge>
            )}

            {canManage ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("editTitle")}
                onClick={() => setEditTarget(member)}
              >
                <Pencil />
              </Button>
            ) : null}

            {canManage && member.id !== currentUserId ? (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                aria-label={t("removeButton")}
                onClick={() => setRemoveTarget(member)}
              >
                <UserX />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      <EditMemberDialog
        member={editTarget}
        onClose={() => setEditTarget(null)}
      />

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("removeTitle", { username: removeTarget?.username ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={removeMember.isPending}
              onClick={() => {
                if (removeTarget) {
                  removeMember.mutate(removeTarget.id);
                }
                setRemoveTarget(null);
              }}
            >
              {t("removeConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
