// app/providers.jsx
'use client';
import React from 'react';
import { RainbowKitProvider, getDefaultWallets, getDefaultConfig, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { passetHubTestnet } from '../../lib/constants'; // Import custom chain

const { wallets } = getDefaultWallets();

const wagmiConfig = getDefaultConfig({
  appName: 'RepuFi on PassetHub',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  wallets: [ ...wallets ],
  chains: [passetHubTestnet], // Use only PassetHub Testnet
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return null; // Avoid hydration mismatch for theme

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={resolvedTheme === 'dark' ? darkTheme() : lightTheme()}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}