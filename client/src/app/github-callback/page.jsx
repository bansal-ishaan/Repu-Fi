// app/github-callback/page.jsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Correct import for App Router
import Link from 'next/link';

export default function GitHubCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Processing GitHub Login...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    const receivedState = searchParams.get('state');
    const storedState = sessionStorage.getItem('github_oauth_state');
    sessionStorage.removeItem('github_oauth_state'); // Clean up state

    if (!code) {
      setError("Authorization code not found in URL.");
      setMessage("GitHub login failed or was cancelled.");
      return;
    }

    if (!receivedState || receivedState !== storedState) {
        setError("Invalid OAuth state. CSRF attack suspected or state mismatch.");
        setMessage("GitHub login failed due to security check.");
        return;
    }

    // ** IMPORTANT **
    // AT THIS POINT, YOU HAVE THE AUTHORIZATION `code`.
    // A BACKEND IS REQUIRED to securely exchange this `code` for an access token
    // using your GitHub OAuth App's Client ID AND CLIENT SECRET.
    // Then, with the access token, the backend would fetch user details from GitHub API.
    //
    // Since there's no backend in this setup, we cannot proceed securely.
    // We are just acknowledging the code was received.
    setMessage(`GitHub redirect successful. Authorization Code received. A backend is needed to securely use this code to get your GitHub username and link it to your wallet.`);
    console.log("Received GitHub authorization code:", code);

    // In a real app with a backend, you'd send this 'code' to your backend.
    // Your backend would then talk to GitHub.

    // For now, just for display:
    // Do NOT try to store the 'code' long-term or think it's an access token. It's not.

  }, []); // Run once on mount

  return (
    <div className="card text-center">
      <h1 className="text-xl font-semibold mb-3">GitHub Login Callback</h1>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <p className="text-slate-600 dark:text-slate-300 mb-4">{message}</p>
      <Link href="/" className="btn btn-primary">
        Go to Homepage
      </Link>
    </div>
  );
}