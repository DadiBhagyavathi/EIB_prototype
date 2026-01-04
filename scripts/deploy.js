require('dotenv').config();
const hre = require('hardhat');

async function main() {
  const rpc = process.env.SEPOLIA_RPC;
  const key = process.env.PRIVATE_KEY;
  if (!rpc || !key) {
    console.error('Please set SEPOLIA_RPC and PRIVATE_KEY in .env');
    process.exit(1);
  }

  console.log('Deploying ReliefFund to Sepolia...');
  const Relief = await hre.ethers.getContractFactory('ReliefFund');
  const relief = await Relief.deploy();
  await relief.waitForDeployment();
  const deployedAddress = relief.target || relief.address || relief;
  console.log('ReliefFund deployed at:', deployedAddress);

  // Persist deployed address to frontend/config.json so the UI can use it.
  const fs = require('fs');
  const path = require('path');
  const cfgPath = path.join(__dirname, '..', 'frontend', 'config.json');
  try {
    const cfg = { contractAddress: deployedAddress };
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), { encoding: 'utf8' });
    console.log('Wrote contract address to', cfgPath);
  } catch (err) {
    console.warn('Failed to write frontend/config.json:', err.message || err);
    console.log('Contract address:', deployedAddress);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
