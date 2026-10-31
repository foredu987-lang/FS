/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 雲端試算表與 Google 日曆連動模組 (js/cloud.js)
 * 職責：與 Google Apps Script Web App 進行 GET/POST 資料交換、雲端雙向同步、日曆連動與狀態維護
 */

// ==========================================
// 1. 模組內部狀態與防手震定時器
// ==========================================
let isSyncing = false;
let syncDebounceTimer = null;

// ==========================================
// 2. 從雲端 Google 試算表拉取資料 (Pull)
// ==========================================

/**
 * 發送 GET 請求向 Google Apps Script 獲取最新 tasks 與 swaps
 * @param {boolean} isSilent - 是否靜默同步 (不彈出成功提示視窗)
 */
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
    if (!response.ok) {
      throw new Error(`HTTP 錯誤碼：${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    isSyncing = false;

    if (data && data.status === 'success') {
      // 1. 嚴格過濾空資料與格式錯位行
      const validTasks = (data.tasks || []).filter(item => {
        if (!item || typeof item !== 'object') return false;
        const hasSub = item.subTeacher && String(item.subTeacher).trim() !== '';
        const hasDate = item.date && String(item.date).trim() !== '';
        const isDateShifted = String(item.date).includes('週');
        const isNameInType = ['蔡明振', '林秋霞', '吳靜瑜', '李貞慧', '施銘權'].includes(item.type);
        return hasSub && hasDate && !isDateShifted && !isNameInType;
      });

      const validSwaps = Array.isArray(data.swaps) ? data.swaps : [];

      // 2. 更新全域狀態
      window.appData.tasks = validTasks;
      window.appData.swaps = validSwaps;

      // 3. 持久化至本地快取
      if (typeof saveToLocalStorage === 'function') {
        saveToLocalStorage();
      }

      // 4. 全面重新渲染相依介面
      if (typeof renderTasksTable === 'function') renderTasksTable();
      if (typeof renderSwapsTable === 'function') renderSwapsTable();
      if (typeof renderScheduleGrid === 'function') renderScheduleGrid();
      if (typeof renderReportTable === 'function') renderReportTable();

      // 5. 更新連線燈號
      if (statusDot && statusText) {
        statusDot.className = "w-2 h-2 rounded-full bg-emerald-400";
        statusText.textContent = "雲端同步已連線";
      }

      if (!isSilent) {
        alert(`✅ 雲端拉取成功！\n共載入 ${validTasks.length} 筆排代紀錄與 ${validSwaps.length} 筆互調課紀錄。`);
      }
    } else {
      throw new Error(data?.message || '後端回傳格式異常');
    }
  })
  .catch(err => {
    isSyncing = false;
    console.warn('⚠️ 雲端拉取失敗，系統已自動維持本機離線快取：', err);

    if (statusDot && statusText) {
      statusDot.className = "w-2 h-2 rounded-full bg-rose-400";
      statusText.textContent = "雲端連線失敗 (使用本機快取)";
    }

    if (!isSilent) {
      alert(`❌ 無法連線至 Google Apps Script：\n${err.message}\n\n排查建議：\n1. 確認 Apps Script 部署設定中的「誰可以存取」已設為「所有人 (Anyone)」。\n2. 確認瀏覽器未封鎖跨來源請求。`);
    }
  });
}

// ==========================================
// 3. 推送本地資料至雲端試算表與日曆 (Push)
// ==========================================

/**
 * 發送 POST 請求將本地完整的 tasks 與 swaps 推送至後端
 * 包含 500ms 防手震機制，避免連續新增時大量呼叫 API
 */
function pushToCloud() {
  const apiUrl = window.appData?.config?.apiUrl?.trim();
  if (!apiUrl || !apiUrl.startsWith('http')) return;

  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }

  syncDebounceTimer = setTimeout(() => {
    executePushRequest(apiUrl);
  }, 500);
}

/**
 * 實際執行 POST 推播
 */
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
    mode: 'no-cors', // 解決 Apps Script 跨域重新導向 (302) 限制
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  })
  .then(() => {
    // no-cors 模式下狀態碼為 opaque (0)，成功送達即代表完成
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

// ==========================================
// 4. 匯出至全域視窗物件
// ==========================================
window.pullFromCloud = pullFromCloud;
window.pushToCloud = pushToCloud;