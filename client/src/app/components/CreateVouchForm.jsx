// app/(components)/CreateVouchForm.jsx
'use client';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, isAddress } from 'viem';
import { REPUFI_SBT_CONTRACT_ADDRESS, REPUFI_SBT_ABI } from '../../../lib/constants';
import { uploadJsonToIPFS } from '../../../lib/ipfsHelper';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea'; // Simple Textarea component (see below)
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function CreateVouchForm({ githubProfileData }) {
  const { address: connectedAddress } = useAccount();
  const { data: hash, error: writeError, isPending: isWritePending, writeContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: receiptError } = useWaitForTransactionReceipt({ hash });

  const [borrower, setBorrower] = useState('');
  const [amount, setAmount] = useState('');
  const [durationDays, setDurationDays] = useState('7');
  const [reason, setReason] = useState('');
  // Pre-fill backerRepStats if githubProfileData is available
  const [backerRepStats, setBackerRepStats] = useState('');

  const [formMessage, setFormMessage] = useState(null);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (githubProfileData && githubProfileData.username) {
      const stats = {
        githubUsername: githubProfileData.username,
        githubScore: githubProfileData.totalScore,
        publicRepos: githubProfileData.details.publicRepos,
        followers: githubProfileData.details.followers,
        totalStars: githubProfileData.details.totalStars,
      };
      setBackerRepStats(JSON.stringify(stats, null, 2));
    } else {
      setBackerRepStats(JSON.stringify({ githubUsername: "NOT_ANALYZED", githubScore: 0 }, null, 2));
    }
  }, [githubProfileData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormMessage(null);

    if (!connectedAddress) {
      setFormError('Please connect your wallet.');
      return;
    }
    if (!isAddress(borrower)) {
      setFormError('Invalid borrower address.');
      return;
    }
    if (borrower.toLowerCase() === connectedAddress.toLowerCase()) {
      setFormError('Borrower cannot be the same as the backer (you cannot vouch for yourself).');
      return;
    }
    if (parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
        setFormError('Stake amount must be a positive number.');
        return;
    }
    if (parseInt(durationDays) <= 0 || isNaN(parseInt(durationDays))) {
        setFormError('Duration must be a positive number of days.');
        return;
    }

    setFormMessage('Preparing vouch...');
    try {
      const stakeAmountWei = parseEther(amount);
      const durationSeconds = BigInt(parseInt(durationDays) * 24 * 60 * 60);

      setFormMessage('Uploading metadata to IPFS...');
      let parsedBackerRepStats = {};
      try {
        parsedBackerRepStats = JSON.parse(backerRepStats);
      } catch (parseErr) {
        setFormError("Backer reputation stats are not valid JSON.");
        setFormMessage(null);
        return;
      }

      const metadata = {
        name: `RepuFi Vouch: ${reason.substring(0,20)}... for ${borrower.substring(0,6)}...`,
        description: `A RepuFi SBT Vouch by Backer ${connectedAddress} for Borrower ${borrower}. Reason: ${reason}`,
        attributes: [
          { trait_type: "Vouch Reason", value: reason },
          { trait_type: "Stake Amount (PAS)", value: amount },
          { trait_type: "Duration (Days)", value: durationDays },
          { trait_type: "Backer", value: connectedAddress },
          { trait_type: "Borrower", value: borrower },
          ...Object.entries(parsedBackerRepStats).map(([key, value]) => ({
            trait_type: `Backer ${key.replace(/([A-Z])/g, ' $1').trim()}`, // Format key for display
            value: String(value) // Ensure value is string for NFT standards
          }))
        ],
        // You might add an image_url if you have a default vouch badge image
      };
      const metadataCID = await uploadJsonToIPFS(metadata);
      setFormMessage(`Metadata uploaded (CID: ${metadataCID.substring(0,10)}...). Submitting transaction...`);

      writeContract({
        address: REPUFI_SBT_CONTRACT_ADDRESS,
        abi: REPUFI_SBT_ABI,
        functionName: 'createVouch',
        args: [borrower, durationSeconds, metadataCID],
        value: stakeAmountWei,
      });

    } catch (err) {
      console.error('Vouch creation error:', err);
      setFormError(`Error: ${err.shortMessage || err.message || 'An unknown error occurred'}`);
      setFormMessage(null);
    }
  };

  useEffect(() => {
    if (isConfirmed) {
      setFormMessage('Vouch created successfully! Transaction confirmed.');
      setFormError(null);
      setBorrower(''); setAmount(''); setDurationDays('7'); setReason('');
      // Optionally reset backerRepStats or keep pre-filled if githubProfileData is stable
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


  if (!connectedAddress) return <p className="text-center text-slate-500 dark:text-slate-400">Please connect your wallet to create a vouch.</p>;
  if (!githubProfileData || githubProfileData.totalScore < 7) {
    return (
        <div className="card p-6 text-center">
            <h3 className="text-xl font-semibold mb-2">Vouching Locked</h3>
            <p className="text-slate-600 dark:text-slate-400">
                Your analyzed GitHub score must be 7 or higher to become a backer.
                Please analyze a GitHub profile with a sufficient score on the "Become a Backer" page.
            </p>
        </div>
    );
  }


  return (
    <div className="card p-6 animate-fadeIn mt-6">
      <div className="flex items-center justify-center gap-2 mb-4 text-green-600 dark:text-green-400">
        <CheckCircle2 size={24} />
        <h2 className="text-xl font-semibold">GitHub Profile Verified - Score: {githubProfileData.totalScore.toFixed(1)}</h2>
      </div>
      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">You are eligible to create a vouch for another user.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="borrower" className="block text-sm font-medium text-foreground mb-1">Borrower Address:</label>
          <Input type="text" id="borrower" value={borrower} onChange={(e) => setBorrower(e.target.value)} placeholder="0x..." required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="amount" className="block text-sm font-medium text-foreground mb-1">Stake Amount (PAS):</label>
                <Input type="number" id="amount" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 0.1" required />
            </div>
            <div>
                <label htmlFor="durationDays" className="block text-sm font-medium text-foreground mb-1">Duration (days):</label>
                <Input type="number" id="durationDays" value={durationDays} min="1" onChange={(e) => setDurationDays(e.target.value)} required />
            </div>
        </div>
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-foreground mb-1">Reason for Vouch:</label>
          <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g., Contribution to DAO, Project Collaboration" required />
        </div>
        <div>
          <label htmlFor="backerRepStats" className="block text-sm font-medium text-foreground mb-1">Your Reputation Stats (auto-filled from GitHub analysis, JSON):</label>
          <Textarea id="backerRepStats" value={backerRepStats} onChange={(e) => setBackerRepStats(e.target.value)} rows={5} required readOnly={!!githubProfileData} className={githubProfileData ? "bg-slate-100 dark:bg-slate-800" : ""}/>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">This data will be part of the public SBT metadata on IPFS.</p>
        </div>
        <Button type="submit" className="w-full btn-primary !py-3 !text-base" disabled={isWritePending || isConfirming}>
          {isWritePending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
          {isWritePending ? 'Submitting Vouch...' : isConfirming ? 'Confirming Transaction...' : 'Create Vouch & Stake PAS'}
        </Button>
      </form>
      {(formMessage && !formError) && <p className="mt-4 text-green-600 dark:text-green-400 text-center animate-fadeIn">{formMessage}</p>}
      {formError && <p className="mt-4 text-red-600 dark:text-red-400 text-center animate-fadeIn">{formError}</p>}
    </div>
  );
}