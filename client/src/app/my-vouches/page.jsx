// app/my-vouches/page.jsx
// This page itself can be a server component if MyVouchesClient handles all client logic
import MyVouchesClient from "../components/MyVouchesClient";
import { LockKeyhole } from "lucide-react"; // For a potential message if not connected

export const metadata = {
    title: 'My Vouch SBTs - RepuFi',
    description: 'View and manage your Vouch SBTs on RepuFi.',
};

// This is a pattern: the page is a Server Component,
// but it renders a Client Component that does the data fetching and interaction.
export default function MyVouchesPage() {
  return (
    <div>
      {/*
        Could add a server-side check here for authentication if using NextAuth.js,
        but with wagmi, connection status is client-side.
        The MyVouchesClient will handle the "connect wallet" message.
      */}
      <MyVouchesClient />
    </div>
  );
}