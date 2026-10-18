// ==========================================================================
// 雲林縣立飛沙國民中學 115-1 整合系統核心邏輯 (app.js)
// 包含：一鍵清空防呆密碼驗證、下載空白範本、動態欄位智慧映射、測試醒目標註
// ==========================================================================

const STORAGE_KEY = "feisha_schedule_115_1_web_rbac";
const SESSION_KEY = "feisha_session_user_115_1";
const SEMESTER_START_DATE = "2026-08-31";

// 系統核心安全管理密碼庫 (支援學校代號與管理員密碼)
const ADMIN_SECURITY_PASSWORDS = ["094504", "fatman", "apexczone"];

const DEFAULT_CLASSES = ["701", "801", "901", "902"];
const DEFAULT_PERIODS = [
  { id: 0, name: "早自修", time: "07:30 - 08:15" },
  { id: 1, name: "第 1 節", time: "08:25 - 09:10" },
  { id: 2, name: "第 2 節", time: "09:20 - 10:05" },
  { id: 3, name: "第 3 節", time: "10:15 - 11:00" },
  { id: 4, name: "第 4 節", time: "11:10 - 11:55" },
  { id: 5, name: "第 5 節", time: "13:10 - 13:55" },
  { id: 6, name: "第 6 節", time: "14:05 - 14:50" },
  { id: 7, name: "第 7 節", time: "15:00 - 15:45" },
  { id: 8, name: "第 8 節", time: "16:00 - 16:45" }
];

const HOMEROOM_MAP = {
  "阮建安": "701",
  "蔡明振": "801",
  "張碧菁": "901",
  "林𡶙鋌": "902",
  "林㞽鋌": "902",
  "林山戊鋌": "902"
};

const SPECIAL_ED_TEACHERS = ["鄭宇涵"];
const ADMIN_TEACHERS = ["管理人", "施銘權"];

// 14 組教職員官方編制底冊
const OFFICIAL_STAFF_CREDENTIALS = [
  { id: "T00", dept: "教務處", title: "系統管理人", name: "管理人", role: "admin", password: "fatman", subject: "系統維運", overtimeWeekly: 0, isSubTutorQualified: false },
  { id: "T04", dept: "教導處", title: "教務組長", name: "施銘權", role: "admin", password: "apexczone", subject: "數學", overtimeWeekly: 2, isSubTutorQualified: false },
  { id: "T01", dept: "教導處", title: "教導主任", name: "蔡麗昭", role: "teacher", password: "tea-0011", subject: "自然", overtimeWeekly: 2, isSubTutorQualified: false },
  { id: "T02", dept: "總務處", title: "總務主任", name: "吳俊德", role: "teacher", password: "tea-0054", subject: "生活科技", overtimeWeekly: 0, isSubTutorQualified: false },
  { id: "T03", dept: "輔導室", title: "輔導室主任", name: "李貞慧", role: "teacher", password: "tea-0013", subject: "社會", overtimeWeekly: 4, isSubTutorQualified: false },
  { id: "T05", dept: "教導處", title: "註冊組長", name: "蔡芷儀", role: "teacher", password: "tea-3223", subject: "藝術", overtimeWeekly: 0, isSubTutorQualified: true },
  { id: "T06", dept: "教導處", title: "訓導組長", name: "林秋霞", role: "teacher", password: "tea-0029", subject: "體育", overtimeWeekly: 1, isSubTutorQualified: false },
  { id: "T07", dept: "教導處", title: "體衛組長", name: "陳文鈴", role: "teacher", password: "tea-3228", subject: "綜合", overtimeWeekly: 0, isSubTutorQualified: true },
  { id: "T08", dept: "導師", title: "導師 (七年1班)", name: "阮建安", role: "teacher", password: "tea-0030", subject: "國文", overtimeWeekly: 3, isSubTutorQualified: false },
  { id: "T09", dept: "導師", title: "導師 (九年1班)", name: "張碧菁", role: "teacher", password: "tea-0035", subject: "數學", overtimeWeekly: 1, isSubTutorQualified: false },
  { id: "T10", dept: "導師", title: "導師 (八年1班)", name: "蔡明振", role: "teacher", password: "tea-0038", subject: "國文", overtimeWeekly: 3, isSubTutorQualified: false },
  { id: "T11", dept: "導師", title: "導師 (九年2班)", name: "林𡶙鋌", alias: "林㞽鋌", role: "teacher", password: "tea-3231", subject: "自然", overtimeWeekly: 3, isSubTutorQualified: false },
  { id: "T12", dept: "教導處", title: "科任教師", name: "吳靜瑜", role: "teacher", password: "tea-3234", subject: "英語", overtimeWeekly: 0, isSubTutorQualified: true },
  { id: "T13", dept: "輔導室", title: "特教教師", name: "鄭宇涵", role: "teacher", password: "tea-3235", subject: "特教資源班", overtimeWeekly: 0, isSubTutorQualified: false }
];

let appData = {
  teachers: JSON.parse(JSON.stringify(OFFICIAL_STAFF_CREDENTIALS)),
  schedule: (typeof LOCKED_OFFICIAL_SCHEDULE !== "undefined" && LOCKED_OFFICIAL_SCHEDULE.length > 0) ? LOCKED_OFFICIAL_SCHEDULE : [],
  tasks: [], // 預設乾淨無假資料
  swaps: [],
  currentUser: "施銘權"
};

let pendingImportTasks = [];
let isEditModeActive = false;

function normalizeTeacherName(name) {
  if (!name) return "";
  return name.replace(/林山戊鋌|林山戉鋌|林\(山戉\)鋌|林㞽鋌/g, "林𡶙鋌");
}

function getSafeClasses() {
  return (typeof CLASSES !== "undefined" && Array.isArray(CLASSES)) ? CLASSES : DEFAULT_CLASSES;
}

function getSafePeriods() {
  return (typeof PERIODS !== "undefined" && Array.isArray(PERIODS)) ? PERIODS : DEFAULT_PERIODS;
}

function getWeekDates(weekNum) {
  const start = new Date(SEMESTER_START_DATE);
  start.setDate(start.getDate() + (weekNum - 1) * 7);
  const weekDates = {};
  for (let d = 1; d <= 5; d++) {
    const cur = new Date(start);
    cur.setDate(start.getDate() + (d - 1));
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const day = String(cur.getDate()).padStart(2, "0");
    weekDates[d] = `${y}-${m}-${day}`;
  }
  return weekDates;
}

function isSameDate(d1, d2) {
  if (!d1 || !d2) return false;
  const parse = (d) => {
    if (typeof d === "string") {
      const parts = d.replace(/\//g, "-").split("-");
      if (parts.length === 3) return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    }
    return d;
  };
  return parse(d1) === parse(d2);
}

function isTestItem(t) {
  if (!t) return false;
  if (t.isTest) return true;
  const str = `${t.subTeacher || ''} ${t.reason || ''} ${t.note || ''} ${t.docNo || ''}`.toUpperCase();
  return str.includes("測試") || str.includes("範例") || str.includes("TEST") || str.includes("SAMPLE");
}

// ==========================================================================
// 初始化核心
// ==========================================================================
function initDatabase() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          if (Array.isArray(parsed.teachers) && parsed.teachers.length > 0) appData.teachers = parsed.teachers;
          if (Array.isArray(parsed.schedule) && parsed.schedule.length > 0) appData.schedule = parsed.schedule;
          if (Array.isArray(parsed.tasks)) {
            // 自動過濾 SUB_ 假代課
            appData.tasks = parsed.tasks.filter(t => !t.id || !t.id.startsWith("SUB_"));
          }
          if (Array.isArray(parsed.swaps)) appData.swaps = parsed.swaps;
        }
      } catch (e) {
        console.warn("LocalStorage 快取讀取失敗，採用乾淨底冊");
      }
    }

    if (!appData.teachers || appData.teachers.length === 0) {
      appData.teachers = JSON.parse(JSON.stringify(OFFICIAL_STAFF_CREDENTIALS));
    }

    appData.teachers.forEach(t => {
      if (t.name === "阮建安") t.dept = "導師";
      if (t.name === "陳文鈴") t.dept = "教導處";

      const defaultCred = OFFICIAL_STAFF_CREDENTIALS.find(c => c.name === t.name || c.id === t.id);
      if (defaultCred) {
        if (!t.password || t.password === "undefined") t.password = defaultCred.password;
        if (!t.dept || t.dept === "未歸類") t.dept = defaultCred.dept;
      }
    });

    if (!appData.teachers.some(t => t.name === "管理人")) {
      appData.teachers.unshift(OFFICIAL_STAFF_CREDENTIALS[0]);
    }

    if (!appData.schedule || appData.schedule.length === 0) {
      appData.schedule = (typeof LOCKED_OFFICIAL_SCHEDULE !== "undefined" && LOCKED_OFFICIAL_SCHEDULE.length > 0) 
        ? JSON.parse(JSON.stringify(LOCKED_OFFICIAL_SCHEDULE)) 
        : [];
    }

    saveToLocalStorage();
    populateLoginSelect();
    populateTeacherEditSelect();
    populateWeekSelect();

    const sessionUser = sessionStorage.getItem(SESSION_KEY);
    if (sessionUser) {
      appData.currentUser = sessionUser;
      closeLoginModal();
      switchCurrentUser(appData.currentUser);
    } else {
      openLoginModal();
    }
  } catch (err) {
    console.error("系統初始化發生錯誤：", err);
  }
}

