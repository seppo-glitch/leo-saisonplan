{
'use strict';
const P = window.PLAN, C = window.CONFIG || {};
const T = P.teams;
const R0 = P.range.start, R1 = P.range.end;
// Phasentypen: [Name, Farbe, Priorität bei Überschneidung]
const PT = {saison:['Saison','var(--saison)',1],sommer:['Sommertraining','var(--sommer)',1],trans:['Übergang','var(--trans)',2],urlaub:['Urlaub','var(--urlaub)',3],camp:['Trainingscamp','var(--camp)',4]};
const OUT = {t:'out'};
const DT = {'':'Training',rest:'Ruhetag',travel:'Reisetag',test:'Testtag'};
const MON=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],MONL=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],DN=['So','Mo','Di','Mi','Do','Fr','Sa'];
const D=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(Date.UTC(y,m-1,d))};
const iso=d=>d.toISOString().slice(0,10), add=(d,n)=>new Date(d.getTime()+n*864e5);
const isDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kw=d=>{const t=new Date(d);t.setUTCDate(t.getUTCDate()-((t.getUTCDay()+6)%7)+3);const f=new Date(Date.UTC(t.getUTCFullYear(),0,4));return 1+Math.round(((t-f)/864e5-3+((f.getUTCDay()+6)%7))/7)};
const $=id=>document.getElementById(id);

const START=iso(add(D(R0),-((D(R0).getUTCDay()+6)%7)));
const NW=Math.floor((D(R1)-D(START))/864e5/7)+1;
const weeks=Array.from({length:NW},(_,i)=>iso(add(D(START),7*i)));
const wdays=w=>Array.from({length:7},(_,i)=>iso(add(D(w),i)));

// ---------- Standardplan aus plan.js ----------
const defPhases=()=>P.phases.map(p=>({t:p.key,from:p.from,to:p.to,label:p.key==='camp'?'Finnland':''})).concat(P.aprilCampDefault?[{t:'camp',from:P.aprilCampDefault,to:iso(add(D(P.aprilCampDefault),6)),label:'Finnland'}]:[]);
const defGames=()=>P.games.map(g=>[...g]);
function cleanPhases(a){return Array.isArray(a)?a.filter(p=>p&&typeof p==='object').slice(0,60).map(p=>({t:PT[p.t]?p.t:'urlaub',from:String(p.from||'').slice(0,10),to:String(p.to||'').slice(0,10),label:String(p.label||'').slice(0,40)})):null}
function cleanGames(a){return Array.isArray(a)?a.filter(Array.isArray).slice(0,150).map(g=>[String(g[0]||'').slice(0,10),String(g[1]||'').slice(0,5),g[2]==='A'?'A':'H',T[g[3]]?g[3]:'X',String(g[4]||'').slice(0,40)]):null}

// ---------- Zustand ----------
const REMOTE=!!(C.supabaseUrl&&C.supabaseAnonKey);
const LSK='bb-plan-'+(C.planId||'default')+(REMOTE?'-remote':''), DK=LSK+'-dirty';
const S={days:{},weeks:{},settings:{phases:defPhases(),games:defGames()}};
function setSettings(x){if(!x||typeof x!=='object')return;
 const ph=cleanPhases(x.phases),gm=cleanGames(x.games);
 if(ph)S.settings.phases=ph;else if(isDate(x.aprCamp)){S.settings.phases=defPhases().map(p=>p.from===P.aprilCampDefault&&p.t==='camp'?{...p,from:x.aprCamp,to:iso(add(D(x.aprCamp),6))}:p)}
 if(gm)S.settings.games=gm}
let LS=null, dirty=new Set();
try{LS=window.localStorage;const x=JSON.parse(LS.getItem(LSK)||'null');if(x){Object.assign(S.days,x.days||{});Object.assign(S.weeks,x.weeks||{});setSettings(x.settings)}dirty=new Set(JSON.parse(LS.getItem(DK)||'[]'))}catch(e){LS=null}
const local=()=>{try{LS&&(LS.setItem(LSK,JSON.stringify(S)),LS.setItem(DK,JSON.stringify([...dirty])))}catch(e){}};

