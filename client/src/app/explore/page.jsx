// app/explore/page.jsx
import { Search, Filter, ListChecks, ThumbsUp, UserCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const metadata = {
    title: 'Explore Vouches - RepuFi',
    description: 'Discover active vouches, backers, and borrowers on RepuFi.',
};

// Mock Vouch Data (Replace with actual data fetching later)
const mockVouches = [
    { id: '101', backerUsername: 'devA', borrowerUsername: 'newUserX', score: 8.5, reason: 'Excellent contributions to Project Omega', stake: '250 PAS', expires: 'in 12 days', backerAvatar: 'https://avatars.githubusercontent.com/u/1?v=4', borrowerAvatar: 'https://avatars.githubusercontent.com/u/2?v=4'},
    { id: '102', backerUsername: 'proCoder', borrowerUsername: 'learnerB', score: 9.2, reason: 'Mentorship for hackathon participation', stake: '500 PAS', expires: 'in 25 days', backerAvatar: 'https://avatars.githubusercontent.com/u/3?v=4', borrowerAvatar: 'https://avatars.githubusercontent.com/u/4?v=4'},
    { id: '103', backerUsername: 'gitGuru', borrowerUsername: 'devY', score: 7.8, reason: 'Solid pull requests for core library', stake: '150 PAS', expires: 'in 5 days', backerAvatar: 'https://avatars.githubusercontent.com/u/5?v=4', borrowerAvatar: 'https://avatars.githubusercontent.com/u/6?v=4' },
];

const VouchCardPlaceholder = ({ vouch }) => (
    <div className="card p-5 hover:shadow-xl transition-shadow dark:shadow-primary/10">
        <div className="flex items-center mb-3">
            <img src={vouch.backerAvatar} alt={vouch.backerUsername} className="w-10 h-10 rounded-full mr-3 border-2 border-primary"/>
            <div>
                <p className="font-semibold text-foreground">{vouch.backerUsername} <ThumbsUp size={14} className="inline text-green-500 ml-1"/> <span className="text-slate-500 dark:text-slate-400 text-xs">(Score: {vouch.score})</span></p>
                <p className="text-xs text-slate-500 dark:text-slate-400">is vouching for</p>
            </div>
        </div>
        <div className="flex items-center mb-4 pl-2">
             <img src={vouch.borrowerAvatar} alt={vouch.borrowerUsername} className="w-10 h-10 rounded-full mr-3 border-2 border-secondary"/>
            <p className="font-semibold text-foreground">{vouch.borrowerUsername}</p>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-1 leading-relaxed line-clamp-2">"{vouch.reason}"</p>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-border dark:border-dark-border">
            <p>Stake: <span className="font-semibold text-primary">{vouch.stake}</span></p>
            <p>Expires: <span className="font-semibold">{vouch.expires}</span></p>
        </div>
         <button className="mt-4 w-full btn btn-outline btn-sm text-xs !border-primary !text-primary hover:!bg-primary/10">
            View Details (Coming Soon)
        </button>
    </div>
);


export default function ExplorePage() {
  return (
    <div className="animate-fadeIn space-y-8">
      <div className="text-center pt-4 pb-8 border-b border-border dark:border-dark-border">
        <ListChecks className="h-16 w-16 mx-auto text-primary mb-4" />
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">Explore Active Vouches</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          Discover trusted backers, promising borrowers, and the reputation landscape of RepuFi.
        </p>
      </div>

      {/* Placeholder for Search and Filters */}
      <div className="card p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-grow w-full md:w-auto">
            <input type="search" placeholder="Search by backer, borrower, or reason..." className="pl-10 input-lg dark:!bg-dark-card/50" />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          </div>
          <Button className="btn-outline w-full md:w-auto">
            <Filter size={16} className="mr-2"/> Filters (Coming Soon)
          </Button>
        </div>
      </div>

      {/* Placeholder for Vouch Cards Grid - Using Mock Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockVouches.map(vouch => (
            <VouchCardPlaceholder key={vouch.id} vouch={vouch} />
        ))}
        {/* Add more placeholders or a "Loading more..." indicator */}
      </div>
      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-8">
        More vouches and detailed views are coming soon! This is a preview.
      </p>
    </div>
  );
}