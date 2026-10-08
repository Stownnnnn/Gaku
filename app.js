/* =====================================================================
   CROC — DOSSIER DE TRAQUE · app.js
   Tout le contenu vient de data.js (window.CROC). Ici : rendu, sons
   synthétisés (WebAudio, aucun fichier), effets et interactions.
   ===================================================================== */
(()=>{
'use strict';
const D=window.CROC||{};
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE=matchMedia('(pointer:fine)').matches;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.random()*a.length|0];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pad=(n,l=2)=>String(n).padStart(l,'0');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const NOM=D.nom||'???';
const FRERE=D.frere||'Frère';
const DOS=D.dossier||{};
const GAL=D.galerie||[];
const imgFor=(key,i)=>DOS[key]||(GAL[i]&&GAL[i].src)||(GAL[0]&&GAL[0].src)||'';
const altFor=src=>{const g=GAL.find(x=>x.src===src);return g?g.alt:'Illustration de '+NOM};
/* typographie française : espaces insécables avant ; : ! ? % » et après « */
const ty=h=>String(h).replace(/ ([%!?:;»])/g,'\u00a0$1').replace(/« /g,'«\u00a0');
const ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX','X'];

/* =====================================================================
   AUDIO — tout est synthétisé par le navigateur
   ===================================================================== */
const A=(()=>{
  let ctx,master,sfx,amb,verb,noise,brown,on=false,ambOn=false,cctv=null,neon=null;
  const ok=()=>!!(ctx&&on&&ctx.state==='running');
  function buf(sec,isBrown){
    const n=Math.floor(ctx.sampleRate*sec),b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);let last=0;
    for(let i=0;i<n;i++){const w=Math.random()*2-1;if(isBrown){last=(last+.02*w)/1.02;d[i]=last*3.5}else d[i]=w}
    return b;
  }
  function impulse(sec,decay){
    const r=ctx.sampleRate,n=Math.floor(r*sec),b=ctx.createBuffer(2,n,r);
    for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,decay)}
    return b;
  }
  function init(){
    if(ctx)return true;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
    try{ctx=new AC()}catch(e){return false}
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=4;comp.connect(ctx.destination);
    master=ctx.createGain();master.gain.value=0;master.connect(comp);
    sfx=ctx.createGain();sfx.gain.value=.9;sfx.connect(master);
    amb=ctx.createGain();amb.gain.value=0;amb.connect(master);
    verb=ctx.createConvolver();verb.buffer=impulse(1.8,3);const vg=ctx.createGain();vg.gain.value=.32;verb.connect(vg);vg.connect(master);
    noise=buf(2,false);brown=buf(4,true);
    return true;
  }
  function setOn(v){
    on=v;if(!ctx)return;
    if(v&&ctx.state==='suspended')ctx.resume();
    master.gain.setTargetAtTime(v?1:0,ctx.currentTime,.08);
    if(v)startAmb();
  }
  /* briques */
  function env(t,peak,a,d,dest){const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+d);g.connect(dest||sfx);return g}
  function send(g,amt){const s=ctx.createGain();s.gain.value=amt;g.connect(s);s.connect(verb)}
  function tone(type,f0,f1,t,d,vol,a=.003,wet=0,dest){const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+d);const g=env(t,vol,a,d,dest);if(wet)send(g,wet);o.connect(g);o.start(t);o.stop(t+a+d+.05);return o}
  function nz(t,d,type,f0,f1,vol,a=.002,q=1,wet=0,b,dest){const s=ctx.createBufferSource();s.buffer=b||noise;s.loop=true;const f=ctx.createBiquadFilter();f.type=type;f.frequency.setValueAtTime(f0,t);if(f1)f.frequency.exponentialRampToValueAtTime(f1,t+d);f.Q.value=q;const g=env(t,vol,a,d,dest);if(wet)send(g,wet);s.connect(f);f.connect(g);s.start(t,Math.random()*1.5);s.stop(t+a+d+.05);return g}
  function chop(t,d,vol,step,dest){ /* gain haché (papier, néon) */
    const g=ctx.createGain();g.gain.setValueAtTime(0,t);let tt=t;
    while(tt<t+d){g.gain.setValueAtTime(Math.random()<.75?rnd(.05,1)*vol*(1-(tt-t)/d*.7):0,tt);tt+=rnd(step*.4,step*1.6)}
    g.gain.setValueAtTime(0,t+d);g.connect(dest||sfx);return g;
  }
  const P=fn=>(...a)=>{if(ok())try{fn(ctx.currentTime,...a)}catch(e){console.warn('Son :',e)}};
  const S={
    /* machine à écrire : frappe, espace, clochette, retour chariot */
    key:P((t,v=1)=>{const p=rnd(.85,1.18);
      nz(t,.016,'highpass',2400*p,null,.34*v,.001,.7,.06);
      nz(t,.028,'bandpass',3300*p,null,.2*v,.001,6);
      tone('triangle',230*p,95,t,.045,.24*v,.001);
      nz(t+.014,.035,'lowpass',700,null,.15*v,.002)}),
    space:P(t=>{nz(t,.05,'lowpass',900,null,.25,.002);tone('sine',140,80,t,.06,.2,.002)}),
    bell:P(t=>{[2093,4230,5790,8150].forEach((f,i)=>tone('sine',f,null,t,1.5/(i+1),[.15,.05,.055,.02][i],.001,.25))}),
    ret:P(t=>{for(let i=0;i<13;i++)nz(t+i*.021,.011,'bandpass',2400+i*70,null,.12,.001,4);
      nz(t,.28,'bandpass',800,1900,.07,.03,1);
      tone('sine',170,70,t+.29,.09,.38,.002);nz(t+.29,.05,'lowpass',1300,null,.3,.001)}),
    /* papier */
    rustle:P((t,d=.45,v=1)=>{const s=ctx.createBufferSource();s.buffer=noise;s.loop=true;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=rnd(2600,4200);f.Q.value=.6;const h=ctx.createBiquadFilter();h.type='highpass';h.frequency.value=900;const g=chop(t,d,.38*v,.02);s.connect(f);f.connect(h);h.connect(g);s.start(t,Math.random());s.stop(t+d+.05)}),
    slide:P((t,v=1)=>{nz(t,.55,'bandpass',500,2400,.16*v,.18,.8);nz(t,.4,'highpass',3200,null,.04*v,.12)}),
    /* tampon encreur */
    stamp:P((t,v=1)=>{tone('sine',150,44,t,.24,.95*v,.002,.15);nz(t,.07,'lowpass',1500,200,.6*v,.001,1,.2,brown);nz(t,.018,'highpass',2600,null,.22*v,.001);nz(t+.09,.1,'bandpass',420,null,.06*v,.01,2)}),
    /* appareil photo */
    shutter:P(t=>{nz(t,.012,'highpass',3200,null,.5,.001);nz(t,.03,'bandpass',1900,null,.3,.001,3);
      nz(t+.085,.014,'highpass',2600,null,.42,.001);nz(t+.085,.04,'bandpass',1200,null,.25,.001,3);
      const o=ctx.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(180,t+.16);o.frequency.linearRampToValueAtTime(420,t+.5);const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=900;f.Q.value=2;const g=chop(t+.16,.36,.05,.012);o.connect(f);f.connect(g);o.start(t+.16);o.stop(t+.56)}),
    pen:P((t,d=.15)=>{nz(t,d,'bandpass',rnd(2600,3800),null,.11,.012,2.5);nz(t,d*.7,'highpass',5000,null,.03,.01)}),
    tap:P(t=>{nz(t,.02,'bandpass',1800,null,.17,.001,2);tone('sine',420,300,t,.03,.06)}),
    hover:P(t=>{nz(t,.035,'bandpass',4200,null,.045,.004,3)}),
    telex:P(t=>{nz(t,.009,'bandpass',rnd(1100,1600),null,.22,.001,4);tone('square',rnd(80,110),null,t,.012,.045,.001)}),
    beep:P((t,hi)=>{tone('square',hi?1180:880,null,t,.14,.06,.002);tone('sine',hi?2360:1760,null,t,.1,.03,.002)}),
    knob:P(t=>{nz(t,.015,'bandpass',1500,null,.3,.001,5);tone('sine',90,60,t,.05,.15,.001)}),
    boom:P(t=>{nz(t,2.6,'lowpass',2200,60,1,.003,.7,.4,brown);tone('sine',62,24,t,1.8,1,.003);
      for(let i=0;i<12;i++)nz(t+.08+i*rnd(.06,.16),.12,'bandpass',rnd(600,4000),null,.16,.001,3,.3);
      nz(t+.4,2,'lowpass',420,80,.45,.4,.7,.3,brown)}),
    thunder:P(t=>{const d=rnd(3,5.5);nz(t,d,'lowpass',240,55,.32,rnd(.3,.8),.7,.3,brown);nz(t+rnd(.1,.5),1.3,'lowpass',520,120,.16,.06,.7,.2,brown)}),
    slam:P((t,v=1)=>{tone('sine',92,30,t,.6,1*v,.002);nz(t,.25,'lowpass',1000,90,.8*v,.001,1,.3,brown);nz(t,.05,'highpass',2800,null,.4*v,.001);
      [523,787,1219].forEach((f,i)=>tone('triangle',f,f*.99,t,.9-i*.2,.08*v/(i+1),.002,.4))}),
    whoosh:P((t,d=.4)=>{nz(t,d,'bandpass',300,2600,.3,d*.7,1.2)}),
    clank:P((t,v=1)=>{const c=ctx.createOscillator(),m=ctx.createOscillator(),mg=ctx.createGain(),g=env(t,.28*v,.002,.6);send(g,.3);const f=rnd(380,460);c.frequency.value=f;m.frequency.value=f*2.41;mg.gain.setValueAtTime(600,t);mg.gain.exponentialRampToValueAtTime(5,t+.5);m.connect(mg);mg.connect(c.frequency);c.connect(g);c.start(t);m.start(t);c.stop(t+.7);m.stop(t+.7);tone('sine',110,60,t,.25,.4*v,.002)}),
    chime:P(t=>{[659.3,987.8,1318.5,1975.5].forEach((f,i)=>tone('sine',f,null,t+i*.11,1.8,.1,.004,.6))}),
    pluck:P((t,f=110)=>{tone('triangle',f*2,f*1.97,t,.55,.11,.002,.2);tone('sine',f,null,t,.7,.12,.002);nz(t,.02,'bandpass',1800,null,.07,.001,2)}),
    needle:P(t=>{nz(t,.008,'highpass',3500,null,.09,.001)}),
    dice:P(t=>{for(let i=0;i<10;i++){const tt=t+i*.07*(1+i*.15);nz(tt,.015,'bandpass',rnd(2000,3800),null,.25*(1-i/13),.001,5);tone('sine',rnd(700,1200),null,tt,.02,.04,.001)}}),
    buzz:P((t,d=.4)=>{const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=100;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=1800;f.Q.value=.8;const g=chop(t,d,.09,.03);o.connect(f);f.connect(g);o.start(t);o.stop(t+d+.05);if(neon){neon.gain.setValueAtTime(.05,t);neon.gain.setTargetAtTime(.012,t+d,.1)}}),
    glitch:P(t=>{for(let i=0;i<8;i++){nz(t+i*.04,.035,'bandpass',rnd(300,6000),null,.22,.001,2);tone('square',rnd(80,900),null,t+i*.04,.03,.04,.001)}}),
  };
  function siren(){
    if(!ok())return ()=>{};
    const t=ctx.currentTime,o=ctx.createOscillator(),o2=ctx.createOscillator(),l=ctx.createOscillator(),lg=ctx.createGain(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    o.type='sawtooth';o2.type='square';o.frequency.value=720;o2.frequency.value=724;l.type='triangle';l.frequency.value=.85;lg.gain.value=240;
    l.connect(lg);lg.connect(o.frequency);lg.connect(o2.frequency);
    f.type='lowpass';f.frequency.value=2200;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.075,t+.3);
    o.connect(f);o2.connect(f);f.connect(g);g.connect(sfx);send(g,.3);[o,o2,l].forEach(x=>x.start(t));
    return ()=>{const n=ctx.currentTime;g.gain.cancelScheduledValues(n);g.gain.setTargetAtTime(0,n,.06);[o,o2,l].forEach(x=>x.stop(n+.6))};
  }
  /* ambiance : pluie sur la vitre, néon, ronronnement de caméra, orage lointain */
  function startAmb(){
    if(ambOn||!ctx)return;ambOn=true;const t=ctx.currentTime;
    amb.gain.setValueAtTime(0,t);amb.gain.linearRampToValueAtTime(1,t+5);
    const r=ctx.createBufferSource();r.buffer=noise;r.loop=true;
    const rf=ctx.createBiquadFilter();rf.type='bandpass';rf.frequency.value=1500;rf.Q.value=.35;
    const rl=ctx.createBiquadFilter();rl.type='lowpass';rl.frequency.value=4000;
    const rg=ctx.createGain();rg.gain.value=.04;r.connect(rf);rf.connect(rl);rl.connect(rg);rg.connect(amb);r.start();
    const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=.06;lg.gain.value=.014;lfo.connect(lg);lg.connect(rg.gain);lfo.start();
    const b=ctx.createBufferSource();b.buffer=brown;b.loop=true;const bf=ctx.createBiquadFilter();bf.type='lowpass';bf.frequency.value=360;
    const bg=ctx.createGain();bg.gain.value=.11;b.connect(bf);bf.connect(bg);bg.connect(amb);b.start();
    neon=ctx.createGain();neon.gain.value=.012;const nf=ctx.createBiquadFilter();nf.type='bandpass';nf.frequency.value=240;nf.Q.value=1.4;
    [100,200,300].forEach((fr,i)=>{const o=ctx.createOscillator();o.type=i?'sine':'sawtooth';o.frequency.value=fr+rnd(-.3,.3);const og=ctx.createGain();og.gain.value=[1,.5,.3][i];o.connect(og);og.connect(nf);o.start()});
    nf.connect(neon);neon.connect(amb);
    cctv=ctx.createGain();cctv.gain.value=0;cctv.connect(amb);
    const cs=ctx.createBufferSource();cs.buffer=noise;cs.loop=true;const cf=ctx.createBiquadFilter();cf.type='bandpass';cf.frequency.value=6500;cf.Q.value=.7;
    const csg=ctx.createGain();csg.gain.value=.035;cs.connect(cf);cf.connect(csg);csg.connect(cctv);cs.start();
    const co=ctx.createOscillator();co.type='square';co.frequency.value=60;const cl=ctx.createBiquadFilter();cl.type='lowpass';cl.frequency.value=190;
    const cog=ctx.createGain();cog.gain.value=.06;co.connect(cl);cl.connect(cog);cog.connect(cctv);co.start();
    const wh=ctx.createOscillator();wh.frequency.value=7800;const wg=ctx.createGain();wg.gain.value=.002;wh.connect(wg);wg.connect(cctv);wh.start();
    (function drop(){if(ok()){const n=ctx.currentTime;tone('sine',rnd(1800,4200),rnd(500,1100),n,rnd(.02,.05),rnd(.004,.013),.001,0,amb)}setTimeout(drop,rnd(40,240))})();
    (function th(){setTimeout(()=>{S.thunder();th()},rnd(22000,55000))})();
    if(camWanted)cctvOn(true);
  }
  let camWanted=false;
  function cctvOn(v){camWanted=v;if(cctv)cctv.gain.setTargetAtTime(v?1:0,ctx.currentTime,.4)}
  return {init,setOn,get on(){return on},S,siren,cctvOn,ok};
})();
const S=A.S;

