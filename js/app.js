/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 核心主控與狀態管理模組 (js/app.js)
 * 職責：全域資料狀態、LocalStorage 快取守衛與壞檔過濾、分頁導航、教師名冊渲染
 */

// ==========================================
// 1. 本地儲存鍵名定義
// ==========================================
const STORAGE_KEY_TASKS = 'feisha_tasks_115_1';
const STORAGE_KEY_SWAPS = 'feisha_swaps_115_1';
const STORAGE_KEY_CONFIG = 'feisha_config_115_1';

// ==========================================
// 2. 全域中央狀態物件 (初始化為純淨空白，無假資料)
// ==========================================
window.appData = {
  tasks: [],
  swaps: [],
  config: {
    apiUrl: '',
    calendarId: window.FEISHA_CONFIG_CONSTANTS ? window.FEISHA_CONFIG_CONSTANTS.defaultCalendarId : 'c_9f7d9e917c79ee2de6f54ed275f97d9bfdb493ba457a0135b69438213e217ba6@group.calendar.google.com',
    reminderMinutes: 15
  }
};

// ==========================================
// 3. 系統生命週期啟動引擎
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  // 1. 載入並校驗本地快取
  loadFromLocalStorage();

  // 2. 初始化全校下拉選單 (調課、手動排代)
  initTeacherSelects();

  // 3. 渲染模組 6 教師編制表
  renderRosterTable();

  // 4. 更新雲端 API 連線狀態指示燈
  updateCloudStatus();

  // 5. 初始化模組 1 學期週次與課表 (由 schedule.js 提供)
  if (typeof initAcademicWeek === 'function') {
    initAcademicWeek();
  }

  // 6. 渲染模組 2 排代清冊 (由 tasks.js 提供)
  if (typeof renderTasksTable === 'function') {
    renderTasksTable();
  }

  // 7. 渲染模組 3 自辦互調課 (由 swaps.js 提供)
  if (typeof renderSwapsTable === 'function') {
    renderSwapsTable();
  }

  // 8. 渲染模組 5 月結核銷公文 (由 reports.js 提供)
  if (typeof renderReportTable === 'function') {
    renderReportTable();
  }
});

// ==========================================
// 4. LocalStorage 快取守衛與壞檔清洗機制
// ==========================================
function loadFromLocalStorage() {
  try {
    const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
    const savedTasks = localStorage.getItem(STORAGE_KEY_TASKS);
    const savedSwaps = localStorage.getItem(STORAGE_KEY_SWAPS);

    // 載入設定
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig);
      window.appData.config = Object.assign(window.appData.config, parsedConfig);

      const apiInput = document.getElementById('settingApiUrl');
      if (apiInput) {
        apiInput.value = window.appData.config.apiUrl || '';
      }

      const calInput = document.getElementById('settingCalendarId');
      if (calInput && window.appData.config.calendarId) {
        calInput.value = window.appData.config.calendarId;
      }

      const reminderSelect = document.getElementById('reminderMinutesSelect');
      if (reminderSelect) {
        reminderSelect.value = String(window.appData.config.reminderMinutes || 15);
      }
    }

    // 載入排代任務並執行防錯過濾
    if (savedTasks) {
      const rawTasks = JSON.parse(savedTasks);
      if (Array.isArray(rawTasks)) {
        // 壞檔過濾守衛：
        // 1. 排除代課人為空或代課日期為空的列
        // 2. 排除早期錯位格式（如：日期欄含有「週」、種類欄填入人名）
        window.appData.tasks = rawTasks.filter(item => {
          if (!item || typeof item !== 'object') return false;
          const hasSub = item.subTeacher && String(item.subTeacher).trim() !== '';
          const hasDate = item.date && String(item.date).trim() !== '';
          const isDateShifted = String(item.date).includes('週');
          const isNameInType = ['蔡明振', '林秋霞', '吳靜瑜', '李貞慧', '施銘權'].includes(item.type);
          return hasSub && hasDate && !isDateShifted && !isNameInType;
        });
      } else {
        window.appData.tasks = [];
      }
    }

    // 載入自辦互調課紀錄
    if (savedSwaps) {
      const rawSwaps = JSON.parse(savedSwaps);
      window.appData.swaps = Array.isArray(rawSwaps) ? rawSwaps : [];
    }
  } catch (error) {
    console.error('⚠️ 本機快取讀取異常，系統自動重置為空白狀態：', error);
    window.appData.tasks = [];
    window.appData.swaps = [];
  }
}

function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(window.appData.config));
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(window.appData.tasks));
    localStorage.setItem(STORAGE_KEY_SWAPS, JSON.stringify(window.appData.swaps));
  } catch (error) {
    console.error('⚠️ 寫入 LocalStorage 失敗：', error);
  }
}

function confirmResetLocalStorage() {
  const result = window.confirm('⚠️ 警告：確定要徹底清空本機排代與調課暫存嗎？\n此動作將清空所有暫存並回復為乾淨初始狀態。');
  if (result) {
    localStorage.removeItem(STORAGE_KEY_TASKS);
    localStorage.removeItem(STORAGE_KEY_SWAPS);
    window.appData.tasks = [];
    window.appData.swaps = [];

    if (typeof renderTasksTable === 'function') renderTasksTable();
    if (typeof renderSwapsTable === 'function') renderSwapsTable();
    if (typeof renderScheduleGrid === 'function') renderScheduleGrid();
    if (typeof renderReportTable === 'function') renderReportTable();

    alert('✅ 本機快取已徹底清空！');
  }
}

