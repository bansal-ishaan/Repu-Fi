# 💡 RepuFi – Rent-a-Reputation

A decentralized system where trusted users can vouch for others by staking tokens, creating an on-chain reputation lending market, powered by GitHub insights and built on the PassetHub Testnet.

## 🚀 Live Demo

🔗 **Live Application:** [**Click here**](https://repufi.vercel.app)


## 🧩 Core Flow

### 1. Two Roles

- 🧑‍🎓 **Borrower**  
  A new user with low or no on-chain reputation.

- 🧔‍♂ **Backer (Vouch-er)**  
  A trusted user with provable rep on platforms like Gitcoin, Lens, GitHub, etc.


### 2. The Vouch Flow

#### Use Cases for Borrowers:
- Apply for grant platforms  
- Access whitelist DAO roles  
- Request micro-loans  
- Get a “Verified Builder” badge  
- And more...

#### What Backers Do:
1. Connect wallet to RepuFi.
2. Select a borrower.
3. Stake a chosen amount of DOT as trust collateral.
4. RepuFi fetches their on-chain reputation score.
5. The system mints a **VouchNFT** on **Polkadot AssetHub** with:
   - 🪪 Backer’s address  
   - 👤 Borrower’s address  
   - 🔒 Staked DOT amount  
   - 📜 Reason (e.g., “DAO contributor role”)  
   - ⌛ Expiry (30 days)  
   - 🧠 Reputation metadata (Gitcoin, GitHub, etc.)

The borrower now holds this **VouchNFT** as a verifiable badge of trust.


### 3. Outcome Scenarios

#### ✅ If Borrower Succeeds:
- e.g., gets a grant → submits work → DAO approves  
- Smart contract **returns staked DOT** to the backer  
- Optionally, **rewards the backer**

#### ❌ If Borrower Fails or Is Inactive:
- Smart contract **slashes** the staked DOT  
- RepuFi mints a **WarningNFT** to record the failed pair


## 🔐 Smart Contract Logic

| Feature         | Logic                                                                 |
|-----------------|-----------------------------------------------------------------------|
| Stake Vouch     | `vouchFor(address borrower, uint amount, string reason)`             |
| NFT Minting     | Mints `VouchNFT` on AssetHub with full metadata                      |
| Expiry Limit    | Maximum vouch duration: **30 days**                                  |
| Slashing Logic  | Triggered by external API or DAO admin vote                          |
| Withdraw Flow   | `releaseStake()` after expiry, if no negative reports exist          |


## ✨ Key Features Implemented

-   **PassetHub Testnet Integration:** Fully configured for interactions with the PassetHub Testnet.
-   **GitHub Reputation Scoring:**
    -   Backers analyze their GitHub profiles via a Next.js API route.
    -   A weighted score (DRS) is calculated based on public repos, followers, stars, activity, etc.
    -   Minimum score required to act as a Backer.
-   **On-Chain Vouching with SBTs:**
    -   Backers stake PAS to create vouches.
    -   ERC721 Soul-Bound Tokens (SBTs) are minted for both Backer and Borrower.
    -   Metadata (including GitHub score snapshot and a custom SVG image) is stored on IPFS via Pinata.
-   **Core Smart Contract Functions:** `createVouch`, `releaseStake`, `slashStake` (admin), `forceExpire` (admin).


## PassetHub TestNet :

- [Faucet](https://faucet.polkadot.io/?parachain=1111)
- Testnet details:
* Network name: PassetHub
* Chain ID: 420420421
* RPC URL: https://testnet-passet-hub-eth-rpc.polkadot.io
* Currency: PAS
* Block Explorer URL: https://blockscout-passet-hub.parity-testnet.parity.io/

## 🔮 Future Enhancements & Ideas

-   **"Rep Streaks":** Reward consistent and successful vouching/borrowing.
-   **Trust Marketplace:** Allow backers to offer vouching services for a fee/reward percentage.
-   **Integration with More Reputation Sources:** Gitcoin Passport, Lens Protocol, on-chain activity.
-   **Advanced SBT Functionality:** SBTs could unlock specific platform features or DAO voting rights.


## 📢 Contributors

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/bansal-ishaan">
        <img src="https://avatars.githubusercontent.com/bansal-ishaan" width="80px;" alt=""/>
        <br /><sub><b>Ishaan Bansal</b></sub>
      </a>
    </td>
     <td align="center">
      <a href="https://github.com/Rohan-droid7341">
        <img src="https://avatars.githubusercontent.com/Rohan-droid7341" width="80px;" alt=""/>
        <br /><sub><b>Rohan Garg</b></sub>
      </a>
    </td>
     <td align="center">
      <a href="https://github.com/yourusername">
        <img src="https://avatars.githubusercontent.com/yourusername" width="80px;" alt=""/>
        <br /><sub><b>Pratik Kapure</b></sub>
      </a>
    </td>
     <td align="center">
      <a href="https://github.com/yourusername">
        <img src="https://avatars.githubusercontent.com/yourusername" width="80px;" alt=""/>
        <br /><sub><b>Sumanth</b></sub>
      </a>
    </td>
    <!-- Add more contributors below by duplicating the <td> block -->
  </tr>
</table>


