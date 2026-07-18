"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { IngameRoleSelect } from "@/components/ingame-role-select";
import { Button } from "@/components/ui/button";
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
import { useUpdateMemberProfile } from "@/hooks/use-team";
import type { Profile } from "@/lib/team";

export function EditMemberDialog({
  member,
  onClose,
}: {
  member: Profile | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={member !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {member ? (
          // Keyed by member so the form state re-initializes per target.
          <EditMemberForm key={member.id} member={member} onClose={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditMemberForm({
  member,
  onClose,
}: {
  member: Profile;
  onClose: () => void;
}) {
  const t = useTranslations("team");
  const updateProfile = useUpdateMemberProfile();
  const [username, setUsername] = useState(member.username);
  const [fullName, setFullName] = useState(member.full_name ?? "");
  const [assignedRole, setAssignedRole] = useState<string | null>(
    member.assigned_role,
  );

  const onSubmit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    if (!username.trim()) return;
    await updateProfile.mutateAsync({
      id: member.id,
      username: username.trim(),
      full_name: fullName.trim() || null,
      assigned_role: assignedRole,
    });
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("editTitle")}</DialogTitle>
        <DialogDescription>{t("editSubtitle")}</DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="member-nickname">{t("nicknameLabel")}</Label>
          <Input
            id="member-nickname"
            value={username}
            maxLength={40}
            required
            onChange={(changeEvent) => setUsername(changeEvent.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="member-full-name">{t("fullNameLabel")}</Label>
          <Input
            id="member-full-name"
            value={fullName}
            maxLength={60}
            onChange={(changeEvent) => setFullName(changeEvent.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="member-ingame-role">{t("ingameRoleLabel")}</Label>
          <IngameRoleSelect
            id="member-ingame-role"
            value={assignedRole}
            onChange={setAssignedRole}
          />
          <p className="text-xs text-muted-foreground">
            {t("assignedRoleHint")}
          </p>
        </div>

        {updateProfile.error ? (
          <p role="alert" className="text-sm text-destructive">
            {updateProfile.error.message}
          </p>
        ) : null}

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
