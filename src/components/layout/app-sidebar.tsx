import { LogOut } from "lucide-react";

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

export function AppSidebar({ profile }: { profile: Profile }) {
  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3">
        <span className="text-lg font-bold tracking-widest uppercase">
          Infragg
        </span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <NavMain />
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-1">
          <UserAvatar
            username={profile.username}
            avatarUrl={profile.avatar_url}
            className="size-8"
          />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">{profile.username}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {profile.role}
            </p>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              aria-label="Sign out"
            >
              <LogOut />
            </Button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
