// app/become-backer/page.jsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseEther, formatEther, isAddress } from 'viem';
import { useSession, signIn } from 'next-auth/react';
import {
    REPUFI_SBT_CONTRACT_ADDRESS,
    REPUFI_SBT_ABI,
    MIN_GITHUB_SCORE_CONTRACT
} from '../../../lib/constants'; // Adjust path
import { uploadJsonToIPFS, fetchFromIPFS } from '../../../lib/ipfsHelper'; // Adjust path
import { useGitHubScore } from '../context/GitHubScoreContext'; // Adjust path
import { Button } from '../components/ui/Button';   // Adjust path
import { Input } from '../components/ui/Input';     // Adjust path
import { Textarea } from '../components/ui/Textarea'; // Adjust path
import { Loader2, ShieldAlert, LockKeyhole, CheckCircle2, UserPlus, FileText, Clock, ExternalLink, Eye, Users, Github, Info } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';


// Minimal Modal
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

// getDefaultSbtSvgImageClientSide
const getDefaultSbtSvgImageClientSide = () => {
  const svgXml = `<svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" rx="20" fill="url(#g)"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" fill="white" font-weight="bold">RepuFi</text><text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="white" font-weight="bold">VOUCH</text><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="hsl(210,90%,50%)"/><stop offset="100%" stop-color="hsl(260,70%,60%)"/></linearGradient></defs></svg>`;
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svgXml)))}`;
  } return "";
};


export default function BecomeBackerPage() {
  const { address: connectedAddress, isConnected } = useAccount();
  const { data: session, status: sessionStatus } = useSession();
  const publicClient = usePublicClient();
  const { scoreData, isFetchingScore, fetchScoreError, refreshScore } = useGitHubScore();

  const [isEligibleBacker, setIsEligibleBacker] = useState(false);
  const [reputationRequests, setReputationRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [errorRequests, setErrorRequests] = useState(null);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [backerStakeAmount, setBackerStakeAmount] = useState('');
  const [vouchReason, setVouchReason] = useState("Fulfilling user's reputation request.");

  const {
    data: vouchHash,
    writeContract: executeVouchForRequest,
    reset: resetVouchContract,
    isPending: isVouchPending,
    error: vouchWriteError
  } = useWriteContract();
  const {
    isLoading: isVouchConfirming,
    isSuccess: isVouchConfirmed,
    error: vouchReceiptError
  } = useWaitForTransactionReceipt({ hash: vouchHash });
  const [vouchFormMessage, setVouchFormMessage] = useState(null);
  const [vouchFormError, setVouchFormError] = useState(null);

  const actualMinScoreThreshold = MIN_GITHUB_SCORE_CONTRACT / 10.0;

  useEffect(() => {
    if (scoreData && typeof scoreData.totalScore === 'number') {
        setIsEligibleBacker(scoreData.totalScore >= actualMinScoreThreshold);
    } else {
        setIsEligibleBacker(false);
    }
  }, [scoreData, actualMinScoreThreshold]);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && session?.user?.githubUsername && !scoreData && !isFetchingScore) {
      refreshScore(session.user.githubUsername);
    }
  }, [sessionStatus, session, scoreData, isFetchingScore, refreshScore]);

  const { data: requestCounterData, refetch: refetchRequestCounter } = useReadContract({
    address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI,
    functionName: 'reputationRequestCounter',
    query: { enabled: isConnected && isEligibleBacker }
  });

  const fetchAllOpenReputationRequests = useCallback(async () => {
    if (!publicClient || requestCounterData === undefined || !isEligibleBacker) {
        setReputationRequests([]); return;
    }
    setIsLoadingRequests(true); setErrorRequests(null);
    setReputationRequests([]);
    const totalRequests = Number(requestCounterData);
    if (totalRequests === 0) {
        setIsLoadingRequests(false); return;
    }
    const fetchedRequestsArray = [];
    try {
        for (let i = totalRequests; i >= 1; i--) {
            if (fetchedRequestsArray.length >= 30 && i < totalRequests - 60) break;
            try {
                const rawReqDetailsArray = await publicClient.readContract({
                    address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI,
                    functionName: 'reputationRequests', args: [BigInt(i)]
                });
                if (!rawReqDetailsArray || rawReqDetailsArray.length < 9) { continue; }
                const [ borrower, requestTypeStr, descriptionStr, durationBigInt, timestampBigInt,
                        metadataCIDStr, fulfilledBool, githubScoreBigInt, borrowerStakeBigInt
                ] = rawReqDetailsArray;

                if (borrower && typeof borrower === 'string' && borrower !== "0x0000000000000000000000000000000000000000" &&
                    typeof fulfilledBool === 'boolean' && !fulfilledBool) {
                    let ipfsMetadata = { name: `Request #${i}`, description: "Metadata loading..." };
                    if (metadataCIDStr && typeof metadataCIDStr === 'string' && metadataCIDStr.trim() !== '') {
                        try { ipfsMetadata = await fetchFromIPFS(metadataCIDStr); }
                        catch (e) { console.warn("IPFS error:", e); }
                    }
                    fetchedRequestsArray.push({
                        id: i, borrower, requestType: requestTypeStr || "N/A", description: descriptionStr || "N/A",
                        duration: Number(durationBigInt), timestamp: Number(timestampBigInt), metadataCID: metadataCIDStr || "",
                        fulfilled: fulfilledBool, githubScore: Number(githubScoreBigInt), borrowerStake: borrowerStakeBigInt,
                        metadata: ipfsMetadata
                    });
                }
            } catch (e) { console.warn(`Could not fetch req ID ${i}:`, e.message); }
        }
        setReputationRequests(fetchedRequestsArray);
    } catch (err) { setErrorRequests(`Failed to load requests: ${err.message}`);
    } finally { setIsLoadingRequests(false); }
  }, [publicClient, requestCounterData, isEligibleBacker, REPUFI_SBT_ABI, REPUFI_SBT_CONTRACT_ADDRESS]);

  useEffect(() => {
    if (isConnected && isEligibleBacker && requestCounterData !== undefined) {
        fetchAllOpenReputationRequests();
    }
  }, [isConnected, isEligibleBacker, requestCounterData, fetchAllOpenReputationRequests]);

  const handleOpenVouchModal = (request) => {
    setSelectedRequest(request);
    setBackerStakeAmount('');
    setVouchReason(`Fulfilling request for ${request.metadata?.name || request.requestType}`);
    setVouchFormError(null); setVouchFormMessage(null);
    resetVouchContract();
  };

  const handleVouchForRequestSubmit = async (e) => {
    e.preventDefault();
    setVouchFormError(null); setVouchFormMessage(null); resetVouchContract();

    if (!selectedRequest || !isAddress(selectedRequest.borrower) || !connectedAddress || !scoreData) {
        setVouchFormError("Required data missing (wallet, request, or your GitHub score)."); return;
    }
    if (!backerStakeAmount || !backerStakeAmount.trim() || parseFloat(backerStakeAmount) <= 0 || isNaN(parseFloat(backerStakeAmount))) {
        setVouchFormError('Your stake amount must be a positive number.'); return;
    }
    if (selectedRequest.borrower.toLowerCase() === connectedAddress.toLowerCase()) {
        setVouchFormError("You cannot vouch for yourself."); return;
    }
    if (!isEligibleBacker) {
        setVouchFormError("Your GitHub score does not meet the minimum to be a backer."); return;
    }

    setVouchFormMessage("Preparing to vouch...");
    try {
        const stakeInWei = parseEther(backerStakeAmount);
        const vouchMetadata = {
            name: `RepuFi Vouch: ${scoreData.username} for ${selectedRequest.borrower.substring(0,8)}...`,
            description: `Vouch by Backer ${connectedAddress} (GitHub: ${scoreData.username}) for Borrower ${selectedRequest.borrower}, fulfilling Request #${selectedRequest.id}. Reason: ${vouchReason}`,
            image: getDefaultSbtSvgImageClientSide(),
            attributes: [
              { trait_type: "Vouch Type", value: "Fulfilling Reputation Request" },
              { trait_type: "Original Request ID", value: selectedRequest.id.toString() },
              { trait_type: "Backer Address", value: connectedAddress },
              { trait_type: "Backer GitHub Username", value: scoreData.username },
              { trait_type: "Backer GitHub Score (at vouch)", value: scoreData.totalScore.toFixed(1) },
              { trait_type: "Borrower Address", value: selectedRequest.borrower },
              { trait_type: "Borrower GitHub Score (at request)", value: (selectedRequest.githubScore / 10).toFixed(1) },
              { trait_type: "Stake Amount (PAS)", value: backerStakeAmount },
              { trait_type: "Vouch Duration (Days)", value: (Number(selectedRequest.duration) / (24*60*60)).toFixed(0) },
              { trait_type: "Backer's Reason/Note", value: vouchReason },
            ],
        };
        const metadataCIDForVouchSBT = await uploadJsonToIPFS(vouchMetadata);
        if (!metadataCIDForVouchSBT) {
            setVouchFormError("Failed to upload metadata to IPFS."); setVouchFormMessage(null); return;
        }
        setVouchFormMessage(`Vouch metadata uploaded. Submitting transaction...`);
        executeVouchForRequest({
            address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI,
            functionName: 'vouchForRequest',
            args: [selectedRequest.borrower, metadataCIDForVouchSBT], value: stakeInWei,
        });
    } catch (err) {
        console.error("Vouch for request error:", err);
        setVouchFormError(`Error: ${err.message || "An error occurred during preparation."}`);
        setVouchFormMessage(null);
     }
  };

   useEffect(() => {
    if (isVouchConfirmed) {
      setVouchFormMessage('Successfully vouched for request! Transaction confirmed.');
      setVouchFormError(null);
      refetchRequestCounter().then(() => fetchAllOpenReputationRequests());
      setTimeout(() => { setSelectedRequest(null); setVouchFormMessage(null);}, 3500);
    }
    if (vouchWriteError) { setVouchFormError(`Tx Error: ${vouchWriteError.shortMessage || vouchWriteError.message}`); setVouchFormMessage(null); }
    if (vouchReceiptError) { setVouchFormError(`Confirm Error: ${vouchReceiptError.shortMessage || vouchReceiptError.message}`); setVouchFormMessage(null); }
  }, [isVouchConfirmed, vouchWriteError, vouchReceiptError, fetchAllOpenReputationRequests, refetchRequestCounter]);


  const renderUserStatusAndEligibility = () => {
    if (sessionStatus === 'loading' && !scoreData) return <div className="card p-6 text-center"><Loader2 className="mr-2 h-6 w-6 animate-spin inline-block" />Loading User Session...</div>;
    if (isFetchingScore) return <div className="card p-6 text-center"><Loader2 className="mr-2 h-6 w-6 animate-spin inline-block" />Analyzing your GitHub profile ({session?.user?.githubUsername || 'previous'})...</div>;
    if (fetchScoreError) return <div className="card p-6 text-center text-red-500"><AlertTriangle className="mx-auto h-8 w-8 mb-2"/>Error fetching score: {fetchScoreError} <button onClick={() => refreshScore(session?.user?.githubUsername)} className="ml-1 text-primary underline text-xs font-semibold">(Retry)</button></div>;

    if (sessionStatus === 'unauthenticated') {
        return (
            <div className="card p-8 text-center max-w-md mx-auto">
                <Github className="h-12 w-12 mx-auto text-primary opacity-70 mb-4" />
                <h3 className="text-xl font-semibold mb-2">GitHub Login Required</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                    To become a backer, please log in with GitHub (via the header button) so your profile score can be analyzed for eligibility.
                </p>
                <Button onClick={() => signIn('github')} className="btn-secondary">
                    <Github className="mr-2 h-5 w-5"/> Login with GitHub
                </Button>
            </div>
        );
    }

    if (scoreData && typeof scoreData.totalScore === 'number') {
      return (
        <div className={`card p-6 text-center ${isEligibleBacker ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}`}>
          <h2 className="text-xl font-semibold mb-2">Your Backer Eligibility</h2>
          <p className="font-medium">GitHub Profile: {scoreData.username}</p>
          <p>Analyzed Score: <strong className="text-2xl">{scoreData.totalScore.toFixed(1)}</strong> / 10</p>
          {isEligibleBacker ?
            <p className="mt-2 text-sm text-green-700 dark:text-green-300 flex items-center justify-center gap-1"><CheckCircle2 size={16}/>You are eligible to be a backer! View open requests below.</p> :
            <p className="mt-2 text-sm text-red-700 dark:text-red-300 flex items-center justify-center gap-1"><ShieldAlert size={16}/>Your score is below {actualMinScoreThreshold.toFixed(1)}. You cannot currently act as a backer. Consider <Link href="/request-reputation" className="ml-1 font-semibold hover:underline">requesting a vouch</Link>.</p>
          }
          {scoreData.isOverridden && <p className="text-xs italic mt-1">Note: Your displayed score is manually overridden.</p>}
        </div>
      );
    }
    return (
        <div className="card p-4 text-center text-slate-500 dark:text-slate-400">
            <Info size={20} className="mx-auto mb-2 opacity-70" />
            Your GitHub score from context is not yet available. If you've just logged in, please wait a moment.
            The score should appear in the header. If not, try refreshing the page or logging in with GitHub again via the header.
        </div>
    );
  };


  if (!isConnected) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto my-10 animate-fadeIn">
        <LockKeyhole className="h-16 w-16 mx-auto text-primary opacity-70 mb-6" />
        <h2 className="text-2xl font-semibold text-foreground mb-3">Connect Wallet</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">Connect your wallet to view requests and become a backer.</p>
        <div className="flex justify-center"><ConnectButton /></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      <header className="text-center pt-4">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">Become a RepuFi Backer</h1>
        
      </header>

      {renderUserStatusAndEligibility()}

      {isEligibleBacker && (
        <section className="card p-6 sm:p-8 animate-fadeIn shadow-xl mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-border">
                <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                    <Eye size={28} className="text-primary"/> Open Reputation Requests ({reputationRequests.length})
                </h2>
                <Button onClick={fetchAllOpenReputationRequests} disabled={isLoadingRequests} className="btn-outline text-sm mt-3 sm:mt-0">
                    {isLoadingRequests ? <Loader2 className="h-4 w-4 animate-spin"/> : "Refresh Requests"}
                </Button>
            </div>

            {isLoadingRequests && <div className="text-center py-6"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary"/> <p className="text-sm mt-2">Loading requests...</p></div>}
            {errorRequests && <p className="text-red-500 dark:text-red-400 text-center py-4">{errorRequests}</p>}
            {!isLoadingRequests && reputationRequests.length === 0 && !errorRequests && (
                <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                    <Users size={48} className="mx-auto mb-4 opacity-50"/>
                    <h3 className="text-xl font-medium mb-2">No Open Requests</h3>
                    <p>There are currently no reputation requests awaiting a backer.</p>
                </div>
            )}
            {reputationRequests.length > 0 && (
                <div className="space-y-5">
                    {reputationRequests.map(req => {
                        const displayDurationDays = (req.duration && !isNaN(Number(req.duration))) ? (Number(req.duration) / (24*60*60)).toFixed(0) : "N/A";
                        // req.githubScore is the scaled score from contract (e.g., 65 if actual was 6.5)
                        const displayRequesterActualScore = (req.githubScore && !isNaN(Number(req.githubScore))) ? (Number(req.githubScore) / 10).toFixed(1) : "N/A";
                        const displayBorrowerStake = (typeof req.borrowerStake === 'bigint') ? formatEther(req.borrowerStake) : "N/A";

                        return (
                            <div key={req.id} className="p-4 rounded-lg bg-background border border-border shadow-md hover:shadow-lg transition-shadow">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                                    <div className="flex-grow">
                                        <h4 className="font-semibold text-lg text-primary">{req.metadata?.name || `Request #${req.id} for ${req.requestType || 'Unknown Type'}`}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            By: <span className="font-mono">{req.borrower || "N/A"}</span>
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Requester's GitHub Score (0-10 scale): <span className="font-semibold">{displayRequesterActualScore}</span>
                                        </p>
                                         <p className="text-sm mt-2 text-foreground break-words max-h-20 overflow-y-auto">{req.metadata?.description || req.description || "No description provided."}</p>
                                    </div>
                                    <Button onClick={() => handleOpenVouchModal(req)} className="btn-secondary text-sm w-full sm:w-auto mt-2 sm:mt-0 whitespace-nowrap">
                                        <UserPlus size={16} className="mr-1.5"/> Vouch
                                    </Button>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mt-3 text-slate-500 dark:text-slate-400 border-t border-border pt-2">
                                    <span className="flex items-center" title="Requested Vouch Duration"><Clock size={13} className="mr-1 opacity-70"/>{displayDurationDays} days</span>
                                    <span className="flex items-center" title="Fee Paid by Requester"><FileText size={13} className="mr-1 opacity-70"/>Fee Paid: {displayBorrowerStake} PAS</span>
                                    {req.metadataCID && <a href={`https://gateway.pinata.cloud/ipfs/${req.metadataCID}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">Request Meta <ExternalLink size={12} className="ml-1"/></a>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
      )}

        <Modal isOpen={!!selectedRequest} onClose={() => setSelectedRequest(null)} title={`Vouch for Request #${selectedRequest?.id}`}>
            {selectedRequest && (
                <form onSubmit={handleVouchForRequestSubmit} className="space-y-4">
                    <div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Vouching for: <strong className="font-mono block truncate text-xs my-1">{selectedRequest.borrower}</strong>
                            <br/>Request Type: <strong>{selectedRequest.requestType || "N/A"}</strong>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Duration: {selectedRequest.duration && !isNaN(Number(selectedRequest.duration)) ? (Number(selectedRequest.duration)/(24*60*60)).toFixed(0) : 'N/A'} days</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Requester's Provided Score (Contract Value): {selectedRequest.githubScore && !isNaN(Number(selectedRequest.githubScore)) ? Number(selectedRequest.githubScore).toString() : "N/A"}</p>
                    </div>
                    <div>
                        <label htmlFor="backerStakeAmountModal" className="block text-sm font-medium mb-1">Your Stake Amount (PAS) <span className="text-red-500">*</span></label>
                        <Input type="number" id="backerStakeAmountModal" value={backerStakeAmount} onChange={(e) => setBackerStakeAmount(e.target.value)} step="any" placeholder="e.g., 0.05" required className="input"/>
                    </div>
                     <div>
                        <label htmlFor="vouchReasonModal" className="block text-sm font-medium mb-1">Reason/Note (for Vouch SBT metadata):</label>
                        <Textarea id="vouchReasonModal" value={vouchReason} onChange={(e) => setVouchReason(e.target.value)} rows={3} placeholder="e.g., Confident in their ability for this project." className="input"/>
                    </div>
                    <Button type="submit" className="w-full btn-primary !py-2.5" disabled={isVouchPending || isVouchConfirming}>
                        {isVouchPending || isVouchConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        {isVouchPending ? 'Staking PAS...' : isVouchConfirming ? 'Confirming Transaction...' : 'Confirm & Stake PAS'}
                    </Button>
                    {vouchFormMessage && <p className="text-green-500 dark:text-green-400 text-sm text-center mt-2">{vouchFormMessage}</p>}
                    {vouchFormError && <p className="text-red-500 dark:text-red-400 text-sm text-center mt-2">{vouchFormError}</p>}
                </form>
            )}
        </Modal>
    </div>
  );
}