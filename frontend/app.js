/* Simulated frontend (no MetaMask, no RPC)
   - Uses fake wallets and balances
   - Simulates beneficiary verification, impact scoring, and fund allocation
   - Reads `frontend/config.json` for demo contract address (informational only)
*/

const connectBtn = document.getElementById('connectBtn');
const statusEl = document.getElementById('status');
const accountEl = document.getElementById('account');
const netEl = document.getElementById('network');
const contractAddressEl = document.getElementById('contractAddress');
const contractStatusEl = document.getElementById('contractStatus');
const beneficiariesEl = document.getElementById('beneficiaries');
const beneficiaryCountEl = document.getElementById('beneficiaryCount');
const totalAllocatedEl = document.getElementById('totalAllocated');
const walletSelect = document.getElementById('walletSelect');
const beneficiarySelect = document.getElementById('beneficiarySelect');
const walletBalanceEl = document.getElementById('walletBalance');
const allocAmountInput = document.getElementById('allocAmount');
const allocBtn = document.getElementById('allocBtn');
const themeToggle = document.getElementById('themeToggle');
const smoothCheckbox = document.getElementById('smoothTransition');
const toastContainer = document.getElementById('toastContainer');

function setStatus(s){ statusEl.innerText = s; }

// Theme handling
function applyTheme(theme){
  if (theme === 'dark') document.body.classList.add('theme-dark');
  else document.body.classList.remove('theme-dark');
  if (themeToggle) themeToggle.innerText = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme(){
  const isDark = document.body.classList.toggle('theme-dark');
  const theme = isDark ? 'dark' : 'light';
  try{ localStorage.setItem('rf-theme', theme);}catch(e){}
  if (themeToggle) themeToggle.innerText = isDark ? '☀️' : '🌙';
  // apply temporary transition if enabled
  const smooth = (localStorage.getItem('rf-smooth') || 'true') === 'true';
  if (smooth){
    document.body.classList.add('theme-transition');
    setTimeout(()=> document.body.classList.remove('theme-transition'), 600);
  }
}

// initialize theme from localStorage or prefers-color-scheme
try{
  const saved = localStorage.getItem('rf-theme');
  if (saved) applyTheme(saved);
  else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) applyTheme('dark');
  else applyTheme('light');
}catch(e){ applyTheme('light') }

if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
// Initialize smoothTransition checkbox
try{
  const val = localStorage.getItem('rf-smooth');
  if (smoothCheckbox){
    smoothCheckbox.checked = val === null ? true : (val === 'true');
    smoothCheckbox.addEventListener('change', ()=>{
      try{ localStorage.setItem('rf-smooth', smoothCheckbox.checked ? 'true' : 'false'); }catch(e){}
      // flash example transition when toggled on
      if (smoothCheckbox.checked){ document.body.classList.add('theme-transition'); setTimeout(()=>document.body.classList.remove('theme-transition'),400) }
    });
  }
}catch(e){}

