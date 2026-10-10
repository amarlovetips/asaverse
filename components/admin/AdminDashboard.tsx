"use client";
import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminWorkspace from "./AdminWorkspace";

export default function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [active, setActive] = useState("Dashboard");
  const [expanded, setExpanded] = useState("Overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return <div className="flex h-screen overflow-hidden bg-[#11151c] text-[#d9e0e9]">
    <AdminSidebar {...{ collapsed, setCollapsed, expanded, setExpanded, mobileOpen, setMobileOpen, active, setActive, onLogout }} />
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-16 items-center gap-3 border-b border-[#303844] bg-[#191f28] px-4">
        <button onClick={() => setMobileOpen(true)} className="rounded-lg px-3 py-2 hover:bg-[#29313d] md:hidden">☰</button>
        <div className="min-w-0 flex-1"><p className="truncate text-sm text-[#9aa8b8]">Admin Studio / {active}</p><h1 className="font-semibold">{active}</h1></div>
        <span className="hidden text-xs text-[#a7c9b7] sm:block">Admin</span>
      </header>
      <AdminWorkspace active={active} />
    </section>
  </div>;
}
