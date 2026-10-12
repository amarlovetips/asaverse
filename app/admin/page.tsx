"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import AdminDashboard from "@/components/admin/AdminDashboard";
import LoadingScreen from "@/components/LoadingScreen";

export default function AdminPage() {
  const [email, E] = useState("");
  const [password, P] = useState("");
  const [error, S] = useState("");
  const [busy, B] = useState(false);
  const [checking, C] = useState(true);
  const [ok, O] = useState(false);

  useEffect(() => {
    let live = true;

    async function restoreAdmin() {
      try {
        const db = createClient();
        const { data: { session }, error } = await db.auth.getSession();
        if (error) throw error;
        if (!session) return;

        const { data: admin, error: check } = await db
          .from("admin_users")
          .select("role,is_active")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (check) throw check;

        if (admin?.role === "admin" && admin.is_active) {
          if (live) O(true);
        } else {
          await db.auth.signOut();
        }
      } catch (e) {
        if (live) S(e instanceof Error ? e.message : "Session restore failed");
      } finally {
        if (live) C(false);
      }
    }

    void restoreAdmin();
    return () => { live = false; };
  }, []);

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const started = Date.now();
    B(true);
    S("");

    try {
      const db = createClient();
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error || !data.user) throw new Error(error?.message || "Login failed");

      const { data: admin, error: check } = await db
        .from("admin_users")
        .select("role,is_active")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (check || !admin || admin.role !== "admin" || !admin.is_active) {
        await db.auth.signOut();
        throw new Error("Admin permission denied");
      }

      const wait = 1800 - (Date.now() - started);
      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
      O(true);
    } catch (e) {
      const wait = 1800 - (Date.now() - started);
      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
      S(e instanceof Error ? e.message : "Login failed");
    } finally {
      B(false);
    }
  }

  if (checking || busy) {
    return <LoadingScreen message={checking ? "Restoring admin session..." : "Checking admin access..."} />;
  }

  if (ok) {
    return <AdminDashboard onLogout={async () => {
      await createClient().auth.signOut();
      O(false);
    }} />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#070b17] p-5 text-white">
      <section className="w-full max-w-md rounded-2xl border border-cyan-900 bg-[#101827] p-8">
        <h1 className="mb-2 text-3xl font-black">AsaVerse Admin</h1>
        <form onSubmit={login} className="grid gap-4">
          <input className="rounded-lg bg-slate-800 p-3" type="email" placeholder="Admin Gmail" value={email} onChange={e => E(e.target.value)} required />
          <input className="rounded-lg bg-slate-800 p-3" type="password" placeholder="Password" value={password} onChange={e => P(e.target.value)} required />
          <button disabled={busy} className="rounded-lg bg-cyan-600 p-3 font-bold">
            Admin Login
          </button>
          {error && <p className="break-words text-red-300">{error}</p>}
        </form>
      </section>
    </main>
  );
}
