/* ===== Quiz-Tab: Solo mit Bananen-Leben und Duell am gleichen Gerät. Fragen liegen in content/play/ und werden beim ersten Öffnen geladen. ===== */
(function(){
"use strict";
const STAGE_COUNT=6,LIVES=3,POINTS=10,DUEL_MIN=2,DUEL_MAX=4,DUEL_COUNTS=[5,10],WRONG_MAX=50,DAYS_KEEP=30,NAME_MAX=20,PAIR_COLORS=6,SCROLL_GAP=8;
/* Combo: ab 3 richtigen in Folge doppelte, ab 6 dreifache Punkte. Banner bei diesen Serien. */
const COMBO_BANNERS=[3,6,10];
const multiplierFor=streak=>streak>=6?3:streak>=3?2:1;
const TYPE_LABEL={mc:"Quizfrage",tf:"Wahr oder falsch?",gap:"Lückentext",order:"Reihenfolge",match:"Zuordnen",prompt:"Prompt-Duell",spot:"Fehler finden"};
const TYPE_ICON={mc:"quiz",tf:"rule",gap:"text_fields",order:"format_list_numbered",match:"join",prompt:"compare_arrows",spot:"search"};
const range=n=>Array.from({length:n},(_,i)=>i);
const STAGE_NUMBERS=range(STAGE_COUNT).map(i=>i+1);
/* Quiz-Abzeichen: eigene Liste, unabhängig von den Abzeichen und Levels des Lernpfads */
const BADGES=[
 {id:"first",name:"Erste Runde",desc:"Deine erste Solo-Runde gespielt"},
 {id:"combo10",name:"Combo 10",desc:"Zehn richtige Antworten in Folge"},
 {id:"hs300",name:"Highscore 300",desc:"300 Punkte in einer Solo-Runde"},
 {id:"all6",name:"Alle 6 Stufen gespielt",desc:"Fragen aus allen sechs Stufen beantwortet"},
 {id:"terms20",name:"Begriffs-Profi",desc:"20 Zuordnungen richtig gelöst"},
 {id:"spot10",name:"Fehlerjäger",desc:"10 Fehler in KI-Antworten gefunden"},
 {id:"duelwin",name:"Duell-Sieg",desc:"Ein Duell allein gewonnen"}
];
const BADGE_TESTS={
 first:s=>s.games>=1,
 combo10:s=>s.bestStreak>=10,
 hs300:s=>s.hs>=300,
 all6:s=>STAGE_NUMBERS.every(n=>(s.byStage[n]||{}).a>0),
 terms20:s=>(s.byType.match||{}).c>=20,
 spot10:s=>(s.byType.spot||{}).c>=10,
 duelwin:s=>s.duelWins>=1
};
const FALLBACK_LINES={
 right:["Richtig!"],wrong:["Knapp daneben."],combo:["Serie! Weiter so."],gameover:["Runde vorbei. Nochmals?"],
 duel:["Duell vorbei!"],tie:["Unentschieden!"],highscore:["Neuer Highscore!"]
};
const BANANA_SVG='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 9 Q15 31 28 9 Q16 20 4 9Z" fill="#ffd600" stroke="#b58900" stroke-width="1.5" stroke-linejoin="round"/><path d="M27 10 l2 -4" stroke="#6d4c41" stroke-width="2.5" stroke-linecap="round"/></svg>';
const PEEL_SVG='<svg viewBox="0 0 40 26" aria-hidden="true"><path d="M20 7 C17 13 10 17 3 21 C10 21 15 19 18 16 C17 19 15 22 13 24 L27 24 C25 22 23 19 22 16 C25 19 30 21 37 21 C30 17 23 13 20 7Z" fill="#ffd600" stroke="#b58900" stroke-width="1.5" stroke-linejoin="round"/><path d="M20 7 l-1 -4" stroke="#6d4c41" stroke-width="2.5" stroke-linecap="round"/></svg>';

let api=null;
const bank={};          /* Stufe -> [{q,s}] */
let LINES={};
let loadState="idle";   /* idle | loading | ready | error */
let screen="start";     /* start | handover | play | soloEnd | duelEnd */
let mode="solo";
let selected=null,selectionTouched=false;
let duelCount=DUEL_COUNTS[0];
let players=null;
let game=null;
let demoHs=0;

/* ===== Helfer ===== */
const root=()=>document.getElementById("qzRoot");
const esc=s=>api.esc(s);
const pickOne=a=>a[Math.floor(Math.random()*a.length)];
const line=k=>pickOne(Array.isArray(LINES[k])&&LINES[k].length?LINES[k]:FALLBACK_LINES[k]);
function shuffle(a){const r=a.slice();for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]]}return r}
/* Mischen, aber nie in der Lösungsreihenfolge (sonst wäre Reihenfolge oder Zuordnen geschenkt) */
function shuffleAway(ix){if(ix.length<2)return ix;let r;do r=shuffle(ix);while(r.every((v,i)=>v===i));return r}
const reducedMotion=()=>!!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches);
const dateKey=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
function announce(t){const el=document.getElementById("qzLive");if(el){el.textContent="";setTimeout(()=>{el.textContent=t},30)}}
const markIcon=ok=>`<span class="ms fill qz-mark" aria-hidden="true">${ok?"check_circle":"cancel"}</span>`;
const isVisible=()=>{const v=document.getElementById("v-quiz"),g=document.getElementById("gate");return!!v&&v.classList.contains("active")&&(!g||g.hidden)};

