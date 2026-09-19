(function(){
'use strict';
if(typeof render!=='function')return;
try{
  if(typeof magicLevel==='function'){
    magicLevel=function(stage){return stage==='junior'?'中階(國中)':stage==='senior'?'高階(高中)':'初階(國小)'};
  }
  if(typeof calendarView==='function'){
    var oldCalendarView=calendarView;
    calendarView=function(){
      return oldCalendarView().replace('placeholder="例如：第一次期中考"','placeholder="例如:國語1-6,數學1-4,自然1-2"');
    };
  }
  render();
}catch(e){console.error('ui-fix-v12',e)}
})();
