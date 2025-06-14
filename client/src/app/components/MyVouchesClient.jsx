// app/(components)/MyVouchesClient.jsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { REPUFI_SBT_CONTRACT_ADDRESS, REPUFI_SBT_ABI } from '../../../lib/constants';
import { fetchFromIPFS } from '../../../lib/ipfsHelper';
import { formatEther } from 'viem';
import { Button } from './ui/Button';
import { Loader2, ExternalLink, ShieldAlert, Image as ImageIcon, RefreshCw, UserCircle, Users } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// --- VouchCard Component (No changes needed here, it's already well-structured) ---
const VouchCard = ({ vouch, isAdmin, handleAction, isActionPending, isActionConfirming, actionTokenId }) => {
    let status = { text: "ACTIVE", className: "bg-green-500/10 text-green-400", glowClass: "bg-green-500" };
    if (vouch.forceExpired) status = { text: "FORCE EXPIRED", className: "bg-red-500/10 text-red-400", glowClass: "bg-red-500" };
    else if (vouch.withdrawn) status = { text: "PROCESSED", className: "bg-gray-400/10 text-gray-400", glowClass: "bg-gray-500" };
    else if (vouch.isExpired) status = { text: "EXPIRED", className: "bg-amber-500/10 text-amber-400", glowClass: "bg-amber-500" };

    const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } } };
    const currentActionPending = (isActionPending || isActionConfirming) && actionTokenId === vouch.id;

    return (
        <motion.div
            variants={itemVariants}
            whileHover={{ y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="group relative h-full flex flex-col rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-lg overflow-hidden"
        >
            <div className="absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(350px_at_50%_50%,rgba(0,255,255,0.1),transparent)]" />
            <div className="relative z-10 flex h-full flex-col p-4 space-y-4">
                <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-4 h-48 flex items-center justify-center">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_50%)]" />
                    {vouch.metadata?.image ? ( <img src={vouch.metadata.image} alt={`Vouch SBT ${vouch.id}`} className="w-full h-full object-contain rounded-md" onError={(e) => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex'; }} /> ) : null}
                    <div className={`w-full h-full bg-white/5 rounded-md flex-col items-center justify-center text-slate-500 ${vouch.metadata?.image ? 'hidden' : 'flex'}`}> <ImageIcon size={40} className="opacity-60" /> </div>
                </div>
                <div className="flex items-start justify-between">
                    <h3 className="text-lg font-bold text-white">Token ID: {vouch.id}</h3>
                    <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}> <span className={`h-1.5 w-1.5 rounded-full ${status.glowClass}`} /> {status.text} </div>
                </div>
                <div className="flex-grow">
                    <p className="text-sm font-medium text-gray-300 line-clamp-2">{vouch.metadata?.name || `Vouch SBT #${vouch.id}`}</p>
                    <p className="text-xs mt-1 px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded inline-block"> Your Role: {vouch.isMyVouchAsBacker ? "BACKER" : "BORROWER"} </p>
                </div>
                <hr className="!my-3 border-white/10" />
                <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center"><span className="text-gray-400">Backer:</span><span className="font-mono text-gray-300">{`${vouch.backer.slice(0, 6)}...${vouch.backer.slice(-4)}`}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-400">Borrower:</span><span className="font-mono text-gray-300">{`${vouch.borrower.slice(0, 6)}...${vouch.borrower.slice(-4)}`}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-400">Stake:</span><span className="font-bold text-cyan-400">{vouch.amount} PAS</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-400">Expires:</span><span className="text-gray-300">{vouch.expiryDate}</span></div>
                </div>
                <div className="mt-auto pt-3">
                    {vouch.metadataCID && <a href={`https://gateway.pinata.cloud/ipfs/${vouch.metadataCID}`} target="_blank" rel="noopener noreferrer" className="group/link flex items-center gap-2 text-xs text-cyan-400 transition-colors hover:text-cyan-300 mb-2">View Full Metadata<ExternalLink size={14} className="transition-transform duration-200 group-hover/link:translate-x-0.5" /></a>}
                    <div className="space-y-2">
                        {!vouch.withdrawn && !vouch.forceExpired && vouch.isMyVouchAsBacker && vouch.isExpired && ( <Button onClick={() => handleAction('releaseStake', vouch.id)} className="w-full !bg-cyan-600/80 hover:!bg-cyan-600 !text-white text-xs !font-bold" disabled={currentActionPending}> {currentActionPending ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Release Stake'} </Button> )}
                        {isAdmin && !vouch.withdrawn && !vouch.forceExpired && ( <> <Button onClick={() => handleAction('slashStake', vouch.id)} className="w-full !bg-amber-600/80 hover:!bg-amber-600 !text-white text-xs !font-bold" disabled={currentActionPending}> {currentActionPending ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Admin: Slash Stake'} </Button> <Button onClick={() => handleAction('forceExpire', vouch.id)} className="w-full !bg-red-600/80 hover:!bg-red-600 !text-white text-xs !font-bold" disabled={currentActionPending}> {currentActionPending ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Admin: Force Expire'} </Button> </> )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};


// --- Main Component ---
export default function MyVouchesClient() {
  const { address: userAddress, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [ownedSBTsDetails, setOwnedSBTsDetails] = useState([]);
  const [isLoadingSBTs, setIsLoadingSBTs] = useState(true); // FIX: Start in a loading state
  const [errorSBTs, setErrorSBTs] = useState(null);
  const [actionTokenId, setActionTokenId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionError, setActionError] = useState(null);

  const { data: ownedSBTsData, refetch: refetchOwnedSBTs, isLoading: isSBTListLoading } = useReadContract({
    address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI, functionName: 'getOwnedSBTs',
    args: [userAddress], query: { enabled: !!userAddress && isConnected },
  });

  const {data: contractOwner} = useReadContract({ address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI, functionName: 'owner', query: { enabled: isConnected && !!userAddress } });
  const isAdmin = isConnected && userAddress && contractOwner && userAddress.toLowerCase() === contractOwner.toLowerCase();

  // REFACTORED: The main data fetching logic is now inside a single, robust useEffect.
  useEffect(() => {
    // This inner function fetches details for a single token.
    const fetchVouchAndMetadata = async (tokenId) => {
        if (!publicClient) return null;
        try {
            const details = await publicClient.readContract({ address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI, functionName: 'getVouchDetails', args: [tokenId] });
            let metadata = { name: `Vouch SBT #${tokenId.toString()}` };
            if (details.metadataCID) {
                try { metadata = await fetchFromIPFS(details.metadataCID); } 
                catch (ipfsErr) { console.warn(`IPFS fetch error: ${ipfsErr.message}`); }
            }
            return {
                id: tokenId.toString(), backer: details.backer, borrower: details.borrower,
                amount: formatEther(details.amount), expiryDate: new Date(Number(details.expiry) * 1000).toLocaleString(),
                withdrawn: details.withdrawn, forceExpired: details.forceExpired, metadataCID: details.metadataCID, metadata,
                isMyVouchAsBacker: details.backer.toLowerCase() === userAddress.toLowerCase(),
                isMyVouchAsBorrower: details.borrower.toLowerCase() === userAddress.toLowerCase(),
                isExpired: new Date().getTime() / 1000 > Number(details.expiry) || details.forceExpired,
            };
        } catch (err) { console.error(`Error fetching details for token ${tokenId}:`, err); return null; }
    };
    
    // This is the main async function that orchestrates the fetch.
    const loadSBTDetails = async () => {
        if (!isConnected || !userAddress || ownedSBTsData === undefined) {
            setIsLoadingSBTs(false); // Not ready to fetch, so stop loading.
            return;
        }
        setIsLoadingSBTs(true);
        setErrorSBTs(null);
        if (ownedSBTsData.length === 0) {
            setOwnedSBTsDetails([]);
        } else {
            try {
                const promises = ownedSBTsData.map(id => fetchVouchAndMetadata(id));
                const results = (await Promise.all(promises)).filter(Boolean);
                setOwnedSBTsDetails(results);
            } catch (err) {
                setErrorSBTs(`Failed to load vouch details: ${err.message}`);
            }
        }
        setIsLoadingSBTs(false);
    };

    loadSBTDetails();

  }, [ownedSBTsData, isConnected, userAddress, publicClient]); // This effect re-runs whenever the primary data changes.

  const { data: actionHash, writeContract: executeAction, isPending: isActionPending, error: actionWriteError } = useWriteContract();
  const { isLoading: isActionConfirming, isSuccess: isActionConfirmed, error: actionReceiptError } = useWaitForTransactionReceipt({ hash: actionHash });
  
  // FIX: Memoize handleAction to prevent unnecessary re-renders of child components.
  const handleAction = useCallback((functionName, tokenId) => {
    setActionTokenId(tokenId); setActionMessage(null); setActionError(null);
    executeAction({ address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI, functionName, args: [BigInt(tokenId)] });
  }, [executeAction]);

  useEffect(() => {
    if (isActionPending && actionTokenId) setActionMessage(`Processing action for Token ${actionTokenId}...`);
    if (isActionConfirmed && actionTokenId) {
      setActionMessage(`Action successful for Token ${actionTokenId}! Refreshing details...`);
      refetchOwnedSBTs(); // This is the correct way to trigger a full data refresh.
      setTimeout(() => { setActionMessage(null); setActionTokenId(null); }, 4000);
    }
    if (actionWriteError && actionTokenId) setActionError(`Tx Error for Token ${actionTokenId}: ${actionWriteError.shortMessage || actionWriteError.message}`);
    if (actionReceiptError && actionTokenId) setActionError(`Confirm Error for Token ${actionTokenId}: ${actionReceiptError.shortMessage || actionReceiptError.message}`);
  }, [isActionPending, isActionConfirmed, actionWriteError, actionReceiptError, actionTokenId, refetchOwnedSBTs]);
  
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };

  if (!isConnected) return ( <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-10 text-center border-2 border-dashed border-white/10 bg-white/5 rounded-2xl max-w-md mx-auto"> <UserCircle size={60} className="mx-auto text-cyan-400 mb-4"/> <h3 className="text-2xl font-bold text-white mb-2">Wallet Not Connected</h3> <p className="text-gray-400">Please connect your wallet to view your personal vouches.</p> </motion.div> );

  // FIX: Simplified and more accurate loading state.
  if (isSBTListLoading || isLoadingSBTs) return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400 mb-4" />
        <p className="font-semibold text-white text-lg">Loading your Vouch SBTs...</p>
        <p className="text-slate-400 text-sm">Fetching details from the chain.</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">My Vouch SBTs</h2>
        <Button onClick={() => refetchOwnedSBTs()} disabled={isSBTListLoading || isLoadingSBTs} className="w-full md:w-auto !py-2.5 !px-5 !bg-white/5 !border-white/10 hover:!bg-white/10 !text-white">
          {isSBTListLoading || isLoadingSBTs ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <RefreshCw size={16} className="mr-2"/>}
          {isSBTListLoading || isLoadingSBTs ? "Loading..." : "Refresh Vouch Details"}
        </Button>
      </div>
      <AnimatePresence>
        {actionMessage && <motion.p initial={{opacity:0, y: -10}} animate={{opacity:1, y: 0}} exit={{opacity:0, y:-10}} className="p-3 bg-green-500/20 text-green-300 rounded-lg text-sm text-center font-semibold">{actionMessage}</motion.p>}
        {actionError && <motion.p initial={{opacity:0, y: -10}} animate={{opacity:1, y: 0}} exit={{opacity:0, y:-10}} className="p-3 bg-red-500/20 text-red-300 rounded-lg text-sm text-center font-semibold">{actionError}</motion.p>}
        {errorSBTs && <motion.p initial={{opacity:0, y: -10}} animate={{opacity:1, y: 0}} exit={{opacity:0, y:-10}} className="p-3 bg-red-500/20 text-red-300 rounded-lg text-sm text-center font-semibold">{errorSBTs}</motion.p>}
      </AnimatePresence>
      {!isLoadingSBTs && ownedSBTsDetails.length === 0 && !errorSBTs && (
        <div className="p-10 text-center border-2 border-dashed border-white/10 bg-white/5 rounded-2xl"> <ShieldAlert className="h-16 w-16 mx-auto text-slate-500 mb-5" /> <h3 className="text-2xl font-semibold text-white mb-3">No Vouch SBTs Found</h3> <p className="text-gray-400 mb-6">You currently don't own any RepuFi Vouch SBTs on this account.</p> <Link href="/become-backer" className="btn !bg-cyan-600 hover:!bg-cyan-500 !text-white !text-base !px-6 !py-3 inline-flex items-center"> <Users size={18} className="mr-2" />Become a Backer </Link> </div>
      )}
      {ownedSBTsDetails.length > 0 && (
        <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" variants={containerVariants} initial="hidden" animate="visible">
          {ownedSBTsDetails.map((vouch) => ( <VouchCard key={vouch.id} vouch={vouch} isAdmin={isAdmin} handleAction={handleAction} isActionPending={isActionPending} isActionConfirming={isActionConfirming} actionTokenId={actionTokenId} /> ))}
        </motion.div>
      )}
    </motion.div>
  );
}