/* ===== Laden: s1 bis s6 und lines.json, fehlende Datei = Stufe ohne Fragen ===== */
const isTextList=(a,min,max)=>Array.isArray(a)&&a.length>=min&&a.length<=max&&a.every(x=>typeof x==="string"&&x);
const isIndex=(a,len)=>Number.isInteger(a)&&a>=0&&a<len;
const PLAYABLE={
 mc:q=>isTextList(q.o,2,6)&&isIndex(q.a,q.o.length),
 gap:q=>isTextList(q.o,2,6)&&isIndex(q.a,q.o.length),
 prompt:q=>isTextList(q.o,2,2)&&isIndex(q.a,2),
 tf:q=>typeof q.a==="boolean",
 order:q=>isTextList(q.items,2,8),
 match:q=>Array.isArray(q.pairs)&&q.pairs.length>=2&&q.pairs.every(p=>isTextList(p,2,2)),
 spot:q=>isTextList(q.lines,2,8)&&isIndex(q.a,q.lines.length)
};
const isPlayable=q=>!!q&&typeof q.id==="string"&&typeof q.q==="string"&&Object.hasOwn(PLAYABLE,q.type)&&PLAYABLE[q.type](q);
const versionTag=()=>encodeURIComponent((api.C.version&&api.C.version.version)||"dev");
async function fetchJson(name){try{const r=await fetch(`content/play/${name}.json?v=${versionTag()}`);return r.ok?await r.json():null}catch(e){return null}}
async function loadBank(){
  loadState="loading";render();
  const data=await Promise.all([...STAGE_NUMBERS.map(n=>"s"+n),"lines"].map(fetchJson));
  STAGE_NUMBERS.forEach((n,i)=>{bank[n]=Array.isArray(data[i])?data[i].filter(isPlayable).map(q=>({q,s:n})):[]});
  const lines=data[STAGE_COUNT];LINES=lines&&typeof lines==="object"?lines:{};
  loadState=STAGE_NUMBERS.some(n=>bank[n].length)?"ready":"error";
  render();
}

/* ===== Stufen-Auswahl ===== */
const stageAvailable=n=>!!bank[n]&&bank[n].length>0&&!(api.isDemo()&&n>1);
/* Erreicht = Stufe 1 oder die vorherige Stufe ist im Lernpfad abgeschlossen */
const stageLearned=n=>n===1||!!api.stageDone(api.STAGES[n-2]);
function defaultSelection(){
  const ok=STAGE_NUMBERS.filter(stageAvailable),learned=ok.filter(stageLearned);
  const n=learned.length?learned[learned.length-1]:ok[0];
  return new Set(n?[n]:[]);
}
function ensureSelection(){
  if(!selected||!selectionTouched)selected=defaultSelection();
  [...selected].forEach(n=>{if(!stageAvailable(n))selected.delete(n)});
  if(!selected.size)selected=defaultSelection();
}
const selectedItems=()=>[...selected].sort((a,b)=>a-b).flatMap(n=>bank[n]);

/* ===== Statistik in done._quiz (nur mit Profil, nie in der Demo) ===== */
const canTrack=()=>!api.isDemo()&&!!api.profile();
const emptyStats=()=>({hs:0,games:0,answered:0,correct:0,bestStreak:0,duels:0,duelWins:0,byStage:{},byType:{},byTopic:{},days:{},wrong:[],badges:[]});
function stats(){
  const d=api.getDone();
  if(!d._quiz||typeof d._quiz!=="object"||Array.isArray(d._quiz))d._quiz=emptyStats();
  const s=d._quiz,base=emptyStats();
  Object.keys(base).forEach(k=>{if(typeof s[k]!==typeof base[k]||Array.isArray(s[k])!==Array.isArray(base[k]))s[k]=base[k]});
  return s;
}
const currentHs=()=>canTrack()?stats().hs:demoHs;
function bump(map,key,ok){const e=map[key]||(map[key]={a:0,c:0});e.a++;if(ok)e.c++}
function pruneDays(days){const from=new Date();from.setDate(from.getDate()-(DAYS_KEEP-1));const min=dateKey(from);Object.keys(days).forEach(k=>{if(k<min)delete days[k]})}
function recordAnswer(item,ok,streak){
  if(!canTrack())return;
  const s=stats(),q=item.q;
  s.answered++;if(ok)s.correct++;
  if(streak)s.bestStreak=Math.max(s.bestStreak,streak);
  bump(s.byStage,String(item.s),ok);bump(s.byType,q.type,ok);bump(s.byTopic,q.topic||"Allgemein",ok);bump(s.days,dateKey(new Date()),ok);pruneDays(s.days);
  s.wrong=s.wrong.filter(id=>id!==q.id);
  if(!ok){s.wrong.push(q.id);if(s.wrong.length>WRONG_MAX)s.wrong=s.wrong.slice(-WRONG_MAX)}
  commit();
}
/* Neue Abzeichen vergeben, speichern und melden */
function commit(){
  const s=stats(),fresh=BADGES.filter(b=>!s.badges.includes(b.id)&&BADGE_TESTS[b.id](s));
  fresh.forEach(b=>s.badges.push(b.id));
  api.save();
  if(fresh.length)api.toast("Quiz-Abzeichen: "+fresh.map(b=>b.name).join(", "));
}

