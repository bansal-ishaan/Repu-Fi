// app/(components)/MyVouchesClient.jsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { REPUFI_SBT_CONTRACT_ADDRESS, REPUFI_SBT_ABI } from '../../../lib/constants';
import { fetchFromIPFS } from '../../../lib/ipfsHelper';
import { formatEther } from 'viem';
import { Button } from './ui/Button';
import { Loader2, ExternalLink, ShieldAlert, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
// This is the component that will be rendered on the client
export default function MyVouchesClient() {
  const { address: userAddress, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [ownedSBTsDetails, setOwnedSBTsDetails] = useState([]);
  const [isLoadingSBTs, setIsLoadingSBTs] = useState(false); // Initial true removed for explicit trigger
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

  const fetchVouchAndMetadata = useCallback(async (tokenId, currentUserAddr) => {
    if (!publicClient) return null;
    try {
      const details = await publicClient.readContract({
        address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI,
        functionName: 'getVouchDetails', args: [tokenId],
      });
      let metadata;
      if (details.metadataCID) {
        try { metadata = await fetchFromIPFS(details.metadataCID); }
        catch (ipfsErr) { metadata = { name: "Metadata Error" }; }
      }
      const expiryTimestamp = Number(details.expiry);
      return {
        id: tokenId.toString(), backer: details.backer, borrower: details.borrower,
        amount: formatEther(details.amount), expiryDate: new Date(expiryTimestamp * 1000).toLocaleString(),
        expiryTimestamp, withdrawn: details.withdrawn, pairedTokenId: details.pairedTokenId.toString(),
        forceExpired: details.forceExpired, metadataCID: details.metadataCID, metadata,
        isMyVouchAsBacker: details.backer.toLowerCase() === currentUserAddr.toLowerCase(),
        isMyVouchAsBorrower: details.borrower.toLowerCase() === currentUserAddr.toLowerCase(),
        isExpired: new Date().getTime() / 1000 > expiryTimestamp || details.forceExpired,
      };
    } catch (err) { console.error(`Error for token ${tokenId}:`, err); return null; }
  }, [publicClient]);

  const loadSBTDetails = useCallback(async () => {
    if (ownedSBTsData && userAddress && publicClient) {
      setIsLoadingSBTs(true); setErrorSBTs(null);
      const tokenIds = ownedSBTsData;
      if (tokenIds.length === 0) { setOwnedSBTsDetails([]); setIsLoadingSBTs(false); return; }
      try {
        const promises = tokenIds.map(id => fetchVouchAndMetadata(BigInt(id), userAddress)); // Ensure ID is BigInt
        const results = (await Promise.all(promises)).filter(Boolean);
        setOwnedSBTsDetails(results);
      } catch (err) { setErrorSBTs(`Failed to load details: ${err.message}`);
      } finally { setIsLoadingSBTs(false); }
    }
  }, [ownedSBTsData, userAddress, publicClient, fetchVouchAndMetadata]);

  useEffect(() => { // Load details when data is available or userAddress changes
    if(isConnected && userAddress && ownedSBTsData && publicClient) {
        loadSBTDetails();
    } else if (!isConnected) {
        setOwnedSBTsDetails([]); // Clear if disconnected
    }
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
    if(isActionPending && actionTokenId) setActionMessage(`Processing for Token ${actionTokenId}...`);
    if (isActionConfirmed && actionTokenId) {
      setActionMessage(`Success for Token ${actionTokenId}! Refreshing...`);
      refetchOwnedSBTs().then(() => loadSBTDetails()); // Refetch list then details
      setTimeout(() => { setActionMessage(null); setActionTokenId(null); }, 4000);
    }
    if(actionWriteError && actionTokenId) setActionError(`Tx Error for ${actionTokenId}: ${actionWriteError.shortMessage || actionWriteError.message}`);
    if(actionReceiptError && actionTokenId) setActionError(`Confirm Error for ${actionTokenId}: ${actionReceiptError.shortMessage || actionReceiptError.message}`);
  }, [isActionConfirmed, actionWriteError, actionReceiptError, actionTokenId, refetchOwnedSBTs, loadSBTDetails, isActionPending]);

  const {data: contractOwner} = useReadContract({
    address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI, functionName: 'owner',
    query: { enabled: isConnected }
  });
  const isAdmin = isConnected && userAddress && contractOwner && userAddress.toLowerCase() === contractOwner.toLowerCase();

  if (!isConnected) return <div className="card p-6 text-center"><p>Please connect your wallet to view your vouches.</p></div>;
  if (ownedSBTsListLoading) return <div className="card p-6 text-center flex justify-center items-center"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading SBT list...</div>;

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">My Vouch SBTs</h2>
        <Button onClick={() => refetchOwnedSBTs().then(() => loadSBTDetails())} disabled={isLoadingSBTs || ownedSBTsListLoading} className="btn-outline">
          {isLoadingSBTs || ownedSBTsListLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Refresh"}
        </Button>
      </div>

      {actionMessage && <p className="mb-4 text-center text-green-500 dark:text-green-400">{actionMessage}</p>}
      {actionError && <p className="mb-4 text-center text-red-500 dark:text-red-400">{actionError}</p>}
      {errorSBTs && <p className="mb-4 text-center text-red-500 dark:text-red-400">{errorSBTs}</p>}

      {isLoadingSBTs && !ownedSBTsDetails.length && <div className="card p-6 text-center flex justify-center items-center"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading vouch details...</div>}

      {!isLoadingSBTs && ownedSBTsDetails.length === 0 && !errorSBTs && (
        <div className="card p-8 text-center">
          <ShieldAlert className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Vouch SBTs Found</h3>
          <p className="text-slate-500 dark:text-slate-400">You currently do not own any Vouch SBTs.</p>
          <Link href="/become-backer" className="mt-4 btn btn-primary">Become a Backer</Link>
        </div>
      )}

      {ownedSBTsDetails.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ownedSBTsDetails.map((vouch) => (
            <div key={vouch.id} className="card p-5 space-y-3 flex flex-col justify-between hover:shadow-xl transition-shadow">
              <div>
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-primary mb-1">
                    Token ID: {vouch.id}
                    </h3>
                    {vouch.forceExpired && <span className="text-xs bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300 px-2 py-0.5 rounded-full">FORCE EXPIRED</span>}
                    {vouch.withdrawn && !vouch.forceExpired && <span className="text-xs bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300 px-2 py-0.5 rounded-full">PROCESSED</span>}
                </div>

                {vouch.metadata?.name && <p className="font-medium text-sm text-foreground">{vouch.metadata.name}</p>}
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Role: <span className="font-semibold">{vouch.isMyVouchAsBacker ? "BACKER" : "BORROWER"}</span>
                </p>

                <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                    <p><strong>Backer:</strong> <span className="truncate block w-full font-mono text-xs">{vouch.backer}</span></p>
                    <p><strong>Borrower:</strong> <span className="truncate block w-full font-mono text-xs">{vouch.borrower}</span></p>
                    <p><strong>Stake:</strong> {vouch.amount} PAS</p>
                    <p><strong>Expires:</strong> {vouch.expiryDate}</p>
                </div>
                {vouch.metadataCID && <a href={`https://gateway.pinata.cloud/ipfs/${vouch.metadataCID}`} target="_blank" rel="noopener noreferrer" className="mt-1 text-xs text-primary hover:underline flex items-center">View Metadata <ExternalLink size={12} className="ml-1"/></a>}
              </div>

              <div className="mt-auto pt-3 space-y-2">
                {!vouch.withdrawn && !vouch.forceExpired && vouch.isMyVouchAsBacker && vouch.isExpired && (
                  <Button onClick={() => handleAction('releaseStake', vouch.id)} className="w-full btn-secondary text-xs" disabled={isActionPending || isActionConfirming}>
                    {(isActionPending || isActionConfirming) && actionTokenId === vouch.id ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Release Stake'}
                  </Button>
                )}
                {isAdmin && !vouch.withdrawn && !vouch.forceExpired && (
                    <>
                        <Button onClick={() => handleAction('slashStake', vouch.id)} className="w-full btn-danger bg-orange-500 hover:bg-orange-600 text-xs" disabled={isActionPending || isActionConfirming}>
                            {(isActionPending || isActionConfirming) && actionTokenId === vouch.id ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Admin: Slash Stake'}
                        </Button>
                        <Button onClick={() => handleAction('forceExpire', vouch.id)} className="w-full btn-danger text-xs" disabled={isActionPending || isActionConfirming}>
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