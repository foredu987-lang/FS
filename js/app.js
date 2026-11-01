/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 主控與 RBAC 門禁模組 (js/app.js)
 * 修正：全面改用 classList 切換 active 樣式，徹底避免覆蓋 hidden 屬性
 */

const STORAGE_KEY_TASKS = 'feisha_tasks_115_1';
const STORAGE_KEY_SWAPS = 'feisha_swaps_115_1';
const STORAGE_KEY_CONFIG = 'feisha_config_115_1';
const STORAGE_KEY_CUSTOM_ROSTER = 'feisha_teacher_roster_115_1';
const SESSION_KEY_AUTH = 'feisha_current_session_115_1';

// 全域身分狀態 (guest | teacher | admin)
window.currentUser = {
  role: 'guest',
  teacherName: null
};

window.appData = {
  tasks: [],
  swaps: [],
  config: {
    apiUrl: window.FEISHA_SYSTEM_CONFIG ? window.FEISHA_SYSTEM_CONFIG.apiUrl : '',
    calendarId: window.FEISHA_SYSTEM_CONFIG ? window.FEISHA_SYSTEM_CONFIG.calendarId : '',
    reminderMinutes: 15,
    adminPassword: 'fatman'
  }
};

window.addEventListener('DOMContentLoaded', () => {
  try { loadLocalData(); } catch (e) { console.warn('本地快取讀取異常：', e); }
  try { initAuthSession(); } catch (e) { console.error('身分狀態初始化異常：', e); }
  try { populateLoginTeacherSelect(); } catch (e) { console.warn(e); }
  try { initTeacherSelects(); } catch (e) { console.warn(e); }
  try { renderRosterTable(); } catch (e) { console.warn(e); }

  try {
    if (typeof initAcademicWeek === 'function') {
      initAcademicWeek();
    } else if (typeof renderScheduleGrid === 'function') {
      renderScheduleGrid();
    }
  } catch (e) {
    console.error('課表初始化異常：', e);
  }

  try { if (typeof renderTasksTable === 'function') renderTasksTable(); } catch (e) {}
  try { if (typeof renderSwapsTable === 'function') renderSwapsTable(); } catch (e) {}
  try { if (typeof renderReportTable === 'function') renderReportTable(); } catch (e) {}
});

function loadLocalData() {
  const savedTasks = localStorage.getItem(STORAGE_KEY_TASKS);
  const savedSwaps = localStorage.getItem(STORAGE_KEY_SWAPS);
  const savedRoster = localStorage.getItem(STORAGE_KEY_CUSTOM_ROSTER);

  if (savedTasks) {
    try { window.appData.tasks = JSON.parse(savedTasks); } catch (e) {}
  }
  if (savedSwaps) {
    try { window.appData.swaps = JSON.parse(savedSwaps); } catch (e) {}
  }
  if (savedRoster) {
    try {
      const roster = JSON.parse(savedRoster);
      if (roster && typeof roster === 'object') {
        window.TEACHER_ROSTER = Object.assign(window.TEACHER_ROSTER || {}, roster);
      }
    } catch (e) {}
  }
}

// ==========================================
// RBAC 三層身分控制 (Session-based)
// ==========================================
function initAuthSession() {
  const sessionStr = sessionStorage.getItem(SESSION_KEY_AUTH);
  if (sessionStr) {
    try {
      const parsed = JSON.parse(sessionStr);
      if (parsed && (parsed.role === 'teacher' || parsed.role === 'admin')) {
        window.currentUser = parsed;
      }
    } catch (e) {
      window.currentUser = { role: 'guest', teacherName: null };
    }
  } else {
    window.currentUser = { role: 'guest', teacherName: null };
  }
  applyRbacPermissions();
}

