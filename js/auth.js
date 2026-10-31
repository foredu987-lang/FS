/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 身分驗證、權限管控與自訂對話框模組 (js/auth.js)
 * 職責：課務組長/一般教師切換、PIN 碼安全驗證、介面編輯權限防護、完全取代原生 alert/confirm 的 Toast 與 Promise 對話框
 */

// ==========================================
// 1. 常數與權限狀態定義
// ==========================================
const STORAGE_KEY_AUTH = 'feisha_auth_state_115_1';
const STORAGE_KEY_PIN = 'feisha_admin_pin_115_1';
const DEFAULT_ADMIN_PIN = '1234';

// 全域身分狀態：'admin' (課務組長) 或 'teacher' (一般教師/訪客)
window.currentUserRole = 'teacher';

// 暫存需在解鎖後執行的回呼動作
let pendingAuthCallback = null;

// ==========================================
// 2. 初始化與權限狀態讀取
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  initAuthState();
  createToastContainer();
  createConfirmModalDOM();
  createLoginModalDOM();
  applyRolePermissions();
});

/**
 * 初始化身分狀態與 PIN 碼
 */
function initAuthState() {
  try {
    const savedRole = localStorage.getItem(STORAGE_KEY_AUTH);
    if (savedRole === 'admin' || savedRole === 'teacher') {
      window.currentUserRole = savedRole;
    } else {
      window.currentUserRole = 'teacher'; // 預設為一般教師唯讀模式
    }

    const savedPin = localStorage.getItem(STORAGE_KEY_PIN);
    if (!savedPin) {
      localStorage.setItem(STORAGE_KEY_PIN, DEFAULT_ADMIN_PIN);
    }
  } catch (e) {
    console.warn('權限讀取失敗，使用預設教師身分：', e);
    window.currentUserRole = 'teacher';
  }
}

/**
 * 取得當前設定之組長管理 PIN 碼
 */
function getAdminPin() {
  try {
    return localStorage.getItem(STORAGE_KEY_PIN) || DEFAULT_ADMIN_PIN;
  } catch (e) {
    return DEFAULT_ADMIN_PIN;
  }
}

/**
 * 修改管理員 PIN 碼
 */
function updateAdminPin(oldPin, newPin) {
  const currentPin = getAdminPin();
  if (oldPin !== currentPin) {
    showToast('原 PIN 碼輸入錯誤，無法修改！', 'error');
    return false;
  }
  if (!newPin || newPin.length < 4) {
    showToast('新 PIN 碼長度至少需為 4 碼！', 'warning');
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY_PIN, newPin);
    showToast('✅ 管理員 PIN 碼已成功更新！', 'success');
    return true;
  } catch (e) {
    showToast('儲存失敗，請檢查瀏覽器安全性設定。', 'error');
    return false;
  }
}

// ==========================================
// 3. 身分切換與 PIN 碼驗證流程
// ==========================================

/**
 * 開啟登入驗證彈窗
 * @param {Function} onSuccessCallback - 驗證成功後要立即執行的動作 (選填)
 */
function openLoginModal(onSuccessCallback = null) {
  pendingAuthCallback = typeof onSuccessCallback === 'function' ? onSuccessCallback : null;
  const modal = document.getElementById('authLoginModal');
  const pinInput = document.getElementById('authPinInput');
  const errorHint = document.getElementById('authPinErrorHint');

  if (modal && pinInput) {
    pinInput.value = '';
    if (errorHint) errorHint.classList.add('hidden');
    modal.classList.remove('hidden');
    setTimeout(() => pinInput.focus(), 100);
  }
}

/**
 * 關閉登入彈窗
 */
function closeLoginModal() {
  const modal = document.getElementById('authLoginModal');
  if (modal) {
    modal.classList.add('hidden');
  }
  pendingAuthCallback = null;
}

/**
 * 提交 PIN 碼驗證
 */
function submitLoginPin() {
  const pinInput = document.getElementById('authPinInput');
  const errorHint = document.getElementById('authPinErrorHint');
  if (!pinInput) return;

  const enteredPin = pinInput.value.trim();
  const correctPin = getAdminPin();

  if (enteredPin === correctPin) {
    window.currentUserRole = 'admin';
    try {
      localStorage.setItem(STORAGE_KEY_AUTH, 'admin');
    } catch (e) {}

    closeLoginModal();
    applyRolePermissions();
    showToast('👑 課務組長身分解鎖成功！已開放完整編輯與月結核銷權限。', 'success');

    if (pendingAuthCallback) {
      const cb = pendingAuthCallback;
      pendingAuthCallback = null;
      cb();
    }
  } else {
    if (errorHint) {
      errorHint.textContent = '❌ PIN 碼錯誤，請重新輸入 (預設為 1234)';
      errorHint.classList.remove('hidden');
    }
    pinInput.value = '';
    pinInput.focus();
  }
}

