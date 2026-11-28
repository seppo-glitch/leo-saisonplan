{
'use strict';
const P = window.PLAN, C = window.CONFIG || {};
const T = P.teams;
const R0 = P.range.start, R1 = P.range.end;
// Phasentypen: [Name, Farbe, Priorität bei Überschneidung]
const PT = {saison:['Saison','var(--saison)',1],sommer:['Sommertraining','var(--sommer)',1],trans:['Übergang','var(--trans)',2],urlaub:['Urlaub','var(--urlaub)',3],camp:['Trainingscamp','var(--camp)',4]};
const OUT = {t:'out'};
const DT = {train:'Training',game:'Game Day',recovery:'Recovery',rest:'Ruhetag',travel:'Reisetag',test:'Testtag'};
// Tagesart: gespeicherter Wert, sonst automatisch „Game Day“ an Spieltagen, sonst Training
const effT=(d,v)=>DT[v&&v.t]?v.t:(GM[d]?'game':'train');
// Spielstatistik-Felder: [Schlüssel, Label, Kurz, Typ]
const GS = [['gG','Tore','T','n'],['gA','Assists','A','n'],['gPM','+/-','+/-','pm'],['gPIM','PIM','PIM','n'],['gS','Schüsse','S','n'],['gTOI','Eiszeit','TOI','toi']];
const gsKeys=GS.map(f=>f[0]).concat('gN','gR','gC','gRes','gOT');
// Ergebnis aus Sicht der Pioneers: „4:2“, optional „OT“/„SO“ (n.V./n.P.); automatisch aus ICEHL oder manuell
function parseRes(v){const m=String((v&&v.gRes)||'').match(/^\s*(\d{1,2})\s*:\s*(\d{1,2})\s*(OT|SO|PS|n\.?\s*V\.?|n\.?\s*P\.?)?\s*$/i);if(!m)return null;
 const f=+m[1],a=+m[2];if(f===a)return null;const x=(v.gOT||m[3]||'').toString();const ot=/so|ps|p/i.test(x)?'SO':x?'OT':'';return{f,a,ot,win:f>a}}
// Link zum offiziellen ICEHL-Spielbericht (Spiel-ID aus dem automatischen Import)
const reportUrl=v=>{const id=v&&v.gAuto&&v.gAuto.matchId;return Number.isInteger(id)?`https://www.ice.hockey/en/stats/gamestats?gameId=${id}`:''};
const reportLink=v=>{const u=reportUrl(v);return u?` <a class="rep" href="${u}" target="_blank" rel="noopener" title="Offizieller Spielbericht (ice.hockey)" aria-label="Offizieller Spielbericht auf ice.hockey">Bericht ↗</a>`:''};
const resTxt=r=>r?`${r.f}:${r.a}${r.ot==='SO'?' n.P.':r.ot==='OT'?' n.V.':''}`:'';
const hasStats=v=>GS.some(f=>String(v[f[0]]??'').trim()!=='');
const played=v=>!!v&&(hasStats(v)||!!v.gR);
// Trainingsprogramm als Checkliste: eine Übung pro Zeile; Zeilen mit „:“ am Ende oder „#“ am Anfang sind Überschriften
const progLines=p=>String(p||'').split('\n').map(x=>x.trim()).filter(Boolean);
const isHead=l=>/:$/.test(l)||/^#/.test(l);
const ckSet=v=>new Set(Array.isArray(v&&v.ck)?v.ck:[]);
function clHtml(v){const ls=progLines(v.p);if(!ls.length)return'';const ck=ckSet(v);const items=ls.filter(l=>!isHead(l));const n=items.filter(l=>ck.has(l)).length;
 return `<div class="clh"><span>Programm</span><span class="clp${items.length&&n===items.length?' all':''}">${n}/${items.length} erledigt</span></div><ul class="cl">${ls.map(l=>isHead(l)?`<li class="h">${esc(l.replace(/^#\s*/,''))}</li>`:`<li class="${ck.has(l)?'ok':''}"><label><input type="checkbox" data-ck="${esc(l)}"${ck.has(l)?' checked':''}><span>${esc(l)}</span></label></li>`).join('')}</ul>`}
const toiSec=t=>{const m=String(t||'').match(/^(\d{1,2}):([0-5]\d)$/);return m?+m[1]*60+ +m[2]:null};
const fmtToi=s=>`${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`;
const pmTxt=x=>x>0?'+'+x:String(x);
function statLine(v){if(v.gDNP)return'Nicht eingesetzt (laut Spielbericht)';if(!hasStats(v))return'';const p=[];const n=k=>String(v[k]??'').trim();
 if(n('gLine'))p.push(`${n('gLine')}. Linie${n('gPos')?' '+n('gPos'):''}`);
 if(n('gG')||n('gA')){const g=+n('gG')||0,a=+n('gA')||0;p.push(`${g} T · ${a} A`)}
 if(n('gPM'))p.push(pmTxt(+n('gPM'))||'0');if(n('gPIM'))p.push(`${+n('gPIM')} PIM`);if(n('gS'))p.push(`${+n('gS')} Schüsse`);if(toiSec(n('gTOI'))!==null)p.push(`${n('gTOI')} Eiszeit`);
 return p.join(' · ')}
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
let PRIV={}; // privates Feedback je Tag: nur mit Code lesbar
function setSettings(x){if(!x||typeof x!=='object')return;
 const ph=cleanPhases(x.phases),gm=cleanGames(x.games);
 if(ph)S.settings.phases=ph;else if(isDate(x.aprCamp)){S.settings.phases=defPhases().map(p=>p.from===P.aprilCampDefault&&p.t==='camp'?{...p,from:x.aprCamp,to:iso(add(D(x.aprCamp),6))}:p)}
 if(gm)S.settings.games=gm;S.settings.custom=true}
let LS=null, dirty=new Set();
try{LS=window.localStorage;const x=JSON.parse(LS.getItem(LSK)||'null');if(x){Object.assign(S.days,x.days||{});Object.assign(S.weeks,x.weeks||{});if(x.settings&&x.settings.custom)setSettings(x.settings)}dirty=new Set(JSON.parse(LS.getItem(DK)||'[]'))}catch(e){LS=null}
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
const oppShort=g=>g[3]==='X'?g[4].replace(/\(.*?\)/g,'').split(/\s+/).map(w=>w.replace(/[^\p{L}\d]/gu,'')).filter(Boolean).map(w=>w[0]).join('').slice(0,3).toUpperCase()||'?':T[g[3]][2];
const venue=g=>g[2]==='H'?P.player.homeVenue:(g[3]==='X'?'auswärts':T[g[3]][1]);

const now=new Date(),todayIso=iso(new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())));
const weekOf=s=>{const n=Math.floor((D(s)-D(START))/864e5/7);return n<0?0:n>=NW?NW-1:n};
const hashWeek=()=>{const m=location.hash.match(/^#w-(\d{4})(\d{2})(\d{2})$/);return m?weekOf(`${m[1]}-${m[2]}-${m[3]}`):null};
const homeWeek=()=>todayIso>=START&&todayIso<=R1?weekOf(todayIso):0;
let cur=hashWeek()??homeWeek(), readonly=REMOTE;
if(REMOTE)document.body.classList.add('ro');

// Logos: zuerst Supabase-Storage (Bucket „logos“), dann Ordner logos/ im Repository, sonst Kürzel
const logoUrl=c=>C.supabaseUrl?`${C.supabaseUrl}/storage/v1/object/public/logos/${c}.png`:`logos/${c}.png`;
const logoImg=c=>`<img src="${logoUrl(c)}" alt="" loading="lazy" onerror="if(!this.dataset.f&&this.src.indexOf('storage')>0){this.dataset.f=1;this.src='logos/${c}.png'}else this.remove()">`;
// ---------- Kopf ----------
const pl=P.player, fmt=s=>`${s.slice(8)}.${s.slice(5,7)}.${s.slice(0,4)}`;
$('pname').innerHTML=`${esc(pl.name)} <span class="num">#${esc(pl.number)}</span>`;
$('pmeta').innerHTML=`${esc(pl.position)} · <span class="club"><img src="${logoUrl('PIV')}" alt="" onerror="this.remove()">${esc(pl.club)}</span> · ${esc(pl.league)}`;
$('prange').textContent=`Saisonplan ${fmt(R0)} – ${fmt(R1)}`;
$('foot').innerHTML=`<b>BB Sports Management</b> · Bernd Brückler Sports Management. Spielplan Stand ${esc(P.asOf)}; Termine und Anspielzeiten können sich durch die Liga ändern.`;
$('legend').innerHTML=['saison','urlaub','camp','sommer','trans'].map(p=>`<span><i style="--c:${PT[p][1]}"></i>${PT[p][0]}</span>`).join('')+'<span><i class="gh"></i>Heimspiel</span><span><i class="g"></i>Auswärtsspiel</span>';

const badge=g=>g[3]==='X'?`<span class="badge"><span class="mono">${esc(oppShort(g))}</span></span>`:`<span class="badge"><span class="mono">${esc(T[g[3]][2])}</span>${logoImg(g[3])}</span>`;

// ---------- Darstellung ----------
function renderRibbon(){
 $('segs').innerHTML=weeks.map((w,i)=>{const p=wphase(w),a=wdays(w),gs=a.map(d=>GM[d]).filter(Boolean);
  return `<button class="seg${i===cur?' on':''}" style="--c:${col(p)}" data-i="${i}" aria-label="KW ${kw(D(w))}, ${a[0].slice(8)}.${a[0].slice(5,7)}. bis ${a[6].slice(8)}.${a[6].slice(5,7)}., ${esc(pname(p)||'ohne Phase')}${gs.length?', '+gs.length+' Spiele':''}" title="${esc(pname(p))}"><span class="dots">${gs.map(g=>`<i class="${g[2]==='H'?'h':''}"></i>`).join('')}</span></button>`}).join('');
 let last=-1;$('mons').innerHTML=weeks.map(w=>{const m=add(D(w),3).getUTCMonth();const s=m!==last?MON[m]:'';last=m;return `<span>${s}</span>`}).join('');
}

function dayHtml(d){const p=phase(d),dt=D(d),g=GM[d];
 const gh=g?`<div class="game ${g[2]==='H'?'h':'a'}">${badge(g)}<span class="har"><span class="ha">${g[2]==='H'?'HEIM':'AUSWÄRTS'}</span><span class="gres" data-gres hidden></span></span><span class="opp">${g[2]==='H'?'vs ':'@ '}${esc(oppName(g))}</span><span class="gm">${g[1]?esc(g[1])+' Uhr · ':''}${esc(venue(g))}</span><span class="gstat" data-gstat></span></div>
  <fieldset class="gsf gst"><legend>Leos Statistik <span class="autob" data-auto hidden>automatisch · ICEHL</span></legend><div class="gsg"><label class="lab span-all">Ergebnis (Pioneers : Gegner)<input class="in" data-k="gRes" placeholder="z. B. 4:2 oder 3:2 OT" maxlength="10" autocomplete="off"></label>${GS.map(f=>`<label class="lab">${f[1]}<input class="in" data-k="${f[0]}" ${f[3]==='toi'?'inputmode="numeric" placeholder="mm:ss" pattern="\\d{1,2}:[0-5]\\d" maxlength="5"':`type="number" inputmode="numeric" ${f[3]==='pm'?'min="-15"':'min="0"'} max="99"`}></label>`).join('')}</div>
  <label class="lab">Spielnotiz<input class="in" data-k="gN" maxlength="140" placeholder="z. B. 2. Linie, PP-Einsatz"></label>
  <a class="srcl" data-rep href="https://www.ice.hockey/en/season/schedule" target="_blank" rel="noopener">Spielbericht auf ice.hockey ↗</a></fieldset>
  <fieldset class="gsf"><legend>Leos Bewertung</legend>
  <label class="lab">Eigene Note (1–10)<select data-k="gR"><option value="">–</option>${[10,9,8,7,6,5,4,3,2,1].map(n=>`<option value="${n}">${n}${n===10?' – top':n===1?' – schwach':''}</option>`).join('')}</select></label>
  <label class="lab">Kommentar<textarea data-k="gC" rows="3" maxlength="600" placeholder="Was lief gut? Was will ich verbessern?"></textarea></label></fieldset>
  <div class="grate" data-grate hidden></div>`:'';
 const f=p.t==='out'?'<p class="small" style="margin:0">Außerhalb des Planungszeitraums</p>':`
  <label class="lab">Tagesart<select data-k="t">${Object.entries(DT).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
  <label class="lab">Fokus<input class="in" data-k="f" list="foci" placeholder="${g?'Game Day':'z. B. Kraft Maximal'}" autocomplete="off"></label>
  <label class="lab edit-only">Trainingsprogramm (Plan)<textarea data-k="p" rows="4" placeholder="Eine Übung pro Zeile, z. B.&#10;Aufwärmen:&#10;Kniebeuge 5×3 @85 %&#10;Bankdrücken 4×6"></textarea></label>
  <div class="clw" data-cl></div>
  <div class="row"><label class="lab">RPE (1–10)<select data-k="rpe"><option value="">–</option>${[1,2,3,4,5,6,7,8,9,10].map(n=>`<option>${n}</option>`).join('')}</select></label><label class="lab">Minuten<input class="in" data-k="min" type="number" inputmode="numeric" min="0" max="600"></label></div>
  <div class="ft"><span>Last <span class="ld" data-load></span></span><label class="chk"><input type="checkbox" data-k="done">erledigt</label></div>
  <label class="lab fbl edit-only">Feedback an Coach <span class="lockn">nur mit Code sichtbar</span><textarea data-fb rows="2" maxlength="1000" placeholder="Wie lief's? Was war zu viel oder zu wenig?"></textarea></label>
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
  el.querySelectorAll('[data-k]').forEach(f=>{if(f===document.activeElement&&!force)return;const k=f.dataset.k;const val=k==='t'?effT(el.dataset.d,v):(v[k]??'');if(f.type==='checkbox')f.checked=!!v[k];else if(f.value!==String(val))f.value=val;f.disabled=readonly});
  const et=effT(el.dataset.d,v),t=et==='train'?'':et;el.classList.toggle('rest',t==='rest');el.classList.toggle('recov',t==='recovery');const tag=el.querySelector('[data-dt]');tag.textContent=t?DT[t]:'';tag.hidden=!t;tag.className='dtag dt-'+(t||'none');
  const gr=el.querySelector('[data-grate]');if(gr){const r=+v.gR||0;gr.innerHTML=(r?`<span class="rnum">${r}<small>/10</small></span><span class="rbar"><i style="width:${r*10}%"></i></span><span class="rlab">Leos Bewertung</span>`:'')+(v.gC?`<p>${esc(v.gC)}</p>`:'');gr.hidden=!r&&!v.gC;gr.classList.toggle('only-c',!r)}
  const rp=el.querySelector('[data-rep]');if(rp){const u=reportUrl(v);rp.href=u||'https://www.ice.hockey/en/season/schedule';rp.textContent=u?'Offizieller Spielbericht ↗':'Spielplan auf ice.hockey ↗'}
  const rr=el.querySelector('[data-gres]');if(rr){const r=parseRes(v);rr.hidden=!r;rr.className='gres '+(r?(r.win?'w':'l'):'');rr.textContent=r?(r.win?'S ':'N ')+resTxt(r):'';rr.title=r?(r.win?'Sieg':'Niederlage')+(r.ot==='OT'?' nach Verlängerung':r.ot==='SO'?' nach Penaltyschießen':''):''}
  const gl=el.querySelector('[data-gstat]');if(gl){const t2=statLine(v);gl.textContent=t2+(v.gN?(t2?' · ':'')+v.gN:'');gl.hidden=!gl.textContent;gl.title=v.gAuto?'Quelle: offizieller ICEHL-Spielbericht':''}
  const au=el.querySelector('[data-auto]');if(au){const a=!!v.gAuto;au.hidden=!a;el.querySelectorAll('.gst .gsg [data-k]').forEach(f=>{f.readOnly=a;f.title=a?'Wird automatisch aus dem ICEHL-Spielbericht übernommen':''})}
  const x=(+v.rpe||0)*(+v.min||0),l=el.querySelector('[data-load]');if(l)l.textContent=x?x+' AU':'–';
  const cl=el.querySelector('[data-cl]');if(cl&&!(document.activeElement&&cl.contains(document.activeElement)&&!force)){const h=clHtml(v);if(cl.dataset.h!==h){cl.innerHTML=h;cl.dataset.h=h}cl.querySelectorAll('input').forEach(i=>i.disabled=readonly)}
  const fb=el.querySelector('[data-fb]');if(fb){const t3=(PRIV[el.dataset.d]||{}).fb||'';if(fb!==document.activeElement||force)fb.value=t3;fb.disabled=readonly}
  const pv=el.querySelector('[data-pv]');if(pv)pv.innerHTML=((v.f?`<b>Fokus</b>${esc(v.f)}`:'')+(x?`<b>Last</b>${esc(v.rpe)} × ${esc(v.min)} = ${x} AU`:'')+(v.done?'<b>Status</b>erledigt ✓':''))||(t||progLines(v.p).length?'':'<span class="none">Kein Eintrag</span>')});
 const note=(S.weeks[w]||{}).note||'',n=$('wnote');if(n!==document.activeElement||force)n.value=note;n.disabled=readonly;
 $('notesPrint').textContent=note||(readonly?'Keine Wochennotizen.':'');
 const gs=ds.map(d=>GM[d]).filter(Boolean),h=gs.filter(g=>g[2]==='H').length;
 let load=0,mins=0,done=0,plan=0,rest=0,rec=0;ds.forEach(d=>{const v=S.days[d]||{};load+=(+v.rpe||0)*(+v.min||0);mins+=+v.min||0;if(v.done)done++;if(v.f||v.p)plan++;const et=effT(d,v);if(et==='rest')rest++;if(et==='recovery')rec++});
 $('stats').innerHTML=[[String(gs.length),gs.length?`Spiele · ${h} Heim / ${gs.length-h} Auswärts`:'Spiele diese Woche'],[load?load.toLocaleString('de-AT'):'–','Wochenlast (RPE × Min, AU)'],[mins?`${Math.floor(mins/60)} h ${String(mins%60).padStart(2,'0')}`:'–','Trainingszeit'],[`${done} / ${plan}`,'Einheiten erledigt / geplant'],[`${rest} / ${rec}`,'Ruhetage / Recovery']].map(s=>`<div class="stat"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}

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
function settingsChanged(full){S.settings.custom=true;rebuildGames();renderRibbon();renderWeek();if(full)renderEditors();queue('settings/main',600)}
$('phEd').addEventListener('input',e=>{const f=e.target.closest('[data-f]');if(!f||readonly)return;const row=f.closest('.ed-row'),i=+row.dataset.i;const p={...S.settings.phases[i],[f.dataset.f]:f.value};S.settings.phases[i]=p;row.classList.toggle('bad',!validPhase(p));row.style.setProperty('--c',col(p));settingsChanged(false)});
$('phEd').addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(!b||readonly)return;S.settings.phases.splice(+b.dataset.del,1);settingsChanged(true)});
$('phAdd').onclick=()=>{if(readonly)return;const w=weeks[cur];S.settings.phases.push({t:'urlaub',from:w<R0?R0:w,to:iso(add(D(w),6))>R1?R1:iso(add(D(w),6)),label:''});settingsChanged(true);status('Neuer Block für die aktuelle Woche angelegt – Art und Daten anpassen.')};
$('gmEd').addEventListener('input',e=>{const f=e.target.closest('[data-f]');if(!f||readonly)return;const row=f.closest('.ed-row'),i=+row.dataset.i;const g=[...S.settings.games[i]];g[+f.dataset.f]=f.value;S.settings.games[i]=g;row.classList.toggle('bad',!validGame(g));settingsChanged(f.dataset.f==='3')});
$('gmEd').addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(!b||readonly)return;S.settings.games.splice(+b.dataset.del,1);settingsChanged(true)});
$('gmAdd').onclick=()=>{if(readonly)return;const w=weeks[cur];S.settings.games.push([w<R0?R0:w,'19:30','H','X','']);settingsChanged(true);$('gmDet').open=true;const r=$('gmEd').lastElementChild;r&&r.scrollIntoView({block:'nearest'})};
function twoStep(btn,label,fn){let armed=0,t;btn.onclick=()=>{if(readonly)return;if(!armed){armed=1;btn.textContent='Wirklich? Nochmal klicken';t=setTimeout(()=>{armed=0;btn.textContent=label},4000);return}clearTimeout(t);armed=0;btn.textContent=label;fn()}}
twoStep($('phReset'),'Standard wiederherstellen',()=>{S.settings.phases=defPhases();if(JSON.stringify(S.settings.games)===JSON.stringify(defGames()))S.settings.custom=false;settingsChanged(true);status('Phasen auf den Standardplan zurückgesetzt.')});
twoStep($('gmReset'),'Spielplan zurücksetzen',()=>{S.settings.games=defGames();settingsChanged(true);status('Spielplan auf den Stand aus plan.js zurückgesetzt.')});
const sortBtn=(id,arr,key)=>{$(id).onclick=()=>{if(readonly)return;S.settings[arr].sort((a,b)=>String(key(a)).localeCompare(String(key(b))));settingsChanged(true)}};
sortBtn('phSort','phases',p=>p.from);sortBtn('gmSort','games',g=>g[0]+g[1]);

function renderSeason(){const pl_=S.settings.games.filter(validGame).filter(g=>played(S.days[g[0]])).sort((a,b)=>a[0]<b[0]?-1:1);const rated=pl_.map(g=>+S.days[g[0]].gR).filter(x=>x>0);const avgR=rated.length?(rated.reduce((a,b)=>a+b,0)/rated.length).toFixed(1).replace('.',','):'–';
 const sum=k=>pl_.reduce((t,g)=>t+(+S.days[g[0]][k]||0),0);const G=sum('gG'),A=sum('gA'),PM=sum('gPM'),PIM=sum('gPIM'),SH=sum('gS');
 const tois=pl_.map(g=>toiSec(S.days[g[0]].gTOI)).filter(x=>x!==null);const avg=tois.length?fmtToi(tois.reduce((a,b)=>a+b,0)/tois.length):'–';
 const allRes=S.settings.games.filter(validGame).map(g=>parseRes(S.days[g[0]])).filter(Boolean);const W=allRes.filter(r=>r.win).length;
 const rec=allRes.length?`<p class="trec">Pioneers im Planungszeitraum: <b>${W} ${W===1?'Sieg':'Siege'} · ${allRes.length-W} ${allRes.length-W===1?'Niederlage':'Niederlagen'}</b>${allRes.some(r=>r.ot)?` (davon ${allRes.filter(r=>r.ot).length} nach Verlängerung/Penaltys)`:''}</p>`:'';
 $('season').innerHTML=rec+(pl_.length?`<div class="sgrid">${[[pl_.length,'Spiele'],[G,'Tore'],[A,'Assists'],[G+A,'Punkte'],[pmTxt(PM),'+/-'],[PIM,'Strafmin.'],[SH,'Schüsse'],[avg,'Ø Eiszeit'],[avgR,'Ø Eigene Note']].map(x=>`<div><b>${esc(x[0])}</b><span>${x[1]}</span></div>`).join('')}</div>
  <table class="glog"><thead><tr><th>Datum</th><th>Gegner</th><th>Erg.</th><th>T</th><th>A</th><th>+/-</th><th>TOI</th><th>Note</th></tr></thead><tbody>${pl_.slice(-8).reverse().map(g=>{const v=S.days[g[0]];return `<tr><td><a href="#w-${weeks[weekOf(g[0])].replace(/-/g,'')}">${g[0].slice(8)}.${g[0].slice(5,7)}.</a>${reportLink(v)}</td><td>${g[2]==='H'?'vs':'@'} ${esc(oppShort(g))}</td><td>${(r=>r?`<span class="gr ${r.win?'w':'l'}">${esc(resTxt(r))}</span>`:'–')(parseRes(v))}</td><td>${esc(+v.gG||0)}</td><td>${esc(+v.gA||0)}</td><td>${String(v.gPM??'').trim()===''?'–':esc(pmTxt(+v.gPM))}</td><td>${toiSec(v.gTOI)!==null?esc(v.gTOI):'–'}</td><td>${+v.gR?esc(+v.gR):'–'}</td></tr>`}).join('')}</tbody></table>${pl_.length>8?`<p class="small">Letzte 8 von ${pl_.length} Spielen.</p>`:''}`
 :`<p class="small" style="margin:0">Noch keine Spielstatistik eingetragen. ${readonly?'':'Werte direkt in der Spielkarte am Spieltag eintragen.'}</p>`)}
function renderAll(){rebuildGames();renderRibbon();renderWeek();renderEditors();renderSeason()}

// ---------- Speicher: lokal oder Supabase (Bearbeitungs-Code) ----------
const status=t=>{$('status').textContent=t};
const CK=LSK+'-code';
let sb=null, code=null, isPublic=true;
try{code=LS&&LS.getItem(CK)}catch(e){}
const remoteOn=()=>!!(sb&&code&&!readonly);
const timers={},busy={},again={};
const body=path=>{const[c,id]=path.split('/');return c==='days'?(S.days[id]||{}):c==='weeks'?(S.weeks[id]||{}):S.settings};
function apply(path,data){const[c,id]=path.split('/');if(!data||typeof data!=='object')return;if(c==='days')S.days[id]={...data};else if(c==='weeks')S.weeks[id]={...data};else if(path==='settings/main')setSettings(data)}
function queue(path,ms=700){if(readonly)return;dirty.add(path);local();clearTimeout(timers[path]);timers[path]=setTimeout(()=>{delete timers[path];flush(path)},ms);status(remoteOn()?'Wird gespeichert …':'In diesem Browser gespeichert.')}
const errMsg=e=>String((e&&(e.message||e.details))||'');
async function flush(path){if(!remoteOn())return;if(busy[path]){again[path]=1;return}busy[path]=1;
 try{const{data:res,error}=await sb.rpc('save_entry',{p:C.planId,code,path,data:body(path)});if(error)throw error;if(res!=='ok')throw{message:String(res)};dirty.delete(path);local();status('Gespeichert'+(isPublic?' · für alle mit dem Link sichtbar.':'.'))}
 catch(e){const m=errMsg(e);if(/invalid code/i.test(m)){lock('Der Code ist nicht mehr gültig (wurde er geändert?). Änderungen bleiben lokal gesichert.')}else if(/locked/i.test(m))status('Zu viele falsche Codes – Bearbeiten ist für 15 Minuten gesperrt. Änderungen bleiben lokal.');else status('Offline oder Server nicht erreichbar – lokal gesichert, wird später nachgeladen.')}
 busy[path]=0;if(again[path]){again[path]=0;flush(path)}}
const flushAll=()=>{if(remoteOn())[...dirty].forEach(p=>flush(p))};
const PK=LSK+'-priv',pTimers={};
const localPriv=()=>{try{LS&&LS.setItem(PK,JSON.stringify(PRIV))}catch(e){}};
try{if(!REMOTE||code)PRIV=JSON.parse((LS&&LS.getItem(PK))||'{}')||{}}catch(e){PRIV={}}
function queuePriv(d){localPriv();clearTimeout(pTimers[d]);status(remoteOn()?'Wird gespeichert …':'In diesem Browser gespeichert.');pTimers[d]=setTimeout(async()=>{delete pTimers[d];if(!remoteOn())return;
 try{const{data:res,error}=await sb.rpc('save_private',{p:C.planId,code,path:'days/'+d,data:PRIV[d]||{}});if(error)throw error;if(res!=='ok')throw{message:String(res)};status('Feedback gespeichert · nur mit Code sichtbar.')}
 catch(err){status(/invalid code/i.test(errMsg(err))?'Code ungültig – Feedback nur lokal gesichert.':'Feedback lokal gesichert, Server nicht erreichbar.')}},700)}
async function pullPriv(){if(!remoteOn())return;const{data,error}=await sb.rpc('get_private',{p:C.planId,code});if(error)return;const n={};(data||[]).forEach(r=>{const d=r.path.slice(5);if(isDate(d)&&r.data&&typeof r.data==='object')n[d]={fb:String(r.data.fb??'')}});Object.keys(pTimers).forEach(d=>{n[d]=PRIV[d]});PRIV=n;localPriv();sync()}
addEventListener('online',flushAll);

function setRO(v){readonly=v;document.body.classList.toggle('ro',v);sync(true);renderEditors()}
async function pull(){const{data,error}=await sb.rpc('get_entries',{p:C.planId,code:readonly?null:code});
 if(error){status('Daten konnten nicht geladen werden.');return false}
 if(!isPublic&&readonly&&!(data||[]).length)status('Dieser Plan ist nicht öffentlich – bitte Code eingeben.');
 if(readonly){S.days={};S.weeks={};S.settings={phases:defPhases(),games:defGames()}}
 if(!readonly&&!dirty.has('settings/main')&&!(data||[]).some(r=>r.path==='settings/main'))S.settings={phases:defPhases(),games:defGames()};
 (data||[]).forEach(r=>{if(readonly||!dirty.has(r.path))apply(r.path,r.data)});local();renderAll();
 status(readonly?'Nur-Lese-Ansicht · Stand: live.':'Bearbeiten freigeschaltet · synchronisiert.');flushAll();if(!readonly)pullPriv();return true}

let channel=null,poll=null;
function live(){if(channel)return;
 channel=sb.channel('plan-'+C.planId).on('postgres_changes',{event:'*',schema:'public',table:'plan_entries',filter:'plan_id=eq.'+C.planId},pl=>{const r=pl.new;if(!r||!r.path||(!readonly&&(dirty.has(r.path)||timers[r.path]||busy[r.path])))return;apply(r.path,r.data);local();renderSeason();if(r.path==='settings/main'){const a=document.activeElement;if(!a||!a.closest('#phEd,#gmEd'))renderAll();else{rebuildGames();renderRibbon();renderWeek()}}else sync()}).subscribe();
 // Sicherheitsnetz, falls Live-Updates nicht ankommen (z. B. privater Plan): alle 60 s nachladen, wenn nichts offen ist
 poll=setInterval(()=>{if(document.hidden||Object.keys(timers).length||document.activeElement&&document.activeElement.closest('.day,#wnote,#phEd,#gmEd'))return;pull()},60000)}

function lock(msg){code=null;PRIV={};try{LS&&(LS.removeItem(CK),LS.removeItem(PK))}catch(e){}setRO(true);authUI();status(msg||'Bearbeiten gesperrt.');pull()}
function authUI(){const a=$('auth');a.hidden=false;
 if(!readonly){a.innerHTML=`<div class="row2"><span><b>Bearbeiten freigeschaltet</b> auf diesem Gerät${isPublic?' · Änderungen sind für alle mit dem Link sichtbar':''}.</span><button class="btn" id="lockBtn">Sperren</button></div>`;$('lockBtn').onclick=()=>lock('Bearbeiten auf diesem Gerät gesperrt.');return}
 a.innerHTML=`<div class="row2"><span>${isPublic?'Ansicht für alle mit dem Link.':'Privater Plan.'}</span><button class="btn" id="showCode">Bearbeiten</button></div><form id="codeForm" hidden><label class="sr" for="codeIn">Bearbeitungs-Code</label><input class="in" id="codeIn" type="password" required placeholder="Bearbeitungs-Code" autocomplete="current-password"><button class="btn pri">Freischalten</button><span id="cmsg" class="small" style="margin:0"></span></form>`;
 $('showCode').onclick=()=>{$('codeForm').hidden=false;$('showCode').hidden=true;$('codeIn').focus()};
 $('codeForm').onsubmit=async e=>{e.preventDefault();const c=$('codeIn').value.trim();$('cmsg').textContent='Prüfe …';
  const{data,error}=await sb.rpc('check_code',{p:C.planId,code:c});
  if(error){$('cmsg').textContent=/locked/i.test(errMsg(error))?'Zu viele Versuche – bitte in 15 Minuten erneut.':'Prüfung fehlgeschlagen – Verbindung?';return}
  if(!data){$('cmsg').textContent='Code falsch.';return}
  code=c;try{LS&&LS.setItem(CK,c)}catch(err){}setRO(false);authUI();await pull()}}

async function initRemote(){
 if(!REMOTE){$('modeNote').textContent='Einträge werden nur in diesem Browser gespeichert. Lade regelmäßig ein Backup herunter – und spiele es auf einem neuen Gerät wieder ein.';status('Lokaler Modus.');return}
 $('modeNote').textContent='Einträge werden online gespeichert. Ein Backup als Datei ist trotzdem sinnvoll, z. B. zum Saisonende.';
 try{await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)});
  sb=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey,{auth:{persistSession:false}});
  const pub=await sb.rpc('plan_is_public',{p:C.planId});isPublic=pub.data!==false;
  if(code){const{data}=await sb.rpc('check_code',{p:C.planId,code});if(data)setRO(false);else{code=null;try{LS.removeItem(CK)}catch(e){}}}
  authUI();await pull();live()}
 catch(e){status('Online-Speicher nicht erreichbar – zuletzt geladener Stand wird angezeigt.')}}

