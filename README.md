# 💡 RepuFi – Rent-a-Reputation

A decentralized system where trusted users can vouch for others by staking tokens, creating an on-chain reputation lending market.

---

## 🧩 Core Flow

### 1. Two Roles

- 🧑‍🎓 **Borrower**  
  A new user with low or no on-chain reputation.

- 🧔‍♂ **Backer (Vouch-er)**  
  A trusted user with provable rep on platforms like Gitcoin, Lens, GitHub, etc.

---

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

---

### 3. Outcome Scenarios

#### ✅ If Borrower Succeeds:
- e.g., gets a grant → submits work → DAO approves  
- Smart contract **returns staked DOT** to the backer  
- Optionally, **rewards the backer**

#### ❌ If Borrower Fails or Is Inactive:
- Smart contract **slashes** the staked DOT  
- RepuFi mints a **WarningNFT** to record the failed pair

---

## 🔐 Smart Contract Logic

| Feature         | Logic                                                                 |
|-----------------|-----------------------------------------------------------------------|
| Stake Vouch     | `vouchFor(address borrower, uint amount, string reason)`             |
| NFT Minting     | Mints `VouchNFT` on AssetHub with full metadata                      |
| Expiry Limit    | Maximum vouch duration: **30 days**                                  |
| Slashing Logic  | Triggered by external API or DAO admin vote                          |
| Withdraw Flow   | `releaseStake()` after expiry, if no negative reports exist          |

---

## 🎁 Features to Build in a Hackathon

### ✅ MVP
- Polkadot.js wallet integration  
- Select borrower + stake DOT  
- Mint `VouchNFT` with on-chain metadata  
- Borrower dashboard showing who vouched and how much  
- Admin-triggered slash logic + WarningNFT flow  

### 🔥 Advanced Ideas
- Real-time reputation scores from GitHub/Gitcoin/Lens  
- Reputation leaderboard  
- "Rep Streaks" — consistent, multi-user vouching  
- “Trust Marketplace” — vouch for others in return for a % reward  

---

## 🚀 Tech Stack
- **Smart Contracts:** Solidity (Polkadot AssetHub EVM)
- **Frontend:** Next.js + Wagmi + Polkadot.js Extension
- **Chain:** Polkadot AssetHub / Astar / Moonbeam (EVM-compatible)
- **NFTs:** ERC721 for `VouchNFT` and `WarningNFT`

---

## 📜 License
MIT License

---

## 🙌 Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

---

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

---