function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  } catch (e) {}
}

// ==========================================================================
// 登入認證與密碼眼睛圖示
// ==========================================================================
function openLoginModal() {
  const overlay = document.getElementById("loginOverlay");
  if (overlay) overlay.style.display = "flex";
  const pwdInput = document.getElementById("loginPasswordInput");
  const btn = document.getElementById("btnToggleLoginPwd");
  if (pwdInput) {
    pwdInput.value = "";
    pwdInput.type = "password";
  }
  if (btn) {
    btn.textContent = "🙈";
    btn.title = "目前為隱藏 (*號)，點擊顯示為明文";
  }
  const err = document.getElementById("loginErrorMsg");
  if (err) err.style.display = "none";
}

function closeLoginModal() {
  const overlay = document.getElementById("loginOverlay");
  if (overlay) overlay.style.display = "none";
}

function toggleLoginPasswordVisibility() {
  const pwdInput = document.getElementById("loginPasswordInput");
  const btn = document.getElementById("btnToggleLoginPwd");
  if (!pwdInput) return;

  if (pwdInput.type === "password") {
    pwdInput.type = "text";
    if (btn) {
      btn.textContent = "👁️";
      btn.title = "目前為顯示 (明文)，點擊隱藏為星號";
    }
  } else {
    pwdInput.type = "password";
    if (btn) {
      btn.textContent = "🙈";
      btn.title = "目前為隱藏 (*號)，點擊顯示為明文";
    }
  }
}

function populateLoginSelect() {
  const select = document.getElementById("loginUserSelect");
  if (!select) return;
  select.innerHTML = "";

  const depts = {};
  appData.teachers.forEach(t => {
    const dName = t.dept || "教導處";
    if (!depts[dName]) depts[dName] = [];
    depts[dName].push(t);
  });

  for (const dept in depts) {
    const group = document.createElement("optgroup");
    group.label = `【${dept}】`;
    depts[dept].forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.name;
      opt.textContent = `${t.name} (${t.title})`;
      group.appendChild(opt);
    });
    select.appendChild(group);
  }
}

function submitLogin() {
  const userSelect = document.getElementById("loginUserSelect");
  const pwdInput = document.getElementById("loginPasswordInput");
  const errorMsg = document.getElementById("loginErrorMsg");
  const userName = userSelect.value;
  const inputPwd = pwdInput.value.trim();

  const userObj = appData.teachers.find(t => t.name === userName);
  if (!userObj) {
    errorMsg.textContent = "查無此使用者！";
    errorMsg.style.display = "block";
    return;
  }

  let expectedPwd = userObj.password;
  if (!expectedPwd) {
    const orig = OFFICIAL_STAFF_CREDENTIALS.find(c => c.name === userName);
    if (orig) {
      expectedPwd = orig.password;
      userObj.password = orig.password;
      saveToLocalStorage();
    }
  }

  if (expectedPwd !== inputPwd) {
    errorMsg.textContent = "密碼錯誤，請重新輸入！";
    errorMsg.style.display = "block";
    pwdInput.value = "";
    pwdInput.focus();
    return;
  }

  sessionStorage.setItem(SESSION_KEY, userName);
  appData.currentUser = userName;
  closeLoginModal();
  switchCurrentUser(userName);
}

function quickClassLogin(classId) {
  const classUser = `CLASS_${classId}`;
  sessionStorage.setItem(SESSION_KEY, classUser);
  appData.currentUser = classUser;
  closeLoginModal();
  switchCurrentUser(classUser);
}

function handleLogout() {
  if (!confirm("確定要登出系統嗎？")) return;
  sessionStorage.removeItem(SESSION_KEY);
  openLoginModal();
}

function openChangePasswordModal() {
  document.getElementById("pwdOldInput").value = "";
  document.getElementById("pwdNewInput").value = "";
  document.getElementById("pwdConfirmInput").value = "";
  document.getElementById("changePwdErrorMsg").style.display = "none";
  document.getElementById("changePasswordModal").classList.add("active");
}

function closeChangePasswordModal() {
  document.getElementById("changePasswordModal").classList.remove("active");
}

function submitChangePassword() {
  const oldPwd = document.getElementById("pwdOldInput").value.trim();
  const newPwd = document.getElementById("pwdNewInput").value.trim();
  const confirmPwd = document.getElementById("pwdConfirmInput").value.trim();
  const errorMsg = document.getElementById("changePwdErrorMsg");

  const userObj = appData.teachers.find(t => t.name === appData.currentUser);
  if (!userObj) {
    alert("目前身分不支援修改密碼！");
    return;
  }

  if (userObj.password !== oldPwd) {
    errorMsg.textContent = "目前舊密碼輸入錯誤！";
    errorMsg.style.display = "block";
    return;
  }

  if (!newPwd || newPwd.length < 4) {
    errorMsg.textContent = "新密碼長度不得少於 4 個字元！";
    errorMsg.style.display = "block";
    return;
  }

  if (newPwd !== confirmPwd) {
    errorMsg.textContent = "兩次輸入的新密碼不一致！";
    errorMsg.style.display = "block";
    return;
  }

  userObj.password = newPwd;
  saveToLocalStorage();
  closeChangePasswordModal();
  alert("✅ 密碼變更成功！請牢記您的新密碼。");
}

function openAdminEditTeacherModal(teacherId) {
  if (!isCurrentAdmin()) return;
  const teacher = appData.teachers.find(t => t.id === teacherId);
  if (!teacher) return;

  document.getElementById("adminTeacherId").value = teacher.id;
  document.getElementById("adminTeacherName").value = teacher.name;
  document.getElementById("adminTeacherDept").value = teacher.dept || "教導處";
  document.getElementById("adminTeacherTitle").value = teacher.title;
  document.getElementById("adminTeacherRole").value = teacher.role;
  document.getElementById("adminTeacherPassword").value = teacher.password;
  document.getElementById("adminTeacherOvertime").value = teacher.overtimeWeekly || 0;
  document.getElementById("adminTeacherSubTutor").checked = !!teacher.isSubTutorQualified;

  document.getElementById("adminEditTeacherModal").classList.add("active");
}

function closeAdminEditTeacherModal() {
  document.getElementById("adminEditTeacherModal").classList.remove("active");
}

function saveAdminTeacherChanges() {
  if (!isCurrentAdmin()) return;
  const id = document.getElementById("adminTeacherId").value;
  const teacher = appData.teachers.find(t => t.id === id);
  if (!teacher) return;

  const newDept = document.getElementById("adminTeacherDept").value.trim();
  const newTitle = document.getElementById("adminTeacherTitle").value.trim();
  const newRole = document.getElementById("adminTeacherRole").value;
  const newPwd = document.getElementById("adminTeacherPassword").value.trim();
  const newOvertime = parseInt(document.getElementById("adminTeacherOvertime").value) || 0;
  const isSubTutor = document.getElementById("adminTeacherSubTutor").checked;

  if (!newPwd) {
    alert("密碼不得為空白！");
    return;
  }

  teacher.dept = newDept;
  teacher.title = newTitle;
  teacher.role = newRole;
  teacher.password = newPwd;
  teacher.overtimeWeekly = newOvertime;
  teacher.isSubTutorQualified = isSubTutor;

  saveToLocalStorage();
  closeAdminEditTeacherModal();
  renderRosterTable();
  alert(`✅ 已成功更新 ${teacher.name} 老師的職務與密碼設定！`);
}

function resetTeacherPasswordDefault(teacherId) {
  if (!isCurrentAdmin()) return;
  const orig = OFFICIAL_STAFF_CREDENTIALS.find(t => t.id === teacherId);
  const teacher = appData.teachers.find(t => t.id === teacherId);
  if (!orig || !teacher) return;

  if (confirm(`確定要將【${teacher.name}】的密碼還原為預設密碼 (${orig.password}) 嗎？`)) {
    teacher.password = orig.password;
    saveToLocalStorage();
    renderRosterTable();
    alert(`✅ 已將 ${teacher.name} 的密碼還原為：${orig.password}`);
  }
}

