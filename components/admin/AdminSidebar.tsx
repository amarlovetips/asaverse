"use client";
import { menus } from "./menu-config";

export default function AdminSidebar({ collapsed, setCollapsed, expanded, setExpanded, mobileOpen, setMobileOpen, active, setActive, onLogout }: any) {
  return <>
    {mobileOpen && <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-black/50 md:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#303844] bg-[#191f28] transition-all md:relative md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} ${collapsed ? "w-20" : "w-64"}`}>
      <header className="flex h-16 items-center justify-between border-b border-[#303844] px-4">
        {!collapsed && <div className="font-bold">AsaVerse <small className="block text-[#96a4b5]">Admin Studio</small></div>}
        <button onClick={() => setCollapsed(!collapsed)} className="px-3 py-2">{collapsed ? "»" : "«"}</button>
      </header>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {menus.map(menu => <div key={menu.name}>
          <button title={collapsed ? menu.name : ""} onClick={() => { if (collapsed) setCollapsed(false); setExpanded(expanded === menu.name ? "" : menu.name); }} className="flex w-full gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[#29313d]">
            <span>{menu.icon}</span>{!collapsed && <><span className="flex-1">{menu.name}</span><span>{expanded === menu.name ? "−" : "+"}</span></>}
          </button>
          {!collapsed && expanded === menu.name && <div className="ml-5 border-l border-[#3b4654] pl-3">
            {menu.items.map(item => <button key={item} onClick={() => { setActive(item); setMobileOpen(false); }} className={`block w-full rounded-md px-3 py-2 text-left text-sm ${active === item ? "bg-[#354555] text-white" : "text-[#aeb9c7] hover:bg-[#252d38]"}`}>{item}</button>)}
          </div>}
        </div>)}
      </nav>
      <button onClick={onLogout} className="border-t border-[#303844] p-4 text-left text-sm text-[#d0a8a8]">{collapsed ? "↪" : "↪ Sign out"}</button>
    </aside>
  </>;
}
