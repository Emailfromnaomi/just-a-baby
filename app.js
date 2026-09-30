/* Just a Baby
 *
 * One script, no build step. Sections:
 *   constants and icons · state · helpers · need math · portrait
 *   render · storage (cloud via Supabase, or local) · sheets · settings
 *   sign-in and setup screens · boot
 *
 * Storage: when config.js has Supabase keys the app runs in cloud mode (accounts,
 * sync between caregivers). Otherwise it runs in local mode (sample day,
 * localStorage only), which is how the original single-file version behaved.
 */
(function(){
const $=s=>document.querySelector(s);
const MIN=60000, HR=3600000, DAY=86400000;
const CFG=window.JAB_CONFIG||{};
const CLOUD=!!(CFG.supabaseUrl&&CFG.supabaseAnonKey&&window.supabase&&window.supabase.createClient);
const LS={events:'ln-events',profile:'ln-profile',baby:'jab-baby',invite:'jab-invite',outbox:'jab-outbox',imported:'jab-imported'};
function lsGet(k,fb){try{const v=localStorage.getItem(k);return v==null?fb:JSON.parse(v)}catch(_){return fb}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}
function lsDel(k){try{localStorage.removeItem(k)}catch(_){}}

/* ---------- icons ---------- */
const IC={
 bottle:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2h4M10.5 2v3l-2 2.5V20a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2V7.5l-2-2.5V2"/><path d="M8.5 12h7M8.5 16h7"/></svg>',
 moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
 sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>',
 drop:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z"/></svg>',
 diaper:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 7h18v3c0 5-4 9-9 9s-9-4-9-9z"/><path d="M8 10c0 2.5 1.8 4.5 4 4.5s4-2 4-4.5"/></svg>',
 heart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20s-7-4.3-8.6-8.7C2.2 8 4.2 5 7.2 5c1.9 0 3.2 1 4.8 2.8C13.6 6 14.9 5 16.8 5c3 0 5 3 3.8 6.3C19 15.7 12 20 12 20z"/></svg>',
 rattle:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="9" r="5.5"/><path d="M13 13l7 7M18 16l-2 2"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/></svg>',
 tub:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"/><path d="M6 12V6a2 2 0 0 1 3.5-1.3M7 19l-1 2M17 19l1 2"/><circle cx="13" cy="8" r="1"/><circle cx="16" cy="6" r="1.3"/></svg>'
};
const TYPE_ICON={feed:'bottle',sleep:'moon',diaper:'diaper',play:'rattle',bath:'tub'};
const SUBS={
 feed:{bottle:'Bottle',left:'Left side',right:'Right side',solids:'Solids'},
 diaper:{wet:'Wet',dirty:'Dirty',both:'Wet + dirty'},
 play:{tummy:'Tummy time',play:'Playtime',read:'Story time',cuddle:'Cuddles',outside:'Outside'}
};
const TYPE_LABEL={feed:'Feed',sleep:'Sleep',diaper:'Diaper',play:'Play',bath:'Bath'};

/* ---------- look options ---------- */
const SKIN=['#F6D8C4','#EDC1A0','#D9A07A','#BF8158','#955D3E','#6A412B'];
const HAIRC=['#2A1A12','#5E3A22','#A06A3A','#E0BD72','#B8532E','#E9DFC8'];
const EYES=['#4A3224','#4C79A8','#58804C','#7A6A4A'];
const OUTFIT=['#8FC0E3','#F0A7B8','#EDCB63','#95CFA0','#BFA8E0','#8E3848'];
const HAIRS={fuzz:'Peach fuzz',wisps:'Wisps',curls:'Curls',buns:'Space buns',puffs:'Puffs + bows',braids:'Braids'};
const OUTFITS={onesie:'Onesie',stripes:'Striped tee',stars:'Star sleeper',gingham:'Gingham romper',overalls:'Overalls'};

/* ---------- state ---------- */
const DEFAULT_PROFILE={name:'Baby',birth:'',unit:'ml',feedH:3,wakeH:1.5,diaperH:3,playH:3,sound:true,lastAmount:90,
  look:{skin:1,hair:'wisps',hairColor:1,eyes:0,outfit:0,style:'onesie',paci:false}};
let profile=clone(DEFAULT_PROFILE);
let events={};
let sb=null, user=null, baby=null, babies=[], myRole='owner', channel=null;
function clone(o){return JSON.parse(JSON.stringify(o))}
function mergeProfile(p){const out=clone(DEFAULT_PROFILE);if(p){Object.assign(out,p);out.look=Object.assign(clone(DEFAULT_PROFILE.look),p.look||{});}
  if(!HAIRS[out.look.hair])out.look.hair=out.look.hair==='none'?'fuzz':'wisps';
  if(!OUTFITS[out.look.style])out.look.style='onesie';
  return out}

/* sample day: local mode only, while the log is empty */
function sampleEvents(){
  const n=Date.now(), o={};
  const add=(id,type,ago,extra)=>{o[id]=Object.assign({id,type,t:n-ago},extra||{})};
  add('s1','feed',7.2*HR,{sub:'left'});add('s2','diaper',6.8*HR,{sub:'wet'});add('s3','sleep',6.4*HR,{end:n-4.9*HR});
  add('s4','feed',4.6*HR,{sub:'bottle',amount:90});add('s5','play',4.1*HR,{sub:'tummy'});add('s6','diaper',3.6*HR,{sub:'dirty'});
  add('s7','sleep',3.2*HR,{end:n-1.9*HR});add('s8','feed',1.1*HR,{sub:'right'});add('s9','bath',1.3*HR,{});
  add('s10','diaper',55*MIN,{sub:'wet'});add('s11','play',25*MIN,{sub:'read'});
  return o;
}
const sample=sampleEvents();
function usingSample(){return !CLOUD&&Object.keys(events).length===0}
function all(){const src=usingSample()?sample:events;return Object.values(src).filter(e=>e&&e.t).sort((a,b)=>b.t-a.t)}

/* ---------- helpers ---------- */
function dayKey(t){const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function dur(ms){ms=Math.max(0,ms);const m=Math.round(ms/MIN);if(m<1)return 'under a minute';if(m<60)return m+'m';const h=Math.floor(m/60),r=m%60;return r?h+'h '+r+'m':h+'h'}
function ago(t){const ms=Date.now()-t;return ms<MIN?'just now':dur(ms)+' ago'}
function clock(t){return new Date(t).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,9)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmtAmt(ml){if(ml==null)return '';return profile.unit==='oz'?(Math.round(ml/29.5735*2)/2)+' oz':Math.round(ml)+' ml'}
function colorFor(v){return `hsl(${clamp(v*1.15,14,118)} 64% 50%)`}
function mix(a,b,t){const pa=parseInt(a.slice(1),16),pb=parseInt(b.slice(1),16);const r=Math.round((pa>>16)*(1-t)+(pb>>16)*t),g=Math.round((pa>>8&255)*(1-t)+(pb>>8&255)*t),bl=Math.round((pa&255)*(1-t)+(pb&255)*t);return '#'+((1<<24)+(r<<16)+(g<<8)+bl).toString(16).slice(1)}
function show(id){['bootScreen','authScreen','setupScreen','appScreen'].forEach(s=>{$('#'+s).hidden=s!==id})}

/* ---------- need math ---------- */
function lastOf(type){return all().find(e=>e.type===type)}
function sleepingNow(){const s=lastOf('sleep');return s&&!s.end?s:null}
function lastWake(){let m=0;for(const e of all())if(e.type==='sleep'&&e.end)m=Math.max(m,e.end);return m||null}
function sleepBetween(a,b){let s=0;for(const e of all()){if(e.type!=='sleep')continue;const st=Math.max(a,e.t),en=Math.min(b,e.end||Date.now());if(en>st)s+=en-st}return s}
function decay(elapsed,intervalH){return clamp(100-elapsed/(intervalH*HR)*70,0,100)}
function detail(e){
  if(e.type==='feed')return (SUBS.feed[e.sub]||'Feed')+(e.amount?' · '+fmtAmt(e.amount):'');
  if(e.type==='sleep')return e.end?dur(e.end-e.t):'Still asleep';
  if(SUBS[e.type])return SUBS[e.type][e.sub]||'';
  return '';
}
function computeNeeds(){
  const n=Date.now(), out={};
  const f=lastOf('feed');
  out.hunger=!f?{v:null,sub:'No feeds logged yet'}:{v:decay(n-f.t,profile.feedH),sub:`Fed ${ago(f.t)} · next around ${clock(f.t+profile.feedH*HR)}`};
  const s=sleepingNow();
  if(s){const sl=n-s.t;out.energy={v:clamp(40+sl/HR*60,40,100),sub:`Asleep for ${dur(sl)}`,sleeping:true};}
  else{const w=lastWake();if(!w)out.energy={v:null,sub:'No sleep logged yet'};else{const aw=n-w;out.energy={v:decay(aw,profile.wakeH),sub:`Awake ${dur(aw)}`+(aw>profile.wakeH*HR?' · nap window is open':` · nap around ${clock(w+profile.wakeH*HR)}`)};}}
  const d=lastOf('diaper');
  out.hygiene=!d?{v:null,sub:'No changes logged yet'}:{v:decay(n-d.t,profile.diaperH),sub:`Changed ${ago(d.t)} · ${(SUBS.diaper[d.sub]||'').toLowerCase()}`};
  const p=lastOf('play');
  if(!p)out.social={v:null,sub:'No play logged yet'};
  else{const el=(n-p.t)-sleepBetween(p.t,n);out.social={v:decay(el,profile.playH),sub:`${SUBS.play[p.sub]||'Play'} ${ago(p.t)}`};}
  return out;
}
function mood(needs){
  if(needs.energy.sleeping)return {label:'Sleeping',v:85,face:'sleep'};
  const vs=['hunger','energy','hygiene','social'].map(k=>needs[k].v).filter(v=>v!=null);
  if(!vs.length)return {label:'Content',v:70,face:'calm'};
  const avg=vs.reduce((a,b)=>a+b,0)/vs.length, mn=Math.min(...vs), sc=avg*.5+mn*.5;
  if(sc>=70)return {label:'Happy',v:sc,face:'happy'};
  if(sc>=45)return {label:'Content',v:sc,face:'calm'};
  if(sc>=25)return {label:'Fussy',v:sc,face:'fuss'};
  return {label:'Needs you',v:sc,face:'cry'};
}
function moodlets(needs){
  const n=Date.now(), L=[];
  const f=lastOf('feed'), d=lastOf('diaper'), p=lastOf('play'), b=lastOf('bath'), s=sleepingNow();
  if(s)L.push(['good','z','Snoozing']);
  if(f&&n-f.t<45*MIN)L.push(['good','+','Full Tummy']);
  if(needs.hunger.v!=null&&needs.hunger.v<30)L.push(['bad','!','Getting Hungry']);
  if(d&&n-d.t<30*MIN)L.push(['good','+','Fresh Diaper']);
  if(needs.hygiene.v!=null&&needs.hygiene.v<30)L.push(['bad','!','Diaper Check']);
  const ls=all().find(e=>e.type==='sleep'&&e.end);
  if(!s&&ls&&n-ls.end<90*MIN&&ls.end-ls.t>=HR)L.push(['good','+','Well Rested']);
  if(!s&&needs.energy.v!=null&&needs.energy.v<30)L.push(['bad','!','Sleepy Eyes']);
  if(p&&n-p.t<60*MIN)L.push(['good','+',{tummy:'Strong Neck',play:'Playful',read:'Story Time',cuddle:'Snuggled',outside:'Fresh Air'}[p.sub]||'Playful']);
  if(!s&&needs.social.v!=null&&needs.social.v<30)L.push(['bad','!','Wants Company']);
  if(b&&n-b.t<3*HR)L.push(['good','+','Squeaky Clean']);
  if(['hunger','energy','hygiene','social'].every(k=>needs[k].v!=null&&needs[k].v>=60))L.push(['good','+','Happy Baby']);
  return L.sort((a,b)=>(a[0]==='bad'?0:1)-(b[0]==='bad'?0:1));
}

/* ---------- portrait ---------- */
let avN=0;
function qp(p0,c,p2,t){const u=1-t;return [u*u*p0[0]+2*u*t*c[0]+t*t*p2[0],u*u*p0[1]+2*u*t*c[1]+t*t*p2[1]]}
function avatarSVG(look,face){
  const P='av'+(++avN);
  const sk=SKIN[look.skin]||SKIN[1], skL=mix(sk,'#FFF6EE',.42), skS=mix(sk,'#6B2F25',.36), skD=mix(sk,'#3E1A14',.6);
  const lip=mix(sk,'#C4545F',.5), lipL=mix(lip,'#FFFFFF',.18);
  const hc=HAIRC[look.hairColor]||HAIRC[1], hcL=mix(hc,'#FFFFFF',.32), hcD=mix(hc,'#000000',.4);
  const ey=EYES[look.eyes]||EYES[0], eyL=mix(ey,'#FFFFFF',.5), eyD=mix(ey,'#000000',.5);
  const of=OUTFIT[look.outfit]||OUTFIT[0], ofL=mix(of,'#FFFFFF',.6), ofD=mix(of,'#000000',.28), ofP=mix(of,'#FFFFFF',.78);
  const HEAD='M150 50C212 50 246 98 246 152C246 208 206 248 150 248C94 248 54 208 54 152C54 98 88 50 150 50Z';
  const TORSO='M26 330C26 282 72 262 122 257Q150 270 178 257C228 262 274 282 274 330Z';
  const sleep=face==='sleep';
  let defs=`<defs>
   <radialGradient id="${P}sk" cx=".42" cy=".36" r=".78"><stop offset="0" stop-color="${skL}"/><stop offset=".55" stop-color="${sk}"/><stop offset="1" stop-color="${skS}"/></radialGradient>
   <radialGradient id="${P}ear" cx=".35" cy=".4" r=".8"><stop offset="0" stop-color="${sk}"/><stop offset="1" stop-color="${skS}"/></radialGradient>
   <linearGradient id="${P}neck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skD}" stop-opacity=".7"/><stop offset=".45" stop-color="${skS}" stop-opacity=".25"/><stop offset="1" stop-color="${sk}" stop-opacity="0"/></linearGradient>
   <radialGradient id="${P}bl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FF7D86" stop-opacity=".5"/><stop offset="1" stop-color="#FF7D86" stop-opacity="0"/></radialGradient>
   <radialGradient id="${P}scl" cx=".5" cy=".6" r=".6"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".8" stop-color="#F1E8E4"/><stop offset="1" stop-color="#D9C9C2"/></radialGradient>
   <radialGradient id="${P}iris" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="${eyL}"/><stop offset=".55" stop-color="${ey}"/><stop offset=".92" stop-color="${eyD}"/><stop offset="1" stop-color="#140C08"/></radialGradient>
   <linearGradient id="${P}lids" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A2418" stop-opacity=".5"/><stop offset=".45" stop-color="#4A2418" stop-opacity="0"/></linearGradient>
   <radialGradient id="${P}hair" cx=".42" cy=".2" r=".85"><stop offset="0" stop-color="${hcL}"/><stop offset=".5" stop-color="${hc}"/><stop offset="1" stop-color="${hcD}"/></radialGradient>
   <radialGradient id="${P}ball" cx=".38" cy=".32" r=".7"><stop offset="0" stop-color="${hcL}"/><stop offset=".6" stop-color="${hc}"/><stop offset="1" stop-color="${hcD}"/></radialGradient>
   <linearGradient id="${P}cloth" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
   <linearGradient id="${P}clothV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient>
   <radialGradient id="${P}paci" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="${ofL}"/><stop offset="1" stop-color="${of}"/></radialGradient>
   <radialGradient id="${P}knob" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D8D2CC"/></radialGradient>
   <pattern id="${P}stripes" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="${ofP}"/><rect width="16" height="7" fill="${of}"/></pattern>
   <pattern id="${P}stars" width="34" height="34" patternUnits="userSpaceOnUse"><rect width="34" height="34" fill="${ofP}"/><path d="M9 3l1.9 4 4.3.5-3.2 2.9.9 4.3L9 12.5l-3.9 2.2.9-4.3L2.8 7.5 7.1 7z" fill="${of}"/><path d="M26 19l1.9 4 4.3.5-3.2 2.9.9 4.3-3.9-2.2-3.9 2.2.9-4.3-3.2-2.9 4.3-.5z" fill="${of}"/></pattern>
   <pattern id="${P}ging" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="${ofP}"/><rect width="9" height="18" fill="${of}" opacity=".45"/><rect width="18" height="9" fill="${of}" opacity=".45"/></pattern>
   <clipPath id="${P}hc"><path d="${HEAD}"/></clipPath>
   <filter id="${P}b2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2"/></filter>
   <filter id="${P}b6" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
   <filter id="${P}b12" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="12"/></filter>
  </defs>`;
  const st=look.style;
  let body=`<ellipse cx="150" cy="322" rx="120" ry="18" fill="#000" opacity=".12" filter="url(#${P}b12)"/>`;
  body+=`<rect x="120" y="215" width="60" height="70" rx="24" fill="${sk}"/><rect x="120" y="215" width="60" height="70" rx="24" fill="url(#${P}neck)"/>`;
  if(st==='gingham'){
    body+=`<path d="${TORSO}" fill="url(#${P}sk)"/><path d="${TORSO}" fill="url(#${P}cloth)"/>`;
    body+=`<path d="M86 330L94 290Q150 302 206 290L214 330Z" fill="url(#${P}ging)"/><path d="M86 330L94 290Q150 302 206 290L214 330Z" fill="url(#${P}cloth)"/>`;
    body+=`<path d="M104 292L92 262" stroke="url(#${P}ging)" stroke-width="16" stroke-linecap="round"/><path d="M196 292L208 262" stroke="url(#${P}ging)" stroke-width="16" stroke-linecap="round"/>`;
    body+=`<path d="M94 292Q150 304 206 292" stroke="${ofD}" stroke-width="3" fill="none" opacity=".5"/><circle cx="132" cy="306" r="3.5" fill="#fff" stroke="${ofD}"/><circle cx="168" cy="306" r="3.5" fill="#fff" stroke="${ofD}"/>`;
  } else if(st==='overalls'){
    const shirt=mix(of,'#FFFFFF',.72);
    body+=`<path d="${TORSO}" fill="${shirt}"/><path d="${TORSO}" fill="url(#${P}cloth)"/>`;
    body+=`<path d="M104 262Q116 272 128 262Q140 272 150 266Q160 272 172 262Q184 272 196 262" stroke="${mix(shirt,'#000',.1)}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    body+=`<path d="M92 330L98 292L202 292L208 330Z" fill="${of}"/><path d="M92 330L98 292L202 292L208 330Z" fill="url(#${P}cloth)"/>`;
    body+=`<path d="M110 294L100 264" stroke="${of}" stroke-width="15" stroke-linecap="round"/><path d="M190 294L200 264" stroke="${of}" stroke-width="15" stroke-linecap="round"/>`;
    body+=`<circle cx="112" cy="298" r="5.5" fill="#E7C27A" stroke="#A9803A"/><circle cx="188" cy="298" r="5.5" fill="#E7C27A" stroke="#A9803A"/><rect x="128" y="302" width="44" height="22" rx="4" fill="none" stroke="${ofD}" stroke-width="2" stroke-dasharray="4 3"/>`;
  } else {
    const fill=st==='stripes'?`url(#${P}stripes)`:st==='stars'?`url(#${P}stars)`:of;
    body+=`<path d="${TORSO}" fill="${fill}"/><path d="${TORSO}" fill="url(#${P}cloth)"/><path d="${TORSO}" fill="url(#${P}clothV)"/>`;
    const trim=st==='onesie'?ofD:of;
    body+=`<path d="M122 257Q150 272 178 257" stroke="${trim}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".85"/>`;
    if(st==='onesie')body+=`<circle cx="150" cy="292" r="3.5" fill="${ofP}"/><circle cx="150" cy="310" r="3.5" fill="${ofP}"/>`;
  }
  body+=`<ellipse cx="150" cy="258" rx="44" ry="12" fill="${skD}" opacity=".35" filter="url(#${P}b6)"/>`;
  let behind='';
  if(look.hair==='puffs'){
    [[66,84],[234,84]].forEach(([x,y],i)=>{const s=i?1:-1;
      behind+=`<g>${[[0,0,24],[s*14,-12,15],[s*16,10,14],[-s*4,-18,13],[s*2,18,13],[s*22,-2,12]].map(c=>`<circle cx="${x+c[0]}" cy="${y+c[1]}" r="${c[2]}" fill="url(#${P}ball)"/>`).join('')}</g>`;});
  }
  let ears='';
  [[58,1],[242,-1]].forEach(([x,s])=>{ears+=`<ellipse cx="${x}" cy="164" rx="17" ry="23" fill="url(#${P}ear)"/><path d="M${x+s*4} 150Q${x-s*8} 164 ${x+s*2} 180" stroke="${skS}" stroke-width="3" fill="none" opacity=".55" stroke-linecap="round"/>`;});
  let head=`<path d="${HEAD}" fill="url(#${P}sk)"/>
   <g clip-path="url(#${P}hc)">
    <ellipse cx="130" cy="92" rx="46" ry="26" fill="#fff" opacity=".22" filter="url(#${P}b12)"/>
    <ellipse cx="150" cy="258" rx="90" ry="30" fill="${skS}" opacity=".35" filter="url(#${P}b12)"/>
    <ellipse cx="56" cy="160" rx="20" ry="60" fill="${skS}" opacity=".25" filter="url(#${P}b12)"/>
    <ellipse cx="244" cy="160" rx="20" ry="60" fill="${skS}" opacity=".25" filter="url(#${P}b12)"/>
   </g>`;
  const blushO=face==='happy'?1:face==='cry'?1.1:.8;
  head+=`<ellipse cx="102" cy="204" rx="32" ry="22" fill="url(#${P}bl)" opacity="${blushO}"/><ellipse cx="198" cy="204" rx="32" ry="22" fill="url(#${P}bl)" opacity="${blushO}"/>`;
  function eye(x,y,side){
    const w=23;
    if(face==='sleep'){
      let g=`<path d="M${x-w} ${y-2}Q${x} ${y+12} ${x+w} ${y-2}" stroke="${skD}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      g+=`<path d="M${x-w+2} ${y-6}Q${x} ${y-12} ${x+w-2} ${y-6}" stroke="${skS}" stroke-width="1.6" fill="none" opacity=".45"/>`;
      [0.12,0.26,0.4].forEach(t=>{const tt=side<0?t:1-t;const pt=qp([x-w,y-2],[x,y+12],[x+w,y-2],tt);g+=`<path d="M${pt[0]} ${pt[1]}l${side*-3} 5" stroke="${skD}" stroke-width="1.6" stroke-linecap="round"/>`});
      return g;
    }
    if(face==='cry'){
      return `<path d="M${x-w+2} ${y+2}Q${x} ${y-10} ${x+w-2} ${y+2}" stroke="${skD}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
        <path d="M${x-w+6} ${y-10}Q${x} ${y-18} ${x+w-6} ${y-10}" stroke="${skS}" stroke-width="2" fill="none" opacity=".5"/>
        <path d="M${x+side*-18} ${y+10}q-4 12 0 18q5-6 0-18z" fill="#CDEBFF" opacity=".9"/>`;
    }
    const top=face==='happy'?11:18, bot=face==='happy'?5:14;
    const cT=[x,y-2*top], cB=[x,y+2*bot];
    const shape=`M${x-w} ${y}Q${cT[0]} ${cT[1]} ${x+w} ${y}Q${cB[0]} ${cB[1]} ${x-w} ${y}Z`;
    const cid=P+'e'+(side<0?'l':'r');
    let g=`<clipPath id="${cid}"><path d="${shape}"/></clipPath>`;
    g+=`<ellipse cx="${x}" cy="${y-top-10}" rx="${w+4}" ry="10" fill="${skS}" opacity=".28" filter="url(#${P}b6)"/>`;
    g+=`<path d="${shape}" fill="url(#${P}scl)"/>`;
    g+=`<g clip-path="url(#${cid})">
         <circle cx="${x+side*1.5}" cy="${y+1}" r="15.5" fill="url(#${P}iris)"/>
         <circle cx="${x+side*1.5}" cy="${y+1}" r="6.5" fill="#100907"/>
         <path d="${shape}" fill="url(#${P}lids)"/>
         <circle cx="${x-5}" cy="${y-5}" r="4.4" fill="#fff" opacity=".95"/>
         <circle cx="${x+6}" cy="${y+6}" r="1.9" fill="#fff" opacity=".7"/>
         <rect class="lid${side>0?' r':''}" x="${x-w-2}" y="${y-2*top}" width="${2*w+4}" height="${2*top+2*bot+2}" fill="${mix(sk,skS,.2)}"/>
       </g>`;
    g+=`<path d="M${x-w} ${y}Q${cT[0]} ${cT[1]} ${x+w} ${y}" stroke="${skD}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    g+=`<path d="M${x-w+4} ${y+2}Q${cB[0]} ${cB[1]-2} ${x+w-4} ${y+2}" stroke="${skS}" stroke-width="1.3" fill="none" opacity=".5"/>`;
    g+=`<path d="M${x-w+4} ${y-top-6}Q${x} ${y-2*top-10} ${x+w-4} ${y-top-6}" stroke="${skS}" stroke-width="1.8" fill="none" opacity=".4"/>`;
    [0.04,0.13,0.24].forEach((t,i)=>{const tt=side<0?t:1-t;const pt=qp([x-w,y],cT,[x+w,y],tt);g+=`<path d="M${pt[0]} ${pt[1]}q${side*-4} -3 ${side*-5} -${6-i}" stroke="${skD}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`});
    if(face==='happy')g+=`<path d="M${x-w+2} ${y+10}Q${x} ${y+2} ${x+w-2} ${y+10}" stroke="${skS}" stroke-width="2" fill="none" opacity=".45"/>`;
    return g;
  }
  const EY=face==='happy'?160:158;
  let eyes=eye(111,EY,-1)+eye(189,EY,1);
  const bc=mix(hc,sk,.45);
  let brows='';
  [[111,-1],[189,1]].forEach(([x,s])=>{
    let inner=s<0?x+18:x-18, outer=s<0?x-18:x+18, iy=122, oy=124;
    if(face==='fuss'||face==='cry'){iy=114;oy=126}
    if(face==='happy'){iy=121;oy=121}
    brows+=`<path d="M${outer} ${oy}Q${x} ${Math.min(iy,oy)-8} ${inner} ${iy}" stroke="${bc}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".5" filter="url(#${P}b2)"/>`;
  });
  let nose=`<ellipse cx="150" cy="202" rx="17" ry="7" fill="${skS}" opacity=".4" filter="url(#${P}b2)"/>
   <ellipse cx="150" cy="191" rx="10" ry="7" fill="${skL}" opacity=".3" filter="url(#${P}b2)"/>
   <ellipse cx="142.5" cy="198" rx="3.6" ry="2.3" fill="${skD}" opacity=".5"/><ellipse cx="157.5" cy="198" rx="3.6" ry="2.3" fill="${skD}" opacity=".5"/>
   <ellipse cx="148" cy="188" rx="3.5" ry="2.4" fill="#fff" opacity=".35" filter="url(#${P}b2)"/>`;
  let mouth='';
  const chin=`<ellipse cx="150" cy="240" rx="18" ry="5" fill="${skS}" opacity=".28" filter="url(#${P}b2)"/>`;
  if(face==='happy'){
    mouth=`<path d="M127 214Q150 246 173 214Q150 222 127 214Z" fill="#6A2331"/>
      <clipPath id="${P}m"><path d="M127 214Q150 246 173 214Q150 222 127 214Z"/></clipPath>
      <ellipse cx="150" cy="233" rx="14" ry="7" fill="#E27482" clip-path="url(#${P}m)"/>
      <path d="M127 214Q150 222 173 214" stroke="${lip}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M127 214Q150 246 173 214" stroke="${lipL}" stroke-width="2.4" fill="none" opacity=".8"/>
      <path d="M122 210q-3 5 1 9M178 210q3 5-1 9" stroke="${skS}" stroke-width="2" fill="none" opacity=".45" stroke-linecap="round"/>`;
  } else if(face==='cry'){
    mouth=`<path d="M134 215Q150 210 166 215Q171 240 150 245Q129 240 134 215Z" fill="#6A2331"/>
      <ellipse cx="150" cy="238" rx="10" ry="5" fill="#E27482"/>
      <path d="M134 215Q150 210 166 215" stroke="${lip}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M134 216Q129 240 150 245Q171 240 166 216" stroke="${lipL}" stroke-width="2.4" fill="none" opacity=".8"/>`;
  } else if(face==='fuss'){
    mouth=`<path d="M136 223Q143 217 150 219Q157 217 164 223Q150 222 136 223Z" fill="${lip}"/>
      <path d="M139 224Q150 236 161 224Q150 226 139 224Z" fill="${lipL}"/>
      <path d="M136 223Q150 220 164 223" stroke="${skD}" stroke-width="1.6" fill="none" opacity=".75"/>
      <ellipse cx="150" cy="229" rx="5" ry="1.5" fill="#fff" opacity=".35"/>`;
  } else if(face==='sleep'){
    mouth=`<path d="M140 221Q145 217 150 219Q155 217 160 221Q150 223 140 221Z" fill="${lip}"/>
      <path d="M142 222Q150 229 158 222Q150 224 142 222Z" fill="${lipL}"/>
      <path d="M140 221Q150 224 160 221" stroke="${skD}" stroke-width="1.5" fill="none" opacity=".6"/>`;
  } else {
    mouth=`<path d="M135 219Q142 213 150 216Q158 213 165 219Q150 222 135 219Z" fill="${lip}"/>
      <path d="M137 220Q150 232 163 220Q150 223 137 220Z" fill="${lipL}"/>
      <path d="M135 219Q150 224 165 219" stroke="${skD}" stroke-width="1.6" fill="none" opacity=".7"/>
      <ellipse cx="150" cy="226" rx="5" ry="1.5" fill="#fff" opacity=".35"/>`;
  }
  mouth=chin+mouth;
  if(look.paci&&(face==='calm'||face==='fuss'||face==='sleep')){
    mouth+=`<ellipse cx="152" cy="228" rx="28" ry="19" fill="#000" opacity=".18" filter="url(#${P}b2)"/>
      <ellipse cx="150" cy="222" rx="28" ry="19" fill="url(#${P}paci)" stroke="${ofD}" stroke-width="1.4"/>
      <ellipse cx="143" cy="214" rx="12" ry="5" fill="#fff" opacity=".45"/>
      <circle cx="150" cy="223" r="9.5" fill="url(#${P}knob)"/><circle cx="147" cy="220" r="3" fill="#fff" opacity=".9"/>
      <circle cx="141" cy="224" r="2" fill="${ofD}" opacity=".6"/><circle cx="159" cy="224" r="2" fill="${ofD}" opacity=".6"/>`;
  }
  const CAP='M56 150C52 92 92 44 150 44C208 44 248 92 244 150C236 118 214 96 186 92C172 90 160 94 150 99C140 94 128 90 114 92C86 96 64 118 56 150Z';
  const FUZZ='M54 150C50 88 92 46 150 46C208 46 250 88 246 150C232 110 196 90 150 90C104 90 68 110 54 150Z';
  function strands(n,op){let s='';for(let i=0;i<n;i++){const k=i/(n-1);
      s+=`<path d="M148 97Q${118-k*40} ${54+k*10} ${64+k*6} ${140-k*50}" stroke="${i%2?hcL:hcD}" stroke-width="1.4" fill="none" opacity="${op}"/>`;
      s+=`<path d="M152 97Q${182+k*40} ${54+k*10} ${236-k*6} ${140-k*50}" stroke="${i%2?hcD:hcL}" stroke-width="1.4" fill="none" opacity="${op}"/>`;}return s}
  let hair='';
  const h=look.hair;
  if(h==='fuzz'||h==='wisps'){
    hair=`<g clip-path="url(#${P}hc)"><path d="${FUZZ}" fill="${hc}" opacity="${h==='fuzz'?.3:.5}" filter="url(#${P}b2)"/></g>`;
    if(h==='wisps')hair+=`<g fill="none" stroke="url(#${P}hair)" stroke-width="2.4" opacity=".85" stroke-linecap="round">
      <path d="M150 50c-10-14 2-24 14-20-9 3-10 10-4 14"/><path d="M134 52c-6-10-2-18 6-20"/><path d="M168 54c6-9 14-11 20-8"/>
      <path d="M120 58c-4-7-2-12 3-14"/><path d="M180 60c5-6 10-7 14-5"/></g>`;
  } else if(h==='curls'){
    hair=`<path d="${FUZZ}" fill="url(#${P}hair)"/>`;
    const ring=[];for(let a=192;a<=348;a+=13){const r=a*Math.PI/180;ring.push([150+Math.cos(r)*94,138+Math.sin(r)*90,13+((a/13)%3)])}
    [[150,52,15],[122,58,14],[178,58,14],[104,72,12],[196,72,12],[136,70,11],[164,70,11]].forEach(c=>ring.push(c));
    hair+=ring.map(c=>`<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${c[2]}" fill="url(#${P}ball)"/><path d="M${(c[0]-c[2]*.5).toFixed(1)} ${c[1].toFixed(1)}a${c[2]*.5} ${c[2]*.5} 0 1 1 ${c[2]*.6} ${c[2]*.35}" stroke="${hcD}" stroke-width="1.3" fill="none" opacity=".45"/>`).join('');
  } else {
    hair=`<path d="${CAP}" fill="url(#${P}hair)"/>`+strands(7,.35);
    hair+=`<path d="M150 99L150 46" stroke="${hcD}" stroke-width="1.6" opacity=".5"/>`;
    hair+=`<path d="M104 94q-3-6 1-10M196 94q3-6-1-10M88 104q-4-5-1-10M212 104q4-5 1-10" stroke="${hc}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".8"/>`;
    if(h==='buns'){
      [[96,52],[204,52]].forEach(([x,y])=>{hair+=`<ellipse cx="${x+2}" cy="${y+8}" rx="30" ry="12" fill="#000" opacity=".15" filter="url(#${P}b6)"/><circle cx="${x}" cy="${y}" r="30" fill="url(#${P}ball)"/>
        <path d="M${x-18} ${y+4}q2-20 20-20q16 2 14 16q-2 12-14 10q-8-2-6-10" stroke="${hcD}" stroke-width="2" fill="none" opacity=".45"/>
        <path d="M${x-10} ${y-16}q12-6 22 2" stroke="${hcL}" stroke-width="2.4" fill="none" opacity=".55" stroke-linecap="round"/>`;});
    } else if(h==='puffs'){
      [[82,78,-1],[218,78,1]].forEach(([x,y,s])=>{hair+=`<g transform="rotate(${s*20} ${x} ${y})"><path d="M${x} ${y}l-16-11v22z" fill="#E8B730"/><path d="M${x} ${y}l16-11v22z" fill="#D9A31E"/><circle cx="${x}" cy="${y}" r="5" fill="#F2C94C"/></g>`});
    } else if(h==='braids'){
      [[124,94,104,48],[176,94,196,48]].forEach(([x1,y1,x2,y2])=>{const n=6;for(let i=0;i<n;i++){const t=i/(n-1);const x=x1+(x2-x1)*t,y=y1+(y2-y1)*t;const ang=Math.atan2(y2-y1,x2-x1)*180/Math.PI;
        hair+=`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="7" ry="5.5" transform="rotate(${ang+(i%2?30:-30)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="url(#${P}ball)" stroke="${hcD}" stroke-width="1" stroke-opacity=".4"/>`;}});
    }
  }
  let extra='';
  if(sleep)extra=`<g font-family="Baloo 2, sans-serif" font-weight="800" fill="#fff" opacity=".9"><text x="236" y="70" font-size="26">z</text><text x="256" y="46" font-size="19">z</text><text x="270" y="28" font-size="14">z</text></g>`;
  const tilt=sleep?'rotate(-6 150 250)':'';
  return `<svg class="av${sleep?' sleep':''}" viewBox="-14 -26 328 346" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Portrait of your baby">
    ${defs}
    <g class="breathe">${body}
      <g transform="${tilt}"><g class="headg">${behind}${ears}${head}${eyes}${brows}${nose}${mouth}${hair}</g></g>
    </g>${extra}</svg>`;
}

/* ---------- render ---------- */
function ageInfo(){
  if(!profile.birth)return null;
  const b=new Date(profile.birth+'T00:00:00'); if(isNaN(b))return null;
  const t=new Date(); t.setHours(0,0,0,0);
  const days=Math.floor((t-b)/DAY); if(days<0)return null;
  let txt; if(days<14)txt=days+(days===1?' day old':' days old'); else if(days<91)txt=Math.floor(days/7)+' weeks old'; else {let m=(t.getFullYear()-b.getFullYear())*12+t.getMonth()-b.getMonth(); if(t.getDate()<b.getDate())m--; txt=m+' months old';}
  return {day:days+1,txt,days};
}
function partOfDay(h){return h<5?'Night':h<12?'Morning':h<17?'Afternoon':h<21?'Evening':'Night'}
let lastFaceKey='';
function render(){
  if($('#appScreen').hidden)return;
  const needs=computeNeeds(), md=mood(needs);
  $('#babyName').textContent=profile.name||'Baby';
  const a=ageInfo(); $('#ageLine').textContent=(a?a.txt:'No birthday yet')+(CLOUD&&babies.length>1?' · switch':'');
  $('#dayCount').textContent='Day '+(a?a.day:'1');
  const now=new Date(); $('#clockLbl').textContent=partOfDay(now.getHours())+' · '+clock(now);
  $('#portrait').classList.toggle('night',now.getHours()>=19||now.getHours()<7);
  const empty=CLOUD&&Object.keys(events).length===0;
  $('#samplePill').hidden=!(usingSample()||empty);
  $('#samplePill').textContent=empty?'Log a feed, nap or diaper to fill the bars':'Sample day · log something to start';
  document.documentElement.style.setProperty('--mood',colorFor(md.v));
  $('#moodLabel').textContent=md.label;
  const fk=JSON.stringify(profile.look)+md.face;
  if(fk!==lastFaceKey){$('#baby').innerHTML=avatarSVG(profile.look,md.face);lastFaceKey=fk;}
  $('#moodlets').innerHTML=moodlets(needs).map(m=>`<div class="moodlet ${m[0]}"><div class="mi">${m[1]}</div>${m[2]}</div>`).join('');
  const defs=[['hunger','Hunger','bottle'],['energy','Energy',needs.energy.sleeping?'moon':'sun'],['hygiene','Hygiene','drop'],['social','Social','heart']];
  $('#needs').innerHTML=defs.map(([k,l,ic])=>{const n=needs[k],v=n.v;return `<div class="need"><div class="row"><div class="ic">${IC[ic]}</div><div class="nm">${l}</div></div>
    <div class="bar${v==null?' empty':''}" role="meter" aria-label="${l}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v==null?0:Math.round(v)}"><i style="width:${v==null?100:Math.max(6,v)}%;--c:${v==null?'transparent':colorFor(v)}"></i></div>
    <div class="sub">${esc(n.sub)}</div></div>`}).join('');
  renderActions();
  if(sheet&&sheet.kind==='history'&&!document.querySelector('.del.arm'))drawSheet();
}
function renderActions(){
  const s=sleepingNow();
  const acts=[['feed','Feed','bottle'],['sleep',s?'Wake up':'Nap',s?'sun':'moon'],['diaper','Diaper','diaper'],['play','Play','rattle'],['bath','Bath','tub']];
  $('#actions').innerHTML=acts.map(([k,l,ic])=>`<button class="act${k==='sleep'&&s?' on':''}" data-act="${k}">${IC[ic]}<span>${l}</span></button>`).join('');
}
function historyHTML(){
  const n=Date.now(), mid=new Date(); mid.setHours(0,0,0,0); const m0=mid.getTime();
  const list=all(), today=list.filter(e=>e.t>=m0);
  const feeds=today.filter(e=>e.type==='feed'), bottle=feeds.reduce((s,e)=>s+(e.amount||0),0);
  const sleepMs=sleepBetween(m0,n), diapers=today.filter(e=>e.type==='diaper'), dirty=diapers.filter(e=>e.sub!=='wet').length;
  let h=`<h3>History</h3><p class="hint">${usingSample()?'This is the sample day. Your own entries replace it.':'Today so far, plus the last 48 hours.'}</p>
   <div class="stats"><div class="stat"><small>Feeds</small><b>${feeds.length}</b>${bottle?`<em>${fmtAmt(bottle)}</em>`:''}</div>
   <div class="stat"><small>Sleep</small><b>${sleepMs<MIN?'0m':dur(sleepMs)}</b></div>
   <div class="stat"><small>Diapers</small><b>${diapers.length}</b>${diapers.length?`<em>${dirty} dirty</em>`:''}</div>
   <div class="stat"><small>Play</small><b>${today.filter(e=>e.type==='play').length}</b><em>sessions</em></div></div><ul class="events">`;
  const recent=list.filter(e=>e.t>=n-48*HR);
  if(!recent.length)h+='<li class="empty">Nothing logged in the last 48 hours.</li>';
  let lastDay=''; const tk=dayKey(n), yk=dayKey(n-DAY);
  recent.forEach(e=>{
    const k=dayKey(e.t);
    if(k!==lastDay){h+=`<li class="daysep">${k===tk?'Today':k===yk?'Yesterday':new Date(e.t).toLocaleDateString([], {weekday:'long',month:'short',day:'numeric'})}</li>`;lastDay=k;}
    const title=e.type==='sleep'?(e.end?'Nap':'Asleep'):TYPE_LABEL[e.type];
    const det=e.type==='sleep'&&e.end?`${dur(e.end-e.t)} · woke ${clock(e.end)}`:detail(e);
    h+=`<li class="ev"><time>${clock(e.t)}</time><div class="eic">${IC[TYPE_ICON[e.type]]}</div><div class="what"><b>${esc(title)}</b><span>${esc(det||ago(e.t))}</span></div>${usingSample()?'<span></span>':`<button class="del" data-del="${esc(e.id)}" aria-label="Remove this entry">Remove</button>`}</li>`;
  });
  h+=`</ul><p class="foot">${CLOUD?'Synced for everyone who cares for '+esc(profile.name)+'.':'Saved in this browser only.'}</p>`;
  return h;
}

/* ---------- storage ----------
 * The UI only ever calls putEvent, patchEvent, removeEvent and saveProfile.
 * Writes are optimistic. In cloud mode a write that fails because the phone is
 * offline goes into an outbox (localStorage) and is retried when it reconnects;
 * any other failure is rolled back with a message.
 */
function eventToRow(e){return {id:e.id,baby_id:baby.id,type:e.type,t:new Date(e.t).toISOString(),end_t:e.end?new Date(e.end).toISOString():null,sub:e.sub||null,amount:e.amount!=null?e.amount:null}}
function rowToEvent(r){const e={id:r.id,type:r.type,t:Date.parse(r.t)};if(r.sub)e.sub=r.sub;if(r.amount!=null)e.amount=Number(r.amount);if(r.type==='sleep')e.end=r.end_t?Date.parse(r.end_t):null;return e}
function patchToRow(p){const r={};if('end' in p)r.end_t=p.end?new Date(p.end).toISOString():null;if('sub' in p)r.sub=p.sub;if('amount' in p)r.amount=p.amount;if('t' in p)r.t=new Date(p.t).toISOString();return r}
function profileFromRow(r){return mergeProfile(Object.assign({},r.settings||{},{name:r.name,birth:r.birth||'',look:r.look||{}}))}
function rowFromProfile(p){const {name,birth,look,...settings}=p;return {name:(name||'Baby').slice(0,40),birth:birth||null,settings,look}}
function isNetworkError(err){return !navigator.onLine||/fetch|network|load failed|timed out/i.test((err&&(err.message||err.details))||'')}

let outbox=CLOUD?lsGet(LS.outbox,[]):[];
function saveOutbox(){lsSet(LS.outbox,outbox);$('#offlinePill').hidden=!outbox.length}
async function runOp(op){
  let r;
  if(op.kind==='upsert')r=await sb.from('events').upsert(op.row);
  else if(op.kind==='update')r=await sb.from('events').update(op.row).eq('id',op.id);
  else if(op.kind==='delete')r=await sb.from('events').delete().eq('id',op.id);
  else if(op.kind==='baby')r=await sb.from('babies').update(op.row).eq('id',op.id);
  if(r&&r.error)throw r.error;
}
async function send(op,rollback){
  if(!CLOUD){saveLocal();return}
  if(outbox.length){outbox.push(op);saveOutbox();return}   // keep order behind queued writes
  try{await runOp(op)}
  catch(err){
    if(isNetworkError(err)){outbox.push(op);saveOutbox();}
    else{if(rollback)rollback();render();showToast(friendly(err));}
  }
}
let flushing=false;
async function flushOutbox(){
  if(!CLOUD||flushing||!outbox.length||!navigator.onLine)return;
  flushing=true;
  try{
    while(outbox.length){
      try{await runOp(outbox[0])}
      catch(err){if(isNetworkError(err))break; showToast(friendly(err));}
      outbox.shift();saveOutbox();
    }
  }finally{flushing=false}
  if(!outbox.length&&baby)loadEvents();
}
function friendly(err){
  const m=(err&&(err.message||err.error_description))||'';
  if(/row-level security|permission|42501/i.test(m))return 'You don’t have access to change this baby any more.';
  if(/limit reached/i.test(m))return 'You’ve reached the limit of 10 babies on one account.';
  if(/invite already used/i.test(m))return 'That invite link has already been used. Ask for a new one.';
  if(/invite expired/i.test(m))return 'That invite link has expired. Ask for a new one.';
  if(/invite not found/i.test(m))return 'That invite link isn’t valid. Check you copied all of it.';
  if(/rate limit|too many/i.test(m))return 'Too many tries. Wait a minute, then try again.';
  return 'That didn’t save. Check your connection and try again.';
}

function putEvent(ev){
  events[ev.id]=ev; render();
  return send(CLOUD?{kind:'upsert',row:eventToRow(ev)}:null,()=>{delete events[ev.id]});
}
function patchEvent(id,patch){
  const cur=events[id]; if(!cur)return;
  events[id]=Object.assign({},cur,patch); render();
  return send(CLOUD?{kind:'update',id,row:patchToRow(patch)}:null,()=>{events[id]=cur});
}
function removeEvent(id){
  const cur=events[id]; if(!cur)return;
  delete events[id]; render();
  return send(CLOUD?{kind:'delete',id}:null,()=>{events[id]=cur});
}
function saveProfile(){
  render();
  if(CLOUD&&baby){const row=rowFromProfile(profile);Object.assign(baby,row);const i=babies.findIndex(b=>b.id===baby.id);if(i>=0)babies[i]=baby;return send({kind:'baby',id:baby.id,row});}
  saveLocal();
}
function saveLocal(){if(CLOUD)return;lsSet(LS.events,events);lsSet(LS.profile,profile)}
function loadLocal(){const e=lsGet(LS.events,null);if(e)events=e;const p=lsGet(LS.profile,null);if(p)profile=mergeProfile(p)}

async function loadEvents(){
  if(!baby)return;
  const since=new Date(Date.now()-21*DAY).toISOString();
  const {data,error}=await sb.from('events').select('*').eq('baby_id',baby.id).gte('t',since).order('t',{ascending:false}).limit(2000);
  if(error){if(!isNetworkError(error))showToast('Couldn’t load the latest log. Pull down or reopen to retry.');return}
  // an open nap that started more than 21 days ago would be missed; fetch the latest sleep separately
  const next={};data.forEach(r=>next[r.id]=rowToEvent(r));
  const {data:lastSleep}=await sb.from('events').select('*').eq('baby_id',baby.id).eq('type','sleep').is('end_t',null).order('t',{ascending:false}).limit(1);
  (lastSleep||[]).forEach(r=>next[r.id]=rowToEvent(r));
  // keep optimistic entries that are still waiting in the outbox
  outbox.forEach(op=>{if(op.kind==='upsert')next[op.row.id]=rowToEvent(op.row);if(op.kind==='delete')delete next[op.id]});
  events=next; render();
}
function subscribe(){
  if(channel){sb.removeChannel(channel);channel=null}
  if(!baby)return;
  const id=baby.id;
  channel=sb.channel('baby-'+id)
    .on('postgres_changes',{event:'*',schema:'public',table:'events',filter:'baby_id=eq.'+id},p=>{
      if(!baby||baby.id!==id)return;
      if(p.eventType==='DELETE'){if(p.old&&p.old.id&&events[p.old.id]){delete events[p.old.id];render()}return}
      if(p.new&&p.new.baby_id===id){events[p.new.id]=rowToEvent(p.new);render()}
    })
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'babies',filter:'id=eq.'+id},p=>{
      if(!p.new||!baby||baby.id!==id)return;
      baby=p.new;const i=babies.findIndex(b=>b.id===id);if(i>=0)babies[i]=p.new;
      profile=profileFromRow(p.new);render();
    })
    .subscribe();
}

/* ---------- sound ---------- */
let actx=null;
function blip(up=true){
  if(!profile.sound)return;
  try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();
    const t=actx.currentTime;[0,0.09].forEach((d,i)=>{const o=actx.createOscillator(),g=actx.createGain();o.type='sine';o.frequency.value=up?(i?880:660):(i?520:700);g.gain.setValueAtTime(0.0001,t+d);g.gain.exponentialRampToValueAtTime(0.12,t+d+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+d+0.16);o.connect(g).connect(actx.destination);o.start(t+d);o.stop(t+d+0.2)});
  }catch(_){}
}

/* ---------- toast ---------- */
let toastTimer=null, undoFn=null;
function showToast(msg,undo){
  $('#toastMsg').textContent=msg; undoFn=undo||null; $('#toastUndo').hidden=!undo; $('#toast').hidden=false;
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>{$('#toast').hidden=true;undoFn=null},undo?6000:4500);
}
$('#toastUndo').addEventListener('click',()=>{const f=undoFn;$('#toast').hidden=true;undoFn=null;if(f)f()});

/* ---------- babble ---------- */
const BABBLE={hunger:['Nom nom?','Mmm-ba-ba!','Ba-ba-bot?'],energy:['Hwaaa…','Mm… sleepy','Nuh-nuh…'],hygiene:['Eww-bah!','Pbbbt!','Uh-oh!'],social:['Da! Da!','Up-pee?','Goo-goo!'],happy:['Gah-gah!','Hee hee!','Bwah!','Ahh-boo!']};
let speechT=null;
function babble(){
  const needs=computeNeeds(); if(needs.energy.sleeping){say('Zzz…');return}
  let low=null,lv=101;['hunger','energy','hygiene','social'].forEach(k=>{const v=needs[k].v;if(v!=null&&v<lv){lv=v;low=k}});
  const pool=lv<40?BABBLE[low]:BABBLE.happy; say(pool[Math.floor(Math.random()*pool.length)]); blip(true);
}
function say(t){const s=$('#speech');s.textContent=t;s.classList.remove('off');clearTimeout(speechT);speechT=setTimeout(()=>s.classList.add('off'),2400)}
$('#baby').addEventListener('click',babble);

/* ---------- sheets ---------- */
let sheet=null;
function whenChips(){
  const opts=[['now','Now'],['10','10 min ago'],['30','30 min ago'],['60','1 hr ago'],['custom','Pick a time']];
  return `<span class="lbl">When</span><div class="chips">${opts.map(([v,l])=>`<button class="chip" data-when="${v}" aria-pressed="${sheet.when===v}">${l}</button>`).join('')}</div>
   <div ${sheet.when==='custom'?'':'hidden'} style="margin-top:8px"><input type="datetime-local" id="customTime" value="${esc(sheet.custom||localInput(Date.now()))}"></div>`;
}
function localInput(t){const d=new Date(t-new Date(t).getTimezoneOffset()*MIN);return d.toISOString().slice(0,16)}
function resolveWhen(){
  if(sheet.when==='now')return Date.now();
  if(sheet.when==='custom'){const v=$('#customTime')&&$('#customTime').value;const t=v?new Date(v).getTime():NaN;return isNaN(t)?Date.now():Math.min(t,Date.now())}
  return Date.now()-parseInt(sheet.when,10)*MIN;
}
function openSheet(kind,extra){
  const f=lastOf('feed');
  const nextSide=f&&f.sub==='left'?'right':f&&f.sub==='right'?'left':null;
  sheet=Object.assign({kind,when:'now',sub:kind==='feed'?(f&&f.sub==='bottle'?'bottle':(nextSide||'bottle')):null,amount:profile.lastAmount||90,nextSide},extra||{});
  drawSheet(); $('#sheetWrap').hidden=false;
}
function closeSheet(){$('#sheetWrap').hidden=true;sheet=null;$('#sheet').innerHTML=''}
function drawSheet(){
  const k=sheet.kind; let h='';
  if(k==='feed'){
    const step=profile.unit==='oz'?14.7868:10;
    h=`<h3>${IC.bottle}Log a feed</h3><p class="hint">${sheet.nextSide?`Last feed was the ${sheet.nextSide==='left'?'right':'left'} side, so ${sheet.nextSide} is up next.`:'Pick the type, then log it.'}</p>
     <span class="lbl">Type</span><div class="chips">${Object.entries(SUBS.feed).map(([v,l])=>`<button class="chip big" data-sub="${v}" aria-pressed="${sheet.sub===v}">${l}</button>`).join('')}</div>
     ${sheet.sub==='bottle'?`<span class="lbl">Amount</span><div class="stepper"><button data-amt="-${step}" aria-label="Less">−</button><output id="amtOut">${fmtAmt(sheet.amount)}</output><button data-amt="${step}" aria-label="More">+</button></div>`:''}
     ${whenChips()}<button class="primary" id="doLog">Log feed</button>`;
  } else if(k==='sleep'){
    h=`<h3>${IC.moon}Start a nap</h3><p class="hint">Tap Wake up on the bar when they're up. Energy refills while they sleep.</p>${whenChips()}<button class="primary" id="doLog">Start sleeping</button>`;
  } else if(k==='diaper'){
    h=`<h3>${IC.diaper}Diaper change</h3><p class="hint">Tap one to log it.</p>${whenChips()}<span class="lbl">What was it</span><div class="chips">${Object.entries(SUBS.diaper).map(([v,l])=>`<button class="chip big" data-quick="${v}">${l}</button>`).join('')}</div>`;
  } else if(k==='play'){
    h=`<h3>${IC.rattle}Play and connect</h3><p class="hint">Tap one to log it. Social only drains while they're awake.</p>${whenChips()}<span class="lbl">What did you do</span><div class="chips">${Object.entries(SUBS.play).map(([v,l])=>`<button class="chip big" data-quick="${v}">${l}</button>`).join('')}</div>`;
  } else if(k==='bath'){
    h=`<h3>${IC.tub}Bath time</h3><p class="hint">Adds the Squeaky Clean moodlet.</p>${whenChips()}<button class="primary" id="doLog">Log bath</button>`;
  } else if(k==='settings'){ h=settingsHTML(); }
  else if(k==='history'){ h=historyHTML(); }
  else if(k==='babies'){ h=babiesHTML(); }
  h+=`<button class="ghost" id="closeSheet">Close</button>`;
  const sc=$('#sheet').scrollTop;
  $('#sheet').innerHTML=h; $('#sheet').scrollTop=sc;
}
function logFrom(kind,sub){
  const t=resolveWhen();
  const ev={id:uid(),type:kind,t};
  if(sub)ev.sub=sub;
  if(kind==='feed'&&sub==='bottle'){ev.amount=Math.round(sheet.amount);profile.lastAmount=ev.amount;saveProfile();}
  if(kind==='sleep')ev.end=null;
  const wasSample=usingSample();
  closeSheet(); putEvent(ev); blip(true);
  const lbl=kind==='sleep'?'Nap started':`${sub&&SUBS[kind]?SUBS[kind][sub]:TYPE_LABEL[kind]} logged`;
  showToast(lbl+(t<Date.now()-2*MIN?` for ${clock(t)}`:'')+(wasSample?'. Sample cleared.':''),()=>removeEvent(ev.id));
}
function wakeUp(){
  const s=sleepingNow(); if(!s)return;
  if(usingSample()){showToast('That nap is part of the sample. Start a real nap to try it.');return}
  const end=Date.now(); patchEvent(s.id,{end}); blip(false);
  showToast(`Awake after ${dur(end-s.t)}`,()=>patchEvent(s.id,{end:null}));
}

/* ---------- babies ---------- */
function babiesHTML(){
  return `<h3>Your babies</h3><p class="hint">Switch between babies, or add another one.</p>
   <div class="babylist">${babies.map(b=>{const p=profileFromRow(b);return `<button class="babyrow" data-baby="${esc(b.id)}" aria-pressed="${baby&&b.id===baby.id}"><div><b>${esc(p.name)}</b><br><span>${p.birth?esc(new Date(p.birth+'T00:00:00').toLocaleDateString([], {month:'short',day:'numeric',year:'numeric'})):'No birthday yet'}</span></div></button>`}).join('')}</div>
   <button class="primary" id="addBaby">Add a baby</button>`;
}

/* ---------- settings ---------- */
function ageDefaults(days){
  if(days==null)return null;
  if(days<30)return {feedH:2.5,wakeH:1};
  if(days<91)return {feedH:3,wakeH:1.25};
  if(days<182)return {feedH:3.5,wakeH:2};
  if(days<274)return {feedH:4,wakeH:2.75};
  return {feedH:4,wakeH:3.5};
}
function settingsHTML(){
  const L=sheet.draft.look, a=ageDefaults(ageFromDraft());
  const sw=(arr,key,lbl)=>arr.map((c,i)=>`<button class="sw" style="background:${c}" data-look="${key}" data-val="${i}" aria-pressed="${L[key]===i}" aria-label="${lbl} ${i+1}"></button>`).join('');
  let h=`<h3>${esc(sheet.draft.name||'Your baby')}</h3><p class="hint">${CLOUD?'Changes save for everyone who cares for this baby.':'Changes save in this browser.'}</p>
   <div class="pv" id="pv">${avatarSVG(L,sheet.face||'happy')}</div>
   <div class="chips" style="justify-content:center;margin-bottom:4px">${[['happy','Happy'],['calm','Content'],['fuss','Fussy'],['sleep','Asleep']].map(([f,l])=>`<button class="chip" data-face="${f}" aria-pressed="${(sheet.face||'happy')===f}" style="min-height:36px;padding:5px 10px">${l}</button>`).join('')}</div>
   <span class="lbl">Skin</span><div class="swatches">${sw(SKIN,'skin','Skin tone')}</div>
   <span class="lbl">Hair</span><div class="chips">${Object.entries(HAIRS).map(([v,l])=>`<button class="chip" data-hair="${v}" aria-pressed="${L.hair===v}">${l}</button>`).join('')}</div>
   <span class="lbl">Hair color</span><div class="swatches">${sw(HAIRC,'hairColor','Hair color')}</div>
   <span class="lbl">Eyes</span><div class="swatches">${sw(EYES,'eyes','Eye color')}</div>
   <span class="lbl">Outfit</span><div class="chips">${Object.entries(OUTFITS).map(([v,l])=>`<button class="chip" data-style="${v}" aria-pressed="${L.style===v}">${l}</button>`).join('')}</div>
   <span class="lbl">Outfit color</span><div class="swatches">${sw(OUTFIT,'outfit','Outfit color')}</div>
   <label class="toggle"><input type="checkbox" id="paci" ${L.paci?'checked':''}> Pacifier</label>
   <div class="grid2" style="margin-top:6px">
    <div class="field"><span class="lbl">Name</span><input type="text" id="setName" value="${esc(sheet.draft.name)}" maxlength="24"></div>
    <div class="field"><span class="lbl">Birthday</span><input type="date" id="setBirth" value="${esc(sheet.draft.birth)}"></div>
   </div>
   <span class="lbl">How fast the bars drain (hours until due)</span>
   <div class="grid2">
    <div class="field"><small>Hunger · between feeds</small><input type="number" step="0.25" min="0.5" max="8" id="setFeed" value="${sheet.draft.feedH}"></div>
    <div class="field"><small>Energy · awake window</small><input type="number" step="0.25" min="0.5" max="8" id="setWake" value="${sheet.draft.wakeH}"></div>
    <div class="field"><small>Hygiene · between changes</small><input type="number" step="0.25" min="0.5" max="8" id="setDiaper" value="${sheet.draft.diaperH}"></div>
    <div class="field"><small>Social · awake time between play</small><input type="number" step="0.25" min="0.5" max="8" id="setPlay" value="${sheet.draft.playH}"></div>
   </div>
   ${a?`<button class="chip" id="useAge" style="margin-top:10px">Use typical times for this age (${a.feedH}h feeds, ${a.wakeH}h awake)</button>`:''}
   <span class="lbl">Bottle units</span><div class="chips"><button class="chip" data-unit="ml" aria-pressed="${sheet.draft.unit==='ml'}">ml</button><button class="chip" data-unit="oz" aria-pressed="${sheet.draft.unit==='oz'}">oz</button></div>
   <label class="toggle" style="margin-top:8px"><input type="checkbox" id="setSound" ${sheet.draft.sound?'checked':''}> Play a little chime when you log</label>
   <p class="disclaim">The bars are a friendly guide built from your log. Typical times are rough starting points. Your baby's cues and your pediatrician's advice come first.</p>
   <button class="primary" id="saveSettings">Save</button>`;
  if(CLOUD){
    const inviteUrl=sheet.invite?location.origin+location.pathname+'?invite='+encodeURIComponent(sheet.invite):'';
    h+=`<div class="divider"></div>
     <span class="lbl" style="margin-top:0">Caregivers</span>
     <p class="hint">Invite a partner, grandparent or nanny to see and log for ${esc(sheet.draft.name)}. Each link works once and expires in 7 days.</p>
     ${inviteUrl?`<div class="copyrow"><input type="text" id="inviteUrl" readonly value="${esc(inviteUrl)}"><button id="copyInvite">Copy</button></div>`:`<button class="chip" id="makeInvite">Create an invite link</button>`}
     <div class="divider"></div>
     <span class="lbl" style="margin-top:0">Your data</span>
     <div class="chips"><button class="chip" id="exportCsv">Download CSV</button><button class="chip" id="exportJson">Download JSON</button></div>
     <div class="divider"></div>
     <span class="lbl" style="margin-top:0">Account</span>
     <p class="hint">Signed in as ${esc(user&&user.email||'')}.</p>
     <div class="chips"><button class="chip" id="signOut">Sign out</button>${myRole!=='owner'?`<button class="chip" id="leaveBaby">Stop caring for ${esc(sheet.draft.name)}</button>`:''}</div>
     <button class="danger" id="deleteAccount">Delete my account and data</button>
     <p class="disclaim">Deleting removes your login and every baby you created, including all their entries, for everyone. It can't be undone. Download your data first if you want a copy. <a href="privacy.html">Privacy notice</a></p>`;
  }
  return h;
}
function ageFromDraft(){const b=sheet&&sheet.draft&&sheet.draft.birth;if(!b)return null;const d=Math.floor((Date.now()-new Date(b+'T00:00:00'))/DAY);return d>=0?d:null}
function readDraftInputs(){
  const d=sheet.draft, g=id=>$('#'+id);
  if(g('setName'))d.name=g('setName').value.trim()||'Baby';
  if(g('setBirth'))d.birth=g('setBirth').value;
  const num=(id,fb)=>{const v=parseFloat(g(id)&&g(id).value);return isNaN(v)?fb:clamp(v,0.5,8)};
  d.feedH=num('setFeed',d.feedH);d.wakeH=num('setWake',d.wakeH);d.diaperH=num('setDiaper',d.diaperH);d.playH=num('setPlay',d.playH);
  if(g('setSound'))d.sound=g('setSound').checked;
  if(g('paci'))d.look.paci=g('paci').checked;
}
function openSettings(){sheet={kind:'settings',draft:clone(profile),face:'happy'};drawSheet();$('#sheetWrap').hidden=false}

/* ---------- export ---------- */
function download(name,type,text){
  const url=URL.createObjectURL(new Blob([text],{type}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
async function fetchAllEvents(){
  const out=[];let from=0;
  for(;;){const {data,error}=await sb.from('events').select('*').eq('baby_id',baby.id).order('t',{ascending:true}).range(from,from+999);
    if(error)throw error;out.push(...data);if(data.length<1000)break;from+=1000;}
  return out;
}
async function exportData(kind){
  try{
    const rows=await fetchAllEvents();
    const slug=(profile.name||'baby').toLowerCase().replace(/[^a-z0-9]+/g,'-');
    if(kind==='json'){download(`just-a-baby-${slug}.json`,'application/json',JSON.stringify({baby:rowFromProfile(profile),events:rows.map(rowToEvent).map(e=>Object.assign({},e,{t:new Date(e.t).toISOString(),end:e.end?new Date(e.end).toISOString():e.end}))},null,2));}
    else{
      const q=v=>v==null?'':/[",\n]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':String(v);
      const lines=[['start','end','type','detail','amount_ml'].join(',')].concat(rows.map(r=>[r.t,r.end_t,r.type,r.sub,r.amount].map(q).join(',')));
      download(`just-a-baby-${slug}.csv`,'text/csv',lines.join('\n'));
    }
  }catch(err){showToast('Couldn’t prepare the download. Check your connection and try again.')}
}

/* ---------- sheet events ---------- */
$('#actions').addEventListener('click',e=>{
  const b=e.target.closest('[data-act]'); if(!b)return;
  const k=b.dataset.act;
  if(k==='sleep'&&sleepingNow()){wakeUp();return}
  openSheet(k);
});
$('#settingsBtn').addEventListener('click',openSettings);
$('#historyBtn').addEventListener('click',()=>{sheet={kind:'history'};drawSheet();$('#sheetWrap').hidden=false});
$('#nameBtn').addEventListener('click',()=>{if(!CLOUD){openSettings();return}sheet={kind:'babies'};drawSheet();$('#sheetWrap').hidden=false});
$('#sheetWrap').addEventListener('click',e=>{if(e.target.id==='sheetWrap')closeSheet()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sheet)closeSheet()});
$('#sheet').addEventListener('change',e=>{
  if(!sheet)return;
  if(sheet.kind==='settings'&&(e.target.id==='setBirth'||e.target.id==='paci')){readDraftInputs();drawSheet()}
  if(e.target.id==='customTime')sheet.custom=e.target.value;
});
$('#sheet').addEventListener('click',async e=>{
  const t=e.target.closest('button'); if(!t||!sheet)return;
  if(t.id==='closeSheet'){closeSheet();return}
  if(t.dataset.del){
    if(t.classList.contains('arm')){const id=t.dataset.del;const ev=events[id];removeEvent(id);drawSheet();if(ev)showToast('Entry removed',()=>{putEvent(ev)});return}
    t.classList.add('arm');t.textContent='Remove?';setTimeout(()=>{if(t.isConnected){t.classList.remove('arm');t.textContent='Remove'}},3000);return;
  }
  if(t.dataset.baby){const b=babies.find(x=>x.id===t.dataset.baby);closeSheet();if(b)openBaby(b);return}
  if(t.id==='addBaby'){closeSheet();showSetup(true);return}
  if(t.dataset.when){sheet.when=t.dataset.when;const c=$('#customTime');if(c)sheet.custom=c.value;drawSheet();return}
  if(t.dataset.sub){sheet.sub=t.dataset.sub;drawSheet();return}
  if(t.dataset.amt){const step=parseFloat(t.dataset.amt);sheet.amount=clamp(sheet.amount+step,0,400);$('#amtOut').textContent=fmtAmt(sheet.amount);return}
  if(t.dataset.quick){logFrom(sheet.kind,t.dataset.quick);return}
  if(t.id==='doLog'){logFrom(sheet.kind,sheet.kind==='feed'?sheet.sub:null);return}
  if(sheet.kind==='settings'){
    readDraftInputs();
    if(t.dataset.look){sheet.draft.look[t.dataset.look]=parseInt(t.dataset.val,10);drawSheet();return}
    if(t.dataset.hair){sheet.draft.look.hair=t.dataset.hair;drawSheet();return}
    if(t.dataset.style){sheet.draft.look.style=t.dataset.style;drawSheet();return}
    if(t.dataset.face){sheet.face=t.dataset.face;drawSheet();return}
    if(t.dataset.unit){sheet.draft.unit=t.dataset.unit;drawSheet();return}
    if(t.id==='useAge'){const a=ageDefaults(ageFromDraft());if(a){sheet.draft.feedH=a.feedH;sheet.draft.wakeH=a.wakeH;drawSheet()}return}
    if(t.id==='saveSettings'){profile=mergeProfile(sheet.draft);lastFaceKey='';closeSheet();saveProfile();showToast('Saved');return}
    if(t.id==='makeInvite'){
      t.disabled=true;
      const {data,error}=await sb.from('invites').insert({baby_id:baby.id}).select('code').single();
      if(error){t.disabled=false;showToast(friendly(error));return}
      sheet.invite=data.code;drawSheet();return;
    }
    if(t.id==='copyInvite'){const inp=$('#inviteUrl');try{await navigator.clipboard.writeText(inp.value);showToast('Invite link copied')}catch(_){inp.select()}return}
    if(t.id==='exportCsv'){exportData('csv');return}
    if(t.id==='exportJson'){exportData('json');return}
    if(t.id==='signOut'){closeSheet();await sb.auth.signOut();return}
    if(t.id==='leaveBaby'){
      const {error}=await sb.from('baby_members').delete().eq('baby_id',baby.id).eq('user_id',user.id);
      if(error){showToast(friendly(error));return}
      closeSheet();showToast('You’ve left '+profile.name);afterSignIn(user,true);return;
    }
    if(t.id==='deleteAccount'){
      if(!t.classList.contains('arm')){t.classList.add('arm');t.textContent='Tap again to delete everything';setTimeout(()=>{if(t.isConnected){t.classList.remove('arm');t.textContent='Delete my account and data'}},4000);return}
      t.disabled=true;
      const {error}=await sb.rpc('delete_my_account');
      if(error){t.disabled=false;showToast(friendly(error));return}
      closeSheet();outbox=[];saveOutbox();lsDel(LS.baby);await sb.auth.signOut();showToast('Your account and data have been deleted.');return;
    }
  }
});

/* ---------- sign-in and setup screens ---------- */
let pendingEmail='';
function showAuth(){
  $('#authPortrait').innerHTML=avatarSVG(DEFAULT_PROFILE.look,'happy');
  $('#emailForm').hidden=false;$('#codeForm').hidden=true;$('#authErr').textContent='';
  show('authScreen');
}
$('#emailForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const email=$('#email').value.trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){$('#authErr').textContent='Enter your email address, like name@example.com.';return}
  $('#emailBtn').disabled=true;$('#authErr').textContent='';
  // carry a pending invite through the email link, in case it opens in a different browser
  const inv=lsGet(LS.invite,null);
  const redirect=location.origin+location.pathname+(inv?'?invite='+encodeURIComponent(inv):'');
  const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:redirect,shouldCreateUser:true}});
  $('#emailBtn').disabled=false;
  if(error){$('#authErr').textContent=friendly(error);return}
  pendingEmail=email;
  $('#sentTo').textContent=`We sent a link to ${email}. Open it on this device, or type the code from the email below.`;
  $('#emailForm').hidden=true;$('#codeForm').hidden=false;$('#otp').value='';$('#otp').focus();
});
$('#codeForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const token=$('#otp').value.replace(/\D/g,'');
  if(token.length<6){$('#authErr').textContent='The code is 6 digits.';return}
  $('#codeBtn').disabled=true;$('#authErr').textContent='';
  const {error}=await sb.auth.verifyOtp({email:pendingEmail,token,type:'email'});
  $('#codeBtn').disabled=false;
  if(error)$('#authErr').textContent='That code didn’t work. Check the latest email, or send a new link.';
});
$('#changeEmail').addEventListener('click',()=>{$('#emailForm').hidden=false;$('#codeForm').hidden=true;$('#authErr').textContent=''});

