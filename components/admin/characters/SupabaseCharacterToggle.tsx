"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase";

export default function SupabaseCharacterToggle() {
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const db = createClient();
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw Error("Please sign in.");
      const { data: admin, error: adminError } = await db
        .from("admin_users").select("role,is_active")
        .eq("user_id", user.id).maybeSingle();
      if (adminError || admin?.role !== "admin" || !admin.is_active)
        throw Error("Admin permission denied.");

      const { data, error } = await db.from("game_settings")
        .select("setting_value")
        .eq("setting_key", "play_supabase_characters_enabled")
        .maybeSingle();
      if (error) throw error;
      if (data) setEnabled(data.setting_value === "true");
      else setMessage("Setting missing. Run the setup SQL first.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load setting.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggle() {
    setBusy(true);
    setMessage("");
    try {
      const db = createClient();
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw Error("Please sign in.");
      const { data: admin, error: adminError } = await db
        .from("admin_users").select("role,is_active")
        .eq("user_id", user.id).maybeSingle();
      if (adminError || admin?.role !== "admin" || !admin.is_active)
        throw Error("Admin permission denied.");

      const next = !enabled;
      const { error } = await db.from("game_settings").upsert({
        setting_key: "play_supabase_characters_enabled",
        setting_value: String(next),
        updated_at: new Date().toISOString()
      }, { onConflict: "setting_key" });
      if (error) throw error;
      setEnabled(next);
      setMessage(next ? "Supabase characters enabled." : "Supabase characters disabled.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save setting.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900 p-4">
    <div>
      <h3 className="font-semibold">Supabase Characters</h3>
      <p className="text-xs text-slate-400">Control whether Supabase character designs appear in /play.</p>
      {message && <p role="status" className="mt-2 text-xs text-slate-300">{message}</p>}
    </div>
    <button type="button" disabled={busy} onClick={() => void toggle()}
      aria-pressed={enabled}
      className={`rounded px-4 py-2 text-sm font-semibold disabled:opacity-50 ${enabled ? "bg-emerald-700" : "bg-slate-700"}`}>
      {busy ? "Loading..." : enabled ? "ON · Click to disable" : "OFF · Click to enable"}
    </button>
  </section>;
}
