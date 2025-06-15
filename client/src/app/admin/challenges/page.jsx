// app/admin/challenges/page.jsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { REPUFI_SBT_CONTRACT_ADDRESS, REPUFI_SBT_ABI } from '../../../../lib/constants'; // or config.js
import { Button } from '../../components/ui/Button'; // Adjusted path
import { Loader2, Check, X, ShieldX, ListChecks, Inbox } from 'lucide-react';
import { formatEther } from 'viem';

export default function AdminChallengesPage() {
    const { address: connectedAddress, isConnected } = useAccount();
    const publicClient = usePublicClient();

    const [isAdmin, setIsAdmin] = useState(false);
    const [challenges, setChallenges] = useState([]);
    const [isLoadingChallenges, setIsLoadingChallenges] = useState(false);
    const [errorChallenges, setErrorChallenges] = useState(null);

    const [actionChallengeId, setActionChallengeId] = useState(null);
    const [actionMessage, setActionMessage] = useState(null);
    const [actionError, setActionError] = useState(null);

    const { data: contractOwner } = useReadContract({
        address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI,
        functionName: 'owner', query: { enabled: isConnected }
    });

    useEffect(() => {
        setIsAdmin(isConnected && connectedAddress && contractOwner && connectedAddress.toLowerCase() === contractOwner.toLowerCase());
    }, [isConnected, connectedAddress, contractOwner]);

    const { data: challengeCounterData } = useReadContract({
        address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI,
        functionName: 'challengeCounter', query: { enabled: isAdmin }
    });

    const fetchAllChallenges = useCallback(async () => {
        if (!publicClient || !challengeCounterData || !isAdmin) return;
        setIsLoadingChallenges(true); setErrorChallenges(null);
        const totalChallenges = Number(challengeCounterData);
        const fetched = [];
        try {
            for (let i = 1; i <= totalChallenges; i++) {
                try {
                    const chal = await publicClient.readContract({
                        address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI,
                        functionName: 'challenges', args: [BigInt(i)]
                    });
                    if (chal && !chal.processed && chal.challenger !== "0x0000000000000000000000000000000000000000") { // Only pending
                        // Fetch associated vouch details for context (optional, but helpful)
                        let vouchDetails = null;
                        try {
                            vouchDetails = await publicClient.readContract({
                                address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI,
                                functionName: 'getVouchDetails', args: [chal.vouchTokenId]
                            });
                        } catch (e) { console.warn(`Could not get vouch details for challenge ${i}`); }

                        fetched.push({ id: i, ...chal, vouchDetails });
                    }
                } catch (e) {
                     console.warn(`Could not fetch challenge ID ${i}:`, e.message);
                }
            }
            setChallenges(fetched.reverse());
        } catch (err) {
            setErrorChallenges(`Failed to load challenges: ${err.message}`);
        } finally {
            setIsLoadingChallenges(false);
        }
    }, [publicClient, challengeCounterData, isAdmin]);

    useEffect(() => {
        if (isAdmin && challengeCounterData !== undefined) {
            fetchAllChallenges();
        }
    }, [isAdmin, challengeCounterData, fetchAllChallenges]);

    const { data: processHash, writeContract: executeProcessChallenge, isPending: isProcessing, error: processWriteError } = useWriteContract();
    const { isLoading: isConfirmingProcess, isSuccess: isProcessConfirmed, error: processReceiptError } = useWaitForTransactionReceipt({ hash: processHash });

    const handleProcessChallenge = (challengeId, accept) => {
        setActionChallengeId(challengeId); setActionMessage(null); setActionError(null);
        executeProcessChallenge({
            address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI,
            functionName: 'processChallenge', args: [BigInt(challengeId), accept]
        });
    };

    useEffect(() => {
        if(isProcessing && actionChallengeId) setActionMessage(`Processing Challenge #${actionChallengeId}...`);
        if (isProcessConfirmed && actionChallengeId) {
          setActionMessage(`Challenge #${actionChallengeId} processed! Refreshing...`);
          fetchAllChallenges();
          setTimeout(() => { setActionMessage(null); setActionChallengeId(null); }, 4000);
        }
        if(processWriteError && actionChallengeId) setActionError(`Tx Error for #${actionChallengeId}: ${processWriteError.shortMessage || processWriteError.message}`);
        if(processReceiptError && actionChallengeId) setActionError(`Confirm Error for #${actionChallengeId}: ${processReceiptError.shortMessage || processReceiptError.message}`);
      }, [isProcessConfirmed, processWriteError, processReceiptError, actionChallengeId, fetchAllChallenges, isProcessing]);


    if (!isConnected) return <div className="card p-6 text-center"><p>Please connect your wallet.</p></div>;
    if (!isAdmin && isConnected) return <div className="card p-6 text-center"><ShieldX className="mx-auto h-12 w-12 text-red-500 mb-3"/><p>Access Denied. This area is for contract administrators only.</p></div>;
    if (!isAdmin) return null; // Or a loader while checking admin status

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
                    <ListChecks className="h-10 w-10 text-indigo-500"/> Admin: Process Challenges
                </h1>
                <Button onClick={fetchAllChallenges} disabled={isLoadingChallenges} className="btn-outline">
                    {isLoadingChallenges ? <Loader2 className="h-4 w-4 animate-spin"/> : "Refresh Challenges"}
                </Button>
            </div>

            {actionMessage && <p className="mb-4 text-center text-green-500 dark:text-green-400 p-3 bg-green-50 dark:bg-green-700/20 rounded-md">{actionMessage}</p>}
            {actionError && <p className="mb-4 text-center text-red-500 dark:text-red-400 p-3 bg-red-50 dark:bg-red-700/20 rounded-md">{actionError}</p>}
            {errorChallenges && <p className="mb-4 text-center text-red-500 dark:text-red-400 p-3 bg-red-50 dark:bg-red-700/20 rounded-md">{errorChallenges}</p>}

            {isLoadingChallenges && <div className="text-center py-10"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary"/></div>}

            {!isLoadingChallenges && challenges.length === 0 && !errorChallenges && (
                <div className="card p-8 text-center">
                    <Inbox className="h-16 w-16 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Pending Challenges</h3>
                    <p className="text-slate-500 dark:text-slate-400">There are currently no challenges awaiting review.</p>
                </div>
            )}

            {challenges.length > 0 && (
                <div className="space-y-6">
                    {challenges.map(chal => (
                        <div key={chal.id} className="card p-5 shadow-lg hover:shadow-xl transition-shadow">
                            <h3 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Challenge ID: #{chal.id}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p><strong>Vouch Token ID:</strong> {chal.vouchTokenId.toString()}</p>
                                    <p><strong>Challenger:</strong> <span className="font-mono text-xs">{chal.challenger}</span></p>
                                    <p><strong>Stake:</strong> {formatEther(chal.stakedAmount)} PAS</p>
                                    <p><strong>Timestamp:</strong> {new Date(Number(chal.timestamp) * 1000).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="font-medium">Challenge Reason:</p>
                                    <p className="p-2 bg-slate-100 dark:bg-slate-700 rounded text-xs max-h-20 overflow-y-auto">{chal.challengeReason}</p>
                                </div>
                            </div>
                            {chal.vouchDetails && (
                                <div className="mt-3 pt-3 border-t border-border text-xs text-slate-500 dark:text-slate-400">
                                    <p className="font-medium mb-1">Original Vouch Details:</p>
                                    <p>Backer: <span className="font-mono">{chal.vouchDetails.backer}</span></p>
                                    <p>Borrower: <span className="font-mono">{chal.vouchDetails.borrower}</span></p>
                                    <p>Amount: {formatEther(chal.vouchDetails.amount)} PAS</p>
                                </div>
                            )}
                            <div className="mt-4 flex gap-3">
                                <Button
                                    onClick={() => handleProcessChallenge(chal.id, true)}
                                    className="btn-primary bg-green-500 hover:bg-green-600 flex-1"
                                    disabled={isProcessing || isConfirmingProcess}
                                >
                                    {(isProcessing || isConfirmingProcess) && actionChallengeId === chal.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check size={16}/>}
                                    Accept Challenge
                                </Button>
                                <Button
                                    onClick={() => handleProcessChallenge(chal.id, false)}
                                    className="btn-danger flex-1"
                                    disabled={isProcessing || isConfirmingProcess}
                                >
                                     {(isProcessing || isConfirmingProcess) && actionChallengeId === chal.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <X size={16}/>}
                                    Reject Challenge
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}