function localEntriesToImport(){if(lsGet(LS.imported,false))return [];const e=lsGet(LS.events,{});return Object.values(e||{}).filter(x=>x&&x.id&&x.type&&x.t)}
function showSetup(canCancel){
  const local=localEntriesToImport(), lp=lsGet(LS.profile,null);
  $('#setupPortrait').innerHTML=avatarSVG((lp&&lp.look)?mergeProfile(lp).look:DEFAULT_PROFILE.look,'happy');
  $('#newName').value=lp&&lp.name&&lp.name!=='Baby'?lp.name:'';$('#newBirth').value=lp&&lp.birth||'';
  $('#importRow').hidden=!local.length;$('#importLbl').textContent=`Bring over ${local.length} ${local.length===1?'entry':'entries'} saved on this device`;
  $('#setupCancel').hidden=!canCancel;$('#setupErr').textContent='';
  show('setupScreen');setTimeout(()=>$('#newName').focus(),50);
}
$('#setupCancel').addEventListener('click',()=>{show('appScreen');render()});
$('#setupSignOut').addEventListener('click',()=>sb.auth.signOut());
$('#setupForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const name=$('#newName').value.trim();
  if(!name){$('#setupErr').textContent='Add a name or nickname. You can change it later.';return}
  $('#setupBtn').disabled=true;$('#setupErr').textContent='';
  const importing=!$('#importRow').hidden&&$('#importLocal').checked;
  const lp=importing?mergeProfile(lsGet(LS.profile,{})):mergeProfile({});
  const p=Object.assign(lp,{name,birth:$('#newBirth').value||''});
  const row=rowFromProfile(p);
  const {data,error}=await sb.rpc('create_baby',{p_name:row.name,p_birth:row.birth,p_settings:row.settings,p_look:row.look});
  if(error){$('#setupBtn').disabled=false;$('#setupErr').textContent=friendly(error);return}
  const b=Array.isArray(data)?data[0]:data;
  if(importing){
    const rows=localEntriesToImport().map(ev=>({id:String(ev.id).length>=6?String(ev.id):'imp'+ev.id+uid(),baby_id:b.id,type:ev.type,t:new Date(ev.t).toISOString(),end_t:ev.end?new Date(ev.end).toISOString():null,sub:ev.sub||null,amount:ev.amount!=null?ev.amount:null}));
    for(let i=0;i<rows.length;i+=500){const {error:ie}=await sb.from('events').upsert(rows.slice(i,i+500));if(ie){showToast('Some entries didn’t come across. You can keep using the app.');break}}
    lsSet(LS.imported,true);
  }
  $('#setupBtn').disabled=false;
  babies.push(b);openBaby(b);
});