// ==========================================
// 5. 模組分頁路由切換
// ==========================================
function switchTab(tabId) {
  // 隱藏所有分頁內容
  document.querySelectorAll('.tab-content').forEach(pane => {
    pane.classList.add('hidden');
  });

  // 重置所有導覽標籤樣式
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.className = "tab-btn px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition whitespace-nowrap";
  });

  // 顯示選定之分頁內容
  const targetPane = document.getElementById(tabId);
  if (targetPane) {
    targetPane.classList.remove('hidden');
  }

  // 標籤套用高亮狀態
  const targetTabBtn = document.getElementById(`tab-${tabId}`);
  if (targetTabBtn) {
    targetTabBtn.className = "tab-btn px-3 py-2 rounded-lg text-white bg-indigo-600 transition whitespace-nowrap";
  }

  // 切換至對應分頁時自動觸發專屬渲染
  if (tabId === 'module1' && typeof renderScheduleGrid === 'function') {
    renderScheduleGrid();
  } else if (tabId === 'module2' && typeof renderTasksTable === 'function') {
    renderTasksTable();
  } else if (tabId === 'module3' && typeof renderSwapsTable === 'function') {
    renderSwapsTable();
  } else if (tabId === 'module5' && typeof renderReportTable === 'function') {
    renderReportTable();
  }
}

// ==========================================
// 6. 全校教師選單與名冊渲染
// ==========================================
function initTeacherSelects() {
  const roster = window.TEACHER_ROSTER || {};
  const names = Object.keys(roster);
  const selectElementIds = [
    'swapOrigTeacher',
    'swapTargetTeacher',
    'modalSubTeacher',
    'modalOrigTeacher'
  ];

  selectElementIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    names.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = `${name} (${roster[name].title})`;
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
    const teacher = roster[name];
    const periodsFormatted = (teacher.overloadPeriods || []).map(code => {
      const [day, period] = code.split('-');
      return `週${dayNameMap[day] || day}(${period})`;
    }).join('、');

    html += `
      <tr class="hover:bg-slate-50 border-b border-slate-100 transition">
        <td class="py-2.5 px-3 font-bold text-slate-800">${name}</td>
        <td class="py-2.5 px-3 text-slate-600">${teacher.title}</td>
        <td class="py-2.5 px-3 text-center font-mono font-semibold">${teacher.baseHours}</td>
        <td class="py-2.5 px-3 text-center font-mono font-bold text-amber-700">+${teacher.overloadHours}</td>
        <td class="py-2.5 px-3 text-[11px] text-indigo-700 font-semibold">${periodsFormatted || '無固定兼課'}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// ==========================================
// 7. 系統設定與雲端狀態管理
// ==========================================
function saveCloudSettings() {
  const apiUrlInput = document.getElementById('settingApiUrl');
  const calIdInput = document.getElementById('settingCalendarId');

  if (apiUrlInput) {
    window.appData.config.apiUrl = apiUrlInput.value.trim();
  }
  if (calIdInput) {
    window.appData.config.calendarId = calIdInput.value.trim();
  }

  saveToLocalStorage();
  updateCloudStatus();

  alert('💾 系統設定已成功保存！');

  if (window.appData.config.apiUrl && typeof pullFromCloud === 'function') {
    pullFromCloud();
  }
}

function updateCloudStatus() {
  const dot = document.getElementById('cloudStatusDot');
  const text = document.getElementById('cloudStatusText');
  if (!dot || !text) return;

  if (window.appData.config.apiUrl && window.appData.config.apiUrl.startsWith('http')) {
    dot.className = "w-2 h-2 rounded-full bg-emerald-400";
    text.textContent = "雲端同步已連線";
  } else {
    dot.className = "w-2 h-2 rounded-full bg-amber-400 animate-pulse";
    text.textContent = "本機離線模式";
  }
}

// ==========================================
// 8. 通用剪貼簿工具 (相容非 HTTPS 與舊型瀏覽器)
// ==========================================
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(err => {
      console.warn('Clipboard API 失敗，退回傳統方式：', err);
      fallbackCopyToClipboard(text);
    });
  } else {
    fallbackCopyToClipboard(text);
  }
}

function fallbackCopyToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.top = '-9999px';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('文字複製失敗：', err);
  }
  document.body.removeChild(textArea);
}

// 匯出至全域
window.loadFromLocalStorage = loadFromLocalStorage;
window.saveToLocalStorage = saveToLocalStorage;
window.confirmResetLocalStorage = confirmResetLocalStorage;
window.switchTab = switchTab;
window.initTeacherSelects = initTeacherSelects;
window.renderRosterTable = renderRosterTable;
window.saveCloudSettings = saveCloudSettings;
window.updateCloudStatus = updateCloudStatus;
window.copyToClipboard = copyToClipboard;