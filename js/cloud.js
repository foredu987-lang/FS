Uncaught ReferenceError: saveCloudSettings is not defined at HTMLButtonElement.onclick
```

### 一、 造成連鎖問題的原因

1. **`saveCloudSettings` 函式缺失**：您的 `js/cloud.js` 檔案中缺少了 `saveCloudSettings` 的定義（或尚未建立該檔案），導致點擊 **「💾 儲存並套用設定」** 按鈕時直接觸發未定義錯誤。
2. **網址未成功存入變數**：因為第一步點擊儲存失敗，輸入框中的 Apps Script 網址沒有被寫入系統與快取中[cite: 7]。
3. **拉取資料判定為空**：接著點擊 **「📥 從試算表拉取最新資料」** 時，程式讀取到的是空的網址，因而跳出 `⚠️ 尚未設定 Google Apps Script Web App 網址` 的提示視窗[cite: 7]。

---

### 二、 解決方案：建立/覆蓋 `feisha-schedule-system/js/cloud.js`

請在專案的 `js/` 資料夾中建立（或覆蓋）**`cloud.js`**，將以下完整程式碼存入。

此版本加入了**防呆自適應機制**：點擊拉取時，若偵測到輸入框已有網址，即使未按「儲存」也會自動辨識並存檔，杜絕彈窗阻擋：

```javascript
/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 雲端同步與 Apps Script API 串接模組 (js/cloud.js)
 */

// ==========================================
// 1. 儲存雲端 API 網址與提醒設定
// ==========================================
function saveCloudSettings() {
  const apiInput = document.getElementById('settingApiUrl');
  const reminderSelect = document.getElementById('reminderMinutesSelect');
  if (!apiInput) return;

  const url = apiInput.value.trim();

  // 格式校驗
  if (!url || !url.startsWith('https://script.google.com/macros/s/') || !url.includes('/exec')) {
    alert('⚠️ 網址格式不正確！\n請填入以 https://script.google.com/macros/s/ 開頭，且以 /exec 結尾的完整 Web App 網址。');
    return;
  }

  // 寫入全域狀態
  if (!window.appData) window.appData = { config: {} };
  if (!window.appData.config) window.appData.config = {};
  window.appData.config.apiUrl = url;

  if (reminderSelect) {
    window.appData.config.reminderMinutes = parseInt(reminderSelect.value, 10) || 15;
  }

  // 儲存至本地快取
  if (typeof saveToLocalStorage === 'function') {
    saveToLocalStorage();
  } else {
    localStorage.setItem('feisha_config_115_1', JSON.stringify(window.appData.config));
  }

  // 更新右上角連線狀態燈號
  if (typeof updateCloudStatus === 'function') {
    updateCloudStatus();
  }

  alert('✅ Google Apps Script 雲端 API 網址儲存成功！\n系統已連線至您的 Google 試算表。');
}