// ==========================================================================
// 權限與身分切換
// ==========================================================================
function isCurrentAdmin() {
  return ADMIN_TEACHERS.includes(appData.currentUser);
}

function isCurrentClassView() {
  return typeof appData.currentUser === "string" && appData.currentUser.startsWith("CLASS_");
}

function getCurrentClassName() {
  return isCurrentClassView() ? appData.currentUser.replace("CLASS_", "") : null;
}

function isCurrentHomeroomTeacher() {
  return !!HOMEROOM_MAP[appData.currentUser];
}

function isCurrentSpecialEdTeacher() {
  return SPECIAL_ED_TEACHERS.includes(appData.currentUser);
}

function toggleScheduleEditMode() {
  if (!isCurrentAdmin()) return;
  isEditModeActive = !isEditModeActive;
  updateEditModeUI();
  renderSchedule();
}

function updateEditModeUI() {
  const btn = document.getElementById("btnToggleEditMode");
  const hintBar = document.getElementById("adminEditHintBar");
  
  if (!isCurrentAdmin()) {
    if (btn) btn.style.display = "none";
    if (hintBar) hintBar.style.display = "none";
    isEditModeActive = false;
    return;
  }

  if (btn) {
    btn.style.display = "inline-flex";
    if (isEditModeActive) {
      btn.className = "btn btn-danger btn-sm";
      btn.innerHTML = "🔒 鎖定退出編輯";
    } else {
      btn.className = "btn btn-primary btn-sm";
      btn.innerHTML = "➕ 啟動加課/修改模式";
    }
  }

  if (hintBar) {
    hintBar.style.display = isEditModeActive ? "block" : "none";
  }
}

function populateTeacherEditSelect() {
  const select = document.getElementById("editCourseTeacher");
  if (!select) return;
  select.innerHTML = "";
  appData.teachers.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.name;
    opt.textContent = `${t.name} (${t.title} - ${t.subject})`;
    select.appendChild(opt);
  });
}

function populateWeekSelect() {
  const select = document.getElementById("scheduleWeekSelect");
  if (!select) return;
  select.innerHTML = "";

  const optBase = document.createElement("option");
  optBase.value = "base";
  optBase.textContent = "📌 全學期常態基準課表 (無代課)";
  select.appendChild(optBase);

  for (let w = 1; w <= 21; w++) {
    const dates = getWeekDates(w);
    const opt = document.createElement("option");
    opt.value = w.toString();
    opt.textContent = `第 ${w} 週 (${dates[1].slice(5).replace("-", "/")} ~ ${dates[5].slice(5).replace("-", "/")})`;
    select.appendChild(opt);
  }
}

function switchCurrentUser(userName) {
  appData.currentUser = userName;
  isEditModeActive = false;
  saveToLocalStorage();

  const userBadge = document.getElementById("currentUserRoleBadge");
  const userNameDisplay = document.getElementById("currentUserNameDisplay");
  const navTasks = document.getElementById("navBtnTasks");
  const navWorkflow = document.getElementById("navBtnWorkflow");
  const navRadar = document.getElementById("navBtnRadar");
  const navReports = document.getElementById("navBtnReports");
  const navSettings = document.getElementById("navBtnSettings");
  const exportBtn = document.getElementById("btnExportCsv");
  const resetBtn = document.getElementById("btnResetDefault");
  const clearAllBtn = document.getElementById("btnClearAllTasks");
  const modeSelect = document.getElementById("scheduleViewModeSelect");
  const targetSelect = document.getElementById("scheduleTargetSelect");
  const modeLabel = document.querySelector("label[for='scheduleViewModeSelect']") || (modeSelect ? modeSelect.previousElementSibling : null);
  const btnChangePwd = document.getElementById("btnHeaderChangePwd");

  updateEditModeUI();

  if (isCurrentClassView()) {
    const cls = getCurrentClassName();
    if (userBadge) {
      userBadge.className = "role-badge badge-class";
      userBadge.textContent = `📺 教室端`;
    }
    if (userNameDisplay) userNameDisplay.textContent = `${cls} 班教室`;
    if (btnChangePwd) btnChangePwd.style.display = "none";

    if (navTasks) navTasks.style.display = "none";
    if (navWorkflow) navWorkflow.style.display = "none";
    if (navRadar) navRadar.style.display = "none";
    if (navReports) navReports.style.display = "none";
    if (navSettings) navSettings.style.display = "none";
    if (exportBtn) exportBtn.style.display = "none";
    if (resetBtn) resetBtn.style.display = "none";
    if (clearAllBtn) clearAllBtn.style.display = "none";
    
    if (modeSelect) modeSelect.style.display = "none";
    if (targetSelect) targetSelect.style.display = "none";
    if (modeLabel && modeLabel.tagName === "LABEL") modeLabel.style.display = "none";

  } else if (isCurrentAdmin()) {
    const uObj = appData.teachers.find(t => t.name === userName);
    if (userBadge) {
      userBadge.className = "role-badge badge-admin";
      userBadge.textContent = `🛡️ 最高管理權限`;
    }
    if (userNameDisplay) userNameDisplay.textContent = `${userName} [${uObj ? uObj.title : '管理者'}]`;
    if (btnChangePwd) btnChangePwd.style.display = "inline-flex";

    if (navTasks) navTasks.style.display = "inline-flex";
    if (navWorkflow) navWorkflow.style.display = "inline-flex";
    if (navRadar) navRadar.style.display = "inline-flex";
    if (navReports) navReports.style.display = "inline-flex";
    if (navSettings) navSettings.style.display = "inline-flex";
    if (exportBtn) exportBtn.style.display = "inline-flex";
    if (resetBtn) resetBtn.style.display = "inline-flex";
    if (clearAllBtn) clearAllBtn.style.display = "inline-flex";
    
    if (modeSelect) modeSelect.style.display = "inline-block";
    if (modeLabel && modeLabel.tagName === "LABEL") modeLabel.style.display = "inline-block";

    modeSelect.innerHTML = `
      <option value="personal">個人課表 (當前管理者)</option>
      <option value="teacher_select">指定個別教師課表</option>
      <option value="class">班級整週課表 (含抽離)</option>
      <option value="all_classes">全校班級總表</option>
      <option value="matrix">全校教師矩陣總表 (管理員)</option>
    `;
    modeSelect.disabled = false;

  } else {
    const uObj = appData.teachers.find(t => t.name === userName);
    if (btnChangePwd) btnChangePwd.style.display = "inline-flex";
    if (exportBtn) exportBtn.style.display = "none";
    if (resetBtn) resetBtn.style.display = "none";
    if (clearAllBtn) clearAllBtn.style.display = "none";
    if (navTasks) navTasks.style.display = "inline-flex";
    if (navWorkflow) navWorkflow.style.display = "inline-flex";
    if (navRadar) navRadar.style.display = "none";
    if (navReports) navReports.style.display = "none";
    if (navSettings) navSettings.style.display = "none";

    if (modeSelect) modeSelect.style.display = "inline-block";
    if (modeLabel && modeLabel.tagName === "LABEL") modeLabel.style.display = "inline-block";

    if (isCurrentHomeroomTeacher()) {
      const myClass = HOMEROOM_MAP[appData.currentUser];
      if (userBadge) {
        userBadge.className = "role-badge badge-teacher";
        userBadge.textContent = `👨‍🏫 班導師`;
      }
      if (userNameDisplay) userNameDisplay.textContent = `${userName} [${myClass} 班導師]`;
      modeSelect.innerHTML = `
        <option value="personal">個人授課課表 (本人)</option>
        <option value="my_homeroom">🏫 ${myClass} 班每週課表 (本班導師視角)</option>
      `;
      modeSelect.disabled = false;

    } else if (isCurrentSpecialEdTeacher()) {
      if (userBadge) {
        userBadge.className = "role-badge badge-teacher";
        userBadge.textContent = `🌿 特教教師`;
      }
      if (userNameDisplay) userNameDisplay.textContent = `${userName} [特教資源班]`;
      modeSelect.innerHTML = `
        <option value="personal">個人授課課表 (本人)</option>
        <option value="resource_class">🌿 特教資源班 (全校抽離總表)</option>
        <option value="sp_701">學701 抽離課表</option>
        <option value="sp_801">學801 抽離課表</option>
      `;
      modeSelect.disabled = false;

    } else {
      if (userBadge) {
        userBadge.className = "role-badge badge-teacher";
        userBadge.textContent = `👤 任課教師`;
      }
      if (userNameDisplay) userNameDisplay.textContent = `${userName} [${uObj ? uObj.title : '教師'}]`;
      modeSelect.innerHTML = `<option value="personal">個人授課課表 (本人)</option>`;
      modeSelect.disabled = true;
    }
  }

  renderAllViews();
}

