(async()=>{try{
const CUR=await fetch("cur.json",{cache:"no-store"}).then(r=>r.json());
const HIST=DATA.hist, SEASON=2026, PLAYOFF_TEAMS=6, CURRENT_WEEK=CUR.week, AS_OF=CUR.asOf;
const clean=s=>String(s).replace(/\s+/g," ").trim();
const COLORS={1:"#1d4ed8",2:"#b91c1c",3:"#7c3aed",4:"#0e7490",5:"#c2410c",6:"#4d7c0f",7:"#be123c",8:"#a16207",9:"#0f766e",10:"#475569"};
/* CUR.teams rows: [id,name,abbrev,owner,w,l,pf,pa,seed,divId,divW,divL] */
const TEAMS=CUR.teams.map(r=>({id:r[0],name:clean(r[1]).replace(/\u2019/g,"'"),abbr:clean(r[2]),owner:clean(r[3]),color:COLORS[r[0]]||"#475569",rec:[r[4],r[5],r[6],r[7]],seed:r[8]}));
const DIV=Object.fromEntries(CUR.teams.map(r=>[r[0],[r[9],r[10],r[11]]]));
const NFL={0:"FA",1:"ATL",2:"BUF",3:"CHI",4:"CIN",5:"CLE",6:"DAL",7:"DEN",8:"DET",9:"GB",10:"TEN",11:"IND",12:"KC",13:"LV",14:"LAR",15:"MIA",16:"MIN",17:"NE",18:"NO",19:"NYG",20:"NYJ",21:"PHI",22:"ARI",23:"PIT",24:"LAC",25:"SF",26:"SEA",27:"TB",28:"WSH",29:"CAR",30:"JAX",33:"BAL",34:"HOU"};
const SLOT_ORDER=["QB","RB","WR","TE","FLEX","K","D/ST","BE","IR"];

const T=Object.fromEntries(TEAMS.map(t=>[t.id,t]));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const badge=(t,cls="")=>`<span class="badge ${cls}" style="background:${t.color}" aria-hidden="true">${esc(t.abbr.slice(0,4))}</span>`;
const f1=x=>(+x).toFixed(1), f2=x=>(+x).toFixed(2);
const ordinal=n=>{const s=["th","st","nd","rd"],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);};

/* Weeks from ESPN schedule */
const WK={};
for(const m of CUR.sched){
  const [w,a,fa,b,fb,win,tier,la,lb,pa,pb]=m;
  (WK[w]??={w,po:tier!=="NONE",games:[]}).games.push({a,b,fa,fb,win,la,lb,pa,pb,tier});
}
const WEEKS=Object.values(WK).sort((x,y)=>x.w-y.w), REG=WEEKS.filter(x=>!x.po);
const REG_WEEKS=REG.length, MAXW=WEEKS.at(-1).w;
const gStat=(g,w)=>["HOME","AWAY","TIE"].includes(g.win)?"final":w===CURRENT_WEEK&&((g.la||0)+(g.lb||0))>0?"live":"upcoming";
const status=w=>{const gs=WK[w].games.map(g=>gStat(g,w));return gs.every(x=>x==="final")?"final":gs.some(x=>x==="live")?"live":"upcoming";};
const lastFinal=Math.max(0,...REG.filter(x=>status(x.w)==="final").map(x=>x.w));

/* Standings: ESPN records and seeds; streak from results */
const ST=TEAMS.map(t=>{
  const log=[];
  for(const wk of REG){ if(status(wk.w)!=="final")continue;
    const g=wk.games.find(g=>g.a===t.id||g.b===t.id); if(!g)continue;
    const home=g.a===t.id; log.push((g.win==="HOME")===home?"W":"L"); }
  let k=0,last=log.at(-1);for(let j=log.length-1;j>=0&&log[j]===last;j--)k++;
  return {id:t.id,w:t.rec[0],l:t.rec[1],pf:t.rec[2],pa:t.rec[3],rank:t.seed,streak:last?last+k:"—"};
}).sort((x,y)=>x.rank-y.rank);
const byId=Object.fromEntries(ST.map(r=>[r.id,r]));
const rec=id=>`${byId[id].w}–${byId[id].l}`;

/* ---------- views ---------- */
function vMatchups(w){
  const wk=WK[w],st=status(w);
  const chips=WEEKS.map(x=>`<a href="#week-${x.w}" class="${x.w===w?"on":""} ${status(x.w)==="live"?"live":""}" aria-label="Week ${x.w}${x.po?" (playoffs)":""}" ${x.w===w?'aria-current="true"':""}>${x.po?"P"+(x.w-REG_WEEKS):x.w}</a>`).join("");
  const label={final:"Final",live:"In progress",upcoming:"Upcoming"}[st];
  const cards=wk.games.map(g=>{
    const gs=gStat(g,w);
    const cur=gs==="final"?[g.fa,g.fb]:gs==="live"?[g.la??0,g.lb??0]:null;
    const proj=gs!=="final"&&g.pa!=null?[g.pa,g.pb]:null;
    const side=(id,i)=>{
      const t=T[id];
      const won=gs==="final"&&((g.win==="HOME")===(i===0));
      const cls=gs==="final"?(won?"won":"lose"):"";
      return `<a class="side ${cls}" href="#team-${id}">${badge(t)}<div><div class="nm">${esc(t.name)}</div><div class="ow">${esc(t.owner)} · ${rec(id)}</div></div>
      <div class="score">${cur?f2(cur[i]):"—"}${proj&&proj[i]!=null?`<small>proj ${f1(proj[i])}</small>`:""}</div></a>`;
    };
    const basis=cur&&(cur[0]+cur[1])>0?cur:proj;
    const share=basis?basis[0]/(basis[0]+basis[1])*100:50;
    const tierName={WINNERS_BRACKET:"Playoffs",WINNERS_CONSOLATION_LADDER:"Consolation",LOSERS_CONSOLATION_LADDER:"Consolation"}[g.tier]||"";
    return `<article class="mu"><div class="st"><span>Week ${w}${tierName?" · "+tierName:""}</span>${gs==="live"?`<b>● Live</b>`:`<span>${{final:"Final",upcoming:"Upcoming"}[gs]}</span>`}</div>
      ${side(g.a,0)}${side(g.b,1)}<div class="bar" title="Share of points"><i style="width:${share.toFixed(1)}%"></i></div></article>`;
  }).join("");
  const note=(wk.po?"Playoffs. ":"")+(st==="live"?`Scores as of ${AS_OF}, with ESPN projections under each score.`:st==="upcoming"?"Scores appear once the week kicks off.":"Final scores from ESPN.");
  return `<h2>${wk.po?`Playoffs, round ${w-REG_WEEKS}`:`Week ${w} matchups`}</h2><p class="note">${note}</p>
  <div class="weekbar"><button class="arrow" data-step="-1" aria-label="Previous week">‹</button><div class="weeks" id="weeks">${chips}</div><button class="arrow" data-step="1" aria-label="Next week">›</button></div>
  <div class="grid">${cards}</div>`;
}

const DIVS=[{id:0,name:"East"},{id:1,name:"West"}];
let standMode="overall";try{standMode=localStorage.getItem("standMode")||"overall"}catch(e){}
if(!["overall","division","odds","luck"].includes(standMode))standMode="overall";
/* Clinching: try every win/loss outcome of the remaining games. Points tiebreakers can't be predicted,
   so a clinch assumes every tie goes against the team, and elimination assumes every tie goes its way. */
const STATUS=(()=>{
  const left=REG.flatMap(wk=>wk.games.filter(g=>gStat(g,wk.w)!=="final").map(g=>[g.a,g.b]));
  const ids=TEAMS.map(t=>t.id),base=Object.fromEntries(ST.map(r=>[r.id,r.w])),wild=PLAYOFF_TEAMS-DIVS.length;
  const res=Object.fromEntries(ids.map(id=>[id,{inAll:true,byeAll:true,outAll:true}]));
  const divOf=id=>DIV[id][0];
  for(let m=0;m<(1<<left.length);m++){
    const w={...base};left.forEach(([a,b],i)=>w[(m>>i)&1?a:b]++);
    for(const x of ids){
      const mates=ids.filter(id=>id!==x&&divOf(id)===divOf(x)),others=ids.filter(id=>divOf(id)!==divOf(x));
      const oWin=others.reduce((a,b)=>w[b]>w[a]?b:a);
      /* worst case for x */
      const winWorst=mates.every(id=>w[x]>w[id]);
      let pool=ids.filter(id=>id!==x&&id!==oWin);
      if(!winWorst){const myWin=mates.reduce((a,b)=>w[b]>w[a]?b:a);pool=pool.filter(id=>id!==myWin);}
      const inWorst=winWorst||pool.filter(id=>w[id]>=w[x]).length<wild;
      /* best case for x */
      const winBest=mates.every(id=>w[x]>=w[id]);
      let pool2=ids.filter(id=>id!==x&&id!==oWin);
      if(!winBest){const myWin=mates.reduce((a,b)=>w[b]>w[a]?b:a);pool2=pool2.filter(id=>id!==myWin);}
      const inBest=winBest||pool2.filter(id=>w[id]>w[x]).length<wild;
      const r=res[x];if(!winWorst)r.byeAll=false;if(!inWorst)r.inAll=false;if(inBest)r.outAll=false;
    }
  }
  return Object.fromEntries(ids.map(id=>{const r=res[id];return [id,r.byeAll?"bye":r.inAll?"in":r.outAll?"out":""]}));
})();
const CL_TAG={bye:'<span class="tag cl">Clinched bye</span>',in:'<span class="tag cl">Clinched</span>',out:'<span class="tag out">Eliminated</span>'};
const LEADERS=new Set(DIVS.map(dv=>ST.find(r=>DIV[r.id][0]===dv.id).id));
function standTable(list,showDiv){
  const rows=list.map(r=>{const t=T[r.id],d=DIV[r.id],bye=LEADERS.has(r.id);return `<tr class="${bye?"bye":r.rank<=PLAYOFF_TEAMS?"po":""}"><td class="n">${r.rank}</td>
  <td><a class="tl" href="#team-${r.id}">${badge(t)}<span>${esc(t.name)}</span>${STATUS[r.id]==="bye"?"":bye?'<span class="tag">Bye</span>':""}${CL_TAG[STATUS[r.id]]||""}</a></td>
  <td class="n">${r.w}–${r.l}</td><td class="n">${d[1]}–${d[2]}</td><td class="n">${f2(r.pf)}</td><td class="n hide-s">${f2(r.pa)}</td><td class="n hide-s">${r.streak}</td>${showDiv?`<td class="hide-s">${DIVS[d[0]].name}</td>`:""}</tr>`}).join("");
  return `<div class="scroll"><table><thead><tr><th class="n">Seed</th><th>Team</th><th class="n">W–L</th><th class="n">Div</th><th class="n">PF</th><th class="n hide-s">PA</th><th class="n hide-s">Streak</th>${showDiv?'<th class="hide-s">Division</th>':""}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
function vStandings(){
  const toggle=`<div class="seg" role="group" aria-label="Standings view">${[["overall","Overall"],["division","By division"],["odds","Playoff odds"],["luck","Luck index"]].map(([k,l])=>`<button data-stand="${k}" aria-pressed="${standMode===k}">${l}</button>`).join("")}</div>`;
  if(standMode==="odds"||standMode==="luck")return `<h2>${standMode==="odds"?"Playoff odds":"Luck index"}</h2>${toggle}${standMode==="odds"?vOdds():vLuck()}`;
  const body=standMode==="division"
    ?DIVS.map(dv=>`<h3>${dv.name}</h3>`+standTable(ST.filter(r=>DIV[r.id][0]===dv.id),false)).join("")
    :standTable(ST,true);
  return `<h2>Standings</h2><p class="note">Through week ${lastFinal}, in ESPN's playoff seed order. Division winners get a first-round bye (orange edge); the next ${PLAYOFF_TEAMS-2} seeds (green edge) also make the playoffs. Ties go to total points scored.  Div is the record against division rivals.</p>
  <p class="note"><b>Clinched</b> means the team makes the playoffs however the remaining games go, even if every points tiebreaker goes against it. <b>Eliminated</b> means it can't get in even if every tiebreaker goes its way. Games still in progress count as undecided.</p>
  ${toggle}${body}`;
}

function vTeams(){
  return `<h2>Teams</h2><p class="note">Pick a team for its roster, this season's schedule and its history back to 2021.</p>
  <div class="tgrid">${[...TEAMS].sort((a,b)=>a.seed-b.seed).map(t=>`<a class="tcard" href="#team-${t.id}">${badge(t)}<div><b>${esc(t.name)}</b><span>${esc(t.owner)} · ${rec(t.id)} · ${ordinal(t.seed)} seed</span></div></a>`).join("")}</div>`;
}

/* history rows for one franchise: {y,name,owner,w,l,pf,pa,fin,seed} */
function pastFor(id){
  return Object.keys(HIST).map(Number).sort((a,b)=>b-a).map(y=>{
    const r=HIST[y].teams.find(t=>t[0]===id);
    const owner=clean(r[2]);return {y,name:clean(r[1]),owner,own:owner===T[id].owner||owner.startsWith(T[id].owner+" &"),w:r[3],l:r[4],pf:r[6],pa:r[7],fin:r[9]>(HIST[y].po||PLAYOFF_TEAMS)?r[9]:r[8],seed:r[9],missed:r[9]>(HIST[y].po||PLAYOFF_TEAMS)};
  });
}
const finish=p=>p.fin===1?'<span class="trophy">🏆</span> Champion':p.fin===2?"Runner-up":p.missed?`${ordinal(p.fin)} <span style="font-size:13px;color:var(--mute)">· missed playoffs</span>`:ordinal(p.fin);

function vTeam(id){
  const t=T[id];if(!t)return vTeams();
  const r=byId[id],past=pastFor(id),mine=past.filter(p=>p.own),titles=mine.filter(p=>p.fin===1);
  const allW=mine.reduce((s,p)=>s+p.w,r.w),allL=mine.reduce((s,p)=>s+p.l,r.l);
  const slots=CUR.rost[id].slice().sort((a,b)=>SLOT_ORDER.indexOf(a[0])-SLOT_ORDER.indexOf(b[0]));
  const roster=slots.map(p=>`<tr${p[0]==="BE"||p[0]==="IR"?' style="color:var(--mute)"':""}><td style="width:64px"><b>${esc(p[0]==="BE"?"Bench":p[0])}</b></td><td>${esc(p[1])}</td><td class="n">${esc(p[2])} · ${esc(NFL[p[3]]??"")}</td></tr>`).join("");
  const log=WEEKS.map(wk=>{const g=wk.games.find(g=>g.a===id||g.b===id);if(!g)return "";
    const home=g.a===id,opp=T[home?g.b:g.a],st=gStat(g,wk.w);
    let sc="",res="—";
    if(st==="final"){const my=home?g.fa:g.fb,th=home?g.fb:g.fa,won=(g.win==="HOME")===home;sc=`${f2(my)}–${f2(th)}`;res=`<span class="wl ${won?"W":""}">${won?"W":"L"}</span>`;}
    else if(st==="live"){sc=`${f2(home?g.la:g.lb)}–${f2(home?g.lb:g.la)}`;res="Live";}
    return `<tr><td class="n">${wk.po?"P"+(wk.w-REG_WEEKS):wk.w}</td><td><a class="tl" href="#team-${opp.id}">${badge(opp)}<span>${esc(opp.name)}</span></a></td><td class="n">${sc}</td><td>${res}</td></tr>`}).join("");
  const hist=past.map(p=>`<tr${p.own?"":' style="color:var(--mute)"'}><td class="n">${p.y}</td><td>${esc(p.name)}${p.owner!==t.owner?`<br><span style="font-size:13px;color:var(--mute)">Managed by ${esc(p.owner)} · not counted in ${esc(t.owner)}'s totals</span>`:""}</td><td>${finish(p)}</td><td class="n">${p.w}–${p.l}</td><td class="n hide-s">${f2(p.pf)}</td></tr>`).join("");
  return `<a class="back" href="#teams">‹ All teams</a>
  <div class="thead">${badge(t,"big")}<div><h2>${esc(t.name)}</h2><p class="note" style="margin:0">Manager: ${esc(t.owner)}</p></div></div>
  <div class="stats">
    <div class="stat"><b>${r.w}–${r.l}</b><span>${SEASON} record</span></div>
    <div class="stat"><b>${ordinal(r.rank)}</b><span>Playoff seed</span></div>
    <div class="stat"><b>${f1(r.pf)}</b><span>Points for</span></div>
    <div class="stat"><b>${titles.length}</b><span>${titles.length===1?"Title":"Titles"}${titles.length?" ("+titles.map(x=>x.y).join(", ")+")":""}</span></div>
    <div class="stat"><b>${allW}–${allL}</b><span>All-time record</span></div>
  </div>
  ${trophies(id)}
  <div class="cols">
    <div><h3>Current roster</h3><table><tbody>${roster}</tbody></table>
      <h3>Season by season</h3><div class="scroll"><table><thead><tr><th class="n">Year</th><th>Team name</th><th>Finish</th><th class="n">Reg. season</th><th class="n hide-s">PF</th></tr></thead><tbody>
      <tr><td class="n">${SEASON}</td><td>${esc(t.name)}</td><td>${ordinal(r.rank)} seed (in progress)</td><td class="n">${r.w}–${r.l}</td><td class="n hide-s">${f2(r.pf)}</td></tr>${hist}</tbody></table></div></div>
    <div><h3>${SEASON} schedule</h3><div class="scroll"><table><thead><tr><th class="n">Wk</th><th>Opponent</th><th class="n">Score</th><th>Result</th></tr></thead><tbody>${log}</tbody></table></div></div>
  </div>
  <h3 id="final-rosters">Final rosters by season</h3>
  <p class="note">Each roster as it stood at the end of the season (week 17). Season pts is the player's total for the whole NFL season.</p>
  <div class="weeks" style="margin-bottom:14px">${past.map(p=>`<a href="#team-${id}" data-ry="${p.y}" style="min-width:64px" class="${p.y===rosterYear?"on":""}">${p.y}</a>`).join("")}</div>
  <div id="ry">${finalRoster(id,rosterYear)}</div>`;
}
let rosterYear=2025;
function finalRoster(id,y){
  const p=pastFor(id).find(x=>x.y===y),raw=(DATA.rosters[y]||{})[id];
  if(!raw)return `<p class="note">No roster saved for ${y}.</p>`;
  const rows=raw.split(";").map(s=>s.split("|")).sort((a,b)=>SLOT_ORDER.indexOf(a[0])-SLOT_ORDER.indexOf(b[0])||(+b[3]||0)-(+a[3]||0));
  const body=rows.map(r=>`<tr${r[0]==="BE"||r[0]==="IR"?' style="color:var(--mute)"':""}><td style="width:64px"><b>${esc(r[0]==="BE"?"Bench":r[0])}</b></td><td>${esc(r[1])}</td><td class="hide-s">${esc(r[2])}</td><td class="n">${r[3]===""?"—":esc(f1(r[3]))}</td></tr>`).join("");
  return `<p style="margin:0 0 10px"><b>${esc(p.name)}</b> · ${finish(p)} · ${p.w}–${p.l}${p.owner!==T[id].owner?` · managed by ${esc(p.owner)}`:""}</p>
  <div class="scroll"><table><thead><tr><th>Slot</th><th>Player</th><th class="hide-s">Pos</th><th class="n">Season pts</th></tr></thead><tbody>${body}</tbody></table></div>`;
}

function vHistory(){
  const yrs=Object.keys(HIST).map(Number).sort((a,b)=>b-a);
  const champs=yrs.map(y=>{const ts=HIST[y].teams,c=ts.find(t=>t[8]===1),ru=ts.find(t=>t[8]===2),t=T[c[0]];
    return `<a class="champ" href="#team-${t.id}" style="text-decoration:none">${badge(t)}<div><div class="yr">${y}</div><b>${esc(clean(c[1]))}</b><br><span>${esc(clean(c[2]))} · ${c[9]} seed, ${c[3]}–${c[4]}<br>Runner-up: ${esc(clean(ru[1]))}</span></div></a>`}).join("");
  const all=TEAMS.map(t=>{const p=pastFor(t.id).filter(x=>x.own),w=p.reduce((s,x)=>s+x.w,byId[t.id].w),l=p.reduce((s,x)=>s+x.l,byId[t.id].l);
    return {t,titles:p.filter(x=>x.fin===1).length,finals:p.filter(x=>x.fin<=2).length,po:p.filter(x=>x.seed<=PLAYOFF_TEAMS).length,w,l,avg:p.reduce((s,x)=>s+x.fin,0)/p.length}})
    .sort((a,b)=>b.titles-a.titles||b.finals-a.finals||b.w/(b.w+b.l)-a.w/(a.w+a.l));
  const rows=all.map(a=>`<tr><td><a class="tl" href="#team-${a.t.id}">${badge(a.t)}<span>${esc(a.t.owner)}</span></a></td><td class="n">${a.titles}</td><td class="n">${a.finals}</td><td class="n hide-s">${a.po}</td><td class="n">${a.w}–${a.l}</td><td class="n hide-s">${(a.w/(a.w+a.l)*100).toFixed(1)}%</td><td class="n hide-s">${a.avg.toFixed(1)}</td></tr>`).join("");
  /* record book */
  const seasons=yrs.flatMap(y=>HIST[y].teams.map(t=>({y,id:t[0],name:clean(t[1]),w:t[3],l:t[4],pf:t[6]})));
  const bestRec=seasons.reduce((a,b)=>b.w>a.w?b:a), mostPF=seasons.reduce((a,b)=>b.pf>a.pf?b:a), worst=seasons.reduce((a,b)=>b.w<a.w?b:a);
  let hi={s:0};for(const wk of REG){for(const g of wk.games){if(gStat(g,wk.w)!=="final")continue;if(g.fa>hi.s)hi={s:g.fa,id:g.a,w:wk.w};if(g.fb>hi.s)hi={s:g.fb,id:g.b,w:wk.w};}}
  const fact=(k,v,sub)=>`<div class="stat"><b>${v}</b><span>${k}<br>${sub}</span></div>`;
  return `<h2>League history</h2><p class="note">Every champion since the league started on ESPN in 2021, and how each manager stacks up all-time.</p>
  <div class="champs">${champs}</div>
  <h3>Record book</h3><div class="stats">
    ${fact("Best regular season",`${bestRec.w}–${bestRec.l}`,`${esc(bestRec.name)}, ${bestRec.y}`)}
    ${fact("Most points in a season",f1(mostPF.pf),`${esc(mostPF.name)}, ${mostPF.y}`)}
    ${fact(`Top week of ${SEASON}`,f2(hi.s),`${esc(T[hi.id].name)}, week ${hi.w}`)}
    ${fact("Worst regular season",`${worst.w}–${worst.l}`,`${esc(worst.name)}, ${worst.y}`)}
  </div>
  <h3>All-time table</h3><div class="scroll"><table><thead><tr><th>Manager</th><th class="n">Titles</th><th class="n">Finals</th><th class="n hide-s">Playoffs</th><th class="n">W–L</th><th class="n hide-s">Win %</th><th class="n hide-s">Avg finish</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p class="note" style="margin-top:10px">W–L is regular season and includes ${SEASON} games so far. Playoffs counts seasons seeded in the top ${PLAYOFF_TEAMS}. Avg finish uses the playoff result for playoff teams and the regular-season standing for everyone else. Zac Taylor's totals start in 2022; the 2021 season, when Nathaniel Wang ran that team, isn't counted for him.</p>`;
}

/* ---------- all games (for head to head, trophies, brackets) ---------- */
const ownedBy=(id,y)=>y===SEASON||!!pastFor(id).find(p=>p.y===y)?.own;
const ALLG=[];
for(const [y,str] of Object.entries(DATA.games)){
  for(const g of str.split(";")){const [w,a,fa,b,fb,win]=g.split(",");ALLG.push({y:+y,w:+w,a:+a,b:+b,fa:+fa,fb:+fb,win,po:+w>14});}
}
for(const wk of WEEKS)for(const g of wk.games){
  if(gStat(g,wk.w)!=="final"||(wk.po&&g.tier!=="WINNERS_BRACKET"))continue;
  ALLG.push({y:SEASON,w:wk.w,a:g.a,b:g.b,fa:g.fa,fb:g.fb,win:g.win[0],po:wk.po});
}
const COUNTED=ALLG.filter(g=>ownedBy(g.a,g.y)&&ownedBy(g.b,g.y));
const winnerOf=g=>g.win==="H"?g.a:g.win==="A"?g.b:0;

/* ---------- head to head ---------- */
let h2hMode="all",h2hA=null,h2hB=null;
const H2H_MODES=[["all","All-time"],["reg","Regular season"],["po","Playoffs"],["season",String(SEASON)]];
const h2hGames=()=>COUNTED.filter(g=>h2hMode==="all"||(h2hMode==="reg"&&!g.po)||(h2hMode==="po"&&g.po)||(h2hMode==="season"&&g.y===SEASON));
function recBetween(gs,x,y){let w=0,l=0,t=0;for(const g of gs){if(!((g.a===x&&g.b===y)||(g.a===y&&g.b===x)))continue;const v=winnerOf(g);if(v===x)w++;else if(v===y)l++;else t++;}return {w,l,t};}
function vH2H(){
  const gs=h2hGames(),order=[...TEAMS].sort((a,b)=>a.owner.localeCompare(b.owner));
  if(h2hA==null){h2hA=order[0].id;h2hB=order[1].id;}
  const head=order.map(t=>`<th class="n" title="${esc(t.owner)}">${badge(t)}</th>`).join("");
  const rows=order.map(r=>{let W=0,L=0;
    const cells=order.map(c=>{if(c.id===r.id)return `<td class="hx self">—</td>`;
      const x=recBetween(gs,r.id,c.id);W+=x.w;L+=x.l;const n=x.w+x.l+x.t;
      if(!n)return `<td class="hx"><button data-pair="${r.id},${c.id}" aria-label="${esc(r.owner)} vs ${esc(c.owner)}: no games">·</button></td>`;
      const p=(x.w+x.t/2)/n,bg=p>.5?`rgba(15,140,70,${(p-.5)*0.9+.08})`:p<.5?`rgba(220,60,40,${(.5-p)*0.9+.08})`:"transparent";
      return `<td class="hx" style="background:${bg}"><button data-pair="${r.id},${c.id}" aria-label="${esc(r.owner)} vs ${esc(c.owner)}: ${x.w} wins, ${x.l} losses">${x.w}–${x.l}${x.t?"–"+x.t:""}</button></td>`;}).join("");
    return `<tr><th scope="row"><span class="tl">${badge(r)}<span>${esc(r.owner)}</span></span></th>${cells}<td class="n"><b>${W}–${L}</b></td></tr>`;}).join("");
  const seg=`<div class="seg" role="group" aria-label="Which games">${H2H_MODES.map(([k,l])=>`<button data-h2h="${k}" aria-pressed="${h2hMode===k}">${l}</button>`).join("")}</div>`;
  return `<h2>Head to head</h2><p class="note">Each row is that manager's record against the manager in each column. Green means they own the matchup, red means they don't. Tap any record to see every game.</p>
  ${seg}<div class="scroll"><table class="h2h"><thead><tr><th>Manager</th>${head}<th class="n">Total</th></tr></thead><tbody>${rows}</tbody></table></div>
  <h3 id="pair">Matchup finder</h3><div id="pairbox">${vPair()}</div>
  <p class="note" style="margin-top:12px">Counts regular season and championship-bracket playoff games since 2021; consolation games are left out. Nathaniel Wang's 2021 games aren't counted for Zac Taylor.</p>`;
}
function vPair(){
  const gs=h2hGames().filter(g=>(g.a===h2hA&&g.b===h2hB)||(g.a===h2hB&&g.b===h2hA)).sort((p,q)=>q.y-p.y||q.w-p.w);
  const A=T[h2hA],B=T[h2hB],x=recBetween(gs,h2hA,h2hB);
  const pts=id=>gs.reduce((s,g)=>s+(g.a===id?g.fa:g.fb),0);
  const big=id=>{let best=null;for(const g of gs){if(winnerOf(g)!==id)continue;const m=Math.abs(g.fa-g.fb);if(!best||m>best.m)best={m,g};}return best;};
  const opt=sel=>[...TEAMS].sort((a,b)=>a.owner.localeCompare(b.owner)).map(t=>`<option value="${t.id}" ${t.id===sel?"selected":""}>${esc(t.owner)}</option>`).join("");
  const bA=big(h2hA),bB=big(h2hB);
  const list=gs.map(g=>{const aS=g.a===h2hA?g.fa:g.fb,bS=g.a===h2hA?g.fb:g.fa,v=winnerOf(g);
    return `<tr><td class="n">${g.y}</td><td>${g.po?"Playoffs":"Week "+g.w}</td><td class="n" style="${v===h2hA?"font-weight:700":""}">${f2(aS)}</td><td class="n" style="${v===h2hB?"font-weight:700":""}">${f2(bS)}</td><td>${v===h2hA?esc(A.owner):v===h2hB?esc(B.owner):"Tie"}</td></tr>`}).join("");
  return `<div class="pairsel"><label>Manager <select id="pa">${opt(h2hA)}</select></label><span>vs</span><label>Manager <select id="pb">${opt(h2hB)}</select></label></div>
  ${h2hA===h2hB?`<p class="note">Pick two different managers.</p>`:!gs.length?`<p class="note">These two haven't played each other in this view.</p>`:`
  <div class="stats">
    <div class="stat"><b>${x.w}–${x.l}${x.t?"–"+x.t:""}</b><span>${esc(A.owner)}'s record</span></div>
    <div class="stat"><b>${f1(pts(h2hA))}</b><span>${esc(A.owner)} points</span></div>
    <div class="stat"><b>${f1(pts(h2hB))}</b><span>${esc(B.owner)} points</span></div>
    <div class="stat"><b>${bA?f1(bA.m):"—"}</b><span>${esc(A.owner)}'s biggest win${bA?` (${bA.g.y}${bA.g.po?" playoffs":", wk "+bA.g.w})`:""}</span></div>
    <div class="stat"><b>${bB?f1(bB.m):"—"}</b><span>${esc(B.owner)}'s biggest win${bB?` (${bB.g.y}${bB.g.po?" playoffs":", wk "+bB.g.w})`:""}</span></div>
  </div>
  <div class="scroll"><table><thead><tr><th class="n">Year</th><th>Game</th><th class="n">${esc(A.owner)}</th><th class="n">${esc(B.owner)}</th><th>Winner</th></tr></thead><tbody>${list}</tbody></table></div>`}`;
}

/* ---------- playoffs ---------- */
let poYear=SEASON;
function bracketData(y){
  let seeds,games;
  if(y===SEASON){seeds=Object.fromEntries(ST.map(r=>[r.rank,r.id]));games=WEEKS.filter(w=>w.po).flatMap(wk=>wk.games.filter(g=>g.tier==="WINNERS_BRACKET").map(g=>({w:wk.w,a:g.a,b:g.b,fa:g.fa,fb:g.fb,la:g.la,lb:g.lb,st:gStat(g,wk.w),win:g.win[0]})));}
  else{seeds=Object.fromEntries(HIST[y].teams.map(t=>[t[9],t[0]]));games=ALLG.filter(g=>g.y===y&&g.po).map(g=>({...g,st:"final"}));}
  return {seeds,games};
}
function vPlayoffs(){
  const {seeds,games}=bracketData(poYear),seedOf=Object.fromEntries(Object.entries(seeds).map(([s,id])=>[id,+s]));
  const find=(x,y,w)=>x&&y?games.find(g=>g.w===w&&((g.a===x&&g.b===y)||(g.a===y&&g.b===x))):null;
  const win=g=>g&&g.st==="final"?winnerOf(g):null;
  const r1=[[3,6],[4,5]].map(([p,q])=>({x:seeds[p],y:seeds[q],g:find(seeds[p],seeds[q],15)}));
  const w36=win(r1[0].g),w45=win(r1[1].g);
  const r2=[{x:seeds[1],y:w45,ph:"Winner of 4 vs 5"},{x:seeds[2],y:w36,ph:"Winner of 3 vs 6"}].map(m=>({...m,g:find(m.x,m.y,16)}));
  const f1w=win(r2[0].g),f2w=win(r2[1].g);
  const fin={x:f1w,y:f2w,ph:"Semifinal winner",g:find(f1w,f2w,17)};
  const champ=win(fin.g);
  const line=(id,g,ph)=>{if(!id)return `<div class="bt tbd">${esc(ph||"TBD")}</div>`;const t=T[id];
    const sc=g?(g.st==="final"?(g.a===id?g.fa:g.fb):g.st==="live"?(g.a===id?g.la:g.lb):null):null;const w=g&&g.st==="final"&&winnerOf(g)===id,l=g&&g.st==="final"&&!w;
    return `<a class="bt ${w?"w":""} ${l?"l":""}" href="#team-${id}"><span class="sd">${seedOf[id]}</span>${badge(t)}<span class="bn">${esc(poYear===SEASON?t.name:pastFor(id).find(p=>p.y===poYear).name)}</span><span class="bs">${sc!=null?f2(sc):""}</span></a>`;};
  const box=(m,ph1)=>`<div class="bx">${line(m.x,m.g,ph1)}${line(m.y,m.g,m.ph)}</div>`;
  const byes=[1,2].map(s=>`<div class="bx bye1">${line(seeds[s],null)}<div class="bt tbd">First-round bye</div></div>`).join("");
  const yrs=[SEASON,...Object.keys(HIST).map(Number).sort((a,b)=>b-a)];
  const chips=`<div class="weeks" style="margin-bottom:16px">${yrs.map(y=>`<a href="#playoffs" data-poy="${y}" style="min-width:64px" class="${y===poYear?"on":""}">${y}</a>`).join("")}</div>`;
  const live=poYear===SEASON&&!games.length;
  return `<h2>${poYear} playoffs</h2><p class="note">${live?"If the season ended today: seeds from the current standings. Division winners take seeds 1 and 2 and skip the first round.":`Six-team bracket; the top two seeds had byes.`}</p>${chips}
  <div class="bracket">
    <div class="rd"><h4>Round 1 · week 15</h4>${byes}${box(r1[0])}${box(r1[1])}</div>
    <div class="rd"><h4>Semifinals · week 16</h4>${box(r2[0])}${box(r2[1])}</div>
    <div class="rd"><h4>Championship · week 17</h4>${box(fin,"Semifinal winner")}
      <div class="champbox">${champ?`${badge(T[champ])}<div><span>Champion</span><b>${esc(poYear===SEASON?T[champ].name:pastFor(champ).find(p=>p.y===poYear).name)}</b></div>`:`<div><span>Champion</span><b>To be decided</b></div>`}</div></div>
  </div>`;
}

/* ---------- trophy case ---------- */
function trophies(id){
  const past=pastFor(id).filter(p=>p.own),t=T[id];
  const titles=past.filter(p=>p.fin===1).map(p=>p.y),ru=past.filter(p=>p.fin===2).map(p=>p.y),last=past.filter(p=>p.fin===10).map(p=>p.y);
  const po=past.filter(p=>!p.missed).length;
  let highs=0,best=null;
  const byWeek={};for(const g of ALLG){if(g.po)continue;(byWeek[g.y+"-"+g.w]??=[]).push(g);}
  for(const gs of Object.values(byWeek)){let top={s:-1};for(const g of gs){if(g.fa>top.s)top={s:g.fa,id:g.a};if(g.fb>top.s)top={s:g.fb,id:g.b};}
    if(top.id===id&&ownedBy(id,gs[0].y))highs++;}
  for(const g of ALLG){if(!ownedBy(id,g.y))continue;const s=g.a===id?g.fa:g.b===id?g.fb:null;if(s!=null&&(!best||s>best.s))best={s,y:g.y,w:g.w,po:g.po};}
  const bestSeason=past.reduce((a,p)=>!a||p.pf>a.pf?p:a,null);
  const tile=(v,k,sub,cls="")=>`<div class="stat tro ${cls}"><b>${v}</b><span>${k}${sub?`<br>${sub}`:""}</span></div>`;
  return `<h3>Trophy case</h3><div class="stats">
    ${tile(titles.length?"🏆".repeat(titles.length):"0","Championships",titles.join(", "),titles.length?"gold":"")}
    ${tile(ru.length,"Runner-up finishes",ru.join(", "))}
    ${tile(po,"Playoff trips",`of ${past.length} seasons`)}
    ${tile(highs,"Weekly high scores","top score in the league that week")}
    ${tile(best?f2(best.s):"—","Best week",best?`${best.y}, ${best.po?"playoffs wk "+best.w:"week "+best.w}`:"")}
    ${tile(bestSeason?f1(bestSeason.pf):"—","Best season (PF)",bestSeason?bestSeason.y:"")}
    ${tile(last.length,"Last-place finishes",last.length?last.join(", "):"never",last.length?"shame":"")}
  </div>`;
}

/* ---------- moves ---------- */
let mvType="all",mvTeam=0,mvLimit=40;
const fmtDay=m=>new Date(m*60000).toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:"America/New_York"});
function vMoves(){
  const tx=(CUR.tx||[]).slice().sort((a,b)=>b[0]-a[0]);
  const kind=t=>t[1][0][0]==="T"?"trade":t[1].some(m=>m[0]==="W")?"waiver":"fa";
  const teamsIn=t=>new Set(t[1].flatMap(m=>m[0]==="T"?[m[2],m[3]]:[m[2]]));
  const list=tx.filter(t=>(mvType==="all"||kind(t)===mvType)&&(!mvTeam||teamsIn(t).has(mvTeam)));
  const counts=Object.fromEntries(TEAMS.map(t=>[t.id,{adds:0,trades:0}]));
  for(const t of tx){if(kind(t)==="trade")for(const id of teamsIn(t))counts[id]&&counts[id].trades++;else for(const m of t[1])if(m[0]!=="D"&&counts[m[2]])counts[m[2]].adds++;}
  const maxA=Math.max(...Object.values(counts).map(c=>c.adds),1);
  const activity=[...TEAMS].sort((a,b)=>counts[b.id].adds-counts[a.id].adds).map(t=>`<div class="act"><span class="tl">${badge(t)}<span>${esc(t.owner)}</span></span><div class="abar"><i style="width:${counts[t.id].adds/maxA*100}%"></i></div><span class="n">${counts[t.id].adds} adds · ${counts[t.id].trades} trade${counts[t.id].trades===1?"":"s"}</span></div>`).join("");
  const row=t=>{const k=kind(t);
    if(k==="trade"){const sides={};for(const m of t[1])(sides[m[2]]??={to:m[3],ps:[]}).ps.push(m[1]);
      const ids=Object.keys(sides).map(Number);
      return `<li class="mv"><span class="when">${fmtDay(t[0])}</span><span class="kind trade">Trade</span><div>${ids.map(f=>`<p><a class="tl" href="#team-${f}">${badge(T[f])}<b>${esc(T[f].owner)}</b></a> sends ${sides[f].ps.map(esc).join(", ")} to ${esc(T[sides[f].to].owner)}</p>`).join("")}</div></li>`;}
    const id=t[1][0][2],adds=t[1].filter(m=>m[0]!=="D"),drops=t[1].filter(m=>m[0]==="D");
    return `<li class="mv"><span class="when">${fmtDay(t[0])}</span><span class="kind ${k}">${k==="waiver"?"Waivers":"Free agent"}</span><div><p><a class="tl" href="#team-${id}">${badge(T[id])}<b>${esc(T[id].owner)}</b></a> ${adds.length?`added ${adds.map(m=>esc(m[1])).join(", ")}`:""}${adds.length&&drops.length?", ":""}${drops.length?`dropped ${drops.map(m=>esc(m[1])).join(", ")}`:""}</p></div></li>`;};
  const seg=`<div class="seg" role="group" aria-label="Move type">${[["all","All"],["trade","Trades"],["waiver","Waivers"],["fa","Free agents"]].map(([k,l])=>`<button data-mv="${k}" aria-pressed="${mvType===k}">${l}</button>`).join("")}</div>`;
  const sel=`<label class="tsel">Team <select id="mvteam"><option value="0">All teams</option>${[...TEAMS].sort((a,b)=>a.owner.localeCompare(b.owner)).map(t=>`<option value="${t.id}" ${t.id===mvTeam?"selected":""}>${esc(t.owner)} — ${esc(t.name)}</option>`).join("")}</select></label>`;
  return `<h2>Trades and pickups</h2><p class="note">Every completed trade, waiver claim and free-agent move this season, newest first.</p>
  <h3>Most active</h3><div class="acts">${activity}</div>
  <h3>All moves</h3><div class="mvbar">${seg}${sel}</div>
  ${list.length?`<ul class="mvs">${list.slice(0,mvLimit).map(row).join("")}</ul>${list.length>mvLimit?`<button class="more" data-more>Show more (${list.length-mvLimit} left)</button>`:""}`:`<p class="note">No moves match.</p>`}`;
}

/* ---------- playoff odds (simulation) ---------- */
const SIMS=10000;
let ODDS=null;
function runOdds(){
  if(ODDS)return ODDS;
  let seed=[...AS_OF].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619),2166136261)>>>0;
  const rnd=()=>{seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
  const z=()=>{let u=0;while(!u)u=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*rnd());};
  const ids=TEAMS.map(t=>t.id),sc=Object.fromEntries(ids.map(id=>[id,[]]));
  for(const wk of REG)for(const g of wk.games)if(gStat(g,wk.w)==="final"){sc[g.a].push(g.fa);sc[g.b].push(g.fb);}
  const all=Object.values(sc).flat(),L=all.reduce((a,b)=>a+b,0)/all.length;
  const M={},S={};
  for(const id of ids){const a=sc[id],m=a.reduce((x,y)=>x+y,0)/a.length,v=a.reduce((x,y)=>x+(y-m)**2,0)/Math.max(1,a.length-1);M[id]=0.7*m+0.3*L;S[id]=Math.max(12,Math.sqrt(v));}
  const left=[];
  for(const wk of REG)for(const g of wk.games){const st=gStat(g,wk.w);if(st!=="final")left.push({...g,st});}
  const draw=(id,live,proj)=>{
    if(live==null)return M[id]+S[id]*z();
    const p=proj??M[id],rem=Math.max(0,p-live),frac=Math.min(1,rem/M[id]);
    return live+rem+S[id]*Math.sqrt(frac)*z();};
  const t=Object.fromEntries(ids.map(id=>[id,{po:0,bye:0,top:0,title:0,wins:0}]));
  const better=(w,pf)=>(a,b)=>w[b]-w[a]||pf[b]-pf[a];
  for(let n=0;n<SIMS;n++){
    const w={},pf={};for(const r of ST){w[r.id]=r.w;pf[r.id]=r.pf;}
    for(const g of left){
      const live=g.st==="live";
      const sa=draw(g.a,live?(g.la??0):null,g.pa),sb=draw(g.b,live?(g.lb??0):null,g.pb);
      pf[g.a]+=sa;pf[g.b]+=sb;w[sa>=sb?g.a:g.b]++;}
    const cmp=better(w,pf);
    const leaders=DIVS.map(dv=>ids.filter(id=>DIV[id][0]===dv.id).sort(cmp)[0]).sort(cmp);
    const rest=ids.filter(id=>!leaders.includes(id)).sort(cmp).slice(0,PLAYOFF_TEAMS-2);
    const seeds=[null,...leaders,...rest];
    for(const id of ids)t[id].wins+=w[id];
    for(let s=1;s<=PLAYOFF_TEAMS;s++)t[seeds[s]].po++;
    t[seeds[1]].bye++;t[seeds[2]].bye++;t[seeds[1]].top++;
    const play=(a,b)=>draw(a,null)>=draw(b,null)?a:b;
    const w36=play(seeds[3],seeds[6]),w45=play(seeds[4],seeds[5]);
    t[play(play(seeds[1],w45),play(seeds[2],w36))].title++;
  }
  ODDS=Object.fromEntries(ids.map(id=>[id,{po:t[id].po/SIMS,bye:t[id].bye/SIMS,top:t[id].top/SIMS,title:t[id].title/SIMS,wins:t[id].wins/SIMS}]));
  return ODDS;
}
const pct=(v,lock)=>lock==="yes"?"100%":lock==="no"?"0%":v>=0.995?"&gt;99%":v<0.005?"&lt;1%":Math.round(v*100)+"%";
function vOdds(){
  const o=runOdds(),gamesLeft=REG_WEEKS-lastFinal;
  const rows=[...ST].sort((a,b)=>o[b.id].po-o[a.id].po||o[b.id].title-o[a.id].title).map(r=>{const t=T[r.id],x=o[r.id],st=STATUS[r.id];
    const poLock=st==="in"||st==="bye"?"yes":st==="out"?"no":"",byeLock=st==="bye"?"yes":"";
    return `<tr><td><a class="tl" href="#team-${r.id}">${badge(t)}<span>${esc(t.name)}</span>${CL_TAG[st]||""}</a></td>
    <td class="n">${r.w}–${r.l}</td><td class="n hide-s">${f1(x.wins)}–${f1(lastFinal+gamesLeft-x.wins)}</td>
    <td class="n oddcell"><div class="ob"><i style="width:${(x.po*100).toFixed(1)}%"></i></div><b>${pct(x.po,poLock)}</b></td>
    <td class="n">${pct(x.bye,byeLock)}</td><td class="n hide-s">${pct(x.top)}</td><td class="n">${pct(x.title)}</td></tr>`}).join("");
  return `<p class="note">Odds from ${SIMS.toLocaleString()} simulations of the rest of the season and the playoffs. Each team's weekly score is drawn from its scoring this season, pulled a little toward the league average; games in progress start from the live score and ESPN's projection. Updates every time the scores do.</p>
  <div class="scroll"><table><thead><tr><th>Team</th><th class="n">W–L</th><th class="n hide-s">Proj. final</th><th class="n">Playoffs</th><th class="n">Bye</th><th class="n hide-s">No. 1 seed</th><th class="n">Title</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* ---------- luck index (all-play) ---------- */
let luckYear=SEASON;
function luckRows(y){
  const weeks={};
  if(y===SEASON){for(const wk of REG)for(const g of wk.games)if(gStat(g,wk.w)==="final"){(weeks[wk.w]??=[]).push([g.a,g.fa,g.win==="HOME"],[g.b,g.fb,g.win==="AWAY"]);}}
  else for(const g of ALLG)if(g.y===y&&!g.po)(weeks[g.w]??=[]).push([g.a,g.fa,g.win==="H"],[g.b,g.fb,g.win==="A"]);
  const r=Object.fromEntries(TEAMS.map(t=>[t.id,{id:t.id,w:0,l:0,aw:0,al:0,pf:0}]));
  const nWeeks=Object.keys(weeks).length;
  for(const list of Object.values(weeks))for(const [id,s,won] of list){const x=r[id];x.pf+=s;won?x.w++:x.l++;
    for(const [oid,os] of list){if(oid===id)continue;if(s>os)x.aw++;else if(s<os)x.al++;else{x.aw+=.5;x.al+=.5;}}}
  for(const x of Object.values(r)){x.exp=x.aw/(TEAMS.length-1);x.luck=x.w-x.exp;}
  return {rows:Object.values(r).sort((a,b)=>b.luck-a.luck),nWeeks};
}
function vLuck(){
  const {rows,nWeeks}=luckRows(luckYear),max=Math.max(...rows.map(x=>Math.abs(x.luck)),1);
  const nameOf=id=>luckYear===SEASON?T[id].name:pastFor(id).find(p=>p.y===luckYear).name;
  const ownerOf=id=>luckYear===SEASON?T[id].owner:pastFor(id).find(p=>p.y===luckYear).owner;
  const yrs=[SEASON,...Object.keys(HIST).map(Number).sort((a,b)=>b-a)];
  const chips=`<div class="weeks" style="margin-bottom:14px">${yrs.map(y=>`<a href="#standings" data-luck="${y}" style="min-width:64px" class="${y===luckYear?"on":""}">${y}</a>`).join("")}</div>`;
  const body=rows.map(x=>{const t=T[x.id],w=Math.abs(x.luck)/max*50;
    return `<tr><td><a class="tl" href="#team-${x.id}">${badge(t)}<span>${esc(nameOf(x.id))}<br><small style="color:var(--mute)">${esc(ownerOf(x.id))}</small></span></a></td>
    <td class="n">${x.w}–${x.l}</td><td class="n hide-s">${Math.round(x.aw*10)/10}–${Math.round(x.al*10)/10}</td><td class="n">${(x.aw/(x.aw+x.al)*100).toFixed(1)}%</td><td class="n hide-s">${f1(x.exp)}</td>
    <td class="luckcell"><div class="lk"><i class="${x.luck>=0?"pos":"neg"}" style="${x.luck>=0?"left:50%":"right:50%"};width:${w}%"></i></div><b class="${x.luck>=0?"pos":"neg"}">${x.luck>=0?"+":"−"}${f1(Math.abs(x.luck))}</b></td></tr>`}).join("");
  const lucky=rows[0],unlucky=rows.at(-1);
  return `<p class="note">The all-play record is what each team would be if it had played all nine other teams every week. Expected wins come from that win rate. Luck is actual wins minus expected wins, so positive means the schedule has been kind.</p>${chips}
  ${nWeeks?`<p style="margin:0 0 12px"><b>Luckiest:</b> ${esc(nameOf(lucky.id))} (+${f1(lucky.luck)} wins) · <b>Unluckiest:</b> ${esc(nameOf(unlucky.id))} (−${f1(Math.abs(unlucky.luck))} wins)${luckYear===SEASON?` · through week ${lastFinal}`:""}</p>
  <div class="scroll"><table><thead><tr><th>Team</th><th class="n">Actual</th><th class="n hide-s">All-play</th><th class="n">All-play %</th><th class="n hide-s">Expected W</th><th style="min-width:150px">Luck (wins)</th></tr></thead><tbody>${body}</tbody></table></div>`:`<p class="note">No finished weeks yet.</p>`}`;
}

/* ---------- routing ---------- */
const view=document.getElementById("view");
document.getElementById("wkpill").textContent=WK[CURRENT_WEEK]&&status(CURRENT_WEEK)==="live"?`Week ${CURRENT_WEEK} · Live`:`Week ${Math.min(CURRENT_WEEK,MAXW)}`;
document.getElementById("asof").textContent=`Data from the league on ESPN Fantasy · Last updated ${AS_OF}`;
let curWeek=Math.min(CURRENT_WEEK,MAXW);
function route(){
  const h=location.hash.slice(1)||"matchups";let v="matchups",html;
  if(h.startsWith("week-")){curWeek=WK[+h.slice(5)]?+h.slice(5):Math.min(CURRENT_WEEK,MAXW);html=vMatchups(curWeek);}
  else if(h==="standings"){v=h;html=vStandings();}
  else if(h==="teams"){v=h;html=vTeams();}
  else if(h==="history"){v=h;html=vHistory();}
  else if(h==="playoffs"){v=h;html=vPlayoffs();}
  else if(h==="h2h"){v=h;html=vH2H();}
  else if(h==="moves"){v=h;html=vMoves();}
  else if(h.startsWith("team-")){v="teams";html=vTeam(+h.slice(5));}
  else html=vMatchups(curWeek);
  view.innerHTML=html;
  document.querySelectorAll("#nav a").forEach(a=>a.toggleAttribute("aria-current",a.dataset.v===v));
  const on=view.querySelector(".weeks a.on");if(on)on.scrollIntoView({block:"nearest",inline:"center"});
}
view.addEventListener("change",e=>{
  if(e.target.id==="pa"||e.target.id==="pb"){h2hA=+document.getElementById("pa").value;h2hB=+document.getElementById("pb").value;document.getElementById("pairbox").innerHTML=vPair();}
  if(e.target.id==="mvteam"){mvTeam=+e.target.value;mvLimit=40;view.innerHTML=vMoves();}
});
view.addEventListener("click",e=>{
  const hb=e.target.closest("[data-h2h]");if(hb){h2hMode=hb.dataset.h2h;view.innerHTML=vH2H();return;}
  const pr=e.target.closest("[data-pair]");if(pr){[h2hA,h2hB]=pr.dataset.pair.split(",").map(Number);document.getElementById("pairbox").innerHTML=vPair();document.getElementById("pair").scrollIntoView({behavior:"smooth"});return;}
  const lk=e.target.closest("[data-luck]");if(lk){e.preventDefault();luckYear=+lk.dataset.luck;view.innerHTML=vStandings();return;}
  const py=e.target.closest("[data-poy]");if(py){e.preventDefault();poYear=+py.dataset.poy;view.innerHTML=vPlayoffs();return;}
  const mv=e.target.closest("[data-mv]");if(mv){mvType=mv.dataset.mv;mvLimit=40;view.innerHTML=vMoves();return;}
  if(e.target.closest("[data-more]")){mvLimit+=60;view.innerHTML=vMoves();return;}
  const sb=e.target.closest("[data-stand]");
  if(sb){standMode=sb.dataset.stand;try{localStorage.setItem("standMode",standMode)}catch(err){}view.innerHTML=vStandings();return;}
  const ry=e.target.closest("[data-ry]");
  if(ry){e.preventDefault();rosterYear=+ry.dataset.ry;const id=+location.hash.slice(6);
    view.querySelectorAll("[data-ry]").forEach(a=>a.classList.toggle("on",a===ry));
    document.getElementById("ry").innerHTML=finalRoster(id,rosterYear);return;}
  const b=e.target.closest("[data-step]");if(!b)return;
  location.hash="week-"+Math.min(MAXW,Math.max(1,curWeek+ +b.dataset.step));});
document.addEventListener("keydown",e=>{if(!view.querySelector(".weeks")||e.target.closest("input,textarea"))return;
  if(e.key==="ArrowLeft"||e.key==="ArrowRight")location.hash="week-"+Math.min(MAXW,Math.max(1,curWeek+(e.key==="ArrowRight"?1:-1)));});
addEventListener("hashchange",()=>{route();if(!location.hash.startsWith("#week-"))scrollTo(0,0);});
route();
}catch(err){document.getElementById("view").innerHTML='<p class="note">The league data could not load. Try refreshing the page.</p>';console.error(err)}})();
