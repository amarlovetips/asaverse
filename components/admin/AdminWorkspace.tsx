import PixelArtEditor from "./PixelArtEditor";
import CharactersWorkspace from "./characters/CharactersWorkspace";
import GitHubCharacterWorkspace from "./characters/GitHubCharacterWorkspace";
import WalkAnimationWorkspace from "./WalkAnimationWorkspace";

export default function AdminWorkspace({ active, routeRemainder = [] }: { active: string; routeRemainder?: string[] }) {
  const editor = active === "Pixel Art Studio" || active === "Appearance Editor";

  return (
    <main className="h-[calc(100vh-56px)] min-w-0 flex-1 overflow-hidden p-1">
      {active === "Walk Animations" ? (
        <WalkAnimationWorkspace routeRemainder={routeRemainder} />
      ) : active === "Characters" ? (
        <CharactersWorkspace />
      ) : active === "GitHub Character" ? (
        <GitHubCharacterWorkspace />
      ) : editor ? (
        <PixelArtEditor />
      ) : (
        <div className="p-6 text-slate-300">
          <p className="text-xs text-slate-500">Admin Studio / {active}</p>
          <h2 className="mt-2 text-xl font-semibold">{active}</h2>
          <p className="mt-4">Workspace ready for {active}.</p>
        </div>
      )}
    </main>
  );
}