// Toast system
function showToast(message, type='info', title=''){
  if (!toastContainer) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<div style="flex:1"><div class="title">${title || (type==='success'? 'Success': type==='error' ? 'Error' : 'Info')}</div><div class="msg">${message}</div></div>`;
  toastContainer.appendChild(el);
  // auto remove
  setTimeout(()=>{ el.classList.add('hide'); setTimeout(()=> el.remove(), 260); }, 3200);
}

// Demo data
const fakeWallets = [
  { name: 'Demo Wallet 1', address: '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa', balance: BigInt('5000000000000000000') }, // 5 ETH
  { name: 'Demo Wallet 2', address: '0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb', balance: BigInt('20000000000000000000') }, // 20 ETH
  { name: 'Demo Wallet 3', address: '0xCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCc', balance: BigInt('1500000000000000000') } // 1.5 ETH
];

const beneficiaries = [
  { addr: '0xFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfF', name: 'Clinic A', verified: false, impactFactors: [8,7,9], allocated: BigInt(0) },
  { addr: '0xEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEe', name: 'Shelter B', verified: true, impactFactors: [6,8,7], allocated: BigInt(0) },
  { addr: '0xDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDd', name: 'Food Drive C', verified: false, impactFactors: [9,9,8], allocated: BigInt(0) }
];

let selectedWallet = null;

function formatEther(wei) {
  const asNum = Number(wei) / 1e18;
  return asNum.toFixed(3);
}

function parseEther(str) {
  // str as decimal number (e.g., "0.5")
  const parts = str.split('.');
  const whole = BigInt(parts[0] || '0');
  let frac = BigInt(0);
  if (parts[1]) {
    const padded = (parts[1] + '0'.repeat(18)).slice(0,18);
    frac = BigInt(padded);
  }
  return whole * BigInt(1e18) + frac;
}

function populateWalletSelect(){
  walletSelect.innerHTML = '';
  for (const w of fakeWallets){
    const opt = document.createElement('option');
    opt.value = w.address;
    opt.innerText = `${w.name} — ${w.address}`;
    walletSelect.appendChild(opt);
  }
}

function populateBeneficiarySelect(){
  beneficiarySelect.innerHTML = '';
  for (const b of beneficiaries){
    const opt = document.createElement('option');
    opt.value = b.addr;
    opt.innerText = `${b.name} — ${b.addr}`;
    beneficiarySelect.appendChild(opt);
  }
}

function computeImpactScore(b){
  // Simple normalized impact score from 0-100
  const sum = b.impactFactors.reduce((s,x)=>s+x,0);
  const max = b.impactFactors.length * 10;
  return Math.round((sum / max) * 100);
}

function renderBeneficiaries(){
  beneficiariesEl.innerHTML = '';
  let total = BigInt(0);
  for (const b of beneficiaries){
    const li = document.createElement('li');
    const score = computeImpactScore(b);
    li.innerHTML = `<strong>${b.name}</strong> — ${b.addr} <div class=muted>Impact: ${score}% • Verified: ${b.verified ? 'Yes' : 'No'} • Allocated: ${formatEther(b.allocated)} ETH</div>`;
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.style.marginLeft = '8px';
    btn.innerText = b.verified ? 'Unverify' : 'Verify';
    btn.onclick = () => { b.verified = !b.verified; renderBeneficiaries(); updateStats(); };
      btn.onclick = () => { 
        b.verified = !b.verified; 
        renderBeneficiaries(); 
        updateStats(); 
        showToast(`${b.name} is now ${b.verified ? 'verified' : 'unverified'}`, b.verified ? 'success' : 'info');
      };
    li.appendChild(btn);
    beneficiariesEl.appendChild(li);
    total += b.allocated;
  }
  beneficiaryCountEl.innerText = beneficiaries.length.toString();
  totalAllocatedEl.innerText = formatEther(total);
}

function updateStats(){
  if (selectedWallet) walletBalanceEl.innerText = `${formatEther(selectedWallet.balance)} ETH`;
}

connectBtn.onclick = async () => {
  // Simulate connection: load config and initialize UI
  try {
    const resp = await fetch('config.json');
    const cfg = await resp.json();
    contractAddressEl.innerText = cfg.contractAddress || 'none';
    contractStatusEl.innerText = cfg.demoMode ? 'Simulated contract (demo mode)' : 'Simulated (no chain)';
  } catch (e){
    contractAddressEl.innerText = 'config.json not found';
    contractStatusEl.innerText = 'Simulated (no chain)';
  }

  populateWalletSelect();
  populateBeneficiarySelect();
  // auto-select first wallet
  walletSelect.selectedIndex = 0;
  selectedWallet = fakeWallets[0];
  accountEl.innerText = `Account: ${selectedWallet.address}`;
  netEl.innerText = `Network: demo-net (simulated)`;
  setStatus('Connected (simulated)');
  showToast('Connected to simulated wallet', 'success');
  renderBeneficiaries();
  updateStats();
};

walletSelect.onchange = () => {
  const addr = walletSelect.value;
  selectedWallet = fakeWallets.find(w=>w.address===addr) || null;
  accountEl.innerText = selectedWallet ? `Account: ${selectedWallet.address}` : '';
  updateStats();
};

allocBtn.onclick = () => {
  if (!selectedWallet) { setStatus('Select a wallet first'); showToast('Select a wallet first', 'error'); return; }
  const amtStr = allocAmountInput.value;
  if (!amtStr || Number(amtStr) <= 0) { setStatus('Enter allocation amount'); showToast('Enter allocation amount', 'error'); return; }
  const wei = parseEther(amtStr);
  if (wei > selectedWallet.balance) { setStatus('Insufficient balance'); showToast('Insufficient balance', 'error'); return; }
  const benAddr = beneficiarySelect.value;
  const ben = beneficiaries.find(b=>b.addr===benAddr);
  if (!ben) { setStatus('Select a beneficiary'); showToast('Select a beneficiary', 'error'); return; }
  // Simulate allocation
  selectedWallet.balance -= wei;
  ben.allocated += wei;
  setStatus(`Allocated ${amtStr} ETH to ${ben.name}`);
  showToast(`Allocated ${amtStr} ETH to ${ben.name}`, 'success');
  renderBeneficiaries();
  updateStats();
};


// initial render (before connect)
setStatus('Not connected (click Connect Wallet to start simulated demo)');
