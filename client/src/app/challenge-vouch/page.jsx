// app/challenge-vouch/page.jsx
'use client';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { REPUFI_SBT_CONTRACT_ADDRESS, REPUFI_SBT_ABI } from '../../../lib/constants'; // or config.js
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Loader2, ShieldQuestion, LockKeyhole } from 'lucide-react';

const CHALLENGE_STAKE_PAS = 15; 

export default function ChallengeVouchPage() {
  const { address: connectedAddress, isConnected } = useAccount();
  const { data: hash, error: writeError, isPending: isWritePending, writeContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: receiptError } = useWaitForTransactionReceipt({ hash });

  const [vouchTokenId, setVouchTokenId] = useState('');
  const [challengeReason, setChallengeReason] = useState('');
  const [formMessage, setFormMessage] = useState(null);
  const [formError, setFormError] = useState(null);

  const challengeStakeInWei = parseEther(CHALLENGE_STAKE_PAS.toString());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormMessage(null);

    if (!isConnected || !connectedAddress) {
      setFormError('Please connect your wallet.');
      return;
    }
    if (!vouchTokenId.trim() || isNaN(parseInt(vouchTokenId)) || parseInt(vouchTokenId) <=0 ) {
        setFormError('Please enter a valid Vouch Token ID.');
        return;
    }
    if (!challengeReason.trim()) {
        setFormError('Please provide a reason for the challenge.');
        return;
    }

    setFormMessage(`Preparing challenge for Vouch SBT #${vouchTokenId}...`);
    try {
      setFormMessage(`Submitting challenge transaction (Stake: ${CHALLENGE_STAKE_PAS} PAS)...`);
      writeContract({
        address: REPUFI_SBT_CONTRACT_ADDRESS,
        abi: REPUFI_SBT_ABI,
        functionName: 'createChallenge',
        args: [BigInt(vouchTokenId), challengeReason],
        value: challengeStakeInWei,
      });

    } catch (err) {
      console.error('Challenge creation error:', err);
      setFormError(`Error: ${err.shortMessage || err.message || 'An unknown error occurred'}`);
      setFormMessage(null);
    }
  };

  useEffect(() => {
    if (isConfirmed) {
      setFormMessage('Challenge submitted successfully! Transaction confirmed.');
      setFormError(null);
      setVouchTokenId(''); setChallengeReason('');
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
          Connect your wallet to challenge a vouch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3 flex items-center gap-3">
            <ShieldQuestion className="h-10 w-10 text-orange-500" /> Challenge a Vouch
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">
          If you believe a vouch was made improperly or the borrower has violated terms, you can challenge it by staking {CHALLENGE_STAKE_PAS} PAS.
          If your challenge is successful, your stake is returned, and you may receive a portion of the backer's slashed stake.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5 animate-fadeIn">
        <div>
          <label htmlFor="vouchTokenId" className="block text-sm font-medium text-foreground mb-1">Vouch SBT Token ID to Challenge:</label>
          <Input type="number" id="vouchTokenId" value={vouchTokenId} onChange={(e) => setVouchTokenId(e.target.value)} placeholder="Enter Token ID" required />
        </div>
        <div>
          <label htmlFor="challengeReason" className="block text-sm font-medium text-foreground mb-1">Reason for Challenge:</label>
          <Textarea id="challengeReason" value={challengeReason} onChange={(e) => setChallengeReason(e.target.value)} rows={4} placeholder="Clearly explain why this vouch is being challenged..." required />
        </div>

        <Button type="submit" className="w-full btn-danger bg-orange-500 hover:bg-orange-600 !py-3 !text-base" disabled={isWritePending || isConfirming}>
          {isWritePending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
          {isWritePending ? 'Submitting Challenge...' : isConfirming ? 'Confirming Transaction...' : `Submit Challenge & Stake ${CHALLENGE_STAKE_PAS} PAS`}
        </Button>
        {(formMessage && !formError) && <p className="mt-4 text-green-600 dark:text-green-400 text-center animate-fadeIn">{formMessage}</p>}
        {formError && <p className="mt-4 text-red-600 dark:text-red-400 text-center animate-fadeIn">{formError}</p>}
      </form>
    </div>
  );
}