/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 動態課表與週次導航模組 (js/schedule.js)
 * 職責：第 1~21 週時間軸計算、班級/教師雙視角切換、全校常態課表渲染、兼課超鐘點高亮、動態排代卡片疊加
 */

// ==========================================
// 1. 模組內部全域狀態變數
// ==========================================
let currentWeek = 1;
let scheduleViewMode = 'class'; // 可選值: 'class' (依班級) 或 'teacher' (依教師)

// ==========================================
// 2. 學期週次與日期對齊核心演算法
// ==========================================

/**
 * 依據今日實際日期推算當前學期週次 (以 2026-08-31 115-1開學週為基準)
 */
function initAcademicWeek() {
  const config = window.FEISHA_CONFIG_CONSTANTS || {
    startDate: '2026-08-31T00:00:00',
    totalWeeks: 21
  };

  const semStart = new Date(config.startDate);
  const today = new Date();
  
  // 計算開學日至今天的天數差距
  const diffTime = today.getTime() - semStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  let calculatedWeek = Math.floor(diffDays / 7) + 1;
  if (calculatedWeek < 1) calculatedWeek = 1;
  if (calculatedWeek > config.totalWeeks) calculatedWeek = config.totalWeeks;
  
  currentWeek = calculatedWeek;

  // 產生 1~21 週下拉選單內容
  populateWeekSelect();

  // 初始化檢視目標選單 (預設為班級)
  initScheduleTargetSelect();
}

/**
 * 取得指定學期週次之週一至週五的精確日期物件與民國年7碼字串
 * @param {number} weekNum - 週次 (1 ~ 21)
 * @returns {Array<{month: number, date: number, fullRoc: string, dateObj: Date}>}
 */
function getWeekDates(weekNum) {
  const config = window.FEISHA_CONFIG_CONSTANTS || { startDate: '2026-08-31T00:00:00' };
  const semStart = new Date(config.startDate);
  
  // 計算該週週一的絕對時間
  const monday = new Date(semStart);
  monday.setDate(monday.getDate() + (weekNum - 1) * 7);

  const weekDates = [];
  for (let i = 0; i < 5; i++) {
    const currentDay = new Date(monday);
    currentDay.setDate(monday.getDate() + i);

    const year = currentDay.getFullYear();
    const rocYear = year - 1911;
    const month = currentDay.getMonth() + 1;
    const date = currentDay.getDate();

    // 格式化為 7 碼民國數字字串 (例：1151019)
    const rocDateStr = `${rocYear}${String(month).padStart(2, '0')}${String(date).padStart(2, '0')}`;

    weekDates.push({
      month: month,
      date: date,
      fullRoc: rocDateStr,
      dateObj: currentDay
    });
  }

  return weekDates;
}

/**
 * 渲染週次下拉選單項目
 */
function populateWeekSelect() {
  const select = document.getElementById('weekSelect');
  if (!select) return;

  const totalWeeks = window.FEISHA_CONFIG_CONSTANTS ? window.FEISHA_CONFIG_CONSTANTS.totalWeeks : 21;
  select.innerHTML = '';

  for (let w = 1; w <= totalWeeks; w++) {
    const dates = getWeekDates(w);
    const startStr = `${dates[0].month}/${dates[0].date}`;
    const endStr = `${dates[4].month}/${dates[4].date}`;
    const label = `第 ${w} 週 (${startStr} ~ ${endStr})`;

    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = label;
    if (w === currentWeek) {
      opt.selected = true;
    }
    select.appendChild(opt);
  }
}

/**
 * 下拉選單更動事件
 */
function onWeekSelectChange(value) {
  currentWeek = parseInt(value, 10);
  renderScheduleGrid();
}

/**
 * 週次快速導航 (上一週 / 下一週)
 * @param {number} delta - 偏移值 (-1 或 +1)
 */
function navigateWeek(delta) {
  const totalWeeks = window.FEISHA_CONFIG_CONSTANTS ? window.FEISHA_CONFIG_CONSTANTS.totalWeeks : 21;
  const targetWeek = currentWeek + delta;

  if (targetWeek >= 1 && targetWeek <= totalWeeks) {
    currentWeek = targetWeek;
    const select = document.getElementById('weekSelect');
    if (select) {
      select.value = currentWeek;
    }
    renderScheduleGrid();
  }
}

