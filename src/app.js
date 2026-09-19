import { AQUASURE_DATA as DATA } from './data/generatedData.js';

const state = {
  role: 'farmer',
  page: 'overview',
  farmId: DATA.farms[0].id,
  mode: 'operational',
  date: DATA.demoDate,
  variable: 'do',
};

const navs = {
  farmer: [
    ['overview','Ringkasan'],
    ['water','Kualitas Air'],
    ['risk','Prediksi Risiko'],
    ['policy','Polis'],
  ],
  insurer: [
    ['portfolio','Portofolio'],
    ['underwriting','Underwriting'],
    ['claims','Review Trigger'],
    ['evidence','Bukti Model'],
  ],
};

const coreOrder = ['temperature','do','ph','salinity','ammonia','nitrite','turbidity'];
const IDR = new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
const NUM = new Intl.NumberFormat('id-ID',{maximumFractionDigits:2});
const DATE = new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'});

const $ = (q,root=document)=>root.querySelector(q);
const $$ = (q,root=document)=>[...root.querySelectorAll(q)];

function fmtIdr(n){ return IDR.format(n).replace('Rp','Rp '); }
function compactIdr(n){
  if(n>=1e9) return `Rp ${(n/1e9).toFixed(2).replace('.',',')} M`;
  if(n>=1e6) return `Rp ${(n/1e6).toFixed(1).replace('.',',')} jt`;
  return fmtIdr(n);
}
function pct(v,d=0){ return `${(v*100).toFixed(d).replace('.',',')}%`; }
function formatDate(s){ return DATE.format(new Date(`${s}T00:00:00+07:00`)); }
function farm(){ return DATA.farms.find(f=>f.id===state.farmId) ?? DATA.farms[0]; }
function scenario(f=farm()){ return f[state.mode]; }
function currentRow(f=farm()){
  const s=scenario(f);
  return s.series.find(r=>r.date===state.date) ?? s.series[s.series.length-1];
}
function rowAtOrBeforeDate(f=farm()){
  const s=scenario(f); const target=state.date;
  return [...s.series].reverse().find(r=>r.date<=target) ?? s.series[0];
}
function historyUntil(f=farm()){
  const s=scenario(f); return s.series.filter(r=>r.date<=state.date);
}
function riskTier(v){
  if(v<.60) return {label:'Rendah',tone:'good',class:'risk-low'};
  if(v<.75) return {label:'Sedang',tone:'warn',class:'risk-mid'};
  if(v<.85) return {label:'Tinggi',tone:'warn',class:'risk-mid'};
  if(v<.95) return {label:'Sangat tinggi',tone:'bad',class:'risk-high'};
  return {label:'Ekstrem',tone:'bad',class:'risk-high'};
}
function payoutTier(v){
  return DATA.contract.payoutLadder.find(x=>v>=x.min && v<x.max) ?? DATA.contract.payoutLadder[0];
}
function variableStatus(key,value){
  const m=DATA.coreVariables[key];
  if(m.direction==='low') return value<m.threshold ? ['Watch','alert'] : ['Normal',''];
  if(m.direction==='high') return value>m.threshold ? ['Watch','alert'] : ['Normal',''];
  if(m.direction==='band') return (value<m.low||value>m.high) ? ['Watch','alert'] : ['Normal',''];
  return ['Context',''];
}
function severityScore(key,value){
  const m=DATA.coreVariables[key];
  if(m.direction==='low') return Math.max(0,(m.threshold-value)/Math.max(m.threshold,1e-6));
  if(m.direction==='high') return Math.max(0,(value-m.threshold)/Math.max(m.threshold,1e-6));
  if(m.direction==='band'){
    if(value<m.low) return (m.low-value)/Math.max(m.low,1e-6);
    if(value>m.high) return (value-m.high)/Math.max(m.high,1e-6);
  }
  return 0;
}
function topDriver(f=farm()){
  const r=rowAtOrBeforeDate(f);
  return coreOrder.map(k=>({key:k,score:severityScore(k,r[k]),value:r[k]})).sort((a,b)=>b.score-a.score)[0];
}
function valueText(key,value){
  const m=DATA.coreVariables[key]; const d=m.decimals ?? 2;
  return `${Number(value).toFixed(d).replace('.',',')}${m.unit?` ${m.unit}`:''}`;
}
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._tm); t._tm=setTimeout(()=>t.classList.remove('show'),2200); }

