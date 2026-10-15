"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import PixelHero from "./PixelHero";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CharacterLook } from "@/lib/game-types";
import { DEFAULT_LOOK } from "@/lib/game-types";
import CharacterComposite from "./CharacterComposite";
import { usePlayDesigns } from "./usePlayDesigns";
import { getCharacterDesignSlot, getDefaultCharacterParts } from "@/lib/character-design-defaults";

const tabs = [
  { id: "face", label: "Face", key: "face" },
  { id: "body", label: "Body", key: "body" },
  { id: "clothing", label: "Clothings", key: "clothing" },
  { id: "facial-hair", label: "Facial Hair", key: "facialHair" },
  { id: "hair", label: "Hair", key: "hair" },
  { id: "hat", label: "Hat", key: "hat" },
] as const;

type Category = typeof tabs[number]["id"];
type PartKey = typeof tabs[number]["key"];

function getCategory(type: string): string {
  const slot = getCharacterDesignSlot(type);
  return slot === "facialHair" ? "facial-hair" : slot || type.toLowerCase().replace(/-back$/, "");
}

export default function CharacterEditor({
  initialName = "",
  initialAppearance,
  title,
  busy,
  error,
  onClose,
  onSave,
}: {
  initialName?: string;
  initialAppearance?: CharacterLook | null;
  title: string;
  busy: boolean;
  error?: string;
  onClose: () => void;
  onSave: (name: string, look: CharacterLook) => Promise<void>;
}) {
  const { designs, loading, error: designError } = usePlayDesigns();
  const defaultsSeeded = useRef(false);
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<Category>("face");
  const [look, setLook] = useState<CharacterLook>({
    ...DEFAULT_LOOK,
    ...initialAppearance,
    parts: { ...initialAppearance?.parts },
  });

  useEffect(() => {
    setName(initialName);
    setLook({
      ...DEFAULT_LOOK,
      ...initialAppearance,
      parts: { ...initialAppearance?.parts },
    });
    defaultsSeeded.current = Boolean(initialAppearance);
  }, [initialName, initialAppearance]);

  useEffect(() => {
    if (loading || defaultsSeeded.current || initialAppearance) return;
    defaultsSeeded.current = true;
    const defaults = getDefaultCharacterParts(designs);
    setLook((current) => ({
      ...current,
      parts: { ...defaults, ...current.parts },
    }));
  }, [designs, initialAppearance, loading]);

  const tab = tabs.find((item) => item.id === category)!;
  const filtered = designs.filter(
    (d) =>
      getCategory(d.design_type) === category &&
      !d.design_type.toLowerCase().endsWith("-back")
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim()) void onSave(name.trim(), look);
  }

  function chooseDesign(id: string) {
    const key: PartKey = tab.key;
    setLook((old) => ({
      ...old,
      parts: { ...old.parts, [key]: old.parts?.[key] === id ? null : id },
    }));
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#040b20] text-white">
      <form
        onSubmit={submit}
        className="mx-auto flex min-h-screen max-w-6xl flex-col p-4 sm:p-7"
      >
        <header className="flex items-center justify-between border-b border-cyan-300/30 pb-4">
          <h2 className="font-mono text-xl font-black tracking-widest text-cyan-300 sm:text-2xl">
            {title.toUpperCase()}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-cyan-300 px-3 py-2 font-mono text-cyan-200"
          >
            ↩ BACK
          </button>
        </header>

        <div className="grid flex-1 gap-5 py-5 lg:grid-cols-[.9fr_1.1fr]">
          <section className="flex min-h-[560px] flex-col items-center justify-between border border-cyan-300/30 bg-[radial-gradient(ellipse_at_center,#123f67,#07142c_65%)] p-5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={3}
              maxLength={24}
              placeholder="CHARACTER NAME..."
              className="w-full border-b-2 border-cyan-300 bg-black/20 p-3 font-mono outline-none"
            />

            <div className="flex h-[560px] min-h-0 w-full flex-none items-center justify-center overflow-hidden translate-y-10">
              {designs.length > 0 ? <CharacterComposite look={look} designs={designs} size={560} /> : null}
            </div>
          </section>

          <section className="flex flex-col gap-4 border-2 border-cyan-400 bg-[#087f98] p-3 sm:p-5">
            <nav className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {tabs.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setCategory(item.id)}
                  className={`border-2 px-2 py-3 text-xs font-bold ${
                    category === item.id
                      ? "border-yellow-300 bg-[#053249] text-white"
                      : "border-cyan-300/60 bg-[#075b75] text-cyan-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {loading && (
              <p className="text-center text-sm text-cyan-100">Loading...</p>
            )}
            {designError && (
              <p role="alert" className="break-words text-sm text-red-200">
                {designError}
              </p>
            )}

            {!loading && !designError && filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-cyan-100">
                No items available.
              </p>
            )}

            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {filtered.map((design) => {
                const active = look.parts?.[tab.key] === design.id;
                return (
                  <button
                    type="button"
                    key={design.id}
                    onClick={() => chooseDesign(design.id)}
                    aria-label={active ? "Selected item" : "Select item"}
                    aria-pressed={active}
                    className={`grid !h-[76px] !w-[76px] !min-h-[76px] !min-w-[76px] shrink-0 overflow-hidden place-items-center border-2 p-1 ${
                      active
                        ? "border-yellow-300 bg-[#053249] ring-2 ring-yellow-300/50"
                        : "border-cyan-300/50 bg-[#075b75] hover:border-white"
                    }`}
                  >
                    <PixelHero size={68}
                      pixelData={design.pixel_data}
                      canvasWidth={design.canvas_width}
                      canvasHeight={design.canvas_height} cropToPixels
                    />
                  </button>
                );
              })}
            </div>

            <p className="text-center text-xs text-cyan-100">
              Tap a selected item again to remove it.
            </p>

            <div className="mt-auto pt-2">
              <button
                disabled={busy}
                className="w-full border-2 border-cyan-200 bg-cyan-300 p-4 font-mono font-black tracking-widest text-[#052139] hover:bg-cyan-100 disabled:opacity-50"
              >
                {busy
                  ? "SAVING..."
                  : `◆ ${title === "Edit Character" ? "SAVE CHANGES" : "CREATE CHARACTER"} ◆`}
              </button>
              {error && (
                <p className="mt-3 break-words text-sm text-red-100">{error}</p>
              )}
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}