function applyRbacPermissions() {
  const role = window.currentUser.role;
  const navMod2 = document.getElementById('tab-module2');
  const navMod3 = document.getElementById('tab-module3');
  const navMod4 = document.getElementById('tab-module4');
  const navMod5 = document.getElementById('tab-module5');
  const navMod6 = document.getElementById('tab-module6');

  if (role === 'guest') {
    // 訪客：只開模組 1，其餘 5 個嚴格隱藏
    if (navMod2) navMod2.classList.add('hidden');
    if (navMod3) navMod3.classList.add('hidden');
    if (navMod4) navMod4.classList.add('hidden');
    if (navMod5) navMod5.classList.add('hidden');
    if (navMod6) navMod6.classList.add('hidden');
    switchTab('module1');
  } else if (role === 'teacher') {
    // 一般教師：開放模組 1 與 模組 3
    if (navMod2) navMod2.classList.add('hidden');
    if (navMod3) navMod3.classList.remove('hidden');
    if (navMod4) navMod4.classList.add('hidden');
    if (navMod5) navMod5.classList.add('hidden');
    if (navMod6) navMod6.classList.add('hidden');
  } else if (role === 'admin') {
    // 課務組長：全開
    if (navMod2) navMod2.classList.remove('hidden');
    if (navMod3) navMod3.classList.remove('hidden');
    if (navMod4) navMod4.classList.remove('hidden');
    if (navMod5) navMod5.classList.remove('hidden');
    if (navMod6) navMod6.classList.remove('hidden');
  }

  renderAuthHeaderUi();
}

function renderAuthHeaderUi() {
  const container = document.getElementById('authStatusContainer');
  if (!container) return;
  const role = window.currentUser.role;

  if (role === 'guest') {
    container.innerHTML = `
      <button onclick="openLoginModal()" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer">
        <span>🔑 身分登入</span>
      </button>
    `;
  } else if (role === 'teacher') {
    const name = window.currentUser.teacherName || '教師';
    container.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold text-indigo-300 bg-indigo-950/80 px-2.5 py-1 rounded-md border border-indigo-700/60 flex items-center gap-1">
          👤 ${name} 老師
        </span>
        <button onclick="openChangePasswordModal()" class="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer">
          🔑 改密碼
        </button>
        <button onclick="logout()" class="px-2.5 py-1 rounded-md bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-bold border border-rose-700/50 transition cursor-pointer">
          🚪 登出
        </button>
      </div>
    `;
  } else if (role === 'admin') {
    container.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-700/60 flex items-center gap-1">
          👑 課務組長 (最高權限)
        </span>
        <button onclick="logout()" class="px-2.5 py-1 rounded-md bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-bold border border-rose-700/50 transition cursor-pointer">
          🚪 登出
        </button>
      </div>
    `;
  }
}