/* =====================================================================
   OUTILS VISUELS
   ===================================================================== */
const folder=$('#folder');
function flash(color='#fff',o=.5,d=260){if(RM)o*=.4;const f=$('#flash');f.style.background=color;f.animate([{opacity:o},{opacity:0}],{duration:d,easing:'ease-out'})}
function shake(el=folder,p=8,d=360){
  if(RM||!el)return;const k=[];
  for(let i=0;i<10;i++){const f=1-i/10;k.push({transform:`translate(${((i%2?-1:1)*p*f).toFixed(1)}px,${(((i%3)-1)*p*f*.6).toFixed(1)}px)`})}
  k.push({transform:'none'});el.animate(k,{duration:d,easing:'linear'});
}
function stampIn(slot,delay=0){
  if(!slot||slot.dataset.done)return Promise.resolve();slot.dataset.done='1';
  const s=document.createElement('span');
  s.className='stamp'+(slot.dataset.tone==='blue'?' blue':'')+(slot.hasAttribute('data-small')?' small':'');
  s.textContent=slot.dataset.stamp;
  const mp=`${rnd(0,200)|0}px ${rnd(0,80)|0}px`;s.style.webkitMaskPosition=mp;s.style.maskPosition=mp;
  slot.appendChild(s);
  const r=(getComputedStyle(slot).getPropertyValue('--r')||'-8deg').trim()||'-8deg';
  return new Promise(res=>setTimeout(()=>{
    if(RM){s.classList.add('in');S.stamp(.7);return res()}
    const a=s.animate([
      {opacity:0,transform:`rotate(${r}) scale(2.5) translateY(-24px)`},
      {opacity:.95,transform:`rotate(${r}) scale(.95)`,offset:.84},
      {opacity:.86,transform:`rotate(${r}) scale(1)`}],{duration:240,easing:'cubic-bezier(.55,0,1,.6)'});
    setTimeout(()=>{S.stamp();shake(slot.closest('.sheet')||folder,5,240)},200);
    a.onfinish=()=>{s.classList.add('in');res()};
  },delay));
}
async function typeLine(box,text,{speed=32,kind='key',bell=true}={}){
  const d=document.createElement('div');d.className='cur';box.appendChild(d);
  if(RM){d.textContent=text;d.classList.remove('cur');return}
  for(let i=0;i<text.length;i++){
    const c=text[i];d.textContent+=c;
    if(kind==='key'){c===' '?S.space():S.key(.8)}else if(i%2===0)S.telex();
    await sleep(speed*rnd(.6,1.45)+(/[.:…]/.test(c)?110:0));
  }
  if(kind==='key'&&bell){S.bell();await sleep(140);S.ret();await sleep(260)}
  d.classList.remove('cur');
  if(box.scrollHeight>box.clientHeight)box.scrollTop=box.scrollHeight;
}
function scramble(el,final,dur=650){
  if(RM){el.textContent=final;return}
  const ch='#%/\\?01$&▮';const t0=performance.now();
  (function f(){const p=Math.min(1,(performance.now()-t0)/dur);
    el.textContent=[...final].map((c,i)=>c===' '?' ':i<p*final.length?c:ch[Math.random()*ch.length|0]).join('');
    if(p<1)requestAnimationFrame(f)})();
}

/* =====================================================================
   RENDU À PARTIR DE data.js
   ===================================================================== */
