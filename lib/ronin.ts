import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

export const ronin = defineChain({
  id: 2020,
  name: "Ronin",
  nativeCurrency: { decimals: 18, name: "RON", symbol: "RON" },
  rpcUrls: { default: { http: ["https://api.roninchain.com/rpc"] } },
  blockExplorers: { default: { name: "Ronin Explorer", url: "https://app.roninchain.com" } },
});

function roninProvider() {
  if (typeof window === "undefined") return undefined;
  const provider = (window as Window & { ronin?: { provider?: unknown } }).ronin?.provider;
  return provider ? { id: "ronin", name: "Ronin Wallet", provider: provider as never } : undefined;
}

export const config = createConfig({
  chains: [ronin],
  connectors: [injected({ target: roninProvider })],
  transports: { [ronin.id]: http() },
});