function sparkline(key,rows,alert=false){
  const vals=rows.slice(-14).map(r=>r[key]); if(vals.length<2) return '';
  const min=Math.min(...vals), max=Math.max(...vals), span=max-min||1;
  const pts=vals.map((v,i)=>`${(i/(vals.length-1))*100},${18-((v-min)/span)*16}`).join(' ');
  return `<div class="spark"><svg viewBox="0 0 100 20" preserveAspectRatio="none"><polyline points="${pts}"/></svg></div>`;
}

function lineChart(key,rows){
  const meta=DATA.coreVariables[key]; const vals=rows.map(r=>r[key]);
  const W=760,H=270,padX=44,padY=24;
  let min=Math.min(...vals),max=Math.max(...vals);
  if(meta.direction==='high'||meta.direction==='low') { min=Math.min(min,meta.threshold); max=Math.max(max,meta.threshold); }
  if(meta.direction==='band'){ min=Math.min(min,meta.low); max=Math.max(max,meta.high); }
  const extra=(max-min||1)*.12; min-=extra; max+=extra;
  const x=i=>padX+(W-padX*2)*(i/Math.max(1,rows.length-1));
  const y=v=>H-padY-(H-padY*2)*((v-min)/(max-min||1));
  const points=vals.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
  const area=`M ${x(0)} ${H-padY} L ${points.replaceAll(',',' ')} L ${x(vals.length-1)} ${H-padY} Z`;
  const grid=[0,.25,.5,.75,1].map(q=>{const yy=padY+(H-padY*2)*q;const val=max-(max-min)*q;return `<line x1="${padX}" y1="${yy}" x2="${W-padX}" y2="${yy}"/><text class="chart-label" x="4" y="${yy+4}">${NUM.format(val)}</text>`}).join('');
  let threshold='';
  if(meta.direction==='high'||meta.direction==='low') threshold=`<line class="chart-threshold" x1="${padX}" y1="${y(meta.threshold)}" x2="${W-padX}" y2="${y(meta.threshold)}"/>`;
  if(meta.direction==='band') threshold=`<line class="chart-threshold" x1="${padX}" y1="${y(meta.low)}" x2="${W-padX}" y2="${y(meta.low)}"/><line class="chart-threshold" x1="${padX}" y1="${y(meta.high)}" x2="${W-padX}" y2="${y(meta.high)}"/>`;
  const ticks=[0,Math.floor((rows.length-1)/2),rows.length-1].filter((v,i,a)=>a.indexOf(v)===i).map(i=>`<text class="chart-label" x="${x(i)}" y="${H-4}" text-anchor="middle">${rows[i].date.slice(5)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><g class="chart-grid">${grid}</g>${threshold}<path class="chart-area" d="${area}"/><polyline class="chart-line" points="${points}"/>${ticks}</svg>`;
}

function parameterCards(f=farm()){
  const row=rowAtOrBeforeDate(f), hist=historyUntil(f);
  return `<div class="param-grid">${coreOrder.map(key=>{
    const m=DATA.coreVariables[key], [st,cl]=variableStatus(key,row[key]);
    return `<div class="param-card ${cl}"><div class="top"><span class="code">${m.label}</span><span class="state">${st}</span></div><div class="num">${valueText(key,row[key])}</div><div class="unit">${m.full}</div>${sparkline(key,hist,!!cl)}<div class="ref">R&D reference · ${m.ref}</div></div>`;
  }).join('')}</div>`;
}

function contextBar({showFarm=true,showDate=true}={}){
  const f=farm(), s=scenario(f), row=rowAtOrBeforeDate(f);
  const farms=DATA.farms.map(x=>`<option value="${x.id}" ${x.id===f.id?'selected':''}>${x.name} · ${x.id}</option>`).join('');
  return `<div class="context-bar">
    ${showFarm?`<div class="context-cell"><span>Petambak</span><select data-control="farm">${farms}</select></div>`:''}
    ${showDate?`<div class="context-cell"><span>Tanggal observasi</span><input data-control="date" type="date" min="${s.series[0].date}" max="${s.series.at(-1).date}" value="${row.date}"/></div>`:''}
    <div class="context-cell"><span>Siklus R&D</span><b>${s.cycleId}</b></div>
    <div class="context-cell"><span>Lingkungan</span><b>${f.climateLabel}</b></div>
  </div>`;
}

function riskHero(f=farm()){
  const s=scenario(f), tier=riskTier(s.phri), driver=topDriver(f), dm=DATA.coreVariables[driver.key];
  return `<div class="risk-hero"><div class="risk-ring" style="--p:${Math.round(s.phri*100)}"><strong>${Math.round(s.phri*100)}%</strong></div><div class="risk-copy"><div class="risk-tier">PHRI Day-60 · ${tier.label}</div><p>Probabilitas synthetic harvest-health berada di bawah threshold R&D setelah 60 hari observasi.</p><div class="mini-metrics"><div><span>Forecast health</span><b>${s.forecastHarvestHealth.toFixed(3)}</b></div><div><span>Top watch</span><b>${dm.label}</b></div><div><span>Mode</span><b>${state.mode==='stress'?'Stress test':'Operational'}</b></div></div></div></div>`;
}

function triggerChecklist(f=farm()){
  const s=scenario(f), phriMet=s.phri>=DATA.contract.phriThreshold;
  return `<div class="row-list">
    <div class="row-item"><span>PHRI ≥ 75%</span><b><span class="pill ${phriMet?'warn':'good'}">${phriMet?'Reached':'Not reached'}</span></b></div>
    <div class="row-item"><span>Persistensi ≥ 48 jam</span><b>Evaluated in pricing simulation</b></div>
    <div class="row-item"><span>Data completeness ≥ 85%</span><b>${pct(f.scenarioStats.dataCompleteness,1)} scenario mean</b></div>
    <div class="row-item"><span>Konfirmasi stres multivariat</span><b>≥ 3 dari 6 critical parameters</b></div>
  </div>`;
}

function payoutLadder(phri){
  return `<div class="contract-ladder">${DATA.contract.payoutLadder.map(x=>{
    const active=phri>=x.min&&phri<x.max; const label=x.min===0?'PHRI < 75%':x.max>1?`PHRI ≥ ${Math.round(x.min*100)}%`:`PHRI ${Math.round(x.min*100)}–<${Math.round(x.max*100)}%`;
    return `<div class="ladder-step ${active?'active':''}"><span>${label}</span><b>${Math.round(x.ratio*100)}% SI</b></div>`;
  }).join('')}</div>`;
}

function farmerOverview(){
  const f=farm(),s=scenario(f),r=rowAtOrBeforeDate(f),tier=riskTier(s.phri),payout=payoutTier(s.phri);
  $('#pageTitle').textContent='Ringkasan Tambak'; $('#breadcrumb').textContent=`${f.name} / ${f.id}`;
  $('#view').innerHTML=`${contextBar()}
    <div class="kpi-grid">
      <div class="kpi primary"><div class="label">PHRI Day-60</div><div class="value ${tier.tone}">${pct(s.phri)}</div><div class="note">${tier.label} · checkpoint model hari ke-60</div></div>
      <div class="kpi"><div class="label">Hari siklus</div><div class="value">${r.day}/120</div><div class="note">observasi tersedia sampai hari 60</div></div>
      <div class="kpi"><div class="label">Sum insured</div><div class="value">${compactIdr(f.sumInsuredIdr)}</div><div class="note">exposure synthetic per petambak</div></div>
      <div class="kpi"><div class="label">Payout tier</div><div class="value">${Math.round(payout.ratio*100)}%</div><div class="note">berlaku jika seluruh trigger terpenuhi</div></div>
    </div>
    <div class="grid-2"><section class="panel"><div class="panel-head"><h2>Risk state</h2><span class="tag">Day-60 forecast</span></div>${riskHero(f)}</section><section class="panel"><div class="panel-head"><h2>Trigger contract</h2><small>Pure parametric</small></div>${triggerChecklist(f)}</section></div>
    <section class="panel"><div class="panel-head"><h2>7 core water-quality parameters</h2><small>${formatDate(r.date)}</small></div>${parameterCards(f)}</section>`;
}

function farmerWater(){
  const f=farm(),rows=historyUntil(f),row=rowAtOrBeforeDate(f),meta=DATA.coreVariables[state.variable];
  $('#pageTitle').textContent='Kualitas Air'; $('#breadcrumb').textContent=`${f.name} / 7 core parameters`;
  const tabs=coreOrder.map(k=>`<button data-variable="${k}" class="${k===state.variable?'active':''}">${DATA.coreVariables[k].label}</button>`).join('');
  const recent=[...rows].slice(-10).reverse();
  $('#view').innerHTML=`${contextBar()}
    <section class="panel"><div class="panel-head"><div><h2>${meta.full}</h2><div class="panel-sub">Riwayat observasi synthetic · hingga ${formatDate(row.date)}</div></div><div class="variable-tabs">${tabs}</div></div><div class="chart-wrap">${lineChart(state.variable,rows)}</div></section>
    <div class="grid-equal"><section class="panel"><div class="panel-head"><h2>Current snapshot</h2><span class="tag">${meta.ref}</span></div>${parameterCards(f)}</section>
    <section class="table-panel"><table class="data-table"><thead><tr><th>Tanggal</th><th>Hari</th><th>${meta.label}</th><th>Status</th></tr></thead><tbody>${recent.map(x=>{const [st,cl]=variableStatus(state.variable,x[state.variable]);return `<tr><td>${formatDate(x.date)}</td><td class="mono">D${x.day}</td><td class="mono">${valueText(state.variable,x[state.variable])}</td><td><span class="pill ${cl?'warn':'good'}">${st}</span></td></tr>`}).join('')}</tbody></table></section></div>`;
}

function farmerRisk(){
  const f=farm(),s=scenario(f),tier=riskTier(s.phri);
  $('#pageTitle').textContent='Prediksi Risiko'; $('#breadcrumb').textContent=`${f.name} / ${s.cycleId}`;
  const healthGap=s.forecastHarvestHealth-s.actualHarvestHealth;
  $('#view').innerHTML=`${contextBar()}
    <div class="grid-2"><section class="panel"><div class="panel-head"><h2>PHRI Day-60</h2><span class="tag">${tier.label}</span></div>${riskHero(f)}</section><section class="panel"><div class="panel-head"><h2>Trigger readiness</h2><small>4 conditions</small></div>${triggerChecklist(f)}</section></div>
    <div class="grid-equal"><section class="panel"><div class="panel-head"><h2>Harvest-health target</h2><small>end-cycle target</small></div><div class="row-list"><div class="row-item"><span>Forecast harvest health</span><b>${s.forecastHarvestHealth.toFixed(4)}</b></div><div class="row-item"><span>Realized synthetic outcome</span><b>${s.actualHarvestHealth.toFixed(4)}</b></div><div class="row-item"><span>Forecast error</span><b>${healthGap>=0?'+':''}${healthGap.toFixed(4)}</b></div><div class="row-item"><span>Severe-event label</span><b><span class="pill ${s.severeEvent?'bad':'good'}">${s.severeEvent?'1 · severe':'0 · non-severe'}</span></b></div></div></section>
    <section class="panel"><div class="panel-head"><h2>Payout ladder</h2><small>percentage of Sum Insured</small></div>${payoutLadder(s.phri)}<p class="footnote">PHRI tier alone does not release payout; persistence, data completeness, and multivariate confirmation are separate contract conditions.</p></section></div>`;
}

function farmerPolicy(){
  const f=farm(),s=scenario(f),tier=payoutTier(s.phri),amount=f.sumInsuredIdr*tier.ratio,b=DATA.portfolioBenchmark;
  $('#pageTitle').textContent='Polis & Proteksi'; $('#breadcrumb').textContent=`${f.name} / pure parametric contract`;
  $('#view').innerHTML=`${contextBar({showDate:false})}
    <div class="kpi-grid"><div class="kpi primary"><div class="label">Sum insured</div><div class="value">${compactIdr(f.sumInsuredIdr)}</div><div class="note">scenario-specific exposure</div></div><div class="kpi"><div class="label">Current PHRI tier</div><div class="value">${pct(s.phri)}</div><div class="note">${riskTier(s.phri).label}</div></div><div class="kpi"><div class="label">Payout rate</div><div class="value">${Math.round(tier.ratio*100)}%</div><div class="note">if all trigger conditions are met</div></div><div class="kpi"><div class="label">Payout amount</div><div class="value">${compactIdr(amount)}</div><div class="note">pre-agreed parametric amount</div></div></div>
    <section class="panel"><div class="panel-head"><h2>Contract ladder</h2><span class="tag">PHRI threshold structure</span></div>${payoutLadder(s.phri)}</section>
    <div class="grid-equal"><section class="panel"><div class="panel-head"><h2>Contract conditions</h2></div>${triggerChecklist(f)}</section><section class="panel"><div class="panel-head"><h2>Portfolio pricing benchmark</h2><small>calibrated synthetic reconstruction</small></div><div class="row-list"><div class="row-item"><span>Expected payout</span><b>${fmtIdr(b.expectedPayoutIdr)}</b></div><div class="row-item"><span>Wang distortion premium</span><b>${fmtIdr(b.wangPremiumIdr)}</b></div><div class="row-item"><span>Gross premium</span><b>${fmtIdr(b.grossPremiumIdr)}</b></div><div class="row-item"><span>Wang λ</span><b>${b.wangLambda.toFixed(4)}</b></div></div></section></div>`;
}

function portfolioRows(){ return DATA.farms.map(f=>({f,s:f[state.mode],tier:riskTier(f[state.mode].phri)})); }
function selectedInsurerFarm(){ return farm(); }
function totalExposure(){ return DATA.farms.reduce((a,f)=>a+f.sumInsuredIdr,0); }

function insurerPortfolio(){
  const rows=portfolioRows(), threshold=rows.filter(x=>x.s.phri>=.75), avg=rows.reduce((a,x)=>a+x.s.phri,0)/rows.length;
  $('#pageTitle').textContent='Portofolio'; $('#breadcrumb').textContent=`12 petambak / ${state.mode==='stress'?'stress-test snapshot':'operational snapshot'}`;
  $('#view').innerHTML=`<div class="kpi-grid"><div class="kpi primary"><div class="label">Petambak tertanggung</div><div class="value">12</div><div class="note">12 synthetic farm profiles</div></div><div class="kpi"><div class="label">Total exposure</div><div class="value">${compactIdr(totalExposure())}</div><div class="note">combined Sum Insured</div></div><div class="kpi"><div class="label">Average PHRI</div><div class="value">${pct(avg)}</div><div class="note">current portfolio snapshot</div></div><div class="kpi"><div class="label">PHRI ≥ 75%</div><div class="value ${threshold.length?'warn':'good'}">${threshold.length}</div><div class="note">requires remaining trigger checks</div></div></div>
    <div class="grid-2"><section class="table-panel"><table class="data-table"><thead><tr><th>Petambak</th><th>Environment</th><th>Cycle</th><th>PHRI</th><th>Sum insured</th></tr></thead><tbody>${rows.map(({f,s,tier})=>`<tr data-pick-farm="${f.id}" class="${f.id===state.farmId?'active':''}"><td><span class="risk-dot ${tier.class}"></span>${f.name}<br><span class="mono">${f.id}</span></td><td>${f.climateLabel}</td><td class="mono">${s.cycleId.split('_').at(-1)}</td><td class="mono">${pct(s.phri)}</td><td class="mono">${compactIdr(f.sumInsuredIdr)}</td></tr>`).join('')}</tbody></table></section>${underwriterDetail(selectedInsurerFarm())}</div>`;
}
function underwriterDetail(f){ const s=scenario(f),tier=riskTier(s.phri); return `<section class="panel"><div class="panel-head"><h2>${f.name}</h2><span class="tag">${f.id}</span></div><div class="risk-hero" style="min-height:150px"><div class="risk-ring" style="--p:${Math.round(s.phri*100)};width:104px;height:104px"><strong>${pct(s.phri)}</strong></div><div class="risk-copy"><div class="risk-tier">${tier.label}</div><p>${f.climateLabel} · ${s.cycleId}</p></div></div><div class="row-list"><div class="row-item"><span>Sum insured</span><b>${fmtIdr(f.sumInsuredIdr)}</b></div><div class="row-item"><span>Scenario trigger rate</span><b>${pct(f.scenarioStats.triggerRate,1)}</b></div><div class="row-item"><span>Scenario severe-event rate</span><b>${pct(f.scenarioStats.severeRate,1)}</b></div><div class="row-item"><span>Mean data completeness</span><b>${pct(f.scenarioStats.dataCompleteness,1)}</b></div></div></section>`; }

function insurerUnderwriting(){
  const f=farm(),s=scenario(f),b=DATA.portfolioBenchmark;
  $('#pageTitle').textContent='Underwriting'; $('#breadcrumb').textContent=`${f.name} / ${f.id}`;
  $('#view').innerHTML=`${contextBar({showDate:false})}<div class="grid-2"><section class="panel"><div class="panel-head"><h2>Risk profile</h2><span class="tag">${s.cycleId}</span></div>${riskHero(f)}</section><section class="panel"><div class="panel-head"><h2>Farm profile</h2><small>R&D covariates</small></div><div class="row-list"><div class="row-item"><span>Climate zone</span><b>${f.climateLabel}</b></div><div class="row-item"><span>Management-quality index</span><b>${pct(f.managementQuality,0)}</b></div><div class="row-item"><span>Stocking-intensity index</span><b>${f.stockingIntensity.toFixed(2)}</b></div><div class="row-item"><span>Sum-insured weight</span><b>${f.sumInsuredWeight.toFixed(2)}</b></div></div></section></div>
    <div class="grid-equal"><section class="panel"><div class="panel-head"><h2>Parametric contract</h2></div>${triggerChecklist(f)}<div style="margin-top:14px">${payoutLadder(s.phri)}</div></section><section class="panel"><div class="panel-head"><h2>Pricing benchmark</h2><span class="tag">Wang distortion</span></div><div class="row-list"><div class="row-item"><span>Expected payout</span><b>${fmtIdr(b.expectedPayoutIdr)}</b></div><div class="row-item"><span>Distortion premium</span><b>${fmtIdr(b.wangPremiumIdr)}</b></div><div class="row-item"><span>Gross premium</span><b>${fmtIdr(b.grossPremiumIdr)}</b></div><div class="row-item"><span>Wang λ</span><b>${b.wangLambda.toFixed(4)}</b></div></div></section></div>`;
}

function insurerClaims(){
  const rows=portfolioRows().filter(x=>x.s.phri>=.75);
  $('#pageTitle').textContent='Review Trigger'; $('#breadcrumb').textContent=`${state.mode==='stress'?'stress-test snapshot':'operational snapshot'} / PHRI gate`;
  $('#view').innerHTML=`<section class="panel"><div class="panel-head"><h2>PHRI threshold review</h2><small>PHRI ≥ 75% is only the first trigger condition</small></div>${rows.length?`<table class="data-table"><thead><tr><th>Petambak</th><th>PHRI</th><th>Payout tier</th><th>Potential payout</th><th>Status</th></tr></thead><tbody>${rows.map(({f,s})=>{const t=payoutTier(s.phri);return `<tr data-pick-farm="${f.id}"><td>${f.name}<br><span class="mono">${f.id}</span></td><td class="mono">${pct(s.phri)}</td><td class="mono">${Math.round(t.ratio*100)}% SI</td><td class="mono">${compactIdr(f.sumInsuredIdr*t.ratio)}</td><td><span class="pill warn">check remaining conditions</span></td></tr>`}).join('')}</tbody></table>`:`<div style="padding:42px 0;color:var(--muted);text-align:center">Tidak ada profil dengan PHRI ≥ 75% pada snapshot ini. Gunakan <b>Stress test</b> untuk melihat respons pada skenario risiko tinggi.</div>`}</section>
    <div class="grid-equal"><section class="panel"><div class="panel-head"><h2>Contract conditions</h2></div><div class="row-list"><div class="row-item"><span>PHRI gate</span><b>≥ 75%</b></div><div class="row-item"><span>Persistence</span><b>≥ 48 jam</b></div><div class="row-item"><span>Data completeness</span><b>≥ 85%</b></div><div class="row-item"><span>Multivariate confirmation</span><b>≥ 3 / 6 critical parameters</b></div></div></section><section class="panel"><div class="panel-head"><h2>Payout ladder</h2></div>${payoutLadder(rows[0]?.s.phri ?? 0)}</section></div>`;
}

function insurerEvidence(){
  const b=DATA.portfolioBenchmark;
  $('#pageTitle').textContent='Bukti Model'; $('#breadcrumb').textContent='calibrated synthetic reconstruction / not field validation';
  $('#view').innerHTML=`<div class="evidence-strip"><div><span>Scenario population</span><b>240,000</b></div><div><span>Day-60 AUC</span><b>${b.auc.toFixed(4)}</b></div><div><span>Brier</span><b>${b.brier.toFixed(4)}</b></div><div><span>Log loss</span><b>${b.logLoss.toFixed(4)}</b></div><div><span>ECE</span><b>${b.ece.toFixed(4)}</b></div></div>
    <div class="grid-equal" style="margin-top:10px"><section class="panel"><div class="panel-head"><h2>Insurance benchmark</h2></div><div class="row-list"><div class="row-item"><span>Cycle trigger probability</span><b>${pct(b.triggerProbability,2)}</b></div><div class="row-item"><span>AQUASURE negative basis risk</span><b>${pct(b.basisRisk,2)}</b></div><div class="row-item"><span>Relative benchmark reduction</span><b>${b.basisRiskReductionPp.toFixed(2)} pp</b></div><div class="row-item"><span>Evidence status</span><b>Calibrated synthetic</b></div></div></section><section class="panel"><div class="panel-head"><h2>Data contract</h2></div><div class="row-list"><div class="row-item"><span>Operational UI</span><b>7 core variables</b></div><div class="row-item"><span>Offline R&D auxiliaries</span><b>Alkalinity + pathogen pressure</b></div><div class="row-item"><span>Lookback</span><b>60 days</b></div><div class="row-item"><span>Cycle horizon</span><b>120 days</b></div></div><p class="footnote">The Python forecasting notebook consumes nine R&D variables. The deployed presentation surface intentionally exposes the seven core variables specified in the proposal; alkalinity and pathogen pressure remain offline auxiliary fields.</p></section></div>
    <section class="panel"><div class="panel-head"><h2>Source-of-truth chain</h2><span class="tag">Python → generated web bundle</span></div><div class="row-list"><div class="row-item"><span>01 Synthetic pond generator</span><b>pond_timeseries.csv</b></div><div class="row-item"><span>02 Biological outcomes</span><b>biological_cycles.csv</b></div><div class="row-item"><span>03 Forecast checkpoint</span><b>forecast_training_results.csv</b></div><div class="row-item"><span>04 Pricing scenarios</span><b>240k scenario population</b></div><div class="row-item"><span>05 Evaluation</span><b>evaluation_metrics.json</b></div></div></section>`;
}

function render(){
  $('#workspaceLabel').textContent=state.role==='farmer'?'PETAMBAK':'UNDERWRITER';
  const map={farmer:{overview:farmerOverview,water:farmerWater,risk:farmerRisk,policy:farmerPolicy},insurer:{portfolio:insurerPortfolio,underwriting:insurerUnderwriting,claims:insurerClaims,evidence:insurerEvidence}};
  buildNav(); (map[state.role][state.page] ?? Object.values(map[state.role])[0])(); wireView();
}
function buildNav(){
  $('#nav').innerHTML=navs[state.role].map(([k,l])=>`<button class="${state.page===k?'active':''}" data-page="${k}" type="button">${l}</button>`).join('');
  $$('[data-page]').forEach(b=>b.onclick=()=>{state.page=b.dataset.page;render()});
}
function wireView(){
  $$('[data-control="farm"]').forEach(el=>el.onchange=()=>{state.farmId=el.value;render()});
  $$('[data-control="date"]').forEach(el=>el.onchange=()=>{state.date=el.value;render()});
  $$('[data-variable]').forEach(el=>el.onclick=()=>{state.variable=el.dataset.variable;render()});
  $$('[data-pick-farm]').forEach(el=>el.onclick=()=>{state.farmId=el.dataset.pickFarm;if(state.role==='insurer'&&state.page==='portfolio'){render()}else{state.page='underwriting';render()}});
}

function initLogin(){
  const select=$('#loginFarm'); select.innerHTML=DATA.farms.map(f=>`<option value="${f.id}">${f.name} · ${f.climateLabel}</option>`).join('');
  $$('.role-option').forEach(btn=>btn.onclick=()=>{
    $$('.role-option').forEach(x=>x.classList.toggle('active',x===btn)); state.role=btn.dataset.role;
    $('#farmField').hidden=state.role==='insurer'; $('#enterButton').textContent=state.role==='farmer'?'Buka dashboard petambak':'Buka workspace underwriter';
  });
  $('#enterButton').onclick=()=>{
    state.farmId=$('#loginFarm').value || DATA.farms[0].id;
    state.page=state.role==='farmer'?'overview':'portfolio';
    $('#login').hidden=true; $('#app').hidden=false; render();
  };
  $('#logoutButton').onclick=()=>{$('#app').hidden=true;$('#login').hidden=false};
  $$('[data-mode]').forEach(btn=>btn.onclick=()=>{
    state.mode=btn.dataset.mode; $$('[data-mode]').forEach(x=>x.classList.toggle('active',x.dataset.mode===state.mode));
    toast(state.mode==='stress'?'Stress-test snapshot aktif':'Operational snapshot aktif'); render();
  });
}

initLogin();
