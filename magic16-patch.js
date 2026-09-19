(function(){
'use strict';
if(typeof render!=='function'||typeof state==='undefined')return;

var MAGIC16_PORTAL='bitepomodoro.github.portal.';
var MAGIC16_PRESETS=[1,3,7,30];
var timerPlanningIndex16=null;
var reviewAddDraft16=null;
if(!state.cancelledReviews||typeof state.cancelledReviews!=='object')state.cancelledReviews={};
if(!state.reviewTimeRecords||typeof state.reviewTimeRecords!=='object')state.reviewTimeRecords={};
if(typeof state.activeExamPlanId!=='string')state.activeExamPlanId='';
if(typeof timerModes!=='undefined'&&timerModes.test)timerModes.test.label='快速使用';

function readPortal16(key,fallback){
  try{var raw=localStorage.getItem(MAGIC16_PORTAL+key);return raw?JSON.parse(raw):fallback}catch(e){return fallback}
}
function levelLabel16(stage){
  return stage==='junior'?'中階(國中)':stage==='senior'?'高階(高中)':'初階(國小)';
}
var PAGE_GUIDES16={
  calendar:{icon:'📅',title:'魔法行事曆',intro:'把作業、考試與複習日期放在同一張時間地圖。',how:'先填入截止日或考試日，再往前安排每天可完成的複習細項。'},
  pomodoro:{icon:'🍅',title:'To Do List＋蕃茄鐘',intro:'先把工作拆成清楚的小範圍，再用一段時間只完成一件事。',how:'選好工作細項後直接開始蕃茄鐘；系統會自動記錄每次專注的實際起訖時間，結束時再依結果記錄完成、繼續或停止。'},
  memory:{icon:'🌟',title:'魔法記憶（複習蕃茄鐘）',intro:'利用 D+1、D+3、D+7 等間隔，把快忘記的內容重新想起來。',how:'每次只複習一個明確範圍；同一筆資料會顯示在魔法記憶、行事曆與今日複習欄。'},
  stats:{icon:'📊',title:'學習時間統計',intro:'把每一次番茄鐘的實際專注時間整理成每天、每週與每月的學習紀錄。',how:'切換每天、每週或每月，觀察各科投入時間與完成番茄數，找出自己的學習節奏。'},
  exams:{icon:'📝',title:'成績／趨勢',intro:'把考試成績和同一時段的研讀時間放在一起比較。',how:'先輸入考試日期、類型、科目與分數，再用趨勢圖觀察研讀時間與成績的變化。'},
  weekly:{icon:'🧭',title:'每週學習報告',intro:'把一週的 To Do、番茄鐘、複習與成績整理成一份學習摘要。',how:'先看完成率與專注時間，再從各科分布和本週成績中選一件下週要調整的事。'},
  review:{icon:'📊',title:'學習狀況檢視與建議',intro:'用實際紀錄看見投入時間、完成情況與需要調整的地方。',how:'比較預估與實際時間，找出範圍過大或容易中斷的任務，再調整下一次安排。'}
};
var PAGE_GUIDE_TIPS16={
  elementary:{calendar:'每天先安排 1～3 件可以完成的小任務。',pomodoro:'可從 15／15 或 20／10 開始，完成一小段就休息。',memory:'用圖卡、口頭問答或小測驗複習，範圍不要太大。',stats:'先看自己今天完成了幾顆番茄，再看看哪一科花最多時間。',exams:'一次記一科的成績，搭配最近的讀書時間一起看。',weekly:'先找出這週做得最好的一件事，再選一件下週想改進的事。',review:'先找出今天做到的事，再選一件明天想改進的事。'},
  junior:{calendar:'把考試範圍分散安排，不要全部留到最後兩天。',pomodoro:'一顆做不完時，先檢查工作範圍是否切得太大。',memory:'先回想再看答案，把容易錯的內容排入下一次複習。',stats:'比較每天與每週的專注時間，看看時間是否用在真正需要的科目。',exams:'不要只看單次分數，搭配幾週的研讀時間一起判斷是否需要調整。',weekly:'從完成率、專注時間與複習情況中找一個最值得調整的地方。',review:'找出最常低估時間的科目，下一次多留一點緩衝。'},
  senior:{calendar:'由考試或報告期限倒推，並預留補救與臨時任務的時間。',pomodoro:'依任務難度選擇專注時間，保護最清醒的深度工作時段。',memory:'以主動回憶與題目檢索為主，依答錯情況調整範圍。',stats:'觀察長期投入與科目分布，避免只用單日讀書時數判斷成效。',exams:'用多次考試與研讀時間的趨勢找關聯，不以單一成績下結論。',weekly:'把一週視為一個調整週期，留下有效方法並修正一個低效習慣。',review:'觀察長期趨勢，不用單日波動否定整體努力。'}
};
function pageGuideKey16(title){
  title=String(title||'');
  if(title.indexOf('行事曆')>=0)return'calendar';
  if(title.indexOf('魔法記憶')>=0)return'memory';
  if(title.indexOf('To Do')>=0||title.indexOf('蕃茄鐘')>=0)return'pomodoro';
  if(title.indexOf('學習時間統計')>=0||title.indexOf('學習紀錄')>=0)return'stats';
  if(title.indexOf('成績／趨勢')>=0||title.indexOf('考試成績')>=0)return'exams';
  if(title.indexOf('每週學習報告')>=0||title.indexOf('本週紀錄報告')>=0)return'weekly';
  if(title.indexOf('學習狀況')>=0)return'review';
  return'';
}
function activeMagician16(){
  var id=readPortal16('studentId',''),list=readPortal16('students',[]);
  return Array.isArray(list)?list.find(function(x){return x&&x.id===id})||null:null;
}
function subjects16(){
  var list=studyDefaults[state.stage]||studyDefaults.elementary;
  return Array.isArray(list)?list.slice():[];
}
function normalizedSubject16(value){
  var list=subjects16(),raw=String(value||''),selected=raw;
  if(raw==='英語'||raw==='英')selected='英文';
  if(state.stage==='elementary'&&(raw==='國文'||raw==='國'))selected='國語';
  if((state.stage==='junior'||state.stage==='senior')&&(raw==='國語'||raw==='國'))selected='國文';
  if(state.stage==='elementary'&&['歷史','地理','公民'].indexOf(raw)>=0)selected='社會';
  if(state.stage==='elementary'&&['物理','化學','生物','理化','地球科學'].indexOf(raw)>=0)selected='自然';
  if(state.stage==='junior'&&['生物','理化','物理','化學','地球科學'].indexOf(raw)>=0)selected='自然';
  return list.indexOf(selected)>=0?selected:'';
}
function subjectOptions16(value){
  var list=subjects16(),selected=normalizedSubject16(value);
  return '<option value="" '+(!selected?'selected':'')+'>請選擇科目</option>'+list.map(function(s){return '<option value="'+esc(s)+'" '+(s===selected?'selected':'')+'>'+esc(s)+'</option>'}).join('');
}
function todoSubjectOptions16(value){
  return subjectOptions16(value);
}
function reviewKey16(memory,offset,date){
  return String(memory.id||memory.sourceTaskId||'memory')+'|'+String(date)+'|'+String(offset);
}
function reviewDetailMemory16(event,detail){
  return {id:detail.id,sourceTaskId:detail.id,sourceDate:addDays(detail.date,-1),scheduledReviewDate:detail.date,subject:detail.subject,task:detail.scope,scope:detail.scope,star:!!detail.star,offsets:[1],sourceExamId:event.id,sourceReviewId:detail.id};
}
function publishedExamReviews16(){
  var rows=[];
  (state.calendarEvents||[]).forEach(function(event,eventIndex){
    if(!event||event.sourceExamId||event.cancelled)return;
    if(!Array.isArray(event.reviewDetails)&&!event.star&&!isMajor(event.type,event.title))return;
    reviewDetails16(event).forEach(function(detail,detailIndex){
      if(detail.published&&!detail.cancelled&&detail.date&&detail.subject&&String(detail.scope||'').trim())rows.push({event:event,eventIndex:eventIndex,detail:detail,detailIndex:detailIndex});
    });
  });
  return rows;
}
function reviewsForDate16(date){
  var rows=[];
  (state.magicMemory||[]).forEach(function(memory){
    if(memory.cancelledByCalendar||memory.sourceExamId)return;
    memoryOffsets(memory).forEach(function(offset,index){
      offset=Number(offset);
      if(addDays(memory.sourceDate,offset)===date){
        var key=reviewKey16(memory,offset,date);
        rows.push({m:memory,oi:index,n:offset,key:key,done:!!state.reviewCompletions[key],cancelled:!!state.cancelledReviews[key]});
      }
    });
  });
  publishedExamReviews16().forEach(function(row){
    if(row.detail.date!==date)return;
    var memory=reviewDetailMemory16(row.event,row.detail),key=reviewKey16(memory,1,date);
    rows.push({m:memory,oi:0,n:1,key:key,done:row.detail.done===true||row.detail.status==='completed',cancelled:!!state.cancelledReviews[key],detail:row.detail,event:row.event,eventIndex:row.eventIndex,detailIndex:row.detailIndex});
  });
  return rows;
}
function projectedMemoryReviews16(date){
  return reviewsForDate16(date).filter(function(review){return !review.detail&&!review.m.sourceExamId});
}
function cancelledMemoryCalendarReviews16(){
  var rows=[];
  (state.magicMemory||[]).forEach(function(memory){
    if(memory.sourceExamId||memory.cancelledByCalendar)return;
    memoryOffsets(memory).forEach(function(offset,index){
      offset=Number(offset);var date=addDays(memory.sourceDate,offset),key=reviewKey16(memory,offset,date);
      if(state.cancelledReviews[key])rows.push({m:memory,oi:index,n:offset,date:date,key:key});
    });
  });
  return rows;
}

var PAGE_NAV35=[
  ['home','🏠 首頁'],
  ['calendar','📅 魔法行事曆'],
  ['todo','✅ To Do List＋蕃茄鐘'],
  ['memory','🌟 魔法記憶'],
  ['toolbox','🧰 魔法工具箱'],
  ['stats','📊 學習統計'],
  ['exams','📝 成績／趨勢'],
  ['weekly','🧭 每週學習報告'],
  ['logout','🚪 登出']
];
function pageNavOptions35(current){
  return '<option value="" selected disabled>選擇要前往的頁面</option>'+PAGE_NAV35.map(function(item){return '<option value="'+item[0]+'">'+item[1]+'</option>'}).join('');
}
function pageNav35(current){
  return '<label class="page-nav-control"><span class="page-nav-caption">前往頁面</span><select class="page-nav-select" data-page-nav aria-label="選擇要前往的頁面">'+pageNavOptions35(current)+'</select></label>';
}
var PAGE_TITLE_ICONS35={
  '魔法行事曆':'📅',
  'To Do List＋蕃茄鐘':'🍅',
  '魔法記憶(複習番茄鐘)':'🌟',
  '魔法記憶（複習番茄鐘）':'🌟',
  '學習時間統計':'📊',
  '成績／趨勢':'📝',
  '每週學習報告':'🧭',
  '每日任務地圖':'🗺️'
};
function pageTitleIcon35(title,guide){return guide&&guide.icon||PAGE_TITLE_ICONS35[String(title||'')]||'✨'}
function pageTitleCore35(title,icon){
  return '<span class="page-title-row"><span class="page-title-icon" aria-hidden="true">'+esc(icon)+'</span><span class="page-title-copy"><span class="page-title-text">'+esc(title)+'</span></span></span>';
}
top=function(title){
  var guideKey=pageGuideKey16(title),guide=PAGE_GUIDES16[guideKey],stage=PAGE_GUIDE_TIPS16[state.stage]?state.stage:'elementary',icon=pageTitleIcon35(title,guide);
  var heading=guide
    ?'<span class="page-guide-wrap"><button class="page-guide-title" type="button" data-page-guide="'+guideKey+'" aria-expanded="false">'+pageTitleCore35(title,icon)+'<small>點我看簡介</small></button><span class="page-guide-popover" data-page-guide-popover role="tooltip" hidden><b>'+guide.icon+' '+esc(guide.title)+'</b><span>'+esc(guide.intro)+'</span><em>'+esc(guide.how)+'</em><small>給'+esc(levelLabel16(stage))+'的小提醒：'+esc(PAGE_GUIDE_TIPS16[stage][guideKey])+'</small></span></span>'
    :'<span class="page-title-static">'+pageTitleCore35(title,icon)+'</span>';
  return '<div class="top page-top"><div class="page-nav-slot">'+pageNav35(view)+'</div><h1>'+heading+'</h1><span class="page-nav-balance" aria-hidden="true"></span></div>';
};

homeView=function(){
  var magician=activeMagician16();
  var identity=magician
    ?'<div class="home-magician-row"><div class="active-magician">🪄 '+esc(magician.name)+'｜魔法等級：'+levelLabel16(state.stage)+'</div></div>'
    :'<div class="home-magician-row"><div class="active-magician">🪄 魔法等級：'+levelLabel16(state.stage)+'</div></div>';
  var cards=[
    ['calendar','📅','魔法行事曆','重要日期、考試星號與複習計畫','home-wide mission-calendar'],
    ['todo','✅','To Do List＋蕃茄鐘','To Do List、到期複習與專注倒數整合','home-wide mission-todo'],
    ['memory','🌟','魔法記憶','直接編輯科目、複習範圍、日期與完成狀態','home-wide memory-feature'],
    ['toolbox','🧰','魔法工具箱','費曼、康乃爾、心智圖、曼陀羅與作文工具','mission-toolbox'],
    ['stats','📊','學習統計','每天、每週、每月各科研讀時間','mission-stats'],
    ['exams','📝','成績／趨勢','小考與大考分數 × 研讀時數','mission-exams'],
    ['weekly','🧭','每週學習報告','看見自己的節奏，學會調整下週方向','mission-weekly']
  ];
  return '<div class="home-page-nav">'+pageNav35('home')+'</div><section class="brand"><div class="tomato">🍅</div><h1>咬一口蕃茄鐘</h1>'+identity+'</section><div class="mission-grid">'+cards.map(function(c){return '<button class="mission '+c[4]+'" '+(c[0]==='toolbox'?'id="toolboxLink"':'data-view="'+c[0]+'"')+'><b class="mission-icon" aria-hidden="true">'+c[1]+'</b><span class="mission-title">'+c[2]+'</span></button>'}).join('')+'</div>';
};

taskHtml=function(item,index){
  var cancelled=item.status==='cancelled';
  return '<article class="task '+(cancelled?'task-cancelled':'')+'"><div class="taskhead"><b>工作 '+(index+1)+'</b>'+(cancelled?'<button class="secondary" data-restore-task="'+index+'">↩ 恢復</button>':'<button class="danger task-cancel" data-cancel-task="'+index+'" aria-label="取消工作 '+(index+1)+'">×</button>')+'</div><div class="taskgrid">'
    +'<label class="label full">科目<select class="field" data-ts="'+index+'">'+subjectOptions16(item.subject)+'</select></label>'
    +'<label class="label full">工作內容<textarea class="field" data-ti="'+index+'" data-k="task">'+esc(item.task)+'</textarea></label>'
    +'<label class="label">狀態<select class="field" data-ti="'+index+'" data-k="status"><option value="pending" '+(item.status==='pending'?'selected':'')+'>未完成</option><option value="completed" '+(item.status==='completed'?'selected':'')+'>已完成</option><option value="cancelled" '+(cancelled?'selected':'')+'>已取消</option></select></label>'
    +'<button class="primary" data-plan-timer="'+index+'" '+(cancelled?'disabled':'')+'>🍅 開始番茄鐘</button><button class="blue btn" data-memory="'+index+'" '+(cancelled?'disabled':'')+'>🌟 帶入魔法記憶</button></div></article>';
};

function todoEditor16(item,index){
  var cancelled=item.status==='cancelled';
  if(cancelled)return '<article class="todo-inline is-cancelled"><div class="cancelled-todo"><span>✕</span><a href="#today-todo-first" data-restore-task-id="'+esc(item.id)+'">'+esc(item.task||'未填工作內容')+'（點此恢復）</a></div></article>';
  var award=completionAward37(item.id);
  return '<article class="todo-inline '+(item.status==='completed'?'is-done ':'')+(award?'early-finished':'')+'"><button class="todo-inline-cancel" type="button" data-cancel-task-id="'+esc(item.id)+'" aria-label="取消 '+esc(item.task||'工作')+'">×</button>'
    +'<label class="label todo-scope-field">工作細項<input class="field" data-overview-task="'+index+'" value="'+esc(item.task||'')+'" placeholder="例如：習作第 6–10 頁"></label>'
    +taskTimeRecordsHtml16(item)
    +(award?completionMedalHtml37(award,false):'')
    +'<button class="todo-star-btn '+(item.star?'is-starred':'')+'" type="button" data-overview-star="'+index+'" aria-pressed="'+(item.star?'true':'false')+'">'+(item.star?'★ 已加星號':'☆ 加星號')+'</button>'
    +'<label class="label todo-status-field">狀態<select class="field" data-overview-status="'+index+'"><option value="pending" '+(item.status==='pending'?'selected':'')+'>未完成</option><option value="completed" '+(item.status==='completed'?'selected':'')+'>已完成</option></select></label>'
    +'<button class="primary todo-pomo-btn" type="button" data-plan-timer="'+index+'">🍅 開始番茄鐘</button><button class="blue btn todo-memory-btn" type="button" data-memory="'+index+'">🌟 帶入魔法記憶</button></article>';
}
function reviewEditor16(review,index){
  if(review.cancelled)return '<article class="review-inline is-cancelled"><div class="cancelled-review"><span>✕</span><a href="#today-review-first" data-restore-review="'+index+'">'+esc(review.m.scope||review.m.task||'未填複習範圍')+'（點此恢復）</a></div></article>';
  var award=completionAward37(review.key);
  return '<article class="review-inline '+(review.done?'is-done ':'')+(award?'early-finished':'')+'"><button class="review-inline-cancel" type="button" data-cancel-review="'+index+'" aria-label="取消 '+esc(review.m.scope||review.m.task||'複習')+'">×</button>'
    +'<div class="review-number"><b>D+'+review.n+'</b><small>第 '+(review.oi+1)+' 次</small></div>'
    +'<label class="label review-scope-field">複習範圍<input class="field" data-review-scope="'+index+'" value="'+esc(review.m.scope||review.m.task||'')+'"></label>'
    +reviewTimeRecordsHtml16(review.key)
    +(award?completionMedalHtml37(award,true):'')
    +'<button class="review-star-btn '+(review.m.star?'is-starred':'')+'" type="button" data-review-star="'+index+'" aria-pressed="'+(review.m.star?'true':'false')+'">'+(review.m.star?'★ 已加星號':'☆ 加星號')+'</button>'
    +'<label class="label review-status-field">狀態<select class="field" data-review-status="'+index+'"><option value="pending" '+(!review.done?'selected':'')+'>未完成</option><option value="completed" '+(review.done?'selected':'')+'>已完成</option></select></label>'
    +'<button type="button" class="review-pomo-btn" data-review-timer="'+index+'" '+(review.done?'disabled':'')+'>🍅 '+(review.done?'已完成':'開始複習番茄鐘')+'</button></article>';
}

function cancelledTodayHtml16(todoRows,reviews){
  var todoCancelled=todoRows.filter(function(item){return item.status==='cancelled'}),reviewCancelled=reviews.filter(function(item){return item.cancelled});
  if(!todoCancelled.length&&!reviewCancelled.length)return '';
  var todoHtml=todoCancelled.map(function(item){return '<div class="cancelled-today-row"><span><b>'+esc(item.subject||'未選科目')+'</b><small>To Do｜'+esc(item.task||'未填工作內容')+'</small></span><a href="#today-todo-first" data-restore-task-id="'+esc(item.id)+'">復原</a></div>'}).join('');
  var reviewHtml=reviewCancelled.map(function(review){return '<div class="cancelled-today-row"><span><b>'+esc(review.m.subject||'未選科目')+'</b><small>複習｜'+esc(review.m.scope||review.m.task||'未填複習範圍')+'</small></span><a href="#today-review-first" data-restore-review="'+reviews.indexOf(review)+'">復原</a></div>'}).join('');
  return '<details class="cancelled-today-panel"><summary>↩ 已取消項目（'+(todoCancelled.length+reviewCancelled.length)+'）</summary><div class="cancelled-today-list">'+todoHtml+reviewHtml+'</div></details>';
}
function todayOverview16(){
  var date=state.date||today(),todoRows=state.tasks[date]||[],reviews=reviewsForDate16(date),bySubject={};
  function slot(subject){var key=subject||'';if(!bySubject[key])bySubject[key]={subject:key,todos:[],reviews:[]};return bySubject[key]}
  todoRows.filter(function(item){return item.status!=='cancelled'}).forEach(function(item){slot(item.subject).todos.push(item)});
  reviews.filter(function(item){return !item.cancelled}).forEach(function(item){slot(item.m.subject).reviews.push(item)});
  var groups=Object.keys(bySubject).sort(function(a,b){if(!a)return-1;if(!b)return 1;return a.localeCompare(b,'zh-Hant')}).map(function(key){return bySubject[key]});
  var header='<div class="today-list-head"><b>科目</b><b><a class="today-edit-link" href="#today-todo-first">To Do List(今日工作清單) <span>✏️ 編輯</span></a></b><b><a class="today-edit-link" href="#magic-memory-editor" data-memory-edit-link>複習番茄鐘 <span>✏️ 編輯</span></a></b><b>進度</b></div>';
  var cancelledHtml=cancelledTodayHtml16(todoRows,reviews);
  if(!groups.length)return '<section class="today-study-panel"><div class="today-study-title"><div><h2>✨ 今日學習清單</h2></div><span class="today-date">'+esc(shortDate(date))+'</span></div>'+header+'<div class="empty empty-first-todo">今天還沒有進行中的工作或複習。<div class="empty-first-actions"><button id="addFirstTodo" class="primary" type="button">＋ 新增第一筆今日工作</button><button class="blue btn" type="button" data-add-review-subject="">＋ 新增第一筆複習</button></div></div>'+cancelledHtml+'</section>';
  var body=groups.map(function(group,groupIndex){
    var todos=group.todos.length?group.todos.map(function(item){return todoEditor16(item,todoRows.indexOf(item))}).join(''):'<span class="today-none">—</span>';
    var reviewHtml=group.reviews.length?group.reviews.map(function(item){return reviewEditor16(item,reviews.indexOf(item))}).join(''):'<span class="today-none">—</span>';
    var todoDone=group.todos.filter(function(item){return item.status==='completed'}).length,reviewDone=group.reviews.filter(function(item){return item.done}).length,total=group.todos.length+group.reviews.length,done=todoDone+reviewDone;
    var addLabel=group.subject?'新增 '+group.subject+' 今日工作':'新增今日工作';
    var reviewAddLabel=group.subject?'新增 '+group.subject+' 複習':'新增複習';
    return '<div class="today-list-row"><div class="today-cell subject-cell" data-label="科目"><div class="subject-control"><span class="subject-dot" style="background:'+subjectColor(group.subject||'其他')+'"></span><select class="field" data-group-subject="'+esc(group.subject)+'">'+todoSubjectOptions16(group.subject)+'</select></div></div><div class="today-cell today-todo-cell" data-label="To Do List(今日工作清單)" '+(groupIndex===0?'id="today-todo-first" tabindex="-1"':'')+'><div class="today-cell-actions"><button type="button" data-add-todo-subject="'+esc(group.subject)+'" aria-label="'+esc(addLabel)+'" title="'+esc(addLabel)+'">＋</button></div><div class="today-todo-items">'+todos+'</div></div><div class="today-cell today-review-cell" data-label="複習番茄鐘" '+(groupIndex===0?'id="today-review-first"':'')+'><div class="today-cell-actions"><button type="button" data-add-review-subject="'+esc(group.subject)+'" aria-label="'+esc(reviewAddLabel)+'" title="'+esc(reviewAddLabel)+'">＋</button></div>'+reviewHtml+'</div><div class="today-cell progress-cell" data-label="進度"><span class="today-progress '+(total&&done===total?'all-done':'')+'">'+done+' / '+total+'</span></div></div>';
  }).join('');
  return '<section class="today-study-panel"><div class="today-study-title"><div><h2>✨ 今日學習清單</h2></div><span class="today-date">'+esc(shortDate(date))+'</span></div>'+header+body+cancelledHtml+'</section>';
}

function reviewAddModal16(){
  if(!reviewAddDraft16)return '';
  var subject=reviewAddDraft16.subject||'',date=reviewAddDraft16.date||state.date||today();
  return '<div class="review-add-modal" role="presentation" data-review-add-close><section class="review-add-dialog" role="dialog" aria-modal="true" aria-labelledby="reviewAddTitle">'
    +'<div class="taskhead"><div><h2 id="reviewAddTitle">＋ 新增複習番茄鐘</h2><p>只建立一筆複習資料，並同步顯示於魔法記憶、行事曆及所選日期的複習欄。</p></div><button id="cancelReviewAdd" class="review-add-close" type="button" aria-label="關閉新增複習視窗">×</button></div>'
    +'<div class="review-add-form"><label class="label">科目<select id="reviewAddSubject" class="field">'+subjectOptions16(subject)+'</select></label><label class="label">複習日期<input id="reviewAddDate" class="field" type="date" value="'+esc(date)+'"></label><label class="label review-add-scope">複習範圍<input id="reviewAddScope" class="field" placeholder="例如：國文第 6–10 頁" autofocus></label></div>'
    +'<div class="review-add-actions"><button id="saveReviewAdd" class="primary" type="button">建立複習番茄鐘</button><button id="cancelReviewAddBottom" class="secondary" type="button">取消</button></div></section></div>';
}

function directReviewRecord16(subject,date,scope,id){
  return {id:id||uid('mem'),sourceType:'direct-review',sourceDate:addDays(date,-1),scheduledReviewDate:date,subject:subject,task:scope,scope:scope,star:false,offsets:[1]};
}
function createDirectReview16(){
  var subject=document.getElementById('reviewAddSubject'),date=document.getElementById('reviewAddDate'),scope=document.getElementById('reviewAddScope');
  var subjectValue=String(subject&&subject.value||'').trim(),dateValue=String(date&&date.value||'').trim(),scopeValue=String(scope&&scope.value||'').trim();
  if(!subjectValue||!dateValue||!scopeValue)return alert('請完整填寫科目、複習日期與複習範圍。');
  state.magicMemory.unshift(directReviewRecord16(subjectValue,dateValue,scopeValue));
  reviewAddDraft16=null;save();render();
}

function snapClock16(value){
  var parts=String(value||'').split(':'),hour=Number(parts[0]),minute=Number(parts[1]);
  if(!Number.isFinite(hour)||!Number.isFinite(minute)){var now=new Date();hour=now.getHours();minute=now.getMinutes()}
  var rounded=Math.round((hour*60+minute)/30)*30;if(rounded>=1440)rounded=0;
  return String(Math.floor(rounded/60)).padStart(2,'0')+':'+String(rounded%60).padStart(2,'0');
}
function plannedClock16(offsetMinutes){
  var d=new Date(Date.now()+Number(offsetMinutes||0)*60000),rounded=Math.ceil((d.getHours()*60+d.getMinutes())/30)*30;if(rounded>=1440)rounded-=1440;
  return String(Math.floor(rounded/60)).padStart(2,'0')+':'+String(rounded%60).padStart(2,'0');
}
function planningFocusMinutes16(){
  var mode=timerModeConfig(timerMode),seconds=Number(mode&&mode.focus);
  if(timerMode==='test'||!Number.isFinite(seconds)||seconds<60)seconds=timerModes['25/5'].focus;
  return Math.max(1,Math.round(seconds/60));
}
function planningBreakMinutes16(){
  var mode=timerModeConfig(timerMode),seconds=Number(mode&&mode.break);
  if(timerMode==='test'||!Number.isFinite(seconds)||seconds<60)seconds=timerModes['25/5'].break;
  return Math.max(0,Math.round(seconds/60));
}
function planningCycleMinutes16(){return planningFocusMinutes16()+planningBreakMinutes16()}
function tomatoEstimate16(minutes){var cycle=planningCycleMinutes16();return minutes>0?Math.ceil(minutes/cycle):0}
function tomatoLimitText16(count){var limit=maxPomodorosByStage();return count>limit?'；超過'+stageName()+'每項工作 '+limit+' 顆上限，請先拆細工作範圍。':'｜'+stageName()+'上限 '+limit+' 顆'}
function clockLabel16(value){var parts=String(value||'').split(':'),hour=Number(parts[0]||0),minute=Number(parts[1]||0),period=hour>=12?'PM':'AM',display=hour%12||12;return period+' '+display+':'+String(minute).padStart(2,'0')}
function timePickerParts16(value){var parts=snapClock16(value).split(':'),hour24=Number(parts[0]);return {period:hour24>=12?'PM':'AM',hour:String(hour24%12||12),minute:parts[1]}}
function timeWheelButtons16(prefix,part,values,selected){
  return values.map(function(value){var active=String(value)===String(selected);return '<button type="button" class="time-wheel-option '+(active?'is-selected':'')+'" data-time-wheel-option="'+prefix+part+'" data-time-value="'+value+'" aria-pressed="'+(active?'true':'false')+'">'+value+'</button>'}).join('');
}
function timePickerHtml16(prefix,label,value){
  var parts=timePickerParts16(value),hours=[];for(var hour=1;hour<=12;hour++)hours.push(String(hour));
  return '<fieldset class="time-picker-group"><legend>'+label+'</legend><div class="time-picker-controls">'
    +'<div class="time-wheel-column"><span>上午／下午</span><div class="time-wheel-track period-wheel" data-time-wheel="'+prefix+'Period">'+timeWheelButtons16(prefix,'Period',['AM','PM'],parts.period)+'</div><input id="'+prefix+'Period" type="hidden" value="'+parts.period+'"></div>'
    +'<div class="time-wheel-column"><span>小時</span><div class="time-wheel-track hour-wheel" data-time-wheel="'+prefix+'Hour">'+timeWheelButtons16(prefix,'Hour',hours,parts.hour)+'</div><input id="'+prefix+'Hour" type="hidden" value="'+parts.hour+'"></div>'
    +'<div class="time-wheel-column"><span>分鐘</span><div class="time-wheel-track minute-wheel" data-time-wheel="'+prefix+'Minute">'+timeWheelButtons16(prefix,'Minute',['00','30'],parts.minute)+'</div><input id="'+prefix+'Minute" type="hidden" value="'+parts.minute+'"></div>'
    +'</div></fieldset>';
}
function readTimePicker16(prefix){
  var period=document.getElementById(prefix+'Period'),hour=document.getElementById(prefix+'Hour'),minute=document.getElementById(prefix+'Minute');if(!period||!hour||!minute)return '';
  var hour24=Number(hour.value)%12;if(period.value==='PM')hour24+=12;
  return String(hour24).padStart(2,'0')+':'+String(minute.value).padStart(2,'0');
}
function actualClock16(ms){
  var d=new Date(Number(ms)||Date.now());
  return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
function taskByTimerId16(id){
  var all=state.tasks&&state.tasks[state.date||today()]||[];
  var found=all.find(function(item){return String(item.id)===String(id)});
  if(found)return found;
  var dates=Object.keys(state.tasks||{});
  for(var di=0;di<dates.length;di++){
    var row=(state.tasks[dates[di]]||[]).find(function(item){return String(item.id)===String(id)});
    if(row)return row;
  }
  return null;
}
function timerRecordList16(activeTimer){
  if(!activeTimer)return null;
  if(activeTimer.kind==='review'){
    var key=String(activeTimer.reviewKey||activeTimer.id||'');
    if(!key)return null;
    if(!Array.isArray(state.reviewTimeRecords[key]))state.reviewTimeRecords[key]=[];
    return state.reviewTimeRecords[key];
  }
  if(activeTimer.kind==='quick')return null;
  var item=taskByTimerId16(activeTimer.id);
  if(!item)return null;
  if(!Array.isArray(item.pomodoroTimeRecords))item.pomodoroTimeRecords=[];
  return item.pomodoroTimeRecords;
}
function beginActualTime16(){
  if(!timer||timer.phase!=='focus'||timer.timeRecordId)return;
  var now=Date.now(),id='time-'+now+'-'+Math.random().toString(36).slice(2,7),list=timerRecordList16(timer);
  timer.timeRecordId=id;
  timer.cycleStartedAt=now;
  timer.start=actualClock16(now);
  timer.end='進行中';
  if(list)list.push({id:id,startAt:now,endAt:null,cycle:Number(timer.cycle||1),outcome:'running'});
  save();
}
function finishActualTime16(outcome){
  if(!timer)return;
  var now=Date.now(),list=timerRecordList16(timer);
  if(!timer.timeRecordId&&timer.elapsed>0)beginActualTime16();
  if(list&&timer.timeRecordId){
    var row=list.find(function(item){return item.id===timer.timeRecordId});
    if(row){row.endAt=now;row.outcome=outcome||row.outcome||'completed'}
  }
  if(timer.cycleStartedAt||timer.timeRecordId){
    if(!timer.start||timer.start==='尚未開始')timer.start=actualClock16(timer.cycleStartedAt||now);
    timer.end=actualClock16(now);
  }
  save();
}
function timeRecordLabel16(record){
  if(!record||!record.startAt)return '';
  return actualClock16(record.startAt)+'－'+(record.endAt?actualClock16(record.endAt):'進行中');
}
function timeRecordsHtml16(records){
  records=Array.isArray(records)?records:[];
  return '<div class="actual-time-record"><span>⏱️ 起訖時間</span><div class="actual-time-values">'+(records.length?records.map(function(record){return '<b>'+esc(timeRecordLabel16(record))+'</b>'}).join(''):'<em>開始番茄鐘後自動記錄</em>')+'</div></div>';
}
function taskTimeRecordsHtml16(item){return timeRecordsHtml16(item&&item.pomodoroTimeRecords)}
function reviewTimeRecordsHtml16(key){return timeRecordsHtml16(state.reviewTimeRecords&&state.reviewTimeRecords[String(key)]||[])}

function timerPlanningHtml16(){return '';}

function pomodoroKnowledge16(){return ''}

var earlyCelebration16=null;
var completedCelebration16=null;
var timeoutCelebration16=null;
var stopCelebration16=null;
function earlyFinishAward16(timerId){
  if(!timerId)return null;
  for(var i=(state.sessions||[]).length-1;i>=0;i--){var session=state.sessions[i];if(session&&session.outcome==='early-complete'&&String(session.timerId)===String(timerId))return session}
  return null;
}
function completionAward37(timerId){
  if(!timerId)return null;
  for(var i=(state.sessions||[]).length-1;i>=0;i--){
    var session=state.sessions[i];
    if(session&&String(session.timerId)===String(timerId)&&(session.outcome==='early-complete'||session.workCompletedOnTime===true))return session;
  }
  return null;
}
function completionMedalHtml37(session,isReview){
  var early=session.outcome==='early-complete';
  return '<div class="completion-medal37 '+(isReview?'review-early-finish-badge ':'')+(early?'completion-medal-early37':'completion-medal-ontime37')+'" role="status" aria-label="'+(early?'提前完成 Good job':'準時完成 Very good')+'"><span class="completion-medal-rosette37" aria-hidden="true"><span class="completion-medal-icon37">★</span></span><span class="completion-medal-caption37">'+(early?'Good job':'Very good')+'</span></div>';
}
function earlyCelebrationHtml16(){
  if(!earlyCelebration16)return '';
  return '<div class="early-celebration" role="status" aria-live="assertive"><div class="tomato-splat" aria-hidden="true"><div class="blast-flash"></div><div class="shockwave wave-one"></div><div class="shockwave wave-two"></div><div class="tomato-bomb"><span class="tomato-whole">🍅</span><span class="tomato-piece piece-one">🍅</span><span class="tomato-piece piece-two">🍅</span><span class="tomato-piece piece-three">🍅</span><span class="tomato-piece piece-four">🍅</span><span class="tomato-piece piece-five">🍅</span><span class="tomato-piece piece-six">🍅</span><span class="tomato-piece piece-seven">🍅</span><span class="tomato-piece piece-eight">🍅</span></div><div class="smoke-burst"><u></u><u></u><u></u><u></u><u></u><u></u><u></u><u></u></div><div class="sauce-burst"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><em></em><em></em><em></em><em></em><em></em><em></em><em></em><em></em><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b></div></div><strong>Good Job!</strong><b>🏅 提前完成工作</b><p>實際專注 '+Math.max(1,Math.round(Number(earlyCelebration16.seconds||0)/60))+' 分鐘，已記入完成番茄與學習紀錄。</p></div>';
}
function completedCelebrationHtml16(){
  if(!completedCelebration16)return '';
  return '<div class="completed-celebration" role="status" aria-live="assertive"><div class="completed-heart" aria-hidden="true">💗</div><strong>Very Good!</strong><b>✨ 工作已完成 ✨</b><p>'+esc(completedCelebration16.subject||'')+'｜'+esc(completedCelebration16.task||'')+'</p></div>';
}
function timeoutCelebrationHtml16(){
  if(!timeoutCelebration16)return '';
  return '<div class="timeout-celebration" role="status" aria-live="assertive"><div class="caterpillar-scene" aria-hidden="true"><div class="chewed-tomato"><span class="tomato-crown">🍃</span><i></i><i></i><i></i><i></i></div><div class="chewing-caterpillar">🐛</div><span class="chew-crumb crumb-one">•</span><span class="chew-crumb crumb-two">•</span><span class="chew-crumb crumb-three">•</span></div><strong>繼續加油喔！</strong><b>'+(timeoutCelebration16.canContinue?'正在準備下一顆番茄鐘…':'已達本項番茄鐘上限')+'</b><p>'+esc(timeoutCelebration16.subject||'')+'｜'+esc(timeoutCelebration16.task||'')+'</p></div>';
}
function stopCelebrationHtml16(){
  if(!stopCelebration16)return '';
  return '<div class="stop-celebration" role="status" aria-live="assertive"><div class="tomato-growth-scene" aria-hidden="true"><div class="garden-sun">☀️</div><div class="garden-ground"></div><div class="garden-pot"></div><div class="garden-stem"><i class="leaf leaf-one"></i><i class="leaf leaf-two"></i><i class="leaf leaf-three"></i><i class="leaf leaf-four"></i><span class="fruit fruit-one">🍅</span><span class="fruit fruit-two">🍅</span><span class="fruit fruit-three">🍅</span><span class="fruit fruit-four">🍅</span><span class="fruit fruit-five">🍅</span><span class="fruit fruit-six">🍅</span></div></div><strong>休息是為了走更長遠的路～</strong><b>今天的努力會慢慢長大</b><p>'+esc(stopCelebration16.subject||'')+'｜'+esc(stopCelebration16.task||'')+'</p></div>';
}

var timerHtmlBefore16=timerHtml;
timerHtml=function(){
  var html=timerHtmlBefore16().replace('預設三組固定保留；可再新增。10 秒快速測試只供驗收。','預設三組固定保留；可再新增。「快速使用」不需設定科目即可直接啟動。'),memory=null;
  var planner=timerPlanningHtml16();if(planner)html=html.replace('<div class="timer-orbit">',planner+'<div class="timer-orbit">');
  if(!timer||timer.kind!=='review')return html;
  memory=(state.magicMemory||[]).find(function(item){return String(item.id||item.sourceTaskId||'memory')===String(timer.memoryId||'')})||null;
  if(!memory)return html;
  var editor='<div class="timer-review-editor"><h3>🌟 本次複習內容</h3><div class="timer-review-grid">'
    +'<label class="label">科目<select id="timerReviewSubject" class="field">'+subjectOptions16(memory.subject)+'</select></label>'
    +'<label class="label">複習範圍<input id="timerReviewScope" class="field" value="'+esc(memory.scope||memory.task||'')+'"></label>'
    +'</div><p class="hint">完成狀態請在上方工作表調整；番茄鐘結果只需在圓形倒數下方記錄一次。</p></div>';
  return html.replace('<div class="timer-orbit">',editor+'<div class="timer-orbit">');
};

todoView=function(){
  var stageOptions='<option value="elementary" '+(state.stage==='elementary'?'selected':'')+'>國小</option><option value="junior" '+(state.stage==='junior'?'selected':'')+'>國中</option><option value="senior" '+(state.stage==='senior'?'selected':'')+'>高中</option>';
  return top('To Do List＋蕃茄鐘')+'<section class="card"><div class="topbar"><label class="label">📅 日期<input id="date" class="field" type="date" value="'+state.date+'"></label><div class="magic-level-static"><span>🪄 魔法等級</span><b>'+levelLabel16(state.stage)+'</b></div><button id="addTask" class="magic-hidden" type="button">新增工作</button><select id="stage" class="magic-hidden">'+stageOptions+'</select><button id="editSubs" class="magic-hidden" type="button">編輯科目</button></div>'+todayOverview16()+'<p class="hint">完成的 To Do List 番茄與複習番茄都會自動進入學習紀錄統計。</p></section>'+timerHtml()+pomodoroKnowledge16()+reviewAddModal16()+earlyCelebrationHtml16()+completedCelebrationHtml16()+timeoutCelebrationHtml16()+stopCelebrationHtml16();
};

function scrollToTimer16(){setTimeout(function(){var el=document.querySelector('.timer-layout');if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'})},20)}

function loadReviewTimer16(index){
  var rows=reviewsForDate16(state.date||today()),review=rows[index];
  if(!review)return;
  if(review.done)return alert('這一項複習已完成；可先把狀態改回「未完成」。');
  var mode=timerModeConfig(timerMode);
  stopAlarm();
  timer={id:review.key,kind:'review',reviewKey:review.key,memoryId:String(review.m.id||review.m.sourceTaskId||'memory'),date:state.date,start:'尚未開始',end:'自動記錄',subject:review.m.subject||'複習',task:'複習：'+(review.m.scope||review.m.task||''),focusSeconds:mode.focus,breakSeconds:mode.break,remain:mode.focus,elapsed:0,running:false,phase:'focus',cycle:1,recordedFocus:false,timeRecordId:'',cycleStartedAt:null};
  render();
  scrollToTimer16();
}

function calendarSubjects16(){
  var list=examSubjects&&examSubjects[state.stage]?examSubjects[state.stage]:subjects16();
  return Array.isArray(list)?list:[];
}
function calendarSubjectPicker16(){
  return '<div class="calendar-subject-combo"><button id="calSubjectToggle" class="calendar-subject-toggle" type="button" aria-expanded="false">選擇考試科目 <span>⌄</span></button><div id="calSubjectMenu" class="calendar-subject-menu" hidden>'+calendarSubjects16().map(function(subject){return '<label class="calendar-subject-option"><input type="checkbox" data-cal-subject="'+esc(subject)+'"><span>'+esc(subject)+'</span></label>'}).join('')+'</div><input id="calTitle" type="hidden" value=""></div>';
}
function calendarGrid16(){
  var anchor=new Date((state.calendarMonth||firstOfMonth(today()))+'T12:00:00'),year=anchor.getFullYear(),month=anchor.getMonth(),first=new Date(year,month,1,12),last=new Date(year,month+1,0,12),cells=[];
  for(var blank=0;blank<first.getDay();blank++)cells.push('<div class="calendar-day calendar-day-empty"></div>');
  for(var day=1;day<=last.getDate();day++){
    var date=dk(new Date(year,month,day,12));
    var items=(state.calendarEvents||[]).map(function(item,index){return{x:item,i:index}}).filter(function(row){return !row.x.sourceExamId&&row.x.date===date&&!row.x.cancelled}).sort(function(a,b){return Number(b.x.star)-Number(a.x.star)});
    var planned=publishedExamReviews16().filter(function(row){return row.detail.date===date});
    var projected=projectedMemoryReviews16(date).filter(function(review){return !review.cancelled});
    var normalHtml=items.map(function(row){var item=row.x,display=String(item.title||'')+String(item.note||'');return '<div class="calendar-event-card '+(item.star?'major':'')+'" data-cal-open="'+row.i+'" role="button" tabindex="0"><button class="calendar-event-delete" type="button" data-cal-event-del="'+row.i+'" aria-label="取消 '+esc(item.title)+'">×</button><div class="calendar-event-title">'+(item.star?'★ ':'')+esc(display)+'</div><div class="calendar-event-detail">'+esc(item.type||'一般')+'</div></div>'}).join('');
    var plannedHtml=planned.map(function(row){var detail=row.detail;return '<div class="calendar-event-card review-plan-calendar-card"><button class="calendar-event-delete" type="button" data-review-calendar-del="'+row.eventIndex+':'+row.detailIndex+'" aria-label="取消 '+esc(detail.subject)+' 複習">×</button><div class="calendar-event-title">'+(detail.star?'★ ':'')+esc(detail.subject+String(detail.scope||''))+'</div><div class="calendar-event-detail">複習番茄鐘</div></div>'}).join('');
    var projectedHtml=projected.map(function(review){var memory=review.m,scope=memory.scope||memory.task||'未填複習範圍';return '<div class="calendar-event-card review-memory-calendar-card '+(review.done?'is-done':'')+'"><button class="calendar-event-delete" type="button" data-memory-calendar-del="'+esc(review.key)+'" aria-label="取消 '+esc(memory.subject)+' 複習">×</button><div class="calendar-event-title">'+(memory.star?'★ ':'')+esc(memory.subject+'｜複習：'+scope)+'</div><div class="calendar-event-detail">複習番茄鐘｜D+'+review.n+(review.done?'｜已完成':'')+'</div></div>'}).join('');
    cells.push('<div class="calendar-day '+(date===today()?'today':'')+'"><b>'+day+'</b>'+normalHtml+plannedHtml+projectedHtml+'</div>');
  }
  return '<div class="calendar-weekdays"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div><div class="calendar-grid">'+cells.join('')+'</div>';
}
function eventSubjects16(event){
  var allowed=subjects16(),titleParts=String(event.title||'').split(/[、,，\/／]/).map(function(x){return x.trim()}).filter(Boolean),noteParts=String(event.note||'').split(/[、,，\/／]/).map(function(x){return x.trim()}).filter(Boolean),seen={},matched=[];
  if(titleParts.length>1)return titleParts.filter(function(part){if(seen[part])return false;seen[part]=true;return true});
  titleParts.concat(noteParts).forEach(function(part){if(allowed.indexOf(part)>=0&&!seen[part]){seen[part]=true;matched.push(part)}});
  if(matched.length)return matched;
  return [String(event.title||'各科').trim()||'各科'];
}
function reviewDetails16(event){
  if(!event.id)event.id=uid('cal');
  var start=addDays(event.date,-7*Math.max(1,Math.min(4,Number(event.reminderWeeks||3)))),wanted=eventSubjects16(event),rows=Array.isArray(event.reviewDetails)?event.reviewDetails.filter(Boolean):[];
  wanted.forEach(function(subject,index){if(!rows.some(function(item){return item.subject===subject})){rows.push({id:uid('review'),examId:event.id,subject:subject,date:addDays(start,index),scope:'',done:false,status:'pending',star:false,published:false,cancelled:false})}});
  rows.forEach(function(detail,index){
    if(!detail.id)detail.id=detail.memoryEventId||uid('review');
    detail.examId=event.id;
    if(!detail.date)detail.date=addDays(start,index);
    if(typeof detail.status!=='string')detail.status=detail.done?'completed':'pending';
    detail.done=detail.status==='completed'||detail.done===true;
    if(typeof detail.star!=='boolean')detail.star=false;
    if(typeof detail.cancelled!=='boolean')detail.cancelled=false;
    if(typeof detail.published!=='boolean')detail.published=!!(detail.calendarEventId||detail.memoryEventId||event.reviewPlanPublishedAt);
    var legacy=(state.magicMemory||[]).find(function(memory){return String(memory.sourceExamId||'')===String(event.id)&&Number(memory.sourceReviewIndex)===index});
    if(legacy){detail.subject=legacy.subject||detail.subject;detail.scope=legacy.scope||legacy.task||detail.scope;detail.date=legacy.scheduledReviewDate||detail.date;detail.published=true}
  });
  event.reviewDetails=rows;
  return rows;
}
function addReviewDetail16(eventIndex,subject){
  var event=state.calendarEvents[eventIndex];if(!event)return;
  var rows=reviewDetails16(event),same=rows.filter(function(row){return row.subject===subject&&!row.cancelled}),last=same[same.length-1],next=last&&last.date?addDays(last.date,1):addDays(event.date,-7*Math.max(1,Number(event.reminderWeeks||3)));
  if(next>event.date)next=event.date;
  rows.push({id:uid('review'),examId:event.id,subject:subject||subjects16()[0]||'其他',date:next,scope:'',done:false,status:'pending',star:false,published:false,cancelled:false});
  state.activeExamPlanId=event.id;save();render();
}
function planRows16(event,eventIndex){
  var rows=reviewDetails16(event);
  var subjectNames=[];rows.forEach(function(row){if(subjectNames.indexOf(row.subject)<0)subjectNames.push(row.subject)});
  var groups=subjectNames.map(function(subject){
    var groupRows=rows.map(function(row,index){return{row:row,index:index}}).filter(function(item){return item.row.subject===subject});
    return '<section class="review-subject-plan"><div class="review-subject-plan-head"><b>'+esc(subject)+'</b><button class="secondary" type="button" data-review-plan-add-row="'+eventIndex+':'+esc(subject)+'">＋ 新增每日複習細項</button></div>'
      +groupRows.map(function(item){
        var row=item.row,index=item.index;
        if(row.cancelled)return '<div class="review-plan-cancelled"><span>× '+esc(row.scope||'未填複習細項')+'</span><button class="secondary" type="button" data-review-plan-restore-row="'+eventIndex+':'+index+'">復原</button></div>';
        return '<details class="review-plan-item"><summary class="review-plan-summary"><span class="review-plan-summary-title">🌟 '+esc(row.subject||'未選科目')+'｜'+esc(row.scope||'未填複習細項')+'</span><span class="memory-chevron" aria-hidden="true">▼</span></summary>'
          +'<div class="review-plan-row"><button class="review-plan-row-delete" type="button" data-review-plan-del-row="'+eventIndex+':'+index+'" aria-label="取消此複習細項">×</button><label class="label">科目<select class="field" data-review-plan-subject="'+eventIndex+':'+index+'">'+subjectOptions16(row.subject)+'</select></label><label class="label">複習日期<input class="field" type="date" data-review-plan-date="'+eventIndex+':'+index+'" value="'+esc(row.date)+'"></label><label class="label review-plan-scope">複習細項<input class="field" data-review-plan-scope="'+eventIndex+':'+index+'" value="'+esc(row.scope||'')+'" placeholder="例如：第 6–10 課、錯題重做"></label><div class="review-plan-status-actions"><label class="label">狀態<select class="field" data-review-plan-status="'+eventIndex+':'+index+'"><option value="pending" '+(!row.done?'selected':'')+'>未完成</option><option value="completed" '+(row.done?'selected':'')+'>已完成</option></select></label><button class="todo-star-btn '+(row.star?'is-starred':'')+'" type="button" data-review-plan-star="'+eventIndex+':'+index+'">'+(row.star?'★ 已加星號':'☆ 加星號')+'</button></div></div></details>';
      }).join('')+'</section>';
  }).join('');
  return '<div class="review-planning">'+groups+'<div class="review-plan-batch-bar"><button class="primary" type="button" data-review-plan-batch="'+eventIndex+'">🍅 儲存計畫並批次建立複習番茄鐘</button></div></div>';
}

function calendarView16(){
  var anchor=new Date((state.calendarMonth||firstOfMonth(today()))+'T12:00:00'),monthTitle=anchor.getFullYear()+' 年 '+(anchor.getMonth()+1)+' 月';
  var sorted=(state.calendarEvents||[]).map(function(item,index){return{x:item,i:index}}).filter(function(row){return !row.x.sourceExamId&&!row.x.cancelled}).sort(function(a,b){return a.x.date.localeCompare(b.x.date)}),exams=sorted.filter(function(row){return row.x.star||isMajor(row.x.type,row.x.title)});
  var reminders=exams.length?exams.map(function(row){
    var event=row.x,index=row.i,left=daysUntil(event.date),start=addDays(event.date,-7*Number(event.reminderWeeks||2)),active=today()>=start&&today()<=event.date;
    var weekly=event.plan&&event.plan.length?'<div class="study-plan">'+event.plan.map(function(item,planIndex){return '<label class="plan-item"><input type="checkbox" data-plan-check="'+index+':'+planIndex+'" '+(item.done?'checked':'')+'><span><b>'+esc(item.date)+'</b> '+esc(item.text)+'</span></label>'}).join('')+'</div>':'';
    return '<article class="exam-reminder"><div class="exam-reminder-head"><div><b>★ '+esc(event.title)+'</b><div class="hint">'+esc(event.date)+'｜'+esc(event.type)+'</div></div><div><button class="star-btn" data-cal-star="'+index+'">'+(event.star?'★':'☆')+'</button><button class="mini-delete" data-cal-del="'+index+'">取消</button></div></div><div class="countdown '+(active?'active-reminder':'')+'">'+(left>=0?'倒數 '+left+' 天':'已結束 '+Math.abs(left)+' 天')+'｜'+(active?'現在應開始準備':'計畫從 '+start+' 開始')+'</div><div class="reminder-controls"><label class="label">開始時間<select class="field" data-rem-weeks="'+index+'">'+[4,3,2,1].map(function(week){return '<option value="'+week+'" '+(Number(event.reminderWeeks)===week?'selected':'')+'>考前 '+week+' 週</option>'}).join('')+'</select></label><button class="secondary" data-build-plan="'+index+'">建立週次提醒</button></div>'+weekly+planRows16(event,index)+'</article>';
  }).join(''):'<div class="empty">目前沒有標示 ★ 的重要事項。</div>';
  var cancelled=(state.calendarEvents||[]).map(function(item,index){return{x:item,i:index}}).filter(function(row){return row.x.cancelled&&(!row.x.cancelCascadeRoot||row.x.cancelCascadeRoot===row.x.id)}),cancelledReviews=cancelledMemoryCalendarReviews16();
  var cancelledHtml=(cancelled.length||cancelledReviews.length)?'<section class="card cancelled-calendar-panel"><h2>↩ 已取消行事</h2><div class="hint">行事與複習都採軟取消；復原後會重新顯示於原日期。</div>'+cancelled.map(function(row){return '<div class="cancelled-calendar-row"><span><b>'+esc(row.x.title||'未命名事項')+'</b><small>'+esc(row.x.date||'')+'｜'+esc(row.x.note||'')+'</small></span><button class="secondary" type="button" data-cal-restore="'+row.i+'">復原</button></div>'}).join('')+cancelledReviews.map(function(review){return '<div class="cancelled-calendar-row"><span><b>'+esc(review.m.subject||'未選科目')+'｜複習</b><small>'+esc(review.date)+'｜'+esc(review.m.scope||review.m.task||'未填複習範圍')+'</small></span><button class="secondary" type="button" data-memory-calendar-restore="'+esc(review.key)+'">復原</button></div>'}).join('')+'</section>':'';
  return top('魔法行事曆')
    +'<section class="card"><div class="manual-grid calendar-entry-grid">'
    +'<label class="label calendar-date-field">日期<input id="calDate" class="field" type="date" value="'+today()+'"></label><label class="label calendar-type-field">類型<select id="calType" class="field">'+calendarTypeOptions('一般')+'</select></label><label class="label calendar-subject-field">事項'+calendarSubjectPicker16()+'</label><label class="label calendar-note-field">備註<input id="calNote" class="field" placeholder="例如：第一次期中考"></label><label class="label calendar-star-field">加星號<span class="calendar-star-control"><input id="calStar" type="checkbox" aria-label="加星號標記重要事項"><span class="calendar-star-icon" aria-hidden="true"></span><span class="calendar-star-copy calendar-star-off"><b>加星號</b><small>標記重要事項</small></span><span class="calendar-star-copy calendar-star-on"><b>已加星號</b><small>優先安排複習</small></span></span></label><button id="addCalendarEvent" class="primary calendar-add-button">加入並規劃複習</button></div></section>'
    +'<section class="paper calendar-paper"><div class="calendar-toolbar"><button id="prevMonth">‹</button><h2>'+monthTitle+'</h2><button id="nextMonth">›</button></div>'+calendarGrid16()+'</section>'
    +'<section class="card"><h2>⭐ 考前複習提醒</h2><div class="hint">下方每科可新增多筆每日細項；規劃完成後，最後一次批次建立行事曆、魔法記憶與複習番茄鐘。</div><div class="exam-reminders">'+reminders+'</div></section>'+cancelledHtml;
}
calendarView=calendarView16;

function findReviewRow16(index){return reviewsForDate16(state.date||today())[index]||null}
var timerLoadBeforeActual16=timerLoad;
timerLoad=function(index){
  var item=tasks()[index],mode=timerModeConfig(timerMode);
  if(!item)return;
  if(!item.subject||!String(item.task||'').trim())return alert('請先填寫科目與工作範圍。');
  stopAlarm();
  timer={id:item.id,kind:'task',date:state.date,start:'尚未開始',end:'自動記錄',subject:item.subject,task:item.task,focusSeconds:mode.focus,breakSeconds:mode.break,remain:mode.focus,elapsed:0,running:false,phase:'focus',cycle:1,recordedFocus:false,timeRecordId:'',cycleStartedAt:null};
  render();
};

var runningBeforeActual16=running;
running=function(on){
  if(on&&timer&&timer.phase==='focus')beginActualTime16();
  return runningBeforeActual16(on);
};

var saveFocusBeforeActual16=saveFocus;
saveFocus=function(seconds,markCompleted,outcome){
  if(timer)finishActualTime16(outcome||'completed');
  return saveFocusBeforeActual16(seconds,markCompleted,outcome);
};

var anotherPomodoroBeforeActual16=anotherPomodoro;
anotherPomodoro=function(){
  var result=anotherPomodoroBeforeActual16();
  if(timer){
    timer.timeRecordId='';
    timer.cycleStartedAt=null;
    timer.start='尚未開始';
    timer.end='自動記錄';
    render();
  }
  return result;
};

function setReviewTimerCopy16(memory){
  if(timer&&timer.kind==='review'&&String(timer.memoryId||'')===String(memory.id||memory.sourceTaskId||'memory')){timer.subject=memory.subject||'複習';timer.task='複習：'+(memory.scope||memory.task||'')}
}
function timerMemory16(){
  if(!timer)return null;
  var manual=(state.magicMemory||[]).find(function(item){return String(item.id||item.sourceTaskId||'memory')===String(timer.memoryId||'')});
  if(manual)return manual;
  var planned=publishedExamReviews16().find(function(row){return String(row.detail.id)===String(timer.memoryId||'')});
  return planned?reviewDetailMemory16(planned.event,planned.detail):null;
}
var setTimerWorkDoneBefore16=setTimerWorkDone;
setTimerWorkDone=function(done){
  setTimerWorkDoneBefore16(done);
  if(timer&&timer.kind==='review'){
    var planned=publishedExamReviews16().find(function(row){return String(row.detail.id)===String(timer.memoryId||'')});
    if(planned){planned.detail.done=!!done;planned.detail.status=done?'completed':'pending'}
  }
};

var bindTodoBefore16=bindTodo;
bindTodo=function(){
  bindTodoBefore16();
  function taskById16(id){return tasks().find(function(item){return String(item.id)===String(id)})}
  function cancelTask16(item){if(!item)return;item.status='cancelled';if(timer&&String(timer.id)===String(item.id)){running(false);stopAlarm();timer=null}save();render()}
  function restoreTask16(item){if(!item)return;item.status='pending';save();render()}
  function addTodayTask16(subject){tasks().unshift({id:uid('t'),start:'',end:'',subject:subject||'',task:'',status:'pending',star:false});taskFormLimit++;save();render()}
  function cancelReview16(review){if(!review)return;state.cancelledReviews[review.key]=true;if(timer&&timer.kind==='review'&&timer.reviewKey===review.key){running(false);stopAlarm();timer=null}save();render()}
  function restoreReview16(review){if(!review)return;delete state.cancelledReviews[review.key];save();render()}
  function plannedRange16(){return {start:readTimePicker16('plannedStart'),end:readTimePicker16('plannedEnd')}}
  function updatePlanEstimate16(){var out=document.getElementById('tomatoEstimate'),range=plannedRange16();if(!out||!range.start||!range.end)return;var duration=mins(range.start,range.end),count=tomatoEstimate16(duration),limit=maxPomodorosByStage();out.className='tomato-estimate '+(count>limit?'too-many':'');out.textContent='預計 '+clockLabel16(range.start)+'－'+clockLabel16(range.end)+'｜'+duration+' 分鐘｜每顆 '+planningCycleMinutes16()+' 分鐘（專注 '+planningFocusMinutes16()+'＋休息 '+planningBreakMinutes16()+'）｜需要 '+count+' 顆番茄鐘'+tomatoLimitText16(count)}
  var addFirstTodo=document.getElementById('addFirstTodo'),addTaskButton=document.getElementById('addTask');
  if(addFirstTodo)addFirstTodo.onclick=function(){addTodayTask16('')};
  if(addTaskButton)addTaskButton.onclick=function(){addTodayTask16('')};
  document.querySelectorAll('[data-add-todo-subject]').forEach(function(button){button.onclick=function(){addTodayTask16(button.dataset.addTodoSubject||'')}});
  document.querySelectorAll('[data-add-review-subject]').forEach(function(button){button.onclick=function(){reviewAddDraft16={subject:button.dataset.addReviewSubject||'',date:state.date||today()};render()}});
  function closeReviewAdd16(){reviewAddDraft16=null;render()}
  var reviewAddModal=document.querySelector('.review-add-modal'),cancelReviewAdd=document.getElementById('cancelReviewAdd'),cancelReviewAddBottom=document.getElementById('cancelReviewAddBottom'),saveReviewAdd=document.getElementById('saveReviewAdd'),reviewAddScope=document.getElementById('reviewAddScope');
  if(reviewAddModal)reviewAddModal.onclick=function(event){if(event.target===reviewAddModal)closeReviewAdd16()};
  if(cancelReviewAdd)cancelReviewAdd.onclick=closeReviewAdd16;
  if(cancelReviewAddBottom)cancelReviewAddBottom.onclick=closeReviewAdd16;
  if(saveReviewAdd)saveReviewAdd.onclick=createDirectReview16;
  if(reviewAddScope)reviewAddScope.onkeydown=function(event){if(event.key==='Enter'){event.preventDefault();createDirectReview16()}};
  document.querySelectorAll('[data-group-subject]').forEach(function(select){select.onchange=function(){var old=select.dataset.groupSubject,next=select.value;tasks().forEach(function(item){if(String(item.subject||'')===old)item.subject=next});reviewsForDate16(state.date||today()).forEach(function(review){if(String(review.m.subject||'')===old)review.m.subject=next});save();render()}});
  document.querySelectorAll('[data-overview-task]').forEach(function(input){input.onchange=function(){var item=tasks()[Number(input.dataset.overviewTask)];if(item){item.task=input.value.trim();save();render()}}});
  document.querySelectorAll('[data-overview-status]').forEach(function(select){select.onchange=function(){var item=tasks()[Number(select.dataset.overviewStatus)];if(item){item.status=select.value;save();render()}}});
  document.querySelectorAll('[data-overview-star]').forEach(function(button){button.onclick=function(){var item=tasks()[Number(button.dataset.overviewStar)];if(item){item.star=!item.star;save();render()}}});
  document.querySelectorAll('[data-cancel-task-id]').forEach(function(button){button.onclick=function(){cancelTask16(taskById16(button.dataset.cancelTaskId))}});
  document.querySelectorAll('[data-restore-task-id]').forEach(function(link){link.onclick=function(event){event.preventDefault();restoreTask16(taskById16(link.dataset.restoreTaskId))}});
  document.querySelectorAll('[data-cancel-task]').forEach(function(button){button.onclick=function(){cancelTask16(tasks()[Number(button.dataset.cancelTask)])}});
  document.querySelectorAll('[data-restore-task]').forEach(function(button){button.onclick=function(){restoreTask16(tasks()[Number(button.dataset.restoreTask)])}});
  document.querySelectorAll('[data-plan-timer]').forEach(function(button){button.onclick=function(){var index=Number(button.dataset.planTimer),item=tasks()[index];if(!item||item.status==='cancelled')return;if(!item.subject||!String(item.task||'').trim())return alert('請先填寫科目與工作範圍。');if(timerMode==='test')timerMode='25/5';timerPlanningIndex16=null;timerLoad(index);scrollToTimer16()}});
  document.querySelectorAll('[data-review-timer]').forEach(function(button){button.onclick=function(){if(timerMode==='test')timerMode='25/5';loadReviewTimer16(Number(button.dataset.reviewTimer))}});
  document.querySelectorAll('[data-cancel-review]').forEach(function(button){button.onclick=function(){cancelReview16(findReviewRow16(Number(button.dataset.cancelReview)))}});
  document.querySelectorAll('[data-restore-review]').forEach(function(link){link.onclick=function(event){event.preventDefault();restoreReview16(findReviewRow16(Number(link.dataset.restoreReview)))}});
  document.querySelectorAll('[data-review-scope]').forEach(function(input){input.onchange=function(){var review=findReviewRow16(Number(input.dataset.reviewScope));if(!review)return;if(review.detail)review.detail.scope=input.value.trim();else review.m.scope=input.value.trim();setReviewTimerCopy16(review.m);save();render()}});
  document.querySelectorAll('[data-review-star]').forEach(function(button){button.onclick=function(){var review=findReviewRow16(Number(button.dataset.reviewStar));if(!review)return;if(review.detail)review.detail.star=!review.detail.star;else review.m.star=!review.m.star;save();render()}});
  document.querySelectorAll('[data-review-status]').forEach(function(select){select.onchange=function(){var review=findReviewRow16(Number(select.dataset.reviewStatus));if(!review)return;var done=select.value==='completed';state.reviewCompletions[review.key]=done;if(review.detail){review.detail.done=done;review.detail.status=done?'completed':'pending'}save();render()}});
  var timerSubject=document.getElementById('timerReviewSubject'),timerScope=document.getElementById('timerReviewScope'),timerStatus=document.getElementById('timerReviewStatus');
  if(timerSubject)timerSubject.onchange=function(){var memory=timerMemory16();if(!memory)return;var planned=publishedExamReviews16().find(function(row){return String(row.detail.id)===String(memory.id)});memory.subject=timerSubject.value;if(planned)planned.detail.subject=timerSubject.value;setReviewTimerCopy16(memory);save();render()};
  if(timerScope)timerScope.onchange=function(){var memory=timerMemory16();if(!memory)return;var planned=publishedExamReviews16().find(function(row){return String(row.detail.id)===String(memory.id)});memory.scope=timerScope.value.trim();if(planned)planned.detail.scope=memory.scope;setReviewTimerCopy16(memory);save();render()};
  if(timerStatus)timerStatus.onchange=function(){if(!timer||!timer.reviewKey)return;state.reviewCompletions[timer.reviewKey]=timerStatus.value==='completed';save();render()};
  document.querySelectorAll('[data-mode="test"]').forEach(function(button){button.title='不需設定科目或工作，可直接使用番茄鐘';button.onclick=function(){if(timer&&timer.running)return alert('請先暫停番茄鐘再切換模式。');timerMode='test';var mode=timerModeConfig('test');if(!timer){timer={id:'quick-'+Date.now(),kind:'quick',date:state.date||today(),start:'尚未開始',end:'自動記錄',subject:'快速使用',task:'自由專注',focusSeconds:mode.focus,breakSeconds:mode.break,remain:mode.focus,elapsed:0,running:false,phase:'focus',cycle:1,recordedFocus:false}}else{timer.focusSeconds=mode.focus;timer.breakSeconds=mode.break;timer.phase='focus';timer.remain=mode.focus;timer.elapsed=0;timer.recordedFocus=false;stopAlarm()}render()}});
};

function memorySourceLabel35(memory){
  return memory&&memory.sourceExamId?'來自行事曆計畫':'來自今日工作清單（To Do List）';
}
function memorySummary35(subject,scope,source){
  return '<summary class="memory-card-summary"><span class="memory-summary-title">🌟 '+esc(subject||'未選科目')+'｜'+esc(scope||'未填範圍')+'</span><span class="memory-summary-meta"><span class="pill memory-source-pill">'+esc(source)+'</span><span class="memory-chevron" aria-hidden="true">▼</span></span></summary>';
}
magicMemoryView=function(){
  var cards=(state.magicMemory||[]).map(function(memory,index){
    if(memory.sourceExamId)return '';
    var selected=memoryOffsets(memory),presets=MAGIC16_PRESETS.map(function(offset){return '<label class="memory-preset"><input type="checkbox" data-mem-pick="'+index+':'+offset+'" '+(selected.indexOf(offset)>=0?'checked':'')+'><span>+'+offset+' 天</span></label>'}).join('');
    var schedules=selected.map(function(offset,offsetIndex){var date=addDays(memory.sourceDate,Number(offset)),key=reviewKey16(memory,offset,date),done=!!state.reviewCompletions[key];return '<div class="memory-review-row"><div><b>'+esc(shortDate(date))+'</b><small>D+'+offset+'｜第 '+(offsetIndex+1)+' 次</small></div><select class="field" data-memory-review-status="'+index+':'+offset+'"><option value="pending" '+(!done?'selected':'')+'>未完成</option><option value="completed" '+(done?'selected':'')+'>已完成</option></select></div>'}).join('');
    var titleSubject=memory.subject||'未選科目',titleScope=memory.scope||memory.task||'未填範圍',source=memorySourceLabel35(memory);
    return '<details class="memory-card memory-compact">'+memorySummary35(titleSubject,titleScope,source)
      +'<div class="memory-card-details"><div class="memory-card-actions"><button class="danger" data-mem-del="'+index+'">刪除</button></div>'
      +'<div class="memory-edit-grid"><label class="label">科目<select class="field" data-mem-subject="'+index+'">'+subjectOptions16(memory.subject)+'</select></label><label class="label">複習範圍<textarea class="field" data-mem-scope="'+index+'">'+esc(memory.scope||memory.task||'')+'</textarea></label></div>'
      +'<div class="label">複習日（直接點選）<div class="memory-preset-grid">'+presets+'</div></div><div class="memory-review-list"><b>完成狀態</b>'+schedules+'</div></div></details>';
  }).join('');
  var plannedCards=publishedExamReviews16().map(function(row){
    var detail=row.detail,source='來自行事曆計畫';
    return '<details class="memory-card memory-compact exam-review-memory">'+memorySummary35(detail.subject,detail.scope,source)
      +'<div class="memory-card-details"><div class="memory-edit-grid"><label class="label">科目<select class="field" data-plan-memory-subject="'+row.eventIndex+':'+row.detailIndex+'">'+subjectOptions16(detail.subject)+'</select></label><label class="label">複習範圍<textarea class="field" data-plan-memory-scope="'+row.eventIndex+':'+row.detailIndex+'">'+esc(detail.scope||'')+'</textarea></label></div>'
      +'<div class="memory-review-row"><div><b>'+esc(shortDate(detail.date))+'</b><small>D+1｜批次複習計畫</small></div><select class="field" data-plan-memory-status="'+row.eventIndex+':'+row.detailIndex+'"><option value="pending" '+(!detail.done?'selected':'')+'>未完成</option><option value="completed" '+(detail.done?'selected':'')+'>已完成</option></select></div></div></details>';
  }).join('');
  cards+=plannedCards;
  return top('魔法記憶(複習番茄鐘)')+'<section class="card memory-list-card">'+(cards||'<div class="empty">目前沒有功課，請先從 To Do List 帶入。</div>')+'</section>';
};

dailyTaskMapView=function(){
  var date=state.dailyMapDate||today(),todoRows=state.tasks[date]||[],reviews=reviewsForDate16(date);
  return top('每日任務地圖')+'<section class="card"><div class="portal-title"><div><div class="hint">由當日 To Do 與同一份複習計畫資料組成。</div></div><label class="label">日期<input id="dailyMapDate" class="field" type="date" value="'+esc(date)+'"></label></div><div class="daily-map-grid"><div><h3>✅ 今日 To Do</h3>'+(todoRows.map(function(item){return '<article class="daily-map-card"><b>'+esc(item.subject||'未選科目')+'</b><span>'+esc(item.task||'未填工作')+'</span><small>'+(item.status==='completed'?'已完成':'未完成')+'</small></article>'}).join('')||'<div class="empty">這一天沒有 To Do。</div>')+'</div><div><h3>🌟 今日複習</h3>'+(reviews.map(function(review){return '<article class="daily-map-card"><b>🌟 '+esc(review.m.subject)+'</b><span>'+esc(review.m.scope||review.m.task||'')+'</span><small>第 '+(review.oi+1)+' 次複習｜D+'+Number(review.n)+'</small></article>'}).join('')||'<div class="empty">這一天沒有複習計畫。</div>')+'</div></div></section>';
};

var bindMemoryBefore16=bindMemory;
bindMemory=function(){
  bindMemoryBefore16();
  document.querySelectorAll('[data-mem-subject]').forEach(function(select){select.onchange=function(){var memory=state.magicMemory[Number(select.dataset.memSubject)];if(!memory)return;memory.subject=select.value;setReviewTimerCopy16(memory);save();render()}});
  document.querySelectorAll('[data-memory-review-status]').forEach(function(select){select.onchange=function(){var parts=select.dataset.memoryReviewStatus.split(':'),memory=state.magicMemory[Number(parts[0])],offset=Number(parts[1]);if(!memory)return;var date=addDays(memory.sourceDate,offset);state.reviewCompletions[reviewKey16(memory,offset,date)]=select.value==='completed';save();render()}});
  document.querySelectorAll('[data-plan-memory-subject]').forEach(function(select){select.onchange=function(){var row=getReviewDetail16(select.dataset.planMemorySubject);if(row){row.detail.subject=select.value;save();render()}}});
  document.querySelectorAll('[data-plan-memory-scope]').forEach(function(input){input.onchange=function(){var row=getReviewDetail16(input.dataset.planMemoryScope);if(row){row.detail.scope=input.value.trim();save();render()}}});
  document.querySelectorAll('[data-plan-memory-status]').forEach(function(select){select.onchange=function(){var row=getReviewDetail16(select.dataset.planMemoryStatus);if(row){row.detail.done=select.value==='completed';row.detail.status=row.detail.done?'completed':'pending';save();render()}}});
};

function getReviewDetail16(pair){
  var parts=String(pair||'').split(':').map(Number),event=state.calendarEvents[parts[0]];
  if(!event)return null;
  var rows=reviewDetails16(event),detail=rows[parts[1]];
  return detail?{event:event,eventIndex:parts[0],detail:detail,detailIndex:parts[1]}:null;
}
function publishReviewPlan16(eventIndex){
  var event=state.calendarEvents[eventIndex];if(!event)return;
  var active=reviewDetails16(event).filter(function(detail){return !detail.cancelled});
  if(!active.length)return alert('請先新增至少一筆複習細項。');
  var invalid=active.find(function(detail){return !detail.subject||!detail.date||!String(detail.scope||'').trim()});
  if(invalid)return alert('每一筆複習細項都需要科目、日期與範圍，請填寫完成後再批次建立。');
  active.forEach(function(detail){detail.published=true;detail.status=detail.done?'completed':'pending'});
  event.reviewPlanPublishedAt=new Date().toISOString();state.activeExamPlanId=event.id;
  save();render();
}
function addReviewToCalendar16(pair){
  var row=getReviewDetail16(pair);if(!row)return;
  if(!row.detail.date||!String(row.detail.scope||'').trim())return alert('請先填寫複習日期與複習細項。');
  row.detail.published=true;save();render();
}
function addReviewToMemory16(pair){
  addReviewToCalendar16(pair);
}

function relatedMemoriesForCalendar16(event){
  if(!event)return [];
  var eventId=String(event.id||''),sourceId=String(event.sourceExamId||''),reviewIndex=Number(event.sourceReviewIndex);
  return (state.magicMemory||[]).filter(function(memory){
    if(event.memoryEventId&&String(memory.id||'')===String(event.memoryEventId))return true;
    if(sourceId&&String(memory.sourceExamId||'')===sourceId&&Number(memory.sourceReviewIndex)===reviewIndex)return true;
    return !sourceId&&eventId&&String(memory.sourceExamId||'')===eventId;
  });
}
function cancelCalendarCascade16(index){
  var event=state.calendarEvents[index];if(!event)return;
  if(!event.id)event.id=uid('cal');
  var root=String(event.id);
  event.cancelled=true;event.cancelCascadeRoot=root;
  if(!event.sourceExamId)(state.calendarEvents||[]).forEach(function(child){if(String(child.sourceExamId||'')===root){child.cancelled=true;child.cancelCascadeRoot=root}});
  relatedMemoriesForCalendar16(event).forEach(function(memory){memory.cancelledByCalendar=root;if(timer&&String(timer.memoryId||'')===String(memory.id||'')){running(false);stopAlarm();timer=null}});
  save();render();
}
function restoreCalendarCascade16(index){
  var event=state.calendarEvents[index];if(!event)return;
  var root=String(event.cancelCascadeRoot||event.id||'');
  (state.calendarEvents||[]).forEach(function(item){if(item===event||String(item.cancelCascadeRoot||'')===root){item.cancelled=false;delete item.cancelCascadeRoot}});
  (state.magicMemory||[]).forEach(function(memory){if(String(memory.cancelledByCalendar||'')===root)delete memory.cancelledByCalendar});
  save();render();
}

var bindCalendarBefore16=bindCalendar;
bindCalendar=function(){
  bindCalendarBefore16();
  var addButton=document.getElementById('addCalendarEvent'),subjectToggle=document.getElementById('calSubjectToggle'),subjectMenu=document.getElementById('calSubjectMenu'),titleInput=document.getElementById('calTitle');
  function syncCalendarSubjects16(){var chosen=Array.prototype.slice.call(document.querySelectorAll('[data-cal-subject]:checked')).map(function(input){return input.dataset.calSubject});if(titleInput)titleInput.value=chosen.join('、');if(subjectToggle)subjectToggle.firstChild.nodeValue=chosen.length?chosen.join('、')+' ':'選擇考試科目 '}
  if(subjectToggle&&subjectMenu)subjectToggle.onclick=function(){var open=subjectMenu.hidden;subjectMenu.hidden=!open;subjectToggle.setAttribute('aria-expanded',String(open))};
  document.querySelectorAll('[data-cal-subject]').forEach(function(input){input.onchange=syncCalendarSubjects16});
  if(addButton)addButton.onclick=function(){
    syncCalendarSubjects16();
    var date=document.getElementById('calDate').value,title=String(titleInput&&titleInput.value||'').trim(),type=document.getElementById('calType').value,note=document.getElementById('calNote').value.trim();
    if(!date||!title)return alert('請先填寫日期並選擇至少一個科目。');
    if(!addCalendarEvent({date:date,title:title,type:type,note:note,star:true,reminderWeeks:3}))return;
    var event=state.calendarEvents[state.calendarEvents.length-1];state.activeExamPlanId=event.id;reviewDetails16(event);save();render();
  };
  document.querySelectorAll('[data-cal-del]').forEach(function(button){button.onclick=function(){cancelCalendarCascade16(Number(button.dataset.calDel))}});
  document.querySelectorAll('[data-cal-event-del]').forEach(function(button){button.onclick=function(event){event.stopPropagation();cancelCalendarCascade16(Number(button.dataset.calEventDel))}});
  document.querySelectorAll('[data-cal-restore]').forEach(function(button){button.onclick=function(){restoreCalendarCascade16(Number(button.dataset.calRestore))}});
  document.querySelectorAll('[data-review-calendar-del]').forEach(function(button){button.onclick=function(event){event.stopPropagation();var row=getReviewDetail16(button.dataset.reviewCalendarDel);if(row){row.detail.cancelled=true;save();render()}}});
  document.querySelectorAll('[data-memory-calendar-del]').forEach(function(button){button.onclick=function(event){event.stopPropagation();state.cancelledReviews[button.dataset.memoryCalendarDel]=true;save();render()}});
  document.querySelectorAll('[data-memory-calendar-restore]').forEach(function(button){button.onclick=function(){delete state.cancelledReviews[button.dataset.memoryCalendarRestore];save();render()}});
  document.querySelectorAll('[data-review-plan-subject]').forEach(function(select){select.onchange=function(){var row=getReviewDetail16(select.dataset.reviewPlanSubject);if(!row)return;row.detail.subject=select.value;save();render()}});
  document.querySelectorAll('[data-review-plan-date]').forEach(function(input){input.onchange=function(){var row=getReviewDetail16(input.dataset.reviewPlanDate);if(!row)return;row.detail.date=input.value;save()}});
  document.querySelectorAll('[data-review-plan-scope]').forEach(function(input){input.onchange=function(){var row=getReviewDetail16(input.dataset.reviewPlanScope);if(!row)return;row.detail.scope=input.value.trim();save()}});
  document.querySelectorAll('[data-review-plan-status]').forEach(function(select){select.onchange=function(){var row=getReviewDetail16(select.dataset.reviewPlanStatus);if(!row)return;row.detail.done=select.value==='completed';row.detail.status=row.detail.done?'completed':'pending';save()}});
  document.querySelectorAll('[data-review-plan-star]').forEach(function(button){button.onclick=function(){var row=getReviewDetail16(button.dataset.reviewPlanStar);if(row){row.detail.star=!row.detail.star;save();render()}}});
  document.querySelectorAll('[data-review-plan-add-row]').forEach(function(button){button.onclick=function(){var split=button.dataset.reviewPlanAddRow.indexOf(':'),eventIndex=Number(button.dataset.reviewPlanAddRow.slice(0,split)),subject=button.dataset.reviewPlanAddRow.slice(split+1);addReviewDetail16(eventIndex,subject)}});
  document.querySelectorAll('[data-review-plan-del-row]').forEach(function(button){button.onclick=function(){var row=getReviewDetail16(button.dataset.reviewPlanDelRow);if(row){row.detail.cancelled=true;save();render()}}});
  document.querySelectorAll('[data-review-plan-restore-row]').forEach(function(button){button.onclick=function(){var row=getReviewDetail16(button.dataset.reviewPlanRestoreRow);if(row){row.detail.cancelled=false;save();render()}}});
  document.querySelectorAll('[data-review-plan-batch]').forEach(function(button){button.onclick=function(){publishReviewPlan16(Number(button.dataset.reviewPlanBatch))}});
  document.querySelectorAll('[data-review-plan-add]').forEach(function(button){button.onclick=function(){addReviewToCalendar16(button.dataset.reviewPlanAdd)}});
  document.querySelectorAll('[data-review-plan-memory]').forEach(function(button){button.onclick=function(){addReviewToMemory16(button.dataset.reviewPlanMemory)}});
};

var bindBefore16=bind;
bind=function(){
  bindBefore16();
  function closePageGuides35(except){
    document.querySelectorAll('[data-page-guide-popover]').forEach(function(item){
      if(item!==except)item.hidden=true;
    });
    document.querySelectorAll('[data-page-guide]').forEach(function(item){
      var own=item.parentNode&&item.parentNode.querySelector('[data-page-guide-popover]');
      if(own!==except)item.setAttribute('aria-expanded','false');
    });
  }
  document.querySelectorAll('[data-page-guide]').forEach(function(button){
    var popover=button.parentNode.querySelector('[data-page-guide-popover]');
    function show(){closePageGuides35(popover);popover.hidden=false;button.setAttribute('aria-expanded','true')}
    function hide(){popover.hidden=true;button.setAttribute('aria-expanded','false')}
    button.onclick=function(event){event.stopPropagation();popover.hidden?show():hide()};
    popover.onclick=function(event){event.stopPropagation()};
    if(window.matchMedia&&window.matchMedia('(hover:hover)').matches){button.onmouseenter=show;button.onmouseleave=hide}
  });
  if(!window.__magic35GuideOutsideClose&&document.addEventListener){
    document.addEventListener('click',function(event){
      if(event.target&&event.target.closest&&event.target.closest('[data-page-guide], [data-page-guide-popover]'))return;
      closePageGuides35(null);
    });
    document.addEventListener('keydown',function(event){
      if(event.key==='Escape')closePageGuides35(null);
    });
    window.__magic35GuideOutsideClose=true;
  }
  document.querySelectorAll('[data-page-nav]').forEach(function(select){
    select.onchange=function(){
      var target=select.value;
      if(target==='toolbox'){location.href='./toolbox.html?v=magic35-toolboxsave1';return}
      if(target==='logout'){location.href='./magicians.html?v=magic35-toolboxsave1';return}
      view=target;render();
    };
  });
  var toolbox=document.getElementById('toolboxLink');
  if(toolbox)toolbox.onclick=function(){location.href='./toolbox.html?v=magic35-toolboxsave1'};
  document.querySelectorAll('[data-memory-edit-link]').forEach(function(link){link.onclick=function(event){event.preventDefault();view='memory';render()}});
};

var statsViewBefore16=statsView;
statsView=function(){
  var html=statsViewBefore16(),rows=sessionSlice(),completedSubjects={};
  rows.forEach(function(session){if(session&&session.completedPomodoro!==false&&session.subject)completedSubjects[session.subject]=true});
  return html.replace(/<div class="stat">科目數<strong>[^<]*<\/strong><\/div>/,'<div class="stat">完成科目數<strong>'+Object.keys(completedSubjects).length+'</strong></div>');
};

var recordTimerStatusBefore16=recordTimerStatus;
recordTimerStatus=function(){
  var select=document.getElementById('timerWorkStatus');
  if(!timer||!select)return recordTimerStatusBefore16();
  if(select.value==='completed'){
    if(timer.phase==='focus'&&timer.remain>0)return alert('番茄鐘時間尚未結束；若工作已完成，請選擇「暫停，工作已提前完成」。');
    running(false);stopAlarm();
    var completed={timerId:timer.id,subject:timer.subject,task:timer.task};
    var completedSession=(state.sessions||[]).slice().reverse().find(function(session){return String(session.timerId)===String(timer.id)&&session.outcome==='timeout'});
    if(completedSession)completedSession.workCompletedOnTime=true;
    setTimerWorkDone(true);save();timer=null;completedCelebration16=completed;view='todo';render();
    setTimeout(function(){if(completedCelebration16===completed){completedCelebration16=null;if(view==='todo')render()}},5000);
    return;
  }
  if(select.value==='timeout-incomplete'){
    if(timer.phase==='focus'&&timer.remain>0)return alert('番茄鐘時間尚未結束。');
    running(false);stopAlarm();
    timer.workStatus='timeout-incomplete';setTimerWorkDone(false);save();
    var unfinished={timerId:timer.id,subject:timer.subject,task:timer.task,canContinue:timer.cycle<maxPomodorosByStage()};
    timeoutCelebration16=unfinished;view='todo';render();
    setTimeout(function(){
      if(timeoutCelebration16!==unfinished)return;
      timeoutCelebration16=null;
      if(timer&&String(timer.id)===String(unfinished.timerId)&&unfinished.canContinue){anotherPomodoro();scrollToTimer16()}
      else{timer=null;view='stats';render()}
    },5000);
    return;
  }
  if(select.value==='stop-incomplete'){
    running(false);stopAlarm();finishActualTime16('stop-incomplete');
    var stopped={timerId:timer.id,subject:timer.subject,task:timer.task};
    if(!timer.recordedFocus&&timer.elapsed>0)saveFocus(timer.elapsed,false,'stop-incomplete');
    setTimerWorkDone(false);save();timer=null;stopCelebration16=stopped;view='todo';render();
    setTimeout(function(){if(stopCelebration16===stopped){stopCelebration16=null;if(view==='todo'){view='stats';render()}}},5000);
    return;
  }
  if(select.value!=='early-complete')return recordTimerStatusBefore16();
  var timeStillRunning=timer.phase==='focus'&&timer.remain>0;
  if(!timeStillRunning)return alert('此選項適用於時間尚未到、工作已提前完成。');
  if(timer.elapsed<=0)return alert('尚未產生可記錄的專注時間。');
  running(false);stopAlarm();
  var celebration={timerId:timer.id,subject:timer.subject,task:timer.task,seconds:timer.elapsed};
  saveFocus(timer.elapsed,true,'early-complete');
  earlyCelebration16=celebration;timer=null;view='todo';render();
  setTimeout(function(){if(earlyCelebration16===celebration){earlyCelebration16=null;if(view==='todo')render()}},4400);
};

if(typeof window!=='undefined'&&window.__MAGIC16_TEST_MODE__){
  window.__MAGIC16_TEST_API__={
    addReviewToCalendar:addReviewToCalendar16,
    addReviewToMemory:addReviewToMemory16,
    addReviewDetail:addReviewDetail16,
    publishReviewPlan:publishReviewPlan16,
    buildDirectReview:directReviewRecord16,
    reviewDetails:reviewDetails16,
    reviewsForDate:reviewsForDate16,
    projectedMemoryReviews:projectedMemoryReviews16,
    cancelledMemoryCalendarReviews:cancelledMemoryCalendarReviews16,
    publishedExamReviews:publishedExamReviews16,
    planningFocusMinutes:planningFocusMinutes16,
    planningBreakMinutes:planningBreakMinutes16,
    planningCycleMinutes:planningCycleMinutes16,
    tomatoEstimate:tomatoEstimate16,
    pomodoroLimit:maxPomodorosByStage,
    completedCelebrationHtml:completedCelebrationHtml16,
    setCompletedCelebration:function(value){completedCelebration16=value},
    timeoutCelebrationHtml:timeoutCelebrationHtml16,
    setTimeoutCelebration:function(value){timeoutCelebration16=value},
    stopCelebrationHtml:stopCelebrationHtml16,
    setStopCelebration:function(value){stopCelebration16=value},
    actualClock:actualClock16,
    beginActualTime:beginActualTime16,
    finishActualTime:finishActualTime16,
    timeRecordsHtml:timeRecordsHtml16
  };
}

var renderBeforeBackTop35=render;
render=function(){
  renderBeforeBackTop35();
  if(!document.querySelector)return;
  var main=document.querySelector('main.app');
  if(main&&!main.querySelector('[data-back-to-top]')){
    var footer=main.querySelector('.footer');
    var html='<div class="back-to-top-row"><button class="back-to-top" type="button" data-back-to-top>↑ 回到頂端</button></div>';
    if(footer)footer.insertAdjacentHTML('beforebegin',html);else main.insertAdjacentHTML('beforeend',html);
  }
  var backTop=document.querySelector('[data-back-to-top]');
  if(backTop)backTop.onclick=function(){window.scrollTo(0,0)};
};

if(typeof location!=='undefined'&&location.search){
  try{
    var requestedPage35=new URLSearchParams(location.search).get('page');
    if(['home','calendar','todo','memory','stats','exams','weekly'].indexOf(requestedPage35)>=0)view=requestedPage35;
  }catch(e){}
}
render();
})();
