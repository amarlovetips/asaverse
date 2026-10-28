export const menus = [
  { name: "Overview", icon: "⌂", items: ["Dashboard", "Activity Log"] },
  { name: "Game World", icon: "◎", items: ["World Settings", "Regions & Villages", "Teleport Points", "World Events"] },
  { name: "Character Studio", icon: "♙", items: ["Characters", "GitHub Character", "Appearance Editor", "Walk Animations", "Character Limits"] },
  { name: "Equipment", icon: "◈", items: ["Equipments", "Equipment Studio", "Animation", "Effects"] },
  { name: "Map Tools", icon: "▦", items: ["Map Generator", "Map Editor", "Tiles & Objects", "Tiles & Object List", "Collision & Spawns"] },
  { name: "Combat & AI", icon: "⚔", items: ["Enemies", "Enemy AI", "Battle Settings", "Bosses & Dungeons"] },
  { name: "Items & Economy", icon: "◇", items: ["Items", "Gold Coin", "Lust Coin", "Trading & Drops"] },
  { name: "Spells & Skills", icon: "✧", items: ["Spell Editor", "Skill Tree", "Cooldowns & Effects"] },
  { name: "Players", icon: "♧", items: ["Player Accounts", "Inventory", "Permissions & Bans"] },
  { name: "Content", icon: "▤", items: ["Homepage", "Announcements", "Events", "Updates"] },
  { name: "Database", icon: "▥", items: ["Supabase Status", "Game Settings", "Data Tools"] },
  { name: "Developer Tools", icon: "⌘", items: ["Pixel Art Studio", "Code Generator", "GitHub Publisher"] },
  { name: "Settings", icon: "⚙", items: ["Admin Settings", "Interface", "Security"] },
];

export function adminSlug(value: string) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function adminMenuHref(menuName: string, itemName?: string) {
  const menu = menus.find(entry => entry.name === menuName);
  if (!menu) return "/admin";
  const root = `/admin/${adminSlug(menu.name)}`;
  return itemName && menu.items.includes(itemName) ? `${root}/${adminSlug(itemName)}` : root;
}

export function resolveAdminRoute(pathname: string) {
  const segments = pathname.split("/").filter(Boolean).slice(1);
  if (!segments.length) return { menuName: "Overview", active: "Dashboard", remainder: [] as string[] };

  const menu = menus.find(entry => adminSlug(entry.name) === segments[0]);
  if (!menu) return { menuName: "Overview", active: "Dashboard", remainder: [] as string[] };

  const item = menu.items.find(entry => adminSlug(entry) === segments[1]);
  return {
    menuName: menu.name,
    active: item || menu.name,
    remainder: item ? segments.slice(2) : segments.slice(1),
  };
}