// ---------- Ereignisse ----------
$('segs').addEventListener('click',e=>{const b=e.target.closest('.seg');if(b)go(+b.dataset.i)});
function go(i){cur=Math.max(0,Math.min(NW-1,i));history.replaceState(null,'','#w-'+weeks[cur].replace(/-/g,''));renderWeek()}
$('prev').onclick=()=>go(cur-1);$('next').onclick=()=>go(cur+1);$('today').onclick=()=>go(homeWeek());
$('print').onclick=()=>window.print();
addEventListener('hashchange',()=>{const i=hashWeek();if(i!==null&&i!==cur){cur=i;renderWeek()}});
addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select'))return;if(e.key==='ArrowLeft')go(cur-1);if(e.key==='ArrowRight')go(cur+1)});
function edit(e){const f=e.target.closest('[data-k]');if(!f||readonly)return;const d=f.closest('.day').dataset.d,k=f.dataset.k;
 S.days[d]={...(S.days[d]||{}),[k]:f.type==='checkbox'?f.checked:f.value};sync();if(gsKeys.includes(k))renderSeason();queue('days/'+d,f.type==='checkbox'||f.tagName==='SELECT'?50:700)}
$('days').addEventListener('input',e=>{if(e.target.matches('[data-fb]'))return editFb(e);edit(e)});
$('days').addEventListener('change',e=>{if(e.target.matches('[data-ck]'))return tick(e);if(e.target.type==='checkbox')edit(e)});
function tick(e){if(readonly)return;const i=e.target,d=i.closest('.day').dataset.d,line=i.dataset.ck;const v={...(S.days[d]||{})};const ck=ckSet(v);i.checked?ck.add(line):ck.delete(line);
 const ls=progLines(v.p).filter(l=>!isHead(l));v.ck=ls.filter(l=>ck.has(l));if(ls.length&&v.ck.length===ls.length)v.done=true;S.days[d]=v;sync(true);queue('days/'+d,300)}