const KEYS=['comme des NPC','des jeux vidéo','seule exception','mauvais NPC','du Chaos','Prudence','prudence en l\'abordant','Aucune émotion'];
function underline(text){
  let h=esc(text);
  KEYS.forEach(k=>{const e=esc(k);const i=h.indexOf(e);if(i>-1&&!h.slice(0,i).endsWith('<span class="u">'))h=h.slice(0,i)+'<span class="u">'+e+'</span>'+h.slice(i+e.length)});
  return h;
}
function silhouette(seed,special){
  /* silhouette de surveillance générique (aucun trait réel n'est représenté) */
  let s=seed*9301+49297;const r=()=>((s=(s*9301+49297)%233280)/233280);
  const shade=special?'#13291c':`hsl(120,${3+r()*5|0}%,${11+r()*10|0}%)`;
  const head=11+r()*3,hx=30+(r()-.5)*6,hy=34+(r()-.5)*4,sh=24+r()*6;
  const v=r();
  let extra='';
  if(v<.22)extra=`<path d="M${hx-head-2} ${hy-2} Q${hx} ${hy-head-12} ${hx+head+2} ${hy-2} Z" fill="${shade}" opacity=".9"/><rect x="${hx-head-5}" y="${hy-4}" width="${head*2+10}" height="3" fill="${shade}"/>`;
  else if(v<.42)extra=`<path d="M${hx-head-4} ${hy+12} Q${hx-head-6} ${hy-head-6} ${hx} ${hy-head-5} Q${hx+head+6} ${hy-head-6} ${hx+head+4} ${hy+12} Z" fill="${shade}" opacity=".85"/>`;
  else if(v<.6)extra=`<path d="M${hx-head} ${hy} Q${hx-head-3} ${hy+16} ${hx-head+2} ${hy+20} L${hx+head-2} ${hy+20} Q${hx+head+3} ${hy+16} ${hx+head} ${hy} Z" fill="${shade}" opacity=".8"/>`;
  return `<svg viewBox="0 0 60 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><radialGradient id="sg${seed}" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="${special?'#a9c9b2':'#a3aaa2'}"/><stop offset="1" stop-color="${special?'#3c5a46':'#4a504a'}"/></radialGradient></defs>
    <rect width="60" height="80" fill="url(#sg${seed})"/>
    <path d="M${30-sh} 80 Q${30-sh} ${hy+16} 30 ${hy+14} Q${30+sh} ${hy+16} ${30+sh} 80 Z" fill="${shade}"/>
    <circle cx="${hx}" cy="${hy}" r="${head}" fill="${shade}"/>${extra}
    <text x="3" y="77" font-size="5" fill="rgba(240,255,240,.8)" font-family="monospace">${pad(seed+1)}</text></svg>`;
}
const CROWD=`<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" fill="#2d302d"/>${[[18,54,9],[40,48,10],[62,52,9],[84,50,10],[28,72,11],[52,70,12],[76,74,11]].map(([x,y,r],i)=>`<g fill="hsl(120,5%,${34+i*3}%)"><circle cx="${x}" cy="${y-r*1.4}" r="${r*.62}"/><path d="M${x-r*1.25} ${y+r*2} Q${x-r*1.2} ${y-r*.4} ${x} ${y-r*.5} Q${x+r*1.2} ${y-r*.4} ${x+r*1.25} ${y+r*2} Z"/></g>`).join('')}</svg>`;

function render(){
  /* couverture */
  $('#cv-title').textContent=NOM;
  $('#cvsub').textContent=D.sousTitre||'';
  $('.cv-tab').textContent=NOM;

  /* I. fiche */
  $('#subjname').textContent=NOM;
  $('#subsub').textContent=D.sousTitre||'';
  const mug=imgFor('photoFiche',3);$('#mugimg').src=mug;$('#mugimg').alt=altFor(mug);
  $('#champs').innerHTML=(D.champs||[]).map(c=>{
    const v=String(c.valeur==null?'???':c.valeur);
    const inner=v.trim()==='???'
      ?`<button type="button" class="redact" aria-label="${esc(c.label)} : champ censuré. Afficher" aria-expanded="false"><span class="val">???</span><span class="bar" aria-hidden="true"></span><span class="why" aria-hidden="true">non renseigné</span></button>`
      :esc(v);
    return `<div><dt>${esc(c.label)}</dt><dd>${inner}</dd></div>`;
  }).join('');
  $('#phys').innerHTML=(D.physique||[]).map(p=>`<li>${ty(esc(p))}</li>`).join('');

  /* II. caméra */
  const cam=imgFor('photoCamera',2);$('#camimg').src=cam;$('#camimg').alt=altFor(cam)+' (image de surveillance)';

  /* III. profil */
  $('#psy').innerHTML=(D.psycho||[]).map(p=>`<li>${ty(underline(p))}</li>`).join('');

  /* IV. tri */
  const N=24,fr=6+Math.floor(Math.random()*12);let h='';
  for(let i=0;i<N;i++){
    const isF=i===fr;
    h+=`<button type="button" class="subj${isF?' frere':''}" data-i="${i}" style="--rot:${rnd(-2.2,2.2).toFixed(1)}deg"
      aria-label="${isF?esc(FRERE)+', son frère : non-NPC':'NPC n° '+pad(i+1)+' : non classé'}">
      <span class="shot">${silhouette(i,isF)}</span>
      <span class="tag"><span>${isF?'NON-NPC — '+esc(FRERE.toUpperCase()):'NPC n° '+pad(i+1)}</span></span>
      ${isF?'':'<span class="verdict" aria-hidden="true"></span>'}</button>`;
  }
  $('#sort').innerHTML=h;
  const note=document.createElement('p');note.className='hand trinote';note.id='trinote';note.setAttribute('aria-live','polite');
  $('#sort').after(note);

  /* V. évaluation */
  const T=(D.titres||[])[0];
  let ev=`<div class="ev-row ev-head" aria-hidden="true"><span>Statistique</span><span>Niveaux (1 case = 1 point)</span><span style="text-align:right">Total</span></div>`;
  (D.stats||[]).forEach(s=>{
    const max=s.max||20;let boxes='';
    for(let g=0;g<Math.ceil(max/5);g++){boxes+='<span class="grp">';for(let j=g*5;j<Math.min(max,g*5+5);j++)boxes+=`<span class="box" data-i="${j}"></span>`;boxes+='</span>'}
    ev+=`<div class="ev-row" data-v="${+s.val||0}" role="group" aria-label="${esc(s.nom)} : ${+s.val||0} sur ${max}${s.bonus?', bonus '+esc(s.bonus):''}">
      <span class="ev-name"><span class="nm">${esc(s.nom)}${s.bonus?`<svg class="circ" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d="M58 3 C 92 1, 100 22, 60 28 C 18 31, 0 24, 2 14 C 4 5, 38 0, 78 6"/></svg><span class="bonus" aria-hidden="true">${ty(esc(s.bonus))}</span>`:''}</span></span>
      <span class="boxes" aria-hidden="true">${boxes}</span>
      <span class="ev-val"><span class="n">${pad(+s.val||0)}</span><small>/${max}</small></span></div>`;
  });
  const bonusNames=(D.stats||[]).filter(s=>s.bonus).map(s=>s.nom);
  if(bonusNames.length&&T)ev+=`<div class="ev-foot"><span class="hand">${esc(bonusNames.join(' et '))} : ${esc((D.stats.find(s=>s.bonus)||{}).bonus||'')}, effet du titre [${esc(T.nom)}]</span></div>`;
  $('#stats').innerHTML=ev;
  $('#rolls').innerHTML=(D.rolls||[]).map((r,i)=>gaugeHTML(r,i)).join('');

  /* VI. protocole */
  renderSkills();

  /* VII. mention */
  if(T){
    let li=0;const letters=('['+T.nom+']').split(' ').map(w=>`<span class="w">${[...w].map(c=>`<span class="l${c==='!'?' br':''}" style="--i:${li++}">${esc(c)}</span>`).join('')}</span>`).join(' ');
    const ph=imgFor('photoTitre',4);
    $('#titres').innerHTML=`<article class="memo">
      <dl class="memo-h"><dt>De</dt><dd>[SYSTÈME]</dd><dt>À</dt><dd>Personnel chargé du suivi</dd><dt>Objet</dt><dd>Titre détenu par le sujet ${esc(NOM)}</dd></dl>
      <p class="memo-intro">Il est porté à la connaissance du personnel que le sujet détient le titre ci-dessous. Merci d'en prendre note avec tout le sérieux requis.</p>
      <button type="button" class="title-big" id="tname" aria-label="Titre : ${esc(T.nom)}. Faire une série">${letters}</button>
      <div class="memo-grid">
        <div class="memo-body">
          <p><span class="k">Condition d'obtention</span>${ty(esc(T.condition))}</p>
          <p><span class="k">Effet</span>${ty(esc(T.effet))}</p>
        </div>
        <figure class="memo-photo"><span class="clip" aria-hidden="true"></span><img src="${esc(ph)}" alt="${esc(altFor(ph))}"><figcaption>${esc((D.stats||[]).find(s=>s.bonus)?.bonus||'')}</figcaption></figure>
      </div>
      <div class="memo-sign"><span>Le Système</span><span class="sic">(sic)</span></div>
      <div class="stamp-slot" data-stamp="Mention officielle" data-tone="red" style="--r:-6deg"></div>
    </article>`;
  }

  /* VIII. pièces */
  $('#gal').innerHTML=GAL.map((g,i)=>`<button type="button" class="bag" data-i="${i}" style="--rot:${(i%2?1:-1)*rnd(.8,2.4).toFixed(1)}deg" aria-label="Pièce n° ${pad(i+1)} : ${esc(g.alt)}. Examiner">
    <span class="ph"><img src="${esc(g.src)}" alt="" loading="lazy"></span>
    <span class="lbl"><b>PIÈCE N°\u00a0${pad(i+1)}</b>${esc(g.alt)}</span></button>`).join('');

  /* intercalaires numérotés + boutons « feuillet suivant » */
  const tabs=$$('#tabs [role=tab]');
  tabs.forEach((t,i)=>t.dataset.n=ROMAN[i]||'');
  $$('.sheet').forEach((sh,i)=>{
    const nx=tabs[(i+1)%tabs.length],last=i===tabs.length-1;
    $('.next-wrap',sh).innerHTML=`<button type="button" class="next" data-go="${nx.getAttribute('aria-controls')}">${last?'Revenir au début du dossier':'Feuillet suivant'}<span>${ROMAN[(i+1)%tabs.length]}. ${esc(nx.textContent)}</span></button>`;
  });
}

