// app/my-vouches/page.jsx
'use client'; // This page is a client component because it interacts with the wallet
// This page itself can be a server component if MyVouchesClient handles all client logic
import MyVouchesClient from "../components/MyVouchesClient";
import { LockKeyhole } from "lucide-react"; // For a potential message if not connected
import BackgroundAurora from "../components/BackgroundAurora";


// This is a pattern: the page is a Server Component,
// but it renders a Client Component that does the data fetching and interaction.
export default function MyVouchesPage() {
  return (
    <div className="relative min-h-screen bg-[#0A031A] text-white overflow-hidden">
      {/* Add the dynamic, moving background */}
      <BackgroundAurora />

      {/* Render the client component with the actual logic and cards */}
      {/* Ensure content is above the background (z-10) and add padding */}
      <main className="relative z-10 p-6 sm:p-8 md:p-12">
        <MyVouchesClient />
      </main>
    </div>
  );
}