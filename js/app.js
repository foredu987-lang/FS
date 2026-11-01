/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 主控模組 (js/app.js)
 */

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

window.addEventListener('DOMContentLoaded', () => {
  try { loadFromLocalStorage(); } catch (e) { console.warn(e); }
  try { initTeacherSelects(); } catch (e) { console.warn(e); }
  try { renderRosterTable(); } catch (e) { console.warn(e); }
  try { updateCloudStatus(); } catch (e) { console.warn(e); }

  // 動態課表安全啟動
  try {
    if (typeof initAcademicWeek === 'function') {
      initAcademicWeek();
    }
  } catch (e) {
    console.error('課表啟動異常：', e);
  }

  try { if (typeof renderTasksTable === 'function') renderTasksTable(); } catch (e) {}
  try { if (typeof renderSwapsTable === 'function') renderSwapsTable(); } catch (e) {}
  try { if (typeof renderReportTable === 'function') renderReportTable(); } catch (e) {}
});

function loadFromLocalStorage() {
  const savedTasks = localStorage.getItem('feisha_tasks_115_1');
  const savedSwaps = localStorage.getItem('feisha_swaps_115_1');
  const savedConfig = localStorage.getItem('feisha_config_115_1');

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
  if (apiInput) apiInput.value = window.appData.config.apiUrl || '';
}

function saveToLocalStorage() {
  try {
    localStorage.setItem('feisha_config_115_1', JSON.stringify(window.appData.config));
    localStorage.setItem('feisha_tasks_115_1', JSON.stringify(window.appData.tasks));
    localStorage.setItem('feisha_swaps_115_1', JSON.stringify(window.appData.swaps));
  } catch (e) {}
}

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

window.loadFromLocalStorage = loadFromLocalStorage;
window.saveToLocalStorage = saveToLocalStorage;
window.toggleAdminLock = toggleAdminLock;
window.switchTab = switchTab;
window.initTeacherSelects = initTeacherSelects;
window.renderRosterTable = renderRosterTable;
window.adminResetTeacherPassword = adminResetTeacherPassword;
window.confirmResetLocalStorage = confirmResetLocalStorage;
window.updateCloudStatus = updateCloudStatus;