/**
 * 快速跳轉回當前日期所處之真實週次
 */
function goToCurrentWeek() {
  initAcademicWeek();
  renderScheduleGrid();
}

// ==========================================
// 3. 檢視模式切換器 (依班級 / 依教師)
// ==========================================

/**
 * 初始化檢視對象下拉選單
 */
function initScheduleTargetSelect() {
  const targetSelect = document.getElementById('targetSelect');
  if (!targetSelect) return;

  if (scheduleViewMode === 'class') {
    targetSelect.innerHTML = `
      <option value="701">701 班課表</option>
      <option value="801" selected>801 班課表</option>
      <option value="901">901 班課表</option>
      <option value="902">902 班課表</option>
    `;
  } else {
    const roster = window.TEACHER_ROSTER || {};
    let options = '';
    Object.keys(roster).forEach(name => {
      options += `<option value="${name}">${name} 老師課表 (${roster[name].title})</option>`;
    });
    targetSelect.innerHTML = options;
  }
}

/**
 * 切換檢視視角 (班級 / 教師)
 * @param {'class'|'teacher'} mode 
 */
function setViewMode(mode) {
  scheduleViewMode = mode;
  const classBtn = document.getElementById('viewModeClassBtn');
  const teacherBtn = document.getElementById('viewModeTeacherBtn');

  if (mode === 'class') {
    if (classBtn) {
      classBtn.className = "px-3 py-1 rounded-md bg-white shadow text-slate-800 transition font-bold";
    }
    if (teacherBtn) {
      teacherBtn.className = "px-3 py-1 rounded-md text-slate-500 hover:text-slate-800 transition font-semibold";
    }
  } else {
    if (teacherBtn) {
      teacherBtn.className = "px-3 py-1 rounded-md bg-white shadow text-slate-800 transition font-bold";
    }
    if (classBtn) {
      classBtn.className = "px-3 py-1 rounded-md text-slate-500 hover:text-slate-800 transition font-semibold";
    }
  }

  initScheduleTargetSelect();
  renderScheduleGrid();
}