function editFb(e){if(readonly)return;const d=e.target.closest('.day').dataset.d;PRIV[d]={fb:e.target.value};queuePriv(d)}
$('wnote').addEventListener('input',e=>{if(readonly)return;const w=weeks[cur];S.weeks[w]={note:e.target.value};$('notesPrint').textContent=e.target.value;queue('weeks/'+w)});
$('copyPrev').onclick=()=>{if(readonly||cur===0)return;const src=wdays(weeks[cur-1]),dst=wdays(weeks[cur]);let n=0;
 dst.forEach((d,i)=>{if(phase(d).t==='out')return;const s=S.days[src[i]]||{},v={...(S.days[d]||{})};let ch=0;['t','f','p','rpe','min'].forEach(k=>{if(s[k]&&!v[k]&&!(k==='t'&&s[k]==='game')){v[k]=s[k];n++;ch=1}});if(ch){S.days[d]=v;queue('days/'+d,50)}});
 sync(true);status(n?`${n} Felder aus der Vorwoche übernommen (nur leere Felder).`:'Nichts zu übernehmen – Vorwoche leer oder Felder schon gefüllt.')};
$('copyTxt').onclick=async()=>{const w=weeks[cur];const t=[`${pl.name} · ${$('kw').textContent} · ${$('wtitle').textContent}`,''].concat(wdays(w).map(d=>{const v=S.days[d]||{},g=GM[d],dt=D(d),p=phase(d);return `${DN[dt.getUTCDay()]} ${d.slice(8)}.${d.slice(5,7)}.${pname(p)?` [${pname(p)}]`:''}`+(effT(d,v)!=='train'?` · ${DT[effT(d,v)]}`:'')+(g?` · ${g[2]==='H'?'HEIM vs':'AUSWÄRTS @'} ${oppName(g)} ${g[1]}`+(parseRes(v)?`\n  Ergebnis: ${parseRes(v).win?'Sieg':'Niederlage'} ${resTxt(parseRes(v))}`:'')+(statLine(v)?`\n  Statistik: ${statLine(v)}`:'')+(v.gN?`\n  Spielnotiz: ${v.gN}`:'')+(+v.gR?`\n  Eigene Note: ${+v.gR}/10`:'')+(v.gC?`\n  Kommentar: ${v.gC}`:''):'')+(v.f?`\n  Fokus: ${v.f}`:'')+(progLines(v.p).length?'\n  Programm:'+progLines(v.p).map(l=>isHead(l)?`\n   ${l}`:`\n   [${ckSet(v).has(l)?'x':' '}] ${l}`).join(''):'')+((PRIV[d]||{}).fb&&!readonly?`\n  Feedback: ${PRIV[d].fb}`:'')+(v.rpe&&v.min?`\n  Last: ${v.rpe} × ${v.min} = ${v.rpe*v.min} AU`:'')}));const n=(S.weeks[w]||{}).note;if(n)t.push('','Notizen: '+n);
 try{await navigator.clipboard.writeText(t.join('\n'));status('Woche in die Zwischenablage kopiert.')}catch(e){status('Kopieren wurde vom Browser blockiert.')}};
