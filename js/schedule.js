/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 動態課表核心引擎 (js/schedule.js)
 * 核心升級：
 * 1. 真實動態課表：每週每節即時融合代課、被代課、調入、調出與代理導師
 * 2. 班級視角：早自習 (07:30~08:15) ＋ 原班與特教抽離課 (學701/學801) 雙軌並列
 * 3. 教師視角：精確區分「自己請假被代」與「前往幫人代課」，空堂代課完整浮現
 */

window.currentWeek = 1;
window.scheduleViewMode = 'class';

function initAcademicWeek() {
  const config = window.FEISHA_CONFIG_CONSTANTS || {
    startDate: '2026-08-31T00:00:00',
    totalWeeks: 21
  };

  const semStart = new Date(config.startDate);
  const today = new Date();
  
  const diffTime = today.getTime() - semStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  let calculatedWeek = Math.floor(diffDays / 7) + 1;
  if (calculatedWeek < 1) calculatedWeek = 1;
  if (calculatedWeek > config.totalWeeks) calculatedWeek = config.totalWeeks;
  
  window.currentWeek = calculatedWeek;

  populateWeekSelect();
  initScheduleTargetSelect();
  renderScheduleGrid();
}

function getWeekDates(weekNum) {
  const config = window.FEISHA_CONFIG_CONSTANTS || { startDate: '2026-08-31T00:00:00' };
  const semStart = new Date(config.startDate);
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
    if (w === window.currentWeek) opt.selected = true;
    select.appendChild(opt);
  }
}

function onWeekSelectChange(value) {
  window.currentWeek = parseInt(value, 10);
  renderScheduleGrid();
}

function navigateWeek(delta) {
  const totalWeeks = window.FEISHA_CONFIG_CONSTANTS ? window.FEISHA_CONFIG_CONSTANTS.totalWeeks : 21;
  const targetWeek = window.currentWeek + delta;

  if (targetWeek >= 1 && targetWeek <= totalWeeks) {
    window.currentWeek = targetWeek;
    const select = document.getElementById('weekSelect');
    if (select) select.value = window.currentWeek;
    renderScheduleGrid();
  }
}

function goToCurrentWeek() {
  initAcademicWeek();
}

function initScheduleTargetSelect() {
  const targetSelect = document.getElementById('targetSelect');
  if (!targetSelect) return;

  if (window.scheduleViewMode === 'class') {
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
      const isSelected = name === '蔡明振' ? 'selected' : '';
      options += `<option value="${name}" ${isSelected}>${name} 老師 (${roster[name].title})</option>`;
    });
    targetSelect.innerHTML = options;
  }
}

function setViewMode(mode) {
  window.scheduleViewMode = mode;
  const classBtn = document.getElementById('viewModeClassBtn');
  const teacherBtn = document.getElementById('viewModeTeacherBtn');

  if (mode === 'class') {
    if (classBtn) classBtn.className = "px-3 py-1 rounded-md bg-white shadow-xs text-slate-800 transition font-bold";
    if (teacherBtn) teacherBtn.className = "px-3 py-1 rounded-md text-slate-500 hover:text-slate-800 transition font-semibold";
  } else {
    if (teacherBtn) teacherBtn.className = "px-3 py-1 rounded-md bg-white shadow-xs text-slate-800 transition font-bold";
    if (classBtn) classBtn.className = "px-3 py-1 rounded-md text-slate-500 hover:text-slate-800 transition font-semibold";
  }

  initScheduleTargetSelect();
  renderScheduleGrid();
}

// 輔助函式：從字串中擷取班級代碼 (如 801/5 -> 801)
function extractClassId(str) {
  if (!str) return '';
  const m = String(str).match(/([7-9]0[1-2]|學[7-8]01)/);
  return m ? m[1] : '';
}

