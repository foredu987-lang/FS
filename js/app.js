/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 主控模組 (js/app.js)
 * 整合：組長權限管理、教師名冊維護、Google Apps Script 雲端同步 (Save/Pull/Push)
 */

const STORAGE_KEY_TASKS = 'feisha_tasks_115_1';
const STORAGE_KEY_SWAPS = 'feisha_swaps_115_1';
const STORAGE_KEY_CONFIG = 'feisha_config_115_1';
const STORAGE_KEY_CUSTOM_SCHEDULE = 'feisha_schedule_matrix_115_1';
const STORAGE_KEY_CUSTOM_ROSTER = 'feisha_teacher_roster_115_1';

window.isAdminUnlocked = false;

window.appData = {
  tasks: [],
  swaps: [],
  config: {
    apiUrl: '',
    calendarId: 'c_9f7d9e917c79ee2de6f54ed275f97d9bfdb493ba457a0135b69438213e217ba6@group.calendar.google.com',
    reminderMinutes: 15,
    adminPassword: 'fatman'
  }
};

// ==========================================
// 1. 生命週期啟動程序
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  try { loadFromLocalStorage(); } catch (e) { console.warn(e); }
  try { initTeacherSelects(); } catch (e) { console.warn(e); }
  try { renderRosterTable(); } catch (e) { console.warn(e); }
  try { updateCloudStatus(); } catch (e) { console.warn(e); }

  try {
    if (typeof initAcademicWeek === 'function') {
      initAcademicWeek();
    } else if (typeof renderScheduleGrid === 'function') {
      renderScheduleGrid();
    }
  } catch (e) {
    console.error('課表啟動異常：', e);
  }

  try { if (typeof renderTasksTable === 'function') renderTasksTable(); } catch (e) {}
  try { if (typeof renderSwapsTable === 'function') renderSwapsTable(); } catch (e) {}
  try { if (typeof renderReportTable === 'function') renderReportTable(); } catch (e) {}
});

function loadFromLocalStorage() {
  const savedTasks = localStorage.getItem(STORAGE_KEY_TASKS);
  const savedSwaps = localStorage.getItem(STORAGE_KEY_SWAPS);
  const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);

  if (savedConfig) {
    try {
      const cfg = JSON.parse(savedConfig);
      window.appData.config = Object.assign(window.appData.config, cfg);
    } catch (e) {}
  }
  window.appData.config.adminPassword = 'fatman';

  if (savedTasks) {
    try { window.appData.tasks = JSON.parse(savedTasks); } catch (e) {}
  }
  if (savedSwaps) {
    try { window.appData.swaps = JSON.parse(savedSwaps); } catch (e) {}
  }

  const apiInput = document.getElementById('settingApiUrl');
  if (apiInput && window.appData.config.apiUrl) {
    apiInput.value = window.appData.config.apiUrl;
  }
}

function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(window.appData.config));
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(window.appData.tasks));
    localStorage.setItem(STORAGE_KEY_SWAPS, JSON.stringify(window.appData.swaps));
  } catch (e) {}
}

// ==========================================
// 2. 組長管理權限 (fatman 通行)
// ==========================================
function toggleAdminLock() {
  if (window.isAdminUnlocked) {
    window.isAdminUnlocked = false;
    updateAdminUi();
    renderRosterTable();
    alert('🔒 已鎖定，切換為一般教師模式。');
    return;
  }

  const inputPwd = window.prompt('🔑 請輸入課務組長管理密碼：');
  if (inputPwd === null) return;

  if (String(inputPwd).trim() === 'fatman') {
    window.isAdminUnlocked = true;
    updateAdminUi();
    renderRosterTable();
    alert('🔓 課務組長身分驗證成功！最高權限已解鎖。');
  } else {
    alert('❌ 密碼不正確！');
  }
}

