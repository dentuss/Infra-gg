"use client";

import { Gamepad2, MessageCircle, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { IngameRoleSelect } from "@/components/ingame-role-select";
import { UserAvatar } from "@/components/layout/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateOwnProfile, useUploadAvatar } from "@/hooks/use-profile";
import type { Profile } from "@/lib/team";

export function ProfileForm({ profile }: { profile: Profile }) {
  const t = useTranslations("profile");
  const router = useRouter();
  const updateProfile = useUpdateOwnProfile();
  const uploadAvatar = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(profile.username);
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [ingameRole, setIngameRole] = useState<string | null>(
    profile.ingame_role,
  );
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [saved, setSaved] = useState(false);

  const onAvatarChange = async (
    changeEvent: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = changeEvent.target.files?.[0];
    changeEvent.target.value = "";
    if (!file) return;
    const url = await uploadAvatar.mutateAsync(file);
    setAvatarUrl(url);
    router.refresh();
  };

  const onSubmit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    if (!username.trim()) return;
    await updateProfile.mutateAsync({
      username: username.trim(),
      full_name: fullName.trim() || null,
      ingame_role: ingameRole,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  };

  const error = updateProfile.error ?? uploadAvatar.error;

  return (
    <div className="flex max-w-md flex-col gap-6">
      <div className="flex items-center gap-4">
        <UserAvatar
          username={username || profile.username}
          avatarUrl={avatarUrl}
          className="size-20 text-xl"
        />
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={uploadAvatar.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload />
            {uploadAvatar.isPending ? t("uploading") : t("changeAvatar")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("avatarHint")}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onAvatarChange}
          />
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-nickname">{t("nicknameLabel")}</Label>
          <Input
            id="profile-nickname"
            value={username}
            maxLength={40}
            required
            onChange={(changeEvent) => setUsername(changeEvent.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-full-name">{t("fullNameLabel")}</Label>
          <Input
            id="profile-full-name"
            value={fullName}
            maxLength={60}
            onChange={(changeEvent) => setFullName(changeEvent.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-ingame-role">{t("ingameRoleLabel")}</Label>
          <IngameRoleSelect
            id="profile-ingame-role"
            value={ingameRole}
            onChange={setIngameRole}
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? t("saving") : t("save")}
          </Button>
          {saved ? (
            <span className="text-sm text-muted-foreground">{t("saved")}</span>
          ) : null}
        </div>
      </form>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold">{t("linkedTitle")}</h2>
          <p className="text-xs text-muted-foreground">{t("linkedSubtitle")}</p>
        </div>
        {(
          [
            { key: "ubisoft", icon: Gamepad2 },
            { key: "discord", icon: MessageCircle },
          ] as const
        ).map(({ key, icon: Icon }) => (
          <div
            key={key}
            className="flex items-center gap-3 rounded-lg border border-border p-3"
          >
            <Icon className="size-5 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t(`${key}Name`)}</p>
              <p className="text-xs text-muted-foreground">{t("notLinked")}</p>
            </div>
            <Button type="button" variant="outline" size="sm" disabled>
              {t("comingSoon")}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
