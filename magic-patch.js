(function(){
'use strict';
if(typeof render!=='function'||typeof state==='undefined')return;
var PORTAL='bitepomodoro.github.portal.';
var PRESETS=[1,3,7,30];
function pget(k,f){try{var v=localStorage.getItem(PORTAL+k);return v?JSON.parse(v):f}catch(e){return f}}
function magicLevel(stage){return stage==='junior'?'中級（國中）':stage==='senior'?'高級（高中）':'初級（國小）'}
var portalStudents=pget('students',[]),sid=pget('studentId',''),activeMagician=null;
if(Array.isArray(portalStudents))activeMagician=portalStudents.find(function(x){return x.id===sid})||null;
if(activeMagician){var st=activeMagician.stage||(activeMagician.level==='國中'?'junior':activeMagician.level==='高中'?'senior':'elementary');if(['elementary','junior','senior'].indexOf(st)>=0)state.stage=st}
state.subjects=JSON.parse(JSON.stringify(studyDefaults));
if(Array.isArray(state.magicMemory))state.magicMemory.forEach(function(x){var a=Array.isArray(x.offsets)?x.offsets.map(Number).filter(function(n){return PRESETS.indexOf(n)>=0}):[];x.offsets=a.length?a:PRESETS.slice()});
if(!state.reviewCompletions||typeof state.reviewCompletions!=='object')state.reviewCompletions={};
save();

function reviewKey(m,n,date){return String(m.id||m.sourceTaskId||'memory')+'|'+String(date)+'|'+String(n)}
function reviewsForDate(date){
  var rows=[];
  if(!Array.isArray(state.magicMemory))return rows;
  state.magicMemory.forEach(function(m){
    memoryOffsets(m).forEach(function(n,oi){
      n=Number(n);
      if(addDays(m.sourceDate,n)===date){var key=reviewKey(m,n,date);rows.push({m:m,oi:oi,n:n,key:key,done:!!state.reviewCompletions[key]})}
    });
  });
  return rows;
}
function todayOverviewHtml(){
  var date=state.date||today(),todoRows=state.tasks[date]||[],reviews=reviewsForDate(date),bySubject={};
  function slot(subject){subject=subject||'未選科目';if(!bySubject[subject])bySubject[subject]={subject:subject,todos:[],reviews:[]};return bySubject[subject]}
  todoRows.forEach(function(t){slot(t.subject).todos.push(t)});
  reviews.forEach(function(r){slot(r.m.subject).reviews.push(r)});
  var groups=Object.keys(bySubject).sort(function(a,b){return a.localeCompare(b,'zh-Hant')}).map(function(k){return bySubject[k]});
  if(!groups.length)return '<section class="today-study-panel"><div class="today-study-title"><div><h2>✨ 今日學習清單</h2><p>把 To Do 與到期複習放在同一張清單，不再另外使用「每日任務地圖」。</p></div></div><div class="empty">今天還沒有 To Do，也沒有到期複習。</div></section>';
  var header='<div class="today-list-head"><b>科目</b><b>今日 To Do</b><b>今日複習蕃茄鐘</b><b>進度</b></div>';
  var body=groups.map(function(g){
    var todos=g.todos.length?g.todos.map(function(t){return '<div class="today-item '+(t.status==='completed'?'is-done':'')+'"><span>'+(t.status==='completed'?'✓':'○')+'</span><span>'+esc(t.task||'未填工作內容')+'</span></div>'}).join(''):'<span class="today-none">—</span>';
    var revs=g.reviews.length?g.reviews.map(function(r){var idx=reviews.indexOf(r);return '<div class="review-inline '+(r.done?'is-done':'')+'"><label class="review-check"><input type="checkbox" data-review-check="'+idx+'" '+(r.done?'checked':'')+'><span>'+(r.done?'已複習':'待複習')+'</span></label><div class="review-copy"><b>D+'+r.n+'｜'+esc(r.m.scope||r.m.task||'複習')+'</b><small>第 '+(r.oi+1)+' 次複習</small></div><button type="button" class="review-pomo-btn" data-review-timer="'+idx+'" '+(r.done?'disabled':'')+'>🍅 '+(r.done?'已完成':'開始複習')+'</button></div>'}).join(''):'<span class="today-none">—</span>';
    var todoDone=g.todos.filter(function(t){return t.status==='completed'}).length,reviewDone=g.reviews.filter(function(r){return r.done}).length,total=g.todos.length+g.reviews.length,done=todoDone+reviewDone;
    return '<div class="today-list-row"><div class="today-cell subject-cell" data-label="科目"><span class="subject-dot" style="background:'+subjectColor(g.subject)+'"></span><b>'+esc(g.subject)+'</b></div><div class="today-cell" data-label="今日 To Do">'+todos+'</div><div class="today-cell" data-label="今日複習蕃茄鐘">'+revs+'</div><div class="today-cell progress-cell" data-label="進度"><span class="today-progress '+(total&&done===total?'all-done':'')+'">'+done+' / '+total+'</span></div></div>';
  }).join('');
  return '<section class="today-study-panel"><div class="today-study-title"><div><h2>✨ 今日學習清單</h2><p>To Do 與「今日複習蕃茄鐘」整合在同一頁；完成複習後會直接標記進度。</p></div><span class="today-date">'+esc(shortDate(date))+'</span></div>'+header+body+'</section>';
}

homeView=function(){
  var cards=[
    ['calendar','📅','魔法行事曆','重要日期、考試星號與複習計畫','home-wide'],
    ['todo','✅','To Do List＋蕃茄鐘','今日 To Do、到期複習與專注倒數整合','home-wide'],
    ['stats','📊','學習統計','每天、每週、每月各科研讀時間',''],
    ['exams','📝','成績／趨勢','小考與大考分數 × 研讀時數',''],
    ['memory','🧠','魔法記憶','直接點選 +1、+3、+7、+30 複習日',''],
    ['toolbox','🧰','魔法工具箱','沿用已確認的舊版工具與範例','']
  ];
  var who=activeMagician?'<div class="active-magician">🪄 '+esc(activeMagician.name)+'｜魔法等級：'+magicLevel(state.stage)+'</div>':'';
  return '<section class="brand"><div class="tomato">🍅</div><h1>咬一口蕃茄鐘</h1><div class="subtitle">學習魔法闖關遊戲｜GitHub 測試版</div>'+who+'<div class="row" style="justify-content:center;margin-top:12px"><span class="pill version">最新功能測試</span><span class="pill">本機資料優先</span></div></section><div class="mission-grid">'+cards.map(function(c){return '<button class="mission '+c[4]+'" '+(c[0]==='toolbox'?'id="toolboxLink"':'data-view="'+c[0]+'"')+'><b>'+c[1]+'</b><span>'+c[2]+'</span><small>'+c[3]+'</small></button>'}).join('')+'</div><div class="privacy-note">目前不使用 AI、API 金鑰或照片辨識；魔法師頭像與家庭照片只保存在這台裝置。</div>';
};

var originalCalendarView=calendarView;
calendarView=function(){return originalCalendarView().replace(/學校行事曆/g,'魔法行事曆')};

function fixedSubjects(){return studyDefaults[state.stage]||studyDefaults.elementary}
taskHtml=function(x,i){
  var m=mins(x.start,x.end),list=fixedSubjects(),chips=list.map(function(s){var active=x.subject===s?' active':'';return '<button type="button" class="subject-chip'+active+'" data-subpick="'+i+'" data-subject="'+esc(s)+'" aria-pressed="'+(x.subject===s?'true':'false')+'">'+esc(s)+'</button>'}).join('');
  return '<article class="task"><div class="taskhead"><b>工作 '+(i+1)+'</b><button class="danger" data-del="'+i+'">刪除</button></div><div class="taskgrid"><label class="label full">時間<div class="timepair"><input class="field" type="time" data-ti="'+i+'" data-k="start" value="'+esc(x.start)+'"><span>→</span><input class="field" type="time" data-ti="'+i+'" data-k="end" value="'+esc(x.end)+'"></div><span class="hint">自動換算 '+m+' 分</span></label><div class="label full">科目（直接點選）<div class="subject-picks">'+chips+'</div></div><label class="label full">工作內容<textarea class="field" data-ti="'+i+'" data-k="task">'+esc(x.task)+'</textarea></label><label class="label">狀態<select class="field" data-ti="'+i+'" data-k="status"><option value="pending" '+(x.status==='pending'?'selected':'')+'>未完成</option><option value="completed" '+(x.status==='completed'?'selected':'')+'>已完成</option></select></label><button class="primary" data-timer="'+i+'">🍅 帶入番茄鐘</button><button class="blue btn" data-memory="'+i+'">🧠 帶入魔法記憶</button></div></article>';
};

todoView=function(){
  var stageOptions='<option value="elementary" '+(state.stage==='elementary'?'selected':'')+'>國小</option><option value="junior" '+(state.stage==='junior'?'selected':'')+'>國中</option><option value="senior" '+(state.stage==='senior'?'selected':'')+'>高中</option>';
  return top('To Do List＋蕃茄鐘')+'<section class="card"><div class="topbar"><label class="label">📅 日期<input id="date" class="field" type="date" value="'+state.date+'"></label><div class="magic-level-static"><span>🪄 魔法等級</span><b>'+magicLevel(state.stage)+'</b></div><button id="addTask" class="primary wide">＋新增工作</button><select id="stage" class="magic-hidden">'+stageOptions+'</select><button id="editSubs" class="magic-hidden" type="button">編輯科目</button></div><div class="level-subject-note">科目已依 '+magicLevel(state.stage)+' 自動設定，直接點選即可；時間、工作內容與狀態仍可自行編輯。</div>'+todayOverviewHtml()+'<div class="todo-edit-heading"><div><h2>✏️ 編輯今日 To Do</h2><p>下方只負責新增／修改工作；上方「今日學習清單」負責整合查看 To Do 與複習。</p></div></div><div class="tasks">'+tasks().slice(0,taskFormLimit).map(taskHtml).join('')+'</div><p class="hint">完成的 To Do 番茄與複習蕃茄都會自動進入學習紀錄統計。</p></section>'+timerHtml();
};

function clockTime(addSeconds){var d=new Date(Date.now()+Number(addSeconds||0)*1000);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
function loadReviewTimer(index){
  var reviews=reviewsForDate(state.date||today()),r=reviews[index];
  if(!r)return;
  if(r.done)return alert('這一項今日複習已完成。');
  var mode=timerModeConfig(timerMode);
  stopAlarm();
  timer={id:r.key,kind:'review',reviewKey:r.key,date:state.date,start:clockTime(0),end:clockTime(mode.focus),subject:r.m.subject||'複習',task:'複習：'+(r.m.scope||r.m.task||''),focusSeconds:mode.focus,breakSeconds:mode.break,remain:mode.focus,elapsed:0,running:false,phase:'focus',cycle:1,recordedFocus:false};
  render();
  setTimeout(function(){var el=document.querySelector('.timer-layout');if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'})},20);
}

var originalBindTodo=bindTodo;
bindTodo=function(){
  originalBindTodo();
  document.querySelectorAll('[data-subpick]').forEach(function(e){e.onclick=function(){var i=Number(e.dataset.subpick),x=tasks()[i];if(!x)return;x.subject=e.dataset.subject||'';save();render()}});
  document.querySelectorAll('[data-review-timer]').forEach(function(e){e.onclick=function(){loadReviewTimer(Number(e.dataset.reviewTimer))}});
  document.querySelectorAll('[data-review-check]').forEach(function(e){e.onchange=function(){var rows=reviewsForDate(state.date||today()),r=rows[Number(e.dataset.reviewCheck)];if(!r)return;state.reviewCompletions[r.key]=!!e.checked;save();render()}});
};

var originalComplete=complete;
complete=function(){
  if(timer&&timer.kind==='review'&&timer.reviewKey){
    running(false);stopAlarm();
    if(!timer.recordedFocus&&timer.phase==='focus'&&timer.elapsed>0)saveFocus(timer.elapsed,false);
    state.reviewCompletions[timer.reviewKey]=true;
    save();timer=null;view='todo';render();return;
  }
  originalComplete();
};

magicMemoryView=function(){
  var cards=state.magicMemory.map(function(x,i){var selected=memoryOffsets(x);var boxes=PRESETS.map(function(n){var checked=selected.indexOf(n)>=0?'checked':'';return '<label class="memory-preset"><input type="checkbox" data-mem-pick="'+i+':'+n+'" '+checked+'><span>+'+n+' 天</span></label>'}).join('');return '<article class="memory-card"><div class="taskhead"><b>'+esc(x.subject)+'｜'+esc(x.task)+'</b><button class="danger" data-mem-del="'+i+'">刪除</button></div><label class="label">複習範圍<textarea class="field" data-mem-scope="'+i+'">'+esc(x.scope||'')+'</textarea></label><div class="label">複習日（直接點選）<div class="memory-preset-grid">'+boxes+'</div></div></article>'}).join('');
  return top('魔法記憶')+'<section class="card"><h2>🧠 魔法記憶</h2><div class="hint">由 To Do 帶入功課；+1、+3、+7、+30 改成方框直接點選，複習範圍仍可自行編輯。到期後會自動出現在 To Do 的「今日複習蕃茄鐘」。</div>'+(cards||'<div class="empty">目前沒有功課，請先從 To Do 帶入。</div>')+'</section>';
};

var originalBindMemory=bindMemory;
bindMemory=function(){
  originalBindMemory();
  document.querySelectorAll('[data-mem-pick]').forEach(function(e){e.onchange=function(){var p=e.dataset.memPick.split(':'),i=Number(p[0]),x=state.magicMemory[i];if(!x)return;var card=e.closest('.memory-card'),vals=[];card.querySelectorAll('[data-mem-pick]:checked').forEach(function(c){vals.push(Number(c.dataset.memPick.split(':')[1]))});if(!vals.length){e.checked=true;return}x.offsets=vals.sort(function(a,b){return a-b});save();render()}});
};

render();
})();
