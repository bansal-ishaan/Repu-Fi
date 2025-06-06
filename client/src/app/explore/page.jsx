// app/explore/page.jsx
import { Construction } from 'lucide-react';

export const metadata = {
    title: 'Explore Vouches - RepuFi',
    description: 'Discover active vouches and reputation scores on RepuFi.',
};

export default function ExplorePage() {
  return (
    <div className="text-center py-10">
      <Construction className="h-16 w-16 mx-auto text-primary mb-6" />
      <h1 className="text-3xl font-bold mb-4">Explore Vouches</h1>
      <p className="text-slate-600 dark:text-slate-300 mb-2">
        This section is under construction!
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Soon, you'll be able to browse all active vouches, see who vouched for whom,
        and explore the reputation landscape of RepuFi.
      </p>
    </div>
  );
}