// ---------- Ableitungen ----------
let GM={};
const validPhase=p=>PT[p.t]&&isDate(p.from)&&isDate(p.to)&&p.from<=p.to;
const validGame=g=>isDate(g[0])&&(g[3]!=='X'||g[4]);
function rebuildGames(){GM={};S.settings.games.filter(validGame).forEach(g=>{GM[g[0]]=g})}
function phase(s){if(s<R0||s>R1)return OUT;let best=null;
 for(const p of S.settings.phases){if(!validPhase(p)||s<p.from||s>p.to)continue;if(!best||PT[p.t][2]>PT[best.t][2]||(PT[p.t][2]===PT[best.t][2]&&p.from>best.from))best=p}
 return best||{t:'none'}}
const col=p=>PT[p.t]?PT[p.t][1]:'var(--trans)';
const pname=p=>!PT[p.t]?'':p.t==='camp'?'Camp'+(p.label?' '+p.label:''):PT[p.t][0]+(p.label?' · '+p.label:'');
function wphase(w){const c={},o={};wdays(w).forEach(d=>{const p=phase(d);if(!PT[p.t])return;c[p.t]=(c[p.t]||0)+1;o[p.t]=p});
 const ks=Object.keys(c);if(!ks.length)return OUT;ks.sort((a,b)=>(PT[b][2]>2||PT[a][2]>2)?PT[b][2]-PT[a][2]:c[b]-c[a]);return o[ks[0]]}
const oppName=g=>g[3]==='X'?g[4]:T[g[3]][0];
const oppShort=g=>g[3]==='X'?g[4].split(/\s+/).filter(Boolean).map(w=>w[0]).join('').slice(0,3).toUpperCase():T[g[3]][2];
const venue=g=>g[2]==='H'?P.player.homeVenue:(g[3]==='X'?'auswärts':T[g[3]][1]);

