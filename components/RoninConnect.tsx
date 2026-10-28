"use client";
import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, type Connector } from "wagmi";
import { createClient } from "@/lib/supabase";
import WalletPicker from "./WalletPicker";

type Login = { address: string; userId: string };

const UNLOCK_POLL_MS = 1500;
const UNLOCK_WAIT_TIMEOUT_MS = 120_000;
// Injected wallets (Ronin included) surface locked-wallet failures with these
// messages; a plain user rejection arrives as EIP-1193 code 4001 instead.
const LOCKED_PATTERN = /locked|unlock|no accounts available|not connected/i;

type Eip1193Like = { request: (args: { method: string; params?: unknown }) => Promise<unknown> };

// `signInWithWeb3` calls `eth_requestAccounts` internally, which asks the
// wallet for a second connection approval (Ronin shows a risk/approval popup
// for it on unverified domains such as localhost or preview URLs). We already
// connected through wagmi, so `eth_accounts` returns the same address silently.
// `eth_chainId` and `personal_sign` pass through untouched — the ownership
// signature is still produced and verified server-side by Supabase
// (`/token?grant_type=web3`). No transaction or token approval is involved.
function silentAccountsProvider(provider: Eip1193Like) {
  return {
    request: (args: { method: string; params?: unknown }) =>
      provider.request(args.method === "eth_requestAccounts" ? { method: "eth_accounts", params: args.params } : args),
  };
}

function errorText(e: unknown) { return e instanceof Error ? e.message : String(e ?? ""); }
function isRejected(e: unknown) {
  return (e as { code?: number } | null)?.code === 4001 || /user rejected|rejected the request/i.test(errorText(e));
}
function isLocked(e: unknown) { return LOCKED_PATTERN.test(errorText(e)); }

