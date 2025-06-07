// app/(components)/ExploreVouchesClient.jsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { REPUFI_SBT_CONTRACT_ADDRESS, REPUFI_SBT_ABI } from '../../../lib/constants';
import { fetchFromIPFS } from '../../../lib/ipfsHelper';
import { formatEther } from 'viem';
import { Button } from './ui/Button';
import { Loader2, ExternalLink, Search, ShieldCheck, ShieldAlert, Image as ImageIcon, ThumbsUp, UserCircle, Info , RefreshCw} from 'lucide-react'; // Added Search

const VouchCard = ({ vouch, isAdmin, onAction }) => {
    if (!vouch || !vouch.details) return null;
    const { details, metadata, id: vouchTokenId } = vouch;
    const isActive = !details.withdrawn && !details.forceExpired;
    const isPotentiallyExpired = new Date().getTime() / 1000 > details.expiry && isActive;

    // Determine status badge
    let status = { text: "ACTIVE", className: "badge-success" };
    if (details.forceExpired) status = { text: "FORCE EXPIRED", className: "badge-danger" };
    else if (details.withdrawn) status = { text: "PROCESSED", className: "badge-neutral" };
    else if (isPotentiallyExpired) status = { text: "EXPIRED (Pending Action)", className: "badge-warning" };


    return (
        <div className="card p-5 space-y-3 flex flex-col justify-between hover:shadow-xl transition-shadow dark:shadow-primary/10 transform hover:-translate-y-0.5">
            <div className="flex-grow">
                 {metadata?.image ? (
                    <img
                        src={metadata.image}
                        alt={`Vouch SBT ${vouchTokenId}`}
                        className="w-full h-40 object-cover rounded-md mb-3 border border-border dark:border-dark-border"
                        onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} // Show fallback on error
                    />
                ) : null /* Add null to avoid rendering anything if there's no image initially */}
                <div
                    className={`w-full h-40 bg-slate-100 dark:bg-slate-800 rounded-md mb-3 border border-border dark:border-dark-border flex-col items-center justify-center text-slate-400 dark:text-slate-500 ${metadata?.image ? 'hidden' : 'flex'}`} // Hide if image loaded
                >
                    <ImageIcon size={36} />
                    <span className="text-xs mt-1">No Image</span>
                </div>


                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-primary">
                        Vouch (ID: {vouchTokenId})
                    </h3>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-block ${status.className}`}>{status.text}</span>
                </div>

                <p className="text-sm font-medium text-foreground mb-1 line-clamp-2" title={metadata?.name || `Vouch for ${details.borrower.substring(0,8)}...`}>
                    {metadata?.name || `Vouch for ${details.borrower.substring(0,8)}...`}
                </p>
                {metadata?.description && <p className="text-xs italic text-slate-500 dark:text-slate-400 mb-3 line-clamp-3" title={metadata.description}>{metadata.description}</p>}

                <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 border-t border-border dark:border-dark-border pt-3 mt-3">
                    <p><strong>Backer:</strong> <span className="font-mono text-xs block truncate" title={details.backer}>{details.backer}</span></p>
                    <p><strong>Borrower:</strong> <span className="font-mono text-xs block truncate" title={details.borrower}>{details.borrower}</span></p>
                    <p><strong>Stake:</strong> <span className="font-semibold">{formatEther(details.amount)} PAS</span></p>
                    <p><strong>Expires:</strong> {new Date(Number(details.expiry) * 1000).toLocaleString()}</p>
                </div>
                {details.metadataCID && <a href={`https://gateway.pinata.cloud/ipfs/${details.metadataCID}`} target="_blank" rel="noopener noreferrer" className="mt-2 text-xs text-primary hover:underline flex items-center">View Full Metadata <ExternalLink size={12} className="ml-1"/></a>}
            </div>

            {isAdmin && isActive && (
                <div className="mt-4 pt-3 border-t border-border dark:border-dark-border space-y-2">
                    <Button onClick={() => onAction('slashStake', vouchTokenId)} className="w-full btn-danger !bg-orange-500 hover:!bg-orange-600 text-xs !font-semibold" disabled={onAction.isPending}>
                        {onAction.isPending && onAction.tokenId === vouchTokenId ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Admin: Slash Stake'}
                    </Button>
                    <Button onClick={() => onAction('forceExpire', vouchTokenId)} className="w-full btn-danger text-xs !font-semibold" disabled={onAction.isPending}>
                        {onAction.isPending && onAction.tokenId === vouchTokenId ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Admin: Force Expire'}
                    </Button>
                </div>
            )}
        </div>
    );
};


export default function ExploreVouchesClient() {
    const { address: connectedAddress, isConnected } = useAccount();
    const publicClient = usePublicClient();
    const [allVouches, setAllVouches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Admin action states
    const [actionTokenId, setActionTokenId] = useState(null);
    const [actionMessage, setActionMessage] = useState(null);
    const [actionError, setActionError] = useState(null);

    const { data: tokenIdCounterData, isLoading: isCounterLoading, refetch: refetchCounter } = useReadContract({
        address: REPUFI_SBT_CONTRACT_ADDRESS,
        abi: REPUFI_SBT_ABI,
        functionName: 'tokenIdCounter',
        query: { staleTime: 60000 } // Cache for 1 minute
    });

    const {data: contractOwner} = useReadContract({
      address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI, functionName: 'owner',
      query: { enabled: isConnected }
    });
    const isAdmin = isConnected && connectedAddress && contractOwner && connectedAddress.toLowerCase() === contractOwner.toLowerCase();


    const fetchAllVouchDetails = useCallback(async () => {
        if (!publicClient || tokenIdCounterData === undefined || tokenIdCounterData === null) {
            if (tokenIdCounterData === undefined && !isCounterLoading) setError("Could not fetch total token count.");
            return;
        }
        setIsLoading(true); setError(null);
        const vouchesList = [];
        const totalTokens = Number(tokenIdCounterData);

        if (totalTokens === 0) {
            setAllVouches([]);
            setIsLoading(false);
            return;
        }

        // Iterate assuming backer tokens are odd, borrower even, and start from 1
        // Or fetch all and then de-duplicate/pair them client-side
        // For simplicity, let's fetch every token detail up to counter and display it,
        // understanding some might be "borrower" side of a pair.
        // A more refined approach would be to fetch only odd IDs (backer) or group pairs.
        const promises = [];
        for (let i = 1; i <= totalTokens; i++) {
            const tokenId = BigInt(i);
            promises.push(
                publicClient.readContract({
                    address: REPUFI_SBT_CONTRACT_ADDRESS,
                    abi: REPUFI_SBT_ABI,
                    functionName: 'getVouchDetails',
                    args: [tokenId],
                }).then(async (details) => {
                    if (details && details.backer !== '0x0000000000000000000000000000000000000000') { // Basic check if vouch exists
                        let metadata = { name: `Vouch SBT #${tokenId.toString()}`, description: "Loading metadata..."};
                        if (details.metadataCID) {
                            try { metadata = await fetchFromIPFS(details.metadataCID); }
                            catch (e) { console.warn(`IPFS error for ${tokenId}: ${e.message}`); metadata.description = "Error loading metadata."; }
                        }
                        return { id: tokenId.toString(), details, metadata };
                    }
                    return null; // Skip if no valid backer (likely non-existent token in the sequence)
                }).catch(err => {
                    // console.warn(`Skipping token ID ${tokenId} due to error: ${err.message}`);
                    return null; // Gracefully handle errors for individual token fetches
                })
            );
        }

        try {
            const results = (await Promise.all(promises)).filter(Boolean);
            // Simple de-duplication: show only one entry per vouch (e.g., the backer's token, which is usually odd)
            // Or, if you always want to show the one with the lower ID of a pair:
            const uniqueVouches = [];
            const seenPairedIds = new Set();
            results.forEach(vouch => {
                if (vouch && vouch.details) {
                    const currentTokenId = BigInt(vouch.id);
                    const pairedTokenId = BigInt(vouch.details.pairedTokenId);
                    // Only add if this token ID is smaller than its pair, or if its pair has already been added (meaning this is the larger ID of a processed pair)
                    // This effectively ensures each "vouch instance" is represented once by its lower token ID.
                    if (currentTokenId < pairedTokenId) {
                        if (!seenPairedIds.has(pairedTokenId.toString())) {
                            uniqueVouches.push(vouch);
                            seenPairedIds.add(pairedTokenId.toString()); // Mark the pair as seen via its other half
                        }
                    } else { // currentTokenId > pairedTokenId
                         if (!seenPairedIds.has(currentTokenId.toString())) { // Check if this token (the higher one) has been "seen" via its lower pair
                            uniqueVouches.push(vouch);
                            seenPairedIds.add(currentTokenId.toString());
                         }
                    }
                }
            });
            // For a simpler list that might show both sides of a pair initially:
            // setAllVouches(results);
            setAllVouches(uniqueVouches.sort((a, b) => Number(b.id) - Number(a.id))); // Sort by newest first
        } catch (e) {
            setError("Error processing vouch details.");
            console.error("Error in Promise.all for fetching vouches:", e);
        } finally {
            setIsLoading(false);
        }
    }, [publicClient, tokenIdCounterData, isCounterLoading]);

    useEffect(() => {
        if (publicClient && tokenIdCounterData !== undefined) {
            fetchAllVouchDetails();
        }
    }, [publicClient, tokenIdCounterData, fetchAllVouchDetails]);


    // Admin Actions
    const { data: actionHash, writeContract: executeAdminAction, isPending: isAdminActionPending, error: adminActionWriteError } = useWriteContract();
    const { isLoading: isAdminActionConfirming, isSuccess: isAdminActionConfirmed, error: adminActionReceiptError } = useWaitForTransactionReceipt({ hash: actionHash });

    const handleAdminAction = (functionName, tokenId) => {
        setActionTokenId(tokenId); setActionMessage(null); setActionError(null);
        executeAdminAction({
            address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI,
            functionName, args: [BigInt(tokenId)],
        });
    };
     useEffect(() => {
        if(isAdminActionPending && actionTokenId) setActionMessage(`Processing ${actionTokenId}...`);
        if (isAdminActionConfirmed && actionTokenId) {
            setActionMessage(`Success for ${actionTokenId}! Refreshing...`);
            fetchAllVouchDetails(); // Refresh all vouches
            setTimeout(() => { setActionMessage(null); setActionTokenId(null); }, 4000);
        }
        if(adminActionWriteError && actionTokenId) setActionError(`Tx Error for ${actionTokenId}: ${adminActionWriteError.shortMessage}`);
        if(adminActionReceiptError && actionTokenId) setActionError(`Confirm Error for ${actionTokenId}: ${adminActionReceiptError.shortMessage}`);
    }, [isAdminActionConfirmed, adminActionWriteError, adminActionReceiptError, actionTokenId, fetchAllVouchDetails, isAdminActionPending]);


    const filteredVouches = allVouches.filter(vouch => {
        const searchTermLower = searchTerm.toLowerCase();
        if (!vouch || !vouch.details) return false;
        return (
            vouch.id.includes(searchTermLower) ||
            vouch.details.backer.toLowerCase().includes(searchTermLower) ||
            vouch.details.borrower.toLowerCase().includes(searchTermLower) ||
            (vouch.metadata?.name && vouch.metadata.name.toLowerCase().includes(searchTermLower)) ||
            (vouch.metadata?.description && vouch.metadata.description.toLowerCase().includes(searchTermLower))
        );
    });

    if (isCounterLoading && tokenIdCounterData === undefined) return (
        <div className="card p-8 text-center flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="font-semibold">Loading total vouch count...</p>
        </div>
    );


    return (
        <div className="animate-fadeIn space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">Explore All Vouches</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Found {filteredVouches.length} of {allVouches.length} total vouches (approx. {Number(tokenIdCounterData)/2 || 0} pairs).
                    </p>
                </div>
                 <Button onClick={() => {refetchCounter().then(() => fetchAllVouchDetails())}} disabled={isLoading || isCounterLoading} className="btn-outline w-full sm:w-auto">
                    {isLoading || isCounterLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <RefreshCw size={16} className="mr-2"/>}
                    Refresh All
                </Button>
            </div>

             {/* Search Input */}
            <div className="relative">
                <input
                    type="search"
                    placeholder="Search by Token ID, Backer/Borrower Address, or Metadata..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 !py-3 dark:!bg-dark-card/50"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
            </div>

            {actionMessage && <p className="p-3 my-4 bg-green-50 dark:bg-green-700/20 text-green-700 dark:text-green-300 rounded-md text-sm text-center">{actionMessage}</p>}
            {actionError && <p className="p-3 my-4 bg-red-50 dark:bg-red-700/20 text-red-700 dark:text-red-300 rounded-md text-sm text-center">{actionError}</p>}
            {error && <p className="p-3 my-4 bg-red-50 dark:bg-red-700/20 text-red-700 dark:text-red-300 rounded-md text-sm text-center">{error}</p>}


            {isLoading && (
                <div className="card p-8 text-center flex flex-col items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                    <p className="font-semibold">Fetching all vouch details from the blockchain...</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">This may take a moment for a large number of vouches.</p>
                </div>
            )}

            {!isLoading && filteredVouches.length === 0 && (
                 <div className="card p-10 text-center border-2 border-dashed border-border dark:border-dark-border">
                    <ShieldAlert className="h-16 w-16 mx-auto text-slate-400 dark:text-slate-500 mb-5" />
                    <h3 className="text-2xl font-semibold mb-3">No Vouches Found</h3>
                    <p className="text-slate-500 dark:text-slate-400">
                        {searchTerm ? "No vouches match your search criteria." : "There are currently no vouches on RepuFi, or they are still loading."}
                    </p>
                 </div>
            )}

            {!isLoading && filteredVouches.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredVouches.map(vouch => (
                        <VouchCard
                            key={vouch.id}
                            vouch={vouch}
                            isAdmin={isAdmin}
                            onAction={{
                                fn: handleAdminAction,
                                isPending: isAdminActionPending && actionTokenId === vouch.id,
                                tokenId: actionTokenId
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}