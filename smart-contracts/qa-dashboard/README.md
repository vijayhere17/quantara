# Quantara Internal QA Dashboard

Simple **business-focused** SPA for testing live Hardhat smart contracts.  
Every page answers: **“Is this business rule working correctly?”**

Open: **http://localhost:5173**

## Quick start

```bash
# Terminal 1
cd smart-contracts
npx hardhat node

# Terminal 2
cd smart-contracts
npm run qa:dashboard:setup   # build + deploy + sync + install UI
npm run qa:dashboard         # http://localhost:5173
```

## Pages

| Tab | Question it answers |
|-----|---------------------|
| **Overview** | Are pools and totals healthy? (click a card → related page) |
| **Users** | Create → Register → Activate → View Details |
| **Packages** | Is package progress / next unlock correct? |
| **Income** | Self ROI, Direct, Contribution, Rank, Tier, Community… |
| **Referral Tree** | Who sponsors whom? Rank / package / BV |
| **Reports** | PASS / FAIL business checks (no event spam) |
| **Developer** | Events, txs, gas, time travel, reset (technical only) |

## Recommended test flow

1. **Users** → Create 1  
2. **Register**  
3. **Activate $50**  
4. **View Details** → package progress, income breakdown, recycling 70/30  
5. Create a child under that user → Activate → verify Direct 5% / L2 3% / L3 2%  
6. **Overview** → ROI pool & charity moved  
7. **Packages** → Upgrade (complete cycle → next)  
8. **Reports** → Run Full QA  

## Notes

- Talks to `http://127.0.0.1:8545` + synced `deployed-addresses.json`
- After redeploy: `npm run qa:dashboard:sync` then refresh the browser
- Technical Event/Transaction explorers live only under **Developer**
