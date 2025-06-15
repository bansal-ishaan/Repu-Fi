// app/become-backer/page.jsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { REPUFI_SBT_CONTRACT_ADDRESS, REPUFI_SBT_ABI } from '../../../lib/constants'; // or config.js
import { fetchFromIPFS, uploadJsonToIPFS } from '../../../lib/ipfsHelper';
import { parseEther, formatEther, isAddress } from 'viem';
import GitHubAnalyzerClient from '../components/GitHubAnalyzerClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Loader2, ShieldAlert, LockKeyhole, CheckCircle2, UserPlus, FileText, Clock, ExternalLink } from 'lucide-react';

const MIN_GITHUB_SCORE_CONTRACT = 7;

// Modal Component (simplified) - can be moved to ui/Modal.jsx
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fadeIn" onClick={onClose}>
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-lg w-full space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-foreground">{title}</h3>
                    <Button onClick={onClose} className="p-1 h-auto text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">×</Button>
                </div>
                {children}
            </div>
        </div>
    );
};


export default function BecomeBackerPage() {
  const { address: connectedAddress, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [backerGitHubData, setBackerGitHubData] = useState(null);
  const [isEligibleBacker, setIsEligibleBacker] = useState(false);

  const [reputationRequests, setReputationRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [errorRequests, setErrorRequests] = useState(null);

  const [selectedRequest, setSelectedRequest] = useState(null); // For modal
  const [stakeAmount, setStakeAmount] = useState('');
  const [vouchReason, setVouchReason] = useState("Fulfilling reputation request"); // Default reason

  const { data: vouchHash, writeContract: executeVouchForRequest, isPending: isVouchPending, error: vouchWriteError } = useWriteContract();
  const { isLoading: isVouchConfirming, isSuccess: isVouchConfirmed, error: vouchReceiptError } = useWaitForTransactionReceipt({ hash: vouchHash });
  const [vouchFormMessage, setVouchFormMessage] = useState(null);
  const [vouchFormError, setVouchFormError] = useState(null);


  const handleBackerAnalysisComplete = (data) => {
    setBackerGitHubData(data);
    setIsEligibleBacker(data && data.totalScore >= MIN_GITHUB_SCORE_CONTRACT);
  };

  const { data: requestCounterData } = useReadContract({
    address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI,
    functionName: 'reputationRequestCounter',
    query: { enabled: isConnected && isEligibleBacker }
  });

  const fetchAllReputationRequests = useCallback(async () => {
    if (!publicClient || !requestCounterData || !isEligibleBacker) return;
    setIsLoadingRequests(true); setErrorRequests(null);
    const totalRequests = Number(requestCounterData);
    const fetchedRequests = [];
    try {
        for (let i = 1; i <= totalRequests; i++) {
            try {
                const reqDetails = await publicClient.readContract({
                    address: REPUFI_SBT_CONTRACT_ADDRESS, abi: REPUFI_SBT_ABI,
                    functionName: 'reputationRequests', args: [BigInt(i)]
                });
                if (reqDetails && !reqDetails.fulfilled && reqDetails.borrower !== "0x0000000000000000000000000000000000000000") { // Check if request is valid and not fulfilled
                    let metadata = {};
                    if (reqDetails.metadataCID) {
                        try { metadata = await fetchFromIPFS(reqDetails.metadataCID); }
                        catch (e) { console.warn("IPFS fetch error for request metadata:", e); }
                    }
                    fetchedRequests.push({ id: i, ...reqDetails, metadata });
                }
            } catch (e) {
                console.warn(`Could not fetch request ID ${i}:`, e.message.includes("RequestNotFound") ? "Not found or invalid" : e.message);
            }
        }
        setReputationRequests(fetchedRequests.reverse()); // Show newest first
    } catch (err) {
        setErrorRequests(`Failed to load reputation requests: ${err.message}`);
    } finally {
        setIsLoadingRequests(false);
    }
  }, [publicClient, requestCounterData, isEligibleBacker]);

  useEffect(() => {
    if (isConnected && isEligibleBacker && requestCounterData !== undefined) {
        fetchAllReputationRequests();
    }
  }, [isConnected, isEligibleBacker, requestCounterData, fetchAllReputationRequests]);


  const handleOpenVouchModal = (request) => {
    setSelectedRequest(request);
    setStakeAmount(''); // Reset stake amount for new modal
    setVouchFormError(null);
    setVouchFormMessage(null);
  };

  const handleVouchForRequestSubmit = async (e) => {
    e.preventDefault();
    setVouchFormError(null); setVouchFormMessage(null);

    if (!selectedRequest || !connectedAddress || !backerGitHubData) {
        setVouchFormError("Required data missing."); return;
    }
    if (parseFloat(stakeAmount) <= 0 || isNaN(parseFloat(stakeAmount))) {
        setVouchFormError('Stake amount must be a positive number.'); return;
    }

    setVouchFormMessage("Preparing to vouch for request...");
    try {
        const stakeInWei = parseEther(stakeAmount);
        setVouchFormMessage("Uploading vouch metadata to IPFS...");

        const vouchMetadata = {
            name: `RepuFi Vouch for ${selectedRequest.borrower.substring(0,6)}... (Request #${selectedRequest.id})`,
            description: `Vouch by ${connectedAddress} fulfilling request from ${selectedRequest.borrower}. Original Request: ${selectedRequest.metadata?.description || selectedRequest.description}`,
            image: getDefaultSbtSvgImageClientSide(), // Re-use from CreateVouchForm or make global
            attributes: [
              { trait_type: "Vouch Type", value: "Fulfilling Request" },
              { trait_type: "Original Request ID", value: selectedRequest.id.toString() },
              { trait_type: "Original Request Type", value: selectedRequest.requestType },
              { trait_type: "Backer GitHub Score", value: backerGitHubData.totalScore.toFixed(1) },
              { trait_type: "Backer GitHub Username", value: backerGitHubData.username },
              { trait_type: "Borrower GitHub Score (at request)", value: (Number(selectedRequest.githubScore)/10).toFixed(1) }, // Assuming score was stored *10
              { trait_type: "Stake Amount (PAS)", value: stakeAmount },
              { trait_type: "Vouch Duration (Days)", value: (Number(selectedRequest.duration) / (24*60*60)).toFixed(0) },
              { trait_type: "Backer", value: connectedAddress },
              { trait_type: "Borrower", value: selectedRequest.borrower },
            ],
        };
        const metadataCID = await uploadJsonToIPFS(vouchMetadata);
        setVouchFormMessage(`Vouch metadata uploaded. Submitting transaction...`);

        executeVouchForRequest({
            address: REPUFI_SBT_CONTRACT_ADDRESS,
            abi: REPUFI_SBT_ABI,
            functionName: 'vouchForRequest',
            args: [selectedRequest.borrower, metadataCID],
            value: stakeInWei,
        });

    } catch (err) {
        console.error("Vouch for request error:", err);
        setVouchFormError(`Error: ${err.message || "An unknown error occurred"}`);
        setVouchFormMessage(null);
    }
  };

   useEffect(() => {
    if (isVouchConfirmed) {
      setVouchFormMessage('Successfully vouched for request! Transaction confirmed.');
      setVouchFormError(null);
      fetchAllReputationRequests(); // Refresh requests
      setTimeout(() => {
        setSelectedRequest(null); // Close modal
        setVouchFormMessage(null);
      }, 3000);
    }
    if (vouchWriteError) {
        setVouchFormError(`Transaction Error: ${vouchWriteError.shortMessage || vouchWriteError.message}`);
        setVouchFormMessage(null);
    }
    if (vouchReceiptError) {
        setVouchFormError(`Confirmation Error: ${vouchReceiptError.shortMessage || vouchReceiptError.message}`);
        setVouchFormMessage(null);
    }
  }, [isVouchConfirmed, vouchWriteError, vouchReceiptError, fetchAllReputationRequests]);


  if (!isConnected) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto">
        <LockKeyhole className="h-12 w-12 mx-auto text-primary mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Connect Wallet</h2>
        <p className="text-slate-600 dark:text-slate-400">Connect your wallet to become a backer.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Become a RepuFi Backer</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">
          Verify your GitHub standing. If eligible (score ≥ {MIN_GITHUB_SCORE_CONTRACT}), you can view and fulfill reputation requests from borrowers.
        </p>
      </div>

      <GitHubAnalyzerClient onAnalysisComplete={handleBackerAnalysisComplete} />

      {!isEligibleBacker && backerGitHubData && (
        <div className="card p-6 text-center border-l-4 border-red-500">
          <ShieldAlert className="h-10 w-10 mx-auto text-red-500 mb-3" />
          <h3 className="text-xl font-semibold text-red-700 dark:text-red-400">Not Eligible to be a Backer</h3>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Your GitHub score is {backerGitHubData.totalScore.toFixed(1)}. A minimum score of {MIN_GITHUB_SCORE_CONTRACT} is required.
          </p>
        </div>
      )}

      {isEligibleBacker && (
        <div className="card p-6 animate-fadeIn">
            <div className="flex items-center justify-center gap-2 mb-4 text-green-600 dark:text-green-400">
                <CheckCircle2 size={24} />
                <h2 className="text-xl font-semibold">Eligible Backer - GitHub Score: {backerGitHubData?.totalScore.toFixed(1)}</h2>
            </div>
            <h3 className="text-2xl font-semibold mb-4 text-center">Open Reputation Requests</h3>
            {isLoadingRequests && <div className="text-center py-4"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary"/></div>}
            {errorRequests && <p className="text-red-500 text-center">{errorRequests}</p>}
            {!isLoadingRequests && reputationRequests.length === 0 && !errorRequests && (
                <p className="text-slate-500 dark:text-slate-400 text-center py-4">No open reputation requests at the moment.</p>
            )}
            {reputationRequests.length > 0 && (
                <div className="space-y-4">
                    {reputationRequests.map(req => (
                        <div key={req.id} className="p-4 border border-border rounded-lg bg-slate-50 dark:bg-slate-800/50 shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start">
                                <div>
                                    <h4 className="font-semibold text-primary">{req.metadata?.name || `Request #${req.id}`}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">By: <span className="font-mono">{req.borrower}</span></p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">GitHub Score (at request): {(Number(req.githubScore)/10).toFixed(1)}</p>
                                </div>
                                <Button onClick={() => handleOpenVouchModal(req)} className="btn-secondary text-xs mt-2 sm:mt-0">
                                    <UserPlus size={14} className="mr-1.5"/> Vouch for Request
                                </Button>
                            </div>
                            <p className="text-sm mt-2 text-foreground">{req.metadata?.description || req.description}</p>
                            <div className="flex items-center gap-4 text-xs mt-2 text-slate-500 dark:text-slate-400">
                                <span className="flex items-center"><FileText size={12} className="mr-1"/>Type: {req.requestType}</span>
                                <span className="flex items-center"><Clock size={12} className="mr-1"/>Duration: {(Number(req.duration)/(24*60*60)).toFixed(0)} days</span>
                                {req.metadataCID && <a href={`https://gateway.pinata.cloud/ipfs/${req.metadataCID}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">Request Meta <ExternalLink size={12} className="ml-1"/></a>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      )}

        <Modal isOpen={!!selectedRequest} onClose={() => setSelectedRequest(null)} title={`Vouch for Request #${selectedRequest?.id}`}>
            {selectedRequest && (
                <form onSubmit={handleVouchForRequestSubmit} className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        You are about to vouch for <strong className="font-mono">{selectedRequest.borrower}</strong>.
                        Their request type: <strong>{selectedRequest.requestType}</strong> for {Number(selectedRequest.duration)/(24*60*60)} days.
                    </p>
                    <div>
                        <label htmlFor="stakeAmount" className="block text-sm font-medium">Stake Amount (PAS):</label>
                        <Input type="number" id="stakeAmount" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} step="any" placeholder="e.g., 0.5" required/>
                    </div>
                     <div>
                        <label htmlFor="vouchReasonModal" className="block text-sm font-medium">Reason (optional, for metadata):</label>
                        <Textarea id="vouchReasonModal" value={vouchReason} onChange={(e) => setVouchReason(e.target.value)} rows={2} placeholder="Fulfilling reputation request"/>
                    </div>
                    <Button type="submit" className="w-full btn-primary" disabled={isVouchPending || isVouchConfirming}>
                        {isVouchPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        {isVouchPending ? 'Staking...' : isVouchConfirming ? 'Confirming...' : 'Confirm & Stake PAS'}
                    </Button>
                    {vouchFormMessage && <p className="text-green-500 text-sm">{vouchFormMessage}</p>}
                    {vouchFormError && <p className="text-red-500 text-sm">{vouchFormError}</p>}
                </form>
            )}
        </Modal>
    </div>
  );
}

// Helper for SVG image (can be moved to a util file or lib/config.js)
const getDefaultSbtSvgImageClientSide = () => {
  const svgXml = `
    <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" rx="20" fill="url(#gradRepuFi)"/>
      <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" fill="white" font-weight="bold">RepuFi</text>
      <text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="white" font-weight="bold">VOUCH SBT</text>
      <defs>
        <linearGradient id="gradRepuFi" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(210, 90%, 50%);stop-opacity:1" />
          <stop offset="100%" style="stop-color:hsl(260, 70%, 60%);stop-opacity:1" />
        </linearGradient>
      </defs>
    </svg>
  `;
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svgXml)))}`;
  }
  return "";
};