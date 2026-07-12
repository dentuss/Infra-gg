"use client";

import {
  CalendarDays,
  Crosshair,
  FileText,
  LayoutDashboard,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  icon: LucideIcon;
  href?: string;
};

// Items without an href are modules from later phases.
const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { title: "Calendar", icon: CalendarDays, href: "/calendar" },
  { title: "Team", icon: Users },
  { title: "Documents", icon: FileText },
  { title: "Strategies", icon: Crosshair },
];

export function NavMain() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {NAV_ITEMS.map((item) =>
        item.href ? (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              render={<Link href={item.href} />}
              isActive={pathname.startsWith(item.href)}
            >
              <item.icon />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton disabled>
              <item.icon />
              <span>{item.title}</span>
            </SidebarMenuButton>
            <SidebarMenuBadge>Soon</SidebarMenuBadge>
          </SidebarMenuItem>
        ),
      )}
    </SidebarMenu>
  );
}
