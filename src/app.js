import { AQUASURE_DATA as DATA } from './data/generatedData.js';

const state = {
  role: 'farmer',
  page: 'overview',
  farmId: DATA.farms[0].id,
  mode: 'operational',
  date: DATA.demoDate,
  variable: 'do',
  calendarMonth: DATA.demoDate.slice(0,7),
};

const navs = {
  farmer: [
    ['overview','Ringkasan'],
    ['water','Kualitas Air'],
    ['risk','Prediksi Risiko'],
    ['calendar','Kalender Forecast'],
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

function dailyWatch(row){
  const flagged=coreOrder.filter(k=>variableStatus(k,row[k])[1]);
  return {count:flagged.length, keys:flagged, tone:flagged.length>=3?'bad':flagged.length>0?'warn':'good'};
}
function monthLabel(ym){
  const [y,m]=ym.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));
}
function shiftMonth(ym,delta){
  const [y,m]=ym.split('-').map(Number); const d=new Date(y,m-1+delta,1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function availableMonths(f=farm()){
  return [...new Set(scenario(f).series.map(r=>r.date.slice(0,7)))].sort();
}
function calendarGrid(f=farm()){
  const s=scenario(f), rows=new Map(s.series.map(r=>[r.date,r]));
  const [y,m]=state.calendarMonth.split('-').map(Number);
  const first=new Date(y,m-1,1), days=new Date(y,m,0).getDate();
  const mondayOffset=(first.getDay()+6)%7;
  const cells=[];
  for(let i=0;i<mondayOffset;i++) cells.push('<div class="cal-cell cal-empty"></div>');
  for(let day=1;day<=days;day++){
    const ds=`${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const row=rows.get(ds);
    if(!row){ cells.push(`<div class="cal-cell cal-disabled"><span class="cal-daynum">${day}</span></div>`); continue; }
    const w=dailyWatch(row), selected=ds===state.date, checkpoint=row.day===DATA.lookbackDays;
    const flagText=w.count===0?'0 watch':`${w.count} watch`;
    cells.push(`<button type="button" data-calendar-date="${ds}" class="cal-cell cal-data ${w.tone} ${selected?'selected':''}">
      <span class="cal-daynum">${day}</span><span class="cal-cycle">D${row.day}</span>
      <b>${flagText}</b>${checkpoint?'<em>PHRI checkpoint</em>':''}
    </button>`);
  }
  return cells.join('');
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


function farmerCalendar(){
  const f=farm(), s=scenario(f), row=rowAtOrBeforeDate(f), watch=dailyWatch(row), months=availableMonths(f);
  if(!months.includes(state.calendarMonth)) state.calendarMonth=months.at(-1);
  const idx=months.indexOf(state.calendarMonth), prev=idx>0, next=idx>=0&&idx<months.length-1;
  const checkpoint=row.day===DATA.lookbackDays;
  const official=checkpoint?`${pct(s.phri)} · ${riskTier(s.phri).label}`:'Belum dihitung';
  const flagged=watch.keys.length?watch.keys.map(k=>DATA.coreVariables[k].label).join(', '):'Tidak ada parameter melewati batas R&D';
  $('#pageTitle').textContent='Kalender Forecast Harian'; $('#breadcrumb').textContent=`${f.name} / ${s.cycleId} / 60-day model input`;
  $('#view').innerHTML=`${contextBar()}
    <div class="calendar-layout">
      <section class="panel calendar-panel"><div class="panel-head"><div><h2>Kalender 60 hari</h2><div class="panel-sub">Synthetic daily water-quality path yang menjadi input model</div></div><div class="calendar-nav"><button type="button" data-calendar-nav="-1" ${prev?'':'disabled'}>←</button><b>${monthLabel(state.calendarMonth)}</b><button type="button" data-calendar-nav="1" ${next?'':'disabled'}>→</button></div></div>
        <div class="calendar-weekdays">${['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(x=>`<span>${x}</span>`).join('')}</div>
        <div class="calendar-grid">${calendarGrid(f)}</div>
        <div class="calendar-legend"><span><i class="good"></i>0 threshold watch</span><span><i class="warn"></i>1–2 threshold watch</span><span><i class="bad"></i>≥3 threshold watch</span></div>
      </section>
      <section class="panel calendar-detail"><div class="panel-head"><h2>${formatDate(row.date)}</h2><span class="tag">Day ${row.day}</span></div>
        <div class="calendar-kpis"><div><span>Daily watch</span><b class="${watch.tone}">${watch.count}/7</b></div><div><span>Official MDN-LSTM PHRI</span><b>${official}</b></div></div>
        <p class="calendar-note">${checkpoint?'Hari ke-60 memenuhi lookback model. PHRI di atas adalah output resmi trained MDN-LSTM untuk siklus ini.':'PHRI tidak diinterpolasi untuk hari ini. Model AQUASURE yang dilatih membutuhkan 60 hari observasi; kalender menampilkan input water-quality harian agar tidak mengarang daily PHRI.'}</p>
        <div class="row-list"><div class="row-item"><span>Parameter watch</span><b>${flagged}</b></div><div class="row-item"><span>Forecast target</span><b>End-cycle harvest health</b></div><div class="row-item"><span>Model lookback</span><b>60 days · 7 core variables</b></div></div>
      </section>
    </div>
    <section class="panel"><div class="panel-head"><h2>Snapshot harian</h2><small>nilai yang sama persis dari generatedData.js</small></div>${parameterCards(f)}</section>
    <p class="footnote calendar-disclaimer">Kalender ini adalah visualisasi trajectory synthetic harian yang dipakai sebagai input forecasting. Warna sel menunjukkan jumlah parameter yang melewati reference threshold R&D, bukan probabilitas PHRI harian. Official PHRI hanya ditampilkan pada Day 60 agar konsisten dengan trained model.</p>`;
}

function farmerPolicy(){
  const f=farm(),s=scenario(f),tier=payoutTier(s.phri),amount=f.sumInsuredIdr*tier.ratio,b=DATA.portfolioBenchmark;
  $('#pageTitle').textContent='Polis & Proteksi'; $('#breadcrumb').textContent=`${f.name} / pure parametric contract`;
  $('#view').innerHTML=`${contextBar({showDate:false})}
    <div class="kpi-grid"><div class="kpi primary"><div class="label">Sum insured</div><div class="value">${compactIdr(f.sumInsuredIdr)}</div><div class="note">scenario-specific exposure</div></div><div class="kpi"><div class="label">Current PHRI tier</div><div class="value">${pct(s.phri)}</div><div class="note">${riskTier(s.phri).label}</div></div><div class="kpi"><div class="label">Payout rate</div><div class="value">${Math.round(tier.ratio*100)}%</div><div class="note">if all trigger conditions are met</div></div><div class="kpi"><div class="label">Payout amount</div><div class="value">${compactIdr(amount)}</div><div class="note">pre-agreed parametric amount</div></div></div>
    <section class="panel"><div class="panel-head"><h2>Contract ladder</h2><span class="tag">PHRI threshold structure</span></div>${payoutLadder(s.phri)}</section>
    <div class="grid-equal"><section class="panel"><div class="panel-head"><h2>Contract conditions</h2></div>${triggerChecklist(f)}</section><section class="panel"><div class="panel-head"><h2>Ilustrasi premi petambak</h2><small>allocated from portfolio prototype benchmark</small></div><div class="row-list"><div class="row-item"><span>Expected payout share</span><b>${fmtIdr(f.pricing.expectedPayoutIdr)}</b></div><div class="row-item"><span>Risk-adjusted premium</span><b>${fmtIdr(f.pricing.distortionPremiumIdr)}</b></div><div class="row-item"><span>Illustrative gross premium</span><b>${fmtIdr(f.pricing.grossPremiumIdr)}</b></div><div class="row-item"><span>Portfolio benchmark total</span><b>${fmtIdr(b.grossPremiumIdr)}</b></div></div><p class="footnote">Farm-level values are a mathematically reconciled allocation of the portfolio prototype benchmark and sum back to the portfolio totals. They are not independent commercial quotations.</p></section></div>`;
}

function portfolioRows(){ return DATA.farms.map(f=>({f,s:f[state.mode],tier:riskTier(f[state.mode].phri)})); }
function selectedInsurerFarm(){ return farm(); }
function totalExposure(){ return DATA.farms.reduce((a,f)=>a+f.sumInsuredIdr,0); }

function insurerPortfolio(){
  const rows=portfolioRows(), threshold=rows.filter(x=>x.s.phri>=.75), avg=rows.reduce((a,x)=>a+x.s.phri,0)/rows.length;
  $('#pageTitle').textContent='Portofolio'; $('#breadcrumb').textContent=`12 petambak / ${state.mode==='stress'?'stress-test snapshot':'operational snapshot'}`;
  $('#view').innerHTML=`<div class="kpi-grid"><div class="kpi primary"><div class="label">Petambak tertanggung</div><div class="value">12</div><div class="note">12 synthetic farm profiles</div></div><div class="kpi"><div class="label">Total exposure</div><div class="value">${compactIdr(totalExposure())}</div><div class="note">combined Sum Insured</div></div><div class="kpi"><div class="label">Average PHRI</div><div class="value">${pct(avg)}</div><div class="note">current portfolio snapshot</div></div><div class="kpi"><div class="label">PHRI ≥ 75%</div><div class="value ${threshold.length?'warn':'good'}">${threshold.length}</div><div class="note">requires remaining trigger checks</div></div></div>
    <div class="grid-2"><section class="table-panel"><table class="data-table"><thead><tr><th>Petambak</th><th>Environment</th><th>Cycle</th><th>PHRI</th><th>Sum insured</th><th>Illustrative premium</th></tr></thead><tbody>${rows.map(({f,s,tier})=>`<tr data-pick-farm="${f.id}" class="${f.id===state.farmId?'active':''}"><td><span class="risk-dot ${tier.class}"></span>${f.name}<br><span class="mono">${f.id}</span></td><td>${f.climateLabel}</td><td class="mono">${s.cycleId.split('_').at(-1)}</td><td class="mono">${pct(s.phri)}</td><td class="mono">${compactIdr(f.sumInsuredIdr)}</td><td class="mono">${compactIdr(f.pricing.grossPremiumIdr)}</td></tr>`).join('')}</tbody></table></section>${underwriterDetail(selectedInsurerFarm())}</div>`;
}
function underwriterDetail(f){ const s=scenario(f),tier=riskTier(s.phri); return `<section class="panel"><div class="panel-head"><h2>${f.name}</h2><span class="tag">${f.id}</span></div><div class="risk-hero" style="min-height:150px"><div class="risk-ring" style="--p:${Math.round(s.phri*100)};width:104px;height:104px"><strong>${pct(s.phri)}</strong></div><div class="risk-copy"><div class="risk-tier">${tier.label}</div><p>${f.climateLabel} · ${s.cycleId}</p></div></div><div class="row-list"><div class="row-item"><span>Sum insured</span><b>${fmtIdr(f.sumInsuredIdr)}</b></div><div class="row-item"><span>Illustrative gross premium</span><b>${fmtIdr(f.pricing.grossPremiumIdr)}</b></div><div class="row-item"><span>Scenario trigger rate</span><b>${pct(f.scenarioStats.triggerRate,1)}</b></div><div class="row-item"><span>Scenario severe-event rate</span><b>${pct(f.scenarioStats.severeRate,1)}</b></div><div class="row-item"><span>Mean data completeness</span><b>${pct(f.scenarioStats.dataCompleteness,1)}</b></div></div></section>`; }

function insurerUnderwriting(){
  const f=farm(),s=scenario(f),b=DATA.portfolioBenchmark;
  $('#pageTitle').textContent='Underwriting'; $('#breadcrumb').textContent=`${f.name} / ${f.id}`;
  $('#view').innerHTML=`${contextBar({showDate:false})}<div class="grid-2"><section class="panel"><div class="panel-head"><h2>Risk profile</h2><span class="tag">${s.cycleId}</span></div>${riskHero(f)}</section><section class="panel"><div class="panel-head"><h2>Farm profile</h2><small>R&D covariates</small></div><div class="row-list"><div class="row-item"><span>Climate zone</span><b>${f.climateLabel}</b></div><div class="row-item"><span>Management-quality index</span><b>${pct(f.managementQuality,0)}</b></div><div class="row-item"><span>Stocking-intensity index</span><b>${f.stockingIntensity.toFixed(2)}</b></div><div class="row-item"><span>Sum-insured weight</span><b>${f.sumInsuredWeight.toFixed(2)}</b></div></div></section></div>
    <div class="grid-equal"><section class="panel"><div class="panel-head"><h2>Parametric contract</h2></div>${triggerChecklist(f)}<div style="margin-top:14px">${payoutLadder(s.phri)}</div></section><section class="panel"><div class="panel-head"><h2>Ilustrasi pricing petambak</h2><span class="tag">portfolio-reconciled allocation</span></div><div class="row-list"><div class="row-item"><span>Expected payout share</span><b>${fmtIdr(f.pricing.expectedPayoutIdr)}</b></div><div class="row-item"><span>Risk-adjusted premium</span><b>${fmtIdr(f.pricing.distortionPremiumIdr)}</b></div><div class="row-item"><span>Illustrative gross premium</span><b>${fmtIdr(f.pricing.grossPremiumIdr)}</b></div><div class="row-item"><span>Portfolio gross premium</span><b>${fmtIdr(b.grossPremiumIdr)}</b></div></div><p class="footnote">This is an allocation of the legacy portfolio benchmark using each farm's synthetic payout-risk share; it is not an independently underwritten quote.</p></section></div>`;
}

function insurerClaims(){
  const rows=portfolioRows().filter(x=>x.s.phri>=.75);
  $('#pageTitle').textContent='Review Trigger'; $('#breadcrumb').textContent=`${state.mode==='stress'?'stress-test snapshot':'operational snapshot'} / PHRI gate`;
  $('#view').innerHTML=`<section class="panel"><div class="panel-head"><h2>PHRI threshold review</h2><small>PHRI ≥ 75% is only the first trigger condition</small></div>${rows.length?`<table class="data-table"><thead><tr><th>Petambak</th><th>PHRI</th><th>Payout tier</th><th>Potential payout</th><th>Status</th></tr></thead><tbody>${rows.map(({f,s})=>{const t=payoutTier(s.phri);return `<tr data-pick-farm="${f.id}"><td>${f.name}<br><span class="mono">${f.id}</span></td><td class="mono">${pct(s.phri)}</td><td class="mono">${Math.round(t.ratio*100)}% SI</td><td class="mono">${compactIdr(f.sumInsuredIdr*t.ratio)}</td><td><span class="pill warn">check remaining conditions</span></td></tr>`}).join('')}</tbody></table>`:`<div style="padding:42px 0;color:var(--muted);text-align:center">Tidak ada profil dengan PHRI ≥ 75% pada snapshot ini. Gunakan <b>Stress test</b> untuk melihat respons pada skenario risiko tinggi.</div>`}</section>
    <div class="grid-equal"><section class="panel"><div class="panel-head"><h2>Contract conditions</h2></div><div class="row-list"><div class="row-item"><span>PHRI gate</span><b>≥ 75%</b></div><div class="row-item"><span>Persistence</span><b>≥ 48 jam</b></div><div class="row-item"><span>Data completeness</span><b>≥ 85%</b></div><div class="row-item"><span>Multivariate confirmation</span><b>≥ 3 / 6 critical parameters</b></div></div></section><section class="panel"><div class="panel-head"><h2>Payout ladder</h2></div>${payoutLadder(rows[0]?.s.phri ?? 0)}</section></div>`;
}

function insurerEvidence(){
  const b=DATA.portfolioBenchmark, m=DATA.modelValidation, q=m.metrics;
  $('#pageTitle').textContent='Bukti Model'; $('#breadcrumb').textContent='trained MDN-LSTM validation + separate legacy insurance benchmark';
  $('#view').innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Trained MDN-LSTM · nested farm-grouped validation</h2><div class="panel-sub">960 synthetic cycles · 6 outer folds · entire farms held out</div></div><span class="tag">${m.scope}</span></div>
    <div class="evidence-strip evidence-six"><div><span>AUC</span><b>${q.phri_auc.toFixed(4)}</b></div><div><span>Brier</span><b>${q.phri_brier.toFixed(4)}</b></div><div><span>Log loss</span><b>${q.phri_logloss.toFixed(4)}</b></div><div><span>ECE</span><b>${q.phri_ece10.toFixed(4)}</b></div><div><span>RMSE</span><b>${q.rmse.toFixed(4)}</b></div><div><span>CRPS</span><b>${q.mean_crps.toFixed(4)}</b></div></div>
    <p class="footnote">These are the actual PyTorch MDN-LSTM out-of-farm metrics. They are synthetic development evidence, not real-pond field performance.</p></section>
    <div class="grid-equal"><section class="panel"><div class="panel-head"><h2>Legacy insurance benchmark</h2><span class="tag">separate from model validation</span></div><div class="row-list"><div class="row-item"><span>Scenario population</span><b>240,000</b></div><div class="row-item"><span>Old benchmark AUC</span><b>${b.auc.toFixed(4)}</b></div><div class="row-item"><span>Negative basis risk</span><b>${pct(b.basisRisk,2)}</b></div><div class="row-item"><span>Reduction vs coarse benchmark</span><b>${b.basisRiskReductionPp.toFixed(2)} pp</b></div><div class="row-item"><span>Evidence status</span><b>Calibrated synthetic reconstruction</b></div></div></section>
    <section class="panel"><div class="panel-head"><h2>Pricing benchmark</h2><small>portfolio-level prototype</small></div><div class="row-list"><div class="row-item"><span>Total Sum Insured</span><b>${fmtIdr(b.totalSumInsuredIdr)}</b></div><div class="row-item"><span>Expected payout</span><b>${fmtIdr(b.expectedPayoutIdr)}</b></div><div class="row-item"><span>Wang distortion premium</span><b>${fmtIdr(b.wangPremiumIdr)}</b></div><div class="row-item"><span>Gross premium</span><b>${fmtIdr(b.grossPremiumIdr)}</b></div></div></section></div>
    <div class="grid-equal"><section class="panel"><div class="panel-head"><h2>Current model contract</h2></div><div class="row-list"><div class="row-item"><span>Inputs</span><b>7 core water-quality variables</b></div><div class="row-item"><span>Lookback</span><b>60 days</b></div><div class="row-item"><span>Target</span><b>End-cycle harvest-health distribution</b></div><div class="row-item"><span>PHRI</span><b>P(H &lt; H* | X1:60)</b></div><div class="row-item"><span>Architecture</span><b>LSTM 64 · 2 Gaussian components</b></div></div></section>
    <section class="panel"><div class="panel-head"><h2>Source-of-truth chain</h2><span class="tag">retrained package</span></div><div class="row-list"><div class="row-item"><span>01 Pond generator</span><b>synthetic trajectories</b></div><div class="row-item"><span>02 Biological model</span><b>synthetic labels</b></div><div class="row-item"><span>03 Trained MDN-LSTM</span><b>PyTorch · grouped OOF</b></div><div class="row-item"><span>04–05 Pricing/evaluation</span><b>legacy calibrated benchmark</b></div></div></section></div>`;
}

function render(){
  $('#workspaceLabel').textContent=state.role==='farmer'?'PETAMBAK':'UNDERWRITER';
  const map={farmer:{overview:farmerOverview,water:farmerWater,risk:farmerRisk,calendar:farmerCalendar,policy:farmerPolicy},insurer:{portfolio:insurerPortfolio,underwriting:insurerUnderwriting,claims:insurerClaims,evidence:insurerEvidence}};
  buildNav(); (map[state.role][state.page] ?? Object.values(map[state.role])[0])(); wireView();
}
function buildNav(){
  $('#nav').innerHTML=navs[state.role].map(([k,l])=>`<button class="${state.page===k?'active':''}" data-page="${k}" type="button">${l}</button>`).join('');
  $$('[data-page]').forEach(b=>b.onclick=()=>{state.page=b.dataset.page;render()});
}
function wireView(){
  $$('[data-control="farm"]').forEach(el=>el.onchange=()=>{state.farmId=el.value; const months=availableMonths(); if(!months.includes(state.calendarMonth)) state.calendarMonth=months.at(-1); render()});
  $$('[data-control="date"]').forEach(el=>el.onchange=()=>{state.date=el.value; state.calendarMonth=el.value.slice(0,7); render()});
  $$('[data-variable]').forEach(el=>el.onclick=()=>{state.variable=el.dataset.variable;render()});
  $$('[data-calendar-date]').forEach(el=>el.onclick=()=>{state.date=el.dataset.calendarDate; state.calendarMonth=state.date.slice(0,7); render()});
  $$('[data-calendar-nav]').forEach(el=>el.onclick=()=>{const months=availableMonths(), next=shiftMonth(state.calendarMonth,Number(el.dataset.calendarNav)); if(months.includes(next)){state.calendarMonth=next; render();}});
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
    const s=scenario(); if(!s.series.some(r=>r.date===state.date)) state.date=s.series.at(-1).date; state.calendarMonth=state.date.slice(0,7);
    toast(state.mode==='stress'?'Stress-test snapshot aktif':'Operational snapshot aktif'); render();
  });
}

initLogin();