// ==========================================
// 導航切換核心 (使用 classList 杜絕覆蓋 hidden)
// ==========================================
function switchTab(tabId) {
  const role = window.currentUser?.role || 'guest';

  // 門禁防禦：禁止越權進入未開放分頁
  if (role === 'guest' && tabId !== 'module1') return;
  if (role === 'teacher' && tabId !== 'module1' && tabId !== 'module3') return;

  // 1. 切換各區塊面板的顯隱
  document.querySelectorAll('.tab-content').forEach(p => p.classList.add('hidden'));
  const activePane = document.getElementById(tabId);
  if (activePane) activePane.classList.remove('hidden');

  // 2. 切換頁籤按鈕樣式 (只修改顏色與文字粗細，絕對不碰 hidden)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('bg-indigo-600', 'text-white', 'font-bold');
    btn.classList.add('text-slate-300', 'font-semibold');
  });

  const activeBtn = document.getElementById(`tab-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-300', 'font-semibold');
    activeBtn.classList.add('bg-indigo-600', 'text-white', 'font-bold');
  }

  // 3. 模組重新繪製回呼
  if (tabId === 'module1' && typeof renderScheduleGrid === 'function') renderScheduleGrid();
  if (tabId === 'module2' && typeof renderTasksTable === 'function') renderTasksTable();
  if (tabId === 'module3' && typeof renderSwapsTable === 'function') renderSwapsTable();
  if (tabId === 'module5' && typeof renderReportTable === 'function') renderReportTable();
}

// ==========================================
// 登入彈窗邏輯
// ==========================================
function openLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.classList.remove('hidden');
  switchLoginRoleTab('teacher');
}

function closeLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.classList.add('hidden');
}

function switchLoginRoleTab(role) {
  const teacherBtn = document.getElementById('loginTabTeacherBtn');
  const adminBtn = document.getElementById('loginTabAdminBtn');
  const teacherForm = document.getElementById('teacherLoginForm');
  const adminForm = document.getElementById('adminLoginForm');

  if (role === 'teacher') {
    if (teacherBtn) teacherBtn.className = "flex-1 py-1.5 rounded-md font-bold transition bg-white shadow-xs text-indigo-700 cursor-pointer";
    if (adminBtn) adminBtn.className = "flex-1 py-1.5 rounded-md font-semibold transition text-slate-500 hover:text-slate-800 cursor-pointer";
    if (teacherForm) teacherForm.classList.remove('hidden');
    if (adminForm) adminForm.classList.add('hidden');
  } else {
    if (adminBtn) adminBtn.className = "flex-1 py-1.5 rounded-md font-bold transition bg-white shadow-xs text-slate-900 cursor-pointer";
    if (teacherBtn) teacherBtn.className = "flex-1 py-1.5 rounded-md font-semibold transition text-slate-500 hover:text-slate-800 cursor-pointer";
    if (adminForm) adminForm.classList.remove('hidden');
    if (teacherForm) teacherForm.classList.add('hidden');
  }
}

function populateLoginTeacherSelect() {
  const sel = document.getElementById('loginTeacherSelect');
  if (!sel) return;
  const roster = window.TEACHER_ROSTER || {};
  sel.innerHTML = '';
  Object.keys(roster).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = `${name} 老師 (${roster[name]?.title || '教師'})`;
    sel.appendChild(opt);
  });
}

function handleTeacherLogin(e) {
  e.preventDefault();
  const sel = document.getElementById('loginTeacherSelect');
  const pinInput = document.getElementById('loginTeacherPin');
  if (!sel || !pinInput) return;

  const tName = sel.value;
  const enteredPin = pinInput.value.trim();
  const roster = window.TEACHER_ROSTER || {};
  const correctPin = String(roster[tName]?.password || '1234').trim();

  if (enteredPin === correctPin) {
    window.currentUser = { role: 'teacher', teacherName: tName };
    sessionStorage.setItem(SESSION_KEY_AUTH, JSON.stringify(window.currentUser));
    pinInput.value = '';
    closeLoginModal();
    applyRbacPermissions();

    // 登入後聚焦個人課表
    if (typeof setViewMode === 'function') setViewMode('teacher');
    const targetSel = document.getElementById('targetSelect');
    if (targetSel) {
      targetSel.value = tName;
      if (typeof renderScheduleGrid === 'function') renderScheduleGrid();
    }

    // 自動為調課表單帶入申請人
    const origTeacherSelect = document.getElementById('swapOrigTeacher');
    if (origTeacherSelect) origTeacherSelect.value = tName;

    alert(`👋 歡迎 ${tName} 老師登入！\n已自動為您切換至個人課表，並解鎖「模組 3：同仁自辦互調課」。`);
  } else {
    alert('❌ 調課密碼不正確！\n預設密碼為 1234，若忘記密碼請洽課務組長重置。');
  }
}

function handleAdminLogin(e) {
  e.preventDefault();
  const pwdInput = document.getElementById('loginAdminPassword');
  if (!pwdInput) return;

  const enteredPwd = pwdInput.value.trim();
  const correctPwd = String(window.FEISHA_SYSTEM_CONFIG?.adminPassword || 'fatman').trim();

  if (enteredPwd === correctPwd) {
    window.currentUser = { role: 'admin', teacherName: '課務組長' };
    sessionStorage.setItem(SESSION_KEY_AUTH, JSON.stringify(window.currentUser));
    pwdInput.value = '';
    closeLoginModal();
    applyRbacPermissions();
    renderRosterTable();

    alert('🔓 課務組長身分驗證成功！\n已為您解鎖系統 6 大模組之完整最高管理權限。');
  } else {
    alert('❌ 組長管理密碼不正確！');
  }
}

function logout() {
  if (window.confirm('確定要登出目前身分嗎？')) {
    sessionStorage.removeItem(SESSION_KEY_AUTH);
    window.currentUser = { role: 'guest', teacherName: null };
    applyRbacPermissions();
    if (typeof setViewMode === 'function') setViewMode('class');
    renderRosterTable();
    alert('🔒 已安全登出，回到一般訪客課表檢視模式。');
  }
}

// ==========================================
// 教師自主修改密碼彈窗
// ==========================================
function openChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  if (modal) modal.classList.remove('hidden');
}

function closeChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  if (modal) modal.classList.add('hidden');
}

function handleChangePasswordSubmit(e) {
  e.preventDefault();
  if (window.currentUser.role !== 'teacher' || !window.currentUser.teacherName) {
    alert('非教師身分無法修改密碼！');
    return;
  }

  const oldPin = document.getElementById('changeOldPin').value.trim();
  const newPin = document.getElementById('changeNewPin').value.trim();
  const confirmPin = document.getElementById('changeConfirmPin').value.trim();
  const tName = window.currentUser.teacherName;
  const roster = window.TEACHER_ROSTER || {};
  const currentPin = String(roster[tName]?.password || '1234').trim();

  if (oldPin !== currentPin) {
    alert('❌ 目前密碼輸入錯誤！');
    return;
  }
  if (!newPin || newPin.length < 4) {
    alert('⚠️ 新密碼至少需為 4 碼！');
    return;
  }
  if (newPin !== confirmPin) {
    alert('❌ 兩次新密碼輸入不一致！');
    return;
  }

  if (roster[tName]) {
    roster[tName].password = newPin;
    localStorage.setItem(STORAGE_KEY_CUSTOM_ROSTER, JSON.stringify(roster));
  }

  const apiUrl = window.FEISHA_SYSTEM_CONFIG?.apiUrl;
  if (apiUrl && apiUrl.startsWith('http')) {
    fetch(apiUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'updateTeacherPassword',
        teacherName: tName,
        newPassword: newPin
      })
    });
  }

  document.getElementById('changeOldPin').value = '';
  document.getElementById('changeNewPin').value = '';
  document.getElementById('changeConfirmPin').value = '';
  closeChangePasswordModal();
  alert(`✅ 【${tName} 老師】您的調課密碼已成功更新！請妥善保存。`);
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
  const isAdmin = window.currentUser?.role === 'admin';

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
          ${isAdmin ? `
            <button onclick="adminResetTeacherPassword('${name}')" class="px-2 py-1 text-[11px] font-bold rounded bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition shadow-2xs cursor-pointer">
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
  if (window.currentUser?.role !== 'admin') {
    alert('請先以課務組長身分登入！');
    return;
  }
  if (window.confirm(`確定要將【${teacherName} 老師】的調課密碼復原為預設「1234」嗎？`)) {
    const roster = window.TEACHER_ROSTER || {};
    if (roster[teacherName]) {
      roster[teacherName].password = '1234';
      localStorage.setItem(STORAGE_KEY_CUSTOM_ROSTER, JSON.stringify(roster));
    }
    const apiUrl = window.FEISHA_SYSTEM_CONFIG?.apiUrl;
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

// 註冊至全域 window
window.switchTab = switchTab;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.switchLoginRoleTab = switchLoginRoleTab;
window.handleTeacherLogin = handleTeacherLogin;
window.handleAdminLogin = handleAdminLogin;
window.logout = logout;
window.openChangePasswordModal = openChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
window.handleChangePasswordSubmit = handleChangePasswordSubmit;
window.adminResetTeacherPassword = adminResetTeacherPassword;
window.renderRosterTable = renderRosterTable;