const KEY='bite-pomodoro-github-v1';
let view='home', scope='day', chart='bar', editor=false, timer=null, tick=null, timerMode='25/5', trendSubject='', audioCtx=null, alarmTick=null, alarmTimeout=null, alarmActive=false, taskFormLimit=2, examFormLimit=2;

const studyDefaults={
  elementary:['國語','英文','數學','自然','社會'],
  junior:['國文','英文','數學','自然','歷史','地理','公民'],
  senior:['國文','英文','數學','物理','化學','生物','地球科學','歷史','地理','公民']
};
const examSubjects={
  elementary:['國語','英文','數學','自然','社會'],
  junior:['國文','英文','數學','自然','歷史','地理','公民'],
  senior:['國文','英文','數學','物理','化學','生物','地球科學','歷史','地理','公民']
};
const examTypes=['小考','第一次期中考','第二次期中考','期末考','第一次模擬考','第二次模擬考','第三次模擬考','其他'];
const timerModes={
  '25/5':{label:'25 / 5',focus:25*60,break:5*60},
  '20/10':{label:'20 / 10',focus:20*60,break:10*60},
  '15/15':{label:'15 / 15',focus:15*60,break:15*60},
  test:{label:'10 秒快速測試',focus:10,break:5}
};
const colors=['#2f7d4a','#568bc7','#d29b33','#b86679','#6f72b8','#5aa6a6','#9a7b4f','#7d6b91','#4f8f9d'];
const subjectColors={'數學':'#2f7d4a','國語':'#568bc7','國文':'#568bc7','英語':'#d29b33','英文':'#d29b33','自然':'#b86679','社會':'#6f72b8','作文':'#5aa6a6','公民':'#9a7b4f','物理':'#4f8f9d','化學':'#b86679','生物':'#76a97d','地理':'#7d6b91','歷史':'#a67b5b'};

