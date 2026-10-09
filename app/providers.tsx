"use client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/ronin";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  const [client] = useState(() => new QueryClient());
  return <WagmiProvider config={config} reconnectOnMount={false}>
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  </WagmiProvider>;
}
