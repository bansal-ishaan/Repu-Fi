// app/explore/page.jsx
import ExploreVouchesClient from "../components/ExploreVouchesClient";
// 1. Import the new Vanta component
import VantaDotsBackground from "../components/VantaDotsBackground";

export const metadata = {
    title: 'Explore All Vouches - RepuFi',
    description: 'Browse and manage all active and past vouches on the RepuFi platform.',
};

export default function ExplorePage() {
  return (
    // 2. Wrap everything in a container
    <div className="relative min-h-screen">
      {/* 3. Add the Vanta background */}
      
      {/* 4. Ensure the main content is on top with `relative z-10` */}
      <main className="relative z-10">
        <ExploreVouchesClient />
      </main>
    </div>
  );
}