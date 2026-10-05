/* Inhalte laden: Texte und Daten liegen als JSON in content/ (Version aus version.json für Cache-Busting) */
const CONTENT_FILES=["media","stages","missions","quiz","prompts","practice","builds","terms","big","challenges","game"];
async function loadContent(){
  let v="dev",info=null;
  try{const r=await fetch("version.json",{cache:"no-store"});if(r.ok){const j=await r.json();if(j&&j.version){v=String(j.version);info={version:v,date:j.date||"",notes:Array.isArray(j.notes)?j.notes:[]}}}}catch(e){}
  const parts=await Promise.all(CONTENT_FILES.map(async name=>{
    const r=await fetch(`content/${name}.json?v=${encodeURIComponent(v)}`);
    if(!r.ok)throw new Error("content/"+name+".json: HTTP "+r.status);
    return r.json();
  }));
  const content=Object.fromEntries(CONTENT_FILES.map((name,i)=>[name,parts[i]]));
  content.version=info;
  return content;
}
function showLoadError(err){
  console.error(err);
  const box=document.createElement("div");
  box.setAttribute("role","alert");
  box.style.cssText="max-width:520px;margin:20vh auto 0;padding:24px;border-radius:16px;background:#fff;color:#1b1b1f;font:500 1.1rem/1.5 system-ui,sans-serif;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.2)";
  box.textContent="Inhalte konnten nicht geladen werden. Bitte Seite neu laden.";
  document.body.appendChild(box);
}
(async function(){
let C;
try{C=await loadContent()}catch(err){showLoadError(err);return}
/* ===== Medien (lvl = Stufe 1 bis 6) ===== */
const MEDIA=C.media;

/* ===== Lernpfad: tasks zählen, deep ist freiwillig, checks = Selbstcheck ===== */
const STAGES=C.stages;

const TREPPE=C.prompts.treppe;
const FIXES=C.prompts.fixes;

const PRACTICE=C.practice;

const BUILDS=C.builds;

/* [Stufe, Begriff, Erklärung, Beispiel] */
const TERMS=C.terms;

const CHAIN=C.big.chain;
const QUESTIONS=C.big.questions;

const MISSIONS=C.missions;
STAGES.forEach((s,i)=>{s.mission=MISSIONS[i]});
/* ===== Spiel: Quiz pro Stufe, Abzeichen, Tages-Challenges, Level ===== */
const QUIZ=C.quiz;
const BADGES=[
 {id:"st0",n:"Starter",l:"1",c:"--l1",t:()=>stageDone(STAGES[0])},
 {id:"st1",n:"Durchblick",l:"2",c:"--l2",t:()=>stageDone(STAGES[1])},
 {id:"st2",n:"Prompt-Profi",l:"3",c:"--l3",t:()=>stageDone(STAGES[2])},
 {id:"st3",n:"Mitredner",l:"4",c:"--l4",t:()=>stageDone(STAGES[3])},
 {id:"st4",n:"App-Bauer",l:"5",c:"--l5",t:()=>stageDone(STAGES[4])},
 {id:"st5",n:"Veröffentlicht",l:"6",c:"--l6",t:()=>stageDone(STAGES[5])},
 {id:"cur",n:"Neugierig",l:"N",c:"--on-primary-container",t:()=>Object.keys(done).some(k=>/^d\d/.test(k)&&done[k])},
 {id:"day",n:"Tagessieger",l:"T",c:"--on-tertiary-container",t:()=>Object.keys(done).some(k=>k.startsWith("_ch")&&done[k])},
 {id:"str",n:"3 Tage am Stück",l:"3",c:"--l3",t:()=>(done._streak||0)>=3},
 {id:"quiz",n:"Quiz-Ass",l:"Q",c:"--on-success-container",t:()=>Object.keys(QUIZ).every(k=>done[k])}
];
const CHALLENGES=C.challenges;
const BICON={st0:"rocket_launch",st1:"lightbulb",st2:"forum",st3:"record_voice_over",st4:"construction",st5:"public",cur:"explore",day:"bolt",str:"local_fire_department",quiz:"emoji_events"};
const BCC={st0:"--c1",st1:"--c2",st2:"--c3",st3:"--c4",st4:"--c5",st5:"--c6",cur:"--primary-container",day:"--tertiary-container",str:"--c3",quiz:"--success-container"};
const LEVELS=C.game.levels;
const XPV=C.game.xpv;
const dstr=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const today=()=>dstr(new Date());

/* ===== Speicher: localStorage, Rückfall sessionStorage ===== */
const ST={get(k){for(const t of ["localStorage","sessionStorage"]){try{const v=window[t].getItem(k);if(v!=null)return JSON.parse(v)}catch(e){}}return null},set(k,v){const j=JSON.stringify(v);for(const t of ["localStorage","sessionStorage"]){try{window[t].setItem(k,j)}catch(e){}}},del(k){for(const t of ["localStorage","sessionStorage"]){try{window[t].removeItem(k)}catch(e){}}}};
const PKEY="ki-lernpfad-profile-v2",LEGACY="ki-lernpfad-alfredo-v1",progKey=id=>"ki-lernpfad-p-"+id;
let reg=ST.get(PKEY)||{profiles:{},active:null};if(!reg.profiles)reg={profiles:{},active:null};
let DEMO=false;
let done={};
function saveReg(){ST.set(PKEY,reg)}

/* ===== Helfer ===== */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const lc=n=>`--lc:var(--l${n});--lcc:var(--c${n})`;
const dots=n=>`<span class="lvl" style="${lc(n)}">${[1,2,3,4,5,6].map(i=>`<i class="${i<=n?"f":""}"></i>`).join("")} Stufe ${n}</span>`;
const items=s=>[...s.tasks,...(s.mission?[s.mission]:[]),...s.checks];
const stageDone=s=>items(s).every(i=>done[i.id]);
const REC=new Set(STAGES.flatMap(s=>s.tasks.map(t=>t.go)));
const VIEWS=["lernpfad","prompten","bauen","wissen","medien"];

function show(view,push=true){
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="v-"+view));
  document.querySelectorAll("#tabs button").forEach(b=>{const on=b.dataset.v===view;b.classList.toggle("on",on);b.setAttribute("aria-current",on?"page":"false")});
  if(push){try{history.replaceState(null,"","#"+view)}catch(e){}}
  window.scrollTo({top:0});
}
function flash(id){
  const el=document.getElementById(id);if(!el)return;
  setTimeout(()=>{if(el.tagName==="DETAILS")el.open=true;el.querySelectorAll("details").forEach(d=>d.open=true);el.scrollIntoView({behavior:"smooth",block:"center"});el.classList.remove("flash");void el.offsetWidth;el.classList.add("flash")},60);
}
document.querySelectorAll("#tabs button").forEach(b=>b.onclick=()=>show(b.dataset.v));

function setWissen(w){document.querySelectorAll("#wTabs .chip").forEach(c=>c.classList.toggle("on",c.dataset.w===w));$("#w-terms").hidden=w!=="terms";$("#w-big").hidden=w!=="big"}
document.querySelectorAll("#wTabs .chip").forEach(c=>c.onclick=()=>setWissen(c.dataset.w));

/* Sprungziele */
function go(t){
  if(t==="mindset"){show("lernpfad");flash("mindset");return}
  if(t.startsWith("terms:")){termLvl=+t.split(":")[1];$("#termSearch").value="";renderTerms();setWissen("terms");show("wissen");return}
  if(t==="big"){setWissen("big");show("wissen");return}
  if(t==="ablauf"||t==="werkzeuge"||t==="erste"||t==="hilfe"){show("bauen");flash("a-"+t);return}
  if(VIEWS.includes(t)){show(t);return}
  if(PRACTICE.some(p=>p.id===t)){show("prompten");flash("x-"+t);return}
  if(BUILDS.some(b=>b.id===t)){show("bauen");flash("x-"+t);return}
  mediaFilter="Alle";renderMedia();show("medien");flash("m-"+t);
}

let tt;function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(tt);tt=setTimeout(()=>t.classList.remove("show"),4500)}