/* ===== Fragen vorbereiten: Optionen einmal mischen, richtigen Index mitführen (tf und spot bleiben fix) ===== */
function prepare(q){
  if(q.type==="mc"||q.type==="gap"||q.type==="prompt"){const order=shuffle(range(q.o.length));return{order,correct:order.indexOf(q.a)}}
  if(q.type==="order")return{order:shuffleAway(range(q.items.length))};
  if(q.type==="match")return{right:shuffleAway(range(q.pairs.length))};
  return{};
}
function setCurrent(item,vm){
  const isMatch=item.q.type==="match";
  game.cur={item,vm};game.answered=false;game.res=null;game.pick=[];
  game.links=isMatch?item.q.pairs.map(()=>-1):[];game.sel=isMatch?0:null;
  screen="play";
}
/* Falsch beantwortete Fragen früher einstreuen: jede zweite Frage am Anfang stammt aus der Fehlerliste */
function buildDeck(last){
  const items=selectedItems(),wrongIds=new Set(canTrack()?stats().wrong:[]);
  const weak=shuffle(items.filter(i=>wrongIds.has(i.q.id))),rest=shuffle(items.filter(i=>!wrongIds.has(i.q.id)));
  const deck=[];
  while(weak.length||rest.length)deck.push(rest.length&&(deck.length%2===0||!weak.length)?rest.shift():weak.shift());
  if(last&&deck.length>1&&deck[0]===last)[deck[0],deck[1]]=[deck[1],deck[0]];
  return deck;
}

/* ===== Solo ===== */
const soloKey=()=>{const p=api.profile();return p?api.avatarKey(p):"gast"};
function startSolo(){
  game={kind:"solo",lives:LIVES,score:0,streak:0,bestStreak:0,asked:0,deck:buildDeck(null),last:null,perStage:{}};
  nextSolo();
}
function nextSolo(){
  if(!game.deck.length)game.deck=buildDeck(game.last);
  const item=game.deck.shift();game.last=item;game.asked++;
  setCurrent(item,prepare(item.q));showQuestion();
}
function scoreSolo(ok,item){
  const st=game.perStage[item.s]||(game.perStage[item.s]={a:0,c:0});st.a++;
  if(ok){
    game.streak++;game.bestStreak=Math.max(game.bestStreak,game.streak);st.c++;
    const mult=multiplierFor(game.streak),gain=POINTS*mult;game.score+=gain;
    game.fx={kind:"right",gain,combo:COMBO_BANNERS.includes(game.streak)?mult:0};
  }else{game.streak=0;game.lives--;game.fx={kind:"wrong",lost:game.lives}}
  game.line=line(ok?(game.fx.combo?"combo":"right"):"wrong");
  recordAnswer(item,ok,game.bestStreak);
}
function endSolo(){
  const newHs=game.score>0&&game.score>currentHs();
  if(canTrack()){const s=stats();s.games++;if(newHs)s.hs=game.score;s.bestStreak=Math.max(s.bestStreak,game.bestStreak);commit()}
  else if(newHs)demoHs=game.score;
  game.result={newHs,line:line(newHs?"highscore":"gameover")};
  screen="soloEnd";render();focusHeading();
  if(newHs&&!reducedMotion())api.confetti(true);
}

/* ===== Duell ===== */
function p1Name(){if(api.isDemo())return"Gast";const p=api.profile();return p?p.user:"Spieler 1"}
function cleanNames(){
  const used=new Set();
  return players.map((p,i)=>{
    const base=String(p||"").trim().slice(0,NAME_MAX)||`Spieler ${i+1}`;let n=base,k=2;
    while(used.has(n.toLowerCase()))n=`${base} ${k++}`;
    used.add(n.toLowerCase());return n;
  });
}
const playerKey=i=>i===0&&game.track?soloKey():"duell-"+game.players[i].name;
function startDuel(){
  players=cleanNames();
  const p=api.profile(),track=canTrack()&&!!p&&players[0].toLowerCase()===p.user.toLowerCase();
  const qs=shuffle(selectedItems()).slice(0,duelCount).map(item=>({item,vm:prepare(item.q)}));
  game={kind:"duel",players:players.map(name=>({name,score:0})),qs,round:0,turn:0,track};
  screen="handover";render();focusReady();
}
function scoreDuel(ok,item){
  const p=game.players[game.turn];
  if(ok){p.score+=POINTS;game.fx={kind:"right",gain:POINTS}}else game.fx={kind:"wrong"};
  game.line=line(ok?"right":"wrong");
  if(game.track&&game.turn===0)recordAnswer(item,ok,0);
}
/* Wettkampf-Rangfolge: gleiche Punkte = gleicher Platz */
function ranking(ps){return ps.slice().sort((a,b)=>b.score-a.score).map(p=>({p,place:1+ps.filter(o=>o.score>p.score).length}))}
function advanceDuel(){
  game.turn++;
  if(game.turn>=game.players.length){game.turn=0;game.round++}
  if(game.round>=game.qs.length)return endDuel();
  screen="handover";render();focusReady();
}
function endDuel(){
  const top=Math.max(...game.players.map(p=>p.score)),leaders=game.players.filter(p=>p.score===top),tie=leaders.length>1;
  if(game.track){const s=stats();s.duels++;if(!tie&&leaders[0]===game.players[0])s.duelWins++;commit()}
  game.result={tie,line:line(tie?"tie":"duel")};
  screen="duelEnd";render();focusHeading();
  if(!reducedMotion())api.confetti(true);
}