const now=new Date(),todayIso=iso(new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())));
const weekOf=s=>{const n=Math.floor((D(s)-D(START))/864e5/7);return n<0?0:n>=NW?NW-1:n};
const hashWeek=()=>{const m=location.hash.match(/^#w-(\d{4})(\d{2})(\d{2})$/);return m?weekOf(`${m[1]}-${m[2]}-${m[3]}`):null};
const homeWeek=()=>todayIso>=START&&todayIso<=R1?weekOf(todayIso):0;
let cur=hashWeek()??homeWeek(), readonly=REMOTE;
if(REMOTE)document.body.classList.add('ro');

// ---------- Kopf ----------
const pl=P.player, fmt=s=>`${s.slice(8)}.${s.slice(5,7)}.${s.slice(0,4)}`;
$('pname').innerHTML=`${esc(pl.name)} <span class="num">#${esc(pl.number)}</span>`;
$('pmeta').textContent=`${pl.position} · ${pl.club} · ${pl.league}`;
$('prange').textContent=`Saisonplan ${fmt(R0)} – ${fmt(R1)}`;
$('foot').innerHTML=`<b>BB Sports Management</b> · Bernd Brückler Sports Management. Spielplan Stand ${esc(P.asOf)}; Termine und Anspielzeiten können sich durch die Liga ändern.`;
$('legend').innerHTML=['saison','urlaub','camp','sommer','trans'].map(p=>`<span><i style="--c:${PT[p][1]}"></i>${PT[p][0]}</span>`).join('')+'<span><i class="gh"></i>Heimspiel</span><span><i class="g"></i>Auswärtsspiel</span>';

const badge=g=>g[3]==='X'?`<span class="badge"><span class="mono">${esc(oppShort(g))}</span></span>`:`<span class="badge"><span class="mono">${esc(T[g[3]][2])}</span><img src="logos/${g[3]}.png" alt="" onerror="this.remove()"></span>`;

// ---------- Darstellung ----------
function renderRibbon(){
 $('segs').innerHTML=weeks.map((w,i)=>{const p=wphase(w),a=wdays(w),gs=a.map(d=>GM[d]).filter(Boolean);
  return `<button class="seg${i===cur?' on':''}" style="--c:${col(p)}" data-i="${i}" aria-label="KW ${kw(D(w))}, ${a[0].slice(8)}.${a[0].slice(5,7)}. bis ${a[6].slice(8)}.${a[6].slice(5,7)}., ${esc(pname(p)||'ohne Phase')}${gs.length?', '+gs.length+' Spiele':''}" title="${esc(pname(p))}"><span class="dots">${gs.map(g=>`<i class="${g[2]==='H'?'h':''}"></i>`).join('')}</span></button>`}).join('');
 let last=-1;$('mons').innerHTML=weeks.map(w=>{const m=add(D(w),3).getUTCMonth();const s=m!==last?MON[m]:'';last=m;return `<span>${s}</span>`}).join('');
}

function dayHtml(d){const p=phase(d),dt=D(d),g=GM[d];
 const gh=g?`<div class="game ${g[2]==='H'?'h':'a'}">${badge(g)}<span class="ha">${g[2]==='H'?'HEIM':'AUSWÄRTS'}</span><span class="opp">${g[2]==='H'?'vs ':'@ '}${esc(oppName(g))}</span><span class="gm">${g[1]?esc(g[1])+' Uhr · ':''}${esc(venue(g))}</span></div>`:'';
 const f=p.t==='out'?'<p class="small" style="margin:0">Außerhalb des Planungszeitraums</p>':`
  <label class="lab">Tagesart<select data-k="t">${Object.entries(DT).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
  <label class="lab">Fokus<input class="in" data-k="f" list="foci" placeholder="${g?'Spieltag':'z. B. Kraft Maximal'}" autocomplete="off"></label>
  <label class="lab">Trainingsprogramm<textarea data-k="p" rows="4" placeholder="Einheiten, Inhalte, Sätze × Wdh., Umfang …"></textarea></label>
  <div class="row"><label class="lab">RPE (1–10)<select data-k="rpe"><option value="">–</option>${[1,2,3,4,5,6,7,8,9,10].map(n=>`<option>${n}</option>`).join('')}</select></label><label class="lab">Minuten<input class="in" data-k="min" type="number" inputmode="numeric" min="0" max="600"></label></div>
  <div class="ft"><span>Last <span class="ld" data-load></span></span><label class="chk"><input type="checkbox" data-k="done">erledigt</label></div>
  <div class="pv" data-pv></div>`;
 return `<article class="day${p.t==='out'?' out':''}${d===todayIso?' today':''}" style="--c:${col(p)}" data-d="${d}"><div class="dh"><span class="dd">${String(dt.getUTCDate()).padStart(2,'0')}</span><span class="dn">${DN[dt.getUTCDay()]}</span><span class="dm">${MON[dt.getUTCMonth()]}</span>${PT[p.t]?`<span class="ph" title="${esc(pname(p))}">${esc(pname(p))}</span>`:''}</div><span class="dtag" data-dt></span>${gh}${f}</article>`}

function renderWeek(){const w=weeks[cur],ds=wdays(w),a=D(ds[0]),b=D(ds[6]);
 $('kw').textContent=`KW ${kw(a)} · ${pname(wphase(w))||'ohne Phase'}`;
 $('wtitle').textContent=a.getUTCMonth()===b.getUTCMonth()?`${a.getUTCDate()}.–${b.getUTCDate()}. ${MONL[b.getUTCMonth()]} ${b.getUTCFullYear()}`:`${a.getUTCDate()}. ${MONL[a.getUTCMonth()]} – ${b.getUTCDate()}. ${MONL[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
 $('days').innerHTML=ds.map(dayHtml).join('');
 const marchHoliday=ds.some(d=>{const p=phase(d);return p.t==='urlaub'&&p.from>='2027-03-01'&&p.from<='2027-03-31'});
 $('hint').innerHTML=marchHoliday?'<p class="hint">Urlaub gilt nur, wenn die Pioneers die Pre-Playoffs (Platz 7–10) verpassen. Sonst Urlaub und Camp unter „Planung anpassen“ verschieben.</p>':(ds.some(d=>d>R1)?'<p class="hint">Ende des Planungszeitraums. Ab September beginnt die Vorbereitung auf die nächste Saison.</p>':'');
 document.querySelectorAll('.seg').forEach((s,i)=>{s.classList.toggle('on',i===cur);i===cur?s.setAttribute('aria-current','true'):s.removeAttribute('aria-current')});
 sync(true)}

function sync(force){const w=weeks[cur],ds=wdays(w);
 document.querySelectorAll('.day').forEach(el=>{const v=S.days[el.dataset.d]||{};
  el.querySelectorAll('[data-k]').forEach(f=>{if(f===document.activeElement&&!force)return;const k=f.dataset.k;if(f.type==='checkbox')f.checked=!!v[k];else if(f.value!==String(v[k]??''))f.value=v[k]??'';f.disabled=readonly});
  const t=DT[v.t]&&v.t?v.t:'';el.classList.toggle('rest',t==='rest');const tag=el.querySelector('[data-dt]');tag.textContent=t?DT[t]:'';tag.hidden=!t;tag.className='dtag dt-'+(t||'none');
  const x=(+v.rpe||0)*(+v.min||0),l=el.querySelector('[data-load]');if(l)l.textContent=x?x+' AU':'–';
  const pv=el.querySelector('[data-pv]');if(pv)pv.innerHTML=((v.f?`<b>Fokus</b>${esc(v.f)}`:'')+(v.p?`<b>Programm</b>${esc(v.p)}`:'')+(x?`<b>Last</b>${esc(v.rpe)} × ${esc(v.min)} = ${x} AU`:'')+(v.done?'<b>Status</b>erledigt ✓':''))||(t?'':'<span class="none">Kein Eintrag</span>')});
 const note=(S.weeks[w]||{}).note||'',n=$('wnote');if(n!==document.activeElement||force)n.value=note;n.disabled=readonly;
 $('notesPrint').textContent=note||(readonly?'Keine Wochennotizen.':'');
 const gs=ds.map(d=>GM[d]).filter(Boolean),h=gs.filter(g=>g[2]==='H').length;
 let load=0,mins=0,done=0,plan=0,rest=0;ds.forEach(d=>{const v=S.days[d]||{};load+=(+v.rpe||0)*(+v.min||0);mins+=+v.min||0;if(v.done)done++;if(v.f||v.p)plan++;if(v.t==='rest')rest++});
 $('stats').innerHTML=[[String(gs.length),gs.length?`Spiele · ${h} Heim / ${gs.length-h} Auswärts`:'Spiele diese Woche'],[load?load.toLocaleString('de-AT'):'–','Wochenlast (RPE × Min, AU)'],[mins?`${Math.floor(mins/60)} h ${String(mins%60).padStart(2,'0')}`:'–','Trainingszeit'],[`${done} / ${plan}`,'Einheiten erledigt / geplant'],[String(rest),'Ruhetage']].map(s=>`<div class="stat"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}

function renderTeams(){$('teams').innerHTML=Object.keys(T).map(c=>`<div class="team">${badge(['','','H',c])}<div>${esc(T[c][0])}<br><span class="small">logos/${c}.png</span></div></div>`).join('')}

// ---------- Editor: Phasen und Spiele ----------
const teamOpts=Object.keys(T).map(c=>`<option value="${c}">${esc(T[c][0])}</option>`).join('')+'<option value="X">Anderer Gegner …</option>';
function renderEditors(){
 $('phEd').innerHTML=S.settings.phases.map((p,i)=>`<div class="ed-row ph-row${validPhase(p)?'':' bad'}" data-i="${i}" style="--c:${col(p)}">
  <label class="sr" for="pt${i}">Art</label><select id="pt${i}" data-f="t">${Object.entries(PT).map(([k,v])=>`<option value="${k}"${p.t===k?' selected':''}>${v[0]}</option>`).join('')}</select>
  <label class="sr" for="pf${i}">Von</label><input class="in" id="pf${i}" type="date" data-f="from" value="${esc(p.from)}" min="${R0}" max="${R1}">
  <label class="sr" for="pe${i}">Bis</label><input class="in" id="pe${i}" type="date" data-f="to" value="${esc(p.to)}" min="${R0}" max="${R1}">
  <label class="sr" for="pl${i}">Bezeichnung</label><input class="in" id="pl${i}" data-f="label" value="${esc(p.label)}" placeholder="Zusatz, z. B. Finnland" maxlength="40">
  <button class="btn x" data-del="${i}" aria-label="Block löschen">×</button></div>`).join('');
 const gs=S.settings.games;$('gmSum').textContent=`Spiele bearbeiten (${gs.filter(validGame).length})`;
 $('gmEd').innerHTML=gs.map((g,i)=>`<div class="ed-row gm-row${validGame(g)?'':' bad'}" data-i="${i}">
  <label class="sr" for="gd${i}">Datum</label><input class="in" id="gd${i}" type="date" data-f="0" value="${esc(g[0])}" min="${R0}" max="${R1}">
  <label class="sr" for="gz${i}">Uhrzeit</label><input class="in" id="gz${i}" type="time" data-f="1" value="${esc(g[1])}">
  <label class="sr" for="gh${i}">Heim/Auswärts</label><select id="gh${i}" data-f="2"><option value="H"${g[2]==='H'?' selected':''}>Heim</option><option value="A"${g[2]==='A'?' selected':''}>Auswärts</option></select>
  <label class="sr" for="go${i}">Gegner</label><select id="go${i}" data-f="3">${teamOpts.replace(`value="${g[3]}"`,`value="${g[3]}" selected`)}</select>
  <button class="btn x" data-del="${i}" aria-label="Spiel löschen">×</button>
  ${g[3]==='X'?`<label class="sr" for="gn${i}">Name</label><input class="in gn" id="gn${i}" data-f="4" value="${esc(g[4])}" placeholder="Gegner, z. B. EHC Kloten (Test)" maxlength="40">`:''}</div>`).join('');
}
let edTimer=null;
function settingsChanged(full){rebuildGames();renderRibbon();renderWeek();if(full)renderEditors();queue('settings/main',600)}
$('phEd').addEventListener('input',e=>{const f=e.target.closest('[data-f]');if(!f||readonly)return;const row=f.closest('.ed-row'),i=+row.dataset.i;const p={...S.settings.phases[i],[f.dataset.f]:f.value};S.settings.phases[i]=p;row.classList.toggle('bad',!validPhase(p));row.style.setProperty('--c',col(p));settingsChanged(false)});
$('phEd').addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(!b||readonly)return;S.settings.phases.splice(+b.dataset.del,1);settingsChanged(true)});
$('phAdd').onclick=()=>{if(readonly)return;const w=weeks[cur];S.settings.phases.push({t:'urlaub',from:w<R0?R0:w,to:iso(add(D(w),6))>R1?R1:iso(add(D(w),6)),label:''});settingsChanged(true);status('Neuer Block für die aktuelle Woche angelegt – Art und Daten anpassen.')};
$('gmEd').addEventListener('input',e=>{const f=e.target.closest('[data-f]');if(!f||readonly)return;const row=f.closest('.ed-row'),i=+row.dataset.i;const g=[...S.settings.games[i]];g[+f.dataset.f]=f.value;S.settings.games[i]=g;row.classList.toggle('bad',!validGame(g));settingsChanged(f.dataset.f==='3')});
$('gmEd').addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(!b||readonly)return;S.settings.games.splice(+b.dataset.del,1);settingsChanged(true)});
$('gmAdd').onclick=()=>{if(readonly)return;const w=weeks[cur];S.settings.games.push([w<R0?R0:w,'19:30','H','X','']);settingsChanged(true);$('gmDet').open=true;const r=$('gmEd').lastElementChild;r&&r.scrollIntoView({block:'nearest'})};
function twoStep(btn,label,fn){let armed=0,t;btn.onclick=()=>{if(readonly)return;if(!armed){armed=1;btn.textContent='Wirklich? Nochmal klicken';t=setTimeout(()=>{armed=0;btn.textContent=label},4000);return}clearTimeout(t);armed=0;btn.textContent=label;fn()}}
twoStep($('phReset'),'Standard wiederherstellen',()=>{S.settings.phases=defPhases();settingsChanged(true);status('Phasen auf den Standardplan zurückgesetzt.')});
twoStep($('gmReset'),'Spielplan zurücksetzen',()=>{S.settings.games=defGames();settingsChanged(true);status('Spielplan auf den Stand aus plan.js zurückgesetzt.')});
const sortBtn=(id,arr,key)=>{$(id).onclick=()=>{if(readonly)return;S.settings[arr].sort((a,b)=>String(key(a)).localeCompare(String(key(b))));settingsChanged(true)}};
sortBtn('phSort','phases',p=>p.from);sortBtn('gmSort','games',g=>g[0]+g[1]);