/* ===== Fortschritt ===== */
function nextStep(){for(const[i,s]of STAGES.entries()){const t=s.tasks.find(x=>!done[x.id]);if(t)return{i,item:t,kind:"task"};const c=s.checks.find(x=>!done[x.id]);if(c)return{i,item:c,kind:"check"}}return null}
const MSG=C.game.msg;
function xpTotal(){let n=0;STAGES.forEach(s=>{s.tasks.forEach(t=>{if(done[t.id])n+=XPV.task});s.deep.forEach(t=>{if(done[t.id])n+=XPV.deep});s.checks.forEach(t=>{if(done[t.id])n+=XPV.check});if(s.mission&&done[s.mission.id])n+=XPV.mission});Object.keys(done).forEach(k=>{if(k.startsWith("_ch")&&done[k])n+=XPV.ch});return n}
function earned(){return BADGES.filter(b=>b.t()).map(b=>b.id)}
function streakNow(){if(!done._last)return 0;const y=new Date();y.setDate(y.getDate()-1);return(done._last===today()||done._last===dstr(y))?(done._streak||0):0}
const mins=d=>{const m=/^(\d+)\s*Min$/.exec(d||"");return m?+m[1]:null};
function renderPlan(){
  const budget=done._budget||15;
  $("#budget").innerHTML=[5,15,30,60].map(m=>`<button class="chip${m===budget?" on":""}" data-m="${m}">${m} Min</button>`).join("");
  document.querySelectorAll("#budget .chip").forEach(b=>b.onclick=()=>{done._budget=+b.dataset.m;save();renderPlan()});
  const open=[];STAGES.forEach((s,i)=>{if(DEMO&&i>0)return;s.tasks.forEach(t=>{if(!done[t.id]&&mins(t.dur)!==null)open.push({...t,st:i+1})})});
  let sum=0;const pl=[];
  for(const t of open){const d=mins(t.dur);if(sum+d>budget)break;pl.push(t);sum+=d}
  if(!pl.length&&open.length){pl.push(open[0]);sum=mins(open[0].dur)}
  $("#plan").innerHTML=pl.length?pl.map(t=>`<button class="planrow" data-go="${esc(t.go)}"><span class="ms">play_circle</span><span class="t">${esc(t.txt)}</span><span class="dur">${esc(t.dur)}</span></button>`).join("")+`<div class="meta" style="margin-top:6px">Zusammen ca. ${sum} Minuten. Los geht's!</div>`:`<div class="meta">Alle Pflichtschritte erledigt. Zeit für die Missionen, das Quiz oder eine Vertiefung.</div>`;
  document.querySelectorAll("#plan [data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
}
function renderCert(xp){
  const all=STAGES.every(stageDone),c=$("#cert");c.hidden=!all;if(!all)return;
  const inp=$("#certName"),pr=curProfile();if(document.activeElement!==inp)inp.value=done._name||(pr&&!DEMO?pr.user:"");
  inp.oninput=()=>{done._name=inp.value;save()};
  $("#certAvatar").innerHTML=monkeySVG(avatarKey(pr||{user:"gast"}));
  $("#certMeta").textContent=`${new Date().toLocaleDateString("de-CH",{day:"numeric",month:"long",year:"numeric"})} · ${xp} Punkte · ${STAGES.length} von ${STAGES.length} Stufen`;
}
function countUp(to){const el=document.querySelector("#hudXp .count");const from=window._xpShown??to;window._xpShown=to;if(!el||from===to){if(el)el.textContent=to;return}const t0=performance.now(),d=700;(function f(t){const k=Math.min(1,(t-t0)/d),v=Math.round(from+(to-from)*(1-Math.pow(1-k,3)));el.textContent=v;if(k<1)requestAnimationFrame(f)})(t0)}
function renderGame(){
  const xp=xpTotal();let li=0;LEVELS.forEach((l,i)=>{if(xp>=l[0])li=i});
  const cur=LEVELS[li],nxt=LEVELS[li+1],st=streakNow();
  $("#hudLevel").innerHTML=`<span class="ms fill">military_tech</span>Level ${li+1} · ${esc(cur[1])}`;
  $("#hudXp").innerHTML=`<span class="ms fill">stars</span><b class="count">${window._xpShown??xp}</b> Punkte`;countUp(xp);
  $("#hudStreak").innerHTML=`<span class="ms fill">local_fire_department</span>${st} ${st===1?"Tag":"Tage"} in Folge`;
  $("#xpFill").style.width=(nxt?(xp-cur[0])/(nxt[0]-cur[0])*100:100)+"%";
  $("#xpNext").textContent=nxt?`Noch ${nxt[0]-xp} Punkte bis Level ${li+2} «${nxt[1]}»`:"Höchstes Level erreicht!";
  const e=earned();
  $("#badges").innerHTML=BADGES.map(b=>`<div class="badge${e.includes(b.id)?" on":""}" data-b="${b.id}" style="--bc:var(${b.c});--bcc:var(${BCC[b.id]})"><span class="coin"><span class="ms">${BICON[b.id]}</span></span>${esc(b.n)}</div>`).join("");
  const ci=Math.floor(new Date(today()+"T12:00:00").getTime()/864e5)%CHALLENGES.length,ch=CHALLENGES[ci],key="_ch"+today();
  $("#dailyTitle").textContent=ch[0];$("#dailyText").textContent=ch[1];
  const db=$("#dailyBtn");db.disabled=!!done[key];db.innerHTML=done[key]?'<span class="ms">check</span>Heute geschafft. Morgen gibt es Nachschub':'<span class="ms">add_task</span>Geschafft, +10 Punkte';
  db.onclick=()=>{if(done[key])return;floatXp(db,XPV.ch);mark(key,true)};
  $("#howto").hidden=xp>=60;
  renderPlan();renderCert(xp);
}
function renderHero(){
  renderGame();
  const all=STAGES.flatMap(items),n=all.filter(i=>done[i.id]).length,pct=Math.round(n/all.length*100);
  const sd=STAGES.filter(stageDone).length,nx=nextStep();
  $("#ring").style.setProperty("--p",pct);$("#ringTxt").textContent=pct+"%";
  $("#heroTitle").textContent=n===0?"Bereit? Der erste Schritt dauert zwei Minuten. Kürzer als ein Kaffee.":!nx?"Offiziell KI-Macher! Das Zertifikat baust du dir selbst, mit KI natürlich.":MSG[nx.i];
  $("#heroSub").textContent=`${n} von ${all.length} Punkten · ${sd} von ${STAGES.length} Stufen geschafft`;
  $("#stairs").innerHTML=STAGES.map((s,i)=>{const it=items(s),c=it.filter(x=>done[x.id]).length;return`<button style="height:${28+i*14.4}%;${lc(i+1)}" data-s="${i}" aria-label="Stufe ${i+1}: ${esc(s.t)}"><i style="height:${c/it.length*100}%"></i></button>`}).join("");
  $("#stairlbl").innerHTML=STAGES.map((s,i)=>`<span>${i+1}</span>`).join("");
  document.querySelectorAll("#stairs button").forEach(b=>b.onclick=()=>flash("stage-"+b.dataset.s));
  const btn=$("#nextBtn");
  if(DEMO&&(!nx||nx.i>0)){btn.className="next";btn.innerHTML=`<span><small>Stufe 1 geschafft, stark!</small>Profil erstellen und Stufe 2 freischalten</span><span class="arr ms">lock_open</span>`;btn.onclick=()=>showGate();return}
  if(!nx){btn.className="next finished";btn.innerHTML=`<span><small>Alles geschafft</small>Deine Urkunde ansehen</span><span class="arr ms">arrow_forward</span>`;btn.onclick=()=>flash("cert");return}
  btn.className="next";
  btn.innerHTML=nx.kind==="task"?`<span><small>Nächster Schritt · Stufe ${nx.i+1} · ${esc(nx.item.dur)}</small>${esc(nx.item.txt)}</span><span class="arr ms">arrow_forward</span>`:`<span><small>Selbstcheck · Stufe ${nx.i+1}</small>Prüfe kurz, ob du es verstanden hast</span><span class="arr ms">arrow_forward</span>`;
  btn.onclick=()=>nx.kind==="task"?go(nx.item.go):flash("stage-"+nx.i);
}

/* ===== Lernpfad ===== */
const row=(i,cls="")=>`<div class="task ${cls}${done[i.id]?" checked":""}"><input type="checkbox" id="${i.id}"${done[i.id]?" checked":""}><label for="${i.id}">${esc(i.txt)}${i.dur?` <span class="dur">· ${esc(i.dur)}</span>`:""}</label>${i.go?`<button class="golink" data-go="${esc(i.go)}">Öffnen<span class="ms">chevron_right</span></button>`:""}</div>`;
function quizRow(c){
  const z=QUIZ[c.id],ok=done[c.id];
  return `<div class="quiz${ok?" solved":""}" data-q="${c.id}"><div class="q">${esc(z.q)}</div><div class="opts">${z.o.map((o,k)=>`<button class="opt${ok&&k===z.a?" right":""}" data-k="${k}"${ok?" disabled":""}>${esc(o)}</button>`).join("")}</div><div class="fb">${ok?esc(z.x):""}</div></div>`;
}
function lockedStage(s,i){return `<div class="stage-locked" id="stage-${i}" style="${lc(i+1)}"><span class="num"><span class="ms">lock</span></span><span class="sumtxt"><b>${esc(s.t)}</b><span class="meta">Stufe ${i+1} · ${esc(s.lvlName)} · mit Profil freischalten</span></span><button class="tonal unlock"><span class="ms">lock_open</span>Freischalten</button></div>`}
function renderStages(){
  const open=[...document.querySelectorAll("details.stage")].map(d=>d.open),nx=nextStep();
  $("#stages").innerHTML=STAGES.map((s,i)=>{
    if(DEMO&&i>0)return lockedStage(s,i);
    const it=items(s),c=it.filter(x=>done[x.id]).length,all=c===it.length,isOpen=open.length?open[i]:(nx?nx.i===i:false);
    return`<details class="stage${all?" done":""}" id="stage-${i}" style="${lc(i+1)}"${isOpen?" open":""}>
     <summary><span class="num">${all?'<span class="ms">check</span>':i+1}</span><span class="sumtxt"><b>${esc(s.t)}</b><span class="meta">Stufe ${i+1} · ${esc(s.lvlName)} · ${esc(s.h)} · ${c}/${it.length}</span><span class="minibar"><i style="width:${c/it.length*100}%"></i></span></span><span class="chev ms">expand_more</span></summary>
     <div class="sbody">
      <p class="why">${esc(s.why)}<br><b>Ziel:</b> ${esc(s.goal)}</p>
      <div class="example"><span class="eyebrow"><span class="ms">lightbulb</span>${esc(s.ex.title)}</span><p>${esc(s.ex.text)}</p>
       <div class="links">${s.ex.links.map(l=>`<button class="pill${l[2]?" rec":""}" data-go="${l[1]}"><span class="ms">${l[2]?"recommend":"explore"}</span>${esc(l[0])}</button>`).join("")}</div></div>
      <div class="sub"><span class="ms">task_alt</span>Das machst du <span class="xp">je 10 Punkte</span></div>${s.tasks.map(t=>row(t)).join("")}
      <details class="deepbox"><summary class="sub"><span class="ms">explore</span>Vertiefung, freiwillig (${s.deep.length})<span class="ms tog">expand_more</span><span class="xp">je 15 Punkte</span></summary>${s.deep.map(t=>row(t,"optional")).join("")}</details>
      <div class="mission"><span class="eyebrow"><span class="ms">flag</span>Praxis-Mission · 30 Punkte</span>${row(s.mission)}</div>
      <div class="sub"><span class="ms">quiz</span>Mini-Quiz: Das verstehst du danach <span class="xp">je 20 Punkte</span></div>
      <p class="meta" style="margin:0 0 2px">Tippe auf die richtige Antwort.</p>
      ${s.checks.map(quizRow).join("")}
      <div class="donebox"><span class="ms fill">celebration</span><span>${esc(s.done)}</span></div>
     </div></details>`}).join("");
  document.querySelectorAll("#stages .unlock").forEach(b=>b.onclick=()=>showGate());
  document.querySelectorAll("#stages input").forEach(cb=>cb.onchange=()=>onCheck(cb));
  document.querySelectorAll("#stages .quiz:not(.solved) .opt").forEach(b=>b.onclick=()=>{
    const box=b.closest(".quiz"),id=box.dataset.q,z=QUIZ[id];
    if(+b.dataset.k===z.a){box.querySelectorAll(".opt").forEach(o=>o.disabled=true);b.classList.add("right");box.querySelector(".fb").textContent=z.x;floatXp(b,XPV.check);setTimeout(()=>mark(id,true),900)}
    else{b.classList.remove("wrong");void b.offsetWidth;b.classList.add("wrong");box.querySelector(".fb").textContent=pick(WRONG)}
  });

  document.querySelectorAll("#stages [data-go]").forEach(b=>b.onclick=e=>{e.preventDefault();go(b.dataset.go)});
  document.querySelectorAll("#stages .deepbox>summary").forEach(sm=>sm.addEventListener("click",e=>e.stopPropagation()));
  renderHero();
}
const CHEERS=C.game.cheers;
const RIGHT=C.game.right;
const WRONG=C.game.wrong;
const pick=a=>a[Math.floor(Math.random()*a.length)];
function bumpStreak(){
  const t=today();if(done._last===t)return;
  const y=new Date();y.setDate(y.getDate()-1);
  done._streak=done._last===dstr(y)?(done._streak||0)+1:1;done._last=t;
}
const levelOf=xp=>{let li=0;LEVELS.forEach((l,i)=>{if(xp>=l[0])li=i});return li};
const LVL_LINES=C.game.lvlLines;
function levelUp(li){
  const pr=curProfile();$("#lvlAvatar").innerHTML=monkeySVG(pr?avatarKey(pr):"gast");$("#lvlTitle").textContent=`Level ${li+1}: ${LEVELS[li][1]}`;$("#lvlText").textContent=LVL_LINES[(li-1)%LVL_LINES.length];
  $("#lvlup").hidden=false;confetti(true);clearTimeout(window._lvlT);window._lvlT=setTimeout(()=>{$("#lvlup").hidden=true},5000);
}
function mark(id,val){
  const s=STAGES.find(s=>items(s).some(i=>i.id===id)),was=s&&stageDone(s),before=earned(),lvBefore=levelOf(xpTotal());
  done[id]=val;if(val)bumpStreak();save();
  const newB=earned().filter(b=>!before.includes(b));
  const lvAfter=levelOf(xpTotal());
  if(val&&lvAfter>lvBefore)setTimeout(()=>levelUp(lvAfter),500);
  if(s&&!was&&stageDone(s)){toast(s.done);confetti(true)}
  else if(newB.length){toast("Neues Abzeichen: "+BADGES.find(b=>b.id===newB[0]).n+". Glänzt fast so schön wie du.");confetti()}
  else if(val)toast(id.startsWith("d")?"Vertiefung erledigt. Streber! Aber von der guten Sorte.":id.startsWith("c")?pick(RIGHT):id.startsWith("_ch")?"Tages-Challenge geschafft. Heute bist du der Boss.":id.startsWith("m")?"Mission erfüllt! +30 Punkte. James Bond wäre stolz.":pick(CHEERS));
  renderStages();
  newB.forEach(b=>{const el=document.querySelector(`.badge[data-b="${b}"]`);if(el)el.classList.add("new")});
}
function onCheck(cb){if(cb.checked)floatXp(cb,cb.id.startsWith("d")?XPV.deep:cb.id.startsWith("m")?XPV.mission:XPV.task);mark(cb.id,cb.checked)}
function hop(){const a=document.querySelector("#heroUser .avatar");if(!a)return;a.classList.remove("jump");void a.offsetWidth;a.classList.add("jump")}
function floatXp(el,n){hop();const r=el.getBoundingClientRect(),f=document.createElement("div");f.className="floatxp";f.textContent="+"+n;f.style.left=(r.left+r.width/2-14)+"px";f.style.top=(r.top-8)+"px";document.body.appendChild(f);setTimeout(()=>f.remove(),1000)}
function confetti(bananas){
  const c=$("#confetti"),x=c.getContext("2d");c.width=innerWidth;c.height=innerHeight;
  const cs=getComputedStyle(document.documentElement),cols=["--l1","--l2","--l3","--l4","--l5","--l6","--primary"].map(v=>cs.getPropertyValue(v).trim());
  const P=Array.from({length:140},()=>({x:innerWidth/2,y:innerHeight*.35,vx:(Math.random()-.5)*14,vy:Math.random()*-14-4,r:Math.random()*6+4,c:cols[Math.floor(Math.random()*cols.length)],a:Math.random()*6,b:false}));
  if(bananas)for(let i=0;i<26;i++)P.push({x:Math.random()*innerWidth,y:-30-Math.random()*innerHeight*.6,vx:(Math.random()-.5)*2,vy:Math.random()*2+1,r:14+Math.random()*8,a:Math.random()*6,b:true});
  const banana=(r)=>{x.beginPath();x.moveTo(-r,0);x.quadraticCurveTo(0,r*1.1,r,0);x.quadraticCurveTo(0,r*.45,-r,0);x.fillStyle="#ffd600";x.fill();x.strokeStyle="#b58900";x.lineWidth=1.5;x.stroke();x.fillStyle="#6d4c41";x.fillRect(r-2,-3,4,4)};
  let f=0;(function tick(){x.clearRect(0,0,c.width,c.height);P.forEach(p=>{p.vy+=p.b?.12:.45;p.x+=p.vx;p.y+=p.vy;p.a+=p.b?.05:.2;x.save();x.translate(p.x,p.y);x.rotate(p.a);if(p.b)banana(p.r);else{x.fillStyle=p.c;x.fillRect(-p.r/2,-p.r/4,p.r,p.r/2)}x.restore()});if(++f<(bananas?170:110))requestAnimationFrame(tick);else x.clearRect(0,0,c.width,c.height)})();
}
$("#resetBtn").onclick=()=>{$("#resetConfirm").hidden=false};
$("#resetNo").onclick=()=>{$("#resetConfirm").hidden=true};
$("#resetYes").onclick=()=>{done={};save();$("#resetConfirm").hidden=true;$("#stages").innerHTML="";renderStages();toast("Alles zurückgesetzt. Neuer Anlauf, neues Glück.")};

/* ===== Kopieren ===== */
async function copyText(t,btn){const l=btn.lastElementChild;try{await navigator.clipboard.writeText(t);l.textContent="Kopiert"}catch(e){const r=document.createRange();r.selectNodeContents(btn.previousElementSibling);const sel=getSelection();sel.removeAllRanges();sel.addRange(r);l.textContent="Markiert"}setTimeout(()=>l.textContent="Kopieren",1600)}
const promptBox=p=>`<div class="prompt"><span>${esc(p)}</span><button class="copy"><span class="ms">content_copy</span><span>Kopieren</span></button></div>`;

/* ===== Prompten und Bauen ===== */
$("#treppe").innerHTML=TREPPE.map((s,i)=>`<div class="step" style="${lc(i+1)}"><span class="sn">${i+1}</span><div><h3>${esc(s.t)}</h3><p class="meta" style="margin:0">${esc(s.d)}</p>${promptBox(s.p)}<div class="gain"><span class="ms">check_circle</span>${esc(s.g)}</div></div></div>`).join("");
$("#fixes").innerHTML=FIXES.map(f=>`<button class="chip">${esc(f)}</button>`).join("");
document.querySelectorAll("#fixes .chip").forEach(b=>b.onclick=async()=>{const t=b.textContent;try{await navigator.clipboard.writeText(t);toast("Kopiert: "+t)}catch(e){toast(t)}});
$("#practice").innerHTML=PRACTICE.map(p=>`<div class="card" id="x-${p.id}">${dots(p.lvl)}<h3 style="margin-top:6px">${esc(p.title)}</h3><p style="margin:0">${esc(p.text)}</p>${promptBox(p.prompt)}</div>`).join("");
$("#builds").innerHTML=BUILDS.map((b,i)=>`<div class="card" id="x-${b.id}">${dots(b.lvl)} <span class="tag">${esc(b.tool)}</span><h3 style="margin-top:6px">${b.id==="b0"?"Start-Projekt":"Bauprojekt "+b.id.slice(1)}: ${esc(b.title)}</h3><p style="margin:0">${esc(b.text)}</p>${promptBox(b.prompt)}</div>`).join("");
document.querySelectorAll(".copy").forEach(b=>b.onclick=()=>copyText(b.previousElementSibling.textContent,b));
document.querySelectorAll(".stuck [data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));

/* ===== Begriffe ===== */
let termLvl=0;
function renderTerms(){
  $("#termChips").innerHTML=[0,1,2,3,4,5,6].map(n=>`<button class="chip${n===termLvl?" on":""}" data-n="${n}">${n?"Stufe "+n:"Alle"}</button>`).join("");
  document.querySelectorAll("#termChips .chip").forEach(b=>b.onclick=()=>{termLvl=+b.dataset.n;renderTerms()});
  const q=$("#termSearch").value.trim().toLowerCase();
  const list=TERMS.filter(t=>(!termLvl||t[0]===termLvl)&&(!q||(t[1]+" "+t[2]).toLowerCase().includes(q)));
  $("#terms").innerHTML=list.length?list.map(t=>`<div class="card term"><dt>${esc(t[1])} ${dots(t[0])}</dt><dd>${esc(t[2])}${t[3]?`<span class="ex">Beispiel: ${esc(t[3])}</span>`:""}</dd></div>`).join(""):`<p class="meta">Kein Treffer. Frag die KI: «Was bedeutet ${esc(q)}? Erkläre es mir ohne Fachbegriffe.»</p>`;
}
$("#termSearch").oninput=renderTerms;

/* ===== Medien ===== */
let mediaFilter="Alle";
const MT=["Alle","Video","Podcast","Kurs","Artikel","Buch"];
const BL={Artikel:"Original lesen",Podcast:"Anhören",Kurs:"Zum Kurs",Video:"Ansehen",Buch:"Zum Buch"};
function renderMedia(){
  $("#mediaChips").innerHTML=MT.map(c=>`<button class="chip${c===mediaFilter?" on":""}" data-c="${c}">${c}</button>`).join("");
  document.querySelectorAll("#mediaChips .chip").forEach(b=>b.onclick=()=>{mediaFilter=b.dataset.c;renderMedia()});
  const list=MEDIA.filter(m=>mediaFilter==="Alle"||m.type===mediaFilter).sort((a,b)=>a.lvl-b.lvl);
  $("#media").innerHTML=list.map(m=>{const rec=REC.has(m.id);return`<article class="card res" id="m-${m.id}">
   <div><span class="tag ${rec?"rec":"deep"}">${rec?"Empfohlen":"Vertiefung"}</span><span class="tag">${m.type}</span>${dots(m.lvl)}</div>
   <h3 style="margin-top:8px"><a href="${m.url}" target="_blank" rel="noopener">${esc(m.title)}</a></h3>
   <div class="meta">${esc(m.by)} · ${esc(m.len)}</div>
   ${m.text?`<p style="margin:6px 0 0">${esc(m.text)}</p>`:""}
   ${m.sum?`<details${rec?" open":""}><summary>Das Wichtigste in Kürze</summary><ul>${m.sum.map(s=>`<li>${esc(s)}</li>`).join("")}</ul></details>`:""}
   <a class="btn" href="${m.url}" target="_blank" rel="noopener"><span class="ms">open_in_new</span>${BL[m.type]}</a></article>`}).join("");
}

/* ===== Grosses Bild ===== */
$("#chain").innerHTML=CHAIN.map((c,i)=>`${i?'<div class="arrow">▲ baut darauf auf</div>':""}<div class="layer"><div class="ix">${c[0]}</div><div><b>${esc(c[1])}</b><div class="meta">${esc(c[2])}</div></div></div>`).join("");
$("#questions").innerHTML=QUESTIONS.map(q=>`<li>${esc(q)}</li>`).join("");

/* ===== Darstellung ===== */
function applyTheme(t){const r=document.documentElement;if(t)r.dataset.theme=t;const dark=r.dataset.theme?r.dataset.theme==="dark":matchMedia("(prefers-color-scheme: dark)").matches;$("#themeIcon").textContent=dark?"light_mode":"dark_mode";$("#themeBtn").setAttribute("aria-label",dark?"Hellmodus einschalten":"Dunkelmodus einschalten");const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=dark?"#121318":"#4355b9"}
try{const t=localStorage.getItem("ki-lernpfad-theme");if(t)applyTheme(t)}catch(e){}
applyTheme();
$("#themeBtn").onclick=()=>{const r=document.documentElement;const dark=r.dataset.theme?r.dataset.theme==="dark":matchMedia("(prefers-color-scheme: dark)").matches;const t=dark?"light":"dark";applyTheme(t);try{localStorage.setItem("ki-lernpfad-theme",t)}catch(e){}};

/* ===== Lustige Affen-Avatare, aus dem Benutzernamen erzeugt ===== */
function seedOf(str){let x=2166136261;for(const c of String(str)){x^=c.charCodeAt(0);x=Math.imul(x,16777619)}return x>>>0}
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function monkeySVG(key){
  const r=rng(seedOf(key||"gast")),pick=a=>a[Math.floor(r()*a.length)];
  const bg=pick(["#ffd8e4","#d1e4ff","#c8f2e0","#ffe3b3","#e8ddff","#ffdbcf","#d9f2ff","#f1f8c8"]);
  const fur=pick([["#8d5524","#5d3a1a"],["#a0522d","#6b3519"],["#c68642","#8a5a2b"],["#6d4c41","#3e2723"],["#9e9e9e","#616161"],["#e07a2e","#a34f12"],["#4e342e","#2b1b17"]]);
  const face=pick(["#f6d5b0","#f3c89b","#ffe0c2","#eac39b"]),ink="#2b1b17";
  const ears=`<circle cx="18" cy="50" r="12" fill="${fur[0]}"/><circle cx="78" cy="50" r="12" fill="${fur[0]}"/><circle cx="18" cy="50" r="7" fill="${face}"/><circle cx="78" cy="50" r="7" fill="${face}"/>`;
  const head=`<circle cx="48" cy="50" r="30" fill="${fur[0]}"/><path d="M36 22 q4 -8 8 0 q4 -9 8 0" fill="${fur[1]}"/>`;
  const mask=`<path d="M48 40 C40 28 22 34 26 50 C28 60 34 62 38 64 C30 72 36 84 48 84 C60 84 66 72 58 64 C62 62 68 60 70 50 C74 34 56 28 48 40 Z" fill="${face}"/>`;
  const eyes=pick([
    `<circle cx="39" cy="48" r="4.5" fill="${ink}"/><circle cx="57" cy="48" r="4.5" fill="${ink}"/><circle cx="40.5" cy="46.5" r="1.6" fill="#fff"/><circle cx="58.5" cy="46.5" r="1.6" fill="#fff"/>`,
    `<path d="M34 49 q5 -6 10 0 M52 49 q5 -6 10 0" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`,
    `<circle cx="39" cy="48" r="6" fill="#fff" stroke="${ink}" stroke-width="1.5"/><circle cx="57" cy="48" r="6" fill="#fff" stroke="${ink}" stroke-width="1.5"/><circle cx="41" cy="49" r="2.8" fill="${ink}"/><circle cx="55" cy="47" r="2.8" fill="${ink}"/>`,
    `<circle cx="39" cy="48" r="4.5" fill="${ink}"/><path d="M52 48 h10" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`,
    `<path d="M34 46 l10 4 M62 46 l-10 4" stroke="${ink}" stroke-width="2.5" stroke-linecap="round"/><circle cx="40" cy="51" r="3.5" fill="${ink}"/><circle cx="56" cy="51" r="3.5" fill="${ink}"/>`
  ]);
  const nose=`<ellipse cx="45" cy="60" rx="1.8" ry="1.3" fill="${ink}"/><ellipse cx="51" cy="60" rx="1.8" ry="1.3" fill="${ink}"/>`;
  const mouth=pick([
    `<path d="M38 68 q10 10 20 0" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/>`,
    `<path d="M38 67 q10 13 20 0 z" fill="${ink}"/><path d="M44 72 q4 4 8 0" fill="#ff6e8a"/>`,
    `<ellipse cx="48" cy="70" rx="4" ry="5" fill="${ink}"/>`,
    `<path d="M38 69 q10 8 20 0" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/><rect x="45" y="70.5" width="6" height="4" rx="1" fill="#fff" stroke="${ink}" stroke-width="1"/>`,
    `<path d="M39 70 q4 -3 9 0 q5 3 9 0" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/><path d="M52 71 q3 5 6 0" fill="#ff6e8a"/>`
  ]);
  const extra=pick([
    "",
    `<rect x="30" y="42" width="16" height="10" rx="4" fill="${ink}"/><rect x="50" y="42" width="16" height="10" rx="4" fill="${ink}"/><line x1="46" y1="45" x2="50" y2="45" stroke="${ink}" stroke-width="2"/><rect x="32" y="43.5" width="5" height="2" rx="1" fill="#fff" opacity=".7"/>`,
    `<path d="M34 24 L48 2 L62 24 Z" fill="${pick(["#ff4081","#7c4dff","#00bfa5","#ffab00"])}"/><circle cx="48" cy="3" r="4" fill="#ffd600"/><path d="M38 18 h20" stroke="#fff" stroke-width="2" opacity=".7"/>`,
    `<path d="M16 46 q0 -36 32 -36 q32 0 32 36" fill="none" stroke="${ink}" stroke-width="3.5"/><rect x="9" y="42" width="10" height="17" rx="4" fill="#e53935"/><rect x="77" y="42" width="10" height="17" rx="4" fill="#e53935"/>`,
    `<path d="M70 86 q14 -6 18 -26 q2 -4 -2 -3 q-4 18 -18 24 z" fill="#ffd600" stroke="#c49000" stroke-width="1.5"/><path d="M86 57 l2 -4" stroke="#6d4c41" stroke-width="2.5" stroke-linecap="round"/>`,
    `<path d="M38 86 L48 81 L58 86 L58 76 L48 81 L38 76 Z" fill="#ff4081"/>`,
    `<circle cx="32" cy="62" r="4" fill="#ff8a80" opacity=".75"/><circle cx="64" cy="62" r="4" fill="#ff8a80" opacity=".75"/>`,
    `<path d="M26 26 q22 -16 44 0 l-2 6 q-20 -10 -40 0 z" fill="${pick(["#1e88e5","#43a047","#e53935"])}"/><path d="M60 24 h18 v4 h-18 z" fill="${pick(["#1565c0","#2e7d32","#b71c1c"])}"/>`
  ]);
  return `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="96" height="96" fill="${bg}"/>${ears}${head}${mask}${eyes}${nose}${mouth}${extra}</svg>`;
}
const avatarKey=p=>p.avatar||p.user||"gast";

/* ===== Profile, Anmelden, Demo, Verschlüsselung ===== */
const DEFAULT_GREET="Hallo, zukünftiges KI-Genie. Keine Angst, der Affe beisst nicht.";
const USER_RE=/^[A-Za-z0-9ÄÖÜäöüéèàç._-]{3,20}$/,PIN_MIN=8,KDF_ITER=310000,SKEY="ki-lernpfad-session";
const hsh=(id,pin)=>{let x=5381;for(const c of id+"|"+pin)x=((x<<5)+x+c.charCodeAt(0))|0;return(x>>>0).toString(36)};
/* Krypto: PBKDF2-SHA-256 leitet aus der PIN einen AES-256-GCM-Schlüssel ab. Die PIN wird nie gespeichert. */
const enc8=new TextEncoder(),dec8=new TextDecoder();
const b64=u=>{u=new Uint8Array(u);let s="";for(let i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s)};
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const CRYPTO_OK=!!(window.crypto&&crypto.subtle);
async function deriveKey(pin,salt){const base=await crypto.subtle.importKey("raw",enc8.encode(pin),"PBKDF2",false,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:KDF_ITER,hash:"SHA-256"},base,{name:"AES-GCM",length:256},true,["encrypt","decrypt"])}
async function encryptObj(key,obj){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,enc8.encode(JSON.stringify(obj)));return{iv:b64(iv),data:b64(ct)}}
async function decryptObj(key,iv,data){const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(iv)},key,unb64(data));return JSON.parse(dec8.decode(pt))}
let SESSION_KEY=null,saving=Promise.resolve();
async function rememberSession(id,key){try{const raw=await crypto.subtle.exportKey("raw",key);sessionStorage.setItem(SKEY,JSON.stringify({id,k:b64(raw)}))}catch(e){}}
function forgetSession(){try{sessionStorage.removeItem(SKEY)}catch(e){}}
async function resumeSession(){
  try{const s=JSON.parse(sessionStorage.getItem(SKEY)||"null");if(!s||!reg.profiles[s.id]||!reg.profiles[s.id].salt)return false;
    const key=await crypto.subtle.importKey("raw",unb64(s.k),{name:"AES-GCM"},true,["encrypt","decrypt"]);
    const p=reg.profiles[s.id];done=await decryptObj(key,p.iv,p.data);SESSION_KEY=key;reg.active=s.id;saveReg();return true}catch(e){return false}
}
function save(){
  if(DEMO||!reg.active||!SESSION_KEY)return;
  const id=reg.active,key=SESSION_KEY,snap=JSON.parse(JSON.stringify(done));
  saving=saving.then(async()=>{const e=await encryptObj(key,snap);if(reg.profiles[id]){Object.assign(reg.profiles[id],e);saveReg()}}).catch(()=>{});
}
async function setPin(id,pin){
  const salt=crypto.getRandomValues(new Uint8Array(16)),key=await deriveKey(pin,salt);
  const p=reg.profiles[id];p.salt=b64(salt);delete p.pin;delete p.progress;ST.del(progKey(id));
  SESSION_KEY=key;Object.assign(p,await encryptObj(key,done));saveReg();await rememberSession(id,key);
}

