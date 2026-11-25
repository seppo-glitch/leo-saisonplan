{
'use strict';
const P = window.PLAN, C = window.CONFIG || {};
const T = P.teams, GM = Object.fromEntries(P.games.map(g => [g[0], g]));
const R0 = P.range.start, R1 = P.range.end;
const PH = {saison:['Saison','var(--saison)'],urlaub:['Urlaub','var(--urlaub)'],camp:['Camp Finnland','var(--camp)'],trans:['Übergang','var(--trans)'],sommer:['Sommertraining','var(--sommer)'],out:['–','var(--trans)']};
const MON=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],MONL=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],DN=['So','Mo','Di','Mi','Do','Fr','Sa'];
const D=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(Date.UTC(y,m-1,d))};
const iso=d=>d.toISOString().slice(0,10), add=(d,n)=>new Date(d.getTime()+n*864e5);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kw=d=>{const t=new Date(d);t.setUTCDate(t.getUTCDate()-((t.getUTCDay()+6)%7)+3);const f=new Date(Date.UTC(t.getUTCFullYear(),0,4));return 1+Math.round(((t-f)/864e5-3+((f.getUTCDay()+6)%7))/7)};
const $=id=>document.getElementById(id);

// Wochen: Montag vor Planstart bis Woche mit Planende
const START=iso(add(D(R0),-((D(R0).getUTCDay()+6)%7)));
const NW=Math.floor((D(R1)-D(START))/864e5/7)+1;
const weeks=Array.from({length:NW},(_,i)=>iso(add(D(START),7*i)));
const wdays=w=>Array.from({length:7},(_,i)=>iso(add(D(w),i)));

// Zustand + lokaler Speicher
const REMOTE=!!(C.supabaseUrl&&C.supabaseAnonKey);
const LSK='bb-plan-'+(C.planId||'default')+(REMOTE?'-remote':''), DK=LSK+'-dirty';
const S={days:{},weeks:{},settings:{aprCamp:P.aprilCampDefault}};
let LS=null, dirty=new Set();
try{LS=window.localStorage;const x=JSON.parse(LS.getItem(LSK)||'null');if(x){Object.assign(S.days,x.days||{});Object.assign(S.weeks,x.weeks||{});if(x.settings)Object.assign(S.settings,x.settings)}dirty=new Set(JSON.parse(LS.getItem(DK)||'[]'))}catch(e){LS=null}
const local=()=>{try{LS&&(LS.setItem(LSK,JSON.stringify(S)),LS.setItem(DK,JSON.stringify([...dirty])))}catch(e){}};