function switchTab(tabId) {
  if (!isCurrentAdmin() && (tabId === "tabRadar" || tabId === "tabReports" || tabId === "tabSettings")) {
    tabId = "tabSchedule";
  }

  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(el => el.classList.remove("active"));

  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.add("active");

  const btnMap = {
    tabSchedule: "navBtnSchedule",
    tabTasks: "navBtnTasks",
    tabWorkflow: "navBtnWorkflow",
    tabRadar: "navBtnRadar",
    tabReports: "navBtnReports",
    tabSettings: "navBtnSettings"
  };
  if (btnMap[tabId]) {
    const b = document.getElementById(btnMap[tabId]);
    if (b) b.classList.add("active");
  }

  if (tabId === "tabSchedule") renderSchedule();
  if (tabId === "tabTasks") renderTasks();
  if (tabId === "tabWorkflow") renderWorkflow();
  if (tabId === "tabRadar") setupRadar();
  if (tabId === "tabReports") renderCurrentReport();
  if (tabId === "tabSettings") renderRosterTable();
}

function renderAllViews() {
  renderSchedule();
  renderTasks();
  renderWorkflow();
  if (isCurrentAdmin()) {
    setupRadar();
    renderCurrentReport();
    renderRosterTable();
  }
}

// ==========================================================================
// 模組 1: 課表渲染 (75px 等高左右分割)
// ==========================================================================
function changeScheduleViewMode(mode) {
  const targetSelect = document.getElementById("scheduleTargetSelect");
  if (!targetSelect) return;
  targetSelect.innerHTML = "";

  if (mode === "teacher_select" && isCurrentAdmin()) {
    targetSelect.style.display = "inline-block";
    appData.teachers.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.name;
      opt.textContent = `${t.name} (${t.title})`;
      if (t.name === appData.currentUser) opt.selected = true;
      targetSelect.appendChild(opt);
    });
  } else if (mode === "class" && isCurrentAdmin()) {
    targetSelect.style.display = "inline-block";
    getSafeClasses().forEach(cls => {
      const opt = document.createElement("option");
      opt.value = cls;
      opt.textContent = `${cls} 班課表`;
      targetSelect.appendChild(opt);
    });
    const spOpt = document.createElement("option");
    spOpt.value = "RESOURCE_CLASS";
    spOpt.textContent = "🌿 特教資源班 (全校抽離總表)";
    targetSelect.appendChild(spOpt);
  } else {
    targetSelect.style.display = "none";
  }
  renderSchedule();
}

function renderSchedule() {
  const container = document.getElementById("scheduleContainer");
  const title = document.getElementById("scheduleViewTitle");
  const weekSelect = document.getElementById("scheduleWeekSelect");
  const selectedWeek = weekSelect ? weekSelect.value : "base";

  if (!container || !title) return;

  const weekSuffix = (selectedWeek === "base") ? "【常態基準】" : `【第 ${selectedWeek} 週】`;

  if (isCurrentClassView()) {
    const cls = getCurrentClassName();
    title.textContent = `📺 飛沙國中 ${cls} 班教室課表 ${weekSuffix}`;
    container.innerHTML = generateSingleClassScheduleHTML(cls, selectedWeek);
    return;
  }

  const modeSelect = document.getElementById("scheduleViewModeSelect");
  const targetSelect = document.getElementById("scheduleTargetSelect");
  const mode = (modeSelect && modeSelect.style.display !== "none") ? modeSelect.value : "personal";

  if (mode === "personal") {
    title.textContent = `📅 ${appData.currentUser} 老師授課課表 ${weekSuffix}`;
    container.innerHTML = generateTeacherScheduleHTML(appData.currentUser, selectedWeek);
  } else if (mode === "my_homeroom" && isCurrentHomeroomTeacher()) {
    const myClass = HOMEROOM_MAP[appData.currentUser];
    title.textContent = `🏫 ${myClass} 班授課課表 ${weekSuffix}`;
    container.innerHTML = generateSingleClassScheduleHTML(myClass, selectedWeek);
  } else if (mode === "teacher_select" && isCurrentAdmin()) {
    const tName = targetSelect ? targetSelect.value : appData.currentUser;
    title.textContent = `📅 ${tName} 老師授課課表 ${weekSuffix}`;
    container.innerHTML = generateTeacherScheduleHTML(tName, selectedWeek);
  } else if (mode === "class" && isCurrentAdmin()) {
    const cls = targetSelect ? targetSelect.value : "701";
    title.textContent = `🏫 ${cls} 班授課課表 ${weekSuffix}`;
    container.innerHTML = generateSingleClassScheduleHTML(cls, selectedWeek);
  } else if (mode === "matrix" && isCurrentAdmin()) {
    title.textContent = "全校教師矩陣總表 (管理員專屬)";
    container.innerHTML = generateFullMatrixHTML();
  } else {
    title.textContent = `📅 ${appData.currentUser} 老師授課課表 ${weekSuffix}`;
    container.innerHTML = generateTeacherScheduleHTML(appData.currentUser, selectedWeek);
  }
}

