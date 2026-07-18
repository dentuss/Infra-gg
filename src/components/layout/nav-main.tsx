"use client";

import {
  CalendarDays,
  Clapperboard,
  Crosshair,
  FileText,
  LayoutDashboard,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = {
  key:
    "dashboard" | "calendar" | "team" | "documents" | "strategies" | "matches";
  icon: LucideIcon;
  href?: string;
};

// Items without an href are modules from later phases.
const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { key: "calendar", icon: CalendarDays, href: "/calendar" },
  { key: "team", icon: Users, href: "/team" },
  { key: "documents", icon: FileText },
  { key: "strategies", icon: Crosshair, href: "/strategies" },
  { key: "matches", icon: Clapperboard, href: "/matches" },
];

export function NavMain() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <SidebarMenu className="gap-1.5">
      {NAV_ITEMS.map((item) =>
        item.href ? (
          <SidebarMenuItem key={item.key}>
            <SidebarMenuButton
              render={<Link href={item.href} />}
              isActive={pathname.startsWith(item.href)}
            >
              <item.icon />
              <span>{t(item.key)}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : (
          <SidebarMenuItem key={item.key}>
            <SidebarMenuButton disabled>
              <item.icon />
              <span>{t(item.key)}</span>
            </SidebarMenuButton>
            <SidebarMenuBadge>{t("soon")}</SidebarMenuBadge>
          </SidebarMenuItem>
        ),
      )}
    </SidebarMenu>
  );
}