function gaugeHTML(r,i){
  const cx=110,cy=112,R=88;let ticks='';
  for(let v=0;v<=100;v+=5){const a=(200-2.2*v)*Math.PI/180,maj=v%10===0,r1=maj?R-14:R-8;
    ticks+=`<line class="g-tick${maj?' maj':''}" x1="${(cx+Math.cos(a)*r1).toFixed(1)}" y1="${(cy-Math.sin(a)*r1).toFixed(1)}" x2="${(cx+Math.cos(a)*R).toFixed(1)}" y2="${(cy-Math.sin(a)*R).toFixed(1)}"/>`;
    if(v%20===0)ticks+=`<text class="g-num" x="${(cx+Math.cos(a)*(R-26)).toFixed(1)}" y="${(cy-Math.sin(a)*(R-26)+4).toFixed(1)}">${v}</text>`}
  const a0=200*Math.PI/180,a1=-20*Math.PI/180;
  const arc=`M${(cx+Math.cos(a0)*(R+6)).toFixed(1)} ${(cy-Math.sin(a0)*(R+6)).toFixed(1)} A${R+6} ${R+6} 0 1 1 ${(cx+Math.cos(a1)*(R+6)).toFixed(1)} ${(cy-Math.sin(a1)*(R+6)).toFixed(1)}`;
  const F=R+12,face=`M${(cx+Math.cos(a0)*F).toFixed(1)} ${(cy-Math.sin(a0)*F).toFixed(1)} A${F} ${F} 0 1 1 ${(cx+Math.cos(a1)*F).toFixed(1)} ${(cy-Math.sin(a1)*F).toFixed(1)}`;
  const v=+r.val||0,atyp=v<=10||v>=90;
  return `<div class="gauge" data-v="${v}" role="img" aria-label="${esc(r.nom)} : ${v} sur 100">
    <svg viewBox="0 0 220 160" aria-hidden="true">
      <path class="g-face" d="${face} Z"/>
      <path d="${arc}" fill="none" stroke="#2a2520" stroke-width="1.2"/>
      ${ticks}
      <text class="g-num" x="${cx}" y="${cy+44}" style="font-size:9px;letter-spacing:.2em">ROLL / 100</text>
      <g class="g-needle" transform="rotate(-200 ${cx} ${cy})"><path d="M${cx-14} ${cy-3} L${cx+R-6} ${cy} L${cx-14} ${cy+3} Z"/></g>
      <circle class="g-hub" cx="${cx}" cy="${cy}" r="7"/><circle cx="${cx}" cy="${cy}" r="2.5" fill="#c9b98f"/>
    </svg>
    <div class="g-lbl"><b>${esc(r.nom)}</b><span><span class="n">0</span><small>/100</small></span></div>
    ${atyp?'<div class="stamp-slot" data-stamp="Valeur atypique" data-tone="red" data-small style="--r:'+(i%2?6:-7)+'deg"></div>':''}
  </div>`;
}

const HAMMER=`<svg class="hammer" id="hammer" viewBox="0 0 400 300" aria-hidden="true">
  <defs>
    <linearGradient id="hs" x1="0" x2="1"><stop offset="0" stop-color="#5f7684"/><stop offset=".5" stop-color="#9fb4bf"/><stop offset="1" stop-color="#4b5f6b"/></linearGradient>
    <linearGradient id="hh" x1="0" x2="1"><stop offset="0" stop-color="#2d2f33"/><stop offset=".5" stop-color="#5a5e66"/><stop offset="1" stop-color="#25272b"/></linearGradient>
  </defs>
  <path d="M120 230 C 170 250, 210 180, 250 215 S 330 250, 360 205" fill="none" stroke="#c9dbe6" stroke-width="6" stroke-linecap="round" opacity=".8"/>
  <g transform="translate(70 285) rotate(52)">
    <rect x="-7" y="-262" width="14" height="262" rx="5" fill="url(#hh)"/>
    ${Array.from({length:9},(_,i)=>`<path d="M-9 ${-14-i*7} L9 ${-20-i*7} L9 ${-15-i*7} L-9 ${-9-i*7} Z" fill="#e9e3d2" stroke="#9f9785" stroke-width=".6"/>`).join('')}
    <rect x="-60" y="-318" width="120" height="64" rx="5" fill="url(#hs)" stroke="#2b3a42" stroke-width="2"/>
    <rect x="-60" y="-318" width="120" height="10" fill="rgba(255,255,255,.18)"/>
    ${[-40,-14,12,38].map(x=>[-300,-274].map(y=>`<path d="M${x} ${y} l9 -9 l9 9 l-9 9 Z" fill="#c7d6de" stroke="#33444d" stroke-width="1.2"/><path d="M${x+9} ${y-9} l9 9 l-9 9 Z" fill="#6f8794"/>`).join('')).join('')}
    ${[-306,-286,-266].map(y=>`<path d="M-60 ${y-6} l-16 6 l16 6 Z" fill="#8ea3ae" stroke="#33444d" stroke-width="1.2"/><path d="M60 ${y-6} l16 6 l-16 6 Z" fill="#6f8794" stroke="#33444d" stroke-width="1.2"/>`).join('')}
    ${[-44,-16,12,40].map(x=>`<path d="M${x-6} -318 l6 -15 l6 15 Z" fill="#9fb4bf" stroke="#33444d" stroke-width="1.2"/>`).join('')}
  </g>
</svg>`;

function renderSkills(){
  const sk=D.competences||[];const L=sk[0],M=sk[1];let h='';
  if(L){
    h+=`<article class="skill" id="sk-lien">
      <div class="skill-h"><h2>[${esc(L.nom)}]</h2><span class="meta">Compétence ${esc((L.type||'').toLowerCase())} · ${L.niveaux.length} niveaux</span></div>
      <p class="desc">${esc(L.desc)}</p>
      <div class="lvtabs" role="tablist" aria-label="Niveaux de ${esc(L.nom)}">${L.niveaux.map(n=>`<button type="button" role="tab" id="lvt${n.lv}" aria-controls="lvpanel" data-lv="${n.lv}">LV.${n.lv}</button>`).join('')}</div>
      <div class="lvcard" role="tabpanel" id="lvpanel">
        <div class="lvtable">
          <div><span>Coût</span><b id="lc"></b></div>
          <div><span>Préavis du Système</span><b id="lp"></b></div>
          <div class="w"><span>Pour atteindre ce niveau</span><b id="lr"></b></div>
        </div>
        <p class="lvspec" id="ls" hidden></p>
      </div>
      <div class="console" id="console">
        <div class="c-left">
          <button type="button" class="bigbtn" id="activate">Activer le lien</button>
          <span class="beacon-ic" aria-hidden="true"></span>
        </div>
        <div class="c-right">
          <div class="c-row">
            <div class="ene"><span>ENE</span><div class="track-e"><i id="enebar"></i></div><b id="enev">100</b></div>
          </div>
          <div class="c-row">
            <div class="count" id="count" aria-hidden="true">T-00</div>
            <div class="dice dim" id="dice"><b id="dieval">—</b><span>Dé du Système<br>(LV.${L.niveaux[L.niveaux.length-1].lv}, 1 à ${L.des||100})</span></div>
          </div>
          <div class="tape" id="tape" aria-live="polite"><div>[SYSTÈME] En attente d'activation.</div></div>
          <div class="tally">Catastrophes simulées : <span class="marks" id="tally">—</span></div>
        </div>
        <p class="c-note">Simulation illustrative. Les événements tirés viennent de la liste « catastrophes » de data.js, qui sert d'exemple.</p>
      </div>
      <div id="incident"></div>
    </article>`;
  }
  if(M){
    h+=`<article class="evidence">
      <div class="ev-tagged">${HAMMER}
        <div class="ev-label"><b>PIÈCE À CONVICTION</b>Arme lourde : marteau à pointes</div>
      </div>
      <div class="ev-text">
        <h3>[${esc(M.nom)}]</h3>
        <p class="meta">Compétence ${esc((M.type||'').toLowerCase())} · LV.${esc(M.niveau)}</p>
        <p>${esc(M.desc)}</p>
        <button type="button" class="btn" id="strike">Frapper sur le bureau</button>
      </div>
    </article>`;
  }
  $('#skills').innerHTML=h;
}

/* =====================================================================
   NAVIGATION ENTRE LES FEUILLETS
   ===================================================================== */
const sheets=$$('.sheet'),tabs=$$('#tabs [role=tab]');
let current=null,opened=false;
const entered=new Set();
function show(id,{sound=true,focus=false}={}){
  const next=document.getElementById(id);if(!next||!next.classList.contains('sheet'))return;
  if(current===next){return}
  const prev=current;current=next;
  tabs.forEach(t=>{const on=t.getAttribute('aria-controls')===id;t.setAttribute('aria-selected',on);t.tabIndex=on?0:-1});
  next.hidden=false;
  if(prev){
    prev.classList.add('leaving');
    if(sound){S.rustle(.5);S.slide()}
    if(RM){prev.hidden=true;prev.classList.remove('leaving')}
    else{
      const a=prev.animate([{transform:'none',opacity:1},{transform:'translate(-4%,-1.5%) rotate(-2.5deg)',opacity:1,offset:.3},{transform:'translate(-112%,3%) rotate(-9deg)',opacity:0}],{duration:560,easing:'cubic-bezier(.5,0,.75,.4)'});
      a.onfinish=()=>{prev.hidden=true;prev.classList.remove('leaving')};
      next.animate([{transform:'translateY(12px) rotate(.5deg)',filter:'brightness(.8)'},{transform:'none',filter:'none'}],{duration:560,easing:'cubic-bezier(.2,.7,.3,1)'});
    }
    leave(prev.id);
  }
  sheets.forEach(s=>{if(s!==next&&s!==prev)s.hidden=true});
  try{history.replaceState(null,'','#'+id)}catch(e){}
  const top=folder.getBoundingClientRect().top+scrollY+20;
  if(prev&&scrollY>top)scrollTo({top,behavior:RM?'auto':'smooth'});
  if(focus)next.focus({preventScroll:true});
  if(opened)enter(id);
}
function enter(id){
  if(id==='camera')camStart();
  if(id==='profil')requestAnimationFrame(()=>Board.layout());
  if(entered.has(id))return;entered.add(id);
  (ENTER[id]||(()=>{}))();
}
function leave(id){if(id==='camera')camStop()}

