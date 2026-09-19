import { webkit, devices } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const server=spawn('python3',['-m','http.server','4174','--bind','127.0.0.1'],{stdio:'inherit'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const check=(cond,msg)=>{if(!cond)throw new Error(msg)};

try{
  mkdirSync('qa-mobile-artifacts',{recursive:true});

  const browser=await webkit.launch({headless:true});
  const iphone=devices['iPhone 13'];
  const context=await browser.newContext({...iphone});
  const page=await context.newPage();

  page.on('console',m=>console.log('IOS_CONSOLE',m.type(),m.text()));
  page.on('pageerror',e=>console.log('IOS_PAGEERROR',e.message));

  await page.goto('https://b89324.github.io/-bite-pomodoro-magic40-rc3-preview-/study.html?student=demo-A&stage=elementary',{waitUntil:'networkidle'});
  const app0=await page.locator('#app').innerText();
  check(!app0.includes('頁面載入失敗'),'demo-A failed on iPhone 13 WebKit');

  await page.evaluate(()=>{
    const k='bite-pomodoro-github-v1.student.demo-A';
    const s=JSON.parse(localStorage.getItem(k));
    s.date='2026-09-19';
    s.tasks['2026-09-19']=[{id:'ios-task-A',start:'19:00',end:'19:30',subject:'數學',task:'iPhone13-A',status:'pending'}];
    s.sessions.push({id:'ios-sa',timerId:'ios-ta',date:'2026-09-19',subject:'數學',task:'iPhone13-A',seconds:600,cycle:1,outcome:'early-complete'});
    localStorage.setItem(k,JSON.stringify(s));
  });

  await page.reload({waitUntil:'networkidle'});
  const nav=page.locator('[data-page-nav]').first();
  check(await nav.count()>0,'mobile page navigation missing');

  await nav.selectOption('todo');
  await page.waitForTimeout(200);
  const task=page.locator('[data-overview-task="0"]');
  check(await task.count()===1,'mobile To Do input missing');
  check(await task.inputValue()==='iPhone13-A','mobile To Do value not restored');
  await page.screenshot({path:'qa-mobile-artifacts/iphone13-todo-portrait.png',fullPage:true});

  await page.setViewportSize({width:844,height:390});
  await page.waitForTimeout(150);
  check((await page.locator('#app').innerText()).includes('To Do List＋蕃茄鐘'),'landscape To Do layout failed');
  await page.screenshot({path:'qa-mobile-artifacts/iphone13-todo-landscape.png',fullPage:true});

  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(150);
  await page.locator('[data-page-nav]').first().selectOption('stats');
  await page.waitForTimeout(200);
  check(await page.locator('.magic38-gallery').count()===1,'mobile magic38 gallery missing');
  check(await page.locator('#m40-backup').count()===1,'mobile magic40 backup missing');
  check((await page.locator('#app').innerText()).includes('累積獲得 1 枚勳章'),'mobile medal count incorrect');
  await page.screenshot({path:'qa-mobile-artifacts/iphone13-stats-portrait.png',fullPage:true});

  // WebKit mobile: verify export action executes. Playwright WebKit does not reliably
  // surface Blob-anchor downloads as a "download" event, so physical Safari download
  // remains a device-only acceptance item.
  await page.locator('#m40-export').click();
  await page.waitForTimeout(300);
  const exportMessage=await page.locator('#m40-message').innerText();
  console.log('EXPORT_DEBUG',exportMessage);
  check(exportMessage.includes('已產生 demo-A 的備份下載'),'backup export action did not execute: '+exportMessage);

  // Build a valid same-student backup file from the currently persisted demo-A state
  // so WebKit's real file chooser/import/undo path can still be tested end-to-end.
  const backupState=await page.evaluate(()=>JSON.parse(localStorage.getItem('bite-pomodoro-github-v1.student.demo-A')));
  const backupPath='qa-mobile-artifacts/demo-A-backup.json';
  writeFileSync(backupPath,JSON.stringify({
    format:'bite-magic40-preview-v1',
    version:1,
    studentId:'demo-A',
    createdAt:new Date().toISOString(),
    state:backupState
  },null,2));

  // Change A through the real To Do input so both in-memory state and storage change.
  await page.locator('[data-page-nav]').first().selectOption('todo');
  await page.waitForTimeout(150);
  const taskInput=page.locator('[data-overview-task="0"]');
  await taskInput.fill('iPhone13-A-CHANGED');
  await taskInput.dispatchEvent('change');
  await page.waitForTimeout(150);
  check(await taskInput.inputValue()==='iPhone13-A-CHANGED','To Do edit before import failed');

  // Import the downloaded same-student backup with explicit preview/confirm.
  await page.locator('[data-page-nav]').first().selectOption('stats');
  await page.waitForTimeout(150);
  await page.locator('#m40-file').setInputFiles(backupPath);
  await page.waitForTimeout(150);
  check((await page.locator('#m40-message').innerText()).includes('預覽完成'),'same-student backup preview failed');
  await page.locator('#m40-check').check();
  await page.locator('#m40-apply').click();
  await page.waitForTimeout(150);
  const importedState=await page.evaluate(()=>JSON.parse(localStorage.getItem('bite-pomodoro-github-v1.student.demo-A')));
  check(importedState.tasks['2026-09-19'][0].task==='iPhone13-A','same-student import did not restore backup');

  // Undo the import and confirm that the pre-import changed value returns.
  page.once('dialog',d=>d.accept());
  await page.locator('#m40-restore').click();
  await page.waitForTimeout(150);
  const undoState=await page.evaluate(()=>JSON.parse(localStorage.getItem('bite-pomodoro-github-v1.student.demo-A')));
  check(undoState.tasks['2026-09-19'][0].task==='iPhone13-A-CHANGED','undo import did not restore pre-import state');

  // Wrong-student backup must be rejected at preview.
  const wrong=JSON.parse(readFileSync(backupPath,'utf8'));
  wrong.studentId='demo-B';
  const wrongPath='qa-mobile-artifacts/wrong-student.json';
  writeFileSync(wrongPath,JSON.stringify(wrong,null,2));
  await page.locator('#m40-file').setInputFiles(wrongPath);
  await page.waitForTimeout(150);
  check((await page.locator('#m40-message').innerText()).includes('無法預覽'),'wrong-student backup was not rejected');

  // Real WebKit local file input for magic36 CSV and ICS import.
  const csvPath='qa-mobile-artifacts/calendar.csv';
  writeFileSync(csvPath,'日期,事項,類型,備註,加星號\n2026-09-20,WebKit CSV 測試,考試,CSV 匯入,是\n');
  const icsPath='qa-mobile-artifacts/calendar.ics';
  writeFileSync(icsPath,'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:20260921\nSUMMARY:WebKit ICS 測試\nCATEGORIES:一般\nDESCRIPTION:ICS 匯入\nEND:VEVENT\nEND:VCALENDAR\n');

  await page.locator('[data-page-nav]').first().selectOption('calendar');
  await page.waitForTimeout(150);
  await page.locator('#magic36-file').setInputFiles(csvPath);
  await page.waitForTimeout(150);
  check(await page.locator('#magic36-confirm').count()===1,'CSV preview confirm missing');
  await page.locator('#magic36-confirm').click();
  await page.waitForTimeout(150);
  let calState=await page.evaluate(()=>JSON.parse(localStorage.getItem('bite-pomodoro-github-v1.student.demo-A')));
  check(calState.calendarEvents.some(x=>x.title==='WebKit CSV 測試'),'CSV import failed');

  await page.locator('#magic36-file').setInputFiles(icsPath);
  await page.waitForTimeout(150);
  check(await page.locator('#magic36-confirm').count()===1,'ICS preview confirm missing');
  await page.locator('#magic36-confirm').click();
  await page.waitForTimeout(150);
  calState=await page.evaluate(()=>JSON.parse(localStorage.getItem('bite-pomodoro-github-v1.student.demo-A')));
  check(calState.calendarEvents.some(x=>x.title==='WebKit ICS 測試'),'ICS import failed');

  await page.screenshot({path:'qa-mobile-artifacts/iphone13-calendar-imports.png',fullPage:true});

  const b=await context.newPage();
  await b.goto('https://b89324.github.io/-bite-pomodoro-magic40-rc3-preview-/study.html?student=demo-B&stage=elementary',{waitUntil:'networkidle'});
  const bs=await b.evaluate(()=>JSON.parse(localStorage.getItem('bite-pomodoro-github-v1.student.demo-B')));
  check(Object.keys(bs.tasks||{}).length===0,'mobile B inherited A tasks');
  check((bs.sessions||[]).length===0,'mobile B inherited A sessions');
  await b.screenshot({path:'qa-mobile-artifacts/iphone13-demo-B.png',fullPage:true});

  writeFileSync('qa-mobile-artifacts/result.json',JSON.stringify({
    status:'PASS',
    engine:'WebKit',
    device:'iPhone 13',
    checks:16,
    physicalSafariDownloadVerified:false,
    note:'Playwright iPhone 13 device emulation; not a physical iPhone Safari run.',
    runAt:new Date().toISOString()
  },null,2));

  console.log('MAGIC40_LIVE_IPHONE13_WEBKIT_QA PASS 16/16');
  await browser.close();
}