/* ===== Antworten ===== */
const isLastStep=()=>game.kind==="solo"?game.lives<=0:game.turn===game.players.length-1&&game.round===game.qs.length-1;
function answer(ok,chosen){
  if(game.answered)return;
  const item=game.cur.item;
  game.answered=true;game.res={ok,chosen};
  if(game.kind==="solo")scoreSolo(ok,item);else scoreDuel(ok,item);
  render();
  announce(`${ok?"Richtig.":"Falsch."} ${game.line} ${ok?"":solutionText(item.q)} ${item.q.x}`);
  const next=document.getElementById("qzNext");if(next)next.focus({preventScroll:true});
  const fb=root().querySelector(".qz-fb");if(fb)fb.scrollIntoView({block:"nearest",behavior:reducedMotion()?"auto":"smooth"});
  if(ok&&game.kind==="solo"&&!reducedMotion())api.confetti();
}
function chooseOption(k){
  const {item,vm}=game.cur,q=item.q;
  const ok=q.type==="tf"?(k===0)===q.a:q.type==="spot"?k===q.a:k===vm.correct;
  answer(ok,k);
}
function pickOrder(ix){
  if(game.pick.includes(ix))return;
  game.pick.push(ix);rerender(".qz-opt:not(:disabled)","#qzCheck");
}
function undoOrder(){game.pick.pop();rerender(".qz-opt:not(:disabled)")}
function pickLeft(i){
  if(game.links[i]>=0)game.links[i]=-1;
  game.sel=game.sel===i?null:i;rerender(`[data-l="${i}"]`);
}
function pickRight(r){
  if(game.sel===null){announce("Tippe zuerst links einen Begriff an.");return}
  const prev=game.links.indexOf(r);if(prev>=0)game.links[prev]=-1;
  game.links[game.sel]=r;
  const open=game.links.indexOf(-1);game.sel=open>=0?open:null;
  rerender(game.sel!==null?`[data-l="${game.sel}"]`:"#qzCheck");
}
function checkAnswer(){
  const q=game.cur.item.q;
  if(q.type==="order")answer(game.pick.every((ix,pos)=>ix===pos),null);
  else if(q.type==="match")answer(game.links.every((r,i)=>r===i),null);
}
function next(){
  if(!game||!game.answered)return;
  if(game.kind==="solo"){if(game.lives<=0)endSolo();else nextSolo()}
  else advanceDuel();
}
function solutionText(q){
  if(q.type==="tf")return`Richtig ist: ${q.a?"Wahr":"Falsch"}.`;
  if(q.type==="order")return"Richtige Reihenfolge: "+q.items.map((t,i)=>`${i+1}. ${t}`).join(" ");
  if(q.type==="match")return"Richtige Paare: "+q.pairs.map(p=>`${p[0]}: ${p[1]}`).join("; ");
  if(q.type==="spot")return`Gesucht war: «${q.lines[q.a]}»`;
  return`Richtig ist: «${q.o[q.a]}»`;
}
function solutionHtml(q){
  if(q.type==="order")return`<p>Richtige Reihenfolge:</p><ol>${q.items.map(t=>`<li>${esc(t)}</li>`).join("")}</ol>`;
  if(q.type==="match")return`<p>Richtige Paare:</p><ul>${q.pairs.map(p=>`<li><b>${esc(p[0])}</b>: ${esc(p[1])}</li>`).join("")}</ul>`;
  return`<p>${esc(solutionText(q))}</p>`;
}

