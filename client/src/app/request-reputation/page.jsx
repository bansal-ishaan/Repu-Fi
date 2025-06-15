// app/request-reputation/page.jsx
"use client";
import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther } from "viem";
import {
  REPUFI_SBT_CONTRACT_ADDRESS,
  REPUFI_SBT_ABI,
  REPUTATION_REQUEST_FEE_ETH_STRING, // Should be "0.001"
  MIN_GITHUB_SCORE_CONTRACT, // Should be 70 (matching contract MIN_GITHUB_SCORE)
} from "../../../lib/constants"; // Adjust path if needed
import { uploadJsonToIPFS } from "../../../lib/ipfsHelper"; // Adjust path
import { Button } from "../components/ui/Button"; // Adjust path
import { Input } from "../components/ui/Input"; // Adjust path
import { Textarea } from "../components/ui/Textarea"; // Adjust path
import {
  Loader2,
  UploadCloud,
  AlertTriangle,
  CheckCircle,
  LockKeyhole,
  FileSignature,
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit"; // For prompting connection

export default function MinimalRequestReputationPage() {
  const { address: connectedAddress, isConnected } = useAccount();

  const {
    data: hash,
    error: writeError,
    isPending: isWritePending,
    writeContract,
    reset: resetWriteContract,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

  // Form State
  const [requestType, setRequestType] = useState("Project Funding");
  const [description, setDescription] = useState(
    "Need vouch for grant application."
  );
  const [durationDays, setDurationDays] = useState("15");
  const [manualGitHubUsername, setManualGitHubUsername] = useState(""); // For metadata
  const [dummyGitHubScore, setDummyGitHubScore] = useState(""); // User inputs this (e.g., "65" for a score of 6.5)

  const [formMessage, setFormMessage] = useState(null);
  const [formError, setFormError] = useState(null);

  const feeInWei = parseEther(REPUTATION_REQUEST_FEE_ETH_STRING); // From "0.001" ETH string
  const displayFeeString = `${REPUTATION_REQUEST_FEE_ETH_STRING} PAS`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormMessage(null);
    resetWriteContract(); // Clear previous transaction states

    if (!isConnected || !connectedAddress) {
      setFormError("Please connect your wallet to submit a request.");
      return;
    }
    if (!requestType.trim()) {
      setFormError("Request type is required.");
      return;
    }
    if (!description.trim()) {
      setFormError("Description is required.");
      return;
    }

    const parsedDurationDays = parseInt(durationDays);
    if (isNaN(parsedDurationDays) || parsedDurationDays <= 0) {
      setFormError("Duration must be a positive number of days.");
      return;
    }

    const parsedDummyScore = parseInt(dummyGitHubScore);
    if (isNaN(parsedDummyScore) || parsedDummyScore < 0) {
      setFormError("Please enter a valid non-negative dummy GitHub score.");
      return;
    }
    // Contract expects score (e.g. 65 if MIN_GITHUB_SCORE is 70 for a 7.0 threshold)
    // The contract check is `borrowerGithubScore >= MIN_GITHUB_SCORE` (e.g. `65 >= 70` which is false, so it passes)
    if (parsedDummyScore >= MIN_GITHUB_SCORE_CONTRACT) {
      setFormError(
        `Dummy score (${parsedDummyScore}) must be less than contract MIN_GITHUB_SCORE (${MIN_GITHUB_SCORE_CONTRACT}). This profile would be eligible as a backer.`
      );
      return;
    }

    setFormMessage("Preparing request...");
    try {
      const durationInSeconds = BigInt(parsedDurationDays * 24 * 60 * 60);
      const githubScoreForContract = BigInt(parsedDummyScore); // Directly use the dummy score as uint256

      setFormMessage("Uploading request metadata to IPFS...");
      const requestMetadata = {
        name: `Reputation Vouch Request: ${requestType}`,
        description: `User ${connectedAddress} (Claimed GitHub: ${
          manualGitHubUsername || "N/A"
        }, Provided Score: ${parsedDummyScore}) requests a vouch for "${requestType}". Reason: ${description}`,
        attributes: [
          { trait_type: "Requester Address", value: connectedAddress },
          {
            trait_type: "Claimed GitHub Username",
            value: manualGitHubUsername || "Not Provided",
          },
          {
            trait_type: "Provided GitHub Score (for contract)",
            value: parsedDummyScore.toString(),
          },
          { trait_type: "Request Type", value: requestType },
          {
            trait_type: "Requested Duration",
            value: `${parsedDurationDays} days`,
          },
        ],
      };
      const metadataCID = await uploadJsonToIPFS(requestMetadata);
      setFormMessage(
        `Metadata uploaded. Submitting transaction (Fee: ${displayFeeString})...`
      );

      console.log("Calling createReputationRequest with args:", {
        requestType,
        description,
        durationInSeconds: durationInSeconds.toString(),
        metadataCID,
        borrowerGithubScore: githubScoreForContract.toString(), // This is the uint256 score for contract
        feeInWei: feeInWei.toString(),
      });

      writeContract({
        address: REPUFI_SBT_CONTRACT_ADDRESS,
        abi: REPUFI_SBT_ABI,
        functionName: "createReputationRequest",
        args: [
          requestType,
          description,
          durationInSeconds,
          metadataCID,
          githubScoreForContract, // Pass the dummy score directly
        ],
        value: feeInWei,
      });
    } catch (err) {
      console.error("Request creation error:", err);
      setFormError(
        `Error: ${err.message || "An error occurred during preparation."}`
      );
      setFormMessage(null);
    }
  };

  useEffect(() => {
    if (isConfirmed) {
      setFormMessage(
        "Reputation request submitted successfully! Transaction confirmed."
      );
      setFormError(null);
      // Optionally reset form
      // setRequestType('Project Funding'); setDescription('Need vouch...'); setDurationDays('15');
      // setManualGitHubUsername(''); setDummyGitHubScore('');
    }
    if (writeError) {
      setFormError(
        `Transaction Error: ${writeError.shortMessage || writeError.message}`
      );
      setFormMessage(null);
    }
    if (receiptError) {
      setFormError(
        `Confirmation Error: ${
          receiptError.shortMessage || receiptError.message
        }`
      );
      setFormMessage(null);
    }
  }, [isConfirmed, writeError, receiptError]);

  if (!isConnected) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto my-10 animate-fadeIn">
        <LockKeyhole className="h-16 w-16 mx-auto text-primary opacity-70 mb-6" />
        <h2 className="text-2xl font-semibold text-foreground mb-3">
          Connect Your Wallet
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Please connect your wallet to submit a reputation request.
        </p>
        <div className="flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-2xl mx-auto pb-12">
      <header className="text-center pt-4">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
          Request a Vouch (Minimal Test)
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">
          Submit a request if your (dummy) GitHub score is below{" "}
          {MIN_GITHUB_SCORE_CONTRACT / 10}. Fee: {displayFeeString}.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          (Note: GitHub username is for metadata only on this test page. Score
          is manually entered.)
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="card p-6 sm:p-8 space-y-6 animate-fadeIn shadow-xl"
      >
        <div className="text-center">
          <FileSignature className="h-10 w-10 mx-auto text-primary mb-2" />
          <h2 className="text-2xl font-semibold text-foreground">
            Submit Your Request
          </h2>
        </div>

        <div>
          <label
            htmlFor="manualGitHubUsername"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            GitHub Username (for metadata):
          </label>
          <Input
            type="text"
            id="manualGitHubUsername"
            value={manualGitHubUsername}
            onChange={(e) => setManualGitHubUsername(e.target.value)}
            placeholder="e.g., your-test-github-id"
          />
        </div>

        <div>
          <label
            htmlFor="dummyGitHubScore"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Dummy GitHub Score (0-100, e.g., 65 for a 6.5 actual score){" "}
            <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            id="dummyGitHubScore"
            value={dummyGitHubScore}
            onChange={(e) => setDummyGitHubScore(e.target.value)}
            placeholder={`Enter a score < ${MIN_GITHUB_SCORE_CONTRACT}`}
            required
          />
          
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Contract's `MIN_GITHUB_SCORE` is {MIN_GITHUB_SCORE_CONTRACT}. This
            input will be sent as `borrowerGithubScore`. To pass the contract
            check `borrowerGithubScore ≥ MIN_GITHUB_SCORE`, you need to enter a
            value less than {MIN_GITHUB_SCORE_CONTRACT}.
          </p>
        </div>

        <div>
          <label
            htmlFor="requestType"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Request Type <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            id="requestType"
            value={requestType}
            onChange={(e) => setRequestType(e.target.value)}
            placeholder="e.g., Access to Grant Platform"
            required
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Brief Description of Need <span className="text-red-500">*</span>
          </label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Explain why you need this vouch..."
            required
          />
        </div>

        <div>
          <label
            htmlFor="durationDaysReq"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Requested Vouch Duration (days){" "}
            <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            id="durationDaysReq"
            value={durationDays}
            min="1"
            onChange={(e) => setDurationDays(e.target.value)}
            required
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Contract max duration is 15 days.
          </p>
        </div>

        <Button
          type="submit"
          className="w-full btn-primary !py-3 !text-base"
          disabled={isWritePending || isConfirming}
        >
          {isWritePending ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <UploadCloud size={20} className="mr-2" />
          )}
          {isWritePending
            ? "Submitting..."
            : isConfirming
            ? "Confirming..."
            : `Submit Request & Pay ${displayFeeString}`}
        </Button>
        {formMessage && !formError && (
          <p className="mt-4 text-green-600 dark:text-green-400 text-center animate-fadeIn flex items-center justify-center gap-2">
            <CheckCircle size={18} />
            {formMessage}
          </p>
        )}
        {formError && (
          <p className="mt-4 text-red-600 dark:text-red-400 text-center animate-fadeIn flex items-center justify-center gap-2">
            <AlertTriangle size={18} />
            {formError}
          </p>
        )}
      </form>
    </div>
  );
}
