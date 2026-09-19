import { chromium } from 'playwright';

const base='https://b89324.github.io/-bite-pomodoro-magic40-rc3-preview-/';
const check=(cond,msg)=>{if(!cond)throw new Error(msg)};

const browser=await chromium.launch({headless:true});
const context=await browser.newContext();

async function openAndCheck(url,label){
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'networkidle',timeout:60000});
  const appText=await page.locator('#app').count()?await page.locator('#app').innerText():(await page.locator('body').innerText());
  check(!appText.includes('頁面載入失敗'),label+' shows load failure');
  check(errors.length===0,label+' pageerror: '+errors.join(' | '));
  return page;
}

const home=await openAndCheck(base,'home');
const homeText=await home.locator('body').innerText();
check(homeText.includes('demo-A')&&homeText.includes('demo-B'),'home missing demo links');

const a=await openAndCheck(base+'study.html?student=demo-A&stage=elementary','demo-A');
check((await a.locator('#app').innerText()).includes('咬一口蕃茄鐘'),'demo-A app title missing');
const sidA=await a.evaluate(()=>JSON.parse(localStorage.getItem('bitepomodoro.github.portal.studentId')||'null'));
check(sidA==='demo-A','demo-A portal id incorrect');

const b=await openAndCheck(base+'study.html?student=demo-B&stage=elementary','demo-B');
const sidB=await b.evaluate(()=>JSON.parse(localStorage.getItem('bitepomodoro.github.portal.studentId')||'null'));
check(sidB==='demo-B','demo-B portal id incorrect');

console.log('MAGIC40_LIVE_PAGES_QA PASS 6/6');
await browser.close();
