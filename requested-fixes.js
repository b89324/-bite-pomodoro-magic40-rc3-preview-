(function(){
'use strict';
if(typeof homeView!=='function'||typeof top!=='function'||typeof bind!=='function')return;
var previousHomeView=homeView,previousBind=bind;
homeView=function(){
  return previousHomeView().replace('</section><div class="mission-grid">','<div class="row logout-row"><button id="logoutButton" class="logout-button" type="button">🚪 登出</button></div></section><div class="mission-grid">');
};
top=function(title){
  return '<div class="top"><button class="back" data-view="home" aria-label="回主畫面">‹</button><h1>'+esc(title)+'</h1><button class="todo-jump" data-view="todo" aria-label="回到 To Do List 和蕃茄鐘">🍅 To Do List</button></div>';
};
bind=function(){
  previousBind();
  var logout=document.getElementById('logoutButton');
  if(logout)logout.onclick=function(){location.href='./magicians.html?v=magic16'};
};
render();
})();