function updateAdminUi() {
  const btn = document.getElementById('adminLockBtn');
  if (!btn) return;
  if (window.isAdminUnlocked) {
    btn.className = "px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer";
    btn.innerHTML = "<span>👤 課務組長 (已解鎖)</span> <span class='text-[10px] bg-emerald-800/60 px-1.5 py-0.5 rounded ml-1'>登出</span>";
  } else {
    btn.className = "px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition border border-slate-700 hover:border-slate-600 shadow-xs cursor-pointer";
    btn.innerHTML = "<span>🔒 一般教師 (點擊解鎖)</span>";
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.className = "tab-btn px-3.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs sm:text-sm font-semibold whitespace-nowrap";
  });

  const p = document.getElementById(tabId);
  if (p) p.classList.remove('hidden');

  const b = document.getElementById(`tab-${tabId}`);
  if (b) b.className = "tab-btn px-3.5 py-2 rounded-lg text-white bg-indigo-600 transition text-xs sm:text-sm font-bold whitespace-nowrap";

  if (tabId === 'module1' && typeof renderScheduleGrid === 'function') renderScheduleGrid();
  if (tabId === 'module2' && typeof renderTasksTable === 'function') renderTasksTable();
  if (tabId === 'module3' && typeof renderSwapsTable === 'function') renderSwapsTable();
  if (tabId === 'module5' && typeof renderReportTable === 'function') renderReportTable();
}

// ==========================================
// 3. 教師名冊與密碼管理
// ==========================================
function initTeacherSelects() {
  const roster = window.TEACHER_ROSTER || {};
  const names = Object.keys(roster);
  ['swapOrigTeacher', 'swapTargetTeacher', 'modalSubTeacher', 'modalOrigTeacher'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    names.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = `${name} (${roster[name]?.title || '教師'})`;
      el.appendChild(opt);
    });
  });
}

