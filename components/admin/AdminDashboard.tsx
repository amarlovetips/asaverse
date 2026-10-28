"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import AdminWorkspace from "./AdminWorkspace";
import { adminMenuHref, resolveAdminRoute } from "./menu-config";

export default function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();
  const [currentPath, setCurrentPath] = useState(pathname);

  useEffect(() => {
    setCurrentPath(pathname);
  }, [pathname]);

  useEffect(() => {
    const onLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", onLocationChange);
    return () => window.removeEventListener("popstate", onLocationChange);
  }, []);

  const route = resolveAdminRoute(currentPath);
  const [expandedOverride, setExpandedOverride] = useState<{ pathname: string; menu: string } | null>(null);
  const expanded = expandedOverride?.pathname === currentPath ? expandedOverride.menu : route.menuName;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function openMenu(menuName: string, forceExpand = false) {
    const path = adminMenuHref(menuName);
    setExpandedOverride({ pathname: path, menu: forceExpand || expanded !== menuName ? menuName : "" });
    window.history.pushState(null, "", path);
    setCurrentPath(path);
    setMobileOpen(false);
  }

  function openItem(menuName: string, itemName: string) {
    setExpandedOverride(null);
    const path = adminMenuHref(menuName, itemName);
    window.history.pushState(null, "", path);
    setCurrentPath(path);
    setMobileOpen(false);
  }

  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-[#11151c] text-[#d9e0e9]">
      <AdminSidebar
        {...{
          collapsed,
          setCollapsed,
          expanded,
          mobileOpen,
          setMobileOpen,
          active: route.active,
          activeMenu: route.menuName,
          onOpenMenu: openMenu,
          onOpenItem: openItem,
          onLogout,
        }}
      />
      <section className="relative flex min-w-0 flex-1 flex-col">
        <button
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="fixed bottom-4 left-4 z-20 rounded-lg border border-[#3b4654] bg-[#191f28] px-3 py-2 shadow-lg md:hidden"
        >
          ☰
        </button>
        <AdminWorkspace active={route.active} routeRemainder={route.remainder} />
      </section>
    </div>
  );
}
