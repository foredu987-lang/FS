/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 雲端試算表與 Google 日曆連動模組 (js/cloud.js)
 * 升級：支援從 Google 試算表拉取動態全校課表與教師編制名冊
 */

const STORAGE_KEY_CUSTOM_SCHEDULE = 'feisha_schedule_matrix_115_1';
const STORAGE_KEY_CUSTOM_ROSTER = 'feisha_teacher_roster_115_1';

let isSyncing = false;
let syncDebounceTimer = null;

function pullFromCloud(isSilent = false) {
  const apiUrl = window.appData?.config?.apiUrl?.trim();

  if (!apiUrl || !apiUrl.startsWith('http')) {
    if (!isSilent) {
      alert('⚠️ 尚未設定 Google Apps Script Web App 網址，或網址格式不正確。\n請至「模組 6：名冊與系統設定」填入以 /exec 結尾的 API 網址。');
    }
    return;
  }

  const statusDot = document.getElementById('cloudStatusDot');
  const statusText = document.getElementById('cloudStatusText');

  if (statusDot && statusText) {
    statusDot.className = "w-2 h-2 rounded-full bg-yellow-400 animate-spin";
    statusText.textContent = "雲端同步中...";
  }

  isSyncing = true;

  fetch(`${apiUrl}?action=getData&t=${Date.now()}`, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-cache'
  })
  .then(response => {
    if (!response.ok) throw new Error(`HTTP 錯誤碼：${response.status}`);
    return response.json();
  })
  .then(data => {
    isSyncing = false;

    if (data && data.status === 'success') {
      // 1. 同步排代清冊 (tasks)
      const rawTasks = Array.isArray(data.tasks) ? data.tasks : [];
      window.appData.tasks = rawTasks.filter(t => t && t.subTeacher && t.date);

      // 2. 同步調課紀錄 (swaps)
      window.appData.swaps = Array.isArray(data.swaps) ? data.swaps : [];

      // 3. 同步全校課表 (schedule)
      if (Array.isArray(data.schedule) && data.schedule.length > 0) {
        window.BASELINE_SCHEDULE_MATRIX = data.schedule;
        localStorage.setItem(STORAGE_KEY_CUSTOM_SCHEDULE, JSON.stringify(data.schedule));
      }

      // 4. 同步教師編制名冊 (roster)
      if (data.roster && Object.keys(data.roster).length > 0) {
        window.TEACHER_ROSTER = data.roster;
        localStorage.setItem(STORAGE_KEY_CUSTOM_ROSTER, JSON.stringify(data.roster));
      }

      // 儲存基本資料
      if (typeof saveToLocalStorage === 'function') saveToLocalStorage();

      // 全面刷新所有介面
      if (typeof renderRosterTable === 'function') renderRosterTable();
      if (typeof initTeacherSelects === 'function') initTeacherSelects();
      if (typeof initScheduleTargetSelect === 'function') initScheduleTargetSelect();
      if (typeof renderScheduleGrid === 'function') renderScheduleGrid();
      if (typeof renderTasksTable === 'function') renderTasksTable();
      if (typeof renderSwapsTable === 'function') renderSwapsTable();
      if (typeof renderReportTable === 'function') renderReportTable();
      if (typeof renderAssignmentMatrix === 'function') renderAssignmentMatrix();

      if (statusDot && statusText) {
        statusDot.className = "w-2 h-2 rounded-full bg-emerald-400";
        statusText.textContent = "雲端同步已連線";
      }

      if (!isSilent) {
        var schedCount = Array.isArray(data.schedule) ? data.schedule.length : 0;
        var rosterCount = data.roster ? Object.keys(data.roster).length : 0;
        alert(`✅ 雲端資料同步完成！\n• 排代紀錄：${window.appData.tasks.length} 筆\n• 全校課表：${schedCount} 堂\n• 教師編制：${rosterCount} 位`);
      }
    } else {
      throw new Error(data?.message || '後端回傳格式異常');
    }
  })
  .catch(err => {
    isSyncing = false;
    console.warn('⚠️ 雲端拉取失敗：', err);

    if (statusDot && statusText) {
      statusDot.className = "w-2 h-2 rounded-full bg-rose-400";
      statusText.textContent = "雲端連線失敗 (使用本機快取)";
    }

    if (!isSilent) {
      alert(`❌ 無法連線至 Google Apps Script：\n${err.message}`);
    }
  });
}

function pushToCloud() {
  const apiUrl = window.appData?.config?.apiUrl?.trim();
  if (!apiUrl || !apiUrl.startsWith('http')) return;

  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);

  syncDebounceTimer = setTimeout(() => {
    executePushRequest(apiUrl);
  }, 500);
}

function executePushRequest(apiUrl) {
  const statusDot = document.getElementById('cloudStatusDot');
  const statusText = document.getElementById('cloudStatusText');

  if (statusDot && statusText) {
    statusDot.className = "w-2 h-2 rounded-full bg-yellow-400 animate-pulse";
    statusText.textContent = "上傳雲端中...";
  }

  const payload = {
    action: 'syncAll',
    tasks: window.appData.tasks || [],
    swaps: window.appData.swaps || [],
    calendarId: window.appData?.config?.calendarId || '',
    reminderMinutes: window.appData?.config?.reminderMinutes || 15
  };

  fetch(apiUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  })
  .then(() => {
    if (statusDot && statusText) {
      statusDot.className = "w-2 h-2 rounded-full bg-emerald-400";
      statusText.textContent = "雲端同步已連線";
    }
    console.log('✅ 資料與行事曆已成功推送至 Google 雲端！');
  })
  .catch(err => {
    console.error('⚠️ 推送至雲端失敗：', err);
    if (statusDot && statusText) {
      statusDot.className = "w-2 h-2 rounded-full bg-rose-400";
      statusText.textContent = "雲端推送異常 (已留存本地)";
    }
  });
}

window.pullFromCloud = pullFromCloud;
window.pushToCloud = pushToCloud;