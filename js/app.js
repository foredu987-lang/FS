/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 核心主控與狀態管理模組 (js/app.js)
 * 升級：開頁優先載入雲端同步至本機的動態課表與教師編制
 */

const STORAGE_KEY_TASKS = 'feisha_tasks_115_1';
const STORAGE_KEY_SWAPS = 'feisha_swaps_115_1';
const STORAGE_KEY_CONFIG = 'feisha_config_115_1';
const STORAGE_KEY_CUSTOM_SCHEDULE = 'feisha_schedule_matrix_115_1';
const STORAGE_KEY_CUSTOM_ROSTER = 'feisha_teacher_roster_115_1';

window.appData = {
  tasks: [],
  swaps: [],
  config: {
    apiUrl: '',
    calendarId: window.FEISHA_CONFIG_CONSTANTS ? window.FEISHA_CONFIG_CONSTANTS.defaultCalendarId : 'c_9f7d9e917c79ee2de6f54ed275f97d9bfdb493ba457a0135b69438213e217ba6@group.calendar.google.com',
    reminderMinutes: 15
  }
};

window.addEventListener('DOMContentLoaded', () => {
  try {
    loadFromLocalStorage();
    initTeacherSelects();
    renderRosterTable();
    updateCloudStatus();

    if (typeof initAcademicWeek === 'function') {
      initAcademicWeek();
    } else if (typeof renderScheduleGrid === 'function') {
      renderScheduleGrid();
    }

    if (typeof renderTasksTable === 'function') renderTasksTable();
    if (typeof renderSwapsTable === 'function') renderSwapsTable();
    if (typeof renderReportTable === 'function') renderReportTable();
  } catch (error) {
    console.error('⚠️ 初始化過程攔截到錯誤：', error);
  }
});

function loadFromLocalStorage() {
  try {
    const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
    const savedTasks = localStorage.getItem(STORAGE_KEY_TASKS);
    const savedSwaps = localStorage.getItem(STORAGE_KEY_SWAPS);
    const savedSchedule = localStorage.getItem(STORAGE_KEY_CUSTOM_SCHEDULE);
    const savedRoster = localStorage.getItem(STORAGE_KEY_CUSTOM_ROSTER);

    // 1. 若本機快取中有從雲端試算表拉取的課表，優先套用
    if (savedSchedule) {
      const parsedSched = JSON.parse(savedSchedule);
      if (Array.isArray(parsedSched) && parsedSched.length > 0) {
        window.BASELINE_SCHEDULE_MATRIX = parsedSched;
      }
    }

    // 2. 若本機快取中有從雲端試算表拉取的教師名冊，優先套用
    if (savedRoster) {
      const parsedRoster = JSON.parse(savedRoster);
      if (parsedRoster && Object.keys(parsedRoster).length > 0) {
        window.TEACHER_ROSTER = parsedRoster;
      }
    }

    if (savedConfig) {
      window.appData.config = Object.assign(window.appData.config, JSON.parse(savedConfig));
      const apiInput = document.getElementById('settingApiUrl');
      if (apiInput) apiInput.value = window.appData.config.apiUrl || '';
      const reminderSelect = document.getElementById('reminderMinutesSelect');
      if (reminderSelect) reminderSelect.value = String(window.appData.config.reminderMinutes || 15);
    }

    if (savedTasks) {
      const rawTasks = JSON.parse(savedTasks);
      window.appData.tasks = Array.isArray(rawTasks) ? rawTasks.filter(item => item?.subTeacher && item?.date) : [];
    }

    if (savedSwaps) {
      const rawSwaps = JSON.parse(savedSwaps);
      window.appData.swaps = Array.isArray(rawSwaps) ? rawSwaps : [];
    }
  } catch (e) {
    console.warn('快取讀取異常：', e);
  }
}

function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(window.appData.config));
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(window.appData.tasks));
    localStorage.setItem(STORAGE_KEY_SWAPS, JSON.stringify(window.appData.swaps));
  } catch (e) {}
}

function confirmResetLocalStorage() {
  if (window.confirm('⚠️ 確定要徹底清空本機暫存嗎？此動作將清除自訂課表快取並回復系統預設底冊。')) {
    localStorage.removeItem(STORAGE_KEY_TASKS);
    localStorage.removeItem(STORAGE_KEY_SWAPS);
    localStorage.removeItem(STORAGE_KEY_CUSTOM_SCHEDULE);
    localStorage.removeItem(STORAGE_KEY_CUSTOM_ROSTER);
    window.appData.tasks = [];
    window.appData.swaps = [];
    
    // 重新載入頁面回復初始值
    window.location.reload();
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(pane => pane.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.className = "tab-btn px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition whitespace-nowrap";
  });

  const targetPane = document.getElementById(tabId);
  if (targetPane) targetPane.classList.remove('hidden');

  const targetTabBtn = document.getElementById(`tab-${tabId}`);
  if (targetTabBtn) targetTabBtn.className = "tab-btn px-3 py-2 rounded-lg text-white bg-indigo-600 transition whitespace-nowrap";

  if (tabId === 'module1' && typeof renderScheduleGrid === 'function') renderScheduleGrid();
  if (tabId === 'module2' && typeof renderTasksTable === 'function') renderTasksTable();
  if (tabId === 'module3' && typeof renderSwapsTable === 'function') renderSwapsTable();
  if (tabId === 'module4' && typeof renderAssignmentMatrix === 'function') renderAssignmentMatrix();
  if (tabId === 'module5' && typeof renderReportTable === 'function') renderReportTable();
}

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

function saveCloudSettings() {
  const apiUrlInput = document.getElementById('settingApiUrl');
  if (apiUrlInput) window.appData.config.apiUrl = apiUrlInput.value.trim();
  saveToLocalStorage();
  updateCloudStatus();
  alert('💾 系統設定已成功保存！');
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

function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text);
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

window.loadFromLocalStorage = loadFromLocalStorage;
window.saveToLocalStorage = saveToLocalStorage;
window.confirmResetLocalStorage = confirmResetLocalStorage;
window.switchTab = switchTab;
window.initTeacherSelects = initTeacherSelects;
window.renderRosterTable = renderRosterTable;
window.saveCloudSettings = saveCloudSettings;
window.updateCloudStatus = updateCloudStatus;
window.copyToClipboard = copyToClipboard;