/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 主控模組 (js/app.js)
 * 升級功能：
 * 1. 組長管理鎖 (預設 fatman，無前端提示，可由試算表自訂)
 * 2. 模組 6 教師名冊顯示「一鍵重設密碼為 1234」
 */

const STORAGE_KEY_TASKS = 'feisha_tasks_115_1';
const STORAGE_KEY_SWAPS = 'feisha_swaps_115_1';
const STORAGE_KEY_CONFIG = 'feisha_config_115_1';
const STORAGE_KEY_CUSTOM_SCHEDULE = 'feisha_schedule_matrix_115_1';
const STORAGE_KEY_CUSTOM_ROSTER = 'feisha_teacher_roster_115_1';

window.isAdminUnlocked = false; // 組長解鎖狀態

window.appData = {
  tasks: [],
  swaps: [],
  config: {
    apiUrl: '',
    calendarId: window.FEISHA_CONFIG_CONSTANTS ? window.FEISHA_CONFIG_CONSTANTS.defaultCalendarId : 'c_9f7d9e917c79ee2de6f54ed275f97d9bfdb493ba457a0135b69438213e217ba6@group.calendar.google.com',
    reminderMinutes: 15,
    adminPassword: 'fatman'
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

    if (savedSchedule) {
      const parsedSched = JSON.parse(savedSchedule);
      if (Array.isArray(parsedSched) && parsedSched.length > 0) {
        window.BASELINE_SCHEDULE_MATRIX = parsedSched;
      }
    }

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

/**
 * 組長管理鎖切換 (密碼為 fatman)
 */
function toggleAdminLock() {
  if (window.isAdminUnlocked) {
    window.isAdminUnlocked = false;
    updateAdminUi();
    alert('🔒 已切換為一般同仁檢視模式。');
    return;
  }

  const inputPwd = window.prompt('🔑 請輸入課務組長管理密碼：');
  if (inputPwd === null) return;

  const realAdminPwd = window.appData?.config?.adminPassword || 'fatman';

  if (inputPwd.trim() === realAdminPwd) {
    window.isAdminUnlocked = true;
    updateAdminUi();
    renderRosterTable();
    alert('🔓 課務組長身分驗證成功！最高權限已解鎖。');
  } else {
    alert('❌ 密碼不正確！');
  }
}

function updateAdminUi() {
  const lockBtn = document.getElementById('adminLockBtn');
  if (!lockBtn) return;
  if (window.isAdminUnlocked) {
    lockBtn.className = "px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm";
    lockBtn.innerHTML = "<span>👤 課務組長 (已解鎖)</span> <span class='text-[10px] underline ml-1'>登出</span>";
  } else {
    lockBtn.className = "px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition";
    lockBtn.innerHTML = "<span>🔒 一般教師 (點擊解鎖)</span>";
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
      <tr class="hover:bg-slate-50 border-b border-slate-100 transition text-xs">
        <td class="py-2.5 px-3 font-bold text-slate-800">${name}</td>
        <td class="py-2.5 px-3 text-slate-600">${teacher.title}</td>
        <td class="py-2.5 px-3 text-center font-mono font-semibold">${teacher.baseHours}</td>
        <td class="py-2.5 px-3 text-center font-mono font-bold text-amber-700">+${teacher.overloadHours}</td>
        <td class="py-2.5 px-3 text-[11px] text-indigo-700 font-semibold">${periodsFormatted || '無固定兼課'}</td>
        <td class="py-2.5 px-3 text-center">
          ${window.isAdminUnlocked ? `
            <button onclick="adminResetTeacherPassword('${name}')" class="px-2 py-1 text-[11px] font-bold rounded bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition shadow-2xs">
              🔄 復原為 1234
            </button>
          ` : `
            <span class="text-slate-400 font-mono">••••</span>
          `}
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

/**
 * 組長一鍵將同仁密碼復原為預設 1234
 */
function adminResetTeacherPassword(teacherName) {
  if (!window.isAdminUnlocked) {
    alert('請先解鎖課務組長權限！');
    return;
  }

  if (window.confirm(`確定要將【${teacherName} 老師】的調課密碼復原為預設的「1234」嗎？`)) {
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
        body: JSON.stringify({
          action: 'updateTeacherPassword',
          teacherName: teacherName,
          newPassword: '1234'
        })
      }).then(() => {
        alert(`✅ 【${teacherName} 老師】密碼已順利重設為 1234！`);
      });
    } else {
      alert(`✅ 【${teacherName} 老師】密碼已在本機重設為 1234！`);
    }
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

window.loadFromLocalStorage = loadFromLocalStorage;
window.saveToLocalStorage = saveToLocalStorage;
window.toggleAdminLock = toggleAdminLock;
window.switchTab = switchTab;
window.initTeacherSelects = initTeacherSelects;
window.renderRosterTable = renderRosterTable;
window.adminResetTeacherPassword = adminResetTeacherPassword;
window.updateCloudStatus = updateCloudStatus;