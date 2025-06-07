// app/providers.jsx
'use client';
import React, { useEffect, useState } from 'react'; // Import useEffect and useState
import { RainbowKitProvider, getDefaultWallets, getDefaultConfig, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { ThemeProvider } from 'next-themes';
// Assuming constants.js is in lib at the root of your project
import { passetHubTestnet } from '../../lib/constants'; // Use Next.js path alias

const { wallets } = getDefaultWallets(); // This is generally safe to call early
const queryClient = new QueryClient(); // Safe to create early

export function Providers({ children }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currentWagmiConfig, setCurrentWagmiConfig] = useState(null); // State for the config

  useEffect(() => {
    // This effect runs only on the client, after the initial render
    setMounted(true);

    // Initialize wagmiConfig here, ensuring it's client-side
    const config = getDefaultConfig({
      appName: 'RepuFi on PassetHub',
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
      wallets: [ ...wallets ],
      chains: [passetHubTestnet],
      ssr: true, // ssr: true is generally okay, the issue is WHEN this config is generated
    });
    setCurrentWagmiConfig(config);

  }, []); // Empty dependency array ensures this runs once on mount

  // If not mounted yet or config not ready, don't render Web3 providers
  // This prevents attempting to use wagmiConfig before it's initialized client-side
  if (!mounted || !currentWagmiConfig) {
    // You might want to return a global loading spinner or just the children
    // if they don't strictly depend on the context being immediately available.
    // Returning null or a basic loader is often safer to prevent errors.
    return null; // Or <GlobalLoader />; or <>{children}</> if children can handle no context initially
  }

  return (
    <WagmiProvider config={currentWagmiConfig}> {/* Use the state variable here */}
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <RainbowKitProvider
          theme={resolvedTheme === 'dark' ? darkTheme() : lightTheme()}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}