/* ===== Darstellung: Kartenkörper je Fragetyp ===== */
const optState=(k,correctK)=>{if(!game.answered)return"";if(k===correctK)return" right";return k===game.res.chosen?" wrong":" dim"};
const optMark=(k,correctK)=>game.answered&&(k===correctK||k===game.res.chosen)?markIcon(k===correctK):"";
const dis=()=>game.answered?" disabled":"";
function choiceButtons(texts,correctK,extra){
  return texts.map((t,k)=>`<button type="button" class="qz-opt${optState(k,correctK)}" data-k="${k}"${dis()}>${extra?extra(k):""}<span class="qz-ot">${esc(t)}</span>${optMark(k,correctK)}</button>`).join("");
}
const BODY={
  mc:(q,vm)=>`<div class="qz-opts">${choiceButtons(vm.order.map(i=>q.o[i]),vm.correct)}</div>`,
  gap:(q,vm)=>`<div class="qz-opts">${choiceButtons(vm.order.map(i=>q.o[i]),vm.correct)}</div>`,
  prompt:(q,vm)=>`<div class="qz-opts qz-prompts">${choiceButtons(vm.order.map(i=>`«${q.o[i]}»`),vm.correct,k=>`<span class="qz-lbl">Prompt ${"AB"[k]}</span>`)}</div>`,
  tf:q=>`<div class="qz-opts qz-tf">${choiceButtons(["Wahr","Falsch"],q.a?0:1,k=>`<span class="ms" aria-hidden="true">${k?"close":"check"}</span>`)}</div>`,
  spot:q=>`<div class="qz-opts">${choiceButtons(q.lines,q.a,k=>`<span class="qz-num">${k+1}</span>`)}</div>`,
  order:(q,vm)=>`<p class="meta qz-hint">Tippe die Schritte in der richtigen Reihenfolge an.</p><div class="qz-opts">${vm.order.map(ix=>{
    const pos=game.pick.indexOf(ix),on=pos>=0,res=game.answered?(pos===ix?" right":" wrong"):"";
    return`<button type="button" class="qz-opt${on?" picked":""}${res}" data-o="${ix}"${on||game.answered?" disabled":""}><span class="qz-num">${on?pos+1:""}</span><span class="qz-ot">${esc(q.items[ix])}</span>${game.answered?markIcon(pos===ix):""}</button>`}).join("")}</div>`,
  match:(q,vm)=>{
    const left=q.pairs.map((p,i)=>{
      const r=game.links[i],linked=r>=0,sel=game.sel===i&&!game.answered,res=game.answered?(r===i?" right":" wrong"):"";
      return`<button type="button" class="qz-mi${linked?` linked qz-p${i%PAIR_COLORS}`:""}${sel?" sel":""}${res}" data-l="${i}" aria-pressed="${sel}"${dis()}><span class="qz-dot">${i+1}</span><span class="qz-ot">${esc(p[0])}</span>${game.answered?markIcon(r===i):""}</button>`}).join("");
    const right=vm.right.map(r=>{
      const o=game.links.indexOf(r),linked=o>=0;
      return`<button type="button" class="qz-mi${linked?` linked qz-p${o%PAIR_COLORS}`:""}" data-r="${r}"${dis()}${linked?` aria-label="${esc(q.pairs[r][1])}, verbunden mit ${o+1}"`:""}><span class="qz-dot">${linked?o+1:""}</span><span class="qz-ot">${esc(q.pairs[r][1])}</span></button>`}).join("");
    return`<p class="meta qz-hint">Tippe links einen Begriff und dann rechts die passende Erklärung.</p><div class="qz-match"><div class="qz-col" role="group" aria-label="Begriffe">${left}</div><div class="qz-col" role="group" aria-label="Erklärungen">${right}</div></div>`;
  }
};
function questionHtml(q){
  const t=esc(q.q);
  if(q.type!=="gap")return t;
  return t.replace("___",`<span class="qz-gap">${game.answered?esc(q.o[q.a]):'<span class="qz-sr">Lücke</span>'}</span>`);
}
function actionsHtml(q){
  if(game.answered){
    const lbl=isLastStep()?(game.kind==="solo"?"Auswertung":"Zur Rangliste"):"Weiter";
    return`<button type="button" class="filled" id="qzNext" data-act="next">${lbl}<span class="ms">arrow_forward</span></button>`;
  }
  if(q.type==="order")return`<button type="button" class="textbtn" data-act="undo"${game.pick.length?"":" disabled"}><span class="ms">undo</span>Rückgängig</button><button type="button" class="filled" id="qzCheck" data-act="check"${game.pick.length===q.items.length?"":" disabled"}>Prüfen</button>`;
  if(q.type==="match")return`<button type="button" class="filled" id="qzCheck" data-act="check"${game.links.every(r=>r>=0)?"":" disabled"}>Prüfen</button>`;
  return"";
}
function feedbackHtml(q){
  const ok=game.res.ok;
  return`<div class="qz-fb ${ok?"ok":"bad"}"><span class="ms fill" aria-hidden="true">${ok?"check_circle":"cancel"}</span><div><b>${esc(game.line)}</b>${ok?"":solutionHtml(q)}<p class="qz-x">${esc(q.x)}</p></div></div>`;
}
function comboHtml(){
  return`<div class="qz-combo" aria-hidden="true"><span class="ms fill">local_fire_department</span>${game.streak} in Folge · ×${game.fx.combo}</div>`;
}
function cardHtml(){
  const {item,vm}=game.cur,q=item.q,fx=game.fx||{};
  return`<article class="qz-card${fx.kind==="wrong"?" shake":""}" style="--lc:var(--l${item.s});--lcc:var(--c${item.s})">
    ${fx.combo?comboHtml():""}
    <div class="qz-meta"><span class="qz-type"><span class="ms" aria-hidden="true">${TYPE_ICON[q.type]}</span>${TYPE_LABEL[q.type]}</span><span class="qz-where">Stufe ${item.s} · ${esc(q.topic||"")}</span></div>
    <h3 class="qz-q" tabindex="-1">${questionHtml(q)}</h3>
    <div class="qz-body">${BODY[q.type](q,vm)}</div>
    ${game.answered?feedbackHtml(q):""}
    <div class="qz-actions">${actionsHtml(q)}</div>
  </article>`;
}
function mascot(key,fx){
  return`<span class="qz-mascot${fx?" "+fx:""}" aria-hidden="true"><span class="qz-monkey">${api.monkeySVG(key)}</span><span class="qz-peel">${PEEL_SVG}</span></span>`;
}
const fxClass=fx=>fx.kind==="right"?"jump":fx.kind==="wrong"?"slip":"";
const gainHtml=fx=>fx.kind==="right"?`<span class="qz-gain" aria-hidden="true">+${fx.gain}</span>`:"";
function soloHud(){
  const fx=game.fx||{},mult=multiplierFor(game.streak);
  const lives=range(LIVES).map(i=>`<span class="qz-life${i<game.lives?"":" gone"}">${BANANA_SVG}${fx.kind==="wrong"&&fx.lost===i?`<span class="qz-fly">${BANANA_SVG}</span>`:""}</span>`).join("");
  return`<div class="qz-hud" role="group" aria-label="Spielstand">
    <span class="qz-lives" role="img" aria-label="${game.lives} von ${LIVES} Leben">${lives}</span>
    <span class="qz-stat"><span class="ms fill" aria-hidden="true">stars</span><b>${game.score}</b><span class="qz-unit">&nbsp;Punkte</span>${gainHtml(fx)}</span>
    <span class="qz-stat${game.streak>=COMBO_BANNERS[0]?" hot":""}"><span class="ms fill" aria-hidden="true">local_fire_department</span>Serie ${game.streak}${mult>1?`&nbsp;<b>×${mult}</b>`:""}</span>
    ${mascot(soloKey(),fxClass(fx))}
  </div>`;
}
function rankList(fx){
  const cur=game.players[game.turn];
  return`<ol class="qz-rank" aria-label="Rangliste">${ranking(game.players).map(r=>`<li class="${r.p===cur?"cur":""}"><span class="qz-pl">${r.place}.</span><span class="qz-nm">${esc(r.p.name)}</span><b>${r.p.score}</b>${r.p===cur?gainHtml(fx):""}</li>`).join("")}</ol>`;
}
function duelHud(){
  const fx=game.fx||{};
  return`<div class="qz-hud duel" role="group" aria-label="Spielstand">${rankList(fx)}${mascot(playerKey(game.turn),fxClass(fx))}</div>`;
}
function playHtml(){
  const info=game.kind==="solo"?`Frage ${game.asked}`:`Runde ${game.round+1} von ${game.qs.length} · ${esc(game.players[game.turn].name)} ist dran`;
  return`${game.kind==="solo"?soloHud():duelHud()}<div class="qz-bar"><span class="meta">${info}</span><button type="button" class="textbtn" data-act="quit"><span class="ms">close</span>Aufhören</button></div>${cardHtml()}`;
}
function handoverHtml(){
  const p=game.players[game.turn];
  return`<div class="qz-hud duel" role="group" aria-label="Spielstand">${rankList({})}</div>
  <article class="qz-card qz-center qz-handover">
    <span class="eyebrow">Runde ${game.round+1} von ${game.qs.length}</span>
    <span class="qz-monkey qz-big">${api.monkeySVG(playerKey(game.turn))}</span>
    <h3 class="qz-q" tabindex="-1">Jetzt ist ${esc(p.name)} dran</h3>
    <p class="meta">Gerät weitergeben. Die anderen schauen kurz weg, versprochen?</p>
    <button type="button" class="filled qz-big-btn" id="qzReady" data-act="ready">Bereit<span class="ms">play_arrow</span></button>
  </article>`;
}
function soloEndHtml(){
  const r=game.result;
  const rows=Object.keys(game.perStage).sort().map(n=>{const s=game.perStage[n];return`<li style="--lc:var(--l${n})"><span>Stufe ${n}</span><b>${s.c} von ${s.a} richtig</b></li>`}).join("");
  return`<article class="qz-card qz-center qz-end">
    <div class="qz-fallen" aria-hidden="true"><span class="qz-peel">${PEEL_SVG}</span><span class="qz-monkey">${api.monkeySVG(soloKey())}</span><span class="qz-peel">${PEEL_SVG}</span></div>
    ${r.newHs?`<div class="qz-trophy" aria-hidden="true"><span class="ms fill">emoji_events</span></div>`:""}
    <h3 class="qz-q" tabindex="-1">${r.newHs?"Neuer Highscore!":"Runde vorbei"}</h3>
    <p class="qz-final"><b>${game.score}</b> Punkte</p>
    <p>${esc(r.line)}</p>
    <p class="meta">Highscore ${currentHs()} · Beste Serie ${game.bestStreak} · ${game.asked} ${game.asked===1?"Frage":"Fragen"}</p>
    ${rows?`<ul class="qz-stagestats">${rows}</ul>`:""}
    ${api.isDemo()?demoNote():""}
    <div class="qz-actions qz-actions-center"><button type="button" class="filled" data-act="again"><span class="ms">replay</span>Nochmal</button><button type="button" class="tonal" data-act="back"><span class="ms">tune</span>Stufen ändern</button></div>
  </article>`;
}
function duelEndHtml(){
  const r=game.result,ranked=ranking(game.players);
  const keyOf=p=>playerKey(game.players.indexOf(p));
  const podium=[2,1,3].map(place=>{
    const g=ranked.filter(x=>x.place===place);if(!g.length)return"";
    return`<div class="qz-step p${place}"><div class="qz-who">${g.map(x=>`<span class="qz-monkey">${api.monkeySVG(keyOf(x.p))}</span><b>${esc(x.p.name)}</b>`).join("")}</div><div class="qz-block"><span class="qz-place">${place}</span><span>${g[0].p.score} Punkte</span></div></div>`}).join("");
  const rest=ranked.filter(x=>x.place>3);
  return`<article class="qz-card qz-center qz-end">
    <h3 class="qz-q" tabindex="-1">${r.tie?"Gleichstand an der Spitze!":"Sieg für "+esc(ranked[0].p.name)+"!"}</h3>
    <div class="qz-podium">${podium}</div>
    ${rest.length?`<ul class="qz-stagestats">${rest.map(x=>`<li><span>${x.place}. ${esc(x.p.name)}</span><b>${x.p.score} Punkte</b></li>`).join("")}</ul>`:""}
    <p>${esc(r.line)}</p>
    <div class="qz-actions qz-actions-center"><button type="button" class="filled" data-act="revenge"><span class="ms">replay</span>Revanche</button><button type="button" class="tonal" data-act="back"><span class="ms">arrow_back</span>Zurück</button></div>
  </article>`;
}
const demoNote=()=>`<p class="qz-note"><span class="ms" aria-hidden="true">lock</span>Mit Profil alle Stufen und deine Statistik</p>`;
function stageChips(){
  return STAGE_NUMBERS.map(n=>{
    const cnt=(bank[n]||[]).length,avail=stageAvailable(n),on=avail&&selected.has(n),fresh=avail&&!stageLearned(n);
    return`<button type="button" class="qz-chip" style="--lc:var(--l${n});--lcc:var(--c${n})" data-act="stage" data-n="${n}" aria-pressed="${on}"${avail?"":" disabled"}><b>Stufe ${n}${fresh?'<span class="ms" aria-hidden="true">explore</span>':""}</b><small>${cnt} ${cnt===1?"Frage":"Fragen"}${fresh?" · noch nicht gelernt":""}</small></button>`;
  }).join("");
}
function startHtml(){
  ensureSelection();
  if(!players)players=[p1Name(),"Spieler 2"];
  const fresh=STAGE_NUMBERS.filter(n=>stageAvailable(n)&&!stageLearned(n));
  const seg=[["solo","person","Solo"],["duel","groups","Duell"]].map(([v,icon,t])=>`<button type="button" data-act="mode" data-v="${v}" aria-pressed="${mode===v}"><span class="ms" aria-hidden="true">${icon}</span>${t}</button>`).join("");
  const canStart=selected.size>0;
  const solo=`<div class="qz-panel">
      <div class="qz-hsrow"><span class="ms fill" aria-hidden="true">emoji_events</span><span>Highscore <b>${currentHs()}</b></span></div>
      <ul class="qz-rules"><li>Drei Bananen als Leben, jeder Fehler kostet eine.</li><li>10 Punkte pro richtige Antwort.</li><li>Ab 3 richtigen in Folge doppelte, ab 6 dreifache Punkte.</li></ul>
      <button type="button" class="filled qz-big-btn" data-act="solo"${canStart?"":" disabled"}>Los geht's<span class="ms">play_arrow</span></button>
    </div>`;
  const duel=`<div class="qz-panel">
      <h3>Mitspielende</h3><p class="meta">2 bis 4 Personen am gleichen Gerät. Alle bekommen dieselben Fragen.</p>
      <div class="qz-players">${players.map((p,i)=>`<div class="qz-player"><span class="qz-pnum" aria-hidden="true">${i+1}</span><input type="text" class="qz-name" data-i="${i}" value="${esc(p)}" maxlength="${NAME_MAX}" aria-label="Name von Spieler ${i+1}" autocomplete="off">${players.length>DUEL_MIN?`<button type="button" class="iconbtn" data-act="remove" data-i="${i}" aria-label="Spieler ${i+1} entfernen"><span class="ms">close</span></button>`:""}</div>`).join("")}</div>
      ${players.length<DUEL_MAX?`<button type="button" class="textbtn" data-act="add"><span class="ms">person_add</span>Spieler hinzufügen</button>`:""}
      <h3 class="qz-sub">Fragen pro Person</h3>
      <div class="chiprow" role="group" aria-label="Fragen pro Person">${DUEL_COUNTS.map(c=>`<button type="button" class="chip${c===duelCount?" on":""}" data-act="count" data-c="${c}" aria-pressed="${c===duelCount}">${c} Fragen</button>`).join("")}</div>
      <button type="button" class="filled qz-big-btn" data-act="duel"${canStart?"":" disabled"}>Duell starten<span class="ms">sports_esports</span></button>
    </div>`;
  return`<div class="qz-intro">
      <span class="qz-monkey qz-big" aria-hidden="true">${api.monkeySVG(soloKey())}</span>
      <div><h2>Quiz</h2><p>Spielerisch üben: Quizfragen, Begriffe zuordnen, Reihenfolgen legen und Fehler in KI-Antworten finden. Allein gegen die Bananen oder im Duell mit Freunden.</p></div>
    </div>
    <div class="qz-seg" role="group" aria-label="Spielmodus">${seg}</div>
    <h3 class="qz-sub">Stufen</h3>
    <p class="meta">Wähle eine oder mehrere Stufen.</p>
    <div class="qz-stages">${stageChips()}</div>
    ${fresh.length?`<p class="qz-note"><span class="ms" aria-hidden="true">explore</span>Stufe ${fresh.join(", ")}: Noch nicht gelernt, trau dich trotzdem.</p>`:""}
    ${api.isDemo()?demoNote():""}
    ${mode==="solo"?solo:duel}`;
}
function loadHtml(){
  return loadState==="error"
    ?`<div class="qz-card qz-center"><p>Die Quizfragen konnten nicht geladen werden.</p><button type="button" class="filled" data-act="retry"><span class="ms">refresh</span>Nochmals versuchen</button></div>`
    :`<div class="qz-card qz-center" role="status"><span class="qz-spinner" aria-hidden="true"></span><p>Fragen werden geladen …</p></div>`;
}
const SCREENS={start:startHtml,handover:handoverHtml,play:playHtml,soloEnd:soloEndHtml,duelEnd:duelEndHtml};
function render(){
  const el=root();if(!el)return;
  el.innerHTML=loadState==="ready"?SCREENS[screen]():loadHtml();
  if(game)game.fx=null;
}
/* Neu zeichnen und den Fokus auf das passende Element setzen (erstes gefundenes) */
function rerender(...selectors){
  render();
  for(const s of selectors){const t=root().querySelector(s);if(t){t.focus();return}}
}
/* Höhe der fixierten Leisten oben (App-Leiste, Demo-Hinweis), damit die Kopfzeile des Spiels sichtbar bleibt */
function stickyOffset(){
  const bottoms=[".topbar","#demoBar"].map(s=>document.querySelector(s)).filter(el=>el&&!el.hidden).map(el=>el.getBoundingClientRect().bottom);
  return Math.max(0,...bottoms)+SCROLL_GAP;
}
function scrollToRoot(){
  const el=root();if(!el)return;
  const top=el.getBoundingClientRect().top,offset=stickyOffset();
  if(top<offset||top>innerHeight/2)window.scrollTo({top:Math.max(0,top+scrollY-offset)});
}
function focusHeading(){scrollToRoot();const h=root().querySelector(".qz-q");if(h)h.focus({preventScroll:true})}
function focusReady(){scrollToRoot();const b=document.getElementById("qzReady");if(b)b.focus({preventScroll:true})}
function showQuestion(){render();focusHeading()}

