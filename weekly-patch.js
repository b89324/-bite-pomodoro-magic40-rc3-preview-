(function(){
'use strict';
if(typeof state==='undefined'||typeof render!=='function'||typeof homeView!=='function')return;
var PORTAL='bitepomodoro.github.portal.';
var ROOT='bite-pomodoro-github-v1';
function readJson(key,fallback){try{var v=localStorage.getItem(key);return v?JSON.parse(v):fallback}catch(e){return fallback}}
function levelName(stage){return stage==='junior'?'中級（國中）':stage==='senior'?'高級（高中）':'初級（國小）'}
var sid=readJson(PORTAL+'studentId','');
var students=readJson(PORTAL+'students',[]);
var magician=Array.isArray(students)?students.find(function(x){return x.id===sid}):null;
if(sid){
  var personalKey=ROOT+'.student.'+sid;
  var personal=readJson(personalKey,null);
  if(personal&&typeof personal==='object')state=personal;
  if(!state.tasks||typeof state.tasks!=='object')state.tasks={};
  if(!Array.isArray(state.sessions))state.sessions=[];
  if(!Array.isArray(state.exams))state.exams=[];
  if(!Array.isArray(state.calendarEvents))state.calendarEvents=[];
  if(!Array.isArray(state.magicMemory))state.magicMemory=[];
  if(!state.reviewCompletions||typeof state.reviewCompletions!=='object')state.reviewCompletions={};
  if(!Array.isArray(state.customTimerModes))state.customTimerModes=[];
  if(magician&&['elementary','junior','senior'].indexOf(magician.stage)>=0)state.stage=magician.stage;
  state.subjects=JSON.parse(JSON.stringify(studyDefaults));
  save=function(){try{localStorage.setItem(personalKey,JSON.stringify(state));localStorage.setItem(ROOT,JSON.stringify(state))}catch(e){}};
  save();
}
function inRange(d,a,b){return String(d||'')>=a&&String(d||'')<=b}
function weekData(){
  var range=weekRange(today()),start=range[0],end=range[1],allTasks=[],sessions=[],exams=[],reviews=[];
  Object.keys(state.tasks||{}).forEach(function(date){if(inRange(date,start,end))(state.tasks[date]||[]).forEach(function(t){allTasks.push({date:date,item:t})})});
  sessions=(state.sessions||[]).filter(function(x){return inRange(x.date,start,end)});
  exams=(state.exams||[]).filter(function(x){return inRange(x.date,start,end)&&x.score!==''}).sort(function(a,b){return a.date.localeCompare(b.date)});
  (state.magicMemory||[]).forEach(function(m){memoryOffsets(m).forEach(function(n,oi){var date=addDays(m.sourceDate,Number(n));if(inRange(date,start,end)){var key=String(m.id||m.sourceTaskId||'memory')+'|'+date+'|'+Number(n);reviews.push({date:date,subject:m.subject||'複習',scope:m.scope||m.task||'複習',n:Number(n),oi:oi,done:!!state.reviewCompletions[key]})}})});
  return{start:start,end:end,tasks:allTasks,sessions:sessions,exams:exams,reviews:reviews};
}
function subjectMethod(subject){
  var map={
    '國語':'先朗讀與說出段落大意，再處理生字、習作；最後用自己的話重述一次。','國文':'先抓段落主旨與作者觀點，再整理字詞、修辭與閱讀題錯因。',
    '英語':'每天少量單字＋聽讀＋口說一句完整句子；隔天用短測驗重新喚回。','英文':'單字間隔複習、閱讀抓主旨、文法錯題分類，最後用短句輸出。',
    '數學':'先確認觀念，再做基礎題、變化題；錯題要標記是「不懂觀念」還是「計算失誤」。',
    '自然':'先理解因果與圖表，再用費曼法把概念講給自己聽。','物理':'先畫圖與列已知條件，再選公式；錯題要重做同類型題。','化學':'觀念、反應關係與計算分開整理，使用表格比較容易混淆的概念。','生物':'用圖解、流程與關鍵詞建立關係，再遮住筆記自行回想。',
    '社會':'把人物、地點、制度與因果放進比較表或心智圖。','歷史':'用時間軸整理事件，特別標出原因、經過與影響。','地理':'搭配地圖、圖表與區域比較，不只背單一名詞。','公民':'用生活例子連結制度與概念，再做題目確認定義。',
    '作文':'先用 4W2H＋五感列關鍵詞，再組成段落，最後檢查是否有具體例子。'
  };
  return map[subject]||'把學習內容切成「理解 → 練習 → 回想 → 檢查錯誤」四步，每次只改善一個重點。';
}
function weeklyAdvice(w){
  var total=w.tasks.length,done=w.tasks.filter(function(x){return x.item.status==='completed'}).length,rate=total?done/total:0;
  var focus=w.sessions.reduce(function(s,x){return s+Number(x.seconds||0)},0),pomos=w.sessions.length;
  var avg=w.exams.length?w.exams.reduce(function(s,x){return s+Number(x.score||0)},0)/w.exams.length:null;
  var bySubject={};w.exams.forEach(function(x){if(!bySubject[x.subject])bySubject[x.subject]=[];bySubject[x.subject].push(Number(x.score||0))});
  var weak='';Object.keys(bySubject).forEach(function(s){var a=bySubject[s].reduce(function(x,y){return x+y},0)/bySubject[s].length;if(!weak||a<weak.avg)weak={name:s,avg:a}});
  var tips=[];
  if(!total)tips.push('下週先建立 2～3 個最重要的 To Do，讓每天都有清楚的起點。');
  else if(rate<0.6)tips.push('本週完成率偏低。下週每天先排 2～3 件最重要的工作，完成後再加新任務。');
  else if(rate>=0.8)tips.push('本週任務完成得很穩定。下週維持目前節奏，不必一次增加太多工作。');
  if(pomos<3)tips.push('專注紀錄還不多，可以先固定每天一個短番茄，建立「固定開始」的習慣。');
  else tips.push('已經有固定專注紀錄，下週可以把最容易分心的科目安排在精神最好的一段時間。');
  if(avg!==null&&avg<70&&focus>=3*3600)tips.push('讀書時間已經不少，但成績仍有改善空間；先換方法，不要只加時間。');
  if(weak)tips.push('目前最值得優先調整的是「'+weak.name+'」：'+subjectMethod(weak.name));
  if(!weak)tips.push('選一科最想進步的科目，試著用「理解 → 練習 → 回想 → 錯題整理」做一週小實驗。');
  return tips.slice(0,4);
}
function weeklyReportView(){
  var w=weekData(),total=w.tasks.length,done=w.tasks.filter(function(x){return x.item.status==='completed'}).length,rate=total?Math.round(done/total*100):0;
  var focus=w.sessions.reduce(function(s,x){return s+Number(x.seconds||0)},0),revDone=w.reviews.filter(function(x){return x.done}).length;
  var agg={};w.sessions.forEach(function(x){agg[x.subject]=(agg[x.subject]||0)+Number(x.seconds||0)});
  var subjects=Object.keys(agg).sort(function(a,b){return agg[b]-agg[a]});
  var exams=w.exams.length?w.exams.map(function(x){return '<div class="weekly-row"><b>'+esc(x.subject||'未選科目')+'</b><span>'+esc(x.type||'考試')+'｜'+esc(x.date)+'</span><strong>'+esc(x.score)+'</strong></div>'}).join(''):'<div class="empty">本週尚無成績紀錄。</div>';
  var bars=subjects.length?subjects.map(function(s){var max=Math.max.apply(null,subjects.map(function(k){return agg[k]})),pct=max?Math.max(8,Math.round(agg[s]/max*100)):0;return '<div class="weekly-subject"><div><b>'+esc(s)+'</b><span>'+hoursLabel(agg[s])+' 小時</span></div><i><em style="width:'+pct+'%;background:'+subjectColor(s)+'"></em></i></div>'}).join(''):'<div class="empty">本週尚無番茄紀錄。</div>';
  var tips=weeklyAdvice(w).map(function(t){return '<li>'+esc(t)+'</li>'}).join('');
  return top('每週學習報告')+'<section class="card weekly-report"><div class="weekly-hero"><div><span class="weekly-kicker">🧭 我的學習羅盤</span><p>'+esc(shortDate(w.start))+' ～ '+esc(shortDate(w.end))+'</p></div><div class="weekly-level">'+levelName(state.stage)+'</div></div><div class="weekly-stats"><div><span>To Do 完成率</span><strong>'+rate+'%</strong><small>'+done+' / '+total+'</small></div><div><span>完成番茄</span><strong>'+w.sessions.length+'</strong><small>'+hoursLabel(focus)+' 小時</small></div><div><span>複習完成</span><strong>'+revDone+'</strong><small>'+revDone+' / '+w.reviews.length+'</small></div></div></section><section class="card weekly-report"><h2>📚 各科專注時間</h2>'+bars+'</section><section class="card weekly-report"><h2>📝 本週成績</h2>'+exams+'</section><section class="card weekly-report"><h2>✨ 下週我可以這樣調整</h2><ul class="weekly-tips">'+tips+'</ul><div class="weekly-self">不是要一次做到完美，而是每週找一個方法變得更適合自己。</div></section>';
}
var previousHome=homeView;
homeView=function(){
  var html=previousHome();
  var card='<button class="mission" data-view="weekly"><b>🧭</b><span>每週學習報告</span><small>看見自己的節奏，學會調整下週方向</small></button>';
  html=html.replace('</div><div class="privacy-note">',card+'</div><div class="privacy-note">');
  return html.replace('魔法師頭像與家庭照片只保存在這台裝置。','魔法師頭像與學習紀錄目前只保存在這台裝置。');
};
var previousRender=render;
render=function(){
  if(view==='weekly'){
    document.getElementById('app').innerHTML='<main class="app">'+weeklyReportView()+'<div class="footer">每週學習報告｜依目前學習紀錄自動整理</div></main>';
    if(typeof bind==='function')bind();
    return;
  }
  previousRender();
};
render();
})();