// 輔助函式：從字串中擷取節次數字
function extractPeriodNum(periodVal, cpStr) {
  const p = parseInt(periodVal, 10);
  if (!isNaN(p) && p >= 0 && p <= 8) return p;
  if (cpStr) {
    if (cpStr.includes('/')) {
      const parts = cpStr.split('/');
      const num = parseInt(parts[1].replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num)) return num;
    }
    const m = cpStr.match(/第?\s*([0-8])\s*節?/);
    if (m) return parseInt(m[1], 10);
  }
  return 1;
}

// ==========================================================================
// 核心繪製函式：動態融合常態課表、代課、調課與早自習
// ==========================================================================
function renderScheduleGrid() {
  const thead = document.getElementById('scheduleThead');
  const tbody = document.getElementById('scheduleTbody');
  const overloadCard = document.getElementById('teacherOverloadCard');
  const targetSelect = document.getElementById('targetSelect');

  if (!thead || !tbody || !targetSelect) return;

  const currentWeek = window.currentWeek || 1;
  const scheduleViewMode = window.scheduleViewMode || 'class';
  const currentTarget = targetSelect.value || (scheduleViewMode === 'class' ? '801' : '蔡明振');
  const weekDates = getWeekDates(currentWeek);
  const weekdayNames = ['週一', '週二', '週三', '週四', '週五'];
  const roster = window.TEACHER_ROSTER || {};
  const baselineMatrix = window.BASELINE_SCHEDULE_MATRIX || [];
  const periodsConfig = window.FEISHA_PERIODS || [];
  const homeroomMap = window.FEISHA_HOMEROOM_MAP || { '701': '阮建安', '801': '蔡明振', '901': '張碧菁', '902': '林㞽鋌' };

  const allTasks = window.appData?.tasks || [];
  const allSwaps = window.appData?.swaps || [];

  const today = new Date();
  const currentRocToday = `${today.getFullYear() - 1911}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  // 1. 產生頂部日期表頭
  let theadHtml = `
    <tr>
      <th class="py-3 px-2 text-xs font-bold text-slate-500 border-r border-slate-200 w-24 bg-slate-50">節次</th>
  `;

  weekdayNames.forEach((wName, index) => {
    const dInfo = weekDates[index];
    const isToday = dInfo.fullRoc === currentRocToday;
    theadHtml += `
      <th class="py-3 px-2 border-r border-slate-200 transition ${isToday ? 'bg-indigo-50/90 text-indigo-900 font-extrabold' : 'text-slate-700 font-bold'}">
        <div class="flex items-center justify-center gap-1.5 text-sm">
          <span>${wName}</span>
          ${isToday ? '<span class="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>' : ''}
        </div>
        <div class="text-xs font-mono mt-0.5 ${isToday ? 'text-indigo-600 font-bold' : 'text-slate-400'}">
          ${dInfo.month}/${dInfo.date}
        </div>
      </th>
    `;
  });
  theadHtml += `</tr>`;
  thead.innerHTML = theadHtml;

  // 2. 教師個人兼課總覽資訊卡
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
        <span class="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-bold shadow-2xs">
          ⚡ ${dayNameMap[d] || d} 第 ${p} 節 (超鐘點兼課)
        </span>
      `;
    });

    document.getElementById('cardOverloadPeriodsList').innerHTML = badgesHtml || '<span class="text-xs text-slate-400">本學期未排定固定兼課超額</span>';
  } else {
    overloadCard.classList.add('hidden');
  }

  // 3. 逐節渲染課表格子
  let tbodyHtml = '';

  periodsConfig.forEach(periodItem => {
    const pNum = periodItem.period;
    const isZero = pNum === 0;
    const isEighth = pNum === 8;

    let rowBg = 'hover:bg-slate-50/50';
    if (isZero) rowBg = 'bg-amber-50/20';
    if (isEighth) rowBg = 'bg-purple-50/20';

    tbodyHtml += `
      <tr class="transition ${rowBg}">
        <td class="py-2.5 px-2 border-r border-slate-200 bg-slate-50/90 text-center align-middle">
          <div class="text-sm font-black ${isZero ? 'text-amber-800' : (isEighth ? 'text-purple-900' : 'text-slate-800')}">${periodItem.name}</div>
          <div class="text-[11px] text-slate-500 font-mono mt-0.5">${periodItem.startTime}</div>
          <div class="text-[11px] text-slate-500 font-mono">${periodItem.endTime}</div>
          ${isZero ? '<span class="inline-block mt-1 text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 font-bold rounded">晨光時段</span>' : ''}
          ${isEighth ? '<span class="inline-block mt-1 text-[10px] px-1.5 py-0.2 bg-purple-100 text-purple-800 font-bold rounded">第八節</span>' : ''}
        </td>
    `;

    for (let dayIdx = 1; dayIdx <= 5; dayIdx++) {
      const dateInfo = weekDates[dayIdx - 1];
      const rocDateStr = dateInfo.fullRoc;
      const periodKey = `${dayIdx}-${pNum}`;

      tbodyHtml += `<td class="p-1.5 border-r border-slate-200 h-24 align-middle text-left relative">`;

      // ─────────────────────────────────────────────────────────────
      // A. 第 0 節：早自習與代理導師專屬邏輯
      // ─────────────────────────────────────────────────────────────
      if (isZero) {
        if (scheduleViewMode === 'class') {
          const defaultHomeroomTeacher = homeroomMap[currentTarget] || '導師';

          // 檢查當天該班導師是否有請假、由他人代理導師
          const homeroomTask = allTasks.find(t => {
            const isDate = String(t.date).trim() === rocDateStr;
            const isMatchClass = extractClassId(t.classPeriod) === currentTarget;
            const isProxy = Number(t.homeroomFee) > 0 || String(t.classPeriod).includes('代導') || String(t.reason).includes('代導');
            return isDate && isMatchClass && isProxy;
          });

          if (homeroomTask) {
            tbodyHtml += `
              <div class="h-full w-full p-2.5 rounded-lg bg-amber-50 border-2 border-amber-400 text-xs shadow-xs flex flex-col justify-between">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-black text-amber-950">🚩 代理導師晨輔</span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-extrabold">代導</span>
                </div>
                <div class="text-xs text-amber-900 font-bold">代導師：${homeroomTask.subTeacher}</div>
                <div class="text-[10px] text-amber-700">原任導師：${homeroomTask.origTeacher || defaultHomeroomTeacher} (請假)</div>
              </div>
            `;
          } else {
            tbodyHtml += `
              <div class="h-full w-full p-2.5 rounded-lg border border-dashed border-amber-200 bg-amber-50/40 text-xs flex flex-col justify-between">
                <div class="text-xs font-bold text-amber-900">晨間自習 / 導師時間</div>
                <div class="text-[11px] text-amber-800 font-semibold">常任導師：${defaultHomeroomTeacher}</div>
              </div>
            `;
          }

        } else {
          // 教師視角：檢查該教師當天是否有「承接代理導師」或「自己是導師被代」
          const teacherAsSubHomeroom = allTasks.find(t => {
            const isDate = String(t.date).trim() === rocDateStr;
            const isSub = t.subTeacher === currentTarget;
            const isProxy = Number(t.homeroomFee) > 0 || String(t.classPeriod).includes('代導');
            return isDate && isSub && isProxy;
          });

          const teacherAsOrigHomeroom = allTasks.find(t => {
            const isDate = String(t.date).trim() === rocDateStr;
            const isOrig = t.origTeacher === currentTarget;
            const isProxy = Number(t.homeroomFee) > 0 || String(t.classPeriod).includes('代導');
            return isDate && isOrig && isProxy;
          });

          if (teacherAsSubHomeroom) {
            const targetClass = extractClassId(teacherAsSubHomeroom.classPeriod) || '班級';
            tbodyHtml += `
              <div class="h-full w-full p-2 rounded-lg bg-amber-100 border border-amber-400 text-xs shadow-xs flex flex-col justify-between">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-black text-amber-950">🚩 代理導師出勤</span>
                  <span class="text-[10px] px-1 bg-amber-300 text-amber-950 font-bold rounded">代導</span>
                </div>
                <div class="text-xs font-bold text-amber-900">代理班級：${targetClass} 班</div>
                <div class="text-[10px] text-amber-700 truncate">原導師：${teacherAsSubHomeroom.origTeacher}</div>
              </div>
            `;
          } else if (teacherAsOrigHomeroom) {
            tbodyHtml += `
              <div class="h-full w-full p-2 rounded-lg bg-rose-50 border border-rose-300 text-xs flex flex-col justify-between">
                <span class="text-xs font-bold text-rose-800">公差請假 (代導已排)</span>
                <div class="text-[11px] text-rose-700">代導師：${teacherAsOrigHomeroom.subTeacher}</div>
              </div>
            `;
          } else {
            // 若該教師本身是導師，顯示自己的早自習
            const isHomeroomOf = Object.keys(homeroomMap).find(c => homeroomMap[c] === currentTarget);
            if (isHomeroomOf) {
              tbodyHtml += `
                <div class="h-full w-full p-2 rounded-lg border border-slate-200 bg-white text-xs flex flex-col justify-between">
                  <span class="text-xs font-bold text-slate-700">${isHomeroomOf} 晨間巡查</span>
                  <span class="text-[10px] text-slate-400">導師常態時間</span>
                </div>
              `;
            } else {
              tbodyHtml += `<div class="h-full w-full flex items-center justify-center text-slate-300 text-xs"><span>—</span></div>`;
            }
          }
        }

        tbodyHtml += `</td>`;
        continue; // 早自習處理完畢，換下一格
      }

      // ─────────────────────────────────────────────────────────────
      // B. 第 1 ~ 8 節：常態課堂、代課與互調課動態融合
      // ─────────────────────────────────────────────────────────────

      if (scheduleViewMode === 'class') {
        // === 班級課表模式 ===
        const specialEdClassId = currentTarget === '701' ? '學701' : (currentTarget === '801' ? '學801' : null);

        // 1. 原班常態基準課
        const baseClass = baselineMatrix.find(b => b.classId === currentTarget && b.day === dayIdx && b.period === pNum);
        // 2. 特教抽離常態基準課
        const specialEdClass = specialEdClassId ? baselineMatrix.find(b => b.classId === specialEdClassId && b.day === dayIdx && b.period === pNum) : null;

        // 3. 該班級當天當節的排代紀錄
        const classTask = allTasks.find(t => {
          const isDate = String(t.date).trim() === rocDateStr;
          const p = extractPeriodNum(t.period, t.classPeriod);
          const cId = extractClassId(t.classPeriod);
          return isDate && p === pNum && cId === currentTarget;
        });

        // 4. 該班級當天當節的調課紀錄
        const classSwap = allSwaps.find(s => {
          const isOrig = String(s.origDate).trim() === rocDateStr && Number(s.origPeriod) === pNum && extractClassId(s.origClassSubject) === currentTarget;
          const isTarget = String(s.targetDate).trim() === rocDateStr && Number(s.targetPeriod) === pNum && extractClassId(s.targetClassSubject) === currentTarget;
          return isOrig || isTarget;
        });

        if (classTask) {
          // 班級被代課
          tbodyHtml += `
            <div class="h-full w-full p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs shadow-2xs flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <span class="text-base font-black text-emerald-950 truncate">${classTask.subject || baseClass?.subject || '代課'}</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 font-extrabold">公費代</span>
              </div>
              <div class="text-xs text-emerald-900 font-bold truncate">代課師：${classTask.subTeacher}</div>
              <div class="text-[10px] text-emerald-700 truncate">原任：${classTask.origTeacher || baseClass?.teacher}</div>
            </div>
          `;
        } else if (classSwap) {
          // 班級調課
          const isTargetHere = String(classSwap.targetDate).trim() === rocDateStr && Number(classSwap.targetPeriod) === pNum;
          tbodyHtml += `
            <div class="h-full w-full p-2.5 rounded-lg bg-indigo-50 border border-indigo-300 text-xs shadow-2xs flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <span class="text-sm font-black text-indigo-950 truncate">${isTargetHere ? classSwap.origClassSubject : classSwap.targetClassSubject}</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-indigo-200 text-indigo-900 font-extrabold">互調</span>
              </div>
              <div class="text-xs text-indigo-900 font-bold truncate">授課：${isTargetHere ? classSwap.origTeacher : classSwap.targetTeacher}</div>
            </div>
          `;
        } else if (baseClass) {
          // 班級常態課 (支援原班 + 特教抽離雙軌並列)
          tbodyHtml += `
            <div class="h-full w-full p-2 rounded-lg border border-slate-200/80 bg-white hover:border-indigo-400 hover:shadow-xs transition flex flex-col justify-between">
              <div class="flex items-center justify-between gap-1">
                <span class="text-base font-black text-slate-800 tracking-wide truncate">${baseClass.subject}</span>
                ${baseClass.isOvertime ? `
                  <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                    ⚡兼課
                  </span>
                ` : ''}
              </div>
              <div class="text-sm font-semibold text-slate-600">${baseClass.teacher}</div>
              ${specialEdClass ? `
                <div class="mt-1 pt-1 border-t border-purple-100 flex items-center justify-between text-[11px] text-purple-700 font-bold bg-purple-50/70 px-1.5 py-0.5 rounded">
                  <span>♿ 抽離：${specialEdClass.teacher}</span>
                  <span class="font-normal text-[10px]">(${specialEdClass.subject})</span>
                </div>
              ` : ''}
            </div>
          `;
        } else {
          tbodyHtml += `<div class="h-full w-full flex items-center justify-center text-slate-300 text-sm"><span>—</span></div>`;
        }

      } else {
        // === 教師個人課表模式 (最關鍵：解決每週都一樣的問題) ===
        const baseClass = baselineMatrix.find(b => b.teacher === currentTarget && b.day === dayIdx && b.period === pNum);

        // 1. 該教師在這一天這一節「幫別人代課」 (原本可能是空堂)
        const subbingTask = allTasks.find(t => {
          const isDate = String(t.date).trim() === rocDateStr;
          const p = extractPeriodNum(t.period, t.classPeriod);
          return isDate && p === pNum && t.subTeacher === currentTarget;
        });

        // 2. 該教師在這一天這一節「自己請假，由別人代課」
        const absentTask = allTasks.find(t => {
          const isDate = String(t.date).trim() === rocDateStr;
          const p = extractPeriodNum(t.period, t.classPeriod);
          return isDate && p === pNum && t.origTeacher === currentTarget;
        });

        // 3. 該教師調課「調出」 (原本有課，移到別天)
        const swapOut = allSwaps.find(s => {
          return String(s.origDate).trim() === rocDateStr && Number(s.origPeriod) === pNum && s.origTeacher === currentTarget;
        });

        // 4. 該教師調課「調入」 (在這一天這一節補上課)
        const swapIn = allSwaps.find(s => {
          return String(s.targetDate).trim() === rocDateStr && Number(s.targetPeriod) === pNum && s.origTeacher === currentTarget;
        });

        if (subbingTask) {
          // 狀況 A：前往代課 (綠色高亮)
          const targetClass = extractClassId(subbingTask.classPeriod) || '';
          tbodyHtml += `
            <div class="h-full w-full p-2.5 rounded-lg bg-emerald-100/90 border-2 border-emerald-500 text-xs shadow-xs flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <span class="text-base font-black text-emerald-950 truncate">${targetClass} ${subbingTask.subject || '代課'}</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-300 text-emerald-950 font-black">公費代課</span>
              </div>
              <div class="text-xs text-emerald-900 font-bold truncate">代：${subbingTask.origTeacher} 老師</div>
              <div class="text-[10px] text-emerald-700 truncate">${subbingTask.reason || '公差排代'}</div>
            </div>
          `;
        } else if (absentTask) {
          // 狀況 B：自己請假，由他人代課 (橘黃色標示)
          tbodyHtml += `
            <div class="h-full w-full p-2.5 rounded-lg bg-amber-50 border-2 border-dashed border-amber-400 text-xs flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <span class="text-sm font-bold text-amber-900 line-through">${baseClass ? (baseClass.classId + ' ' + baseClass.subject) : '原排定課程'}</span>
                <span class="text-[10px] px-1 bg-amber-200 text-amber-900 font-bold rounded">差假</span>
              </div>
              <div class="text-xs text-amber-900 font-bold truncate">由 ${absentTask.subTeacher} 代課</div>
              <div class="text-[10px] text-amber-700 truncate">事由：${absentTask.reason || '公差假'}</div>
            </div>
          `;
        } else if (swapOut) {
          // 狀況 C：這堂課已調移到別天 (灰色劃線)
          tbodyHtml += `
            <div class="h-full w-full p-2 rounded-lg bg-slate-100 border border-slate-300 text-xs flex flex-col justify-between opacity-75">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-500 line-through">${swapOut.origClassSubject}</span>
                <span class="text-[10px] px-1 bg-slate-200 text-slate-700 font-bold rounded">已調出</span>
              </div>
              <div class="text-[10px] text-indigo-700 font-semibold">移至 ${swapOut.targetDate} 第${swapOut.targetPeriod}節</div>
            </div>
          `;
        } else if (swapIn) {
          // 狀況 D：調入新課堂 (藍色高亮)
          tbodyHtml += `
            <div class="h-full w-full p-2.5 rounded-lg bg-indigo-100 border-2 border-indigo-500 text-xs shadow-xs flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <span class="text-base font-black text-indigo-950 truncate">${swapIn.origClassSubject}</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-indigo-300 text-indigo-950 font-black">調入上課</span>
              </div>
              <div class="text-xs text-indigo-900 font-bold">協同：${swapIn.targetTeacher} 老師</div>
            </div>
          `;
        } else if (baseClass) {
          // 狀況 E：正常原定授課
          const isOverload = (roster[currentTarget]?.overloadPeriods || []).includes(periodKey);
          tbodyHtml += `
            <div class="h-full w-full p-2.5 rounded-lg border border-slate-200/80 bg-white hover:border-indigo-400 hover:shadow-xs transition flex flex-col justify-between">
              <div class="flex items-center justify-between gap-1">
                <span class="text-base font-black text-slate-800 tracking-wide truncate">${baseClass.subject}</span>
                ${isOverload || baseClass.isOvertime ? `
                  <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                    ⚡兼課
                  </span>
                ` : ''}
              </div>
              <div class="text-sm font-semibold text-slate-600">${baseClass.classId} 班</div>
            </div>
          `;
        } else {
          tbodyHtml += `<div class="h-full w-full flex items-center justify-center text-slate-300 text-sm"><span>—</span></div>`;
        }
      }

      tbodyHtml += `</td>`;
    }
    tbodyHtml += `</tr>`;
  });

  tbody.innerHTML = tbodyHtml;
}

window.initAcademicWeek = initAcademicWeek;
window.getWeekDates = getWeekDates;
window.populateWeekSelect = populateWeekSelect;
window.onWeekSelectChange = onWeekSelectChange;
window.navigateWeek = navigateWeek;
window.goToCurrentWeek = goToCurrentWeek;
window.setViewMode = setViewMode;
window.renderScheduleGrid = renderScheduleGrid;