function renderAll(){rebuildGames();renderRibbon();renderWeek();renderEditors()}

// ---------- Speicher: lokal oder Supabase ----------
const status=t=>{$('status').textContent=t};
let sb=null, session=null;
const remoteOn=()=>!!(sb&&session);
const timers={},busy={},again={};
const body=path=>{const[c,id]=path.split('/');return c==='days'?(S.days[id]||{}):c==='weeks'?(S.weeks[id]||{}):S.settings};
function apply(path,data){const[c,id]=path.split('/');if(!data||typeof data!=='object')return;if(c==='days')S.days[id]={...data};else if(c==='weeks')S.weeks[id]={...data};else if(path==='settings/main')setSettings(data)}
function queue(path,ms=700){dirty.add(path);local();clearTimeout(timers[path]);timers[path]=setTimeout(()=>{delete timers[path];flush(path)},ms);status(remoteOn()?'Wird gespeichert …':'In diesem Browser gespeichert.')}
async function flush(path){if(!remoteOn())return;if(busy[path]){again[path]=1;return}busy[path]=1;
 try{const{error}=await sb.from('plan_entries').upsert({plan_id:C.planId,path,data:body(path),updated_by:session.user.id,updated_at:new Date().toISOString()},{onConflict:'plan_id,path'});
  if(error)throw error;dirty.delete(path);local();status('Gespeichert · für alle mit dem Link sichtbar.')}
 catch(e){const rls=e&&(e.code==='42501'||/row-level security/i.test(e.message||''));status(rls?'Kein Schreibrecht: Diese E-Mail ist für den Plan nicht freigeschaltet. Einträge bleiben lokal.':'Offline oder Server nicht erreichbar – lokal gesichert, wird später nachgeladen.')}
 busy[path]=0;if(again[path]){again[path]=0;flush(path)}}