const ENTER={
  async fiche(){
    const box=$('#boot');box.innerHTML='';
    for(const l of (D.boot||[]))await typeLine(box,l,{speed:26});
    await stampIn($('#fiche .s-dang'),150);
    await stampIn($('#fiche .s-conf'),200);
  },
  async camera(){
    const box=$('#camlog');box.innerHTML='';
    const lines=['[SYSTÈME] Flux vidéo : connexion établie.',`[SYSTÈME] Sujet identifié : ${NOM}.`,'[SYSTÈME] Cadrage automatique sur le sujet.'];
    const pr=(D.boot||[]).find(l=>/prudence/i.test(l));if(pr)lines.push(pr);
    for(const l of lines)await typeLine(box,l,{speed:16,kind:'telex'});
  },
  async profil(){
    const us=$$('#psy .u');
    for(const u of us){await sleep(RM?0:380);u.classList.add('on');S.pen(.5)}
    await stampIn($('#profil .s-prud'),200);
  },
  async evaluation(){
    const rows=$$('#stats .ev-row[data-v]');
    for(const r of rows){
      const v=+r.dataset.v;const boxes=$$('.box',r);
      for(let j=0;j<v&&j<boxes.length;j++){checkBox(boxes[j]);if(!RM)await sleep(130)}
      const c=$('.circ path',r);if(c){drawPath(c,600);S.pen(.5);await sleep(RM?0:420);$('.bonus',r).classList.add('on')}
      if(!RM)await sleep(60);
    }
    $$('#rolls .gauge').forEach((g,i)=>setTimeout(()=>runGauge(g),RM?0:i*700));
  },
  mention(){
    stampIn($('#mention .stamp-slot'),700);
  },
};

