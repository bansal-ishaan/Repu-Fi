// app/request-reputation/page.jsx
'use client';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, isAddress } from 'viem';
import { REPUFI_SBT_CONTRACT_ADDRESS, REPUFI_SBT_ABI  } from '../../../lib/constants'; // or config.js
import { uploadJsonToIPFS } from '../../../lib/ipfsHelper';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Loader2, AlertTriangle, LockKeyhole } from 'lucide-react';
import GitHubAnalyzerClient from '../components/GitHubAnalyzerClient'; // To get score
import Link from 'next/link';

const MIN_GITHUB_SCORE_CONTRACT = 7; // Minimum score to request reputation
const REPUTATION_REQUEST_FEE_PAS = 0.0001; // Fee in PAS for reputation request

export default function RequestReputationPage() {
  const { address: connectedAddress, isConnected } = useAccount();
  const { data: hash, error: writeError, isPending: isWritePending, writeContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: receiptError } = useWaitForTransactionReceipt({ hash });

  const [requestType, setRequestType] = useState('DAO Contributor Role');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState('15'); // Default to maxDuration or less
  const [formMessage, setFormMessage] = useState(null);
  const [formError, setFormError] = useState(null);
  const [githubAnalysisData, setGithubAnalysisData] = useState(null);

  const feeInWei = parseEther(REPUTATION_REQUEST_FEE_PAS.toString());

  const handleAnalysisComplete = (data) => {
    setGithubAnalysisData(data);
    if (data && data.totalScore >= MIN_GITHUB_SCORE_CONTRACT) {
        setFormError(`Your GitHub score is ${data.totalScore.toFixed(1)}, which is high enough to directly become a backer. You might not need to request reputation.`);
    } else if (data) {
        setFormError(null); // Clear previous errors if score is low
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormMessage(null);

    if (!isConnected || !connectedAddress) {
      setFormError('Please connect your wallet.');
      return;
    }
    if (!githubAnalysisData || githubAnalysisData.username === "NOT_ANALYZED") {
        setFormError('Please analyze your GitHub profile first to determine your score.');
        return;
    }
    if (githubAnalysisData.totalScore >= MIN_GITHUB_SCORE_CONTRACT) {
        setFormError(`Your GitHub score (${githubAnalysisData.totalScore.toFixed(1)}) is high enough. You don't need to request reputation. Consider becoming a backer directly.`);
        return;
    }
    if (parseInt(durationDays) <= 0 || isNaN(parseInt(durationDays))) {
        setFormError('Duration must be a positive number of days.');
        return;
    }


    setFormMessage('Preparing reputation request...');
    try {
      const durationSeconds = BigInt(parseInt(durationDays) * 24 * 60 * 60);

      setFormMessage('Uploading request metadata to IPFS...');
      const requestMetadata = {
        name: `Reputation Request by ${connectedAddress.substring(0,6)}...`,
        description: `Type: ${requestType}. Reason: ${description}`,
        attributes: [
          { trait_type: "Request Type", value: requestType },
          { trait_type: "Description", value: description },
          { trait_type: "Requested Duration (Days)", value: durationDays },
          { trait_type: "Requester GitHub Score", value: githubAnalysisData.totalScore.toFixed(1) },
          { trait_type: "Requester GitHub Username", value: githubAnalysisData.username },
        ],
      };
      const metadataCID = await uploadJsonToIPFS(requestMetadata);
      setFormMessage(`Metadata uploaded. Submitting request transaction (Fee: ${REPUTATION_REQUEST_FEE_PAS} PAS)...`);

      writeContract({
        address: REPUFI_SBT_CONTRACT_ADDRESS,
        abi: REPUFI_SBT_ABI,
        functionName: 'createReputationRequest',
        args: [
            requestType,
            description,
            durationSeconds,
            metadataCID,
            BigInt(Math.floor(githubAnalysisData.totalScore * 10)) // Pass score * 10 as uint, or adjust contract
        ],
        value: feeInWei,
      });

    } catch (err) {
      console.error('Request creation error:', err);
      setFormError(`Error: ${err.shortMessage || err.message || 'An unknown error occurred'}`);
      setFormMessage(null);
    }
  };

  useEffect(() => {
    if (isConfirmed) {
      setFormMessage('Reputation request submitted successfully!');
      setFormError(null);
      // Reset form
      setRequestType('DAO Contributor Role'); setDescription(''); setDurationDays('15');
    }
     if (writeError) {
        setFormError(`Transaction Error: ${writeError.shortMessage || writeError.message}`);
        setFormMessage(null);
    }
    if (receiptError) {
        setFormError(`Confirmation Error: ${receiptError.shortMessage || receiptError.message}`);
        setFormMessage(null);
    }
  }, [isConfirmed, writeError, receiptError]);

  if (!isConnected) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto">
        <LockKeyhole className="h-12 w-12 mx-auto text-primary mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Connect Wallet</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Please connect your wallet to request reputation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Request Reputation</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">
          If your GitHub score is below {MIN_GITHUB_SCORE_CONTRACT}, you can submit a request for a backer to vouch for you.
          A fee of {REPUTATION_REQUEST_FEE_PAS} PAS is required.
        </p>
      </div>

      <GitHubAnalyzerClient onAnalysisComplete={handleAnalysisComplete} />

      {githubAnalysisData && githubAnalysisData.totalScore >= MIN_GITHUB_SCORE_CONTRACT && (
        <div className="card p-6 text-center border-l-4 border-green-500">
            <h3 className="text-xl font-semibold text-green-700 dark:text-green-400">Good News!</h3>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
                Your GitHub score is {githubAnalysisData.totalScore.toFixed(1)}, which is {MIN_GITHUB_SCORE_CONTRACT} or higher.
                You are eligible to <Link href="/become-backer" className="text-primary hover:underline font-medium">become a backer</Link> directly.
            </p>
        </div>
      )}

      {(!githubAnalysisData || githubAnalysisData.totalScore < MIN_GITHUB_SCORE_CONTRACT) && (
        <form onSubmit={handleSubmit} className="card p-6 space-y-5 animate-fadeIn">
            {githubAnalysisData && (
                <p className="text-sm text-center text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-700/20 p-3 rounded-md">
                    Your GitHub score is {githubAnalysisData.totalScore.toFixed(1)}. You can proceed to request a vouch.
                </p>
            )}
            {!githubAnalysisData && (
                 <p className="text-sm text-center text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-3 rounded-md">
                    Please analyze your GitHub profile above to determine your score before requesting.
                </p>
            )}
          <div>
            <label htmlFor="requestType" className="block text-sm font-medium text-foreground mb-1">Request Type:</label>
            <Input type="text" id="requestType" value={requestType} onChange={(e) => setRequestType(e.target.value)} placeholder="e.g., Access to Grant Platform" required disabled={!githubAnalysisData} />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">Brief Description of Need:</label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Explain why you need this vouch..." required disabled={!githubAnalysisData}/>
          </div>
          <div>
            <label htmlFor="durationDaysReq" className="block text-sm font-medium text-foreground mb-1">Requested Vouch Duration (days):</label>
            <Input type="number" id="durationDaysReq" value={durationDays} min="1" onChange={(e) => setDurationDays(e.target.value)} required disabled={!githubAnalysisData}/>
          </div>

          <Button type="submit" className="w-full btn-primary !py-3 !text-base" disabled={isWritePending || isConfirming || !githubAnalysisData || githubAnalysisData.totalScore >= MIN_GITHUB_SCORE_CONTRACT}>
            {isWritePending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            {isWritePending ? 'Submitting Request...' : isConfirming ? 'Confirming Transaction...' : `Submit Request & Pay ${REPUTATION_REQUEST_FEE_PAS} PAS Fee`}
          </Button>
          {(formMessage && !formError) && <p className="mt-4 text-green-600 dark:text-green-400 text-center animate-fadeIn">{formMessage}</p>}
          {formError && <p className="mt-4 text-red-600 dark:text-red-400 text-center animate-fadeIn">{formError}</p>}
        </form>
      )}
    </div>
  );
}