const flushAll=()=>[...dirty].forEach(p=>flush(p));
addEventListener('online',flushAll);

function setRO(v){readonly=v;document.body.classList.toggle('ro',v);sync(true)}
async function pull(){const{data,error}=await sb.from('plan_entries').select('path,data').eq('plan_id',C.planId);
 if(error){status('Daten konnten nicht geladen werden: '+error.message);return}
 if(readonly){S.days={};S.weeks={};S.settings={phases:defPhases(),games:defGames()}}
 data.forEach(r=>{if(readonly||!dirty.has(r.path))apply(r.path,r.data)});local();renderAll();
 status(readonly?'Nur-Lese-Ansicht · Stand: live.':(data.length?'Synchronisiert.':'Angemeldet. Noch keine Einträge.'));if(!readonly)flushAll()}

let channel=null;
function live(){if(channel)return;channel=sb.channel('plan-'+C.planId).on('postgres_changes',{event:'*',schema:'public',table:'plan_entries',filter:'plan_id=eq.'+C.planId},pl=>{const r=pl.new;if(!r||!r.path||(!readonly&&(dirty.has(r.path)||timers[r.path]||busy[r.path])))return;apply(r.path,r.data);local();if(r.path==='settings/main'){const a=document.activeElement;if(!a||!a.closest('#phEd,#gmEd'))renderAll();else{rebuildGames();renderRibbon();renderWeek()}}else sync()}).subscribe()}