$('export').onclick=()=>{const b=new Blob([JSON.stringify({planId:C.planId,exported:new Date().toISOString(),...S,priv:readonly?undefined:PRIV},null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`${C.planId||'plan'}-backup-${todayIso}.json`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)};
$('import').addEventListener('change',async e=>{const f=e.target.files[0];if(!f||readonly)return;try{const x=JSON.parse(await f.text());if(!x||typeof x!=='object'||typeof x.days!=='object')throw 0;
 Object.entries(x.days||{}).forEach(([d,v])=>{if(isDate(d)&&v&&typeof v==='object'){S.days[d]={t:DT[v.t]?String(v.t):'',f:String(v.f??''),p:String(v.p??''),rpe:String(v.rpe??''),min:String(v.min??''),done:!!v.done};gsKeys.forEach(k=>{if(v[k]!=null)S.days[d][k]=String(v[k]).slice(0,k==='gC'?600:140)});if(Array.isArray(v.ck))S.days[d].ck=v.ck.map(String).slice(0,60);dirty.add('days/'+d)}});
 Object.entries(x.weeks||{}).forEach(([w,v])=>{if(isDate(w)&&v){S.weeks[w]={note:String(v.note??'')};dirty.add('weeks/'+w)}});
 if(x.settings){setSettings(x.settings);dirty.add('settings/main')}
 if(x.priv&&typeof x.priv==='object')Object.entries(x.priv).forEach(([d,v])=>{if(isDate(d)&&v&&v.fb){PRIV[d]={fb:String(v.fb).slice(0,1000)};queuePriv(d)}});
 local();renderAll();flushAll();status('Backup eingespielt.')}catch(err){status('Diese Datei ist kein gültiges Backup.')}e.target.value=''});

renderAll();renderTeams();initRemote();
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
}
