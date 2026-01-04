# ReliefFund — Demo (Simulated Frontend)

This repository contains the `ReliefFund` Solidity contract and a demo-ready frontend that simulates wallet interaction, beneficiary verification, impact scoring, and fund allocation — all without any real blockchain connection.

Key constraints satisfied:
- `contracts/ReliefFund.sol` and tests under `test/` are unchanged.
- No MetaMask or RPCs are used; the frontend runs entirely in the browser and uses fake wallets/balances.
- A demo contract address is provided in `frontend/config.json` for display only.

Getting started (quick):

1. Install node modules (for Hardhat/testing tools):

```bash
npm install
```

2. Start the static demo frontend:

```bash
npm run start
```

This will serve the `frontend` folder at `http://localhost:8080` (unless the port is in use).

What the frontend simulates:
- Wallet connection: choose from a list of fake wallets in the UI.
- Beneficiary verification: toggle verification status for demo beneficiaries.
- Impact score: computed from simple internal factors and shown as a percent.
- Fund allocation: allocate ETH from the selected fake wallet to a beneficiary — updates balances in the UI.

Files of interest:
- `frontend/index.html` — demo UI.
- `frontend/app.js` — simulation logic (fake wallets, beneficiaries, allocation).
- `frontend/config.json` — demo contract address and `demoMode` flag; editing this file changes the displayed contract address.

Notes:
- This demo is designed for hackathon presentations — clarity and interactivity, not production security.
- If you want to run the tests or compile the contract, use the existing Hardhat scripts:
  - `npm run compile`
  - `npm test`

If you'd like, I can:
- Add more demo beneficiaries and richer impact scoring logic.
- Add a small script to snapshot demo state and export allocations.
- Wire the UI to read `artifacts` if you prefer to show ABI details (still simulated).

Enjoy the demo!