/**
 * 登出管理員身分 (切換回一般教師模式)
 */
function logoutRole() {
  window.currentUserRole = 'teacher';
  try {
    localStorage.setItem(STORAGE_KEY_AUTH, 'teacher');
  } catch (e) {}

  applyRolePermissions();
  showToast('👤 已切換回一般教師檢視模式 (鎖定唯讀保護)。', 'info');
}

/**
 * 管理動作守門員：若非組長則彈窗要求輸入 PIN 碼
 * @param {Function} protectedAction - 需組長權限才能執行的動作
 */
function requireAdmin(protectedAction) {
  if (window.currentUserRole === 'admin') {
    protectedAction();
  } else {
    openLoginModal(protectedAction);
  }
}

// ==========================================
// 4. 介面權限套用引擎 (UI Permissions Guard)
// ==========================================
function applyRolePermissions() {
  const isAdmin = window.currentUserRole === 'admin';
  const roleBtn = document.getElementById('roleToggleBtn');

  // 1. 更新頂部導覽列按鈕狀態
  if (roleBtn) {
    if (isAdmin) {
      roleBtn.className = "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition";
      roleBtn.innerHTML = `<span>👑</span><span>課務組長 (已解鎖)</span><span class="text-[10px] ml-1 opacity-70 underline" onclick="event.stopPropagation(); logoutRole();">登出</span>`;
      roleBtn.onclick = null; // 避免冒泡重複觸發
    } else {
      roleBtn.className = "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition";
      roleBtn.innerHTML = `<span>👤</span><span>一般教師 (點擊解鎖)</span>`;
      roleBtn.onclick = () => openLoginModal();
    }
  }

  // 2. 鎖定或開放受保護的按鈕 (帶有 admin-only 標籤者)
  document.querySelectorAll('.admin-only').forEach(element => {
    if (isAdmin) {
      element.classList.remove('opacity-50', 'cursor-not-allowed');
      element.removeAttribute('disabled');
      if (element.dataset.origTitle) {
        element.title = element.dataset.origTitle;
      }
    } else {
      element.classList.add('opacity-50', 'cursor-not-allowed');
      if (!element.dataset.origTitle) {
        element.dataset.origTitle = element.title || '';
      }
      element.title = '🔒 此操作僅限課務組長執行，請點選右上角身分解鎖';
    }
  });

  // 3. 模組 5 月結公文核章與月結週數微調保護
  const ctrl52 = document.getElementById('module52Controls');
  if (ctrl52) {
    const buttons = ctrl52.querySelectorAll('button');
    buttons.forEach(b => {
      b.disabled = !isAdmin;
      if (!isAdmin) {
        b.classList.add('opacity-40');
      } else {
        b.classList.remove('opacity-40');
      }
    });
  }

  // 4. 若模組 4 排代矩陣已載入，重新渲染作業狀態
  if (typeof renderAssignmentMatrix === 'function') {
    renderAssignmentMatrix();
  }
}

// ==========================================
// 5. 自訂 Toast 浮動提示系統 (徹底取代原生 alert)
// ==========================================
function createToastContainer() {
  if (document.getElementById('toastContainer')) return;
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none';
  document.body.appendChild(container);
}

/**
 * 顯示自訂浮動提示訊息 (Toast)
 * @param {string} message - 提示文字
 * @param {'info'|'success'|'warning'|'error'} type - 提示類型
 * @param {number} duration - 持續顯示毫秒數 (預設 3200ms)
 */
function showToast(message, type = 'info', duration = 3200) {
  createToastContainer();
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'pointer-events-auto transform translate-y-2 opacity-0 transition-all duration-300 ease-out flex items-start gap-3 p-3.5 rounded-xl shadow-lg border text-xs font-semibold';

  let icon = 'ℹ️';
  let colorStyles = 'bg-white text-slate-800 border-slate-200';

  if (type === 'success') {
    icon = '✅';
    colorStyles = 'bg-emerald-50 text-emerald-950 border-emerald-300';
  } else if (type === 'warning') {
    icon = '⚠️';
    colorStyles = 'bg-amber-50 text-amber-950 border-amber-300';
  } else if (type === 'error') {
    icon = '❌';
    colorStyles = 'bg-rose-50 text-rose-950 border-rose-300';
  } else if (type === 'info') {
    icon = '💡';
    colorStyles = 'bg-indigo-50 text-indigo-950 border-indigo-200';
  }

  toast.className += ` ${colorStyles}`;
  toast.innerHTML = `
    <span class="text-base select-none">${icon}</span>
    <div class="flex-1 leading-relaxed">${message.replace(/\n/g, '<br>')}</div>
    <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600 font-bold ml-1 text-sm leading-none">&times;</button>
  `;

  container.appendChild(toast);

  // 動畫淡入
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  // 自動定時淡出移除
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-2');
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 300);
  }, duration);
}

