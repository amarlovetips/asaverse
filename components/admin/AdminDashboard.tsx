"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import AdminWorkspace from "./AdminWorkspace";
import { adminMenuHref, resolveAdminRoute } from "./menu-config";

export default function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();
  const route = resolveAdminRoute(pathname);
  const [expandedOverride, setExpandedOverride] = useState<{ pathname: string; menu: string } | null>(null);
  const expanded = expandedOverride?.pathname === pathname ? expandedOverride.menu : route.menuName;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function openMenu(menuName: string, forceExpand = false) {
    const path = adminMenuHref(menuName);
    setExpandedOverride({ pathname: path, menu: forceExpand || expanded !== menuName ? menuName : "" });
    window.history.pushState(null, "", path);
    setMobileOpen(false);
  }

  function openItem(menuName: string, itemName: string) {
    setExpandedOverride(null);
    window.history.pushState(null, "", adminMenuHref(menuName, itemName));
    setMobileOpen(false);
  }

  return <div className="flex h-screen overflow-hidden bg-[#11151c] text-[#d9e0e9]">
    <AdminSidebar {...{ collapsed, setCollapsed, expanded, mobileOpen, setMobileOpen, active: route.active, activeMenu: route.menuName,
      onOpenMenu: openMenu, onOpenItem: openItem, onLogout }} />
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-16 items-center gap-3 border-b border-[#303844] bg-[#191f28] px-4">
        <button onClick={() => setMobileOpen(true)} className="rounded-lg px-3 py-2 hover:bg-[#29313d] md:hidden">☰</button>
        <div className="min-w-0 flex-1"><p className="truncate text-sm text-[#9aa8b8]">Admin Studio / {route.menuName} / {route.active}</p><h1 className="font-semibold">{route.active}</h1></div>
        <span className="hidden text-xs text-[#a7c9b7] sm:block">Admin</span>
      </header>
      <AdminWorkspace active={route.active} routeRemainder={route.remainder} />
    </section>
  </div>;
}
