// app/(components)/MyVouchesClient.jsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { REPUFI_SBT_CONTRACT_ADDRESS, REPUFI_SBT_ABI } from '../../../lib/constants';
import { fetchFromIPFS } from '../../../lib/ipfsHelper';
import { formatEther } from 'viem';
import { Button } from './ui/Button';
import { Loader2, ExternalLink, ShieldAlert, Image as ImageIcon, RefreshCw, UserCircle, Users } from 'lucide-react'; // Added ImageIcon, RefreshCw

export default function MyVouchesClient() {
  const { address: userAddress, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [ownedSBTsDetails, setOwnedSBTsDetails] = useState([]);
  const [isLoadingSBTs, setIsLoadingSBTs] = useState(false);
  const [errorSBTs, setErrorSBTs] = useState(null);
  const [actionTokenId, setActionTokenId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionError, setActionError] = useState(null);

  const { data: ownedSBTsData, refetch: refetchOwnedSBTs, isLoading: ownedSBTsListLoading } = useReadContract({
    address: REPUFI_SBT_CONTRACT_ADDRESS,
    abi: REPUFI_SBT_ABI,
    functionName: 'getOwnedSBTs',
    args: [userAddress],
    query: { enabled: !!userAddress && isConnected },
  });

  const fetchVouchAndMetadata = useCallback(async (tokenId) => {
    if (!publicClient || !userAddress) return null;
    try {
      const details = await publicClient.readContract({
        address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI,
        functionName: 'getVouchDetails', args: [tokenId],
      });
      let metadata = { name: `Vouch SBT #${tokenId.toString()}`, description: "Loading metadata..." }; // Default metadata
      if (details.metadataCID) {
        try { metadata = await fetchFromIPFS(details.metadataCID); }
        catch (ipfsErr) {
          console.warn(`IPFS fetch error for ${details.metadataCID}: ${ipfsErr.message}`);
          metadata.description = `Could not load metadata from IPFS. CID: ${details.metadataCID.substring(0,10)}...`;
        }
      }
      const expiryTimestamp = Number(details.expiry);
      return {
        id: tokenId.toString(), backer: details.backer, borrower: details.borrower,
        amount: formatEther(details.amount), expiryDate: new Date(expiryTimestamp * 1000).toLocaleString(),
        expiryTimestamp, withdrawn: details.withdrawn, pairedTokenId: details.pairedTokenId.toString(),
        forceExpired: details.forceExpired, metadataCID: details.metadataCID, metadata, // metadata includes image
        isMyVouchAsBacker: details.backer.toLowerCase() === userAddress.toLowerCase(),
        isMyVouchAsBorrower: details.borrower.toLowerCase() === userAddress.toLowerCase(),
        isExpired: new Date().getTime() / 1000 > expiryTimestamp || details.forceExpired,
      };
    } catch (err) { console.error(`Error fetching details for token ${tokenId}:`, err); return null; }
  }, [publicClient, userAddress]);

  const loadSBTDetails = useCallback(async () => {
    if (ownedSBTsData && userAddress && publicClient) {
      setIsLoadingSBTs(true); setErrorSBTs(null);
      const tokenIds = ownedSBTsData;
      if (tokenIds.length === 0) { setOwnedSBTsDetails([]); setIsLoadingSBTs(false); return; }
      try {
        const promises = tokenIds.map(id => fetchVouchAndMetadata(id)); // ID is already BigInt from useReadContract
        const results = (await Promise.all(promises)).filter(Boolean);
        setOwnedSBTsDetails(results);
      } catch (err) { setErrorSBTs(`Failed to load vouch details: ${err.message}`);
      } finally { setIsLoadingSBTs(false); }
    }
  }, [ownedSBTsData, userAddress, publicClient, fetchVouchAndMetadata]);

  useEffect(() => {
    if(isConnected && userAddress && ownedSBTsData && publicClient) { loadSBTDetails(); }
    else if (!isConnected) { setOwnedSBTsDetails([]); }
  }, [isConnected, userAddress, ownedSBTsData, publicClient, loadSBTDetails]);

  const { data: actionHash, writeContract: executeAction, isPending: isActionPending, error: actionWriteError } = useWriteContract();
  const { isLoading: isActionConfirming, isSuccess: isActionConfirmed, error: actionReceiptError } = useWaitForTransactionReceipt({ hash: actionHash });

  const handleAction = (functionName, tokenId) => {
    setActionTokenId(tokenId); setActionMessage(null); setActionError(null);
    executeAction({
      address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI,
      functionName, args: [BigInt(tokenId)],
    });
  };

  useEffect(() => {
    if(isActionPending && actionTokenId) setActionMessage(`Processing action for Token ${actionTokenId}...`);
    if (isActionConfirmed && actionTokenId) {
      setActionMessage(`Action successful for Token ${actionTokenId}! Refreshing details...`);
      loadSBTDetails();
      setTimeout(() => { setActionMessage(null); setActionTokenId(null); }, 4000);
    }
    if(actionWriteError && actionTokenId) setActionError(`Tx Error for Token ${actionTokenId}: ${actionWriteError.shortMessage || actionWriteError.message}`);
    if(actionReceiptError && actionTokenId) setActionError(`Confirm Error for Token ${actionTokenId}: ${actionReceiptError.shortMessage || actionReceiptError.message}`);
  }, [isActionConfirmed, actionWriteError, actionReceiptError, actionTokenId, loadSBTDetails, isActionPending]);

  const {data: contractOwner} = useReadContract({
    address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI, functionName: 'owner',
    query: { enabled: isConnected && !!userAddress }
  });
  const isAdmin = isConnected && userAddress && contractOwner && userAddress.toLowerCase() === contractOwner.toLowerCase();

  if (!isConnected) return (
    <div className="card p-8 text-center max-w-md mx-auto">
        <UserCircle size={48} className="mx-auto text-primary mb-4"/>
        <h3 className="text-xl font-semibold mb-2">Wallet Not Connected</h3>
        <p className="text-slate-600 dark:text-slate-400">Please connect your wallet to view your vouches.</p>
    </div>
  );
  if (ownedSBTsListLoading && !ownedSBTsData) return (
    <div className="card p-8 text-center flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="font-semibold">Loading your Vouch SBT list...</p>
    </div>
  );
  if (!userAddress && isConnected) return (
    <div className="card p-8 text-center flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="font-semibold">Waiting for account details...</p>
    </div>
  );

  return (
    <div className="animate-fadeIn space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">My Vouch SBTs</h2>
        <Button onClick={loadSBTDetails} disabled={isLoadingSBTs || ownedSBTsListLoading || !ownedSBTsData} className="btn-outline w-full sm:w-auto">
          {isLoadingSBTs || ownedSBTsListLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <RefreshCw size={16} className="mr-2"/>}
          {isLoadingSBTs || ownedSBTsListLoading ? "Loading..." : "Refresh Vouch Details"}
        </Button>
      </div>

      {actionMessage && <p className="p-3 bg-green-50 dark:bg-green-700/20 text-green-700 dark:text-green-300 rounded-md text-sm text-center animate-fadeIn">{actionMessage}</p>}
      {actionError && <p className="p-3 bg-red-50 dark:bg-red-700/20 text-red-700 dark:text-red-300 rounded-md text-sm text-center animate-fadeIn">{actionError}</p>}
      {errorSBTs && <p className="p-3 bg-red-50 dark:bg-red-700/20 text-red-700 dark:text-red-300 rounded-md text-sm text-center animate-fadeIn">{errorSBTs}</p>}

      {isLoadingSBTs && !ownedSBTsDetails.length && ownedSBTsData && ownedSBTsData.length > 0 && (
          <div className="card p-8 text-center flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="font-semibold">Loading details for your {ownedSBTsData.length} Vouch SBT(s)...</p>
          </div>
      )}

      {!isLoadingSBTs && ownedSBTsData && ownedSBTsData.length === 0 && !errorSBTs && (
        <div className="card p-10 text-center border-2 border-dashed border-border">
          <ShieldAlert className="h-16 w-16 mx-auto text-slate-400 dark:text-slate-500 mb-5" />
          <h3 className="text-2xl font-semibold mb-3">No Vouch SBTs Found</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">You currently don't own any RepuFi Vouch SBTs on this account.</p>
          <Link href="/become-backer" className="btn btn-primary !text-base !px-6 !py-3">
            <Users size={18} className="mr-2"/>Become a Backer
          </Link>
        </div>
      )}

      {ownedSBTsDetails.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {ownedSBTsDetails.map((vouch) => (
            <div key={vouch.id} className="card p-5 space-y-3 flex flex-col justify-between hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1">
              <div className="flex-grow">
                {/* SBT Image Display */}
                {vouch.metadata?.image ? (
                  <img
                    src={vouch.metadata.image} // This will render data URI SVGs
                    alt={`Vouch SBT ${vouch.id}`}
                    className="w-full h-48 object-cover rounded-lg mb-4 border border-border"
                    onError={(e) => e.target.style.display='none'} // Hide if image fails to load
                  />
                ) : (
                  <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 rounded-lg mb-4 border border-border flex items-center justify-center">
                    <ImageIcon size={48} className="text-slate-400 dark:text-slate-500" />
                  </div>
                )}

                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-primary">
                    Token ID: {vouch.id}
                    </h3>
                    {vouch.forceExpired ? <span className="badge-danger">FORCE EXPIRED</span> :
                     vouch.withdrawn ? <span className="badge-neutral">PROCESSED</span> :
                     vouch.isExpired ? <span className="badge-warning">EXPIRED</span> :
                     <span className="badge-success">ACTIVE</span>
                    }
                </div>

                <p className="text-sm font-medium text-foreground mb-1">{vouch.metadata?.name || `Vouch SBT #${vouch.id}`}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Your Role: <span className="font-semibold uppercase">{vouch.isMyVouchAsBacker ? "Backer" : "Borrower"}</span>
                </p>

                <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 border-t border-border pt-3 mt-3">
                    <p><strong>Backer:</strong> <span className="font-mono text-xs block truncate" title={vouch.backer}>{vouch.backer}</span></p>
                    <p><strong>Borrower:</strong> <span className="font-mono text-xs block truncate" title={vouch.borrower}>{vouch.borrower}</span></p>
                    <p><strong>Stake:</strong> <span className="font-semibold">{vouch.amount} PAS</span></p>
                    <p><strong>Expires:</strong> {vouch.expiryDate}</p>
                </div>
                {vouch.metadata?.description && <p className="text-xs italic text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{vouch.metadata.description}</p>}
                {vouch.metadataCID && <a href={`https://gateway.pinata.cloud/ipfs/${vouch.metadataCID}`} target="_blank" rel="noopener noreferrer" className="mt-2 text-xs text-primary hover:underline flex items-center">View Full Metadata <ExternalLink size={12} className="ml-1"/></a>}
              </div>

              <div className="mt-4 pt-3 border-t border-border space-y-2">
                {!vouch.withdrawn && !vouch.forceExpired && vouch.isMyVouchAsBacker && vouch.isExpired && (
                  <Button onClick={() => handleAction('releaseStake', vouch.id)} className="w-full btn-secondary text-xs !font-semibold" disabled={isActionPending || isActionConfirming}>
                    {(isActionPending || isActionConfirming) && actionTokenId === vouch.id ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Release Stake'}
                  </Button>
                )}
                {isAdmin && !vouch.withdrawn && !vouch.forceExpired && (
                    <>
                        <Button onClick={() => handleAction('slashStake', vouch.id)} className="w-full btn-danger !bg-orange-500 hover:!bg-orange-600 text-xs !font-semibold" disabled={isActionPending || isActionConfirming}>
                            {(isActionPending || isActionConfirming) && actionTokenId === vouch.id ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Admin: Slash Stake'}
                        </Button>
                        <Button onClick={() => handleAction('forceExpire', vouch.id)} className="w-full btn-danger text-xs !font-semibold" disabled={isActionPending || isActionConfirming}>
                            {(isActionPending || isActionConfirming) && actionTokenId === vouch.id ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Admin: Force Expire'}
                        </Button>
                    </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper for Badges (you can put this in ui/Badge.jsx or similar)
// For simplicity, I'll inline styles that could be componentized for badges
const Badge = ({ children, variant = 'neutral' }) => {
  const baseClasses = "text-xs font-semibold px-2.5 py-0.5 rounded-full inline-block";
  let variantClasses = "";
  switch (variant) {
    case 'success': variantClasses = "bg-green-100 text-green-800 dark:bg-green-700/30 dark:text-green-300"; break;
    case 'warning': variantClasses = "bg-yellow-100 text-yellow-800 dark:bg-yellow-700/30 dark:text-yellow-300"; break;
    case 'danger': variantClasses = "bg-red-100 text-red-800 dark:bg-red-700/30 dark:text-red-300"; break;
    default: variantClasses = "bg-slate-100 text-slate-800 dark:bg-slate-700/30 dark:text-slate-300"; // neutral
  }
  return <span className={`${baseClasses} ${variantClasses}`}>{children}</span>;
};

// Add these to your globals.css or as a separate Badge component if you prefer
// .badge-success { @apply bg-green-100 text-green-800 dark:bg-green-700/30 dark:text-green-300 px-2 py-0.5 rounded-full text-xs font-semibold; }
// .badge-warning { @apply bg-yellow-100 text-yellow-800 dark:bg-yellow-700/30 dark:text-yellow-300 px-2 py-0.5 rounded-full text-xs font-semibold; }
// .badge-danger { @apply bg-red-100 text-red-800 dark:bg-red-700/30 dark:text-red-300 px-2 py-0.5 rounded-full text-xs font-semibold; }
// .badge-neutral { @apply bg-slate-100 text-slate-800 dark:bg-slate-700/30 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-semibold; }