// ==========================================
// 4. 動態課表網格渲染引擎
// ==========================================
function renderScheduleGrid() {
  const thead = document.getElementById('scheduleThead');
  const tbody = document.getElementById('scheduleTbody');
  const overloadCard = document.getElementById('teacherOverloadCard');
  const targetSelect = document.getElementById('targetSelect');

  if (!thead || !tbody || !targetSelect) return;

  const currentTarget = targetSelect.value || (scheduleViewMode === 'class' ? '801' : '蔡明振');
  const weekDates = getWeekDates(currentWeek);
  const weekdayNames = ['週一', '週二', '週三', '週四', '週五'];
  const roster = window.TEACHER_ROSTER || {};
  const baselineMatrix = window.BASELINE_SCHEDULE_MATRIX || [];
  const periodsConfig = window.FEISHA_PERIODS || [];

  // ------------------------------------------
  // A. 渲染動態表頭 (帶入該週精確日期與高亮當日)
  // ------------------------------------------
  const today = new Date();
  const currentRocToday = `${today.getFullYear() - 1911}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  let theadHtml = `
    <tr>
      <th class="py-3 px-2 text-xs font-bold text-slate-500 border-r border-slate-200 w-20 bg-slate-50">節次</th>
  `;

  weekdayNames.forEach((wName, index) => {
    const dInfo = weekDates[index];
    const isToday = dInfo.fullRoc === currentRocToday;
    theadHtml += `
      <th class="py-3 px-2 text-xs border-r border-slate-200 transition ${isToday ? 'bg-indigo-50/80 text-indigo-900 font-extrabold' : 'text-slate-700 font-bold'}">
        <div class="flex items-center justify-center gap-1.5">
          <span>${wName}</span>
          ${isToday ? '<span class="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></span>' : ''}
        </div>
        <div class="text-[11px] font-mono mt-0.5 ${isToday ? 'text-indigo-600 font-bold' : 'text-slate-400'}">
          ${dInfo.month}/${dInfo.date}
        </div>
      </th>
    `;
  });

  theadHtml += `</tr>`;
  thead.innerHTML = theadHtml;

  // ------------------------------------------
  // B. 處理任課教師「授課結構與兼課明細卡片」
  // ------------------------------------------
  if (scheduleViewMode === 'teacher' && roster[currentTarget]) {
    const tConfig = roster[currentTarget];
    overloadCard.classList.remove('hidden');

    document.getElementById('cardTeacherName').textContent = `${currentTarget} 老師`;
    document.getElementById('cardTeacherTitle').textContent = tConfig.title;
    document.getElementById('cardWorkloadSummary').textContent = 
      `每週排課：基本授課 ${tConfig.baseHours} 節 ＋ 兼課超鐘點 ${tConfig.overloadHours} 節 ＝ 每週總授課 ${tConfig.baseHours + tConfig.overloadHours} 節`;

    const dayNameMap = { '1': '週一', '2': '週二', '3': '週三', '4': '週四', '5': '週五' };
    let badgesHtml = '';

    (tConfig.overloadPeriods || []).forEach(pCode => {
      const [d, p] = pCode.split('-');
      badgesHtml += `
        <span class="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-bold shadow-xs">
          ⚡ ${dayNameMap[d] || d} 第 ${p} 節 (超鐘點兼課)
        </span>
      `;
    });

    document.getElementById('cardOverloadPeriodsList').innerHTML = badgesHtml || '<span class="text-xs text-slate-400">本學期未列兼課超額</span>';
  } else {
    overloadCard.classList.add('hidden');
  }

  // ------------------------------------------
  // C. 渲染課表節次網格矩陣 (第 1 節 ~ 第 8 節)
  // ------------------------------------------
  let tbodyHtml = '';

  periodsConfig.forEach(periodItem => {
    const pNum = periodItem.period;
    const isEighth = pNum === 8;

    tbodyHtml += `
      <tr class="hover:bg-slate-50/60 transition ${isEighth ? 'bg-purple-50/20' : ''}">
        <!-- 左側節次與時間標籤 -->
        <td class="py-2 px-2 border-r border-slate-200 bg-slate-50/80 text-center align-middle">
          <div class="text-xs font-bold ${isEighth ? 'text-purple-900' : 'text-slate-700'}">${periodItem.name}</div>
          <div class="text-[10px] text-slate-400 font-mono mt-0.5">${periodItem.startTime}</div>
          <div class="text-[10px] text-slate-400 font-mono">${periodItem.endTime}</div>
          ${isEighth ? '<span class="inline-block mt-1 text-[9px] px-1 bg-purple-100 text-purple-700 font-bold rounded">第八節</span>' : ''}
        </td>
    `;

    // 依序檢查週一至週五 (day 1 ~ 5)
    for (let dayIdx = 1; dayIdx <= 5; dayIdx++) {
      const dateInfo = weekDates[dayIdx - 1];
      const rocDateStr = dateInfo.fullRoc;
      const periodKey = `${dayIdx}-${pNum}`;

      // 1. 檢索基礎課表底冊
      let baseClass = null;
      if (scheduleViewMode === 'class') {
        baseClass = baselineMatrix.find(b => b.classId === currentTarget && b.day === dayIdx && b.period === pNum);
      } else {
        baseClass = baselineMatrix.find(b => b.teacher === currentTarget && b.day === dayIdx && b.period === pNum);
      }

      // 2. 檢索當日是否有指定排代紀錄 (appData.tasks)
      const activeTask = (window.appData.tasks || []).find(t => {
        const isDateMatch = String(t.date).trim() === rocDateStr;
        if (!isDateMatch) return false;

        // 節次比對 (支援純數字節次、斜線格式 901/6、中文字 第6節)
        const isPeriodMatch = (
          Number(t.period) === pNum ||
          String(t.classPeriod).includes(`第${pNum}節`) ||
          String(t.classPeriod).endsWith(`/${pNum}`) ||
          String(t.classPeriod).includes(`第 ${pNum} 節`)
        );
        if (!isPeriodMatch) return false;

        if (scheduleViewMode === 'class') {
          return String(t.classPeriod).includes(currentTarget);
        } else {
          return t.subTeacher === currentTarget || t.origTeacher === currentTarget;
        }
      });

      // 3. 檢索當日是否有互調課紀錄 (appData.swaps)
      const activeSwap = (window.appData.swaps || []).find(s => {
        const isOrigMatch = String(s.origDate).trim() === rocDateStr && Number(s.origPeriod) === pNum;
        const isTargetMatch = String(s.targetDate).trim() === rocDateStr && Number(s.targetPeriod) === pNum;

        if (scheduleViewMode === 'class') {
          return (isOrigMatch && String(s.origClassSubject).includes(currentTarget)) ||
                 (isTargetMatch && String(s.targetClassSubject).includes(currentTarget));
        } else {
          return (isOrigMatch && (s.origTeacher === currentTarget || s.targetTeacher === currentTarget)) ||
                 (isTargetMatch && (s.origTeacher === currentTarget || s.targetTeacher === currentTarget));
        }
      });

      // 4. 判斷是否為教師的指定兼課時段
      let isOverload = false;
      if (scheduleViewMode === 'teacher' && roster[currentTarget]) {
        isOverload = (roster[currentTarget].overloadPeriods || []).includes(periodKey);
      }

      // 5. 組合儲存格內容
      tbodyHtml += `<td class="py-2 px-2 border-r border-slate-200 h-20 align-middle text-left relative">`;

      if (activeTask) {
        // --- 排代動態卡片 (以綠色高亮呈現) ---
        const isSubbing = activeTask.subTeacher === currentTarget;
        tbodyHtml += `
          <div class="p-2 rounded-lg bg-emerald-50 border border-emerald-300 text-xs shadow-xs space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-emerald-950 truncate">${activeTask.subject || '代課'}</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-800 font-bold">公費代</span>
            </div>
            <div class="text-[11px] text-emerald-800 font-semibold truncate">
              代課師：${activeTask.subTeacher}
            </div>
            <div class="text-[10px] text-emerald-600 truncate">
              原任：${activeTask.origTeacher} (${activeTask.classPeriod})
            </div>
          </div>
        `;
      } else if (activeSwap) {
        // --- 互調課動態卡片 (以藍紫色呈現) ---
        tbodyHtml += `
          <div class="p-2 rounded-lg bg-indigo-50 border border-indigo-300 text-xs shadow-xs space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-indigo-950 truncate">互調課</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded bg-indigo-200 text-indigo-800 font-bold">調課</span>
            </div>
            <div class="text-[11px] text-indigo-800 truncate">
              ${activeSwap.origTeacher} ⇄ ${activeSwap.targetTeacher}
            </div>
            <div class="text-[10px] text-indigo-600 truncate">
              事由：${activeSwap.reason}
            </div>
          </div>
        `;
      } else if (baseClass) {
        // --- 常態課堂卡片 (含兼課超鐘點徽章) ---
        tbodyHtml += `
          <div class="p-1.5 rounded-lg border border-transparent hover:border-slate-300 transition text-xs">
            <div class="flex items-center justify-between gap-1">
              <span class="font-bold text-slate-800 text-xs">${baseClass.subject}</span>
              ${isOverload ? `
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                  ⚡兼課
                </span>
              ` : ''}
            </div>
            <div class="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>${scheduleViewMode === 'class' ? baseClass.teacher : baseClass.classId + '班'}</span>
              <span class="text-[10px] text-slate-400 font-mono">${baseClass.room}</span>
            </div>
          </div>
        `;
      } else {
        // --- 空堂 ---
        tbodyHtml += `
          <div class="h-full flex items-center justify-center text-slate-300 text-xs">
            <span>—</span>
          </div>
        `;
      }

      tbodyHtml += `</td>`;
    }

    tbodyHtml += `</tr>`;
  });

  tbody.innerHTML = tbodyHtml;
}

// ==========================================
// 5. 匯出至全域視窗物件
// ==========================================
window.initAcademicWeek = initAcademicWeek;
window.getWeekDates = getWeekDates;
window.populateWeekSelect = populateWeekSelect;
window.onWeekSelectChange = onWeekSelectChange;
window.navigateWeek = navigateWeek;
window.goToCurrentWeek = goToCurrentWeek;
window.setViewMode = setViewMode;
window.renderScheduleGrid = renderScheduleGrid;