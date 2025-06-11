// app/layout.jsx
import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import AppHeader from './components/AppHeader'; // Create this component

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });



export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground flex flex-col">
          <Providers>
            <AppHeader />
            
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 ">
              {children}
            </main>
            <footer className="text-center py-6 border-t border-border text-sm text-muted-foreground">
              RepuFi © {new Date().getFullYear()} - Built on PassetHub
            </footer>
          </Providers>
       
      </body>
    </html>
  );
}