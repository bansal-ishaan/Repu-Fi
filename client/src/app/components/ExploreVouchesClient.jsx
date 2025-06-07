// app/(components)/ExploreVouchesClient.jsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { REPUFI_SBT_CONTRACT_ADDRESS, REPUFI_SBT_ABI } from '../../../lib/constants';
import { fetchFromIPFS } from '../../../lib/ipfsHelper';
import { formatEther } from 'viem';
import { Button } from './ui/Button';
import { Loader2, ExternalLink, Search, ShieldCheck, ShieldAlert, Image as ImageIcon, ThumbsUp, UserCircle, Info , RefreshCw} from 'lucide-react'; // Added Search

// This can be a separate component or defined within ExploreVouchesClient.jsx
const VouchCard = ({ vouch, isAdmin, handleAdminActionParent, pendingAdminAction }) => {
    if (!vouch || !vouch.details) return null;
    const { details, metadata, id: vouchTokenIdStr } = vouch; // vouchTokenIdStr is a string here
    const vouchTokenId = BigInt(vouchTokenIdStr); // Convert to BigInt for action calls

    const isActive = !details.withdrawn && !details.forceExpired;
    const isPotentiallyExpired = new Date().getTime() / 1000 > details.expiry && isActive;

    let status = { text: "ACTIVE", className: "badge-success" };
    if (details.forceExpired) status = { text: "FORCE EXPIRED", className: "badge-danger" };
    else if (details.withdrawn) status = { text: "PROCESSED", className: "badge-neutral" };
    else if (isPotentiallyExpired) status = { text: "EXPIRED (Pending Action)", className: "badge-warning" };

    // Determine if an action is pending for THIS card
    const isCurrentCardActionPending = pendingAdminAction &&
                                      pendingAdminAction.tokenId === vouchTokenIdStr &&
                                      pendingAdminAction.isExecuting;

    return (
        <div className="card p-5 space-y-3 flex flex-col justify-between hover:shadow-xl transition-shadow dark:shadow-primary/10 transform hover:-translate-y-0.5">
            <div className="flex-grow">
                {/* Image Display Logic (same as before) */}
                {metadata?.image ? (
                    <img
                        src={metadata.image}
                        alt={`Vouch SBT ${vouchTokenIdStr}`}
                        className="w-full h-40 object-cover rounded-md mb-3 border border-border dark:border-dark-border"
                        onError={(e) => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex'; }}
                    />
                ) : null}
                <div
                    className={`w-full h-40 bg-slate-100 dark:bg-slate-800 rounded-md mb-3 border border-border dark:border-dark-border flex-col items-center justify-center text-slate-400 dark:text-slate-500 ${metadata?.image ? 'hidden' : 'flex'}`}
                >
                    <ImageIcon size={36} />
                    <span className="text-xs mt-1">No Image</span>
                </div>

                {/* Card Info (same as before) */}
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-primary">
                        Vouch (ID: {vouchTokenIdStr})
                    </h3>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-block ${status.className}`}>{status.text}</span>
                </div>
                <p className="text-sm font-medium text-foreground mb-1 line-clamp-2" title={metadata?.name || `Vouch for ${details.borrower.substring(0,8)}...`}>
                    {metadata?.name || `Vouch for ${details.borrower.substring(0,8)}...`}
                </p>
                {/* ... other details ... */}
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
                    <Button
                        onClick={() => handleAdminActionParent('slashStake', vouchTokenId)} // Pass BigInt vouchTokenId
                        className="w-full btn-danger !bg-orange-500 hover:!bg-orange-600 text-xs !font-semibold"
                        disabled={isCurrentCardActionPending}
                    >
                        {isCurrentCardActionPending ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Admin: Slash Stake'}
                    </Button>
                    <Button
                        onClick={() => handleAdminActionParent('forceExpire', vouchTokenId)} // Pass BigInt vouchTokenId
                        className="w-full btn-danger text-xs !font-semibold"
                        disabled={isCurrentCardActionPending}
                    >
                        {isCurrentCardActionPending ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Admin: Force Expire'}
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

    // State specifically for tracking pending admin actions
    const [pendingAdminActionState, setPendingAdminActionState] = useState({ tokenId: null, isExecuting: false });
    const [actionMessage, setActionMessage] = useState(null); // For success/error messages from transactions
    const [actionError, setActionError] = useState(null);


    const { data: tokenIdCounterData, isLoading: isCounterLoading, refetch: refetchCounter } = useReadContract({
        address: REPUFI_SBT_CONTRACT_ADDRESS,
        abi: REPUFI_SBT_ABI,
        functionName: 'tokenIdCounter',
        query: { staleTime: 60000 }
    });

    const {data: contractOwner} = useReadContract({
      address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI, functionName: 'owner',
      query: { enabled: isConnected }
    });
    const isAdmin = isConnected && connectedAddress && contractOwner && connectedAddress.toLowerCase() === contractOwner.toLowerCase();

    const fetchAllVouchDetails = useCallback(async () => {
        // ... (fetch logic remains the same as your last correct version)
        if (!publicClient || tokenIdCounterData === undefined || tokenIdCounterData === null) {
            if (tokenIdCounterData === undefined && !isCounterLoading) setError("Could not fetch total token count.");
            return;
        }
        setIsLoading(true); setError(null);
        const vouchesList = [];
        const totalTokens = Number(tokenIdCounterData);

        if (totalTokens === 0) {
            setAllVouches([]); setIsLoading(false); return;
        }
        const promises = [];
        for (let i = 1; i <= totalTokens; i++) {
            const tokenId = BigInt(i);
            promises.push(
                publicClient.readContract({
                    address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI,
                    functionName: 'getVouchDetails', args: [tokenId],
                }).then(async (details) => {
                    if (details && details.backer !== '0x0000000000000000000000000000000000000000') {
                        let metadata = { name: `Vouch SBT #${tokenId.toString()}`, description: "Loading metadata..."};
                        if (details.metadataCID) {
                            try { metadata = await fetchFromIPFS(details.metadataCID); }
                            catch (e) { console.warn(`IPFS error for ${tokenId}: ${e.message}`); metadata.description = "Error loading metadata."; }
                        }
                        return { id: tokenId.toString(), details, metadata };
                    }
                    return null;
                }).catch(err => { return null; })
            );
        }
        try {
            const results = (await Promise.all(promises)).filter(Boolean);
            const uniqueVouches = []; const seenPairedIds = new Set();
            results.forEach(vouch => {
                if (vouch && vouch.details) {
                    const currentTokenId = BigInt(vouch.id);
                    const pairedTokenId = BigInt(vouch.details.pairedTokenId);
                    const lowerId = currentTokenId < pairedTokenId ? currentTokenId : pairedTokenId;
                    const higherId = currentTokenId > pairedTokenId ? currentTokenId : pairedTokenId;
                    // Use the lower ID of the pair as the representative ID to avoid duplicates
                    const representativeId = lowerId.toString();
                    if (!seenPairedIds.has(representativeId)) {
                        // If this vouch is the one with the lower ID, or if its pair is the lower ID and we haven't added it
                        uniqueVouches.push(vouch); // Add the current vouch (could be lower or higher ID)
                        seenPairedIds.add(representativeId); // Mark this pair as processed using its lower ID
                    }
                }
            });
            setAllVouches(uniqueVouches.sort((a, b) => Number(b.id) - Number(a.id)));
        } catch (e) { setError("Error processing vouch details."); console.error("Error in Promise.all:", e);
        } finally { setIsLoading(false); }
    }, [publicClient, tokenIdCounterData, isCounterLoading]);


    useEffect(() => {
        if (publicClient && tokenIdCounterData !== undefined) {
            fetchAllVouchDetails();
        }
    }, [publicClient, tokenIdCounterData, fetchAllVouchDetails]);

    // Admin Actions Hooks
    const { data: actionTxHash, writeContract: executeAdminTx, isPending: isTxPending, error: txWriteError } = useWriteContract();
    const { isLoading: isTxConfirming, isSuccess: isTxConfirmed, error: txReceiptError } = useWaitForTransactionReceipt({ hash: actionTxHash });

    // Modified handleAdminAction
    const handleAdminAction = (functionName, tokenIdToActOn) => { // tokenIdToActOn is BigInt
        setActionMessage(null); setActionError(null);
        setPendingAdminActionState({ tokenId: tokenIdToActOn.toString(), isExecuting: true });

        executeAdminTx({
            address: REPUFI_SBT_CONTRACT_ADDRESS,
            abi: REPUFI_SBT_ABI,
            functionName,
            args: [tokenIdToActOn], // Already BigInt
        });
    };

    useEffect(() => {
        // This effect handles the results of the transaction (pending, success, error)
        if (pendingAdminActionState.tokenId) { // Only proceed if an action was initiated
            if (isTxPending) {
                setActionMessage(`Processing action for Vouch ID: ${pendingAdminActionState.tokenId}...`);
            } else if (isTxConfirmed) {
                setActionMessage(`Action successful for Vouch ID: ${pendingAdminActionState.tokenId}! Refreshing data...`);
                setPendingAdminActionState({ tokenId: null, isExecuting: false }); // Reset pending state
                // Refetch data after a short delay to allow blockchain to update
                setTimeout(() => {
                    refetchCounter().then(() => fetchAllVouchDetails());
                }, 1000); // Delay might be needed
                 setTimeout(() => setActionMessage(null), 5000); // Clear message after a while
            } else if (txWriteError) {
                setActionError(`Transaction Submission Error for Vouch ID ${pendingAdminActionState.tokenId}: ${txWriteError.shortMessage || txWriteError.message}`);
                setPendingAdminActionState({ tokenId: null, isExecuting: false });
            } else if (txReceiptError) {
                setActionError(`Transaction Confirmation Error for Vouch ID ${pendingAdminActionState.tokenId}: ${txReceiptError.shortMessage || txReceiptError.message}`);
                setPendingAdminActionState({ tokenId: null, isExecuting: false });
            }
        }
    }, [isTxPending, isTxConfirmed, txWriteError, txReceiptError, pendingAdminActionState, fetchAllVouchDetails, refetchCounter]);


    const filteredVouches = allVouches.filter(vouch => {
        // ... (filtering logic remains the same) ...
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

    // ... (Loading states for counter and initial fetch remain similar) ...
    if (isCounterLoading && tokenIdCounterData === undefined) return (
        <div className="card p-8 text-center flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="font-semibold">Loading total vouch count...</p>
        </div>
    );

    return (
        <div className="animate-fadeIn space-y-8">
            {/* Header and Search (same as before) */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">Explore All Vouches</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Displaying {filteredVouches.length} vouches. (Total on chain approx. {Number(tokenIdCounterData)/2 || 0} pairs)
                    </p>
                </div>
                 <Button onClick={() => {refetchCounter().then(() => fetchAllVouchDetails())}} disabled={isLoading || isCounterLoading} className="btn-outline w-full sm:w-auto">
                    {isLoading || isCounterLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <RefreshCw size={16} className="mr-2"/>}
                    Refresh All
                </Button>
            </div>
            <div className="relative">
                <input
                    type="search" placeholder="Search by ID, Address, or Metadata..."
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 !py-3 dark:!bg-dark-card/50"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
            </div>


            {actionMessage && <p className="p-3 my-4 bg-green-50 dark:bg-green-700/20 text-green-700 dark:text-green-300 rounded-md text-sm text-center">{actionMessage}</p>}
            {actionError && <p className="p-3 my-4 bg-red-50 dark:bg-red-700/20 text-red-700 dark:text-red-300 rounded-md text-sm text-center">{actionError}</p>}
            {error && !isLoading && <p className="p-3 my-4 bg-red-50 dark:bg-red-700/20 text-red-700 dark:text-red-300 rounded-md text-sm text-center">{error}</p>}


            {isLoading && ( /* Main loading state for fetching all details */
                <div className="card p-8 text-center flex flex-col items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                    <p className="font-semibold">Fetching all vouch details...</p>
                </div>
            )}

            {!isLoading && filteredVouches.length === 0 && (
                 <div className="card p-10 text-center border-2 border-dashed border-border dark:border-dark-border">
                    <ShieldAlert className="h-16 w-16 mx-auto text-slate-400 dark:text-slate-500 mb-5" />
                    <h3 className="text-2xl font-semibold mb-3">No Vouches Found</h3>
                    <p className="text-slate-500 dark:text-slate-400">
                        {searchTerm ? "No vouches match your search criteria." : "There are currently no vouches on RepuFi."}
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
                            handleAdminActionParent={handleAdminAction} // Pass the main handler
                            pendingAdminAction={pendingAdminActionState}  // Pass the pending state object
                        />
                    ))}
                </div>
            )}
        </div>
    );
}