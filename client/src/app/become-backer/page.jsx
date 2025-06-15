// app/become-backer/page.jsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseEther, formatEther, isAddress } from 'viem';
import {
    REPUFI_SBT_CONTRACT_ADDRESS,
    REPUFI_SBT_ABI,
    MIN_GITHUB_SCORE_CONTRACT
} from '../../../lib/constants'; // Adjust: from app/become-backer/ -> root/lib/
import { uploadJsonToIPFS, fetchFromIPFS } from '../../../lib/ipfsHelper'; // Adjust
import { Button } from '../components/ui/Button';   // Adjust: from app/become-backer/ -> app/component/ui/
import { Input } from '../components/ui/Input';     // Adjust
import { Textarea } from '../components/ui/Textarea'; // Adjust
import { Loader2, ShieldAlert, LockKeyhole, CheckCircle2, UserPlus, FileText, Clock, ExternalLink, Eye, Users } from 'lucide-react';
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


export default function MinimalBecomeBackerPage() {
  const { address: connectedAddress, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [manualBackerScoreInput, setManualBackerScoreInput] = useState('');
  const [processedBackerScore, setProcessedBackerScore] = useState(0);
  const [isEligibleBacker, setIsEligibleBacker] = useState(false);
  const [githubUsernameForMetadata, setGithubUsernameForMetadata] = useState('');

  const [reputationRequests, setReputationRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [errorRequests, setErrorRequests] = useState(null);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [backerStakeAmount, setBackerStakeAmount] = useState('');
  const [vouchReason, setVouchReason] = useState("Fulfilling user's reputation request.");

  const {
    data: vouchHash, // This is the transaction hash from executeVouchForRequest
    writeContract: executeVouchForRequest,
    reset: resetVouchContract,
    isPending: isVouchPending, // True when the transaction is being sent to the wallet/node
    error: vouchWriteError     // Error from sending the transaction
  } = useWriteContract();

  const {
    isLoading: isVouchConfirming, // True while waiting for transaction confirmation (mining)
    isSuccess: isVouchConfirmed,   // True once the transaction is confirmed
    error: vouchReceiptError     // Error related to transaction receipt/confirmation
  } = useWaitForTransactionReceipt({
    hash: vouchHash, // Hook depends on vouchHash; initially undefined
  });

  const [vouchFormMessage, setVouchFormMessage] = useState(null);
  const [vouchFormError, setVouchFormError] = useState(null);


  const handleScoreInputChange = (e) => {
    setManualBackerScoreInput(e.target.value);
  };

  const handleSetScoreAndEligibility = () => {
    const score = parseInt(manualBackerScoreInput);
    if (!isNaN(score) && score >= 0) {
        setProcessedBackerScore(score);
        setIsEligibleBacker(score >= MIN_GITHUB_SCORE_CONTRACT);
        if (score < MIN_GITHUB_SCORE_CONTRACT) {
            alert(`Score ${score} is below the minimum of ${MIN_GITHUB_SCORE_CONTRACT} required to be a backer.`);
        }
    } else {
        alert("Please enter a valid non-negative number for the score.");
        setIsEligibleBacker(false);
        setProcessedBackerScore(0);
    }
  };

  const { data: requestCounterData, refetch: refetchRequestCounter } = useReadContract({
    address: REPUFI_SBT_CONTRACT_ADDRESS,
    abi: REPUFI_SBT_ABI,
    functionName: 'reputationRequestCounter',
    query: { enabled: isConnected && isEligibleBacker }
  });

   const fetchAllOpenReputationRequests = useCallback(async () => {
    console.log("Attempting to fetch reputation requests...");
    if (!publicClient) {
        setErrorRequests("Web3 provider (publicClient) is not available.");
        setIsLoadingRequests(false); return;
    }
    if (requestCounterData === undefined) {
        setErrorRequests("Reputation request counter not yet loaded."); return;
    }
    if (!isEligibleBacker) {
        setErrorRequests("Not eligible to view requests.");
        setReputationRequests([]); setIsLoadingRequests(false); return;
    }

    setIsLoadingRequests(true); setErrorRequests(null);
    setReputationRequests([]);

    const totalRequests = Number(requestCounterData);
    console.log("Parsed Total Requests (from counter):", totalRequests);
    if (totalRequests === 0) {
        console.log("No requests to fetch (counter is 0).");
        setIsLoadingRequests(false); return;
    }

    const fetchedRequestsArray = [];
    let successfulFetches = 0;

    try {
        for (let i = totalRequests; i >= 1; i--) {
            if (fetchedRequestsArray.length >= 30 && i < totalRequests - 60) {
                console.log(`Optimization: Reached fetch limit, stopping early.`); break;
            }

            try {
                const rawReqDetailsArray = await publicClient.readContract({ // Renamed to rawReqDetailsArray
                    address: REPUFI_SBT_CONTRACT_ADDRESS,
                    abi: REPUFI_SBT_ABI,
                    functionName: 'reputationRequests',
                    args: [BigInt(i)]
                });

                console.log(`RAW details Array for Request ID ${i}:`, JSON.stringify(rawReqDetailsArray, (key, value) =>
                    typeof value === 'bigint' ? value.toString() : value, 2
                ));

                // Destructure or access by index based on your Solidity struct order
                if (!rawReqDetailsArray || rawReqDetailsArray.length < 9) { // Basic check for array structure
                    console.warn(`Skipping Request ID ${i}: Invalid data structure returned from contract.`);
                    continue;
                }

                const [
                    borrower,       // Index 0
                    requestType,    // Index 1
                    description,    // Index 2
                    duration,       // Index 3 (bigint)
                    timestamp,      // Index 4 (bigint)
                    metadataCID,    // Index 5
                    fulfilled,      // Index 6 (boolean)
                    githubScore,    // Index 7 (bigint)
                    borrowerStake   // Index 8 (bigint)
                ] = rawReqDetailsArray;

                // Now perform checks using the destructured variables
                if (
                    borrower && typeof borrower === 'string' && borrower !== "0x0000000000000000000000000000000000000000" &&
                    typeof fulfilled === 'boolean' && !fulfilled &&
                    githubScore !== undefined && duration !== undefined && borrowerStake !== undefined
                ) {
                    let ipfsMetadata = { name: `Request #${i}`, description: "Metadata loading or unavailable." };
                    if (metadataCID && typeof metadataCID === 'string' && metadataCID.trim() !== '') {
                        try {
                            ipfsMetadata = await fetchFromIPFS(metadataCID);
                        } catch (ipfsError) {
                            console.warn(`IPFS fetch error for CID ${metadataCID} (Request ID ${i}):`, ipfsError.message);
                        }
                    }

                    fetchedRequestsArray.push({
                        id: i,
                        borrower: borrower,
                        requestType: requestType || "N/A",
                        description: description || "N/A",
                        duration: Number(duration),
                        timestamp: Number(timestamp),
                        metadataCID: metadataCID || "",
                        fulfilled: fulfilled,
                        githubScore: Number(githubScore),
                        borrowerStake: borrowerStake, // Keep as bigint
                        metadata: ipfsMetadata
                    });
                    successfulFetches++;
                } else {
                    console.log(`Skipping Request ID ${i} after destructuring: Not valid, already fulfilled, or zero address borrower. Fulfilled: ${fulfilled}, Borrower: ${borrower}`);
                }
            } catch (readError) {
                console.warn(`Error reading contract for Request ID ${i}:`, readError.message, readError.stack);
            }
        }
        setReputationRequests(fetchedRequestsArray);
        if (fetchedRequestsArray.length === 0 && totalRequests > 0) {
            console.log("Fetched 0 valid, unfulfilled requests. All might be fulfilled or invalid based on contract data.");
        }
    } catch (mainLoopError) {
        console.error("Error during the main loop of fetching requests:", mainLoopError);
        setErrorRequests(`Failed to load all reputation requests: ${mainLoopError.message}`);
    } finally {
        setIsLoadingRequests(false);
        console.log("Finished fetching requests. Found valid & unfulfilled:", fetchedRequestsArray.length);
    }
  }, [publicClient, requestCounterData, isEligibleBacker, REPUFI_SBT_CONTRACT_ADDRESS, REPUFI_SBT_ABI]);

  useEffect(() => {
    if (isConnected && isEligibleBacker && requestCounterData !== undefined) {
        fetchAllOpenReputationRequests();
    } else if (!isEligibleBacker) {
        setReputationRequests([]);
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

    if (!selectedRequest || !selectedRequest.borrower || !isAddress(selectedRequest.borrower)) {
        setVouchFormError("Invalid or no reputation request selected."); return;
    }
    if (!connectedAddress) {
        setVouchFormError("Wallet not connected."); return;
    }
    if (!backerStakeAmount || !backerStakeAmount.trim()) {
        setVouchFormError('Your stake amount is required.'); return;
    }
    const parsedStakeAmount = parseFloat(backerStakeAmount);
    if (isNaN(parsedStakeAmount) || parsedStakeAmount <= 0) {
        setVouchFormError('Your stake amount must be a positive number.'); return;
    }
    if (selectedRequest.borrower.toLowerCase() === connectedAddress.toLowerCase()) {
        setVouchFormError("You cannot vouch for yourself."); return;
    }
    if (!isEligibleBacker || processedBackerScore < MIN_GITHUB_SCORE_CONTRACT) {
        setVouchFormError("Your processed score does not meet the minimum requirement to be a backer."); return;
    }

    setVouchFormMessage("Preparing to vouch...");
    try {
        const stakeInWei = parseEther(backerStakeAmount); // This must be a valid number string
        const vouchMetadata = {
            name: `RepuFi Vouch: ${githubUsernameForMetadata || connectedAddress.substring(0,6)} for ${selectedRequest.borrower.substring(0,8)}`,
            description: `Vouch by Backer ${connectedAddress} (Provided Score: ${processedBackerScore}, GitHub Claim: ${githubUsernameForMetadata || 'N/A'}) for Borrower ${selectedRequest.borrower}, fulfilling Request #${selectedRequest.id}. Reason: ${vouchReason}`,
            image: getDefaultSbtSvgImageClientSide(),
            attributes: [
              { trait_type: "Vouch Type", value: "Fulfilling Reputation Request" },
              { trait_type: "Original Request ID", value: selectedRequest.id.toString() },
              { trait_type: "Backer Address", value: connectedAddress },
              { trait_type: "Backer Claimed GitHub Username", value: githubUsernameForMetadata || "Not Provided" },
              { trait_type: "Backer Provided Score", value: processedBackerScore.toString() },
              { trait_type: "Borrower Address", value: selectedRequest.borrower },
              { trait_type: "Borrower GitHub Score (at request time)", value: (selectedRequest.githubScore !== undefined && selectedRequest.githubScore !== null) ? Number(selectedRequest.githubScore).toString() : "N/A" },
              { trait_type: "Stake Amount (PAS)", value: backerStakeAmount },
              { trait_type: "Vouch Duration (Days)", value: (selectedRequest.duration !== undefined && selectedRequest.duration !== null) ? (Number(selectedRequest.duration) / (24*60*60)).toFixed(0) : "N/A" },
              { trait_type: "Backer's Reason/Note", value: vouchReason },
            ],
        };
        const metadataCIDForVouchSBT = await uploadJsonToIPFS(vouchMetadata);
        if (!metadataCIDForVouchSBT) {
            setVouchFormError("Failed to upload metadata to IPFS. Cannot proceed.");
            setVouchFormMessage(null); return;
        }
        setVouchFormMessage(`Vouch metadata uploaded. Submitting transaction...`);

        const borrowerArg = selectedRequest.borrower;
        const metadataCIDArg = metadataCIDForVouchSBT;

        console.log("Calling vouchForRequest with args:", {
            borrower: borrowerArg,
            metadataCID: metadataCIDArg,
            value: stakeInWei.toString()
        });

        executeVouchForRequest({
            address: REPUFI_SBT_CONTRACT_ADDRESS,
            abi: REPUFI_SBT_ABI,
            functionName: 'vouchForRequest',
            args: [borrowerArg, metadataCIDArg],
            value: stakeInWei,
        });
    } catch (err) {
        console.error("Vouch for request error:", err);
        setVouchFormError(`Error: ${err.message || "An error occurred during preparation."}`);
        setVouchFormMessage(null);
    }
  };

   useEffect(() => {
    // This effect depends on isVouchConfirmed, vouchWriteError, and vouchReceiptError
    if (isVouchConfirmed) { // isVouchConfirmed IS DEFINED and comes from useWaitForTransactionReceipt
      setVouchFormMessage('Successfully vouched for request! Transaction confirmed.');
      setVouchFormError(null);
      refetchRequestCounter().then(() => fetchAllOpenReputationRequests());
      setTimeout(() => { setSelectedRequest(null); setVouchFormMessage(null);}, 3500);
    }
    if (vouchWriteError) { setVouchFormError(`Tx Error: ${vouchWriteError.shortMessage || vouchWriteError.message}`); setVouchFormMessage(null); }
    if (vouchReceiptError) { setVouchFormError(`Confirm Error: ${vouchReceiptError.shortMessage || vouchReceiptError.message}`); setVouchFormMessage(null); }
  }, [isVouchConfirmed, vouchWriteError, vouchReceiptError, fetchAllOpenReputationRequests, refetchRequestCounter]); // Dependencies are correct


  if (!isConnected) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto my-10 animate-fadeIn">
        <LockKeyhole className="h-16 w-16 mx-auto text-primary opacity-70 mb-6" />
        <h2 className="text-2xl font-semibold text-foreground mb-3">Connect Wallet</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">Connect your wallet to become a backer.</p>
        <div className="flex justify-center"><ConnectButton /></div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-6">
          Ensure you are on the PassetHub Testnet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      <header className="text-center pt-4">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">Become a RepuFi Backer (Test Mode)</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
          Enter your GitHub score. If it's {MIN_GITHUB_SCORE_CONTRACT} or higher, you can view and fulfill reputation requests.
        </p>
      </header>

      <div className="card p-6 shadow-lg max-w-lg mx-auto">
        <h2 className="text-xl font-semibold mb-4 text-center">1. Set Your Backer Score</h2>
        <div className="space-y-4">
            <div>
                <label htmlFor="manualBackerScoreInput" className="block text-sm font-medium text-foreground mb-1.5">
                    Enter Your Score (Contract MIN_GITHUB_SCORE is {MIN_GITHUB_SCORE_CONTRACT}):
                </label>
                <Input
                    type="number"
                    id="manualBackerScoreInput"
                    value={manualBackerScoreInput}
                    onChange={handleScoreInputChange}
                    placeholder={`e.g., 70, 75 (must be >= ${MIN_GITHUB_SCORE_CONTRACT})`}
                    className="input"
                />
            </div>
            <div>
                <label htmlFor="githubUsernameForMetadata" className="block text-sm font-medium text-foreground mb-1.5">
                    Your GitHub Username (Optional, for Vouch Metadata):
                </label>
                <Input
                    type="text"
                    id="githubUsernameForMetadata"
                    value={githubUsernameForMetadata}
                    onChange={(e) => setGithubUsernameForMetadata(e.target.value)}
                    placeholder="your-github-id"
                    className="input"
                />
            </div>
            <Button onClick={handleSetScoreAndEligibility} className="btn-primary w-full !py-2.5">
                Set Score & Check Eligibility
            </Button>
        </div>

        {processedBackerScore > 0 && (
            <div className={`mt-4 p-3 rounded-md text-center text-sm ${isEligibleBacker ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                {isEligibleBacker ?
                    <p className="flex items-center justify-center gap-1.5"><CheckCircle2 size={18}/>Eligible! Your Score: {processedBackerScore}. You can view requests below.</p> :
                    <p className="flex items-center justify-center gap-1.5"><ShieldAlert size={18}/>Not Eligible. Your Score: {processedBackerScore}. Minimum required is {MIN_GITHUB_SCORE_CONTRACT}.</p>
                }
            </div>
        )}
      </div>


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
                        const displayDurationDays = req.duration && !isNaN(Number(req.duration)) ? (Number(req.duration) / (24*60*60)).toFixed(0) : "N/A";
                        const displayGithubScore = req.githubScore && !isNaN(Number(req.githubScore)) ? Number(req.githubScore).toString() : "N/A";
                        const displayBorrowerStake = typeof req.borrowerStake === 'bigint' ? formatEther(req.borrowerStake) : "N/A";

                        return (
                            <div key={req.id} className="p-4 rounded-lg bg-background border border-border shadow-md hover:shadow-lg transition-shadow">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                                    <div className="flex-grow">
                                        <h4 className="font-semibold text-lg text-primary">{req.metadata?.name || `Request #${req.id} for ${req.requestType || 'Unknown Type'}`}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            By: <span className="font-mono">{req.borrower || "N/A"}</span>
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Requester's GitHub Score (provided to contract): <span className="font-semibold">{displayGithubScore}</span>
                                        </p>
                                         <p className="text-sm mt-2 text-foreground break-words">{req.metadata?.description || req.description || "No description provided."}</p>
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
                        <p className="text-xs text-slate-500 dark:text-slate-400">Requester's Provided Score: {selectedRequest.githubScore && !isNaN(Number(selectedRequest.githubScore)) ? Number(selectedRequest.githubScore).toString() : "N/A"}</p>
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