function subjectColor(name){if(subjectColors[name])return subjectColors[name];let h=0;for(let i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))|0;return colors[Math.abs(h)%colors.length]}
function dk(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function today(){return dk(new Date())}
function firstOfMonth(a){const d=new Date((a||today())+'T12:00:00');return dk(new Date(d.getFullYear(),d.getMonth(),1,12))}
function lastOfMonth(a){const d=new Date((a||today())+'T12:00:00');return dk(new Date(d.getFullYear(),d.getMonth()+1,0,12))}
function addDays(date,n){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return dk(d)}
function uid(p){return p+Date.now()+Math.random().toString(36).slice(2,6)}
function esc(s){return String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
function shortDate(date){const p=String(date||'').split('-').map(Number);return p.length===3?p[0]+'.'+p[1]+'.'+p[2]:String(date||'')}
function hoursLabel(sec){const h=Number(sec||0)/3600;if(h===0)return'0';return(h<10?h.toFixed(2):h.toFixed(1)).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1')}
function mins(a,b){if(!a||!b)return 0;const x=a.split(':').map(Number),y=b.split(':').map(Number),m=y[0]*60+y[1]-(x[0]*60+x[1]);return m>0?m:0}
function fmt(s){s=Math.max(0,Math.round(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function weekRange(date){const d=new Date(date+'T12:00:00');const s=new Date(d);s.setDate(s.getDate()-((s.getDay()+6)%7));const e=new Date(s);e.setDate(e.getDate()+6);return[dk(s),dk(e)]}
function periodText(a,b){return shortDate(a)+(a===b?'':'–'+shortDate(b))}
function inclusiveRows(rows,a,b){return rows.filter(x=>x.date>=a&&x.date<=b)}
function normalizeSubjectValue(list,value){
  const raw=String(value||''),aliases={'英語':'英文','英':'英文'};
  let selected=aliases[raw]||raw;
  if(list.includes('國語')&&selected==='國文')selected='國語';
  if(list.includes('國文')&&selected==='國語')selected='國文';
  if(list.includes(selected))return selected;
  return '';
}
function subjectOpts(list,value){
  const selected=normalizeSubjectValue(list,value);
  return '<option value="" '+(!selected?'selected':'')+'>請選擇科目</option>'+list.map(x=>`<option value="${esc(x)}" ${x===selected?'selected':''}>${esc(x)}</option>`).join('');
}
function stageName(){return state.stage==='elementary'?'國小':state.stage==='junior'?'國中':'高中'}
function maxPomodorosByStage(){return state.stage==='senior'?6:state.stage==='junior'?4:2}

function defaultExamRows(){return['小考','第一次期中考'].map((type,i)=>({id:'seedExam'+i,date:today(),type,subject:'國語',score:'',note:''}))}
function defaults(){return{
  date:today(),analysisDate:today(),stage:'elementary',
  subjects:JSON.parse(JSON.stringify(studyDefaults)),
  tasks:{[today()]:[
    {id:'t1',start:'19:30',end:'20:00',subject:'數學',task:'習作第 2 課',status:'pending'},
    {id:'t2',start:'',end:'',subject:'國語',task:'',status:'pending'}
  ]},
  sessions:[],exams:defaultExamRows(),customTimerModes:[],
  calendarMonth:firstOfMonth(today()),calendarEvents:[],magicMemory:[],dailyMapDate:today(),
  compareStart:firstOfMonth(today()),compareEnd:today()
}}
function load(){try{const r=localStorage.getItem(KEY);return r?JSON.parse(r):defaults()}catch{return defaults()}}
let state=load();
state.subjects=JSON.parse(JSON.stringify(studyDefaults));
if(!Array.isArray(state.customTimerModes))state.customTimerModes=[];
if(!Array.isArray(state.calendarEvents))state.calendarEvents=[];
if(!Array.isArray(state.magicMemory))state.magicMemory=[];
if(!state.calendarMonth)state.calendarMonth=firstOfMonth(today());
if(!state.dailyMapDate)state.dailyMapDate=today();
if(!state.compareStart)state.compareStart=firstOfMonth(state.analysisDate||today());
if(!state.compareEnd)state.compareEnd=state.analysisDate||today();
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function tasks(){if(!state.tasks[state.date])state.tasks[state.date]=[];return state.tasks[state.date]}
function subjects(){return state.subjects[state.stage]||[]}

function top(title){
  if(view==='home')return'';
  return `<div class="top"><button class="back" data-view="home" aria-label="回首頁">‹</button><h1>${title}</h1><button class="back" data-view="home" aria-label="首頁">⌂</button></div>`
}
function homeView(){
  const cards=[
    ['todo','✅','To Do＋番茄鐘','工作安排、專注倒數與第二顆番茄'],
    ['calendar','📅','學校行事曆','手動建立行事、考試星號與複習計畫'],
    ['stats','📊','學習統計','每天、每週、每月各科研讀時間'],
    ['exams','📝','成績／趨勢','小考與大考分數 × 研讀時數'],
    ['dailyMap','🗺️','每日任務地圖','今日 To Do 與複習任務'],
    ['memory','🧠','魔法記憶','從 To Do 帶入並安排 +1、+3、+7、+30'],
    ['toolbox','🧰','魔法工具箱','費曼、康乃爾、心智圖、曼陀羅與作文工具']
  ];
  return `<section class="brand"><div class="tomato">🍅</div><h1>咬一口蕃茄鐘</h1><div class="subtitle">學習魔法闖關遊戲</div></section>
  <div class="mission-grid">${cards.map(c=>`<button class="mission" ${c[0]==='toolbox'?'id="toolboxLink"':`data-view="${c[0]}"`}><b>${c[1]}</b><span>${c[2]}</span><small>${c[3]}</small></button>`).join('')}</div>`;
}

function editorHtml(){
  if(!editor)return'';
  return `<div class="subject-editor"><b>編輯 ${stageName()} 學習科目</b><div class="hint">可改名、刪除或增加；「其他」可直接用自訂欄位。</div>
  ${subjects().map((x,i)=>`<div class="subject-row"><input class="field" data-subedit="${i}" value="${esc(x)}"><button class="danger" data-subdel="${i}">刪除</button></div>`).join('')}
  <div class="subject-row"><input id="newSub" class="field" placeholder="新增科目"><button id="addSub" class="primary">＋新增</button></div></div>`
}
function taskHtml(x,i){
  const m=mins(x.start,x.end),custom=!subjects().includes(x.subject);
  return `<article class="task"><div class="taskhead"><b>工作 ${i+1}</b><button class="danger" data-del="${i}">刪除</button></div><div class="taskgrid">
  <label class="label full">時間<div class="timepair"><input class="field" type="time" data-ti="${i}" data-k="start" value="${esc(x.start)}"><span>→</span><input class="field" type="time" data-ti="${i}" data-k="end" value="${esc(x.end)}"></div><span class="hint">自動換算 ${m} 分</span></label>
  <label class="label">科目<select class="field" data-ts="${i}">${subjectOpts(subjects(),x.subject)}</select></label>
  ${custom?`<label class="label">自訂科目<input class="field" data-tc="${i}" value="${esc(x.subject)}"></label>`:'<div></div>'}
  <label class="label full">工作內容<textarea class="field" data-ti="${i}" data-k="task">${esc(x.task)}</textarea></label>
  <label class="label">狀態<select class="field" data-ti="${i}" data-k="status"><option value="pending" ${x.status==='pending'?'selected':''}>未完成</option><option value="completed" ${x.status==='completed'?'selected':''}>已完成</option></select></label>
  <button class="primary" data-timer="${i}">🍅 帶入番茄鐘</button><button class="blue btn" data-memory="${i}">🧠 帶入魔法記憶</button></div></article>`
}
function timerModeConfig(id){if(timerModes[id])return timerModes[id];return state.customTimerModes.find(x=>x.id===id)||timerModes['25/5']}
function timerModeButtons(){return['25/5','20/10','15/15'].map(id=>({id,...timerModes[id]})).concat(state.customTimerModes).concat([{id:'test',...timerModes.test}])}
function timerSettingsHtml(){
  const base=['25/5','20/10','15/15'].map(id=>`<div class="preset-card"><b>${timerModes[id].label}</b><span>專注 ${Math.round(timerModes[id].focus/60)} 分｜休息 ${Math.round(timerModes[id].break/60)} 分｜總計 ${Math.round((timerModes[id].focus+timerModes[id].break)/60)} 分</span></div>`).join('');
  const custom=state.customTimerModes.map((x,i)=>`<div class="preset-card"><b>${esc(x.label)}</b><span>專注 ${Math.round(x.focus/60)} 分｜休息 ${Math.round(x.break/60)} 分｜總計 ${Math.round((x.focus+x.break)/60)} 分</span><button class="mini-delete" data-custom-mode-del="${i}">刪除</button></div>`).join('');
  return `<div class="settings-head"><b>番茄設定</b><button id="showAddTimer" class="secondary">＋新增</button></div><div class="preset-grid">${base}${custom}</div>
  <div id="addTimerForm" class="add-timer-form"><label class="label">專注分鐘<input id="customFocus" class="field" type="number" min="1" max="180" value="30"></label><label class="label">休息分鐘<input id="customBreak" class="field" type="number" min="1" max="60" value="5"></label><button id="addTimerMode" class="primary">新增番茄鐘</button></div>
  <div class="hint">預設三組固定保留；可再新增。10 秒快速測試只供驗收。</div>`
}
function timerHtml(){
  const meta=timer?`${timer.date}｜${timer.start}–${timer.end}｜${timer.subject}｜${timer.task}`:'尚未載入工作';
  const mode=timerModeConfig(timerMode);
  const phase=!timer?'請先從工作卡帶入':timer.phase==='break'?'休息時間':timer.phase==='ready'?'休息完成，可決定是否開始下一顆番茄':`專注第 ${timer.cycle} 顆`;
  const focusText=mode.focus<60?`${mode.focus} 秒`:`${Math.round(mode.focus/60)} 分鐘`,breakText=mode.break<60?`${mode.break} 秒`:`${Math.round(mode.break/60)} 分鐘`,cycleText=(mode.focus+mode.break)<60?`${mode.focus+mode.break} 秒`:`${Math.round((mode.focus+mode.break)/60)} 分鐘`;
  const total=timer?(timer.phase==='break'?timer.breakSeconds:timer.focusSeconds):mode.focus;
  const ratio=timer&&total?Math.max(0,Math.min(1,timer.remain/total)):1;
  const dash=339.3*(1-ratio);
  return `<section class="card"><div class="timer-layout"><div class="timerbox"><h2 style="text-align:center">🍅 番茄鐘</h2>
  <div class="mode-row">${timerModeButtons().map(x=>`<button class="mode-btn ${timerMode===x.id?'active':''}" data-mode="${x.id}">${esc(x.label)}</button>`).join('')}</div>
  <div class="timer-phase" style="text-align:center">${phase}</div><div class="timer-cycle-summary">專注 ${focusText}＋休息 ${breakText}＝總計 ${cycleText}</div><div class="hint" style="text-align:center">${esc(meta)}</div>
  ${alarmActive?`<div class="alarm">⏰ 時間到！鬧鐘會維持最多 1 分鐘。 <button id="stopAlarm" class="danger">停止鈴聲</button></div>`:''}
  <div class="timer-orbit"><svg viewBox="0 0 140 140"><circle class="timer-ring-bg" cx="70" cy="70" r="54"></circle><circle id="timerArc" class="timer-ring" cx="70" cy="70" r="54" style="stroke-dashoffset:${dash}"></circle></svg><div class="timer-core"><div class="timer-tomato">🍅</div><div id="clock" class="timer-time">${fmt(timer?timer.remain:0)}</div></div></div>
  <div class="timer-actions"><button id="start" class="primary" ${!timer||timer.phase==='ready'?'disabled':''}>${timer&&timer.running?'暫停':timer&&timer.phase==='break'?'開始休息':'開始'}</button></div>
  <div class="timer-status-panel"><label class="label">標記工作狀態<select id="timerWorkStatus" class="field" ${!timer?'disabled':''}><option value="">請選擇工作狀態</option><option value="completed" ${timer&&timer.workStatus==='completed'?'selected':''}>工作已完成</option><option value="timeout-incomplete" ${timer&&timer.workStatus==='timeout-incomplete'?'selected':''}>時間到，工作仍未完成</option><option value="early-complete" ${timer&&timer.workStatus==='early-complete'?'selected':''}>暫停，工作已提前完成</option><option value="stop-incomplete" ${timer&&timer.workStatus==='stop-incomplete'?'selected':''}>未完成工作，但不繼續</option></select></label><button id="recordTimerStatus" class="blue btn" ${!timer?'disabled':''}>確認並記錄</button><button id="again" class="orange btn" ${timer&&timer.workStatus==='timeout-incomplete'&&timer.cycle<maxPomodorosByStage()&&timer.phase!=='focus'?'':'hidden'}>開始下一顆番茄鐘</button></div>
  <div class="hint timer-status-hint" style="margin-top:10px">先開始或暫停番茄鐘，再依實際情況選擇工作狀態；${stageName()}每項工作最多進行 ${maxPomodorosByStage()} 顆番茄鐘。</div></div>
  <div class="timerbox">${timerSettingsHtml()}</div></div></section>`
}
function todoView(){
  return `${top('To Do＋番茄鐘')}<section class="card"><div class="topbar">
  <label class="label">📅 日期<input id="date" class="field" type="date" value="${state.date}"></label>
  <label class="label">🎒 學制<select id="stage" class="field"><option value="elementary" ${state.stage==='elementary'?'selected':''}>國小</option><option value="junior" ${state.stage==='junior'?'selected':''}>國中</option><option value="senior" ${state.stage==='senior'?'selected':''}>高中</option></select></label>
  <button id="editSubs" class="secondary wide">✏️ 編輯科目</button><button id="addTask" class="primary wide">＋新增工作</button></div>${editorHtml()}
  <div class="tasks">${tasks().slice(0,taskFormLimit).map(taskHtml).join('')}</div><p class="hint">預設只顯示兩組 To Do；不夠再新增。完成的番茄會自動進入學習紀錄統計。</p></section>${timerHtml()}`
}

function bounds(anchor,kind){
  const d=new Date(anchor+'T12:00:00');let s,e;
  if(kind==='day'){s=new Date(d);e=new Date(d);e.setDate(e.getDate()+1)}
  else if(kind==='week'){s=new Date(d);s.setDate(s.getDate()-((s.getDay()+6)%7));e=new Date(s);e.setDate(e.getDate()+7)}
  else{s=new Date(d.getFullYear(),d.getMonth(),1,12);e=new Date(d.getFullYear(),d.getMonth()+1,1,12)}
  return[s,e]
}
function inb(date,b){const d=new Date(date+'T12:00:00');return d>=b[0]&&d<b[1]}
function sessionSlice(){const b=bounds(state.analysisDate,scope);return state.sessions.filter(x=>inb(x.date,b))}
function aggSessions(rows){const a={};rows.forEach(x=>a[x.subject]=(a[x.subject]||0)+Number(x.seconds||0));return a}
function scopeButtons(){return `<div class="actions"><input id="analysisDate" class="field" style="width:auto" type="date" value="${state.analysisDate}"><button class="btn ${scope==='day'?'active':''}" data-scope="day">每天</button><button class="btn ${scope==='week'?'active':''}" data-scope="week">每週</button><button class="btn ${scope==='month'?'active':''}" data-scope="month">每月</button></div>`}
function bar(agg){
  const ks=Object.keys(agg).sort((a,b)=>agg[b]-agg[a]);if(!ks.length)return'<div class="empty">這個期間還沒有紀錄。</div>';
  const mx=Math.max(...ks.map(k=>agg[k]),1);
  return `<div class="bars">${ks.map(k=>`<div class="barrow"><div class="subject-key"><span class="dot" style="background:${subjectColor(k)}"></span><b>${esc(k)}</b></div><div class="track"><div class="fill" style="width:${Math.round(agg[k]/mx*100)}%;background:${subjectColor(k)}"></div></div><span class="value-label">${hoursLabel(agg[k])} 小時</span></div>`).join('')}</div>`
}
function pie(agg){
  const ks=Object.keys(agg).filter(k=>agg[k]>0).sort((a,b)=>agg[b]-agg[a]);if(!ks.length)return'<div class="empty">這個期間還沒有紀錄。</div>';
  const total=ks.reduce((s,k)=>s+agg[k],0);let cur=0;const ps=ks.map(k=>{const n=cur+agg[k]/total*360,r=`${subjectColor(k)} ${cur}deg ${n}deg`;cur=n;return r});
  return `<div class="piewrap"><div class="pie" style="background:conic-gradient(${ps.join(',')})"></div><div class="legend">${ks.map(k=>`<div class="legendrow"><span class="dot" style="background:${subjectColor(k)}"></span><b>${esc(k)}</b><span class="value-label">${hoursLabel(agg[k])} 小時</span></div>`).join('')}</div></div>`
}
function statsView(){
  const rows=sessionSlice(),agg=aggSessions(rows),total=rows.reduce((s,x)=>s+Number(x.seconds||0),0);
  return `${top('學習時間統計')}<section class="card"><div class="portal-title"><div><div class="hint">由 To Do 帶入番茄鐘後，自動累積每天、每週、每月各科時數。</div></div>${scopeButtons()}</div>
  <div class="stats"><div class="stat">總專注<strong>${hoursLabel(total)} 小時</strong></div><div class="stat">完成番茄<strong>${rows.filter(x=>x.completedPomodoro!==false).length}</strong></div><div class="stat">科目數<strong>${Object.keys(agg).length}</strong></div><div class="stat">全部紀錄<strong>${state.sessions.length}</strong></div></div>
  <div class="actions"><button class="btn ${chart==='bar'?'active':''}" data-chart="bar">▥ 長條圖</button><button class="btn ${chart==='pie'?'active':''}" data-chart="pie">◉ 圓餅圖</button><button id="demo" class="orange btn">載入試用資料</button></div>
  <div class="chartbox">${chart==='bar'?bar(agg):pie(agg)}</div></section>`
}

function examHtml(x,i){
  const list=examSubjects[state.stage]||[],customType=!examTypes.includes(x.type)||x.type==='其他';
  return `<article class="exam"><label class="label">日期<input class="field" type="date" data-ei="${i}" data-ek="date" value="${esc(x.date)}"></label>
  <label class="label">考試類型<select class="field" data-ei="${i}" data-ek="type">${examTypes.map(t=>`<option ${t===x.type||(t==='其他'&&!examTypes.includes(x.type))?'selected':''}>${t}</option>`).join('')}</select></label>
  ${customType?`<label class="label">其他考試名稱<input class="field" data-etc="${i}" value="${esc(x.type==='其他'?'':x.type)}"></label>`:''}
  <label class="label">科目<select class="field" data-es="${i}">${subjectOpts(list,x.subject)}</select></label>
  <label class="label">分數<input class="field" type="number" min="0" max="100" data-ei="${i}" data-ek="score" value="${esc(x.score)}"></label>
  <label class="label">備註／範圍<input class="field" data-ei="${i}" data-ek="note" value="${esc(x.note||'')}"></label><button class="danger" data-edel="${i}">刪除</button></article>`
}
function trendStudyWindow(exam,kind){return kind==='quiz'?weekRange(exam.date):[firstOfMonth(exam.date),lastOfMonth(exam.date)]}
function assessmentLabel(x){
  if(x.type==='小考')return x.note||'小考';
  if(x.type==='第一次期中考')return'一中';
  if(x.type==='第二次期中考')return'二中';
  if(x.type==='期末考')return'期末';
  if(x.type==='第一次模擬考')return'模1';
  if(x.type==='第二次模擬考')return'模2';
  if(x.type==='第三次模擬考')return'模3';
  return x.type
}
function lineSvg(subject,kind){
  const start=state.compareStart||firstOfMonth(state.analysisDate),end=state.compareEnd||state.analysisDate;
  if(start>end)return'<div class="empty">開始日期不可晚於結束日期。</div>';
  const exams=state.exams.filter(x=>x.subject===subject&&x.score!==''&&x.date>=start&&x.date<=end&&(kind==='quiz'?x.type==='小考':x.type&&x.type!=='小考')).sort((a,b)=>a.date.localeCompare(b.date));
  if(!exams.length)return`<div class="empty">此時間段尚無${kind==='quiz'?'小考':'大考／模擬考'}分數。</div>`;
  const events=exams.map(exam=>{const range=trendStudyWindow(exam,kind),seconds=inclusiveRows(state.sessions,range[0],range[1]).filter(s=>s.subject===subject).reduce((a,s)=>a+Number(s.seconds||0),0);return{exam,start:range[0],end:range[1],seconds}});
  const color=subjectColor(subject),maxHours=Math.max(.25,...events.map(x=>x.seconds/3600)),W=Math.max(420,events.length*100+90),H=330,L=48,R=48,T=34,B=84,w=W-L-R,h=H-T-B;
  const xa=i=>events.length===1?L+w/2:L+i*w/(events.length-1),scoreY=s=>T+h-Number(s)/100*h;
  let grid='';[0,25,50,75,100].forEach(v=>{const y=scoreY(v);grid+=`<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" stroke="#dce7dd"/><text x="${L-8}" y="${y+4}" text-anchor="end" font-size="11">${v}</text>`});
  const bw=Math.max(24,Math.min(46,w/Math.max(events.length*2.1,1)));
  const bars=events.map((x,i)=>{const hrs=x.seconds/3600,height=maxHours?hrs/maxHours*h*.72:0,y=T+h-height;return`<rect x="${xa(i)-bw/2}" y="${y}" width="${bw}" height="${height}" rx="8" fill="#879b89" opacity=".44"/><text x="${xa(i)}" y="${Math.max(T+12,y-6)}" text-anchor="middle" font-size="11" fill="#5d7261">${hoursLabel(x.seconds)}h</text>`}).join('');
  const pts=events.map((x,i)=>`${xa(i)},${scoreY(x.exam.score)}`).join(' ');
  const dots=events.map((x,i)=>{const y=scoreY(x.exam.score),label=assessmentLabel(x.exam);return`<circle cx="${xa(i)}" cy="${y}" r="5" fill="${color}"/><text x="${xa(i)}" y="${y-10}" text-anchor="middle" font-size="12" font-weight="800">${x.exam.score}</text><text x="${xa(i)}" y="${H-45}" text-anchor="middle" font-size="10" font-weight="700">${esc(label)}</text><text x="${xa(i)}" y="${H-28}" text-anchor="middle" font-size="9" fill="#68756c">${esc(shortDate(x.exam.date))}</text>`}).join('');
  const rule=kind==='quiz'?'每個小考分數點重疊該小考所在週的同科研讀總時數。':'每個大考分數點重疊該場考試所在月份的同科研讀總時數。';
  return `<div class="dual-legend"><span><span class="swatch study-swatch"></span>研讀時數（小時）</span><span><span class="swatch" style="background:${color}"></span>${esc(subject)}分數</span><b>統計區間 ${periodText(start,end)}</b></div>
  <svg class="trend-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${bars}<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg><div class="hint">${rule} 不再顯示單一課次的一次性長條圖。</div>`
}
function examsView(){
  const all=[...new Set([...(examSubjects[state.stage]||[]),...state.exams.map(x=>x.subject).filter(Boolean)])];if(!trendSubject||!all.includes(trendSubject))trendSubject=all[0]||'';
  const hidden=Math.max(0,state.exams.length-examFormLimit);
  return `${top('成績／趨勢')}<section class="card"><div class="portal-title"><div><div class="hint">預設只顯示兩組成績輸入欄位；不夠再新增。</div></div><div class="actions"><button id="addExam" class="primary">＋新增成績欄位</button><button id="showTrend" class="blue btn">📈 趨勢圖</button></div></div>
  <div class="exams">${state.exams.length?state.exams.slice(0,examFormLimit).map(examHtml).join(''):'<div class="empty">尚無成績紀錄。</div>'}</div>${hidden?`<div class="hint">另有 ${hidden} 筆歷史成績已收合，仍會參與趨勢統計。</div>`:''}</section>
  <section id="trendPanel" class="card"><div class="portal-title"><div><h2>📈 同科研讀時數 × 成績趨勢</h2><div class="hint">只保留每週研讀時間 vs 小考分數，以及每月研讀時間 vs 大考／模擬考分數。</div></div><select id="trend" class="field" style="width:auto">${all.map(x=>`<option ${x===trendSubject?'selected':''}>${esc(x)}</option>`).join('')}</select></div>
  <div class="range-grid"><label class="label">統計開始<input id="compareStart" class="field" type="date" value="${esc(state.compareStart)}"></label><label class="label">統計結束<input id="compareEnd" class="field" type="date" value="${esc(state.compareEnd)}"></label><button id="monthRange" class="secondary">本月</button></div>
  <div class="trend-pair"><div><h3>小考｜每週研讀時間 vs 分數折線圖</h3><div class="chartbox">${lineSvg(trendSubject,'quiz')}</div></div><div><h3>大考｜每月研讀時間 vs 分數折線圖</h3><div class="chartbox">${lineSvg(trendSubject,'major')}</div></div></div></section>`
}

function isMajor(type,title=''){return/期中考|期末考|模擬考/.test(String(type)+' '+String(title))}
function calendarTypeOptions(v){return['一般','活動','放假','小考','期中考','期末考','模擬考'].map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join('')}
function addCalendarEvent(raw){const date=String(raw.date||''),title=String(raw.title||'').trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!title)return false;const type=raw.type||'一般';state.calendarEvents.push({id:uid('cal'),date,title,type,note:String(raw.note||''),star:raw.star===true||isMajor(type,title),reminderWeeks:Number(raw.reminderWeeks||2),plan:Array.isArray(raw.plan)?raw.plan:[]});return true}
function daysUntil(date){const a=new Date(today()+'T00:00:00'),b=new Date(date+'T00:00:00');return Math.ceil((b-a)/86400000)}
function createExamPlan(i){
  const ev=state.calendarEvents[i];if(!ev)return;const weeks=Math.max(1,Math.min(4,Number(ev.reminderWeeks||2)));
  const offsets=weeks===4?[-28,-21,-14,-7,-2]:weeks===3?[-21,-14,-7,-2]:weeks===2?[-14,-7,-2]:[-7,-3,-1];
  const labels=weeks===4?['確認考試範圍並安排四週進度','第一輪完整複習','第二輪重點與錯題整理','模擬演練與弱點加強','考前重點快速回顧']:weeks===3?['整理考試範圍與進度','第一輪完整複習','錯題與模擬演練','重點快速回顧']:weeks===2?['整理範圍並開始第一輪複習','弱點加強與模擬題','重點快速回顧']:['開始一週衝刺複習','錯題與重點整理','考前快速回顧'];
  ev.plan=offsets.map((o,j)=>({date:addDays(ev.date,o),text:labels[j],done:false}));save()
}
function calendarGridHtml(){
  const anchor=new Date((state.calendarMonth||firstOfMonth(today()))+'T12:00:00'),y=anchor.getFullYear(),m=anchor.getMonth(),first=new Date(y,m,1,12),last=new Date(y,m+1,0,12),cells=[];
  for(let i=0;i<first.getDay();i++)cells.push('<div class="calendar-day"></div>');
  for(let d=1;d<=last.getDate();d++){const date=dk(new Date(y,m,d,12)),items=state.calendarEvents.filter(x=>x.date===date).sort((a,b)=>Number(b.star)-Number(a.star));cells.push(`<div class="calendar-day ${date===today()?'today':''}"><b>${d}</b>${items.map(x=>`<span class="calendar-chip ${x.star?'major':''}">${x.star?'★ ':''}${esc(x.title)}</span>`).join('')}</div>`)}
  return `<div class="calendar-weekdays"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div><div class="calendar-grid">${cells.join('')}</div>`
}
function calendarView(){
  const anchor=new Date((state.calendarMonth||firstOfMonth(today()))+'T12:00:00'),title=`${anchor.getFullYear()} 年 ${anchor.getMonth()+1} 月`;
  const sorted=state.calendarEvents.map((x,i)=>({x,i})).sort((a,b)=>a.x.date.localeCompare(b.x.date)),exams=sorted.filter(({x})=>x.star||isMajor(x.type,x.title));
  return `${top('學校行事曆')}<section class="card">
  <div class="manual-grid" style="margin-top:12px"><label class="label">日期<input id="calDate" class="field" type="date" value="${today()}"></label><label class="label">類型<select id="calType" class="field">${calendarTypeOptions('一般')}</select></label><label class="label wide-field">事項<input id="calTitle" class="field" placeholder="例如：第一次期中考"></label><label class="label wide-field">備註<input id="calNote" class="field" placeholder="例如：國語、數學、自然"></label><label class="star-check"><input id="calStar" type="checkbox"> ★ 重要考試</label><button id="addCalendarEvent" class="primary">＋加入行事曆</button></div></section>
  <section class="paper"><div class="calendar-toolbar"><button id="prevMonth">‹</button><h2>${title}</h2><button id="nextMonth">›</button></div>${calendarGridHtml()}</section>
  <section class="card"><h2>⭐ 考前複習提醒</h2><div class="hint">可選考前 4、3、2、1 週開始。</div><div class="exam-reminders">${exams.length?exams.map(({x,i})=>{const left=daysUntil(x.date),start=addDays(x.date,-7*Number(x.reminderWeeks||2)),active=today()>=start&&today()<=x.date;return`<article class="exam-reminder"><div class="exam-reminder-head"><div><b>★ ${esc(x.title)}</b><div class="hint">${esc(x.date)}｜${esc(x.type)}</div></div><div><button class="star-btn" data-cal-star="${i}">${x.star?'★':'☆'}</button><button class="mini-delete" data-cal-del="${i}">刪除</button></div></div><div class="countdown ${active?'active-reminder':''}">${left>=0?'倒數 '+left+' 天':'已結束 '+Math.abs(left)+' 天'}｜${active?'現在應開始準備':'計畫從 '+start+' 開始'}</div><div class="reminder-controls"><label class="label">開始時間<select class="field" data-rem-weeks="${i}">${[4,3,2,1].map(w=>`<option value="${w}" ${Number(x.reminderWeeks)===w?'selected':''}>考前 ${w} 週</option>`).join('')}</select></label><button class="primary" data-build-plan="${i}">建立讀書計畫</button></div>${x.plan?.length?`<div class="study-plan">${x.plan.map((p,pi)=>`<label class="plan-item"><input type="checkbox" data-plan-check="${i}:${pi}" ${p.done?'checked':''}><span><b>${esc(p.date)}</b> ${esc(p.text)}</span></label>`).join('')}</div>`:''}</article>`}).join(''):'<div class="empty">目前沒有標示 ★ 的考試。</div>'}</div></section>
  <section class="card"><h2>全部行事</h2><div class="calendar-list">${sorted.length?sorted.map(({x,i})=>`<div class="calendar-row"><span><b>${esc(x.date)}</b></span><button class="star-btn" data-cal-star="${i}">${x.star?'★':'☆'}</button><div><b>${esc(x.title)}</b><div class="hint">${esc(x.type)}${x.note?'｜'+esc(x.note):''}</div></div><button class="mini-delete" data-cal-del="${i}">刪除</button></div>`).join(''):'<div class="empty">尚無行事資料。</div>'}</div></section>`
}

function memoryOffsets(x){return Array.isArray(x.offsets)&&x.offsets.length?x.offsets:[1,3,7,30]}
function addTaskToMemory(i){const x=tasks()[i];if(!x||!x.subject||!String(x.task||'').trim())return alert('請先填寫科目與功課內容。');const old=state.magicMemory.find(m=>m.sourceTaskId===x.id&&m.sourceDate===state.date);if(old){old.subject=x.subject;old.task=x.task}else state.magicMemory.unshift({id:uid('mem'),sourceTaskId:x.id,sourceDate:state.date,subject:x.subject,task:x.task,scope:x.task,offsets:[1,3,7,30]});save();view='memory';render()}
function magicMemoryView(){
  const cards=state.magicMemory.map((x,i)=>`<article class="memory-card"><div class="taskhead"><b>${esc(x.subject)}｜${esc(x.task)}</b><button class="danger" data-mem-del="${i}">刪除</button></div><label class="label">複習範圍<textarea class="field" data-mem-scope="${i}">${esc(x.scope||'')}</textarea></label><div class="memory-offset-grid">${memoryOffsets(x).map((n,oi)=>`<label class="label">第 ${oi+1} 次 +天數<input class="field" type="number" min="1" max="365" data-mem-offset="${i}:${oi}" value="${Number(n)}"></label>`).join('')}</div></article>`).join('');
  return `${top('魔法記憶')}<section class="card"><h2>🧠 魔法記憶</h2><div class="hint">由 To Do 帶入功課；預設 +1、+3、+7、+30，複習範圍與天數都可編輯。</div>${cards||'<div class="empty">目前沒有功課，請先從 To Do 帶入。</div>'}</section>`
}
function dailyTaskMapView(){
  const date=state.dailyMapDate||today(),todoRows=state.tasks[date]||[],reviews=[];
  state.magicMemory.forEach(m=>memoryOffsets(m).forEach((n,oi)=>{if(addDays(m.sourceDate,Number(n))===date)reviews.push({m,oi,n})}));
  return `${top('每日任務地圖')}<section class="card"><div class="portal-title"><div><h2>🗺️ 每日任務地圖</h2><div class="hint">由當日 To Do 與到期的魔法記憶複習組成。</div></div><label class="label">日期<input id="dailyMapDate" class="field" type="date" value="${esc(date)}"></label></div><div class="daily-map-grid"><div><h3>✅ 今日 To Do</h3>${todoRows.map(x=>`<article class="daily-map-card"><b>${esc(x.subject||'未選科目')}</b><span>${esc(x.task||'未填工作')}</span><small>${x.status==='completed'?'已完成':'未完成'}</small></article>`).join('')||'<div class="empty">這一天沒有 To Do。</div>'}</div><div><h3>🧠 今日複習</h3>${reviews.map(r=>`<article class="daily-map-card"><b>🧠 ${esc(r.m.subject)}</b><span>${esc(r.m.scope||r.m.task||'')}</span><small>第 ${r.oi+1} 次複習｜D+${Number(r.n)}</small></article>`).join('')||'<div class="empty">這一天沒有魔法記憶複習。</div>'}</div></div></section>`
}

function unlockAudio(){try{const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;if(!audioCtx)audioCtx=new Ctx();if(audioCtx.state==='suspended')audioCtx.resume()}catch{}}
function beep(){if(!audioCtx)return;try{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=880;g.gain.setValueAtTime(.0001,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.16,audioCtx.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.22);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.24)}catch{}}
function stopAlarm(){alarmActive=false;if(alarmTick)clearInterval(alarmTick);if(alarmTimeout)clearTimeout(alarmTimeout);alarmTick=alarmTimeout=null}
function startAlarm(){unlockAudio();stopAlarm();alarmActive=true;beep();alarmTick=setInterval(beep,1000);alarmTimeout=setTimeout(()=>{stopAlarm();render()},60000)}
function setTimerWorkDone(done){if(!timer)return;if(timer.kind==='review'&&timer.reviewKey){state.reviewCompletions[timer.reviewKey]=!!done}else{const t=tasks().find(x=>x.id===timer.id);if(t)t.status=done?'completed':'pending'}}
function saveFocus(seconds,markCompleted,outcome){if(!timer||timer.recordedFocus)return;const sec=Math.max(0,Math.round(seconds||0));if(sec>0){const completedPomodoro=outcome==='stop-incomplete'?false:true;state.sessions.push({id:uid('s'),timerId:timer.id,date:timer.date,start:timer.start,end:timer.end,subject:timer.subject,task:timer.task,seconds:sec,cycle:timer.cycle,outcome:outcome||'completed',completedPomodoro});timer.recordedFocus=true}if(markCompleted)setTimerWorkDone(true);save()}
function timerLoad(i){const x=tasks()[i],m=mins(x.start,x.end),mode=timerModeConfig(timerMode);if(!m)return alert('請先填有效開始與結束時間。');if(!x.subject)return alert('請先選科目。');stopAlarm();timer={id:x.id,date:state.date,start:x.start,end:x.end,subject:x.subject,task:x.task,focusSeconds:mode.focus,breakSeconds:mode.break,remain:mode.focus,elapsed:0,running:false,phase:'focus',cycle:1,recordedFocus:false};render()}
function updateClock(){const e=document.getElementById('clock');if(e)e.textContent=fmt(timer?timer.remain:0);const b=document.getElementById('start');if(b)b.textContent=timer&&timer.running?'暫停':timer&&timer.phase==='break'?'開始休息':'開始';const arc=document.getElementById('timerArc');if(arc){const mode=timerModeConfig(timerMode),total=timer?(timer.phase==='break'?timer.breakSeconds:timer.focusSeconds):mode.focus,ratio=timer&&total?Math.max(0,Math.min(1,timer.remain/total)):1;arc.style.strokeDashoffset=String(339.3*(1-ratio))}}
function running(on){if(!timer||timer.phase==='ready')return;if(on)unlockAudio();timer.running=on;if(tick)clearInterval(tick);tick=null;if(on)tick=setInterval(()=>{if(!timer||!timer.running)return;timer.remain=Math.max(0,timer.remain-1);timer.elapsed++;updateClock();if(timer.remain<=0)handleTimerEnd()},1000);updateClock()}
function handleTimerEnd(){if(!timer)return;running(false);if(timer.phase==='focus'){saveFocus(timer.focusSeconds,false,'timeout');timer.phase='break';timer.remain=timer.breakSeconds;timer.elapsed=0}else{timer.phase='ready';timer.remain=0}startAlarm();render()}
function anotherPomodoro(){if(!timer||timer.cycle>=maxPomodorosByStage())return;running(false);stopAlarm();if(timer.phase==='focus'&&!timer.recordedFocus&&timer.elapsed>0)saveFocus(timer.elapsed,false,'partial');setTimerWorkDone(false);save();timer.cycle+=1;timer.phase='focus';timer.remain=timer.focusSeconds;timer.elapsed=0;timer.recordedFocus=false;timer.workStatus='';render()}
function complete(){if(!timer)return;running(false);stopAlarm();if(!timer.recordedFocus&&timer.phase==='focus'&&timer.elapsed>0)saveFocus(timer.elapsed,true);else{const t=tasks().find(x=>x.id===timer.id);if(t)t.status='completed';save()}timer=null;view='stats';render()}
function updateTimerStatusChoice(){const select=document.getElementById('timerWorkStatus'),again=document.getElementById('again');if(!select||!again)return;if(timer)timer.workStatus=select.value;again.hidden=!(timer&&select.value==='timeout-incomplete'&&timer.cycle<maxPomodorosByStage()&&timer.phase!=='focus')}
function startSecondPomodoro(){if(!timer||timer.cycle>=maxPomodorosByStage()||timer.workStatus!=='timeout-incomplete'||timer.phase==='focus')return;setTimerWorkDone(false);anotherPomodoro()}
function recordTimerStatus(){
  const select=document.getElementById('timerWorkStatus');if(!timer||!select)return;const status=select.value;if(!status)return alert('請先選擇工作狀態。');
  const timeStillRunning=timer.phase==='focus'&&timer.remain>0;
  if((status==='completed'||status==='timeout-incomplete')&&timeStillRunning)return alert('番茄鐘時間尚未結束；若工作已完成，請選擇「暫停，工作已提前完成」。');
  if(status==='early-complete'&&!timeStillRunning)return alert('此選項適用於時間尚未到、工作已提前完成。');
  running(false);stopAlarm();
  if(status==='early-complete'){if(timer.elapsed<=0)return alert('尚未產生可記錄的專注時間。');saveFocus(timer.elapsed,true,'early-complete')}
  else if(status==='stop-incomplete'){if(!timer.recordedFocus&&timer.elapsed>0)saveFocus(timer.elapsed,false,'stop-incomplete');setTimerWorkDone(false)}
  else if(status==='completed'){setTimerWorkDone(true)}
  else if(status==='timeout-incomplete'){setTimerWorkDone(false)}
  save();timer=null;view='stats';render()
}

function demo(){
  if(!state.sessions.some(x=>String(x.id).startsWith('demoS'))){
    const rows=[[-20,'國語',80],[-19,'國語',100],[-13,'國語',130],[-12,'國語',50],[-6,'國語',120],[-5,'國語',60],[-20,'數學',90],[-13,'數學',110],[-6,'數學',140]];
    rows.forEach((d,i)=>state.sessions.push({id:'demoS'+i,date:addDays(today(),d[0]),start:'19:00',end:'20:00',subject:d[1],task:'示範',seconds:d[2]*60}))
  }
  if(!state.exams.some(x=>String(x.id).startsWith('demoE'))){
    const rows=[[-18,'小考','國語',85,'第一週'],[-11,'小考','國語',88,'第二週'],[-4,'小考','國語',92,'第三週'],[-18,'第一次期中考','國語',78,''],[-9,'第二次期中考','國語',84,''],[-2,'期末考','國語',88,'']];
    rows.forEach((d,i)=>state.exams.push({id:'demoE'+i,date:addDays(today(),d[0]),type:d[1],subject:d[2],score:d[3],note:d[4]}))
  }
  state.compareStart=addDays(today(),-21);state.compareEnd=today();save();render()
}

function render(){
  const content=view==='home'?homeView():view==='todo'?todoView():view==='calendar'?calendarView():view==='stats'?statsView():view==='exams'?examsView():view==='dailyMap'?dailyTaskMapView():magicMemoryView();
  document.getElementById('app').innerHTML=`<main class="app">${content}<div class="footer">咬一口蕃茄鐘｜學習魔法闖關遊戲</div></main>`;
  bind();updateClock()
}
function bind(){
  document.querySelectorAll('[data-view]').forEach(e=>e.onclick=()=>{view=e.dataset.view;render()});
  const tb=document.getElementById('toolboxLink');if(tb)tb.onclick=()=>location.href='./app.html';
  if(view==='todo')bindTodo();if(view==='calendar')bindCalendar();if(view==='stats')bindStats();if(view==='exams')bindExams();if(view==='memory')bindMemory();if(view==='dailyMap')bindDailyMap()
}
function bindTodo(){
  document.getElementById('date').onchange=function(){state.date=this.value||today();tasks();save();render()};
  document.getElementById('stage').onchange=function(){state.stage=this.value;save();render()};
  document.getElementById('editSubs').onclick=()=>{editor=!editor;render()};
  document.getElementById('addTask').onclick=()=>{tasks().unshift({id:uid('t'),start:'',end:'',subject:subjects()[0]||'',task:'',status:'pending'});taskFormLimit++;save();render()};
  if(editor){
    document.querySelectorAll('[data-subedit]').forEach(e=>e.onchange=()=>{const i=+e.dataset.subedit,o=subjects()[i],n=e.value.trim();if(!n)return;subjects()[i]=n;Object.values(state.tasks).flat().forEach(t=>{if(t.subject===o)t.subject=n});state.sessions.forEach(s=>{if(s.subject===o)s.subject=n});state.exams.forEach(s=>{if(s.subject===o)s.subject=n});save();render()});
    document.querySelectorAll('[data-subdel]').forEach(e=>e.onclick=()=>{subjects().splice(+e.dataset.subdel,1);save();render()});
    document.getElementById('addSub').onclick=()=>{const v=document.getElementById('newSub').value.trim();if(v&&!subjects().includes(v))subjects().push(v);save();render()}
  }
  document.querySelectorAll('[data-ti]').forEach(e=>e.onchange=()=>{tasks()[+e.dataset.ti][e.dataset.k]=e.value;save();render()});
  document.querySelectorAll('[data-ts]').forEach(e=>e.onchange=()=>{tasks()[+e.dataset.ts].subject=e.value==='__custom__'?'':e.value;save();render()});
  document.querySelectorAll('[data-tc]').forEach(e=>e.onchange=()=>{tasks()[+e.dataset.tc].subject=e.value.trim();save();render()});
  document.querySelectorAll('[data-del]').forEach(e=>e.onclick=()=>{tasks().splice(+e.dataset.del,1);save();render()});
  document.querySelectorAll('[data-timer]').forEach(e=>e.onclick=()=>timerLoad(+e.dataset.timer));
  document.querySelectorAll('[data-memory]').forEach(e=>e.onclick=()=>addTaskToMemory(+e.dataset.memory));
  document.querySelectorAll('[data-mode]').forEach(e=>e.onclick=()=>{if(timer&&timer.running)return alert('請先暫停番茄鐘再切換模式。');timerMode=e.dataset.mode;if(timer){const m=timerModeConfig(timerMode);timer.focusSeconds=m.focus;timer.breakSeconds=m.break;timer.phase='focus';timer.remain=m.focus;timer.elapsed=0;timer.recordedFocus=false;stopAlarm()}render()});
  const s=document.getElementById('start'),status=document.getElementById('timerWorkStatus'),record=document.getElementById('recordTimerStatus'),a=document.getElementById('again'),stop=document.getElementById('stopAlarm');if(s)s.onclick=()=>running(!(timer&&timer.running));if(status)status.onchange=()=>updateTimerStatusChoice();if(record)record.onclick=()=>recordTimerStatus();if(a)a.onclick=()=>startSecondPomodoro();if(stop)stop.onclick=()=>{stopAlarm();render()};
  const show=document.getElementById('showAddTimer'),form=document.getElementById('addTimerForm'),add=document.getElementById('addTimerMode');if(show&&form)show.onclick=()=>form.classList.toggle('open');if(add)add.onclick=()=>{const focus=Math.max(1,Math.min(180,+document.getElementById('customFocus').value||0)),rest=Math.max(1,Math.min(60,+document.getElementById('customBreak').value||0)),id='custom-'+Date.now();state.customTimerModes.push({id,label:focus+' / '+rest,focus:focus*60,break:rest*60});timerMode=id;save();render()};
  document.querySelectorAll('[data-custom-mode-del]').forEach(e=>e.onclick=()=>{const x=state.customTimerModes[+e.dataset.customModeDel];if(x&&timerMode===x.id)timerMode='25/5';state.customTimerModes.splice(+e.dataset.customModeDel,1);save();render()})
}
function bindStats(){
  document.querySelectorAll('[data-scope]').forEach(e=>e.onclick=()=>{scope=e.dataset.scope;render()});
  const a=document.getElementById('analysisDate');if(a)a.onchange=function(){state.analysisDate=this.value||today();save();render()};
  document.querySelectorAll('[data-chart]').forEach(e=>e.onclick=()=>{chart=e.dataset.chart;render()});
  document.getElementById('demo').onclick=demo
}
function bindExams(){
  document.getElementById('addExam').onclick=()=>{state.exams.unshift({id:uid('e'),date:state.analysisDate,type:'小考',subject:(examSubjects[state.stage]||[])[0]||'',score:'',note:''});examFormLimit++;save();render()};
  document.querySelectorAll('[data-ei]').forEach(e=>e.onchange=()=>{const x=state.exams[+e.dataset.ei];x[e.dataset.ek]=e.dataset.ek==='score'?(e.value===''?'':Math.max(0,Math.min(100,+e.value))):e.value;save();render()});
  document.querySelectorAll('[data-etc]').forEach(e=>e.onchange=()=>{const x=state.exams[+e.dataset.etc];if(x)x.type=e.value.trim()||'其他';save();render()});
  document.querySelectorAll('[data-es]').forEach(e=>e.onchange=()=>{state.exams[+e.dataset.es].subject=e.value;save();render()});
  document.querySelectorAll('[data-edel]').forEach(e=>e.onclick=()=>{if(confirm('確定刪除這筆成績？')){state.exams.splice(+e.dataset.edel,1);save();render()}});
  const t=document.getElementById('trend');if(t)t.onchange=function(){trendSubject=this.value;render()};
  const cs=document.getElementById('compareStart'),ce=document.getElementById('compareEnd'),mr=document.getElementById('monthRange');if(cs)cs.onchange=function(){state.compareStart=this.value||firstOfMonth(state.analysisDate);save();render()};if(ce)ce.onchange=function(){state.compareEnd=this.value||state.analysisDate;save();render()};if(mr)mr.onclick=()=>{state.compareStart=firstOfMonth(state.analysisDate);state.compareEnd=lastOfMonth(state.analysisDate);save();render()};
  const st=document.getElementById('showTrend');if(st)st.onclick=()=>document.getElementById('trendPanel')?.scrollIntoView({behavior:'smooth'})
}
function bindCalendar(){
  document.getElementById('addCalendarEvent').onclick=()=>{const date=document.getElementById('calDate').value,title=document.getElementById('calTitle').value.trim(),type=document.getElementById('calType').value,note=document.getElementById('calNote').value.trim(),star=document.getElementById('calStar').checked;if(!date||!title)return alert('請先填寫日期與事項。');addCalendarEvent({date,title,type,note,star});save();render()};
  document.getElementById('prevMonth').onclick=()=>{const d=new Date(state.calendarMonth+'T12:00:00');d.setMonth(d.getMonth()-1);state.calendarMonth=dk(new Date(d.getFullYear(),d.getMonth(),1,12));save();render()};
  document.getElementById('nextMonth').onclick=()=>{const d=new Date(state.calendarMonth+'T12:00:00');d.setMonth(d.getMonth()+1);state.calendarMonth=dk(new Date(d.getFullYear(),d.getMonth(),1,12));save();render()};
  document.querySelectorAll('[data-cal-del]').forEach(e=>e.onclick=()=>{state.calendarEvents.splice(+e.dataset.calDel,1);save();render()});
  document.querySelectorAll('[data-cal-star]').forEach(e=>e.onclick=()=>{const x=state.calendarEvents[+e.dataset.calStar];if(x)x.star=!x.star;save();render()});
  document.querySelectorAll('[data-rem-weeks]').forEach(e=>e.onchange=()=>{const x=state.calendarEvents[+e.dataset.remWeeks];if(x){x.reminderWeeks=+e.value;x.plan=[];save();render()}});
  document.querySelectorAll('[data-build-plan]').forEach(e=>e.onclick=()=>{createExamPlan(+e.dataset.buildPlan);render()});
  document.querySelectorAll('[data-plan-check]').forEach(e=>e.onchange=()=>{const [i,pi]=e.dataset.planCheck.split(':').map(Number);if(state.calendarEvents[i]?.plan?.[pi])state.calendarEvents[i].plan[pi].done=e.checked;save()})
}
function bindMemory(){
  document.querySelectorAll('[data-mem-scope]').forEach(e=>e.onchange=()=>{const x=state.magicMemory[+e.dataset.memScope];if(x){x.scope=e.value;save()}});
  document.querySelectorAll('[data-mem-offset]').forEach(e=>e.onchange=()=>{const [i,oi]=e.dataset.memOffset.split(':').map(Number),x=state.magicMemory[i];if(!x)return;const a=memoryOffsets(x);a[oi]=Math.max(1,Math.min(365,Number(e.value||1)));x.offsets=a;save();render()});
  document.querySelectorAll('[data-mem-del]').forEach(e=>e.onclick=()=>{if(confirm('確定刪除這筆魔法記憶？')){state.magicMemory.splice(+e.dataset.memDel,1);save();render()}})
}
function bindDailyMap(){const d=document.getElementById('dailyMapDate');if(d)d.onchange=()=>{state.dailyMapDate=d.value||today();save();render()}}
render();