function generateSingleClassScheduleHTML(classId, selectedWeek) {
  const days = [1, 2, 3, 4, 5];
  const dayNames = ["週一", "週二", "週三", "週四", "週五"];
  const canEdit = isCurrentAdmin() && isEditModeActive;
  const currentWeekDates = (selectedWeek !== "base") ? getWeekDates(parseInt(selectedWeek)) : null;

  let html = `<table class="schedule-grid"><thead><tr><th class="time-col">節次 / 時間</th>`;
  days.forEach((dayNum, idx) => {
    const dateSub = currentWeekDates ? `<br><small style="font-weight:normal; color:#475569;">${currentWeekDates[dayNum].slice(5).replace("-", "/")}</small>` : "";
    html += `<th>${dayNames[idx]}${dateSub}</th>`;
  });
  html += `</tr></thead><tbody>`;

  getSafePeriods().forEach(p => {
    html += `<tr><td class="time-col"><strong>${p.name}</strong><br><small style="color:#64748b;">${p.time}</small></td>`;
    days.forEach(d => {
      let regularCourses = appData.schedule.filter(s => s.class_id === classId && s.day === d && s.period === p.id);
      let specialEdCourses = appData.schedule.filter(s => s.class_id === "學" + classId && s.day === d && s.period === p.id);

      let subTasks = [];
      if (currentWeekDates) {
        const targetDate = currentWeekDates[d];
        subTasks = appData.tasks.filter(t => t.classId === classId && t.period === p.id && isSameDate(t.date, targetDate));
      }

      let cellContent = "";

      if (regularCourses.length > 0 && specialEdCourses.length > 0) {
        const regItem = regularCourses[0];
        const spItem = specialEdCourses[0];
        const activeSub = subTasks.length > 0 ? subTasks[0] : null;

        const regClick = canEdit ? `onclick="openEditCourseModal('${regItem.id}')" style="cursor:pointer;"` : "";
        const spClick = canEdit ? `onclick="openEditCourseModal('${spItem.id}')" style="cursor:pointer;"` : "";

        let leftSideHTML = "";
        if (activeSub) {
          leftSideHTML = `
            <div class="split-side split-sub" ${regClick}>
              <span class="tag-mini tag-orange">代課</span>
              <div class="subject-mini">${activeSub.subject}</div>
              <div class="teacher-mini" style="font-weight:700;">${activeSub.subTeacher}</div>
              <div class="sub-mini">原:${activeSub.originalTeacher}</div>
            </div>
          `;
        } else {
          leftSideHTML = `
            <div class="split-side split-regular" ${regClick}>
              <span class="tag-mini tag-blue">原班</span>
              <div class="subject-mini">${regItem.subject}</div>
              <div class="teacher-mini">${regItem.teacher}</div>
            </div>
          `;
        }

        const rightSideHTML = `
          <div class="split-side split-special" ${spClick}>
            <span class="tag-mini tag-green">🌱 抽離</span>
            <div class="subject-mini">${spItem.subject}</div>
            <div class="teacher-mini">${spItem.teacher}</div>
          </div>
        `;

        cellContent = `
          <div class="split-row-container">
            ${leftSideHTML}
            ${rightSideHTML}
          </div>
        `;

      } else if (regularCourses.length > 0) {
        const item = regularCourses[0];
        const activeSub = subTasks.length > 0 ? subTasks[0] : null;

        if (activeSub) {
          cellContent = `
            <div class="period-cell cell-sub" title="代課安排">
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <span class="tag-sub">代課</span>
                <strong style="color:#c2410c; font-size:0.85rem;">${activeSub.subject}</strong>
              </div>
              <div style="font-weight:700; font-size:0.85rem; margin-top:1px;">${activeSub.subTeacher} 老師</div>
              <div style="font-size:0.7rem; color:#64748b; margin-top:1px; border-top:1px dashed #fdba74; padding-top:1px; width:100%;">
                原：${activeSub.originalTeacher}
              </div>
            </div>
          `;
        } else {
          let cellCls = item.is_afterschool ? "cell-afterschool" : (item.is_overtime ? "cell-overtime" : "cell-course");
          const clickAttr = canEdit ? `onclick="openEditCourseModal('${item.id}')" style="cursor:pointer;" title="點擊修改課堂"` : "";

          cellContent += `
            <div class="period-cell ${cellCls}" ${clickAttr}>
              <strong>${item.subject}</strong>
              <span style="font-size:0.8rem;">${item.teacher}</span>
              ${item.is_overtime && !isCurrentClassView() ? `<span class="tag-overtime">兼課</span>` : ''}
              ${item.is_afterschool ? `<span class="tag-afterschool">第8節輔導</span>` : ''}
              ${canEdit ? `<span style="font-size:0.65rem; color:#059669; margin-top:1px;">✏️ 點擊修改</span>` : ''}
            </div>
          `;
        }

      } else if (specialEdCourses.length > 0) {
        const spItem = specialEdCourses[0];
        const clickAttr = canEdit ? `onclick="openEditCourseModal('${spItem.id}')" style="cursor:pointer;"` : "";
        cellContent += `
          <div class="period-cell cell-special-ed" ${clickAttr}>
            <span class="tag-overtime" style="background:#10b981; font-weight:700; font-size:0.65rem;">🌱 特教抽離 (${spItem.class_id})</span>
            <strong>${spItem.subject}</strong>
            <span style="font-size:0.8rem;">${spItem.teacher}</span>
          </div>
        `;
      }

      if (canEdit && !cellContent) {
        cellContent = `
          <button class="btn btn-secondary btn-sm" style="font-size:0.7rem; padding:2px 4px; width:100%; border:1px dashed #94a3b8; height:100%;" onclick="openAddCourseModal('${classId}', ${d}, ${p.id}, '')">
            ➕ 加課/抽離
          </button>
        `;
      }

      if (cellContent) {
        html += `<td><div class="cell-wrapper">${cellContent}</div></td>`;
      } else {
        html += `<td><div class="cell-empty">—</div></td>`;
      }
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

function generateTeacherScheduleHTML(teacherName, selectedWeek) {
  const days = [1, 2, 3, 4, 5];
  const dayNames = ["週一", "週二", "週三", "週四", "週五"];
  const canEdit = isCurrentAdmin() && isEditModeActive;
  const currentWeekDates = (selectedWeek !== "base") ? getWeekDates(parseInt(selectedWeek)) : null;

  let html = `<table class="schedule-grid"><thead><tr><th class="time-col">節次 / 時間</th>`;
  days.forEach((dayNum, idx) => {
    const dateSub = currentWeekDates ? `<br><small style="font-weight:normal; color:#475569;">${currentWeekDates[dayNum].slice(5).replace("-", "/")}</small>` : "";
    html += `<th>${dayNames[idx]}${dateSub}</th>`;
  });
  html += `</tr></thead><tbody>`;

  getSafePeriods().forEach(p => {
    html += `<tr><td class="time-col"><strong>${p.name}</strong><br><small style="color:#64748b;">${p.time}</small></td>`;
    days.forEach(d => {
      const items = appData.schedule.filter(s => s.teacher === teacherName && s.day === d && s.period === p.id);
      let subTasks = [];
      let beSubbeds = [];
      if (currentWeekDates) {
        const targetDate = currentWeekDates[d];
        subTasks = appData.tasks.filter(t => t.subTeacher === teacherName && t.period === p.id && isSameDate(t.date, targetDate));
        beSubbeds = appData.tasks.filter(t => t.originalTeacher === teacherName && t.period === p.id && isSameDate(t.date, targetDate));
      }

      let cellContent = "";

      if (subTasks.length > 0) {
        subTasks.forEach(st => {
          cellContent += `
            <div class="period-cell cell-sub">
              <span class="tag-sub">代課</span>
              <strong>${st.classId} ${st.subject}</strong>
              <div style="font-size:0.75rem; color:#64748b; margin-top:1px;">(受代：${st.originalTeacher})</div>
            </div>
          `;
        });
      }

      if (items.length > 0) {
        items.forEach(item => {
          const isSubbed = beSubbeds.find(bs => bs.classId === item.class_id && bs.subject === item.subject);
          if (isSubbed) {
            cellContent += `
              <div class="period-cell cell-course" style="border:1.5px dashed #f97316; background:#fffaf0; opacity:0.85;">
                <span style="text-decoration:line-through; color:#94a3b8;">${item.class_id} ${item.subject}</span>
                <div style="font-size:0.75rem; color:#c2410c; font-weight:700; margin-top:1px;">(由 ${isSubbed.subTeacher} 老師代課)</div>
              </div>
            `;
          } else {
            const isSpecialEd = item.class_id.startsWith("學") || item.is_special_ed;
            let cellCls = isSpecialEd ? "cell-course" : (item.is_afterschool ? "cell-afterschool" : (item.is_overtime ? "cell-overtime" : "cell-course"));
            const clickAttr = canEdit ? `onclick="openEditCourseModal('${item.id}')" style="cursor:pointer;"` : "";

            cellContent += `
              <div class="period-cell ${cellCls}" ${isSpecialEd ? 'style="background:#ecfdf5; border:1.5px solid #10b981; color:#065f46;"' : ''} ${clickAttr}>
                ${isSpecialEd ? `<span class="tag-overtime" style="background:#10b981;">🌱 特教 (${item.class_id})</span>` : ''}
                <strong>${item.class_id} ${item.subject}</strong>
                ${item.is_overtime ? `<span class="tag-overtime">兼課超鐘點</span>` : ''}
                ${item.is_afterschool ? `<span class="tag-afterschool">第8節輔導</span>` : ''}
              </div>
            `;
          }
        });
      }

      if (canEdit && !cellContent) {
        cellContent += `<button class="btn btn-secondary btn-sm" style="font-size:0.7rem; padding:2px 4px; width:100%; border:1px dashed #94a3b8; height:100%;" onclick="openAddCourseModal('', ${d}, ${p.id}, '${teacherName}')">➕ 加課</button>`;
      }

      if (cellContent) {
        html += `<td><div class="cell-wrapper">${cellContent}</div></td>`;
      } else {
        html += `<td><div class="cell-empty">—</div></td>`;
      }
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

// ==========================================================================
// 模組 2: 代課清冊 (含一鍵清空防呆機制)
// ==========================================================================
function renderTasks() {
  const tbody = document.getElementById("taskTableBody");
  const notice = document.getElementById("taskScopeNotice");
  const addBtn = document.getElementById("btnOpenNewSubModal");
  const uploadBtn = document.getElementById("btnUploadTaskCsv");
  const clearAllBtn = document.getElementById("btnClearAllTasks");
  const title = document.getElementById("taskViewTitle");
  if (!tbody) return;
  tbody.innerHTML = "";

  let list = [];
  if (isCurrentAdmin()) {
    list = appData.tasks;
    const testCount = list.filter(isTestItem).length;
    if (notice) {
      notice.innerHTML = `顯示全校公差假排代總冊 (共 ${list.length} 筆${testCount > 0 ? `，<strong style="color:#b91c1c;">含 ${testCount} 筆測試/範例</strong>` : ''})`;
    }
    if (title) title.textContent = "公課排代任務與受代明細 (全校總冊)";
    if (addBtn) addBtn.style.display = "inline-flex";
    if (uploadBtn) uploadBtn.style.display = "inline-flex";
    if (clearAllBtn) clearAllBtn.style.display = "inline-flex";
  } else {
    list = appData.tasks.filter(t => t.subTeacher === appData.currentUser || t.originalTeacher === appData.currentUser);
    if (notice) notice.textContent = `僅列出與 ${appData.currentUser} 相關之代課/受代紀錄 (隱私保護)`;
    if (title) title.textContent = `個人代課任務與被代明細 (${appData.currentUser} 老師)`;
    if (addBtn) addBtn.style.display = "none";
    if (uploadBtn) uploadBtn.style.display = "none";
    if (clearAllBtn) clearAllBtn.style.display = "none";
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding: 2.5rem; color:#64748b;">目前清冊已完全清空，查無代課紀錄 (可點選右上角「📥 下載空白清冊範本」填寫後上傳)</td></tr>`;
    return;
  }

  list.forEach((t) => {
    const isTest = isTestItem(t);
    const tr = document.createElement("tr");
    if (isTest) tr.className = "row-test-sample";

    tr.innerHTML = `
      <td><strong style="color:#15803d;">${t.subTeacher}</strong></td>
      <td>${t.title || '教師'}</td>
      <td style="color:#0369a1; font-size:0.8rem; text-align:left;">${t.docNo || '—'}</td>
      <td>${t.dateRange || t.date}</td>
      <td>${t.periodsCount !== undefined ? t.periodsCount : 1}</td>
      <td>$${t.rate !== undefined ? t.rate : 455}</td>
      <td>${t.tutorFee ? '$' + t.tutorFee : '$0'}</td>
      <td><strong>$${t.amount}</strong></td>
      <td>${t.originalTeacher}</td>
      <td style="text-align:left;">
        ${isTest ? '<span class="role-badge badge-test-alert" style="font-size:0.65rem; padding:1px 4px; margin-right:3px;">測試範例</span>' : ''}
        ${t.reason}
      </td>
      <td style="text-align:left; font-size:0.8rem;"><strong>${t.note || (t.classId + ' ' + (t.period ? '第' + t.period + '節' : '') + ' ' + t.subject)}</strong></td>
      <td>
        ${isTest 
          ? '<span class="role-badge badge-test-alert">⚠️ 測試資料</span>' 
          : `<span class="role-badge badge-teacher">${t.status || '已核銷'}</span>`}
      </td>
      <td class="no-print">
        ${isCurrentAdmin() ? `<button class="btn btn-danger btn-sm" onclick="deleteTask('${t.id}')">刪除</button>` : `<span style="color:#94a3b8;">唯讀</span>`}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 核心：一鍵清空防呆 Modal 開關與執行
function openClearTasksModal() {
  if (!isCurrentAdmin()) {
    alert("只有管理員有權限清空代課清冊！");
    return;
  }
  const modal = document.getElementById("clearTasksModal");
  const countSpan = document.getElementById("clearTasksCount");
  const pwdInput = document.getElementById("clearTasksPwdInput");
  const err = document.getElementById("clearTasksErrorMsg");
  const btn = document.getElementById("btnToggleClearPwd");

  if (countSpan) countSpan.textContent = appData.tasks ? appData.tasks.length : 0;
  if (pwdInput) {
    pwdInput.value = "";
    pwdInput.type = "password";
  }
  if (btn) btn.textContent = "🙈";
  if (err) err.style.display = "none";
  if (modal) modal.classList.add("active");
}

function closeClearTasksModal() {
  const modal = document.getElementById("clearTasksModal");
  if (modal) modal.classList.remove("active");
}

function toggleClearPasswordVisibility() {
  const pwdInput = document.getElementById("clearTasksPwdInput");
  const btn = document.getElementById("btnToggleClearPwd");
  if (!pwdInput) return;
  if (pwdInput.type === "password") {
    pwdInput.type = "text";
    if (btn) btn.textContent = "👁️";
  } else {
    pwdInput.type = "password";
    if (btn) btn.textContent = "🙈";
  }
}

function executeClearAllTasks() {
  if (!isCurrentAdmin()) return;
  const pwdInput = document.getElementById("clearTasksPwdInput");
  const err = document.getElementById("clearTasksErrorMsg");
  const inputPwd = pwdInput ? pwdInput.value.trim() : "";

  const curUserObj = appData.teachers.find(t => t.name === appData.currentUser);
  const isValid = ADMIN_SECURITY_PASSWORDS.includes(inputPwd) || (curUserObj && curUserObj.password === inputPwd);

  if (!isValid) {
    if (err) {
      err.textContent = "❌ 管理防護密碼錯誤，拒絕清空！";
      err.style.display = "block";
    }
    if (pwdInput) {
      pwdInput.value = "";
      pwdInput.focus();
    }
    return;
  }

  const prevCount = appData.tasks ? appData.tasks.length : 0;
  appData.tasks = [];
  saveToLocalStorage();
  closeClearTasksModal();
  renderAllViews();
  alert(`✅ 已成功全數清空代課清冊（共刪除 ${prevCount} 筆資料）！\n目前清冊已完全重置為 0 筆乾淨狀態。`);
}

function downloadTaskCsvTemplate() {
  let csv = "\uFEFF";
  csv += "代課人姓名,職稱,核准文號,代課起訖日期,代課節數,每節鐘點費,代理導師費,應領金額,被代課教師,代課事由,備註(班級 節 代導費用)\r\n";
  
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "代課鐘點費請領清冊_空白標準範本.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  alert("📥 空白清冊範本已下載成功！請直接使用 Excel 填入真實代課資料後上傳。");
}

function triggerTaskCsvUpload() {
  const fileInput = document.getElementById("taskCsvFileInput");
  if (fileInput) {
    fileInput.value = "";
    fileInput.click();
  }
}

// 智慧動態欄位映射解析 (自動跳過標題、忽略合計簽核行、彈出確認預覽)
function handleTaskCsvUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const text = e.target.result;
      const allLines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith("#"));
      if (allLines.length < 2) {
        alert("⚠️ CSV 內容為空或無有效資料列！");
        return;
      }

      let headerIdx = -1;
      let colMap = {};

      for (let i = 0; i < Math.min(allLines.length, 10); i++) {
        const row = allLines[i].replace(/"/g, "");
        if ((row.includes("代課人") || row.includes("代課教師") || row.includes("姓名")) && (row.includes("節") || row.includes("金額") || row.includes("事由"))) {
          headerIdx = i;
          const headers = allLines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"\vert{}"$/g, "").trim());
          headers.forEach((h, idx) => {
            if (h.includes("代課人") || h.includes("姓名")) colMap.subTeacher = idx;
            else if (h.includes("職稱")) colMap.title = idx;
            else if (h.includes("文號") || h.includes("核准")) colMap.docNo = idx;
            else if (h.includes("起訖") || h.includes("日期")) colMap.dateRange = idx;
            else if (h.includes("節數")) colMap.periodsCount = idx;
            else if (h.includes("鐘點") || h.includes("單價")) colMap.rate = idx;
            else if (h.includes("導師費") || h.includes("代導費")) colMap.tutorFee = idx;
            else if (h.includes("應領") || h.includes("金額")) colMap.amount = idx;
            else if (h.includes("被代")) colMap.origTeacher = idx;
            else if (h.includes("事由") || h.includes("假別")) colMap.reason = idx;
            else if (h.includes("備註") || h.includes("班級")) colMap.note = idx;
          });
          break;
        }
      }

      if (headerIdx === -1) {
        headerIdx = 0;
        colMap = { subTeacher: 0, title: 1, docNo: 2, dateRange: 3, periodsCount: 4, rate: 5, tutorFee: 6, amount: 7, origTeacher: 8, reason: 9, note: 10 };
      }

      const parsedList = [];
      let skippedRows = 0;

      for (let i = headerIdx + 1; i < allLines.length; i++) {
        const rawLine = allLines[i];
        if (rawLine.startsWith("合計") || rawLine.startsWith("總計") || rawLine.startsWith("新臺幣") || rawLine.includes("製表")) {
          break;
        }

        const parts = rawLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"\vert{}"$/g, "").trim());
        const subName = normalizeTeacherName(parts[colMap.subTeacher] || "");

        if (!subName || subName.includes("請領清冊") || subName.includes("國民中學") || subName.includes("學校")) {
          skippedRows++;
          continue;
        }

        const staffTitle = parts[colMap.title] || "教師";
        const docNo = parts[colMap.docNo] || "—";
        const dateRange = parts[colMap.dateRange] || "";
        const periodsCount = parseInt(parts[colMap.periodsCount]) || 0;
        const rate = parseInt(parts[colMap.rate]) || 0;
        const tutorFee = parseInt(parts[colMap.tutorFee]) || 0;
        const amount = parseInt(parts[colMap.amount]) || (periodsCount * rate + tutorFee);
        const origTeacher = normalizeTeacherName(parts[colMap.origTeacher] || "");
        const reason = parts[colMap.reason] || "公假派代";
        const note = parts[colMap.note] || "";

        let classId = "701";
        if (note.includes("801")) classId = "801";
        else if (note.includes("901")) classId = "901";
        else if (note.includes("902")) classId = "902";
        else if (note.includes("學701")) classId = "學701";
        else if (note.includes("學801")) classId = "學801";

        let period = 1;
        const periodMatch = note.match(/第?\s*([0-8])\s*節/);
        if (periodMatch) period = parseInt(periodMatch[1]);

        let date = dateRange;
        if (dateRange.includes("-")) {
          const rawD = dateRange.split("-")[0].trim();
          if (rawD.length === 4) date = `2026-${rawD.slice(0, 2)}-${rawD.slice(2)}`;
        }

        parsedList.push({
          id: `TASK_CSV_${Date.now()}_${i}`,
          subTeacher: subName,
          title: staffTitle,
          docNo: docNo,
          dateRange: dateRange,
          date: date,
          periodsCount: periodsCount,
          rate: rate,
          tutorFee: tutorFee,
          amount: amount,
          originalTeacher: origTeacher,
          reason: reason,
          note: note,
          classId: classId,
          period: period,
          subject: note.split(" ").pop() || "課堂授課",
          isTest: isTestItem({ subTeacher: subName, reason, note, docNo }),
          status: "已核銷"
        });
      }

      if (parsedList.length === 0) {
        alert("⚠️ 未能辨識出任何有效代課資料，請檢查 CSV 格式是否符合標準！");
        return;
      }

      showTaskImportPreview(parsedList, skippedRows);

    } catch (err) {
      alert("❌ 檔案讀取失敗：" + err.message);
    }
  };
  reader.readAsText(file, "UTF-8");
}

function showTaskImportPreview(list, skippedCount) {
  pendingImportTasks = list;
  const modal = document.getElementById("csvPreviewModal");
  const summary = document.getElementById("csvPreviewSummary");
  const tbody = document.getElementById("csvPreviewTableBody");
  if (!modal || !summary || !tbody) return;

  const testCount = list.filter(isTestItem).length;
  summary.innerHTML = `
    ✅ <strong>解析成功：</strong>共讀取 <strong>${list.length}</strong> 筆有效紀錄（已自動濾除 ${skippedCount} 行標題/雜訊列）。<br>
    ${testCount > 0 ? `<span style="color:#dc2626; font-weight:700;">⚠️ 系統偵測到其中有 ${testCount} 筆含有「測試/範例」標記，匯入後將特別警示！</span>` : '<span style="color:#16a34a; font-weight:700;">✨ 欄位已智慧對齊，無格式錯位問題。</span>'}
  `;

  tbody.innerHTML = "";
  list.slice(0, 4).forEach((t, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td><strong>${t.subTeacher}</strong></td>
      <td>${t.title}</td>
      <td style="color:#0369a1; font-size:0.75rem;">${t.docNo}</td>
      <td>${t.dateRange}</td>
      <td>${t.periodsCount}</td>
      <td><strong>$${t.amount}</strong></td>
      <td>${t.originalTeacher}</td>
      <td style="font-size:0.75rem;">${t.reason}</td>
      <td style="font-size:0.75rem;">${t.note}</td>
    `;
    tbody.appendChild(tr);
  });

  modal.classList.add("active");
}

function closeTaskImportPreview() {
  const modal = document.getElementById("csvPreviewModal");
  if (modal) modal.classList.remove("active");
  pendingImportTasks = [];
}

function confirmTaskCsvImport() {
  if (!pendingImportTasks || pendingImportTasks.length === 0) return;
  appData.tasks = pendingImportTasks;
  saveToLocalStorage();
  closeTaskImportPreview();
  renderTasks();
  renderSchedule();
  renderCurrentReport();
  alert(`✅ 成功匯入 ${appData.tasks.length} 筆代課清冊！已同步更新課表與月結造冊。`);
}

function openNewSubModal() {
  if (!isCurrentAdmin()) return;
  const origSelect = document.getElementById("modalSubOriginalTeacher");
  const targetSelect = document.getElementById("modalSubTargetTeacher");
  if (!origSelect || !targetSelect) return;
  origSelect.innerHTML = "";
  targetSelect.innerHTML = "";

  appData.teachers.forEach(t => {
    const opt1 = document.createElement("option");
    opt1.value = t.name;
    opt1.textContent = `${t.name} (${t.title})`;
    origSelect.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = t.name;
    opt2.textContent = `${t.name} (${t.title})`;
    targetSelect.appendChild(opt2);
  });

  const checkIsTest = document.getElementById("modalSubIsTest");
  if (checkIsTest) checkIsTest.checked = false;

  document.getElementById("newSubModal").classList.add("active");
}

function closeNewSubModal() {
  document.getElementById("newSubModal").classList.remove("active");
}

function saveNewSubTask() {
  const date = document.getElementById("modalSubDate").value;
  const classId = document.getElementById("modalSubClass").value;
  const period = parseInt(document.getElementById("modalSubPeriod").value);
  const subject = document.getElementById("modalSubSubject").value.trim() || "課堂授課";
  const origTeacher = document.getElementById("modalSubOriginalTeacher").value;
  const targetTeacher = document.getElementById("modalSubTargetTeacher").value;
  const docNo = document.getElementById("modalSubDocNo").value.trim() || "—";
  let reason = document.getElementById("modalSubReason").value.trim() || "公假派代";
  const isTest = document.getElementById("modalSubIsTest") ? document.getElementById("modalSubIsTest").checked : false;

  if (origTeacher === targetTeacher) {
    alert("原授課教師與代課教師不能為同一人！");
    return;
  }

  if (isTest && !reason.includes("【測試】")) {
    reason = `【測試】${reason}`;
  }

  const tObj = appData.teachers.find(t => t.name === targetTeacher);
  const rate = period === 8 ? 450 : 455;
  const newTask = {
    id: `TASK_${Date.now()}`,
    subTeacher: targetTeacher,
    title: tObj ? tObj.title : "教師",
    docNo: isTest ? `【測試】${docNo}` : docNo,
    dateRange: date.slice(5).replace("-", ""),
    date: date,
    periodsCount: 1,
    rate: rate,
    tutorFee: 0,
    amount: rate,
    originalTeacher: origTeacher,
    reason: reason,
    note: `${classId} 第${period}節 ${subject}`,
    classId: classId,
    period: period,
    subject: subject,
    isTest: isTest,
    status: isTest ? "測試暫存" : "已排代"
  };

  appData.tasks.unshift(newTask);
  saveToLocalStorage();
  closeNewSubModal();
  alert(isTest ? "⚠️ 測試紀錄新增成功！已自動標註【測試】。" : "✅ 新增代課紀錄成功！");
  renderAllViews();
}

function deleteTask(id) {
  if (!isCurrentAdmin()) return;
  if (!confirm("確定要刪除此筆代課紀錄嗎？")) return;
  appData.tasks = appData.tasks.filter(t => t.id !== id);
  saveToLocalStorage();
  renderAllViews();
}

// ==========================================================================
// 模組 5: 月結造冊中心
// ==========================================================================
function renderCurrentReport() {
  if (!isCurrentAdmin()) return;
  const container = document.getElementById("officialReportContainer");
  if (!container) return;
  
  let totalPeriods = 0;
  let totalTutorFee = 0;
  let grandTotal = 0;

  let html = `
    <div style="text-align:center; margin-bottom:1.5rem;">
      <h2 style="font-size:1.5rem; font-weight:800; letter-spacing: 2px;">雲林縣立飛沙國民中學</h2>
      <h3 style="font-size:1.2rem; font-weight:700;">115 學年度第 1 學期 (9月份) 公課排代鐘點費核銷清冊 (公文標準)</h3>
    </div>
    <table class="custom-table" style="border:1px solid #000; width:100%; font-size:0.8rem;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th>代課人姓名</th><th>職稱</th><th>核准文號</th><th>代課起訖日期</th><th>代課節數</th><th>每節鐘點費</th><th>代理導師費</th><th>應領金額</th><th>被代課教師</th><th>代課事由</th><th>備註(班級 節 代導費用)</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (appData.tasks.length === 0) {
    html += `<tr><td colspan="11" style="text-align:center; padding:2rem; color:#64748b;">目前尚無已核准之代課核銷紀錄</td></tr>`;
  } else {
    appData.tasks.forEach((t) => {
      const isTest = isTestItem(t);
      totalPeriods += (t.periodsCount !== undefined ? t.periodsCount : 1);
      totalTutorFee += (t.tutorFee || 0);
      grandTotal += (t.amount || 0);

      html += `
        <tr class="${isTest ? 'row-test-sample' : ''}">
          <td><strong>${t.subTeacher}</strong></td>
          <td>${t.title || '教師'}</td>
          <td style="text-align:left; font-size:0.75rem;">${t.docNo || '—'}</td>
          <td>${t.dateRange || t.date}</td>
          <td>${t.periodsCount !== undefined ? t.periodsCount : 1}</td>
          <td>$${t.rate || 455}</td>
          <td>${t.tutorFee ? '$' + t.tutorFee : '$0'}</td>
          <td><strong>$${t.amount}</strong></td>
          <td>${t.originalTeacher}</td>
          <td style="text-align:left;">
            ${isTest ? '<span class="role-badge badge-test-alert" style="font-size:0.65rem; padding:1px 3px;">測試</span> ' : ''}
            ${t.reason}
          </td>
          <td style="text-align:left; font-size:0.75rem;">${t.note || (t.classId + ' ' + t.subject)}</td>
        </tr>
      `;
    });
  }

  html += `
      <tr style="background:#f8fafc; font-weight:700;">
        <td colspan="4" style="text-align:right;">合計：</td>
        <td>${totalPeriods} 節</td>
        <td>—</td>
        <td>$${totalTutorFee}</td>
        <td style="color:#b91c1c;">$${grandTotal.toLocaleString()}</td>
        <td colspan="3"></td>
      </tr>
    </tbody>
  </table>
  <div style="margin-top:0.75rem; font-weight:700; font-size:1rem; text-align:right;">
    核銷總金額：新臺幣 ${grandTotal > 0 ? grandTotal.toLocaleString() + ' 元整' : '零元整'}
  </div>
  `;

  html += `
    <table class="official-sign-boxes">
      <thead>
        <tr>
          <th>製表</th>
          <th>教導主任</th>
          <th>出納</th>
          <th>人事主任</th>
          <th>會計主任</th>
          <th>校長</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>(簽章)</td>
          <td>(簽章)</td>
          <td>(簽章)</td>
          <td>(簽章)</td>
          <td>(簽章)</td>
          <td>(簽章)</td>
        </tr>
      </tbody>
    </table>
  `;
  container.innerHTML = html;
}

// 模組 3: 自辦調課
function renderWorkflow() {
  const tbody = document.getElementById("workflowTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (appData.swaps.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#64748b; padding:1.5rem;">目前無進行中之自辦調代課案件</td></tr>`;
    return;
  }
}

// 模組 4: 排代雷達
function setupRadar() {
  const tSelect = document.getElementById("radarTeacherSelect");
  if (tSelect && tSelect.options.length === 0) {
    appData.teachers.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.name;
      opt.textContent = `${t.name} (${t.title} - ${t.subject})`;
      tSelect.appendChild(opt);
    });
  }
}

// 模組 6: 名冊管理
function renderRosterTable() {
  if (!isCurrentAdmin()) return;
  const tbody = document.getElementById("rosterTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  appData.teachers.forEach((t, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td><span class="role-badge badge-class">${t.dept || '教導處'}</span></td>
      <td>${t.title}</td>
      <td><strong>${t.name}</strong> ${t.alias ? `<small style="color:#64748b;">(別名:${t.alias})</small>` : ""}</td>
      <td>${t.subject}</td>
      <td>${t.overtimeWeekly > 0 ? `<strong style="color:#d97706;">每週 ${t.overtimeWeekly} 節</strong>` : "0 節"}</td>
      <td>${t.isSubTutorQualified ? `<span style="color:#16a34a; font-weight:700;">✅ 專任代導</span>` : "否"}</td>
      <td><span class="role-badge ${t.role === 'admin' ? 'badge-admin' : 'badge-teacher'}">${t.role === 'admin' ? '最高管理員' : '一般教師'}</span></td>
      <td><code>••••••</code></td>
      <td class="no-print">
        <button class="btn btn-secondary btn-sm" onclick="openAdminEditTeacherModal('${t.id}')">✏️ 編修</button>
        <button class="btn btn-warning btn-sm" onclick="resetTeacherPasswordDefault('${t.id}')" title="還原預設密碼">🔄 重設</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openEditCourseModal(courseId) {
  if (!isCurrentAdmin() || !isEditModeActive) return;
  const course = appData.schedule.find(s => s.id === courseId);
  if (!course) return;
  document.getElementById("modalCourseTitle").textContent = "✏️ 編輯課堂資料 (ID: " + course.id + ")";
  document.getElementById("editCourseId").value = course.id;
  document.getElementById("editCourseClass").value = course.class_id;
  document.getElementById("editCourseDay").value = course.day;
  document.getElementById("editCoursePeriod").value = course.period;
  document.getElementById("editCourseSubject").value = course.subject;
  document.getElementById("editCourseTeacher").value = course.teacher;
  document.getElementById("btnDeleteCourse").style.display = "inline-flex";
  document.getElementById("editCourseModal").classList.add("active");
}

function openAddCourseModal(defaultClass, defaultDay, defaultPeriod, defaultTeacher) {
  if (!isCurrentAdmin() || !isEditModeActive) return;
  document.getElementById("modalCourseTitle").textContent = "➕ 新增課堂 / 特教抽離並行課";
  document.getElementById("editCourseId").value = "";
  document.getElementById("editCourseClass").value = defaultClass || "701";
  document.getElementById("editCourseDay").value = defaultDay || 1;
  document.getElementById("editCoursePeriod").value = defaultPeriod || 1;
  document.getElementById("editCourseSubject").value = "";
  if (defaultTeacher) document.getElementById("editCourseTeacher").value = defaultTeacher;
  document.getElementById("btnDeleteCourse").style.display = "none";
  document.getElementById("editCourseModal").classList.add("active");
}

function closeEditCourseModal() {
  document.getElementById("editCourseModal").classList.remove("active");
}

function saveCourseChange() {
  const id = document.getElementById("editCourseId").value;
  let classId = document.getElementById("editCourseClass").value;
  const day = parseInt(document.getElementById("editCourseDay").value);
  const period = parseInt(document.getElementById("editCoursePeriod").value);
  const subject = document.getElementById("editCourseSubject").value.trim();
  const teacher = document.getElementById("editCourseTeacher").value;

  if (!subject) {
    alert("請輸入科目名稱！");
    return;
  }

  if (id) {
    const item = appData.schedule.find(s => s.id === id);
    if (item) {
      item.class_id = classId;
      item.day = day;
      item.period = period;
      item.subject = subject;
      item.teacher = teacher;
    }
  } else {
    appData.schedule.push({
      id: "SCH_MANUAL_" + Date.now(),
      class_id: classId,
      day: day,
      period: period,
      subject: subject,
      teacher: teacher,
      is_overtime: false,
      is_afterschool: period === 8,
      is_special_ed: classId.startsWith("學")
    });
  }

  saveToLocalStorage();
  closeEditCourseModal();
  renderSchedule();
  alert("✅ 課堂資料已成功更正！");
}

function deleteCurrentCourse() {
  const id = document.getElementById("editCourseId").value;
  if (!id || !confirm("確定要刪除這節課堂嗎？")) return;
  appData.schedule = appData.schedule.filter(s => s.id !== id);
  saveToLocalStorage();
  closeEditCourseModal();
  renderSchedule();
  alert("🗑️ 課堂已刪除！");
}

function exportScheduleToCSV() {
  let csv = "\uFEFF";
  csv += "# 飛沙國中 115-1 課表資料庫 (最新修改匯出版)\r\n";
  csv += "班級,星期(1-5),節次(0-8),科目,授課教師,是否兼課(是/否)\r\n";

  const sorted = [...appData.schedule].sort((a, b) => {
    if (a.class_id !== b.class_id) return a.class_id.localeCompare(b.class_id);
    if (a.day !== b.day) return a.day - b.day;
    return a.period - b.period;
  });

  sorted.forEach(s => {
    const overtimeStr = s.is_overtime ? "是" : "否";
    csv += `"${s.class_id}","${s.day}","${s.period}","${s.subject}","${s.teacher}","${overtimeStr}"\r\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "schedule.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  alert("📥 已成功下載 schedule.csv！");
}

function resetToOfficialSchedule() {
  if (!confirm("確定要放棄目前的修改，將課表還原回官方核定的 178 節基準課表嗎？")) return;
  if (typeof LOCKED_OFFICIAL_SCHEDULE !== "undefined" && LOCKED_OFFICIAL_SCHEDULE.length > 0) {
    appData.schedule = JSON.parse(JSON.stringify(LOCKED_OFFICIAL_SCHEDULE));
    saveToLocalStorage();
    renderSchedule();
    alert("🔄 已成功還原回 178 節官方核定底冊！");
  } else {
    alert("找不到內建底冊資料！");
  }
}

function generateFullMatrixHTML() {
  let html = `<table class="custom-table" style="font-size:0.8rem;"><thead><tr><th>教師姓名</th><th>清冊職稱</th><th>領域</th><th>兼課節數</th><th>週一</th><th>週二</th><th>週三</th><th>週四</th><th>週五</th></tr></thead><tbody>`;
  appData.teachers.forEach(t => {
    html += `<tr><td><strong>${t.name}</strong></td><td>${t.title}</td><td>${t.subject}</td><td><span class="badge-admin" style="padding:1px 6px;">${t.overtimeWeekly} 節</span></td>`;
    for (let d = 1; d <= 5; d++) {
      const classes = appData.schedule.filter(s => s.teacher === t.name && s.day === d).map(s => `${s.period === 0 ? "早" : s.period}節:${s.class_id}${s.subject}`).join(" | ");
      html += `<td>${classes || "<span style='color:#cbd5e1;'>—</span>"}</td>`;
    }
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDatabase);
} else {
  initDatabase();
}