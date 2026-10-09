import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

export const ronin = defineChain({
  id: 2020, name: "Ronin",
  nativeCurrency: { decimals: 18, name: "RON", symbol: "RON" },
  rpcUrls: { default: { http: ["https://api.roninchain.com/rpc"] } },
});
export const saigon = defineChain({
  id: 202601, name: "Saigon Testnet",
  nativeCurrency: { decimals: 18, name: "RON", symbol: "RON" },
  rpcUrls: { default: { http: ["https://saigon-testnet.roninchain.com/rpc"] } },
});
export const config = createConfig({
  chains: [ronin, saigon],
  connectors: [injected()],
  multiInjectedProviderDiscovery: true,
  transports: { [ronin.id]: http(), [saigon.id]: http() },
});
