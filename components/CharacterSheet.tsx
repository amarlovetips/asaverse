"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Profile, Character, CharacterLook } from "@/lib/game-types";
import { DEFAULT_LOOK } from "@/lib/game-types";
import CharacterComposite from "./CharacterComposite";
import CharacterEditor from "./CharacterEditor";
import { usePlayDesigns } from "./usePlayDesigns";

export default function CharacterSheet({
  profile,
  onEnter,
}: {
  profile: Profile;
  onEnter: () => void;
}) {
  const [list, setList] = useState<Character[]>([]);
  const [selected, setSelected] = useState("");
  const [edit, setEdit] = useState<Character | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const { designs } = usePlayDesigns();

  const index = Math.max(0, list.findIndex((x) => x.id === selected));
  const c = list[index];
  const appearance: CharacterLook = {
    ...DEFAULT_LOOK,
    ...c?.appearance,
    parts: { ...c?.appearance?.parts },
  };

  useEffect(() => {
    let live = true;
    const db = createClient();
    void (async () => {
      const { data, error } = await db
        .from("characters")
        .select("id,character_name,level,xp,gold_coin,lust_coin,appearance")
        .eq("user_id", profile.id);
        if (!live) return;
        if (error) {
          setErr(error.message);
          return;
        }
        const rows = (data || []) as Character[];
        setList(rows);
        if (rows[0]) setSelected(rows[0].id);
    })();
    return () => { live = false; };
  }, [profile.id]);

  async function save(name: string, look: CharacterLook) {
    setBusy(true);
    setErr("");
    try {
      const db = createClient();
      const query = edit
        ? db.from("characters")
            .update({ character_name: name, appearance: look })
            .eq("id", edit.id)
            .eq("user_id", profile.id)
        : db.from("characters").insert({
            user_id: profile.id,
            character_name: name,
            appearance: look,
            level: 1,
            xp: 0,
            position_x: 0,
            position_y: 0,
            tutorial_completed: false,
            gold_coin: 0,
            lust_coin: 0,
          });

      const { data, error } = await query
        .select("id,character_name,level,xp,gold_coin,lust_coin,appearance")
        .single();

      if (error) throw error;
      const value = data as Character;
      setList((old) => edit
        ? old.map((item) => item.id === value.id ? value : item)
        : [...old, value]);
      setSelected(value.id);
      setEdit(null);
      setShow(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!c || !confirm(`Delete ${c.character_name}?`)) return;
    const { error } = await createClient()
      .from("characters")
      .delete()
      .eq("id", c.id)
      .eq("user_id", profile.id);

    if (error) {
      setErr(error.message);
      return;
    }
    const remaining = list.filter((item) => item.id !== c.id);
    setList(remaining);
    setSelected(remaining[0]?.id || "");
  }

  function enter() {
    if (!c) return;
    localStorage.setItem(
      "asaverse.selectedCharacter",
      JSON.stringify({ ...c, appearance })
    );
    onEnter();
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#050b19] text-white">
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
        <div>
          <p className="text-xs tracking-widest text-cyan-300">ASAVERSE</p>
          <h1 className="text-xl font-black">CHARACTERS</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { setEdit(null); setShow(true); setErr(""); }} className="rounded-lg bg-cyan-300 px-3 py-2 font-bold text-slate-950">＋ CREATE</button>
          {c && <>
            <button type="button" onClick={() => { setEdit(c); setShow(true); setErr(""); }} className="rounded-lg border p-2">✎</button>
            <button type="button" onClick={() => void remove()} className="rounded-lg border border-rose-400 p-2 text-rose-300">⌫</button>
          </>}
        </div>
      </header>

      <section className="absolute inset-x-0 bottom-3 top-20 flex flex-col items-center justify-center gap-1">
        <div className="z-10 text-center">
          <h2 className="text-2xl font-black sm:text-3xl">{c?.character_name ?? "CREATE YOUR HERO"}</h2>
          <p className="mt-1 text-sm tracking-widest text-cyan-200">{c ? `LEVEL ${c.level} · XP ${c.xp}` : "YOUR ADVENTURE AWAITS"}</p>
        </div>

        {designs.length > 0 ? (
          <div className="flex h-[min(68vh,650px)] w-[min(70vw,480px)] items-center justify-center">
            <CharacterComposite look={appearance} designs={designs} size={560} />
          </div>
        ) : null}

        <button disabled={!c} onClick={enter} className="z-10 rounded-xl border-2 border-cyan-200 bg-cyan-300 px-10 py-3 font-black tracking-widest text-slate-950 shadow-[0_0_25px_#22d3ee55] disabled:opacity-40">ENTER GAME →</button>

        {list.length > 1 && <div className="absolute inset-x-2 top-1/2 flex justify-between">
          <button type="button" onClick={() => setSelected(list[(index + list.length - 1) % list.length].id)} className="grid size-12 place-items-center rounded-full border border-cyan-300/50 bg-black/50 text-3xl">‹</button>
          <button type="button" onClick={() => setSelected(list[(index + 1) % list.length].id)} className="grid size-12 place-items-center rounded-full border border-cyan-300/50 bg-black/50 text-3xl">›</button>
        </div>}

        {err && <p className="max-w-sm break-words text-center text-xs text-rose-300">{err}</p>}
      </section>

      {show && <CharacterEditor
        key={edit?.id || "new-character"}
        initialName={edit?.character_name}
        initialAppearance={edit?.appearance}
        title={edit ? "Edit Character" : "Create Character"}
        busy={busy}
        error={err}
        onClose={() => { setShow(false); setEdit(null); setErr(""); }}
        onSave={save}
      />}
    </main>
  );
}
