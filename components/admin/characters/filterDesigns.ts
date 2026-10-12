import type { Design } from "./components/DesignList";

export function filterDesigns(items: Design[], category: string, status: string) {
  return items.filter(d => {
    const type = d.design_type.toLowerCase();
    const base = type.endsWith("-back") ? type.slice(0, -5) : type;
    const categoryMatch =
      category === "all" ||
      (category === "body" && ["body", "base-body"].includes(base)) ||
      (category === "face" && base === "face") ||
      (category === "clothing" && /cloth|outfit|suit|dress/.test(base)) ||
      (category === "facial-hair" && /facial-hair|facial_hair/.test(base)) ||
      (category === "hair" && base === "hair");
    const statusMatch = status === "published"
      ? d.is_published === true
      : d.is_published !== true;
    return categoryMatch && statusMatch;
  });
}