/* coche au stylo */
function checkBox(b){
  const j=()=>rnd(-1.2,1.2).toFixed(1);
  b.innerHTML=`<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M${3+ +j()} ${10+ +j()} L${8+ +j()} ${16+ +j()} L${19+ +j()} ${1+ +j()}"/></svg>`;
  drawPath($('path',b),200);S.pen(.12);
}
function drawPath(p,dur){
  const L=p.getTotalLength?p.getTotalLength():60;
  p.style.strokeDasharray=L;p.style.strokeDashoffset=RM?0:L;
  if(!RM)p.animate([{strokeDashoffset:L},{strokeDashoffset:0}],{duration:dur,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
}

/* cadrans à aiguille (ressort amorti) */
function runGauge(g){
  const target=+g.dataset.v,needle=$('.g-needle',g),num=$('.n',g),cx=110,cy=112;
  const set=v=>{needle.setAttribute('transform',`rotate(${(-(200-2.2*v)).toFixed(2)} ${cx} ${cy})`)};
  if(RM){set(target);num.textContent=target;stampIn($('.stamp-slot',g));return}
  let v=0,vel=0,last=0,settled=0;
  (function f(){
    vel+=(target-v)*.045;vel*=.86;v+=vel;
    if(v>100){v=100;vel*=-.45;S.needle()}
    if(v<0){v=0;vel*=-.45;S.needle()}
    const step=Math.floor(v/5);if(step!==last){last=step;S.needle()}
    set(v);num.textContent=Math.round(clamp(v,0,100));
    if(Math.abs(vel)<.02&&Math.abs(target-v)<.15){settled++}else settled=0;
    if(settled<10)requestAnimationFrame(f);else{set(target);num.textContent=target;stampIn($('.stamp-slot',g),150)}
  })();
}

/* =====================================================================
   I. CHAMPS CENSURÉS
   ===================================================================== */
function setupRedactions(){
  $('#champs').addEventListener('click',e=>{const b=e.target.closest('.redact');if(b)openRedact(b)});
  if(FINE)$('#champs').addEventListener('mouseover',e=>{const b=e.target.closest('.redact');if(b)openRedact(b)});
}
function openRedact(b){
  if(b.classList.contains('open'))return;
  b.classList.add('open');b.setAttribute('aria-expanded','true');b.setAttribute('aria-label',b.getAttribute('aria-label').replace(/censuré\. Afficher/,'inconnu (???)'));
  S.rustle(.18,.6);scramble($('.val',b),'???',700);setTimeout(()=>S.pen(.25),450);
}

/* =====================================================================
   II. CAMÉRA DE SURVEILLANCE
   ===================================================================== */
const cam={on:false,zoom:1,zt:1,chan:1,raf:0,nw:760,nh:1505};
const HEAD={x0:.434,x1:.67,y0:.233,y1:.372}; /* zone de cadrage sur l'image fournie */
function buildFishmap(){
  const sc=$('#screen');if(!sc)return;const W=sc.clientWidth,H=sc.clientHeight;if(!W||!H)return;
  const cw=128,ch=96,c=document.createElement('canvas');c.width=cw;c.height=ch;const x=c.getContext('2d'),id=x.createImageData(cw,ch);
  const k=.24,scale=W*.2;
  for(let j=0;j<ch;j++)for(let i=0;i<cw;i++){
    const nx=(i+.5)/cw*2-1,ny=(j+.5)/ch*2-1,r2=nx*nx*.75+ny*ny*.75,f=-k*(1-r2);
    const dx=nx*f*W/2,dy=ny*f*H/2,o=(j*cw+i)*4;
    id.data[o]=clamp(Math.round((.5+dx/scale)*255),0,255);id.data[o+1]=clamp(Math.round((.5+dy/scale)*255),0,255);id.data[o+2]=128;id.data[o+3]=255;
  }
  x.putImageData(id,0,0);
  const fe=$('#fishmap'),url=c.toDataURL();
  fe.setAttribute('href',url);fe.setAttributeNS('http://www.w3.org/1999/xlink','xlink:href',url);
  fe.setAttribute('width',W);fe.setAttribute('height',H);
  $('#fishdisp').setAttribute('scale',scale.toFixed(1));
}
function camStart(){
  A.cctvOn(true);
  if(cam.on)return;cam.on=true;buildFishmap();
  const im=$('#camimg');if(im.naturalWidth){cam.nw=im.naturalWidth;cam.nh=im.naturalHeight}else im.onload=()=>{cam.nw=im.naturalWidth;cam.nh=im.naturalHeight};
  cam.raf=requestAnimationFrame(camFrame);
}
function camStop(){cam.on=false;cancelAnimationFrame(cam.raf);A.cctvOn(false)}
const nc=$('#camnoise'),nx=nc.getContext('2d');nc.width=200;nc.height=150;
const nid=nx.createImageData(200,150);
function camFrame(ts){
  if(!cam.on)return;
  const sc=$('#screen'),W=sc.clientWidth,H=sc.clientHeight,tt=ts/1000;
  cam.zoom+=(cam.zt-cam.zoom)*(RM?1:.06);
  const iw=W*cam.zoom,s=iw/cam.nw,ih=cam.nh*s;
  const hx=(HEAD.x0+HEAD.x1)/2*cam.nw*s,hy=(HEAD.y0+HEAD.y1)/2*cam.nh*s;
  const drift=RM?0:Math.sin(tt*.13);
  const cy=hy+H*(.22+drift*.12),cx=hx+(RM?0:Math.sin(tt*.09)*W*.05);
  const oy=clamp(cy-H/2,0,Math.max(0,ih-H)),ox=clamp(cx-W/2,0,Math.max(0,iw-W));
  const im=$('#camimg');im.style.width=iw+'px';im.style.transform=`translate(${-ox.toFixed(1)}px,${-oy.toFixed(1)}px)`;
  const jt=RM?0:Math.sin(tt*7)*1.5;
  const tr=$('#track');const bx=HEAD.x0*cam.nw*s-ox-6+jt,by=HEAD.y0*cam.nh*s-oy-6-jt,bw=(HEAD.x1-HEAD.x0)*cam.nw*s+12,bh=(HEAD.y1-HEAD.y0)*cam.nh*s+12;
  tr.style.transform=`translate(${bx.toFixed(1)}px,${by.toFixed(1)}px)`;tr.style.width=bw.toFixed(1)+'px';tr.style.height=bh.toFixed(1)+'px';
  /* bruit vidéo + barre de défilement */
  const off=cam.chan!==1,d=nid.data,bar=((tt*36)%190)-20;
  for(let y=0;y<150;y++){const band=Math.abs(y-bar)<10?.22:0;for(let x=0;x<200;x++){const o=(y*200+x)*4,v=Math.random();
    if(off){const g=v*255;d[o]=d[o+1]=d[o+2]=g;d[o+3]=255}
    else{const a=v>.985?200:band?band*255*v:v*26;d[o]=200;d[o+1]=255;d[o+2]=210;d[o+3]=a}}}
  if(!off&&Math.random()<.04){const gy=Math.random()*150|0;for(let x=0;x<200;x++){const o=(gy*200+x)*4;d[o+3]=140}}
  nx.putImageData(nid,0,0);
  const now=new Date();$('#osdtime').textContent=`${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()}  ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  cam.raf=requestAnimationFrame(camFrame);
}
function setupCamera(){
  $$('.knob[data-cam]').forEach(k=>k.addEventListener('click',()=>{
    cam.chan=+k.dataset.cam;$$('.knob[data-cam]').forEach(x=>{const on=x===k;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)});
    $('#screen').classList.toggle('off',cam.chan!==1);$('#osdcam').textContent='CAM '+pad(cam.chan);
    S.knob();S.glitch();
  }));
  $('#zoombtn').addEventListener('click',e=>{
    const z=cam.zt===1;cam.zt=z?1.9:1;e.currentTarget.setAttribute('aria-pressed',z);$('#screen').classList.toggle('lock',z);
    $('#osdzoom').textContent='×'+cam.zt.toFixed(1);S.knob();S.whoosh(.3);
  });
}

/* =====================================================================
   III. TABLEAU DE LIÈGE : polaroïds + fil rouge
   ===================================================================== */
const Board=(()=>{
  const cork=$('#cork'),svg=$('#strings'),lsvg=$('#labels');let items=[],links=[],hot=null,raf=0;
  const narrow=()=>cork.clientWidth<560;
  function build(){
    const croc=imgFor('photoTableau',1);
    const psy=D.psycho||[];
    items=[
      {id:'croc',x:24,y:7,mx:27,my:5,rot:-4,html:`<div class="polaroid"><div class="ph"><img src="${esc(croc)}" alt="${esc(altFor(croc))}"></div><p>${esc(NOM)}</p></div>`,label:NOM},
      {id:'frere',x:75,y:5,mx:74,my:8,rot:3,html:`<div class="polaroid"><div class="ph unknown"><b>?</b></div><p>${esc(FRERE)}, frère</p></div>`,label:FRERE+', son frère (aucune photo)'},
      {id:'npc',x:26,y:56,mx:27,my:55,rot:2,html:`<div class="polaroid"><div class="ph crowd">${CROWD}</div><p>NPC</p></div>`,label:'NPC : la plupart des gens'},
      {id:'chaos',x:75,y:60,mx:73,my:62,rot:-3,html:`<div class="index-card"><h4>CHAOS</h4><p class="hand">« mauvais NPC »</p><p>Rapports : <b id="corkchaos">0</b></p></div>`,label:'Chaos'},
    ];
    links=[
      {a:'croc',b:'frere',t:psy[2]?'seule exception':'frère'},
      {a:'croc',b:'npc',t:'la plupart des gens'},
      {a:'npc',b:'chaos',t:'« mauvais NPC »'},
      {a:'croc',b:'chaos',t:'frontière très mince'},
    ].map(l=>({...l,v:0,vel:0,T:0}));
    items.forEach(it=>{
      const el=document.createElement('div');el.className='pin-item';el.tabIndex=0;el.dataset.id=it.id;
      el.setAttribute('role','button');el.setAttribute('aria-label',it.label+' : tendre les fils');
      el.style.setProperty('--rot',it.rot+'deg');el.innerHTML=it.html;it.el=el;cork.appendChild(el);
      drag(it);
      el.addEventListener('mouseenter',()=>setHot(it.id));el.addEventListener('mouseleave',()=>setHot(null));
      el.addEventListener('focus',()=>setHot(it.id));el.addEventListener('blur',()=>setHot(null));
      el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setHot(null);setHot(it.id)}});
    });
    place();
  }
  function place(){const n=narrow();items.forEach(it=>{const x=it.ux??(n?it.mx:it.x),y=it.uy??(n?it.my:it.y);it.el.style.left=x+'%';it.el.style.top=y+'%'})}
  function pinPos(it){const c=cork.getBoundingClientRect(),r=it.el.getBoundingClientRect();return {x:r.left+r.width/2-c.left,y:r.top-c.top+4}}
  function draw(){
    let h='',hl='';const c=cork.getBoundingClientRect(),n=narrow();
    const rects=items.map(i=>{const r=i.el.getBoundingClientRect();return {x0:r.left-c.left-6,y0:r.top-c.top-6,x1:r.right-c.left+6,y1:r.bottom-c.top+6}});
    const free=(x,y)=>!rects.some(r=>x>r.x0&&x<r.x1&&y>r.y0&&y<r.y1);
    links.forEach(l=>{
      const A=pinPos(items.find(i=>i.id===l.a)),B=pinPos(items.find(i=>i.id===l.b));
      const dist=Math.hypot(B.x-A.x,B.y-A.y),sag=dist*.16*(1-l.v*.95);
      const mx=(A.x+B.x)/2,my=(A.y+B.y)/2+sag;
      const at=t=>({x:(1-t)*(1-t)*A.x+2*(1-t)*t*mx+t*t*B.x,y:(1-t)*(1-t)*A.y+2*(1-t)*t*my+t*t*B.y});
      let L=at(.5);for(const t of [.5,.42,.58,.34,.66,.26,.74,.18,.82]){const q=at(t);if(free(q.x,q.y)){L=q;break}}
      const isHot=hot&&(l.a===hot||l.b===hot);
      const cls=hot?(isHot?'hot':'dim'):'';
      const w=l.t.length*(n?6.2:7)+14;
      const showLbl=!n||isHot;
      const lx=clamp(L.x,w/2+2,c.width-w/2-2);
      h+=`<path class="${cls}" d="M${A.x.toFixed(1)} ${A.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${B.x.toFixed(1)} ${B.y.toFixed(1)}"/>`;
      if(showLbl)hl+=`<g class="${cls==='dim'?'dim':''}" transform="translate(${lx.toFixed(1)} ${L.y.toFixed(1)})"><rect x="${-w/2}" y="-12" width="${w}" height="22" rx="2"/><text text-anchor="middle" y="4">${esc(l.t)}</text></g>`;
    });
    svg.innerHTML=h;lsvg.innerHTML=hl;
  }
  function tick(){
    let moving=false;
    links.forEach(l=>{l.vel+=(l.T-l.v)*.16;l.vel*=.8;l.v+=l.vel;if(Math.abs(l.vel)>.002||Math.abs(l.T-l.v)>.002)moving=true});
    draw();raf=moving?requestAnimationFrame(tick):0;
  }
  function kick(){if(RM){links.forEach(l=>l.v=l.T);draw();return}if(!raf)raf=requestAnimationFrame(tick)}
  function setHot(id){
    if(hot===id)return;hot=id;
    links.forEach((l,i)=>{const on=!!id&&(l.a===id||l.b===id);if(on&&l.T!==1){setTimeout(()=>S.pluck(98+i*24),i*45)}l.T=on?1:0});
    kick();
  }
  function drag(it){
    let sx,sy,ox,oy,moved=false,active=false;
    it.el.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;active=true;moved=false;sx=e.clientX;sy=e.clientY;
      const c=cork.getBoundingClientRect();ox=parseFloat(it.el.style.left)/100*c.width;oy=parseFloat(it.el.style.top)/100*c.height;
      it.el.setPointerCapture(e.pointerId);
    });
    it.el.addEventListener('pointermove',e=>{
      if(!active)return;const dx=e.clientX-sx,dy=e.clientY-sy;
      if(!moved&&Math.hypot(dx,dy)<5)return;
      if(!moved){moved=true;it.el.classList.add('drag');S.rustle(.15,.5)}
      const c=cork.getBoundingClientRect();
      it.ux=clamp((ox+dx)/c.width*100,10,90);it.uy=clamp((oy+dy)/c.height*100,2,74);
      it.el.style.left=it.ux+'%';it.el.style.top=it.uy+'%';draw();
    });
    const end=()=>{if(!active)return;active=false;if(moved){it.el.classList.remove('drag');S.tap();S.pluck(130);kick()}else{setHot(null);setHot(it.id)}};
    it.el.addEventListener('pointerup',end);it.el.addEventListener('pointercancel',end);
  }
  return {build,layout(){place();draw()},setChaos(n){const b=$('#corkchaos');if(b)b.textContent=n}};
})();

/* =====================================================================
   IV. FICHE DE TRI
   ===================================================================== */
let chaos=0;
function setupSort(){
  const sort=$('#sort'),list=$('#replist'),note=$('#trinote');
  const psyF=(D.psycho||[]).find(p=>p.includes(FRERE))||`${FRERE} : la seule exception.`;
  sort.addEventListener('click',e=>{
    const b=e.target.closest('.subj');if(!b)return;
    if(b.classList.contains('frere')){
      S.chime();flash('#cfe8d4',.18,600);note.textContent=psyF;
      if(!RM)b.animate([{transform:'rotate(0) scale(1.08)'},{transform:'rotate(var(--rot))'}],{duration:600,easing:'cubic-bezier(.3,1.6,.5,1)'});
      return;
    }
    const n=pad(+b.dataset.i+1),v=$('.verdict',b);
    if(b.classList.contains('mauvais')){b.classList.remove('mauvais');v.textContent='';b.setAttribute('aria-label',`NPC n° ${n} : non classé`);S.rustle(.2,.6);note.textContent='';return}
    if(b.classList.contains('bon')){
      b.classList.remove('bon');b.classList.add('mauvais');v.textContent='MAUVAIS NPC';b.setAttribute('aria-label',`NPC n° ${n} : classé mauvais NPC`);
      S.stamp(1);S.glitch();flash('#a8151c',.16,300);shake($('#tri'),7,320);
      chaos++;$('#chaoscount').textContent=chaos;Board.setChaos(chaos);
      const em=list.querySelector('.empty');if(em)em.remove();
      const r=document.createElement('article');r.className='report';
      r.innerHTML=`<h4>CHAOS N° ${pad(chaos,3)}</h4>
        <p><span class="k">Sujet observé :</span> NPC n° ${n}</p>
        <p><span class="k">Classement par ${esc(NOM)} :</span> « mauvais NPC »</p>
        <p><span class="k">Conséquence :</span> Chaos.</p>`;
      list.prepend(r);
      if(!RM)r.animate([{transform:'translateY(-100%)',clipPath:'inset(100% 0 0 0)'},{transform:'none',clipPath:'inset(0 0 0 0)'}],{duration:700,easing:'steps(14)'});
      for(let i=0;i<14;i++)setTimeout(()=>S.telex(),i*50);
      while(list.children.length>6)list.lastElementChild.remove();
      note.textContent='La frontière entre bon et mauvais NPC est très mince.';
      return;
    }
    b.classList.add('bon');v.textContent='BON NPC';b.setAttribute('aria-label',`NPC n° ${n} : classé bon NPC`);S.pen(.18);S.tap();note.textContent='';
  });
  if(FINE)sort.addEventListener('mouseover',e=>{const b=e.target.closest('.subj');if(b&&b!==sort._last){sort._last=b;S.hover()}});
}

/* =====================================================================
   VI. PROTOCOLE : Lien Infortuné + pièce à conviction
   ===================================================================== */
function setupProtocol(){
  const L=(D.competences||[])[0];if(!L)return;
  let lv=L.niveaux[0].lv,busy=false,ene=100,nCat=0;
  const tape=$('#tape'),count=$('#count'),con=$('#console'),btn=$('#activate');
  const lvTabs=$$('.lvtabs [role=tab]');
  const setLv=(n,snd=true)=>{
    lv=n;const d=L.niveaux.find(x=>x.lv===n);
    lvTabs.forEach(t=>{const on=+t.dataset.lv===n;t.setAttribute('aria-selected',on);t.tabIndex=on?0:-1});
    $('#lvpanel').setAttribute('aria-labelledby','lvt'+n);
    $('#lc').textContent=d.cout+' ENE';$('#lp').textContent=d.preavis+' s';$('#lr').textContent=d.requis;
    const s=$('#ls');s.hidden=!d.special;s.textContent=d.special?'Spécial : '+d.special:'';
    $('#dice').classList.toggle('dim',!d.special);
    if(snd){S.rustle(.15,.5);S.tap()}
  };
  $('.lvtabs').addEventListener('click',e=>{const t=e.target.closest('[role=tab]');if(t&&!busy)setLv(+t.dataset.lv)});
  $('.lvtabs').addEventListener('keydown',e=>{
    const i=lvTabs.findIndex(t=>t.getAttribute('aria-selected')==='true');let j=null;
    if(e.key==='ArrowRight')j=(i+1)%lvTabs.length;if(e.key==='ArrowLeft')j=(i-1+lvTabs.length)%lvTabs.length;
    if(j!==null&&!busy){e.preventDefault();setLv(+lvTabs[j].dataset.lv);lvTabs[j].focus()}
  });
  setLv(lv,false);
  const setEne=v=>{ene=clamp(Math.round(v),0,100);$('#enebar').style.width=ene+'%';$('#enev').textContent=ene};
  const out=(t,cls)=>{const d=document.createElement('div');if(cls)d.className=cls;d.textContent=t;tape.appendChild(d);tape.scrollTop=tape.scrollHeight;return d};
  const tally=n=>{const g=Math.floor(n/5),r=n%5;return (Array.from({length:g},()=>'<s>||||</s>').join(' ')+' '+'|'.repeat(r)).trim()||'—'};
  btn.addEventListener('click',async()=>{
    if(busy)return;const d=L.niveaux.find(x=>x.lv===lv);
    btn.classList.add('down');setTimeout(()=>btn.classList.remove('down'),120);S.knob();
    if(ene<d.cout){
      out(`[SYSTÈME] Énergie insuffisante : ${d.cout} ENE requis.`,'r');S.beep(false);busy=true;btn.disabled=true;
      await sleep(700);out('[SYSTÈME] Recharge de l\'énergie…');
      const from=ene;for(let i=1;i<=20;i++){setEne(from+(100-from)*i/20);S.needle();await sleep(RM?0:45)}
      out('[SYSTÈME] Énergie rétablie.');S.beep(true);busy=false;btn.disabled=false;return;
    }
    busy=true;btn.disabled=true;tape.innerHTML='';setEne(ene-d.cout);
    await typeLine(tape,`[SYSTÈME] ${L.nom} LV.${lv} : activation (−${d.cout} ENE).`,{speed:14,kind:'telex'});
    await typeLine(tape,'[SYSTÈME] Lien inséparable établi avec la cible.',{speed:14,kind:'telex'});
    await typeLine(tape,"[SYSTÈME] Transfert de la chance de l'utilisateur…",{speed:14,kind:'telex'});
    await typeLine(tape,'[SYSTÈME] Malheur accumulé. Événement catastrophique imminent.',{speed:14,kind:'telex'});
    con.classList.add('alert');$('#beacon').classList.add('on');count.classList.add('live');
    const stop=A.siren();
    out("[SYSTÈME] L'utilisateur est compté parmi les victimes.",'r');
    for(let s=d.preavis;s>0;s--){count.textContent='T-'+pad(s);S.beep(s<=3);if(s<=3)flash('#ff2020',.08,200);await sleep(1000)}
    count.textContent='T-00';stop();
    let roll=null;
    if(d.special){
      const des=L.des||100,dv=$('#dieval');out('[SYSTÈME] Lancer du dé…');S.dice();
      for(let i=0;i<14;i++){dv.textContent=1+Math.floor(Math.random()*des);await sleep(RM?0:40+i*8)}
      roll=1+Math.floor(Math.random()*des);dv.textContent=roll;S.tap();
      out(`[SYSTÈME] Résultat du dé : ${roll}.`+(roll<20?' Seule la cible est incluse.':''),roll<20?'':'r');
      await sleep(500);
    }
    con.classList.remove('alert');$('#beacon').classList.remove('on');count.classList.remove('live');
    const ev=pick(D.catastrophes&&D.catastrophes.length?D.catastrophes:['Événement catastrophique']);
    await catastrophe(ev);
    nCat++;$('#tally').innerHTML=tally(nCat);
    const onlyTarget=roll!==null&&roll<20;
    out(`[SYSTÈME] ${ev}.`,'r');
    report({ev,lv,d,roll,onlyTarget,n:nCat});
    busy=false;btn.disabled=false;
  });
  async function catastrophe(ev){
    const al=$('#alert');$('#alev').textContent=ev;al.hidden=false;al.classList.add('glitch');
    S.boom();S.glitch();flash('#ff1a1a',.7,500);shake(folder,22,800);shake(al,14,600);
    if(!RM)document.body.animate([{filter:'invert(1) hue-rotate(170deg)'},{filter:'none'}],{duration:220,easing:'steps(3)'});
    await sleep(RM?1200:1700);
    al.classList.remove('glitch');
    await new Promise(r=>{if(RM){r();return}al.animate([{opacity:1},{opacity:0}],{duration:500}).onfinish=r});
    al.hidden=true;
  }
  function report(o){
    const box=$('#incident');
    const vict=o.onlyTarget?'La cible uniquement (dé inférieur à 20).':`La cible ; l'utilisateur, ${NOM}.`;
    box.innerHTML=`<div class="incident">
      <h4>RAPPORT D'INCIDENT · SIMULATION N° ${pad(o.n,3)}</h4>
      <dl>
        <dt>Compétence</dt><dd>[${esc(L.nom)}] LV.${o.lv}</dd>
        <dt>Coût</dt><dd>${o.d.cout} ENE</dd>
        <dt>Préavis</dt><dd>${o.d.preavis} s</dd>
        ${o.roll!==null?`<dt>Dé du Système</dt><dd>${o.roll}</dd>`:''}
        <dt>Événement</dt><dd>${esc(o.ev)}</dd>
        <dt>Victimes</dt><dd>${esc(vict)}</dd>
        <dt>Dégâts collatéraux</dt><dd>Possibles, parfois plus grands que prévu.</dd>
      </dl>
      <div class="stamp-slot" data-stamp="Catastrophe" data-tone="red" style="--r:-8deg"></div>
    </div>`;
    const inc=$('.incident',box);
    if(!RM)inc.animate([{transform:'translateY(30px) rotate(1.5deg)',opacity:0},{transform:'none',opacity:1}],{duration:500,easing:'cubic-bezier(.2,.8,.3,1)'});
    S.rustle(.4);S.slide();
    stampIn($('.stamp-slot',inc),550);
  }
  /* marteau */
  const strike=$('#strike'),hm=$('#hammer');
  if(strike&&hm)strike.addEventListener('click',()=>{
    S.whoosh(.35);
    if(!RM){hm.classList.remove('swing');void hm.getBoundingClientRect();hm.classList.add('swing')}
    setTimeout(()=>{
      S.slam(1);shake(folder,14,420);flash('#fff',.2,180);
      const sh=$('#protocole'),sr=sh.getBoundingClientRect(),hr=hm.getBoundingClientRect();
      crack(sh,hr.left+hr.width*.74-sr.left,hr.top+hr.height*.34-sr.top);
    },RM?0:390);
  });
}
function crack(host,x,y){
  const c=document.createElementNS('http://www.w3.org/2000/svg','svg');c.setAttribute('class','crack');c.setAttribute('viewBox','0 0 220 220');c.setAttribute('aria-hidden','true');
  let p='';for(let i=0;i<9;i++){let a=i/9*Math.PI*2+rnd(-.2,.2),px=110,py=110,d=`M110 110`;const n=3+(Math.random()*3|0);
    for(let k=0;k<n;k++){const len=rnd(12,30);a+=rnd(-.5,.5);px+=Math.cos(a)*len;py+=Math.sin(a)*len;d+=` L${px.toFixed(1)} ${py.toFixed(1)}`}
    p+=`<path d="${d}" stroke-width="${rnd(.8,2.2).toFixed(1)}"/>`}
  c.innerHTML=p;c.style.left=x+'px';c.style.top=y+'px';host.appendChild(c);
  c.animate([{opacity:0,transform:'scale(.4)'},{opacity:.9,transform:'scale(1)',offset:.08},{opacity:.9,offset:.7},{opacity:0}],{duration:RM?1200:2600,easing:'ease-out'}).onfinish=()=>c.remove();
}

/* =====================================================================
   VII. TITRE
   ===================================================================== */
function setupTitle(){
  document.addEventListener('click',e=>{
    const t=e.target.closest('#tname');if(!t)return;
    if(!RM){t.classList.remove('flex');void t.offsetWidth;t.classList.add('flex')}
    S.clank(1);setTimeout(()=>S.clank(.9),140);setTimeout(()=>S.clank(.8),300);setTimeout(()=>S.stamp(.5),360);
    shake(folder,9,380);
  });
}

/* =====================================================================
   VIII. PIÈCES À CONVICTION + loupe
   ===================================================================== */
function setupGallery(){
  const lb=$('#lb'),img=$('#lbimg'),stage=$('#lbstage'),loupe=$('#loupe'),lt=$('#lbloupe');
  let idx=0,lastFocus=null,useLoupe=true;const Z=2.6;
  const open=i=>{
    idx=(i+GAL.length)%GAL.length;const g=GAL[idx];
    img.src=g.src;img.alt=g.alt;$('#lbn').textContent='PIÈCE N° '+pad(idx+1);$('#lbalt').textContent=g.alt;
    loupe.style.backgroundImage=`url("${g.src}")`;loupe.classList.remove('on');
  };
  $('#gal').addEventListener('click',e=>{const b=e.target.closest('.bag');if(!b)return;lastFocus=b;open(+b.dataset.i);lb.hidden=false;document.body.classList.add('locked');
    S.rustle(.35);setTimeout(()=>{S.shutter();flash('#fff',.6,320)},180);$('#lbx').focus()});
  if(FINE)$('#gal').addEventListener('mouseover',e=>{const b=e.target.closest('.bag');if(b&&b!==$('#gal')._l){$('#gal')._l=b;S.rustle(.12,.4)}});
  const close=()=>{lb.hidden=true;document.body.classList.remove('locked');S.rustle(.25,.6);if(lastFocus)lastFocus.focus()};
  $('#lbx').onclick=close;
  $('#lbprev').onclick=()=>{open(idx-1);S.shutter();flash('#fff',.3,200)};
  $('#lbnext').onclick=()=>{open(idx+1);S.shutter();flash('#fff',.3,200)};
  lt.onclick=()=>{useLoupe=!useLoupe;lt.setAttribute('aria-pressed',useLoupe);lt.textContent='Loupe : '+(useLoupe?'active':'inactive');stage.classList.toggle('noloupe',!useLoupe);loupe.classList.remove('on');S.tap()};
  lb.addEventListener('click',e=>{if(e.target===lb)close()});
  addEventListener('keydown',e=>{
    if(lb.hidden)return;
    if(e.key==='Escape')close();
    if(e.key==='ArrowRight')$('#lbnext').click();
    if(e.key==='ArrowLeft')$('#lbprev').click();
    if(e.key==='Tab'){const f=$$('#lb button');const i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}}
  });
  const move=e=>{
    if(!useLoupe)return;const ir=img.getBoundingClientRect(),sr=stage.getBoundingClientRect();
    const x=e.clientX-ir.left,y=e.clientY-ir.top;
    if(x<0||y<0||x>ir.width||y>ir.height){loupe.classList.remove('on');return}
    const lw=loupe.offsetWidth;loupe.classList.add('on');
    loupe.style.left=(e.clientX-sr.left)+'px';loupe.style.top=(e.clientY-sr.top)+'px';
    loupe.style.backgroundSize=`${ir.width*Z}px ${ir.height*Z}px`;
    loupe.style.backgroundPosition=`${-(x*Z-lw/2+7)}px ${-(y*Z-lw/2+7)}px`;
  };
  stage.addEventListener('pointermove',move);stage.addEventListener('pointerdown',move);
  stage.addEventListener('pointerleave',()=>loupe.classList.remove('on'));
}