function curProfile(){return DEMO?{user:"Demo-Gast",avatar:"demo"}:reg.profiles[reg.active]||null}
function demoState(){return {}}
/* ===== Lernweg-Assistent: speichert Tiefe, Medien und Ort in done._settings (wirkt noch nicht auf Stufen und Tagesplan) ===== */
const MODE_LABEL={compact:"Kompakt",standard:"Standard",deep:"Tief"};
const MEDIA_LABEL={video:"Videos",podcast:"Podcasts",read:"Lesen",course:"Kurse",practice:"Ausprobieren"};
const PLACE_LABEL={mobile:"unterwegs",computer:"am Computer",any:"überall"};
const MEDIA_KEYS=Object.keys(MEDIA_LABEL);
const PATH_STEP_COUNT=3,PATH_ROUND_MIN=30,PATH_AUTO_DELAY_MS=900;
const PATH_DONE_TOAST="Dein Lernweg steht. Die Affen haben die Bananen schon eingepackt.";
/* Fehlende Einstellungen bedeuten: Standard, alle Medien, überall */
function getSettings(){
  const s=(done&&done._settings)||{};
  return{
    mode:Object.hasOwn(MODE_LABEL,s.mode)?s.mode:"standard",
    media:Array.isArray(s.media)?MEDIA_KEYS.filter(k=>s.media.includes(k)):[],
    place:Object.hasOwn(PLACE_LABEL,s.place)?s.place:"any"
  };
}
function settingsLine(s=getSettings()){
  const all=!s.media.length||s.media.length===MEDIA_KEYS.length;
  return `Lernweg: ${MODE_LABEL[s.mode]} · ${all?"alle Medien":s.media.map(k=>MEDIA_LABEL[k]).join(", ")} · ${PLACE_LABEL[s.place]}`;
}
/* Dauer je Modus aus den Inhalten: Kompakt = Kern (mit Kurz-Ersatz), Standard = alle Schritte, Tief = Standard plus Vertiefungen */
const stepMin=t=>Number.isFinite(t.min)?t.min:0;
const sumMin=list=>list.reduce((n,t)=>n+stepMin(t),0);
function pathMinutes(){
  const tasks=STAGES.flatMap(s=>s.tasks),standard=sumMin(tasks);
  return{
    compact:tasks.filter(t=>t.depth==="core").reduce((n,t)=>n+(t.compact&&Number.isFinite(t.compact.min)?t.compact.min:stepMin(t)),0),
    standard,
    deep:standard+sumMin(STAGES.flatMap(s=>s.deep))
  };
}
const hoursLabel=min=>`ca. ${String(Math.round(min/PATH_ROUND_MIN)*PATH_ROUND_MIN/60).replace(".",",")} Std.`;
let pathStep=0,pathDraft=null,pathReturnFocus=null;
const pathPanes=()=>[...document.querySelectorAll("#pathDlg .pathpane")];
function pathRenderChoices(){
  document.querySelectorAll("#pathDlg .pathopt").forEach(b=>{const on=pathDraft[b.dataset.key]===b.dataset.v;b.setAttribute("aria-pressed",on);b.classList.toggle("on",on)});
  document.querySelectorAll("#pathDlg .chip").forEach(b=>{const on=pathDraft.media.includes(b.dataset.v);b.setAttribute("aria-pressed",on);b.classList.toggle("on",on)});
}
function pathShowStep(n){
  const panes=pathPanes();pathStep=n;
  panes.forEach((p,i)=>{p.hidden=i!==n});
  $("#pathTitle").textContent=panes[n].dataset.title;
  $("#pathStep").textContent=`Schritt ${n+1} von ${PATH_STEP_COUNT}`;
  [...$("#pathDots").children].forEach((d,i)=>{d.classList.toggle("on",i<=n);d.classList.toggle("cur",i===n)});
  $("#pathBack").hidden=n===0;
  $("#pathNext").textContent=n===PATH_STEP_COUNT-1?"Fertig":"Weiter";
  panes[n].querySelector("button").focus();
}
function openPath(){
  if(DEMO||!reg.active)return;
  const s=getSettings(),m=pathMinutes();
  pathDraft={mode:s.mode,media:[...s.media],place:s.place};
  document.querySelectorAll("#pathDlg [data-dur]").forEach(el=>{el.textContent=hoursLabel(m[el.dataset.dur])+(el.dataset.dur==="deep"?" · plus optionale Langkurse":"")});
  pathReturnFocus=document.activeElement;
  pathRenderChoices();$("#pathDlg").hidden=false;pathShowStep(0);
}
function closePath(){
  $("#pathDlg").hidden=true;
  if(pathReturnFocus&&pathReturnFocus.isConnected)pathReturnFocus.focus();
  pathReturnFocus=null;
}
function finishPath(){
  done._settings={mode:pathDraft.mode,media:MEDIA_KEYS.filter(k=>pathDraft.media.includes(k)),place:pathDraft.place};
  save();closePath();renderStages();renderProfile();toast(PATH_DONE_TOAST);
}
document.querySelectorAll("#pathDlg .pathopt").forEach(b=>b.onclick=()=>{pathDraft[b.dataset.key]=b.dataset.v;pathRenderChoices()});
document.querySelectorAll("#pathDlg .chip").forEach(b=>b.onclick=()=>{const m=pathDraft.media,i=m.indexOf(b.dataset.v);if(i<0)m.push(b.dataset.v);else m.splice(i,1);pathRenderChoices()});
$("#pathNext").onclick=()=>pathStep<PATH_STEP_COUNT-1?pathShowStep(pathStep+1):finishPath();
$("#pathBack").onclick=()=>pathShowStep(pathStep-1);
$("#pathSkip").onclick=closePath;
$("#pathDlg").addEventListener("click",e=>{if(e.target.id==="pathDlg")closePath()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#pathDlg").hidden)closePath()});
/* Fokus bleibt im Dialog */
$("#pathDlg").addEventListener("keydown",e=>{
  if(e.key!=="Tab")return;
  const f=[...$("#pathDlg").querySelectorAll("button")].filter(b=>b.offsetParent!==null),first=f[0],last=f[f.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
});
$("#pPath").onclick=()=>{closeProfile();if($("#profileDlg").hidden)openPath()};
function setErr(id,bad,msg,ok){const f=$("#"+id);if(!f)return;f.classList.toggle("err",bad);f.querySelector(".hint").textContent=bad?msg:ok}
function validate(pre,user,pin,pin2,selfId,pinRequired){
  const taken=Object.entries(reg.profiles).some(([id,p])=>id!==selfId&&p.user.toLowerCase()===user.toLowerCase());
  const bu=!USER_RE.test(user)||taken;
  const bp=(pinRequired||pin!=="")&&pin.length<PIN_MIN;
  const bp2=pre==="g"&&!bp&&pin!==pin2;
  setErr(pre+"-user",bu,taken?"Diesen Benutzernamen gibt es auf diesem Gerät schon":"Bitte 3 bis 20 Zeichen: Buchstaben, Zahlen, Punkt, Strich oder Unterstrich","3 bis 20 Zeichen: Buchstaben, Zahlen, Punkt, Strich oder Unterstrich");
  setErr(pre+"-pin",bp,`Die PIN braucht mindestens ${PIN_MIN} Zeichen`,pre==="g"?`Mindestens ${PIN_MIN} Zeichen. Gut merken, ohne PIN ist der Fortschritt nicht lesbar.`:(pinRequired?`Bitte lege eine neue PIN mit mindestens ${PIN_MIN} Zeichen fest`:`Mindestens ${PIN_MIN} Zeichen, leer lassen = unverändert`));
  setErr(pre+"-pin2",bp2,"Die beiden PINs stimmen nicht überein","Zur Sicherheit nochmals eingeben");
  const fb=[[bu,"user"],[bp,"pin"],[bp2,"pin2"]].find(x=>x[0]);
  if(fb){$("#"+pre+"-"+fb[1]+" input").focus();return false}
  return true;
}
function renderProfile(){
  const pr=curProfile();
  $("#greet").textContent=pr&&!DEMO?`Hallo ${pr.user}, zukünftiges KI-Genie. Keine Angst, der Affe beisst nicht.`:DEFAULT_GREET;
  const pi=$("#profileIcon");
  if(pr){pi.className="avatar img";pi.innerHTML=monkeySVG(avatarKey(pr));$("#profileBtn").title=DEMO?"Demo beenden":"@"+pr.user;$("#profileBtn").setAttribute("aria-label",DEMO?"Demo beenden":`Profil von ${pr.user}`)}
  else{pi.className="ms";pi.textContent="account_circle"}
  const hu=$("#heroUser");
  hu.innerHTML=pr?`<span class="avatar lg img">${monkeySVG(avatarKey(pr))}</span><span class="t"><b>${DEMO?"Demo-Gast":"@"+esc(pr.user)}</b><span class="meta">${DEMO?"Demo · nur Stufe 1":"Fortschritt verschlüsselt gespeichert"}</span></span><button class="hbtn" id="heroEdit"><span class="ms">${DEMO?"person_add":"edit"}</span>${DEMO?"Eigenes Profil":"Profil bearbeiten"}</button>${DEMO?"":`<button type="button" class="pathline" id="pathLine" title="Lernweg anpassen"><span class="ms">tune</span><span>${esc(settingsLine())}</span></button>`}`:"";
  const he=$("#heroEdit");if(he)he.onclick=openProfile;
  const pl=$("#pathLine");if(pl)pl.onclick=openPath;
  $("#demoBar").hidden=!DEMO;
}
function renderGate(){
  const ids=Object.keys(reg.profiles);
  $("#gateLogin").hidden=!ids.length;
  $("#gateFormTitle").textContent=ids.length?"Neues Profil erstellen":"Profil erstellen";
  $("#gateList").innerHTML=ids.map(id=>{const p=reg.profiles[id];
    return `<div class="pitem" data-id="${id}"><button class="pbtn" type="button"><span class="avatar lg img">${monkeySVG(avatarKey(p))}</span><span class="t"><b>@${esc(p.user)}</b><span class="meta">${p.salt?"Verschlüsselt, PIN nötig":"Ältere Version, PIN nötig"}</span></span><span class="ms">lock</span></button><div class="pinrow" hidden><input type="password" maxlength="64" placeholder="PIN" autocomplete="current-password" aria-label="PIN für ${esc(p.user)}"><button type="button" class="filled">Anmelden</button></div></div>`}).join("");
  document.querySelectorAll("#gateList .pitem").forEach(it=>{
    const id=it.dataset.id,row=it.querySelector(".pinrow"),inp=row.querySelector("input"),btn=row.querySelector("button");
    const tryLogin=async()=>{btn.disabled=true;btn.textContent="Prüfe…";const ok=await login(id,inp.value);btn.disabled=false;btn.textContent="Anmelden";if(!ok){inp.value="";inp.focus();toast("Falsche PIN. Tief durchatmen und nochmals.")}};
    it.querySelector(".pbtn").onclick=()=>{row.hidden=false;inp.focus()};
    btn.onclick=tryLogin;inp.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();tryLogin()}};
  });
}
let DEMO_DONE=null;
function showGate(){if(DEMO&&Object.keys(done).length)DEMO_DONE=done;DEMO=false;renderGate();$("#gate").hidden=false;$("#demoBar").hidden=true;window.scrollTo({top:0})}
function afterLogin(){window._xpShown=undefined;$("#gate").hidden=true;$("#stages").innerHTML="";renderStages();renderProfile();show("lernpfad");maybeShowWhatsNew()}
/* ===== Version und «Was ist neu» ===== */
const SEEN_KEY="ki-lernpfad-seen-version";
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function openWhatsNew(){
  const v=C.version;if(!v)return;
  $("#wnTitle").textContent="Was ist neu in Version "+v.version;
  $("#wnDate").textContent=v.date;
  $("#wnList").replaceChildren(...v.notes.map(t=>{const li=document.createElement("li");li.textContent=t;return li}));
  $("#whatsNewDlg").hidden=false;$("#wnOk").focus();
}
function closeWhatsNew(){$("#whatsNewDlg").hidden=true}
function maybeShowWhatsNew(){
  const v=C.version;if(!v||$("#gate").hidden===false)return;
  const seen=lsGet(SEEN_KEY);if(seen===v.version)return;
  const firstVisit=seen===null&&!lsGet(PKEY);
  lsSet(SEEN_KEY,v.version);
  if(!firstVisit)openWhatsNew();
}
/* Erstbesuch ohne Profil: aktuelle Version gilt als gesehen, damit neue Nutzer keine Release-Notes bekommen */
if(C.version&&lsGet(SEEN_KEY)===null&&!lsGet(PKEY))lsSet(SEEN_KEY,C.version.version);
$("#appVersion").textContent=C.version?C.version.version:"dev";
$("#whatsNewBtn").hidden=!C.version;
$("#whatsNewBtn").onclick=openWhatsNew;
$("#wnOk").onclick=closeWhatsNew;
$("#whatsNewDlg").addEventListener("click",e=>{if(e.target.id==="whatsNewDlg")closeWhatsNew()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#whatsNewDlg").hidden)closeWhatsNew()});
let MUST_SET_PIN=false;
async function login(id,pin){
  const p=reg.profiles[id];if(!p)return false;
  if(p.salt){
    try{const key=await deriveKey(pin,unb64(p.salt));const d=await decryptObj(key,p.iv,p.data);DEMO=false;SESSION_KEY=key;reg.active=id;saveReg();done=d;await rememberSession(id,key)}catch(e){return false}
    afterLogin();toast(`Willkommen zurück, ${p.user}! Die KI hat dich vermisst. Behauptet sie jedenfalls.`);return true;
  }
  /* Profil aus einer älteren Version: alte PIN prüfen, danach neue PIN festlegen und verschlüsseln */
  if(p.pin&&hsh(id,pin)!==p.pin)return false;
  DEMO=false;reg.active=id;saveReg();done=p.progress||ST.get(progKey(id))||{};SESSION_KEY=null;
  if(pin.length>=PIN_MIN){await setPin(id,pin);afterLogin();toast("Dein Profil ist jetzt verschlüsselt. Willkommen zurück!");return true}
  MUST_SET_PIN=true;afterLogin();openProfile();toast("Bitte lege eine neue PIN mit mindestens 8 Zeichen fest. Dann wird dein Fortschritt verschlüsselt.");return true;
}
function logout(){reg.active=null;saveReg();SESSION_KEY=null;MUST_SET_PIN=false;forgetSession();done={};closeProfile();showGate()}
let gExtra="";const gKey=()=>($("#gUser").value.trim()||"gast")+gExtra;
const gPreview=()=>{$("#gAvatar").innerHTML=monkeySVG(gKey())};
$("#gUser").addEventListener("input",gPreview);
$("#gReroll").onclick=()=>{gExtra="-"+Math.random().toString(36).slice(2,7);gPreview()};
gPreview();
$("#gateForm").onsubmit=async e=>{
  e.preventDefault();
  if(!CRYPTO_OK){toast("Dein Browser unterstützt keine Verschlüsselung. Bitte einen aktuellen Browser verwenden.");return}
  const user=$("#gUser").value.trim(),pin=$("#gPin").value,pin2=$("#gPin2").value;
  if(!validate("g",user,pin,pin2,null,true))return;
  const sb=$("#gateForm button[type=submit]");sb.disabled=true;
  const id="p"+Date.now().toString(36);
  const legacy=Object.keys(reg.profiles).length===0?ST.get(LEGACY):null;
  reg.profiles[id]={user,avatar:gKey(),created:today()};
  reg.active=id;DEMO=false;done=DEMO_DONE||legacy||{};const carried=!!DEMO_DONE;DEMO_DONE=null;
  await setPin(id,pin);if(legacy)ST.del(LEGACY);
  sb.disabled=false;["gUser","gPin","gPin2"].forEach(f=>{$("#"+f).value=""});gExtra="";gPreview();
  afterLogin();confetti();toast(carried?`Willkommen an Bord, ${user}! Dein Fortschritt aus der Demo ist übernommen. Stufe 2 ist frei.`:`Willkommen an Bord, ${user}! Die Roboter haben dich jetzt auf dem Radar. Im guten Sinn.`);
  setTimeout(()=>{if(!DEMO&&reg.active===id&&$("#gate").hidden)openPath()},PATH_AUTO_DELAY_MS);
};
$("#demoBtn").onclick=()=>{DEMO=true;SESSION_KEY=null;done=demoState();afterLogin();toast("Demo: Probier Stufe 1 aus. Für die Stufen 2 bis 6 brauchst du ein Profil.")};
$("#demoCreate").onclick=()=>showGate();
let dlgKey="";
function openProfile(){
  if(DEMO)return showGate();
  const pr=curProfile();if(!pr)return showGate();
  $("#pUser").value=pr.user;$("#pPin").value="";
  ["f-user","f-pin"].forEach(id=>$("#"+id).classList.remove("err"));
  $("#f-pin .hint").textContent=MUST_SET_PIN?"Bitte lege eine neue PIN mit mindestens 8 Zeichen fest":"Mindestens 8 Zeichen, leer lassen = unverändert";
  dlgKey=avatarKey(pr);$("#dlgAvatar").innerHTML=monkeySVG(dlgKey);$("#dlgSub").textContent="@"+pr.user;
  $("#pDelete").dataset.confirm="";$("#pDelete").lastChild.textContent="Profil löschen";
  $("#profileDlg").hidden=false;setTimeout(()=>(MUST_SET_PIN?$("#pPin"):$("#pUser")).focus(),50);
}
function closeProfile(){if(MUST_SET_PIN&&reg.active){toast("Ohne neue PIN geht es leider nicht weiter.");return}$("#profileDlg").hidden=true}
$("#profileBtn").onclick=openProfile;
$("#pCancel").onclick=()=>{if(MUST_SET_PIN){MUST_SET_PIN=false;logout();return}closeProfile()};
$("#pReroll").onclick=()=>{const pr=curProfile();dlgKey=(pr?pr.user:"gast")+"-"+Math.random().toString(36).slice(2,7);$("#dlgAvatar").innerHTML=monkeySVG(dlgKey)};
$("#pLogout").onclick=()=>{MUST_SET_PIN=false;logout()};
$("#profileDlg").addEventListener("click",e=>{if(e.target.id==="profileDlg")closeProfile()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#profileDlg").hidden)closeProfile()});
$("#profileForm").onsubmit=async e=>{
  e.preventDefault();if(DEMO)return;
  const p=reg.profiles[reg.active],user=$("#pUser").value.trim(),pin=$("#pPin").value;
  if(!validate("f",user,pin,"",reg.active,MUST_SET_PIN))return;
  Object.assign(p,{user,avatar:dlgKey});
  if(pin){await setPin(reg.active,pin);MUST_SET_PIN=false}else{saveReg();save()}
  $("#profileDlg").hidden=true;renderProfile();renderStages();toast(pin?"Gespeichert und mit der neuen PIN verschlüsselt.":"Profil gespeichert. Sieht gut aus!");
};
$("#pDelete").onclick=()=>{
  const b=$("#pDelete");
  if(b.dataset.confirm!=="1"){b.dataset.confirm="1";b.lastChild.textContent="Wirklich? Fortschritt geht verloren";return}
  const id=reg.active;ST.del(progKey(id));delete reg.profiles[id];MUST_SET_PIN=false;logout();toast("Profil gelöscht.");
};
const LOGO_SVG='<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Logo KI-Lernpfad: lachender Affe mit Doktorhut"><defs><linearGradient id="lgb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4355b9"/><stop offset="1" stop-color="#b0457f"/></linearGradient></defs><rect width="96" height="96" rx="26" fill="url(#lgb)"/><circle cx="19" cy="56" r="11" fill="#8d5524"/><circle cx="77" cy="56" r="11" fill="#8d5524"/><circle cx="19" cy="56" r="6" fill="#f3c89b"/><circle cx="77" cy="56" r="6" fill="#f3c89b"/><circle cx="48" cy="57" r="27" fill="#8d5524"/><path d="M48 48 C41 37 25 42 29 56 C31 64 36 66 39 68 C32 75 37 86 48 86 C59 86 64 75 57 68 C60 66 65 64 67 56 C71 42 55 37 48 48 Z" fill="#f3c89b"/><path d="M35 55 q5 -6 10 0 M51 55 q5 -6 10 0" fill="none" stroke="#2b1b17" stroke-width="3" stroke-linecap="round"/><circle cx="33" cy="64" r="3.5" fill="#ff8a80" opacity=".8"/><circle cx="63" cy="64" r="3.5" fill="#ff8a80" opacity=".8"/><ellipse cx="45" cy="64" rx="1.6" ry="1.2" fill="#2b1b17"/><ellipse cx="51" cy="64" rx="1.6" ry="1.2" fill="#2b1b17"/><path d="M38 70 q10 12 20 0 z" fill="#2b1b17"/><path d="M44 75 q4 4 8 0" fill="#ff6e8a"/><path d="M48 12 L82 25 L48 38 L14 25 Z" fill="#1b1b21"/><path d="M33 30 v8 q15 7 30 0 v-8 l-15 6 z" fill="#2c2c34"/><path d="M48 25 L74 30 V42" fill="none" stroke="#ffb21e" stroke-width="2.5" stroke-linecap="round"/><circle cx="74" cy="44" r="3.5" fill="#ffb21e"/><circle cx="72" cy="74" r="14" fill="#ffb21e" stroke="#fff" stroke-width="3"/><text x="72" y="79.5" text-anchor="middle" font-size="16" font-weight="700" font-family="Noto Sans Tamil, Nirmala UI, Latha, Tamil Sangam MN, sans-serif" fill="#1b1b21">அ</text></svg>';
const FAV_SVG='<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Logo KI-Lernpfad: lachender Affe mit Doktorhut"><defs><linearGradient id="lgf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4355b9"/><stop offset="1" stop-color="#b0457f"/></linearGradient></defs><rect width="96" height="96" rx="26" fill="url(#lgf)"/><circle cx="19" cy="56" r="11" fill="#8d5524"/><circle cx="77" cy="56" r="11" fill="#8d5524"/><circle cx="19" cy="56" r="6" fill="#f3c89b"/><circle cx="77" cy="56" r="6" fill="#f3c89b"/><circle cx="48" cy="57" r="27" fill="#8d5524"/><path d="M48 48 C41 37 25 42 29 56 C31 64 36 66 39 68 C32 75 37 86 48 86 C59 86 64 75 57 68 C60 66 65 64 67 56 C71 42 55 37 48 48 Z" fill="#f3c89b"/><path d="M35 55 q5 -6 10 0 M51 55 q5 -6 10 0" fill="none" stroke="#2b1b17" stroke-width="3" stroke-linecap="round"/><circle cx="33" cy="64" r="3.5" fill="#ff8a80" opacity=".8"/><circle cx="63" cy="64" r="3.5" fill="#ff8a80" opacity=".8"/><ellipse cx="45" cy="64" rx="1.6" ry="1.2" fill="#2b1b17"/><ellipse cx="51" cy="64" rx="1.6" ry="1.2" fill="#2b1b17"/><path d="M38 70 q10 12 20 0 z" fill="#2b1b17"/><path d="M44 75 q4 4 8 0" fill="#ff6e8a"/><path d="M48 12 L82 25 L48 38 L14 25 Z" fill="#1b1b21"/><path d="M33 30 v8 q15 7 30 0 v-8 l-15 6 z" fill="#2c2c34"/><path d="M48 25 L74 30 V42" fill="none" stroke="#ffb21e" stroke-width="2.5" stroke-linecap="round"/><circle cx="74" cy="44" r="3.5" fill="#ffb21e"/></svg>';
$("#brandLogo").innerHTML=LOGO_SVG.replace(/lgb/g,"lgb1");$("#gateLogo").innerHTML=LOGO_SVG.replace(/lgb/g,"lgb2");
(()=>{try{document.querySelectorAll('link[rel~="icon"]').forEach(l=>l.remove());const l=document.createElement("link");l.rel="icon";l.type="image/svg+xml";l.href="data:image/svg+xml,"+encodeURIComponent(FAV_SVG);document.head.appendChild(l)}catch(e){}})();
renderTerms();renderMedia();renderStages();renderProfile();
/* ===== Mitnahme-Link: verschlüsselter Fortschritt für einen anderen Browser ===== */
const PUBLIC_URL="https://denoshanrajasingam.github.io/ki-lernpfad/";
const toB64u=t=>btoa(unescape(encodeURIComponent(t))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const fromB64u=t=>{t=t.replace(/-/g,"+").replace(/_/g,"/");while(t.length%4)t+="=";return decodeURIComponent(escape(atob(t)))};
async function makeTransferLink(){await saving;const p=reg.profiles[reg.active];if(!p||!p.salt||!p.data)return null;return PUBLIC_URL+"#import="+toB64u(JSON.stringify({v:1,u:p.user,a:p.avatar,s:p.salt,i:p.iv,d:p.data}))}
let IMPORT=null;
function readImport(){
  const h=location.hash||"";if(!h.startsWith("#import="))return false;
  try{IMPORT=JSON.parse(fromB64u(h.slice(8)));if(!IMPORT||IMPORT.v!==1||!IMPORT.u||!IMPORT.s||!IMPORT.i||!IMPORT.d)throw 0}catch(e){IMPORT=null;setTimeout(()=>toast("Der Mitnahme-Link ist unvollständig. Bitte auf dem anderen Gerät neu erstellen."),300)}
  try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}
  return !!IMPORT;
}
function showImport(){
  const exists=Object.values(reg.profiles).some(p=>p.user.toLowerCase()===IMPORT.u.toLowerCase());
  $("#impAvatar").innerHTML=monkeySVG(IMPORT.a||IMPORT.u);$("#impUser").textContent="@"+IMPORT.u;
  $("#impInfo").textContent=exists?"Gibt es hier schon. Der Stand aus dem Link ersetzt ihn.":"Gib deine PIN ein, um hier weiterzumachen.";
  $("#importCard").hidden=false;setTimeout(()=>$("#impPin").focus(),80);
}
async function doImport(){
  const btn=$("#impBtn");btn.disabled=true;btn.textContent="Prüfe…";
  try{
    const key=await deriveKey($("#impPin").value,unb64(IMPORT.s));const d=await decryptObj(key,IMPORT.i,IMPORT.d);
    let id=Object.keys(reg.profiles).find(k=>reg.profiles[k].user.toLowerCase()===IMPORT.u.toLowerCase());
    if(!id){id="p"+Date.now().toString(36);reg.profiles[id]={user:IMPORT.u,created:today()}}
    const pr=reg.profiles[id];Object.assign(pr,{avatar:IMPORT.a||IMPORT.u,salt:IMPORT.s,iv:IMPORT.i,data:IMPORT.d});delete pr.pin;delete pr.progress;
    reg.active=id;SESSION_KEY=key;DEMO=false;done=d;saveReg();await rememberSession(id,key);
    IMPORT=null;$("#importCard").hidden=true;$("#impPin").value="";afterLogin();confetti();toast(`Willkommen auf dem neuen Gerät, ${pr.user}! Dein Fortschritt ist da. Die Affen haben ihn sicher hergetragen.`);
  }catch(e){$("#impPin").value="";$("#impPin").focus();toast("Falsche PIN. Tief durchatmen und nochmals.")}
  finally{btn.disabled=false;btn.textContent="Übernehmen"}
}
$("#impBtn").onclick=doImport;
$("#lvlOk").onclick=()=>{$("#lvlup").hidden=true};
$("#lvlup").addEventListener("click",e=>{if(e.target.id==="lvlup")$("#lvlup").hidden=true});
let logoTaps=0,logoT;$("#brandLogo").addEventListener("click",()=>{logoTaps++;clearTimeout(logoT);logoT=setTimeout(()=>{logoTaps=0},1500);if(logoTaps>=5){logoTaps=0;confetti(true);toast("Affentheater! Du hast das Geheimnis entdeckt. Die Bananen gehen auf uns.")}});
$("#impPin").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();doImport()}};
$("#impCancel").onclick=()=>{IMPORT=null;$("#importCard").hidden=true};
$("#pTransfer").onclick=async()=>{
  const link=await makeTransferLink();
  if(!link){toast("Zuerst ein Profil mit PIN anlegen, dann klappt es.");return}
  $("#profileDlg").hidden=true;$("#shareLink").textContent=link;$("#shareDlg").hidden=false;
};
$("#shareDone").onclick=()=>{$("#shareDlg").hidden=true};
$("#shareDlg").addEventListener("click",e=>{if(e.target.id==="shareDlg")$("#shareDlg").hidden=true});
showGate();if(readImport()&&CRYPTO_OK)showImport();else if(CRYPTO_OK)resumeSession().then(ok=>{if(ok)afterLogin()});
const start=(location.hash||"").slice(1);
if(VIEWS.includes(start))show(start,false);
})();
