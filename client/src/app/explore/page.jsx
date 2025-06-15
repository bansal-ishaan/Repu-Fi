// app/explore-vouches/page.jsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseEther, formatEther, isAddress } from 'viem';
import {
    REPUFI_SBT_CONTRACT_ADDRESS,
    REPUFI_SBT_ABI,
    CHALLENGE_STAKE_ETH_STRING,
    displayChallengeStake
} from '../../../lib/constants'; // Adjust path
import { fetchFromIPFS, uploadJsonToIPFS } from '../../../lib/ipfsHelper'; // Adjust path
import { Button } from '../components/ui/Button';   // Adjust path
import { Input } from '../components/ui/Input';     // Adjust path
import { Textarea } from '../components/ui/Textarea'; // Adjust path
import { Loader2, ExternalLink , ShieldQuestion, LockKeyhole, AlertTriangle, CheckCircle, Eye, Users, Tag, CalendarDays, MessageSquare, Info } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// Minimal Modal (can be shared or defined locally)
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fadeIn" onClick={onClose}>
            <div className="bg-card text-card-foreground p-6 rounded-xl shadow-2xl max-w-lg w-full space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
                    <h3 className="text-xl font-semibold">{title}</h3>
                    <button onClick={onClose} className="p-1 h-auto bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-2xl leading-none">×</button>
                </div>
                {children}
            </div>
        </div>
    );
};


