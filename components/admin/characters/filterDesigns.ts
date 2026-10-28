import type { Design } from "./components/DesignList";

/**
 * Checks whether a design type belongs to one of Character Studio's supported categories:
 * - Face (face, head, face-back)
 * - Body (body, base-body, body-back)
 * - Clothing (clothing, outfit, suit, dress, etc.)
 * - Facial Hair (facial-hair, facial_hair, etc.)
 * - Hair (hair, hair-back)
 *
 * Any Tiles & Objects categories (e.g. tiles, object, tree, water, stone, terrain, grass)
 * return false and are completely excluded from Character Studio.
 */
export function isCharacterDesignType(designType: string): boolean {
  if (!designType) return false;
  const type = designType.toLowerCase();
  const base = type.endsWith("-back") ? type.slice(0, -5) : type;

  // Exclude explicit tiles and objects categories
  const nonCharacterCategories = [
    "tiles",
    "object",
    "objects",
    "tree",
    "water",
    "stone",
    "terrain",
    "decoration",
    "grass",
    "map",
    "relic",
    "head", // equipment category 'head'
  ];
  if (nonCharacterCategories.includes(base) || nonCharacterCategories.includes(type)) {
    return false;
  }

  return (
    base === "face" ||
    base === "body" ||
    base === "base-body" ||
    /cloth|outfit|suit|dress/.test(base) ||
    /facial[-_ ]?hair|beard|mustache/.test(base) ||
    base === "hair"
  );
}

export function filterDesigns(items: Design[], category: string, status: string) {
  return items.filter((d) => {
    const type = (d.design_type || "").toLowerCase();
    const base = type.endsWith("-back") ? type.slice(0, -5) : type;

    // Strictly ensure only genuine character designs are shown in Character Studio
    if (!isCharacterDesignType(type)) return false;

    const categoryMatch =
      category === "all" ||
      (category === "body" && ["body", "base-body"].includes(base)) ||
      (category === "face" && base === "face") ||
      (category === "clothing" && /cloth|outfit|suit|dress/.test(base)) ||
      (category === "facial-hair" && /facial[-_ ]?hair|beard|mustache/.test(base)) ||
      (category === "hair" && base === "hair");

    const statusMatch = status === "published"
      ? d.is_published === true
      : d.is_published !== true;

    return categoryMatch && statusMatch;
  });
}