async function checkMember(){const{data}=await sb.from('plan_members').select('email').eq('plan_id',C.planId).limit(1);const ok=!!(data&&data.length);setRO(!ok);
 if(!ok)status('Angemeldet, aber diese E-Mail ist für Einträge nicht freigeschaltet – nur Lesen.');return ok}

function authUI(){const a=$('auth');a.hidden=false;
 if(session){a.innerHTML=`<div class="row2"><span>Angemeldet als <b>${esc(session.user.email)}</b>${readonly?' · nur Lesen':' · Einträge sind für alle mit dem Link sichtbar'}</span><button class="btn" id="logout">Abmelden</button></div>`;$('logout').onclick=async()=>{await sb.auth.signOut();location.reload()};return}
 a.innerHTML=`<div class="row2"><span>Ansicht für alle mit dem Link.</span><button class="btn" id="showLogin">Anmelden zum Eintragen</button></div><form id="login" hidden><label class="sr" for="em">E-Mail</label><input class="in" id="em" type="email" required placeholder="E-Mail von Leo oder Coach" autocomplete="email"><button class="btn pri">Login-Link senden</button><span id="lmsg" class="small" style="margin:0"></span></form>`;
 $('showLogin').onclick=()=>{$('login').hidden=false;$('showLogin').hidden=true;$('em').focus()};
 $('login').onsubmit=async e=>{e.preventDefault();const{error}=await sb.auth.signInWithOtp({email:$('em').value.trim(),options:{emailRedirectTo:location.origin+location.pathname,shouldCreateUser:true}});$('lmsg').textContent=error?'Fehler: '+error.message:'Link gesendet – bitte E-Mail öffnen.'}}

