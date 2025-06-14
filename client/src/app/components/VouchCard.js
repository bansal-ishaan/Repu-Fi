// components/VouchCard.js
"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { Check, ExternalLink } from "lucide-react"; // npm install lucide-react

// A small component for the status badge
const StatusBadge = ({ status }) => {
  const isActive = status === 'ACTIVE';
  return (
    <div
      className={clsx(
        "flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium",
        isActive
          ? "bg-green-500/10 text-green-400"
          : "bg-gray-400/10 text-gray-400"
      )}
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          isActive ? "bg-green-500" : "bg-gray-500"
        )}
      />
      {status}
    </div>
  );
};


// The main VouchCard component
const VouchCard = ({ vouch }) => {
  // Truncate wallet addresses for display
  const truncateAddress = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <motion.div
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-lg"
    >
      {/* --- Hover Glow Effect --- */}
      <div className="absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(400px_at_50%_50%,rgba(0,255,255,0.1),transparent)]" />
      
      <div className="relative z-10 flex h-full flex-col p-4">
        {/* --- Card Header Image --- */}
        <div className="relative mb-4 overflow-hidden rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
            <Check className="mx-auto h-12 w-12 text-white" strokeWidth={1.5} />
        </div>

        {/* --- Card Title & Status --- */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">{vouch.title}</h3>
          <StatusBadge status={vouch.status} />
        </div>
        <p className="mt-2 text-sm text-gray-400">{vouch.description}</p>
        
        <hr className="my-4 border-white/10" />

        {/* --- Details Section --- */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Backer:</span>
            <span className="font-mono text-gray-300">{truncateAddress(vouch.backer)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Borrower:</span>
            <span className="font-mono text-gray-300">{truncateAddress(vouch.borrower)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Stake:</span>
            <span className="font-bold text-white">{vouch.stake}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Expires:</span>
            <span className="text-gray-300">{vouch.expires}</span>
          </div>
        </div>
        
        {/* --- Footer Link --- */}
        <div className="mt-auto pt-4">
            <a href={vouch.metadataUrl} target="_blank" rel="noopener noreferrer" className="group/link flex items-center gap-2 text-sm text-cyan-400 transition-colors hover:text-cyan-300">
                View Full Metadata
                <ExternalLink className="h-4 w-4 transition-transform duration-200 group-hover/link:translate-x-0.5" />
            </a>
        </div>
      </div>
    </motion.div>
  );
};

export default VouchCard;