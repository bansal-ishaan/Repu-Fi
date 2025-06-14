// app/explore/page.jsx
import ExploreVouchesClient from "../components/ExploreVouchesClient"; // Import the client component

export const metadata = {
    title: 'Explore All Vouches - RepuFi',
    description: 'Browse and manage all active and past vouches on the RepuFi platform.',
};

export default function ExplorePage() {
  return (
    // The page itself can remain a Server Component if all dynamic logic is in ExploreVouchesClient
    <div>
      <ExploreVouchesClient />
      
    </div>
  );
}