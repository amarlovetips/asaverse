import PixelArtEditor from "./PixelArtEditor";
import CharactersWorkspace from "./characters/CharactersWorkspace";
import GitHubCharacterWorkspace from "./characters/GitHubCharacterWorkspace";
import WalkAnimationWorkspace from "./WalkAnimationWorkspace";
import EquipmentWorkspace from "./equipment/EquipmentWorkspace";
import EquipmentStudio from "./equipment/studio/EquipmentStudio";
import EquipmentAnimationWorkspace from "./equipment/EquipmentAnimationWorkspace";
import EquipmentEffectsWorkspace from "./equipment/EquipmentEffectsWorkspace";
import MapToolsWorkspace from "./map/MapToolsWorkspace";
import MapEditorWorkspace from "./map/MapEditorWorkspace";
import TileObjectStudio from "./map/TileObjectStudio";
import TileObjectListWorkspace from "./map/TileObjectListWorkspace";
import TilesObjectsAnimationWorkspace from "./map/TilesObjectsAnimationWorkspace";
import SpecialEventsWorkspace from "./map/SpecialEventsWorkspace";

export default function AdminWorkspace({ active, routeRemainder = [] }: { active: string; routeRemainder?: string[] }) {
  const editor = active === "Pixel Art Studio" || active === "Appearance Editor";

  return (
    <main className="h-full min-h-0 min-w-0 flex-1 overflow-hidden p-1">
      {active === "Walk Animations" ? (
        <WalkAnimationWorkspace routeRemainder={routeRemainder} />
      ) : active === "Characters" ? (
        <CharactersWorkspace />
      ) : active === "GitHub Character" ? (
        <GitHubCharacterWorkspace />
      ) : active === "Equipments" ? (
        <EquipmentWorkspace />
      ) : active === "Equipment Studio" ? (
        <EquipmentStudio routeRemainder={routeRemainder} />
      ) : active === "Animation" ? (
        <EquipmentAnimationWorkspace routeRemainder={routeRemainder} />
      ) : active === "Effects" ? (
        <EquipmentEffectsWorkspace />
      ) : active === "Tiles & Objects" ? (
        <TileObjectStudio routeRemainder={routeRemainder} />
      ) : active === "Tiles & Object List" ? (
        <TileObjectListWorkspace routeRemainder={routeRemainder} />
      ) : active === "Tiles & Objects Animation" ? (
        <TilesObjectsAnimationWorkspace routeRemainder={routeRemainder} />
      ) : active === "Map Generator" ? (
        <MapToolsWorkspace routeRemainder={routeRemainder} />
      ) : active === "Map Editor" ? (
        <MapEditorWorkspace routeRemainder={routeRemainder} />
      ) : active === "Special Events" ? (
        <SpecialEventsWorkspace />
      ) : editor ? (
        <PixelArtEditor />
      ) : (
        <div className="p-6 text-slate-300">
          <p>Workspace ready for {active}.</p>
        </div>
      )}
    </main>
  );
}
