(function(){
'use strict';
if(typeof calendarView!=='function'||typeof bindCalendar!=='function'||typeof state==='undefined')return;

function calendarExamSubjects(){
  var list=(typeof examSubjects!=='undefined'&&examSubjects&&examSubjects[state.stage])||[];
  return Array.isArray(list)?list:[];
}
function selectedCalendarSubjects(){
  return Array.from(document.querySelectorAll('[data-cal-subject]:checked')).map(function(box){return box.dataset.calSubject||''}).filter(Boolean);
}
function calendarSubjectPicker(){
  var list=calendarExamSubjects();
  return '<div class="calendar-subject-combo">'
    +'<button id="calSubjectToggle" class="calendar-subject-toggle" type="button" aria-expanded="false">選擇考試科目 <span>⌄</span></button>'
    +'<div id="calSubjectMenu" class="calendar-subject-menu" hidden>'
    +list.map(function(s){return '<label class="calendar-subject-option"><input type="checkbox" data-cal-subject="'+esc(s)+'"><span>'+esc(s)+'</span></label>'}).join('')
    +'</div>'
    +'<input id="calTitle" type="hidden" value="">'
    +'</div>';
}
function calendarGridHtml(){
  var anchor=new Date((state.calendarMonth||firstOfMonth(today()))+'T12:00:00'),y=anchor.getFullYear(),m=anchor.getMonth(),first=new Date(y,m,1,12),last=new Date(y,m+1,0,12),cells=[];
  for(var i=0;i<first.getDay();i++)cells.push('<div class="calendar-day"></div>');
  for(var d=1;d<=last.getDate();d++){
    var date=dk(new Date(y,m,d,12));
    var items=state.calendarEvents.map(function(x,idx){return{x:x,i:idx}}).filter(function(o){return o.x.date===date}).sort(function(a,b){return Number(b.x.star)-Number(a.x.star)});
    cells.push('<div class="calendar-day '+(date===today()?'today':'')+'"><b>'+d+'</b>'+items.map(function(o){
      var x=o.x,i=o.i,displayTitle=String(x.title||'')+String(x.note||''),detail=[x.type||''].filter(Boolean).join('｜');
      return '<div class="calendar-event-card '+(x.star?'major':'')+'" data-cal-open="'+i+'" role="button" tabindex="0">'
        +'<button class="calendar-event-delete" type="button" data-cal-event-del="'+i+'" aria-label="刪除 '+esc(x.title)+'">×</button>'
        +'<div class="calendar-event-title">'+(x.star?'★ ':'')+esc(displayTitle)+'</div>'
        +(detail?'<div class="calendar-event-detail">'+esc(detail)+'</div>':'')
        +'</div>';
    }).join('')+'</div>');
  }
  return '<div class="calendar-weekdays"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div><div class="calendar-grid">'+cells.join('')+'</div>';
}

calendarView=function(){
  var anchor=new Date((state.calendarMonth||firstOfMonth(today()))+'T12:00:00'),title=anchor.getFullYear()+' 年 '+(anchor.getMonth()+1)+' 月';
  var sorted=state.calendarEvents.map(function(x,i){return{x:x,i:i}}).sort(function(a,b){return a.x.date.localeCompare(b.x.date)}),exams=sorted.filter(function(o){return o.x.star||isMajor(o.x.type,o.x.title)});
  return top('魔法行事曆')
    +'<section class="card"><h2>📅 魔法行事曆</h2><div class="hint">目前測試版只保留手動輸入；拍照辨識、照片／PDF 上傳與 AI 功能已全部取消。</div>'
    +'<div class="note">期中考、期末考、模擬考或其他重要事項可標示 ★，並建立考前 4／3／2／1 週複習計畫。</div>'
    +'<div class="manual-grid calendar-entry-grid" style="margin-top:12px">'
    +'<label class="label">日期<input id="calDate" class="field" type="date" value="'+today()+'"></label>'
    +'<label class="label">類型<select id="calType" class="field">'+calendarTypeOptions('一般')+'</select></label>'
    +'<label class="label calendar-subject-field">事項'+calendarSubjectPicker()+'</label>'
    +'<label class="label calendar-note-field">備註<input id="calNote" class="field" placeholder="自行編輯"></label>'
    +'<label class="star-check"><input id="calStar" type="checkbox"> ★ 重要事項</label><button id="addCalendarEvent" class="primary">＋加入行事曆</button>'
    +'</div></section>'
    +'<section class="paper"><div class="calendar-toolbar"><button id="prevMonth">‹</button><h2>'+title+'</h2><button id="nextMonth">›</button></div>'+calendarGridHtml()+'</section>'
    +'<section class="card"><h2>⭐ 考前複習提醒</h2><div class="hint">可選考前 4、3、2、1 週開始。</div><div class="exam-reminders">'
    +(exams.length?exams.map(function(o){var x=o.x,i=o.i,left=daysUntil(x.date),start=addDays(x.date,-7*Number(x.reminderWeeks||2)),active=today()>=start&&today()<=x.date;return '<article class="exam-reminder"><div class="exam-reminder-head"><div><b>★ '+esc(x.title)+'</b><div class="hint">'+esc(x.date)+'｜'+esc(x.type)+'</div></div><div><button class="star-btn" data-cal-star="'+i+'">'+(x.star?'★':'☆')+'</button><button class="mini-delete" data-cal-del="'+i+'">刪除</button></div></div><div class="countdown '+(active?'active-reminder':'')+'">'+(left>=0?'倒數 '+left+' 天':'已結束 '+Math.abs(left)+' 天')+'｜'+(active?'現在應開始準備':'計畫從 '+start+' 開始')+'</div><div class="reminder-controls"><label class="label">開始時間<select class="field" data-rem-weeks="'+i+'">'+[4,3,2,1].map(function(w){return '<option value="'+w+'" '+(Number(x.reminderWeeks)===w?'selected':'')+'>考前 '+w+' 週</option>'}).join('')+'</select></label><button class="primary" data-build-plan="'+i+'">建立讀書計畫</button></div>'+(x.plan&&x.plan.length?'<div class="study-plan">'+x.plan.map(function(p,pi){return '<label class="plan-item"><input type="checkbox" data-plan-check="'+i+':'+pi+'" '+(p.done?'checked':'')+'><span><b>'+esc(p.date)+'</b> '+esc(p.text)+'</span></label>'}).join('')+'</div>':'')+'</article>'}).join(''):'<div class="empty">目前沒有標示 ★ 的重要事項。</div>')
    +'</div></section>';
};

var originalBindCalendar=bindCalendar;
bindCalendar=function(){
  originalBindCalendar();
  var toggle=document.getElementById('calSubjectToggle'),menu=document.getElementById('calSubjectMenu'),title=document.getElementById('calTitle');
  if(toggle&&menu&&title){
    toggle.onclick=function(e){e.stopPropagation();var willOpen=menu.hidden;menu.hidden=!willOpen;toggle.setAttribute('aria-expanded',willOpen?'true':'false')};
    document.querySelectorAll('[data-cal-subject]').forEach(function(box){
      box.onchange=function(){
        var chosen=selectedCalendarSubjects();
        title.value=chosen.join('、');
        toggle.childNodes[0].nodeValue=chosen.length?chosen.join('、')+' ':'選擇考試科目 ';
      };
    });
    document.addEventListener('click',function(e){if(!menu.hidden&&!e.target.closest('.calendar-subject-combo')){menu.hidden=true;toggle.setAttribute('aria-expanded','false')}},false);
  }
  document.querySelectorAll('[data-cal-open]').forEach(function(card){
    card.onclick=function(e){if(e.target.closest('[data-cal-event-del]'))return;card.classList.toggle('open')};
    card.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();card.classList.toggle('open')}};
  });
  document.querySelectorAll('[data-cal-event-del]').forEach(function(btn){
    btn.onclick=function(e){e.stopPropagation();var i=Number(btn.dataset.calEventDel);if(!Number.isInteger(i)||!state.calendarEvents[i])return;if(confirm('確定刪除這個行事曆事件？')){state.calendarEvents.splice(i,1);save();render()}};
  });
};
})();