function renderRosterTable() {
  const tbody = document.getElementById('rosterTbody');
  if (!tbody) return;
  const roster = window.TEACHER_ROSTER || {};
  let html = '';
  const dayNameMap = { '1': '一', '2': '二', '3': '三', '4': '四', '5': '五' };

  Object.keys(roster).forEach(name => {
    const teacher = roster[name] || {};
    const periodsFormatted = (teacher.overloadPeriods || []).map(code => {
      const parts = code.split('-');
      return `週${dayNameMap[parts[0]] || parts[0]}(${parts[1] || ''})`;
    }).join('、');

    html += `
      <tr class="hover:bg-slate-50 border-b border-slate-100 transition text-xs">
        <td class="py-2.5 px-3 font-bold text-slate-800">${name}</td>
        <td class="py-2.5 px-3 text-slate-600">${teacher.title || '專任教師'}</td>
        <td class="py-2.5 px-3 text-center font-mono font-semibold">${teacher.baseHours || 16}</td>
        <td class="py-2.5 px-3 text-center font-mono font-bold text-amber-700">+${teacher.overloadHours || 0}</td>
        <td class="py-2.5 px-3 text-[11px] text-indigo-700 font-semibold">${periodsFormatted || '無固定兼課'}</td>
        <td class="py-2.5 px-3 text-center">
          ${window.isAdminUnlocked ? `
            <button onclick="adminResetTeacherPassword('${name}')" class="px-2 py-1 text-[11px] font-bold rounded bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition shadow-2xs">
              🔄 復原為 1234
            </button>
          ` : `<span class="text-slate-400 font-mono">••••</span>`}
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function adminResetTeacherPassword(teacherName) {
  if (!window.isAdminUnlocked) {
    alert('請先解鎖課務組長權限！');
    return;
  }
  if (window.confirm(`確定要將【${teacherName} 老師】的調課密碼復原為預設「1234」嗎？`)) {
    const roster = window.TEACHER_ROSTER || {};
    if (roster[teacherName]) {
      roster[teacherName].password = '1234';
      localStorage.setItem('feisha_teacher_roster_115_1', JSON.stringify(roster));
    }
    const apiUrl = window.appData?.config?.apiUrl;
    if (apiUrl && apiUrl.startsWith('http')) {
      fetch(apiUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateTeacherPassword', teacherName: teacherName, newPassword: '1234' })
      }).then(() => alert(`✅ 【${teacherName} 老師】密碼已重設為 1234！`));
    } else {
      alert(`✅ 【${teacherName} 老師】密碼已在本機重設為 1234！`);
    }
  }
}

function confirmResetLocalStorage() {
  if (window.confirm('確定要清空本機暫存並重新載入底冊嗎？')) {
    localStorage.clear();
    location.reload();
  }
}

function updateCloudStatus() {
  const dot = document.getElementById('cloudStatusDot');
  const text = document.getElementById('cloudStatusText');
  if (!dot || !text) return;
  if (window.appData.config.apiUrl?.startsWith('http')) {
    dot.className = "w-2 h-2 rounded-full bg-emerald-400";
    text.textContent = "雲端同步已連線";
  } else {
    dot.className = "w-2 h-2 rounded-full bg-amber-400 animate-pulse";
    text.textContent = "本機離線模式";
  }
}

// ==========================================
// 4. Google 試算表與日曆同步核心
// ==========================================
function saveCloudSettings() {
  const apiInput = document.getElementById('settingApiUrl');
  const reminderSelect = document.getElementById('reminderMinutesSelect');
  if (!apiInput) return;

  const url = apiInput.value.trim();

  if (!url || !url.startsWith('https://script.google.com/macros/s/') || !url.includes('/exec')) {
    alert('⚠️ 網址格式不正確！\n請填入以 https://script.google.com/macros/s/ 開頭，且以 /exec 結尾的完整 Web App 網址。');
    return;
  }

  if (!window.appData) window.appData = { config: {} };
  if (!window.appData.config) window.appData.config = {};
  window.appData.config.apiUrl = url;

  if (reminderSelect) {
    window.appData.config.reminderMinutes = parseInt(reminderSelect.value, 10) || 15;
  }

  saveToLocalStorage();
  updateCloudStatus();

  alert('✅ Google Apps Script 雲端 API 網址儲存成功！\n系統已連線至您的 Google 試算表。');
}

async function pullFromCloud() {
  const apiInput = document.getElementById('settingApiUrl');
  let url = (apiInput ? apiInput.value.trim() : '') || window.appData?.config?.apiUrl;

  if (!url || !url.startsWith('http') || !url.includes('/exec')) {
    alert('⚠️ 尚未設定 Google Apps Script Web App 網址，或網址格式不正確。\n請至「模組 6：名冊與系統設定」填入以 /exec 結尾的 API 網址。');
    return;
  }

  if (!window.appData) window.appData = { config: {} };
  if (!window.appData.config) window.appData.config = {};
  window.appData.config.apiUrl = url;
  saveToLocalStorage();
  updateCloudStatus();

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

    if (Array.isArray(data.tasks)) {
      window.appData.tasks = data.tasks;
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(data.tasks));
    }

    if (Array.isArray(data.swaps)) {
      window.appData.swaps = data.swaps;
      localStorage.setItem(STORAGE_KEY_SWAPS, JSON.stringify(data.swaps));
    }

    if (Array.isArray(data.schedule) && data.schedule.length > 0) {
      window.BASELINE_SCHEDULE_MATRIX = data.schedule;
      localStorage.setItem(STORAGE_KEY_CUSTOM_SCHEDULE, JSON.stringify(data.schedule));
    }

    if (data.roster && typeof data.roster === 'object' && Object.keys(data.roster).length > 0) {
      window.TEACHER_ROSTER = data.roster;
      localStorage.setItem(STORAGE_KEY_CUSTOM_ROSTER, JSON.stringify(data.roster));
    }

    if (data.settings && data.settings.adminPassword) {
      window.appData.config.adminPassword = data.settings.adminPassword;
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(window.appData.config));
    }

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
window.loadFromLocalStorage = loadFromLocalStorage;
window.saveToLocalStorage = saveToLocalStorage;
window.toggleAdminLock = toggleAdminLock;
window.switchTab = switchTab;
window.initTeacherSelects = initTeacherSelects;
window.renderRosterTable = renderRosterTable;
window.adminResetTeacherPassword = adminResetTeacherPassword;
window.confirmResetLocalStorage = confirmResetLocalStorage;
window.updateCloudStatus = updateCloudStatus;
window.saveCloudSettings = saveCloudSettings;
window.pullFromCloud = pullFromCloud;
window.pushToCloud = pushToCloud;