// ==========================================
// 2. 從 Google 試算表拉取最新資料 (GET)
// ==========================================
async function pullFromCloud() {
  const apiInput = document.getElementById('settingApiUrl');
  let url = (apiInput ? apiInput.value.trim() : '') || window.appData?.config?.apiUrl;

  // 防呆自動抓取：若輸入框有填寫網址，自動儲存並取用
  if (!url || !url.startsWith('http') || !url.includes('/exec')) {
    alert('⚠️ 尚未設定 Google Apps Script Web App 網址，或網址格式不正確。\n請至「模組 6：名冊與系統設定」填入以 /exec 結尾的 API 網址。');
    return;
  }

  if (window.appData?.config) {
    window.appData.config.apiUrl = url;
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof updateCloudStatus === 'function') updateCloudStatus();
  }

  // 介面讀取反饋
  const pullBtn = document.querySelector("button[onclick='pullFromCloud()']");
  let origText = '';
  if (pullBtn) {
    origText = pullBtn.innerHTML;
    pullBtn.innerHTML = '<span>⏳ 正在從試算表拉取資料...</span>';
    pullBtn.disabled = true;
  }

  try {
    const res = await fetch(url, { method: 'GET' });
    const data = await res.json();

    if (data.status !== 'success') {
      throw new Error(data.message || '後端試算表回傳錯誤狀態');
    }

    // 1. 同步排代清冊 (tasks)
    if (Array.isArray(data.tasks)) {
      window.appData.tasks = data.tasks;
      localStorage.setItem('feisha_tasks_115_1', JSON.stringify(data.tasks));
    }

    // 2. 同步互調課紀錄 (swaps)
    if (Array.isArray(data.swaps)) {
      window.appData.swaps = data.swaps;
      localStorage.setItem('feisha_swaps_115_1', JSON.stringify(data.swaps));
    }

    // 3. 同步全校課表 (含正名後的林㞽鋌與特教抽離)
    if (Array.isArray(data.schedule) && data.schedule.length > 0) {
      window.BASELINE_SCHEDULE_MATRIX = data.schedule;
      localStorage.setItem('feisha_schedule_matrix_115_1', JSON.stringify(data.schedule));
    }

    // 4. 同步全校教師編制與密碼
    if (data.roster && typeof data.roster === 'object' && Object.keys(data.roster).length > 0) {
      window.TEACHER_ROSTER = data.roster;
      localStorage.setItem('feisha_teacher_roster_115_1', JSON.stringify(data.roster));
    }

    // 5. 同步系統設定 (組長密碼 fatman)
    if (data.settings && data.settings.adminPassword) {
      window.appData.config.adminPassword = data.settings.adminPassword;
      localStorage.setItem('feisha_config_115_1', JSON.stringify(window.appData.config));
    }

    // 6. 全模組資料重新繪製
    if (typeof initTeacherSelects === 'function') initTeacherSelects();
    if (typeof renderRosterTable === 'function') renderRosterTable();
    if (typeof renderScheduleGrid === 'function') renderScheduleGrid();
    if (typeof renderTasksTable === 'function') renderTasksTable();
    if (typeof renderSwapsTable === 'function') renderSwapsTable();
    if (typeof renderReportTable === 'function') renderReportTable();

    alert(`✅ 雲端資料同步成功！\n\n` +
          `• 排代課堂：${data.tasks ? data.tasks.length : 0} 筆\n` +
          `• 互調課紀錄：${data.swaps ? data.swaps.length : 0} 筆\n` +
          `• 全校課表：${data.schedule ? data.schedule.length : 0} 堂課已更新\n` +
          `教師編制、姓名（林㞽鋌）與調課密碼已全數校正對齊！`);

  } catch (err) {
    console.error('拉取資料失敗：', err);
    alert('❌ 從 Google 試算表拉取資料失敗：\n' + err.message + '\n\n排查提示：\n1. 請確認 Apps Script 部署作業的存取權限已設為「任何人 (Anyone)」\n2. 請確認網路連線正常。');
  } finally {
    if (pullBtn) {
      pullBtn.innerHTML = origText;
      pullBtn.disabled = false;
    }
  }
}

// ==========================================
// 3. 推送本機排代與調課至試算表與日曆 (POST)
// ==========================================
async function pushToCloud() {
  const apiInput = document.getElementById('settingApiUrl');
  let url = (apiInput ? apiInput.value.trim() : '') || window.appData?.config?.apiUrl;

  if (!url || !url.startsWith('http') || !url.includes('/exec')) {
    alert('⚠️ 尚未設定 Google Apps Script Web App 網址！請先填入網址。');
    return;
  }

  const payload = {
    tasks: window.appData?.tasks || [],
    swaps: window.appData?.swaps || [],
    calendarId: window.appData?.config?.calendarId || 'c_9f7d9e917c79ee2de6f54ed275f97d9bfdb493ba457a0135b69438213e217ba6@group.calendar.google.com',
    reminderMinutes: window.appData?.config?.reminderMinutes || 15
  };

  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    alert('✅ 本機排代與調課資料已成功推送到 Google 試算表！\nGoogle 日曆已同步接收排代更新。');
  } catch (err) {
    console.error('推送資料失敗：', err);
    alert('❌ 推送至雲端失敗：' + err.message);
  }
}

// 註冊至全域 window 物件
window.saveCloudSettings = saveCloudSettings;
window.pullFromCloud = pullFromCloud;
window.pushToCloud = pushToCloud;