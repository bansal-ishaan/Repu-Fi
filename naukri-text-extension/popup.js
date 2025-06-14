// ==================================================================
// == 🚨 CONFIGURATION - YOU MUST EDIT THIS SECTION 🚨 ==
// ==================================================================

// 1. 🚨 PASTE YOUR SEPOLIA RPC URL HERE 🚨
// Get this from Infura or Alchemy after creating a free account.
const RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/P1SBrnyMveVk1eIjhPKhw';

// 2. Your deployed contract address (already filled in for you)
const CONTRACT_ADDRESS = '0xff8C7b4F32b9105B638e69B0CB82C6aA122b27F2';

// 3. The minimal ABI for your contract (already filled in for you)
const CONTRACT_ABI = [
  {"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"getOwnedSBTs","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getVouchDetails","outputs":[{"components":[{"internalType":"address","name":"backer","type":"address"},{"internalType":"address","name":"borrower","type":"address"},{"internalType":"uint128","name":"amount","type":"uint128"},{"internalType":"uint64","name":"expiry","type":"uint64"},{"internalType":"bool","name":"withdrawn","type":"bool"},{"internalType":"uint256","name":"pairedTokenId","type":"uint256"},{"internalType":"bool","name":"forceExpired","type":"bool"},{"internalType":"string","name":"metadataCID","type":"string"}],"internalType":"struct RepuFiSBT.Vouch","name":"","type":"tuple"}],"stateMutability":"view","type":"function"}
];

// ==================================================================
// == END OF CONFIGURATION ==
// ==================================================================


// --- Get DOM elements ---
const walletInput = document.getElementById('walletAddress');
const fetchButton = document.getElementById('fetchButton');
const nftGallery = document.getElementById('nft-gallery');

// --- Setup Blockchain Connection ---
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', loadSavedAddress);
fetchButton.addEventListener('click', handleFetchClick);

// --- Main Functions ---

function loadSavedAddress() {
    chrome.storage.sync.get(['walletAddress'], (result) => {
        if (result.walletAddress) {
            walletInput.value = result.walletAddress;
            fetchSBTData(result.walletAddress);
        }
    });
}

function handleFetchClick() {
    const walletAddress = walletInput.value.trim();
    if (ethers.utils.isAddress(walletAddress)) {
        chrome.storage.sync.set({ walletAddress: walletAddress });
        fetchSBTData(walletAddress);
    } else {
        displayMessage('Error: Please enter a valid wallet address.');
    }
}

async function fetchSBTData(address) {
    displayMessage('Loading... Finding your SBTs...');
    try {
        // 1. Get all token IDs owned by the user using your custom function
        const tokenIds = await contract.getOwnedSBTs(address);

        if (tokenIds.length === 0) {
            displayMessage('No RepuFi SBTs found for this address.');
            return;
        }

        displayMessage(`Found ${tokenIds.length} SBT(s). Fetching details...`);

        // 2. Fetch details for all tokens in parallel
        const tokenDataPromises = tokenIds.map(async (tokenId) => {
            // Fetch metadata URI and on-chain vouch details simultaneously
            const [uri, vouchDetails] = await Promise.all([
                contract.tokenURI(tokenId),
                contract.getVouchDetails(tokenId)
            ]);
            
            // Fetch the actual metadata from the IPFS URI
            const metadataURL = formatIpfsUrl(uri);
            const metadataResponse = await fetch(metadataURL);
            const metadata = await metadataResponse.json();

            return { tokenId, metadata, vouchDetails };
        });

        const allTokenData = await Promise.all(tokenDataPromises);
        displayNfts(allTokenData);

    } catch (error) {
        console.error('Error fetching SBT data:', error);
        displayMessage(`An error occurred: ${error.message}`);
    }
}

// --- Display Functions ---

function displayNfts(tokens) {
    nftGallery.innerHTML = ''; // Clear previous content
    tokens.forEach(token => {
        const card = createNftCard(token);
        nftGallery.appendChild(card);
    });
}

function createNftCard({ tokenId, metadata, vouchDetails }) {
    const card = document.createElement('div');
    card.className = 'nft-card';

    const imageUrl = formatIpfsUrl(metadata.image);

    // Shorten addresses for display
    const shortBacker = `${vouchDetails.backer.substring(0, 6)}...${vouchDetails.backer.substring(vouchDetails.backer.length - 4)}`;
    const shortBorrower = `${vouchDetails.borrower.substring(0, 6)}...${vouchDetails.borrower.substring(vouchDetails.borrower.length - 4)}`;

    card.innerHTML = `
        <img src="${imageUrl}" class="nft-card-image" alt="${metadata.name}">
        <h2 class="nft-card-name">${metadata.name} (ID: ${tokenId.toString()})</h2>
        
        <!-- Metadata Attributes -->
        <div class="details-section">
            <h3 class="details-title">Attributes</h3>
            <div class="attributes-grid">
                ${metadata.attributes.map(attr => `
                    <div class="attribute">
                        <div class="trait-type">${attr.trait_type}</div>
                        <div class="trait-value">${attr.value}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- On-Chain Vouch Details -->
        <div class="details-section">
            <h3 class="details-title">On-Chain Vouch Details</h3>
            <div class="onchain-grid">
                <div class="onchain-detail">
                    <div class="detail-label">Backer</div>
                    <div class="detail-value" title="${vouchDetails.backer}">${shortBacker}</div>
                </div>
                <div class="onchain-detail">
                    <div class="detail-label">Borrower</div>
                    <div class="detail-value" title="${vouchDetails.borrower}">${shortBorrower}</div>
                </div>
                <div class="onchain-detail">
                    <div class="detail-label">Amount Staked</div>
                    <div class="detail-value">${ethers.utils.formatEther(vouchDetails.amount)} ETH</div>
                </div>
                <div class="onchain-detail">
                    <div class="detail-label">Expires</div>
                    <div class="detail-value">${formatTimestamp(vouchDetails.expiry)}</div>
                </div>
            </div>
        </div>
    `;
    return card;
}

function displayMessage(text) {
    nftGallery.innerHTML = `<p class="notice">${text}</p>`;
}

// --- Helper Functions ---

function formatIpfsUrl(url) {
    if (url.startsWith('ipfs://')) {
        const cid = url.substring(7);
        return `https://ipfs.io/ipfs/${cid}`;
    }
    return url;
}

function formatTimestamp(unixTimestamp) {
    // Solidity timestamp is in seconds, JavaScript Date needs milliseconds
    const date = new Date(unixTimestamp * 1000);
    return date.toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' });
}