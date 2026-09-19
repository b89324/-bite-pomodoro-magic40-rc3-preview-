/* magic40 RC2 isolated-preview storage guard.
 * Must execute BEFORE github-app.js in the SAME new Function scope.
 */
const magic40NativeStorage = globalThis.localStorage;
const magic40Root = 'bite-pomodoro-github-v1';
const magic40Portal = 'bitepomodoro.github.portal.';
const magic40Student = (() => { try { return JSON.parse(magic40NativeStorage.getItem(magic40Portal + 'studentId') || '""'); } catch (_) { return ''; } })();
if (!/^demo-[AB]$/.test(magic40Student)) throw new Error('magic40 隔離測試只允許虛構學生 demo-A／demo-B；請從測試入口選擇學生。');
const magic40PersonalKey = magic40Root + '.student.' + magic40Student;
const magic40HadPersonal = magic40NativeStorage.getItem(magic40PersonalKey) !== null;
const magic40EmptyState = JSON.stringify({tasks:{},sessions:[],exams:[],calendarEvents:[],magicMemory:[],customTimerModes:[],reviewCompletions:{},cancelledReviews:{},reviewTimeRecords:{}});
let magic40Baseline = magic40NativeStorage.getItem(magic40PersonalKey);
function magic40RefreshStorageBaseline(){ magic40Baseline = magic40NativeStorage.getItem(magic40PersonalKey); }
function magic40Conflict(message){
  try { window.dispatchEvent(new CustomEvent('magic40-storage-conflict',{detail:{studentId:magic40Student,message}})); } catch (_) {}
  throw new Error(message);
}
function magic40GuardedStudentWrite(value,remove){
  const latest = magic40NativeStorage.getItem(magic40PersonalKey);
  if (latest !== magic40Baseline) return magic40Conflict('magic40：同一學生的紀錄已由其他分頁更新，請先重新整理。');
  if (remove) magic40NativeStorage.removeItem(magic40PersonalKey);
  else magic40NativeStorage.setItem(magic40PersonalKey,String(value));
  magic40RefreshStorageBaseline();
}
const localStorage = Object.freeze({
  getItem(key){
    const k=String(key);
    if(k===magic40Root||k===magic40PersonalKey){
      const v=magic40NativeStorage.getItem(magic40PersonalKey);
      return v===null?magic40EmptyState:v;
    }
    if(k.startsWith(magic40Root+'.student.')) return null;
    return magic40NativeStorage.getItem(k);
  },
  setItem(key,value){
    const k=String(key);
    if(k===magic40Root||k===magic40PersonalKey) return magic40GuardedStudentWrite(value,false);
    if(k.startsWith(magic40Root+'.student.')) return magic40Conflict('magic40：禁止寫入其他學生的學習資料');
    return magic40NativeStorage.setItem(k,String(value));
  },
  removeItem(key){
    const k=String(key);
    if(k===magic40Root||k===magic40PersonalKey) return magic40GuardedStudentWrite(null,true);
    if(k.startsWith(magic40Root+'.student.')) return magic40Conflict('magic40：禁止刪除其他學生資料');
    return magic40NativeStorage.removeItem(k);
  }
});