/* =====================================================================
   AMBIANCE : lampe, néon, grain, pluie, horloge
   ===================================================================== */
function setupAmbience(){
  const root=document.documentElement;
  let tx=innerWidth*.5,ty=innerHeight*.35,x=tx,y=ty;
  if(FINE){
    addEventListener('mousemove',e=>{tx=e.clientX;ty=e.clientY},{passive:true});
    (function f(){x+=(tx-x)*(RM?1:.12);y+=(ty-y)*(RM?1:.12);root.style.setProperty('--lx',x.toFixed(0)+'px');root.style.setProperty('--ly',y.toFixed(0)+'px');requestAnimationFrame(f)})();
  }
  /* néon qui flanche */
  (function nf(){setTimeout(()=>{
    if(opened){S.buzz(rnd(.25,.6));if(!RM){const d=$('#lampDark');let k=0;const seq=[1,0,1,0,0,1,0];(function s(){d.classList.toggle('flick',!!seq[k]);if(++k<seq.length)setTimeout(s,rnd(40,110));else d.classList.remove('flick')})()}}
    nf();},rnd(14000,36000))})();
  /* grain : une tuile de bruit déplacée au hasard à chaque image */
  const g=$('#grain'),gc=document.createElement('canvas');gc.width=gc.height=256;const gx=gc.getContext('2d'),id=gx.createImageData(256,256);
  for(let i=0;i<id.data.length;i+=4){const v=Math.random()*255;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=255}
  gx.putImageData(id,0,0);g.style.backgroundImage=`url(${gc.toDataURL()})`;
  if(!RM)setInterval(()=>{if(!document.hidden)g.style.backgroundPosition=`${rnd(0,256)|0}px ${rnd(0,256)|0}px`},80);
  /* ombres de pluie sur le bureau */
  const rc=$('#rain'),rx=rc.getContext('2d');let drops=[];
  const size=()=>{rc.width=Math.max(1,rc.clientWidth/2|0);rc.height=Math.max(1,rc.clientHeight/2|0);drops=Array.from({length:70},()=>({x:Math.random()*rc.width,y:Math.random()*rc.height,r:rnd(1,3.2),v:rnd(.05,.6),s:Math.random()<.3}))};
  size();addEventListener('resize',size);
  const rain=()=>{
    rx.clearRect(0,0,rc.width,rc.height);
    drops.forEach(d=>{
      if(!RM){if(d.s||Math.random()<.02){d.y+=d.v*2.4;d.x+=rnd(-.3,.3)}if(d.y>rc.height+5){d.y=-5;d.x=Math.random()*rc.width}}
      rx.fillStyle='rgba(0,0,0,.45)';rx.beginPath();rx.ellipse(d.x,d.y,d.r,d.r*1.25,0,0,7);rx.fill();
      rx.fillStyle='rgba(190,215,255,.35)';rx.beginPath();rx.arc(d.x-d.r*.3,d.y-d.r*.4,d.r*.45,0,7);rx.fill();
      if(d.s){rx.strokeStyle='rgba(0,0,0,.15)';rx.lineWidth=d.r*.9;rx.beginPath();rx.moveTo(d.x,d.y-d.r);rx.lineTo(d.x,d.y-d.r-14);rx.stroke()}
    });
  };
  rain();if(!RM)setInterval(()=>{if(!document.hidden)rain()},50);
  /* horloge */
  const ck=$('#clock');const t=()=>{const n=new Date();ck.textContent=`${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`};t();setInterval(t,1000);
}

