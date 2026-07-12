import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { NavMain } from "@/components/layout/nav-main";
import { UserAvatar } from "@/components/layout/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { signOut } from "@/services/auth";
import type { Profile } from "@/services/profile";
import { getTeamName } from "@/services/team";

export async function AppSidebar({ profile }: { profile: Profile }) {
  const [t, teamName] = await Promise.all([getTranslations(), getTeamName()]);

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3">
        <span className="truncate text-lg font-bold tracking-widest uppercase">
          {teamName}
        </span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <NavMain />
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2">
          <LocaleSwitcher />
        </div>
        <div className="flex items-center gap-2 px-2 py-1">
          <UserAvatar
            username={profile.username}
            avatarUrl={profile.avatar_url}
            className="size-8"
          />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">{profile.username}</p>
            <p className="text-xs text-muted-foreground">
              {t(`roles.${profile.role}`)}
            </p>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              aria-label={t("nav.signOut")}
            >
              <LogOut />
            </Button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
