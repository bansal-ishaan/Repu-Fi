// app/become-backer/page.jsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseEther, formatEther, isAddress } from 'viem'; // Added isAddress
import {
    REPUFI_SBT_CONTRACT_ADDRESS,
    REPUFI_SBT_ABI,
    MIN_GITHUB_SCORE_CONTRACT
} from '../../../lib/constants'; // Adjust path
import { uploadJsonToIPFS, fetchFromIPFS } from '../../../lib/ipfsHelper'; // Adjust path
import { Button } from '../components/ui/Button';   // Adjust path
import { Input } from '../components/ui/Input';     // Adjust path
import { Textarea } from '../components/ui/Textarea'; // Adjust path
import { Loader2, ShieldAlert, LockKeyhole, CheckCircle2, UserPlus, FileText, Clock, ExternalLink, Eye, Users } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';


// Minimal Modal (same as before)
const Modal = ({ isOpen, onClose, title, children }) => { /* ... */ };
// getDefaultSbtSvgImageClientSide (same as before)
const getDefaultSbtSvgImageClientSide = () => { /* ... */ };


export default function MinimalBecomeBackerPage() {
  const { address: connectedAddress, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [manualBackerScore, setManualBackerScore] = useState('');
  const [backerScoreForContract, setBackerScoreForContract] = useState(0);
  const [isEligibleBacker, setIsEligibleBacker] = useState(false);
  const [githubUsernameForMetadata, setGithubUsernameForMetadata] = useState('');

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


  const handleScoreSubmit = () => {
    const score = parseInt(manualBackerScore);
    if (!isNaN(score) && score >= 0) {
        setBackerScoreForContract(score);
        setIsEligibleBacker(score >= MIN_GITHUB_SCORE_CONTRACT);
    } else {
        alert("Please enter a valid non-negative number for the score.");
        setIsEligibleBacker(false);
        setBackerScoreForContract(0); // Reset score if input is invalid
    }
  };

  const { data: requestCounterData, refetch: refetchRequestCounter } = useReadContract({ /* ... */ });
  const fetchAllOpenReputationRequests = useCallback(async () => { /* ... same as before ... */ }, [publicClient, requestCounterData, isEligibleBacker]);

  useEffect(() => {
    if (isConnected && isEligibleBacker && requestCounterData !== undefined) {
        fetchAllOpenReputationRequests();
    } else if (!isEligibleBacker) {
        setReputationRequests([]); // Clear requests if not eligible
    }
  }, [isConnected, isEligibleBacker, requestCounterData, fetchAllOpenReputationRequests]);


  const handleOpenVouchModal = (request) => { /* ... same as before ... */ };

  const handleVouchForRequestSubmit = async (e) => {
    e.preventDefault();
    setVouchFormError(null); setVouchFormMessage(null); resetVouchContract();

    // --- Rigorous Input Validation ---
    if (!selectedRequest || !selectedRequest.borrower || !isAddress(selectedRequest.borrower)) { // Check selectedRequest and borrower
        setVouchFormError("Invalid or no reputation request selected.");
        console.error("Vouch submit error: selectedRequest or borrower is invalid", selectedRequest);
        return;
    }
    if (!connectedAddress) {
        setVouchFormError("Wallet not connected."); return;
    }
    if (!backerStakeAmount || !backerStakeAmount.trim()) { // Check if stake amount is empty
        setVouchFormError('Your stake amount is required.'); return;
    }
    const parsedStakeAmount = parseFloat(backerStakeAmount);
    if (isNaN(parsedStakeAmount) || parsedStakeAmount <= 0) {
        setVouchFormError('Your stake amount must be a positive number.'); return;
    }
    if (selectedRequest.borrower.toLowerCase() === connectedAddress.toLowerCase()) {
        setVouchFormError("You cannot vouch for yourself."); return;
    }
    // --- End Validation ---

    setVouchFormMessage("Preparing to vouch...");
    try {
        // Convert PAS string to Wei BigInt *after* validation
        const stakeInWei = parseEther(backerStakeAmount);
        if (typeof stakeInWei === 'undefined') { // Should not happen if parseEther succeeds
            setVouchFormError("Failed to parse stake amount into Wei.");
            console.error("stakeInWei is undefined after parseEther with input:", backerStakeAmount);
            setVouchFormMessage(null);
            return;
        }


        setVouchFormMessage("Uploading Vouch SBT metadata to IPFS...");
        const vouchMetadata = {
            name: `RepuFi Vouch: ${githubUsernameForMetadata || connectedAddress.substring(0,6)} for ${selectedRequest.borrower.substring(0,8)}`,
            description: `Vouch by Backer ${connectedAddress} (Manual Score: ${backerScoreForContract}, GitHub: ${githubUsernameForMetadata || 'N/A'}) for Borrower ${selectedRequest.borrower}, fulfilling Request #${selectedRequest.id}. Reason: ${vouchReason}`,
            image: getDefaultSbtSvgImageClientSide(),
            attributes: [
              { trait_type: "Vouch Type", value: "Fulfilling Reputation Request" },
              { trait_type: "Original Request ID", value: selectedRequest.id.toString() },
              { trait_type: "Backer Address", value: connectedAddress },
              { trait_type: "Backer Manual GitHub Username", value: githubUsernameForMetadata || "Not Provided" },
              { trait_type: "Backer Manual Score (for eligibility)", value: backerScoreForContract.toString() }, // Display score
              { trait_type: "Borrower Address", value: selectedRequest.borrower },
              // Ensure selectedRequest.githubScore is a number before calling .toString() or Number()
              { trait_type: "Borrower GitHub Score (at request time)", value: (selectedRequest.githubScore !== undefined && selectedRequest.githubScore !== null) ? Number(selectedRequest.githubScore).toString() : "N/A" },
              { trait_type: "Stake Amount (PAS)", value: backerStakeAmount },
              // Ensure selectedRequest.duration is valid
              { trait_type: "Vouch Duration (Days)", value: (selectedRequest.duration !== undefined && selectedRequest.duration !== null) ? (Number(selectedRequest.duration) / (24*60*60)).toFixed(0) : "N/A" },
              { trait_type: "Backer's Reason/Note", value: vouchReason },
            ],
        };
        const metadataCIDForVouchSBT = await uploadJsonToIPFS(vouchMetadata);
        if (!metadataCIDForVouchSBT) {
            setVouchFormError("Failed to upload metadata to IPFS. Cannot proceed.");
            setVouchFormMessage(null);
            return;
        }

        setVouchFormMessage(`Vouch metadata uploaded. Submitting transaction...`);

        // Prepare arguments for the contract
        const borrowerArg = selectedRequest.borrower; // Already checked if it's a valid address
        const metadataCIDArg = metadataCIDForVouchSBT; // String

        console.log("Calling vouchForRequest with args:", {
            borrower: borrowerArg,
            metadataCID: metadataCIDArg,
            value: stakeInWei.toString() // This is a BigInt
        });

        executeVouchForRequest({
            address: REPUFI_SBT_CONTRACT_ADDRESS,
            abi: REPUFI_SBT_ABI,
            functionName: 'vouchForRequest',
            args: [borrowerArg, metadataCIDArg], // Ensure these are defined and correct type
            value: stakeInWei, // This must be a BigInt (Wei)
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


  if (!isConnected) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto my-10">
        <LockKeyhole className="h-16 w-16 mx-auto text-primary opacity-70 mb-6" />
        <h2 className="text-2xl font-semibold text-foreground mb-3">Connect Wallet</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">Connect your wallet to become a backer.</p>
        <div className="flex justify-center"><ConnectButton /></div>
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

      {/* Manual Score Input Section (same as before) */}
      <div className="card p-6 shadow-lg max-w-md mx-auto">
        {/* ... Score input and eligibility display ... */}
      </div>


      {isEligibleBacker && (
        <section className="card p-6 sm:p-8 animate-fadeIn shadow-xl">
            {/* ... Display Open Reputation Requests (same as before) ... */}
            {/* Make sure req.borrowerStake is cast to BigInt for formatEther if needed */}
            {/* e.g. formatEther(BigInt(req.borrowerStake ?? 0)) in the map */}
        </section>
      )}

      <Modal isOpen={!!selectedRequest} onClose={() => setSelectedRequest(null)} title={`Vouch for Request #${selectedRequest?.id}`}>
            {selectedRequest && (
                <form onSubmit={handleVouchForRequestSubmit} className="space-y-4">
                    {/* ... Modal form (same as before) ... */}
                    {/* Ensure selectedRequest.githubScore and selectedRequest.duration are handled if they could be undefined */}
                    <p className="text-xs text-slate-500 dark:text-slate-400">Requester's Score: {selectedRequest.githubScore !== undefined ? Number(selectedRequest.githubScore).toString() : "N/A"}</p>
                    {/* ... */}
                </form>
            )}
        </Modal>
    </div>
  );
}