/* ---------- boot ---------- */
async function openBaby(b){
  baby=b;lsSet(LS.baby,b.id);
  profile=profileFromRow(b);events={};lastFaceKey='';
  const {data:m}=await sb.from('baby_members').select('role').eq('baby_id',b.id).eq('user_id',user.id).maybeSingle();
  myRole=m&&m.role||'caregiver';
  show('appScreen');render();
  await loadEvents();subscribe();flushOutbox();
}
let signedInAs=null;
async function afterSignIn(u,force){
  if(!force&&signedInAs===u.id)return;
  signedInAs=u.id;user=u;
  const code=lsGet(LS.invite,null);let joined=null;
  if(code){
    const {data,error}=await sb.rpc('accept_invite',{p_code:code});
    lsDel(LS.invite);
    if(error)showToast(friendly(error));else joined=data;
  }
  const {data:list,error}=await sb.from('babies').select('*').order('created_at',{ascending:true});
  if(error){show('authScreen');$('#authErr').textContent='Couldn’t load your babies. Check your connection and reload.';return}
  babies=list||[];
  if(!babies.length){showSetup(false);return}
  const want=joined||lsGet(LS.baby,null);
  const b=babies.find(x=>x.id===want)||babies[0];
  if(joined)showToast('You’ve joined '+profileFromRow(b).name+'’s log');
  openBaby(b);
}
function afterSignOut(){
  signedInAs=null;user=null;baby=null;babies=[];events={};
  if(channel){sb.removeChannel(channel);channel=null}
  showAuth();
}

async function boot(){
  if(!CLOUD){loadLocal();show('appScreen');render();return}
  const params=new URLSearchParams(location.search);
  const inv=params.get('invite');
  if(inv){lsSet(LS.invite,inv);params.delete('invite');history.replaceState(null,'',location.pathname+(params.toString()?'?'+params:'')+location.hash)}
  sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  sb.auth.onAuthStateChange((ev,session)=>{
    // Supabase warns against awaiting other calls inside this callback, so defer.
    setTimeout(()=>{
      if(session&&session.user)afterSignIn(session.user);
      else if(ev==='SIGNED_OUT'||ev==='INITIAL_SESSION')afterSignOut();
    },0);
  });
}
setInterval(render,30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();if(CLOUD&&baby){flushOutbox();loadEvents()}}});
window.addEventListener('online',flushOutbox);
if(CLOUD)$('#offlinePill').hidden=!outbox.length;
boot();
})();