async function initRemote(){
 if(!REMOTE){$('modeNote').textContent='Einträge werden nur in diesem Browser gespeichert. Lade regelmäßig ein Backup herunter – und spiele es auf einem neuen Gerät wieder ein.';status('Lokaler Modus.');return}
 $('modeNote').textContent='Einträge werden online gespeichert und sind für alle mit dem Link lesbar. Ein Backup als Datei ist trotzdem sinnvoll, z. B. zum Saisonende.';
 try{await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)});
  sb=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey);
  session=(await sb.auth.getSession()).data.session;
  if(session)await checkMember();
  authUI();await pull();live();
  sb.auth.onAuthStateChange(async(ev,s)=>{const had=!!session;session=s;if(!had&&s){await checkMember();authUI();await pull()}})}
 catch(e){status('Online-Speicher nicht erreichbar – zuletzt geladener Stand wird angezeigt.')}}

// ---------- Ereignisse ----------
$('segs').addEventListener('click',e=>{const b=e.target.closest('.seg');if(b)go(+b.dataset.i)});
function go(i){cur=Math.max(0,Math.min(NW-1,i));history.replaceState(null,'','#w-'+weeks[cur].replace(/-/g,''));renderWeek()}
$('prev').onclick=()=>go(cur-1);$('next').onclick=()=>go(cur+1);$('today').onclick=()=>go(homeWeek());
$('print').onclick=()=>window.print();
addEventListener('hashchange',()=>{const i=hashWeek();if(i!==null&&i!==cur){cur=i;renderWeek()}});
addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select'))return;if(e.key==='ArrowLeft')go(cur-1);if(e.key==='ArrowRight')go(cur+1)});
function edit(e){const f=e.target.closest('[data-k]');if(!f||readonly)return;const d=f.closest('.day').dataset.d,k=f.dataset.k;
 S.days[d]={...(S.days[d]||{}),[k]:f.type==='checkbox'?f.checked:f.value};sync();queue('days/'+d,f.type==='checkbox'||f.tagName==='SELECT'?50:700)}