export default function ExploreVouchesPage() {
  const { address: connectedAddress, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [allVouches, setAllVouches] = useState([]);
  const [isLoadingVouches, setIsLoadingVouches] = useState(false);
  const [errorVouches, setErrorVouches] = useState(null);

  // For Challenge Modal
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [vouchToChallenge, setVouchToChallenge] = useState(null); // Stores { id: tokenId, borrower: address, backer: address }
  const [challengeReason, setChallengeReason] = useState('');

  const {
    data: challengeHash,
    writeContract: executeCreateChallenge,
    reset: resetChallengeContract,
    isPending: isChallengePending,
    error: challengeWriteError
  } = useWriteContract();

  const {
    isLoading: isChallengeConfirming,
    isSuccess: isChallengeConfirmed,
    error: challengeReceiptError
  } = useWaitForTransactionReceipt({ hash: challengeHash });

  const [challengeFormMessage, setChallengeFormMessage] = useState(null);
  const [challengeFormError, setChallengeFormError] = useState(null);

  const challengeStakeInWei = parseEther(CHALLENGE_STAKE_ETH_STRING);
  const displayStakeString = displayChallengeStake();

  const { data: vouchTokenIdCounterData, refetch: refetchVouchTokenIdCounter } = useReadContract({
    address: REPUFI_SBT_CONTRACT_ADDRESS,
    abi: REPUFI_SBT_ABI,
    functionName: 'tokenIdCounter', // This counter is for SBTs (backer and borrower pairs)
    query: { enabled: isConnected }
  });

  const fetchAllActiveVouches = useCallback(async () => {
    if (!publicClient || vouchTokenIdCounterData === undefined) {
        setAllVouches([]); return;
    }
    setIsLoadingVouches(true); setErrorVouches(null);
    const totalSBTs = Number(vouchTokenIdCounterData); // Total SBTs minted
    if (totalSBTs === 0) {
        setAllVouches([]); setIsLoadingVouches(false); return;
    }

    const fetchedVouches = [];
    // Iterate through potential Vouch SBT IDs.
    // Since each vouch creates two SBTs (backer & borrower), we need to be careful.
    // We are interested in the Vouch struct, which is keyed by these SBT IDs.
    // We only need to show one entry per "vouch instance".
    const processedVouchInstances = new Set(); // To avoid duplicates if we iterate all tokenIds

    try {
        // Iterate backwards from the latest tokenIdCounter
        // We're interested in unique vouches. The `vouches` mapping uses tokenId as key.
        // One conceptual "vouch" results in two Vouch structs with pairedTokenId.
        // We only need to display one side of the pair for the "Explore" view.
        for (let i = totalSBTs; i >= 1; i--) {
            if (fetchedVouches.length >= 30 && i < totalSBTs - 60) break; // Optimization
             if (processedVouchInstances.has(i)) continue; // Skip if already processed its pair

            try {
                const rawVouchArray = await publicClient.readContract({
                    address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI,
                    functionName: 'vouches', args: [BigInt(i)] // `vouches` is the mapping name
                });

                if (!rawVouchArray || rawVouchArray.length < 8) { // Vouch struct has 8 fields
                    console.warn(`Skipping Vouch ID ${i}: Invalid data structure.`);
                    continue;
                }

                const [ backer, borrower, amount, expiry, withdrawn, pairedTokenId, forceExpired, metadataCID ] = rawVouchArray;

                if (backer && backer !== "0x0000000000000000000000000000000000000000" && !withdrawn && !forceExpired) {
                    let ipfsMetadata = { name: `Vouch (SBT ID: ${i})`, description: "Metadata loading..." };
                    if (metadataCID && typeof metadataCID === 'string' && metadataCID.trim() !== '') {
                        try { ipfsMetadata = await fetchFromIPFS(metadataCID); }
                        catch (e) { console.warn(`IPFS error for Vouch CID ${metadataCID} (SBT ID ${i}):`, e); }
                    }

                    fetchedVouches.push({
                        sbtId: i, // The ID of this specific SBT (could be backer's or borrower's view of the vouch)
                        backer, borrower, amount, expiry: Number(expiry), metadataCID,
                        pairedTokenId: Number(pairedTokenId),
                        metadata: ipfsMetadata
                    });
                    // Add both this ID and its pair to processed set to avoid showing the same vouch twice
                    processedVouchInstances.add(i);
                    if (pairedTokenId && Number(pairedTokenId) > 0) {
                        processedVouchInstances.add(Number(pairedTokenId));
                    }
                }
            } catch (e) { console.warn(`Could not fetch Vouch ID ${i}:`, e.message); }
        }
        setAllVouches(fetchedVouches);
    } catch (err) { setErrorVouches(`Failed to load vouches: ${err.message}`);
    } finally { setIsLoadingVouches(false); }
  }, [publicClient, vouchTokenIdCounterData, REPUFI_SBT_ABI, REPUFI_SBT_CONTRACT_ADDRESS]);

  useEffect(() => {
    if (isConnected && vouchTokenIdCounterData !== undefined) {
        fetchAllActiveVouches();
    }
  }, [isConnected, vouchTokenIdCounterData, fetchAllActiveVouches]);

  const handleOpenChallengeModal = (vouchSbtId, borrowerAddress, backerAddress) => {
    setVouchToChallenge({ id: vouchSbtId, borrower: borrowerAddress, backer: backerAddress });
    setChallengeReason('');
    setChallengeFormError(null); setChallengeFormMessage(null);
    resetChallengeContract();
    setChallengeModalOpen(true);
  };

  const handleChallengeSubmit = async (e) => {
    e.preventDefault();
    setChallengeFormError(null); setChallengeFormMessage(null); resetChallengeContract();

    if (!vouchToChallenge || !vouchToChallenge.id) {
        setChallengeFormError("No vouch selected for challenge."); return;
    }
    if (!challengeReason.trim()) {
        setChallengeFormError('A reason for the challenge is required.'); return;
    }

    setChallengeFormMessage(`Preparing challenge for Vouch SBT #${vouchToChallenge.id}...`);
    try {
      setChallengeFormMessage(`Submitting challenge transaction (Stake: ${displayStakeString})...`);
      console.log("Calling createChallenge with args:", {
          vouchTokenId: BigInt(vouchToChallenge.id),
          challengeReason,
          value: challengeStakeInWei.toString()
      });
      executeCreateChallenge({
        address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI,
        functionName: 'createChallenge',
        args: [BigInt(vouchToChallenge.id), challengeReason],
        value: challengeStakeInWei,
      });
    } catch (err) {
      console.error('Challenge creation error:', err);
      setChallengeFormError(`Error: ${err.message || 'An error occurred.'}`);
      setChallengeFormMessage(null);
    }
  };

  useEffect(() => {
    if (isChallengeConfirmed) {
      setChallengeFormMessage('Challenge submitted successfully! Transaction confirmed.');
      setChallengeFormError(null);
      // Optionally refetch vouches if a challenge might change their display status (not directly, but good practice)
      // fetchAllActiveVouches();
      setTimeout(() => {
        setChallengeModalOpen(false);
        setChallengeFormMessage(null);
        setVouchToChallenge(null);
      }, 3500);
    }
    if (challengeWriteError) { setChallengeFormError(`Tx Error: ${challengeWriteError.shortMessage || challengeWriteError.message}`); setChallengeFormMessage(null); }
    if (challengeReceiptError) { setChallengeFormError(`Confirm Error: ${challengeReceiptError.shortMessage || challengeReceiptError.message}`); setChallengeFormMessage(null); }
  }, [isChallengeConfirmed, challengeWriteError, challengeReceiptError /*, fetchAllActiveVouches */]);


  if (!isConnected) { /* ... Connect Wallet Prompt ... */ }

  return (
    <div className="space-y-10 pb-12">
      <header className="text-center pt-4">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">Explore Active Vouches</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
          Browse vouches made on RepuFi. You can challenge a vouch if you believe it's invalid.
        </p>
      </header>

      <div className="flex justify-end mb-4">
        <Button onClick={fetchAllActiveVouches} disabled={isLoadingVouches} className="btn-outline text-sm">
            {isLoadingVouches ? <Loader2 className="h-4 w-4 animate-spin"/> : "Refresh Vouches"}
        </Button>
      </div>

      {isLoadingVouches && <div className="text-center py-10"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary"/><p className="mt-2">Loading active vouches...</p></div>}
      {errorVouches && <p className="text-red-500 dark:text-red-400 text-center py-4 card">{errorVouches}</p>}
      {!isLoadingVouches && allVouches.length === 0 && !errorVouches && (
        <div className="card p-8 text-center">
            <Eye size={48} className="mx-auto mb-4 opacity-50 text-slate-400 dark:text-slate-500"/>
            <h3 className="text-xl font-medium mb-2">No Active Vouches Found</h3>
            <p className="text-slate-500 dark:text-slate-400">There are currently no active vouches to display, or none could be fetched.</p>
        </div>
      )}

      {allVouches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allVouches.map(vouch => {
                const displayExpiry = vouch.expiry && !isNaN(Number(vouch.expiry)) ? new Date(Number(vouch.expiry) * 1000).toLocaleString() : "N/A";
                const displayAmount = typeof vouch.amount === 'bigint' ? formatEther(vouch.amount) : "N/A";
                // Check if current user is the backer or borrower of this specific vouch
                const isMyVouch = connectedAddress &&
                                 (vouch.backer?.toLowerCase() === connectedAddress.toLowerCase() ||
                                  vouch.borrower?.toLowerCase() === connectedAddress.toLowerCase());

                return (
                    <div key={vouch.sbtId} className="card p-5 space-y-3 flex flex-col justify-between hover:shadow-xl transition-shadow">
                        <div>
                            <h3 className="font-semibold text-lg text-primary truncate" title={vouch.metadata?.name || `Vouch (SBT ID: ${vouch.sbtId})`}>
                                {vouch.metadata?.name || `Vouch (SBT ID: ${vouch.sbtId})`}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">SBT ID: {vouch.sbtId}</p>

                            <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                                <p><strong>Backer:</strong> <span className="font-mono block truncate">{vouch.backer}</span></p>
                                <p><strong>Borrower:</strong> <span className="font-mono block truncate">{vouch.borrower}</span></p>
                                <p><strong>Staked:</strong> {displayAmount} PAS</p>
                                <p><strong>Expires:</strong> {displayExpiry}</p>
                            </div>
                            {vouch.metadata?.description && <p className="text-sm mt-2 text-foreground break-words">{vouch.metadata.description.substring(0,100)}{vouch.metadata.description.length > 100 ? "..." : ""}</p>}
                            {vouch.metadataCID && <a href={`https://gateway.pinata.cloud/ipfs/${vouch.metadataCID}`} target="_blank" rel="noopener noreferrer" className="mt-1 text-xs text-primary hover:underline flex items-center">View Full Metadata <ExternalLink size={12} className="ml-1"/></a>}
                        </div>
                        <div className="mt-auto pt-3">
                            {!isMyVouch && isConnected && ( // Don't allow challenging your own vouches
                                <Button
                                    onClick={() => handleOpenChallengeModal(vouch.sbtId, vouch.borrower, vouch.backer)}
                                    className="w-full btn-danger bg-orange-500 hover:bg-orange-600 text-xs !py-2"
                                >
                                    <ShieldQuestion size={14} className="mr-1.5"/> Challenge this Vouch
                                </Button>
                            )}
                             {isMyVouch && <p className="text-xs text-center text-slate-400 dark:text-slate-500 italic">This is your vouch.</p>}
                        </div>
                    </div>
                );
            })}
        </div>
      )}

      <Modal isOpen={challengeModalOpen} onClose={() => setChallengeModalOpen(false)} title={`Challenge Vouch SBT #${vouchToChallenge?.id}`}>
          {vouchToChallenge && (
              <form onSubmit={handleChallengeSubmit} className="space-y-4">
                  <div>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                          You are challenging Vouch SBT ID: <strong className="font-semibold">{vouchToChallenge.id}</strong>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Backer: <span className="font-mono">{vouchToChallenge.backer}</span></p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Borrower: <span className="font-mono">{vouchToChallenge.borrower}</span></p>
                      <p className="mt-3 text-sm font-semibold">Challenge Stake: {displayStakeString}</p>
                  </div>
                  <div>
                      <label htmlFor="challengeReason" className="block text-sm font-medium mb-1">Reason for Challenge <span className="text-red-500">*</span></label>
                      <Textarea
                          id="challengeReason"
                          value={challengeReason}
                          onChange={(e) => setChallengeReason(e.target.value)}
                          rows={4}
                          placeholder="Clearly explain why this vouch is being challenged..."
                          required
                          className="input"
                      />
                  </div>
                  <Button type="submit" className="w-full btn-danger bg-orange-500 hover:bg-orange-600 !py-2.5" disabled={isChallengePending || isChallengeConfirming}>
                      {isChallengePending || isChallengeConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                      {isChallengePending ? 'Submitting...' : isChallengeConfirming ? 'Confirming...' : `Submit Challenge & Stake ${displayStakeString}`}
                  </Button>
                  {challengeFormMessage && <p className="text-green-500 dark:text-green-400 text-sm text-center mt-2">{challengeFormMessage}</p>}
                  {challengeFormError && <p className="text-red-500 dark:text-red-400 text-sm text-center mt-2">{challengeFormError}</p>}
              </form>
          )}
      </Modal>

    </div>
  );
}