function phase(s){if(s<R0||s>R1)return'out';const a=S.settings.aprCamp;if(a&&s>=a&&s<=iso(add(D(a),6)))return'camp';const p=P.phases.find(p=>s>=p.from&&s<=p.to);return p?p.key:'out'}
function wphase(w){const c={};wdays(w).forEach(d=>{const p=phase(d);c[p]=(c[p]||0)+1});if(c.camp)return'camp';if(c.urlaub)return'urlaub';delete c.out;return Object.keys(c).sort((a,b)=>c[b]-c[a])[0]||'out'}
const now=new Date(),todayIso=iso(new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())));
const weekOf=s=>{const n=Math.floor((D(s)-D(START))/864e5/7);return n<0?0:n>=NW?NW-1:n};
const hashWeek=()=>{const m=location.hash.match(/^#w-(\d{4})(\d{2})(\d{2})$/);return m?weekOf(`${m[1]}-${m[2]}-${m[3]}`):null};
const homeWeek=()=>todayIso>=START&&todayIso<=R1?weekOf(todayIso):0;
let cur=hashWeek()??homeWeek(), readonly=REMOTE;
if(REMOTE)document.body.classList.add('ro');

// Kopf
const pl=P.player, fmt=s=>`${s.slice(8)}.${s.slice(5,7)}.${s.slice(0,4)}`;
$('pname').innerHTML=`${esc(pl.name)} <span class="num">#${esc(pl.number)}</span>`;
$('pmeta').textContent=`${pl.position} · ${pl.club} · ${pl.league}`;
$('prange').textContent=`Saisonplan ${fmt(R0)} – ${fmt(R1)}`;
$('foot').innerHTML=`<b>BB Sports Management</b> · Bernd Brückler Sports Management. Spielplan Stand ${esc(P.asOf)}; Termine und Anspielzeiten können sich durch die Liga ändern.`;
$('aprCamp').innerHTML=P.aprilCampOptions.map(o=>`<option value="${o[0]}">${esc(o[1])}</option>`).join('');
$('legend').innerHTML=['saison','urlaub','camp','sommer','trans'].map(p=>`<span><i style="--c:${PH[p][1]}"></i>${PH[p][0]}</span>`).join('')+'<span><i class="gh"></i>Heimspiel</span><span><i class="g"></i>Auswärtsspiel</span>';

const badge=c=>`<span class="badge"><span class="mono">${esc(T[c][2])}</span><img src="logos/${c}.png" alt="" onerror="this.remove()"></span>`;

function renderRibbon(){
 $('segs').innerHTML=weeks.map((w,i)=>{const p=wphase(w),a=wdays(w),gs=a.map(d=>GM[d]).filter(Boolean);
  return `<button class="seg${i===cur?' on':''}" style="--c:${PH[p][1]}" data-i="${i}" aria-label="KW ${kw(D(w))}, ${a[0].slice(8)}.${a[0].slice(5,7)}. bis ${a[6].slice(8)}.${a[6].slice(5,7)}., ${PH[p][0]}${gs.length?', '+gs.length+' Spiele':''}"><span class="dots">${gs.map(g=>`<i class="${g[2]==='H'?'h':''}"></i>`).join('')}</span></button>`}).join('');
 let last=-1;$('mons').innerHTML=weeks.map(w=>{const m=add(D(w),3).getUTCMonth();const s=m!==last?MON[m]:'';last=m;return `<span>${s}</span>`}).join('');
}

function dayHtml(d){const p=phase(d),dt=D(d),g=GM[d];
 const gh=g?`<div class="game ${g[2]==='H'?'h':'a'}">${badge(g[3])}<span class="ha">${g[2]==='H'?'HEIM':'AUSWÄRTS'}</span><span class="opp">${g[2]==='H'?'vs ':'@ '}${esc(T[g[3]][0])}</span><span class="gm">${esc(g[1])} Uhr · ${esc(g[2]==='H'?pl.homeVenue:T[g[3]][1])}</span></div>`:'';
 const f=p==='out'?'<p class="small" style="margin:0">Außerhalb des Planungszeitraums</p>':`
  <label class="lab">Fokus<input class="in" data-k="f" list="foci" placeholder="${g?'Spieltag':'z. B. Kraft Maximal'}" autocomplete="off"></label>
  <label class="lab">Trainingsprogramm<textarea data-k="p" rows="4" placeholder="Einheiten, Inhalte, Sätze × Wdh., Umfang …"></textarea></label>
  <div class="row"><label class="lab">RPE (1–10)<select data-k="rpe"><option value="">–</option>${[1,2,3,4,5,6,7,8,9,10].map(n=>`<option>${n}</option>`).join('')}</select></label><label class="lab">Minuten<input class="in" data-k="min" type="number" inputmode="numeric" min="0" max="600"></label></div>
  <div class="ft"><span>Last <span class="ld" data-load></span></span><label class="chk"><input type="checkbox" data-k="done">erledigt</label></div>
  <div class="pv" data-pv></div>`;
 return `<article class="day${p==='out'?' out':''}${d===todayIso?' today':''}" style="--c:${PH[p][1]}" data-d="${d}"><div class="dh"><span class="dd">${String(dt.getUTCDate()).padStart(2,'0')}</span><span class="dn">${DN[dt.getUTCDay()]}</span><span class="dm">${MON[dt.getUTCMonth()]}</span>${p!=='out'?`<span class="ph">${PH[p][0]}</span>`:''}</div>${gh}${f}</article>`}

function renderWeek(){const w=weeks[cur],ds=wdays(w),a=D(ds[0]),b=D(ds[6]);
 $('kw').textContent=`KW ${kw(a)} · ${PH[wphase(w)][0]}`;
 $('wtitle').textContent=a.getUTCMonth()===b.getUTCMonth()?`${a.getUTCDate()}.–${b.getUTCDate()}. ${MONL[b.getUTCMonth()]} ${b.getUTCFullYear()}`:`${a.getUTCDate()}. ${MONL[a.getUTCMonth()]} – ${b.getUTCDate()}. ${MONL[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
 $('days').innerHTML=ds.map(dayHtml).join('');
 const urlaub=P.phases.find(p=>p.key==='urlaub');
 $('hint').innerHTML=urlaub&&ds.some(d=>d>=urlaub.from&&d<=urlaub.to)?'<p class="hint">Urlaub gilt nur, wenn die Pioneers die Pre-Playoffs (Platz 7–10) verpassen. Sonst verschieben sich Urlaub und Camp um die Playoff-Dauer.</p>':(ds.some(d=>d>R1)?'<p class="hint">Ende des Planungszeitraums. Ab September beginnt die Vorbereitung auf die nächste Saison.</p>':'');
 document.querySelectorAll('.seg').forEach((s,i)=>{s.classList.toggle('on',i===cur);i===cur?s.setAttribute('aria-current','true'):s.removeAttribute('aria-current')});
 sync(true)}

function sync(force){const w=weeks[cur],ds=wdays(w);
 document.querySelectorAll('.day').forEach(el=>{const v=S.days[el.dataset.d]||{};
  el.querySelectorAll('[data-k]').forEach(f=>{if(f===document.activeElement&&!force)return;const k=f.dataset.k;if(f.type==='checkbox')f.checked=!!v[k];else if(f.value!==String(v[k]??''))f.value=v[k]??'';f.disabled=readonly});
  const x=(+v.rpe||0)*(+v.min||0),l=el.querySelector('[data-load]');if(l)l.textContent=x?x+' AU':'–';
  const pv=el.querySelector('[data-pv]');if(pv)pv.innerHTML=((v.f?`<b>Fokus</b>${esc(v.f)}`:'')+(v.p?`<b>Programm</b>${esc(v.p)}`:'')+(x?`<b>Last</b>${esc(v.rpe)} × ${esc(v.min)} = ${x} AU`:'')+(v.done?'<b>Status</b>erledigt ✓':''))||'<span class="none">Kein Eintrag</span>'});
 const note=(S.weeks[w]||{}).note||'',n=$('wnote');if(n!==document.activeElement||force)n.value=note;n.disabled=readonly;
 $('notesPrint').textContent=note||(readonly?'Keine Wochennotizen.':'');
 const gs=ds.map(d=>GM[d]).filter(Boolean),h=gs.filter(g=>g[2]==='H').length;
 let load=0,mins=0,done=0,plan=0;ds.forEach(d=>{const v=S.days[d]||{};load+=(+v.rpe||0)*(+v.min||0);mins+=+v.min||0;if(v.done)done++;if(v.f||v.p)plan++});
 $('stats').innerHTML=[[String(gs.length),gs.length?`Spiele · ${h} Heim / ${gs.length-h} Auswärts`:'Spiele diese Woche'],[load?load.toLocaleString('de-AT'):'–','Wochenlast (RPE × Min, AU)'],[mins?`${Math.floor(mins/60)} h ${String(mins%60).padStart(2,'0')}`:'–','Trainingszeit'],[`${done} / ${plan}`,'Einheiten erledigt / geplant']].map(s=>`<div class="stat"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}

function renderTeams(){$('teams').innerHTML=Object.keys(T).map(c=>`<div class="team">${badge(c)}<div>${esc(T[c][0])}<br><span class="small">logos/${c}.png</span></div></div>`).join('')}
function renderAll(){renderRibbon();renderWeek();$('aprCamp').value=S.settings.aprCamp}

// ---------- Speicher: lokal oder Supabase ----------
const status=t=>{$('status').textContent=t};
let sb=null, session=null;
const remoteOn=()=>!!(sb&&session);
const timers={},busy={},again={};
const body=path=>{const[c,id]=path.split('/');return c==='days'?(S.days[id]||{}):c==='weeks'?(S.weeks[id]||{}):S.settings};
function apply(path,data){const[c,id]=path.split('/');if(!data||typeof data!=='object')return;if(c==='days')S.days[id]={...data};else if(c==='weeks')S.weeks[id]={...data};else if(path==='settings/main'&&typeof data.aprCamp==='string')S.settings.aprCamp=data.aprCamp}
function queue(path,ms=700){dirty.add(path);local();clearTimeout(timers[path]);timers[path]=setTimeout(()=>{delete timers[path];flush(path)},ms);status(remoteOn()?'Wird gespeichert …':'In diesem Browser gespeichert.')}
async function flush(path){if(!remoteOn())return;if(busy[path]){again[path]=1;return}busy[path]=1;
 try{const{error}=await sb.from('plan_entries').upsert({plan_id:C.planId,path,data:body(path),updated_by:session.user.id,updated_at:new Date().toISOString()},{onConflict:'plan_id,path'});
  if(error)throw error;dirty.delete(path);local();status('Gespeichert · für Leo und Coach sichtbar.')}
 catch(e){const rls=e&&(e.code==='42501'||/row-level security/i.test(e.message||''));status(rls?'Kein Schreibrecht: Diese E-Mail ist für den Plan nicht freigeschaltet. Einträge bleiben lokal.':'Offline oder Server nicht erreichbar – lokal gesichert, wird später nachgeladen.')}
 busy[path]=0;if(again[path]){again[path]=0;flush(path)}}
const flushAll=()=>[...dirty].forEach(p=>flush(p));
addEventListener('online',flushAll);

function setRO(v){readonly=v;document.body.classList.toggle('ro',v);sync(true)}
async function pull(){const{data,error}=await sb.from('plan_entries').select('path,data').eq('plan_id',C.planId);
 if(error){status('Daten konnten nicht geladen werden: '+error.message);return}
 if(readonly){S.days={};S.weeks={}}
 data.forEach(r=>{if(readonly||!dirty.has(r.path))apply(r.path,r.data)});local();renderAll();
 status(readonly?'Nur-Lese-Ansicht · Stand: live.':(data.length?'Synchronisiert.':'Angemeldet. Noch keine Einträge.'));if(!readonly)flushAll()}

let channel=null;
function live(){if(channel)return;channel=sb.channel('plan-'+C.planId).on('postgres_changes',{event:'*',schema:'public',table:'plan_entries',filter:'plan_id=eq.'+C.planId},pl=>{const r=pl.new;if(!r||!r.path||(!readonly&&(dirty.has(r.path)||timers[r.path]||busy[r.path])))return;apply(r.path,r.data);local();if(r.path==='settings/main')renderAll();else sync()}).subscribe()}

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
$('aprCamp').addEventListener('change',e=>{if(readonly){e.target.value=S.settings.aprCamp;return}S.settings.aprCamp=e.target.value;renderRibbon();renderWeek();queue('settings/main',50)});
$('copyPrev').onclick=()=>{if(readonly||cur===0)return;const src=wdays(weeks[cur-1]),dst=wdays(weeks[cur]);let n=0;
 dst.forEach((d,i)=>{if(phase(d)==='out')return;const s=S.days[src[i]]||{},v={...(S.days[d]||{})};let ch=0;['f','p','rpe','min'].forEach(k=>{if(s[k]&&!v[k]){v[k]=s[k];n++;ch=1}});if(ch){S.days[d]=v;queue('days/'+d,50)}});
 sync(true);status(n?`${n} Felder aus der Vorwoche übernommen (nur leere Felder).`:'Nichts zu übernehmen – Vorwoche leer oder Felder schon gefüllt.')};
$('copyTxt').onclick=async()=>{const w=weeks[cur];const t=[`${pl.name} · ${$('kw').textContent} · ${$('wtitle').textContent}`,''].concat(wdays(w).map(d=>{const v=S.days[d]||{},g=GM[d],dt=D(d);return `${DN[dt.getUTCDay()]} ${d.slice(8)}.${d.slice(5,7)}. [${PH[phase(d)][0]}]`+(g?` · ${g[2]==='H'?'HEIM vs':'AUSWÄRTS @'} ${T[g[3]][0]} ${g[1]}`:'')+(v.f?`\n  Fokus: ${v.f}`:'')+(v.p?`\n  Programm: ${v.p}`:'')+(v.rpe&&v.min?`\n  Last: ${v.rpe} × ${v.min} = ${v.rpe*v.min} AU`:'')}));const n=(S.weeks[w]||{}).note;if(n)t.push('','Notizen: '+n);
 try{await navigator.clipboard.writeText(t.join('\n'));status('Woche in die Zwischenablage kopiert.')}catch(e){status('Kopieren wurde vom Browser blockiert.')}};
$('export').onclick=()=>{const b=new Blob([JSON.stringify({planId:C.planId,exported:new Date().toISOString(),...S},null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`${C.planId||'plan'}-backup-${todayIso}.json`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)};
$('import').addEventListener('change',async e=>{const f=e.target.files[0];if(!f||readonly)return;try{const x=JSON.parse(await f.text());if(!x||typeof x!=='object'||typeof x.days!=='object')throw 0;
 Object.entries(x.days||{}).forEach(([d,v])=>{if(/^\d{4}-\d{2}-\d{2}$/.test(d)&&v&&typeof v==='object'){S.days[d]={f:String(v.f??''),p:String(v.p??''),rpe:String(v.rpe??''),min:String(v.min??''),done:!!v.done};dirty.add('days/'+d)}});
 Object.entries(x.weeks||{}).forEach(([w,v])=>{if(/^\d{4}-\d{2}-\d{2}$/.test(w)&&v){S.weeks[w]={note:String(v.note??'')};dirty.add('weeks/'+w)}});
 if(x.settings&&typeof x.settings.aprCamp==='string'){S.settings.aprCamp=x.settings.aprCamp;dirty.add('settings/main')}
 local();renderAll();flushAll();status('Backup eingespielt.')}catch(err){status('Diese Datei ist kein gültiges Backup.')}e.target.value=''});

renderAll();renderTeams();initRemote();
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
}
