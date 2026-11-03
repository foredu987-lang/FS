/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 動態課表核心引擎 (js/schedule.js)
 * 修正重點：
 * 1. 班級課表全面拔除「⚡兼課」標籤，學生與訪客視角乾淨純粹
 * 2. 訪客/學生模式鎖定班級課表，隱藏圖例兼課項目與教師個人排課資訊卡
 * 3. 課務組長(admin)僅在「教師課表」視角才顯示兼課標記與排課時數卡
 */

window.currentWeek = 1;
window.scheduleViewMode = 'class';

function initAcademicWeek() {
  const config = window.FEISHA_SYSTEM_CONFIG || { startDate: '2026-08-31T00:00:00', totalWeeks: 21 };
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
  const config = window.FEISHA_SYSTEM_CONFIG || { startDate: '2026-08-31T00:00:00' };
  const semStart = new Date(config.startDate);
  const monday = new Date(semStart);
  monday.setDate(monday.getDate() + (weekNum - 1) * 7);

  const weekDates = [];
  for (let i = 0; i < 5; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const y = cur.getFullYear() - 1911;
    const m = cur.getMonth() + 1;
    const d = cur.getDate();
    const rocStr = `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
    weekDates.push({ month: m, date: d, fullRoc: rocStr });
  }
  return weekDates;
}

function populateWeekSelect() {
  const sel = document.getElementById('weekSelect');
  if (!sel) return;
  sel.innerHTML = '';
  for (let w = 1; w <= 21; w++) {
    const dates = getWeekDates(w);
    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = `第 ${w} 週 (${dates[0].month}/${dates[0].date} ~ ${dates[4].month}/${dates[4].date})`;
    if (w === window.currentWeek) opt.selected = true;
    sel.appendChild(opt);
  }
}

function onWeekSelectChange(v) {
  window.currentWeek = parseInt(v, 10);
  renderScheduleGrid();
}

function navigateWeek(d) {
  const t = window.currentWeek + d;
  if (t >= 1 && t <= 21) {
    window.currentWeek = t;
    const sel = document.getElementById('weekSelect');
    if (sel) sel.value = t;
    renderScheduleGrid();
  }
}

function goToCurrentWeek() {
  initAcademicWeek();
}

function initScheduleTargetSelect() {
  const sel = document.getElementById('targetSelect');
  if (!sel) return;
  const role = window.currentUser?.role || 'guest';

  // 訪客或班級模式：僅呈現班級清單 (701 ~ 902)
  if (window.scheduleViewMode === 'class' || role === 'guest') {
    const cur = sel.value;
    sel.innerHTML = `
      <option value="701" ${cur === '701' ? 'selected' : ''}>701 班課表</option>
      <option value="801" ${(!cur || cur === '801') ? 'selected' : ''}>801 班課表</option>
      <option value="901" ${cur === '901' ? 'selected' : ''}>901 班課表</option>
      <option value="902" ${cur === '902' ? 'selected' : ''}>902 班課表</option>
    `;
  } else {
    // 登入教師或組長：呈現教師清單
    const roster = window.TEACHER_ROSTER || {};
    let h = '';
    const currentTeacher = window.currentUser?.teacherName;
    Object.keys(roster).forEach(name => {
      const isSel = (name === currentTeacher || (!currentTeacher && name === '蔡明振')) ? 'selected' : '';
      h += `<option value="${name}" ${isSel}>${name} 老師 (${roster[name].title})</option>`;
    });
    sel.innerHTML = h;
  }
}

function setViewMode(m) {
  const role = window.currentUser?.role || 'guest';
  // 訪客/學生強制鎖定班級課表
  if (role === 'guest' && m !== 'class') return;

  window.scheduleViewMode = m;
  const classBtn = document.getElementById('viewModeClassBtn');
  const teacherBtn = document.getElementById('viewModeTeacherBtn');
  if (classBtn) classBtn.className = m === 'class' ? "px-3 py-1 rounded-md bg-white shadow-xs text-slate-800 transition font-bold cursor-pointer" : "px-3 py-1 rounded-md text-slate-500 hover:text-slate-800 transition font-semibold cursor-pointer";
  if (teacherBtn) teacherBtn.className = m === 'teacher' ? "px-3 py-1 rounded-md bg-white shadow-xs text-slate-800 transition font-bold cursor-pointer" : "px-3 py-1 rounded-md text-slate-500 hover:text-slate-800 transition font-semibold cursor-pointer";
  initScheduleTargetSelect();
  renderScheduleGrid();
}

function extractClassId(str) {
  if (!str) return '';
  const m = String(str).match(/([7-9]0[1-2]|學[7-8]01)/);
  return m ? m[1] : '';
}

function extractPeriodNum(pVal, cpStr) {
  const p = parseInt(pVal, 10);
  if (!isNaN(p) && p >= 0 && p <= 8) return p;
  if (cpStr) {
    if (cpStr.includes('/')) {
      const num = parseInt(cpStr.split('/')[1].replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num)) return num;
    }
    const m = cpStr.match(/第?\s*([0-8])\s*節?/);
    if (m) return parseInt(m[1], 10);
  }
  return 1;
}

function renderScheduleGrid() {
  const thead = document.getElementById('scheduleThead');
  const tbody = document.getElementById('scheduleTbody');
  const overloadCard = document.getElementById('teacherOverloadCard');
  const targetSelect = document.getElementById('targetSelect');
  const legendOvertime = document.getElementById('legendOvertimeItem');
  if (!thead || !tbody || !targetSelect) return;

  const role = window.currentUser?.role || 'guest';
  const isAdmin = role === 'admin';
  const target = targetSelect.value || (window.scheduleViewMode === 'class' ? '801' : '蔡明振');
  const weekDates = getWeekDates(window.currentWeek || 1);
  const wNames = ['週一', '週二', '週三', '週四', '週五'];
  const roster = window.TEACHER_ROSTER || {};
  const baselineMatrix = window.BASELINE_SCHEDULE_MATRIX || [];
  const periodsConfig = window.FEISHA_PERIODS || [];
  const homeroomMap = window.FEISHA_HOMEROOM_MAP || { '701': '阮建安', '801': '蔡明振', '901': '張碧菁', '902': '林㞽鋌' };

  const allTasks = window.appData?.tasks || [];
  const allSwaps = window.appData?.swaps || [];

  // 控制底部圖例：僅組長(admin)可見「兼課超鐘點」圖例，其餘身分一律隱藏
  if (legendOvertime) {
    if (isAdmin) {
      legendOvertime.classList.remove('hidden');
    } else {
      legendOvertime.classList.add('hidden');
    }
  }

  // 1. 表頭渲染
  let th = `<tr><th class="py-3 px-2 text-xs font-bold text-slate-500 border-r border-slate-200 w-24 bg-slate-50">節次</th>`;
  wNames.forEach((name, idx) => {
    const d = weekDates[idx];
    th += `
      <th class="py-3 px-2 border-r border-slate-200 text-slate-700 font-bold">
        <div class="text-sm">${name}</div>
        <div class="text-xs font-mono text-slate-400 mt-0.5">${d.month}/${d.date}</div>
      </th>
    `;
  });
  th += `</tr>`;
  thead.innerHTML = th;

  // 2. 教師兼課總覽資訊卡 (僅組長或該教師本人在教師課表視角可見；訪客/學生絕對隱藏)
  const canViewOverloadCard = isAdmin || (role === 'teacher' && window.currentUser?.teacherName === target);
  if (window.scheduleViewMode === 'teacher' && roster[target] && canViewOverloadCard) {
    overloadCard.classList.remove('hidden');
    const t = roster[target];
    document.getElementById('cardTeacherName').textContent = `${target} 老師`;
    document.getElementById('cardTeacherTitle').textContent = t.title;
    document.getElementById('cardWorkloadSummary').textContent = `基本授課 ${t.baseHours} 節 ＋ 兼課超鐘點 ${t.overloadHours} 節 ＝ 每週總授課 ${t.baseHours + t.overloadHours} 節`;
    const dMap = {'1':'週一','2':'週二','3':'週三','4':'週四','5':'週五'};
    let bHtml = (t.overloadPeriods || []).map(p => {
      const [day, per] = p.split('-');
      return `<span class="inline-flex items-center text-xs px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-bold">⚡ ${dMap[day]||day} 第 ${per} 節 (超鐘點兼課)</span>`;
    }).join('');
    document.getElementById('cardOverloadPeriodsList').innerHTML = bHtml || '<span class="text-xs text-slate-400">無固定兼課超額</span>';
  } else {
    overloadCard.classList.add('hidden');
  }

  // 3. 課表格網
  let tb = '';
  periodsConfig.forEach(per => {
    const pNum = per.period;
    const is0 = pNum === 0;
    const is8 = pNum === 8;

    tb += `
      <tr class="${is0 ? 'bg-amber-50/20' : (is8 ? 'bg-purple-50/20' : 'hover:bg-slate-50/50')}">
        <td class="py-2.5 px-2 border-r border-slate-200 bg-slate-50/90 text-center align-middle">
          <div class="text-sm font-black ${is0 ? 'text-amber-800' : (is8 ? 'text-purple-900' : 'text-slate-800')}">${per.name}</div>
          <div class="text-[11px] text-slate-500 font-mono mt-0.5">${per.startTime}</div>
          <div class="text-[11px] text-slate-500 font-mono">${per.endTime}</div>
          ${is0 ? '<span class="inline-block mt-1 text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 font-bold rounded">晨光時段</span>' : ''}
          ${is8 ? '<span class="inline-block mt-1 text-[10px] px-1.5 py-0.2 bg-purple-100 text-purple-800 font-bold rounded">第八節</span>' : ''}
        </td>
    `;

    for (let dayIdx = 1; dayIdx <= 5; dayIdx++) {
      const dateInfo = weekDates[dayIdx - 1];
      const rocDateStr = dateInfo.fullRoc;
      const periodKey = `${dayIdx}-${pNum}`;

      tb += `<td class="p-1.5 border-r border-slate-200 h-24 align-middle text-left relative">`;

      // A. 第 0 節早自習
      if (is0) {
        if (window.scheduleViewMode === 'class') {
          const defaultHomeroom = homeroomMap[target] || '導師';
          const homeroomTask = allTasks.find(t => String(t.date).trim() === rocDateStr && extractClassId(t.classPeriod) === target && (Number(t.homeroomFee) > 0 || String(t.classPeriod).includes('代導')));

          if (homeroomTask) {
            tb += `
              <div class="h-full w-full p-2 rounded-lg bg-amber-50 border-2 border-amber-400 text-xs flex flex-col justify-between">
                <div class="flex items-center justify-between"><span class="text-xs font-black text-amber-950">🚩 代理導師晨輔</span><span class="text-[10px] px-1 bg-amber-200 text-amber-900 font-bold rounded">代導</span></div>
                <div class="text-xs font-bold text-amber-900">代導師：${homeroomTask.subTeacher}</div>
                <div class="text-[10px] text-amber-700 truncate">原任導師：${homeroomTask.origTeacher || defaultHomeroom} (差假)</div>
              </div>
            `;
          } else {
            tb += `
              <div class="h-full w-full p-2 rounded-lg border border-dashed border-amber-200 bg-amber-50/40 text-xs flex flex-col justify-between">
                <div class="text-xs font-bold text-amber-900">晨間自習 / 導師時間</div>
                <div class="text-[11px] text-amber-800">常任導師：${defaultHomeroom}</div>
              </div>
            `;
          }
        } else {
          // 教師視角
          const isSubHomeroom = allTasks.find(t => String(t.date).trim() === rocDateStr && t.subTeacher === target && (Number(t.homeroomFee) > 0 || String(t.classPeriod).includes('代導')));
          const isOrigHomeroom = allTasks.find(t => String(t.date).trim() === rocDateStr && t.origTeacher === target && (Number(t.homeroomFee) > 0 || String(t.classPeriod).includes('代導')));

          if (isSubHomeroom) {
            tb += `
              <div class="h-full w-full p-2 rounded-lg bg-amber-100 border border-amber-400 text-xs flex flex-col justify-between">
                <span class="text-xs font-black text-amber-950">🚩 代理導師出勤</span>
                <div class="text-xs font-bold text-amber-900">${extractClassId(isSubHomeroom.classPeriod)} 班代導</div>
              </div>
            `;
          } else if (isOrigHomeroom) {
            tb += `
              <div class="h-full w-full p-2 rounded-lg bg-rose-50 border border-rose-300 text-xs flex flex-col justify-between">
                <span class="text-xs font-bold text-rose-800">公差請假 (代導已排)</span>
                <div class="text-[10px] text-rose-700">代導師：${isOrigHomeroom.subTeacher}</div>
              </div>
            `;
          } else {
            const isHomeroomClass = Object.keys(homeroomMap).find(c => homeroomMap[c] === target);
            if (isHomeroomClass) {
              tb += `<div class="h-full w-full p-2 rounded-lg border border-slate-200 bg-white text-xs flex flex-col justify-between"><span class="text-xs font-bold text-slate-700">${isHomeroomClass} 晨間巡查</span><span class="text-[10px] text-slate-400">導師常態時間</span></div>`;
            } else {
              tb += `<div class="h-full w-full flex items-center justify-center text-slate-300 text-xs">—</div>`;
            }
          }
        }
        tb += `</td>`;
        continue;
      }

      // B. 第 1 ~ 8 節
      if (window.scheduleViewMode === 'class') {
        // === 班級課表模式：徹底移除任何 ⚡兼課 標籤，保護教學隱私 ===
        const specialEdId = target === '701' ? '學701' : (target === '801' ? '學801' : null);
        const baseClass = baselineMatrix.find(b => b.classId === target && b.day === dayIdx && b.period === pNum);
        const specialClass = specialEdId ? baselineMatrix.find(b => b.classId === specialEdId && b.day === dayIdx && b.period === pNum) : null;
        const classTask = allTasks.find(t => String(t.date).trim() === rocDateStr && extractPeriodNum(t.period, t.classPeriod) === pNum && extractClassId(t.classPeriod) === target);

        if (classTask) {
          tb += `
            <div class="h-full w-full p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs shadow-2xs flex flex-col justify-between">
              <div class="flex items-center justify-between"><span class="text-base font-black text-emerald-950 truncate">${classTask.subject || baseClass?.subject || '代課'}</span><span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 font-extrabold">公費代</span></div>
              <div class="text-xs text-emerald-900 font-bold truncate">代課師：${classTask.subTeacher}</div>
              <div class="text-[10px] text-emerald-700 truncate">原任：${classTask.origTeacher || baseClass?.teacher}</div>
            </div>
          `;
        } else if (baseClass) {
          // 班級課表：純粹顯示科目與授課教師，絕不出現 ⚡兼課 標籤
          tb += `
            <div class="h-full w-full p-2 rounded-lg border border-slate-200/80 bg-white hover:border-indigo-400 hover:shadow-xs transition flex flex-col justify-between">
              <div class="flex items-center justify-between gap-1">
                <span class="text-base font-black text-slate-800 tracking-wide truncate">${baseClass.subject}</span>
              </div>
              <div class="text-sm font-semibold text-slate-600">${baseClass.teacher}</div>
              ${specialClass ? `<div class="mt-1 pt-1 border-t border-purple-100 flex items-center justify-between text-[11px] text-purple-700 font-bold bg-purple-50/70 px-1.5 py-0.5 rounded"><span>♿ 抽離：${specialClass.teacher}</span><span class="font-normal text-[10px]">(${specialClass.subject})</span></div>` : ''}
            </div>
          `;
        } else {
          tb += `<div class="h-full w-full flex items-center justify-center text-slate-300 text-sm">—</div>`;
        }
      } else {
        // === 教師個人課表模式 (僅登入教師與組長可見) ===
        const baseClass = baselineMatrix.find(b => b.teacher === target && b.day === dayIdx && b.period === pNum);
        const subbingTask = allTasks.find(t => String(t.date).trim() === rocDateStr && extractPeriodNum(t.period, t.classPeriod) === pNum && t.subTeacher === target);
        const absentTask = allTasks.find(t => String(t.date).trim() === rocDateStr && extractPeriodNum(t.period, t.classPeriod) === pNum && t.origTeacher === target);
        const swapOut = allSwaps.find(s => String(s.origDate).trim() === rocDateStr && Number(s.origPeriod) === pNum && s.origTeacher === target);
        const swapIn = allSwaps.find(s => String(s.targetDate).trim() === rocDateStr && Number(s.targetPeriod) === pNum && s.origTeacher === target);

        if (subbingTask) {
          tb += `
            <div class="h-full w-full p-2.5 rounded-lg bg-emerald-100/90 border-2 border-emerald-500 text-xs shadow-xs flex flex-col justify-between">
              <div class="flex items-center justify-between"><span class="text-base font-black text-emerald-950 truncate">${extractClassId(subbingTask.classPeriod)} ${subbingTask.subject || '代課'}</span><span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-300 text-emerald-950 font-black">公費代課</span></div>
              <div class="text-xs text-emerald-900 font-bold truncate">代：${subbingTask.origTeacher} 老師</div>
              <div class="text-[10px] text-emerald-700 truncate">${subbingTask.reason || '公差排代'}</div>
            </div>
          `;
        } else if (absentTask) {
          tb += `
            <div class="h-full w-full p-2.5 rounded-lg bg-amber-50 border-2 border-dashed border-amber-400 text-xs flex flex-col justify-between">
              <div class="flex items-center justify-between"><span class="text-sm font-bold text-amber-900 line-through">${baseClass ? (baseClass.classId + ' ' + baseClass.subject) : '原排課'}</span><span class="text-[10px] px-1 bg-amber-200 text-amber-900 font-bold rounded">差假</span></div>
              <div class="text-xs text-amber-900 font-bold truncate">由 ${absentTask.subTeacher} 代課</div>
              <div class="text-[10px] text-amber-700 truncate">事由：${absentTask.reason}</div>
            </div>
          `;
        } else if (swapOut) {
          tb += `
            <div class="h-full w-full p-2 rounded-lg bg-slate-100 border border-slate-300 text-xs flex flex-col justify-between opacity-75">
              <span class="text-xs font-bold text-slate-500 line-through">${swapOut.origClassSubject}</span>
              <div class="text-[10px] text-indigo-700">已調至 ${swapOut.targetDate} 第${swapOut.targetPeriod}節</div>
            </div>
          `;
        } else if (swapIn) {
          tb += `
            <div class="h-full w-full p-2.5 rounded-lg bg-indigo-100 border-2 border-indigo-500 text-xs shadow-xs flex flex-col justify-between">
              <span class="text-base font-black text-indigo-950 truncate">${swapIn.origClassSubject}</span>
              <div class="text-xs text-indigo-900 font-bold">調入授課 (協同：${swapIn.targetTeacher})</div>
            </div>
          `;
        } else if (baseClass) {
          // 僅課務組長(admin)在檢視教師課表時，才會看到 ⚡兼課 標記
          const isOverload = (roster[target]?.overloadPeriods || []).includes(periodKey);
          tb += `
            <div class="h-full w-full p-2.5 rounded-lg border border-slate-200/80 bg-white hover:border-indigo-400 hover:shadow-xs transition flex flex-col justify-between">
              <div class="flex items-center justify-between gap-1">
                <span class="text-base font-black text-slate-800 tracking-wide truncate">${baseClass.subject}</span>
                ${(isAdmin && (isOverload || baseClass.isOvertime)) ? '<span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">⚡兼課</span>' : ''}
              </div>
              <div class="text-sm font-semibold text-slate-600">${baseClass.classId} 班</div>
            </div>
          `;
        } else {
          tb += `<div class="h-full w-full flex items-center justify-center text-slate-300 text-sm">—</div>`;
        }
      }

      tb += `</td>`;
    }
    tb += `</tr>`;
  });

  tbody.innerHTML = tb;
}

window.initAcademicWeek = initAcademicWeek;
window.getWeekDates = getWeekDates;
window.populateWeekSelect = populateWeekSelect;
window.onWeekSelectChange = onWeekSelectChange;
window.navigateWeek = navigateWeek;
window.goToCurrentWeek = goToCurrentWeek;
window.setViewMode = setViewMode;
window.renderScheduleGrid = renderScheduleGrid;
window.initScheduleTargetSelect = initScheduleTargetSelect;