/* =====================================================================
   SON, INTERCALAIRES, OUVERTURE DU DOSSIER
   ===================================================================== */
function syncSnd(){const b=$('#snd');b.textContent='Son : '+(A.on?'activé':'coupé');b.setAttribute('aria-pressed',A.on)}
function setupNav(){
  $('#snd').addEventListener('click',()=>{if(!A.init()){$('#snd').textContent='Son indisponible';return}A.setOn(!A.on);syncSnd();if(A.on){S.tap();if(current&&current.id==='camera')A.cctvOn(true)}});
  $('#tabs').addEventListener('click',e=>{const t=e.target.closest('[role=tab]');if(t){S.tap();show(t.getAttribute('aria-controls'))}});
  $('#tabs').addEventListener('keydown',e=>{
    const i=tabs.indexOf(document.activeElement);if(i<0)return;let j=null;
    if(e.key==='ArrowRight')j=(i+1)%tabs.length;if(e.key==='ArrowLeft')j=(i-1+tabs.length)%tabs.length;
    if(e.key==='Home')j=0;if(e.key==='End')j=tabs.length-1;
    if(j!==null){e.preventDefault();tabs[j].focus();tabs[j].scrollIntoView({block:'nearest',inline:'nearest'});show(tabs[j].getAttribute('aria-controls'))}
  });
  if(FINE)$('#tabs').addEventListener('mouseover',e=>{const t=e.target.closest('[role=tab]');if(t&&t!==$('#tabs')._l){$('#tabs')._l=t;S.hover()}});
  document.addEventListener('click',e=>{const b=e.target.closest('.next');if(!b)return;S.tap();show(b.dataset.go,{focus:true});const t=tabs.find(x=>x.getAttribute('aria-controls')===b.dataset.go);t&&t.scrollIntoView({block:'nearest',inline:'nearest'})});
  addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(opened&&document.getElementById(id)?.classList.contains('sheet'))show(id)});
  addEventListener('resize',()=>{if(current&&current.id==='profil')Board.layout();if(cam.on)buildFishmap()});
}
async function openDossier(withSound){
  if(opened)return;opened=true;
  if(!location.hash||location.hash==='#fiche')scrollTo(0,0);
  A.init();A.setOn(withSound);syncSnd();
  S.rustle(.7);S.slide();
  const cv=$('#cover'),cf=$('#coverFolder');
  if(!RM){
    cv.animate([{background:'rgba(10,6,4,.35)'},{background:'rgba(10,6,4,0)'}],{duration:1100,fill:'forwards'});
    await new Promise(r=>{cf.animate([
      {transform:'rotateY(0) translateZ(0)',opacity:1},
      {transform:'rotateY(-35deg) translateZ(40px)',opacity:1,offset:.25},
      {transform:'rotateY(-120deg) translateZ(80px)',opacity:.9,offset:.7},
      {transform:'rotateY(-165deg) translateX(-20%)',opacity:0}],{duration:1150,easing:'cubic-bezier(.55,0,.35,1)',fill:'forwards'}).onfinish=r;
      setTimeout(()=>S.rustle(.4,.7),500);});
  }
  cv.classList.add('gone');cv.setAttribute('aria-hidden','true');
  folder.inert=false;folder.removeAttribute('inert');document.body.classList.remove('locked');
  const t=tabs.find(x=>x.getAttribute('aria-selected')==='true');if(t)t.focus({preventScroll:true});
  enter(current.id);
}

/* =====================================================================
   DÉMARRAGE
   ===================================================================== */
render();
document.body.classList.add('locked');
Board.build();
setupRedactions();setupCamera();setupSort();setupProtocol();setupTitle();setupGallery();setupAmbience();setupNav();
const start=location.hash.slice(1);
show(document.getElementById(start)?.classList.contains('sheet')?start:'fiche',{sound:false});
$('#goSound').addEventListener('click',()=>openDossier(true));
$('#goSilent').addEventListener('click',()=>openDossier(false));
$('#goSound').focus({preventScroll:true});
/* test automatique : ?ouvert ouvre le dossier sans son */
if(/[?&]ouvert\b/.test(location.search))openDossier(false);
if(/[?&]debug\b/.test(location.search))window.CROC_DEBUG={A,S};
})();