export default function RoninConnect({ onLogin, onLogout, onRestoreReady }: { onLogin:(v:Login)=>void; onLogout:()=>void; onRestoreReady:(ready:boolean)=>void }) {
  const [ready,R]=useState(false),[open,O]=useState(false),[busy,B]=useState(false),[msg,M]=useState(""),[status,S]=useState(""),[waiting,W]=useState(false),[authed,A]=useState(false);
  const {address,isConnected,connector:active,status:accountStatus}=useAccount();
  const {connectAsync,connectors,error}=useConnect();
  const {disconnect}=useDisconnect();
  // Single-flight guard: at most one connect+signature pipeline can exist.
  const loginFlight = useRef<Promise<void> | null>(null);
  // Pending unlock watcher: keeps the intent alive without re-prompting.
  const unlockWait = useRef<{ poll: number; timeout: number } | null>(null);
  const resumeAfterUnlock = useRef<(() => void) | null>(null);
  const restoreReported = useRef(false);
  // Latest account state, so async resumes never act on stale render closures.
  const accountState = useRef({ isConnected, address, activeUid: active?.uid });

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>R(true),[]);
  useEffect(() => { accountState.current = { isConnected, address, activeUid: active?.uid }; });
  useEffect(() => () => { stopUnlockWait(); }, []);
  function stopUnlockWait() {
    if (unlockWait.current) {
      window.clearInterval(unlockWait.current.poll);
      window.clearTimeout(unlockWait.current.timeout);
      unlockWait.current = null;
    }
    resumeAfterUnlock.current = null;
    W(false);
  }

  // Keeps the pending intent alive while the wallet is locked. `eth_accounts`
  // never shows a prompt, so polling is silent; once accounts appear the
  // pending connection/signature resumes exactly once.
  function waitForUnlock(connector: Connector, resume: () => void) {
    if (unlockWait.current) return;
    unlockWait.current = { poll: 0, timeout: 0 };
    resumeAfterUnlock.current = resume;
    M("");
    S("Wallet locked — unlock Ronin to continue. The request resumes automatically, no need to click again.");
    W(true);
    void connector.getProvider().then((raw) => {
      if (!unlockWait.current) return; // cancelled while resolving
      const provider = raw as unknown as Eip1193Like;
      const poll = window.setInterval(() => {
        void provider.request({ method: "eth_accounts" }).then(accounts => {
          if (!Array.isArray(accounts) || !accounts.length) return;
          const resumeFn = resumeAfterUnlock.current;
          stopUnlockWait();
          if (!resumeFn) return;
          S("Wallet unlocked — resuming…");
          resumeFn();
        }).catch(() => { /* still locked or unavailable; keep polling */ });
      }, UNLOCK_POLL_MS);
      const timeout = window.setTimeout(() => {
        stopUnlockWait();
        S("");
        M("Timed out waiting for the wallet unlock. Open Connect Wallet to try again.");
      }, UNLOCK_WAIT_TIMEOUT_MS);
      unlockWait.current = { poll, timeout };
    }).catch(() => {
      stopUnlockWait();
      S("");
      M("Could not reach the wallet extension. Reload the page and try again.");
    });
  }

  function cancelUnlockWait() { stopUnlockWait(); S(""); M("Cancelled. Open Connect Wallet whenever you are ready to try again."); }

  async function loginFlow(c: Connector) {
    B(true); M(""); S("Connecting to wallet…");
    try {
      const state = accountState.current;
      if (state.isConnected && state.activeUid && state.activeUid !== c.uid)
        throw Error("Disconnect the current wallet first.");

      let wallet: string;
      if (state.isConnected && state.address) {
        wallet = state.address;
      } else {
        S("Approve the connection request in your wallet…");
        const v = await connectAsync({ connector: c });
        wallet = v.accounts[0];
      }

      const db = createClient();
      const { data: { session } } = await db.auth.getSession();
      const savedWallet = localStorage.getItem("asaverse.wallet");
      let started = Number(localStorage.getItem("asaverse.loginAt") || 0);

      if (session && savedWallet?.toLowerCase() === wallet.toLowerCase()) {
        if (!started) {
          started = Date.now();
          localStorage.setItem("asaverse.loginAt", String(started));
        }

        let { data: profile, error } = await db.from("profiles")
          .select("wallet_address")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!profile && !error) {
          const fallback = await db.from("profiles")
            .select("wallet_address")
            .ilike("wallet_address", wallet)
            .maybeSingle();
          profile = fallback.data;
          error = fallback.error;
        }

        if (error) throw error;

        if (profile?.wallet_address?.toLowerCase() === wallet.toLowerCase()) {
          A(true); S("");
          onLogin({ address: wallet, userId: session.user.id });
          O(false);
          return;
        }
      }

      S("Waiting for your signature to verify wallet ownership (no transaction or approval)…");
      const provider = await c.getProvider() as unknown as Eip1193Like;
      const { data, error } = await db.auth.signInWithWeb3({
        chain: "ethereum",
        statement: "Sign in to AsaVerse to verify wallet ownership. No transaction or token approval is requested.",
        wallet: silentAccountsProvider(provider) as never
      });

      if (error || !data.user) throw error ?? Error("Login failed");
      localStorage.setItem("asaverse.loginAt", String(Date.now()));
      localStorage.setItem("asaverse.wallet", wallet);
      A(true); S("");
      onLogin({ address: wallet, userId: data.user.id });
      O(false);
    } finally {
      B(false);
    }
  }

  // Single-flight entry point: concurrent calls join the in-flight attempt
  // instead of starting another connection or signature request.
  function startLogin(c: Connector): Promise<void> {
    if (loginFlight.current) return loginFlight.current;
    stopUnlockWait(); // a fresh user action supersedes any unlock watcher
    const run = (async () => {
      try {
        await loginFlow(c);
      } catch (e) {
        if (isRejected(e)) {
          S(""); M("Request rejected in the wallet. Nothing was signed — open Connect Wallet whenever you are ready.");
        } else if (isLocked(e)) {
          // Keep the intent: once the wallet is unlocked, resume exactly once.
          waitForUnlock(c, () => { void startLogin(c); });
        } else {
          S(""); M(errorText(e) || "Login failed");
        }
      } finally {
        loginFlight.current = null;
      }
    })();
    loginFlight.current = run;
    return run;
  }

  useEffect(() => {
    if (!ready || restoreReported.current) return;
    if (accountStatus === "reconnecting" || accountStatus === "connecting") return;
    // Wallet reconnection is silent (wagmi reconnectOnMount) and session
    // restore happens through Supabase in PlayerGate. A signature is only ever
    // requested after an explicit user action, so refreshes never produce
    // approval or signature prompts on their own.
    restoreReported.current = true;
    onRestoreReady(true);
  }, [ready, accountStatus, onRestoreReady]);
  async function logout() {
    stopUnlockWait();
    await createClient().auth.signOut();
    localStorage.removeItem("asaverse.loginAt"); localStorage.removeItem("asaverse.wallet");
    A(false); S(""); M("");
    disconnect(); onLogout();
  }
  if(!ready) return <div className="h-14 rounded-xl bg-slate-800"/>;
  return <div className="w-full max-w-md space-y-3">
    {isConnected&&<p className="break-all rounded-xl border p-3 text-sm">{address}</p>}
    <button onClick={()=>O(true)} className="w-full rounded-xl bg-emerald-300 p-4 font-bold text-black">Connect Wallet</button>
    {isConnected&&!authed&&active&&<button onClick={()=>void startLogin(active)} disabled={busy||waiting}
      className="w-full rounded-xl border p-3 disabled:opacity-50">{busy?"Waiting for wallet…":"Verify wallet ownership"}</button>}
    {isConnected&&<button onClick={()=>void logout()} className="w-full rounded-xl border p-3">Disconnect</button>}
    {waiting&&<button onClick={cancelUnlockWait} className="w-full rounded-xl border border-amber-700 p-3 text-sm text-amber-200">Cancel waiting for wallet unlock</button>}
    {status&&<p role="status" className="break-words text-sm text-emerald-200">{status}</p>}
    {(msg||error)&&<p className="break-words text-sm text-rose-300">{msg||error?.message}</p>}
    <WalletPicker open={open} onClose={()=>O(false)} connectors={connectors} onConnect={c=>void startLogin(c)} pending={busy} error={msg}/>
  </div>;
}