// ==========================================
// 6. 自訂非同步確認對話框 (徹底取代原生 confirm)
// ==========================================
function createConfirmModalDOM() {
  if (document.getElementById('customConfirmModal')) return;

  const modalHtml = `
    <div id="customConfirmModal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 transform scale-95 transition-all">
        <div class="flex items-center gap-3">
          <div id="confirmIconWrapper" class="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-amber-100 text-amber-700">
            ⚠️
          </div>
          <h3 id="confirmTitle" class="text-base font-bold text-slate-800">系統確認</h3>
        </div>
        <p id="confirmMessage" class="text-xs text-slate-600 leading-relaxed pl-13 whitespace-pre-line"></p>
        <div class="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button id="confirmCancelBtn" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition">取消</button>
          <button id="confirmOkBtn" class="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition">確定</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * 彈出非同步確認對話框
 * @param {string} message - 詢問訊息內文
 * @param {string} title - 對話框標題 (預設 '請確認動作')
 * @param {'danger'|'warning'|'info'} theme - 主題樣式
 * @returns {Promise<boolean>} 使用者點擊確定返回 true，取消返回 false
 */
function showConfirmDialog(message, title = '請確認動作', theme = 'warning') {
  createConfirmModalDOM();
  const modal = document.getElementById('customConfirmModal');
  const titleEl = document.getElementById('confirmTitle');
  const msgEl = document.getElementById('confirmMessage');
  const iconWrapper = document.getElementById('confirmIconWrapper');
  const okBtn = document.getElementById('confirmOkBtn');
  const cancelBtn = document.getElementById('confirmCancelBtn');

  if (!modal || !titleEl || !msgEl || !okBtn || !cancelBtn) {
    return Promise.resolve(window.confirm(message)); // 降級保底
  }

  titleEl.textContent = title;
  msgEl.textContent = message;

  if (theme === 'danger') {
    iconWrapper.className = "w-10 h-10 rounded-full flex items-center justify-center text-lg bg-rose-100 text-rose-700";
    iconWrapper.textContent = "🗑️";
    okBtn.className = "px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-sm transition";
  } else {
    iconWrapper.className = "w-10 h-10 rounded-full flex items-center justify-center text-lg bg-amber-100 text-amber-700";
    iconWrapper.textContent = "⚠️";
    okBtn.className = "px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition";
  }

  modal.classList.remove('hidden');

  return new Promise((resolve) => {
    const handleOk = () => {
      cleanup();
      modal.classList.add('hidden');
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      modal.classList.add('hidden');
      resolve(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleCancel();
      if (e.key === 'Enter') handleOk();
    };

    function cleanup() {
      okBtn.removeEventListener('click', handleOk);
      cancelBtn.removeEventListener('click', handleCancel);
      document.removeEventListener('keydown', handleKeyDown);
    }

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
    document.addEventListener('keydown', handleKeyDown);
  });
}

// ==========================================
// 7. 注入登入驗證彈窗 DOM 結構
// ==========================================
function createLoginModalDOM() {
  if (document.getElementById('authLoginModal')) return;

  const loginModalHtml = `
    <div id="authLoginModal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-200">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">👑</span>
            <h3 class="text-base font-bold text-slate-800">身分解鎖 (課務組長)</h3>
          </div>
          <button onclick="closeLoginModal()" class="text-slate-400 hover:text-slate-600 text-lg font-bold leading-none">&times;</button>
        </div>

        <div class="space-y-3 text-xs text-slate-600">
          <p>請輸入課務管理 PIN 碼以解鎖排代匯入、銷假、時數設定與公文核銷：</p>
          <div>
            <input type="password" id="authPinInput" maxlength="12" placeholder="請輸入 PIN 碼 (預設: 1234)" 
              class="w-full border border-slate-300 rounded-lg p-2.5 text-center text-base tracking-widest font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              onkeydown="if(event.key === 'Enter') submitLoginPin();">
            <p id="authPinErrorHint" class="hidden text-rose-600 font-semibold text-[11px] mt-1.5"></p>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button onclick="closeLoginModal()" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">取消</button>
          <button onclick="submitLoginPin()" class="px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm">驗證解鎖</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', loginModalHtml);
}

// ==========================================
// 8. 匯出至全域視窗物件
// ==========================================
window.initAuthState = initAuthState;
window.getAdminPin = getAdminPin;
window.updateAdminPin = updateAdminPin;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.submitLoginPin = submitLoginPin;
window.logoutRole = logoutRole;
window.requireAdmin = requireAdmin;
window.applyRolePermissions = applyRolePermissions;
window.showToast = showToast;
window.showConfirmDialog = showConfirmDialog;