const today = new Date();
const dayNum = Math.floor((Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()) - Date.UTC(2026,0,1))/864e5);
const SECRET = WORDS[((dayNum % WORDS.length)+WORDS.length)%WORDS.length].toUpperCase();
const KEY = "wh-today";
const $ = id => document.getElementById(id);
let guesses=[], cur="", locked=[], over=false, results=[];

const save = () => { try{localStorage.setItem(KEY,JSON.stringify({d:today.toDateString(),guesses,locked,over,results}))}catch(e){} };
try{const s=JSON.parse(localStorage.getItem(KEY)||"null"); if(s&&s.d===today.toDateString()){guesses=s.guesses;locked=s.locked;over=s.over;results=s.results}}catch(e){}

// build board
const board=$("board");
for(let r=0;r<6;r++){const row=document.createElement("div");row.className="row";for(let c=0;c<5;c++){const t=document.createElement("div");t.className="tile";row.appendChild(t)}board.appendChild(row)}
// build keyboard
const kb=$("kb");
["QWERTYUIOP","ASDFGHJKL","ZXCVBNM"].forEach((letters,i)=>{
  const row=document.createElement("div");row.className="krow";
  if(i===2)row.appendChild(mk("Enter","ENTER",true));
  [...letters].forEach(l=>row.appendChild(mk(l,l)));
  if(i===2)row.appendChild(mk("⌫","BACK",true));
  kb.appendChild(row);
});
function mk(label,val,wide){const b=document.createElement("button");b.className="key"+(wide?" wide":"");b.textContent=label;b.dataset.k=val;b.onclick=()=>press(val);return b}

function score(g){
  const res=Array(5).fill("miss"), pool=[...SECRET];
  for(let i=0;i<5;i++) if(g[i]===SECRET[i]){res[i]="hit";pool[i]=null}
  for(let i=0;i<5;i++) if(res[i]==="miss"){const j=pool.indexOf(g[i]); if(j>-1){res[i]="near";pool[j]=null}}
  return res;
}
function render(){
  const rows=board.children;
  for(let r=0;r<6;r++){
    for(let c=0;c<5;c++){
      const t=rows[r].children[c]; let ch="",cls="tile";
      if(r<guesses.length){ch=guesses[r][c];cls+=" "+results[r][c]}
      else if(r===guesses.length&&!over){ch=cur[c]||"";if(ch)cls+=" fill"}
      t.textContent=ch;t.className=cls;
    }
  }
  const best={};
  guesses.forEach((g,r)=>[...g].forEach((l,i)=>{const s=results[r][i];const rank={miss:1,near:2,hit:3};if(!best[l]||rank[s]>rank[best[l]])best[l]=s}));
  kb.querySelectorAll(".key").forEach(k=>{
    const l=k.dataset.k; if(l.length>1)return;
    k.className="key"+(best[l]?" "+best[l]:"")+(locked.includes(l)&&!over?" locked":"");
  });
  if(over)showEnd();
}
function say(t,warn){const m=$("msg");m.textContent=t;m.className=warn?"warn":""}
function press(k){
  if(over)return;
  if(k==="BACK"){cur=cur.slice(0,-1);render();return}
  if(k==="ENTER"){submit();return}
  if(locked.includes(k)){say("Key "+k+" is locked by the lasers.",true);return}
  if(cur.length<5){cur+=k;render()}
}
function submit(){
  if(cur.length<5){say("Need 5 letters.",true);return}
  const g=cur, res=score(g);
  guesses.push(g);results.push(res);cur="";
  if(g===SECRET){over=true;finish(true)}
  else if(guesses.length===6){over=true;finish(false)}
  else{
    // lock 2 random letters that are NOT in the code (keeps it fair)
    const pool=[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].filter(l=>!SECRET.includes(l)&&!guesses.join("").includes(l));
    locked=[];while(locked.length<2&&pool.length){locked.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0])}
    say("Lasers sweep! Locked: "+locked.join(", "),true);
  }
  save();render();
}
function finish(won){
  try{
    const s=JSON.parse(localStorage.getItem("wh-stats")||"{}");
    const y=new Date(today);y.setDate(y.getDate()-1);
    if(s.last!==today.toDateString()){
      s.streak=won?(s.last===y.toDateString()?(s.streak||0)+1:1):0;
      s.best=Math.max(s.best||0,s.streak||0);
      if(won)s.wins=(s.wins||0)+1;
      s.last=today.toDateString();
      localStorage.setItem("wh-stats",JSON.stringify(s));
    }
  }catch(e){}
}
function showEnd(){
  const won=guesses[guesses.length-1]===SECRET;
  $("end").className="panel show";
  $("endTitle").textContent=won?"Vault cracked in "+guesses.length+"/6":"Alarm tripped. The code was "+SECRET;
  const emoji={hit:"🟩",near:"🟨",miss:"⬛"};
  const g=results.map(r=>r.map(x=>emoji[x]).join("")).join("\n");
  $("grid").textContent=g;
  $("share").onclick=()=>{
    const text="Word Heist #"+(dayNum+1)+" "+(won?guesses.length:"X")+"/6\n"+g;
    (navigator.clipboard?navigator.clipboard.writeText(text):Promise.reject()).then(()=>say("Result copied.")).catch(()=>say("Copy not supported here.",true));
  };
}
document.addEventListener("keydown",e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==="Enter")press("ENTER");
  else if(e.key==="Backspace")press("BACK");
  else if(/^[a-z]$/i.test(e.key))press(e.key.toUpperCase());
});
render();