$('days').addEventListener('input',edit);$('days').addEventListener('change',e=>{if(e.target.type==='checkbox')edit(e)});
$('wnote').addEventListener('input',e=>{if(readonly)return;const w=weeks[cur];S.weeks[w]={note:e.target.value};$('notesPrint').textContent=e.target.value;queue('weeks/'+w)});
$('copyPrev').onclick=()=>{if(readonly||cur===0)return;const src=wdays(weeks[cur-1]),dst=wdays(weeks[cur]);let n=0;
 dst.forEach((d,i)=>{if(phase(d).t==='out')return;const s=S.days[src[i]]||{},v={...(S.days[d]||{})};let ch=0;['t','f','p','rpe','min'].forEach(k=>{if(s[k]&&!v[k]){v[k]=s[k];n++;ch=1}});if(ch){S.days[d]=v;queue('days/'+d,50)}});
 sync(true);status(n?`${n} Felder aus der Vorwoche übernommen (nur leere Felder).`:'Nichts zu übernehmen – Vorwoche leer oder Felder schon gefüllt.')};
$('copyTxt').onclick=async()=>{const w=weeks[cur];const t=[`${pl.name} · ${$('kw').textContent} · ${$('wtitle').textContent}`,''].concat(wdays(w).map(d=>{const v=S.days[d]||{},g=GM[d],dt=D(d),p=phase(d);return `${DN[dt.getUTCDay()]} ${d.slice(8)}.${d.slice(5,7)}.${pname(p)?` [${pname(p)}]`:''}`+(v.t&&DT[v.t]?` · ${DT[v.t]}`:'')+(g?` · ${g[2]==='H'?'HEIM vs':'AUSWÄRTS @'} ${oppName(g)} ${g[1]}`:'')+(v.f?`\n  Fokus: ${v.f}`:'')+(v.p?`\n  Programm: ${v.p}`:'')+(v.rpe&&v.min?`\n  Last: ${v.rpe} × ${v.min} = ${v.rpe*v.min} AU`:'')}));const n=(S.weeks[w]||{}).note;if(n)t.push('','Notizen: '+n);
 try{await navigator.clipboard.writeText(t.join('\n'));status('Woche in die Zwischenablage kopiert.')}catch(e){status('Kopieren wurde vom Browser blockiert.')}};
$('export').onclick=()=>{const b=new Blob([JSON.stringify({planId:C.planId,exported:new Date().toISOString(),...S},null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`${C.planId||'plan'}-backup-${todayIso}.json`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)};
$('import').addEventListener('change',async e=>{const f=e.target.files[0];if(!f||readonly)return;try{const x=JSON.parse(await f.text());if(!x||typeof x!=='object'||typeof x.days!=='object')throw 0;
 Object.entries(x.days||{}).forEach(([d,v])=>{if(isDate(d)&&v&&typeof v==='object'){S.days[d]={t:DT[v.t]?String(v.t):'',f:String(v.f??''),p:String(v.p??''),rpe:String(v.rpe??''),min:String(v.min??''),done:!!v.done};dirty.add('days/'+d)}});
 Object.entries(x.weeks||{}).forEach(([w,v])=>{if(isDate(w)&&v){S.weeks[w]={note:String(v.note??'')};dirty.add('weeks/'+w)}});
 if(x.settings){setSettings(x.settings);dirty.add('settings/main')}
 local();renderAll();flushAll();status('Backup eingespielt.')}catch(err){status('Diese Datei ist kein gültiges Backup.')}e.target.value=''});

renderAll();renderTeams();initRemote();
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
}