/* ===== Ereignisse (Delegation am Wurzelelement) ===== */
const ACTIONS={
  mode:b=>{mode=b.dataset.v;rerender(`[data-act="mode"][data-v="${mode}"]`)},
  stage:b=>{
    const n=+b.dataset.n;
    if(selected.has(n)){if(selected.size===1){announce("Mindestens eine Stufe muss gewählt sein.");return}selected.delete(n)}else selected.add(n);
    selectionTouched=true;rerender(`[data-act="stage"][data-n="${n}"]`);
  },
  count:b=>{duelCount=+b.dataset.c;rerender(`[data-act="count"][data-c="${duelCount}"]`)},
  add:()=>{if(players.length>=DUEL_MAX)return;players.push(`Spieler ${players.length+1}`);rerender(`.qz-name[data-i="${players.length-1}"]`);const inp=root().querySelector(`.qz-name[data-i="${players.length-1}"]`);if(inp)inp.select()},
  remove:b=>{if(players.length<=DUEL_MIN)return;players.splice(+b.dataset.i,1);rerender('[data-act="add"]',".qz-name")},
  solo:()=>startSolo(),
  duel:()=>startDuel(),
  ready:()=>{const c=game.qs[game.round];setCurrent(c.item,c.vm);showQuestion()},
  undo:()=>undoOrder(),
  check:()=>checkAnswer(),
  next:()=>next(),
  quit:()=>{game=null;screen="start";rerender('[data-act="mode"][aria-pressed="true"]')},
  again:()=>startSolo(),
  revenge:()=>startDuel(),
  back:()=>{game=null;screen="start";render();focusHeading()},
  retry:()=>loadBank()
};
function onClick(e){
  const b=e.target.closest("button");
  if(!b||b.disabled||!root().contains(b))return;
  const act=b.dataset.act;
  if(act){if(Object.hasOwn(ACTIONS,act))ACTIONS[act](b);return}
  if(screen!=="play"||!game||game.answered)return;
  if(b.dataset.k!==undefined)chooseOption(+b.dataset.k);
  else if(b.dataset.o!==undefined)pickOrder(+b.dataset.o);
  else if(b.dataset.l!==undefined)pickLeft(+b.dataset.l);
  else if(b.dataset.r!==undefined)pickRight(+b.dataset.r);
}
function onInput(e){const t=e.target;if(t.classList&&t.classList.contains("qz-name")&&players)players[+t.dataset.i]=t.value}
/* Enter oder Leertaste führt nach einer Antwort weiter, auch wenn der Fokus nicht auf «Weiter» liegt */
function onKey(e){
  if(e.key!=="Enter"&&e.key!==" ")return;
  if(!isVisible()||screen!=="play"||!game||!game.answered)return;
  if(e.target.closest&&e.target.closest("button,input,textarea,select,a,summary"))return;
  e.preventDefault();next();
}

/* ===== Öffentliche Schnittstelle ===== */
function init(a){
  api=a;const el=root();if(!el)return;
  el.addEventListener("click",onClick);el.addEventListener("input",onInput);document.addEventListener("keydown",onKey);
}
function onShow(){
  if(!api||!root())return;
  if(loadState==="idle"){loadBank();return}
  if(loadState==="ready"&&screen==="start")render();
}
/* Nach Anmelden, Abmelden oder Demo: laufendes Spiel abbrechen, Startbildschirm mit Standardauswahl */
function reset(){
  game=null;screen="start";mode="solo";selected=null;selectionTouched=false;players=null;
  if(api&&loadState==="ready")render();
}
window.QuizGame={init,onShow,reset,BADGES:BADGES.map(b=>({...b})),TYPE_LABEL:{...TYPE_LABEL}};
})();
