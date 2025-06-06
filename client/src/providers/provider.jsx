// 'use client'
// import React from 'react';
// import '@rainbow-me/rainbowkit/styles.css';
// import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
// import { WagmiProvider } from 'wagmi';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { wagmiConfig } from '../app/config/wagmiConfig';

// const queryClient = new QueryClient();

// export const Providers = ({children}) => (
//   <WagmiProvider config={wagmiConfig}>
//     <QueryClientProvider client={queryClient}>
//       <RainbowKitProvider>
//         {children}
//       </RainbowKitProvider>
//     </QueryClientProvider>
//   </WagmiProvider>
// );

// app/providers.jsx
"use client";

import * as React from "react";
import {
  RainbowKitProvider,
  getDefaultWallets,
  getDefaultConfig,
  darkTheme,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import {
  argentWallet,
  trustWallet,
  ledgerWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { WagmiProvider } from "wagmi";
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  sepolia,
} from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTheme } from "next-themes";

const { wallets } = getDefaultWallets();

const appChainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111");
let appChain = sepolia;

if (appChainId === mainnet.id) appChain = mainnet;
else if (appChainId === polygon.id) appChain = polygon;
// Add other chains as needed

if (appChain.id === appChainId && process.env.NEXT_PUBLIC_RPC_URL) {
  appChain = {
    ...appChain,
    rpcUrls: {
      ...appChain.rpcUrls,
      default: { http: [process.env.NEXT_PUBLIC_RPC_URL] },
      public: { http: [process.env.NEXT_PUBLIC_RPC_URL] },
    },
  };
}

const config = getDefaultConfig({
  appName: "RepuFi",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  wallets: [
    ...wallets,
    {
      groupName: "Other",
      wallets: [argentWallet, trustWallet, ledgerWallet],
    },
  ],
  chains: [appChain],
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }) {
  const { resolvedTheme } = useTheme();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={resolvedTheme === "dark" ? darkTheme() : lightTheme()}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
