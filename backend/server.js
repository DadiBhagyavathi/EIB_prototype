const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

const STATE_FILE = path.join(__dirname, 'state.json');

function loadState(){
	try{
		const raw = fs.readFileSync(STATE_FILE,'utf8');
		return JSON.parse(raw);
	}catch(e){
		// default demo state
		return {
			wallets: [
				{ name: 'Demo Wallet 1', address: '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa', balance: '5000000000000000000' },
				{ name: 'Demo Wallet 2', address: '0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb', balance: '20000000000000000000' },
				{ name: 'Demo Wallet 3', address: '0xCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCc', balance: '1500000000000000000' }
			],
			beneficiaries: [
				{ addr: '0xFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfF', name: 'Clinic A', verified: false, impactFactors:[8,7,9], allocated: '0' },
				{ addr: '0xEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEe', name: 'Shelter B', verified: true, impactFactors:[6,8,7], allocated: '0' },
				{ addr: '0xDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDd', name: 'Food Drive C', verified: false, impactFactors:[9,9,8], allocated: '0' }
			]
		};
	}
}

function saveState(state){
	try{ fs.writeFileSync(STATE_FILE, JSON.stringify(state,null,2),'utf8'); }catch(e){ console.error('Failed to save state', e); }
}

let STATE = loadState();

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/api/config', (req,res)=>{
	res.json({ contractAddress: (function(){
		try{ const cfg = require(path.join(__dirname,'..','frontend','config.json')); return cfg.contractAddress }catch(e){ return null }
	})(), demo:true });
});

app.get('/api/wallets', (req,res)=>{
	res.json(STATE.wallets);
});

app.get('/api/beneficiaries', (req,res)=>{
	res.json(STATE.beneficiaries);
});

app.post('/api/allocate', (req,res)=>{
	const { wallet: waddr, beneficiary: baddr, amount } = req.body || {};
	if (!waddr || !baddr || !amount) return res.status(400).json({ error: 'missing parameters' });
	const wallet = STATE.wallets.find(w=>w.address===waddr);
	const ben = STATE.beneficiaries.find(b=>b.addr===baddr);
	if (!wallet || !ben) return res.status(404).json({ error: 'wallet or beneficiary not found' });
	const wbal = BigInt(wallet.balance || '0');
	const wei = BigInt(amount.toString());
	if (wei > wbal) return res.status(400).json({ error: 'insufficient balance' });
	wallet.balance = (wbal - wei).toString();
	ben.allocated = (BigInt(ben.allocated || '0') + wei).toString();
	saveState(STATE);
	return res.json({ ok:true, wallet, beneficiary:ben });
});

app.post('/api/verify', (req,res)=>{
	const { beneficiary: baddr } = req.body || {};
	const ben = STATE.beneficiaries.find(b=>b.addr===baddr);
	if (!ben) return res.status(404).json({ error: 'beneficiary not found' });
	ben.verified = !ben.verified;
	saveState(STATE);
	res.json({ ok:true, beneficiary: ben });
});

app.get('/api/export', (req,res)=>{
	// export allocations CSV
	const rows = ['name,addr,verified,impactScore,allocatedETH'];
	for (const b of STATE.beneficiaries){
		const sum = b.impactFactors.reduce((s,x)=>s+x,0);
		const score = Math.round((sum / (b.impactFactors.length*10)) * 100);
		const allocated = (BigInt(b.allocated||'0') / BigInt('1000000000000000000')).toString();
		rows.push(`${b.name},${b.addr},${b.verified ? 'yes':'no'},${score},${allocated}`);
	}
	res.setHeader('Content-Type','text/csv');
	res.setHeader('Content-Disposition','attachment; filename=allocations.csv');
	res.send(rows.join('\n'));
});

app.get('*', (req,res)=>{
	res.sendFile(path.join(__dirname,'..','frontend','index.html'));
});

app.listen(PORT, ()=>{ console.log(`Server started on ${PORT}`); });
