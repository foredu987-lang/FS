/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 排代作業台與衝堂檢核矩陣模組 (js/matrix.js)
 * 職責：全校 13 位教師空堂/忙碌矩陣、點擊空堂快速派代、4 重衝堂檢核精靈、當日人力池統計
 */

// ==========================================
// 1. 模組內部狀態變數
// ==========================================
let matrixSelectedDay = 1; // 預設檢視週一 (1:週一, 2:週二, 3:週三, 4:週四, 5:週五)

// ==========================================
// 2. 初始化排代矩陣控制器
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  createQuickAssignModalDOM();
  initMatrixDaySelector();
  renderAssignmentMatrix();
});

/**
 * 初始化矩陣上方的星期切換列
 */
function initMatrixDaySelector() {
  const container = document.getElementById('matrixDaySelector');
  if (!container) return;

  const dayNames = ['週一', '週二', '週三', '週四', '週五'];
  let html = '';

  dayNames.forEach((name, idx) => {
    const dayNum = idx + 1;
    const isActive = dayNum === matrixSelectedDay;
    html += `
      <button onclick="switchMatrixDay(${dayNum})" id="matrixDayBtn_${dayNum}" 
        class="px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${isActive ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
        ${name}
      </button>
    `;
  });

  container.innerHTML = html;
}

/**
 * 切換排代矩陣檢視之星期 (週一至週五)
 */
function switchMatrixDay(dayNum) {
  matrixSelectedDay = dayNum;

  // 更新按鈕樣式
  for (let i = 1; i <= 5; i++) {
    const btn = document.getElementById(`matrixDayBtn_${i}`);
    if (btn) {
      if (i === dayNum) {
        btn.className = "px-3.5 py-1.5 text-xs font-bold rounded-lg transition bg-indigo-600 text-white shadow-xs";
      } else {
        btn.className = "px-3.5 py-1.5 text-xs font-bold rounded-lg transition bg-slate-100 text-slate-600 hover:bg-slate-200";
      }
    }
  }

  renderAssignmentMatrix();
}

// ==========================================
// 3. 核心狀態判定引擎 (判定教師在該節之真實狀態)
// ==========================================

/**
 * 計算指定教師在指定日期與節次的排課狀態
 * @returns {Object} 狀態物件 { type: 'FREE'|'BUSY'|'LEAVE'|'SUBBING'|'SWAPPED', desc: string, detail: Object }
 */
function getTeacherPeriodStatus(teacherName, dayIdx, periodNum, rocDateStr) {
  const baselineMatrix = window.BASELINE_SCHEDULE_MATRIX || [];
  const tasks = window.appData?.tasks || [];
  const swaps = window.appData?.swaps || [];

  // 1. 檢索是否有請假紀錄 (該師是被代課人)
  const leaveTask = tasks.find(t => 
    String(t.date).trim() === rocDateStr &&
    t.origTeacher === teacherName &&
    (Number(t.period) === periodNum || String(t.classPeriod).includes(`第${periodNum}節`) || String(t.classPeriod).endsWith(`/${periodNum}`))
  );
  if (leaveTask) {
    return {
      type: 'LEAVE',
      desc: `請假待代 (${leaveTask.reason})`,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
      detail: leaveTask
    };
  }

  // 2. 檢索是否已被指派為代課人
  const subTask = tasks.find(t => 
    String(t.date).trim() === rocDateStr &&
    t.subTeacher === teacherName &&
    (Number(t.period) === periodNum || String(t.classPeriod).includes(`第${periodNum}節`) || String(t.classPeriod).endsWith(`/${periodNum}`))
  );
  if (subTask) {
    return {
      type: 'SUBBING',
      desc: `代課：${subTask.classPeriod} (${subTask.subject || '課程'})`,
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
      detail: subTask
    };
  }

  // 3. 檢索是否有互調課紀錄
  const swapRecord = swaps.find(s => 
    (String(s.origDate).trim() === rocDateStr && Number(s.origPeriod) === periodNum && (s.origTeacher === teacherName || s.targetTeacher === teacherName)) ||
    (String(s.targetDate).trim() === rocDateStr && Number(s.targetPeriod) === periodNum && (s.origTeacher === teacherName || s.targetTeacher === teacherName))
  );
  if (swapRecord) {
    return {
      type: 'SWAPPED',
      desc: `調課：${swapRecord.origTeacher} ⇄ ${swapRecord.targetTeacher}`,
      badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold',
      detail: swapRecord
    };
  }

  // 4. 檢索常態課表底冊 (是否有課)
  const baseClass = baselineMatrix.find(b => 
    b.teacher === teacherName && b.day === dayIdx && b.period === periodNum
  );
  if (baseClass) {
    return {
      type: 'BUSY',
      desc: `${baseClass.classId} ${baseClass.subject}`,
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      detail: baseClass
    };
  }

  // 5. 若皆無上述紀錄，則判定為「空堂 (可供派代)」
  return {
    type: 'FREE',
    desc: '空堂 (可派代)',
    badgeClass: 'bg-emerald-50/70 text-emerald-700 border-dashed border-emerald-300 hover:bg-emerald-100 cursor-pointer font-bold',
    detail: null
  };
}

// ==========================================
// 4. 全校排代矩陣表格渲染引擎
// ==========================================
function renderAssignmentMatrix() {
  const thead = document.getElementById('matrixThead');
  const tbody = document.getElementById('matrixTbody');
  const statPool = document.getElementById('matrixStatPool');
  if (!tbody) return;

  const roster = window.TEACHER_ROSTER || {};
  const periods = window.FEISHA_PERIODS || [];
  const weekDates = typeof getWeekDates === 'function' ? getWeekDates(currentWeek) : [];
  const selectedDateInfo = weekDates[matrixSelectedDay - 1] || { month: 10, date: 21, fullRoc: '1151021' };
  const rocDateStr = selectedDateInfo.fullRoc;

  // 更新矩陣標題列
  const titleDateEl = document.getElementById('matrixTargetDateTitle');
  if (titleDateEl) {
    titleDateEl.textContent = `第 ${currentWeek} 週 · 民國 ${rocDateStr} (週${['一','二','三','四','五'][matrixSelectedDay - 1]}) 全校作息排代盤點`;
  }

  // 1. 渲染表頭 (節次 1 ~ 8)
  if (thead) {
    let thHtml = `
      <tr>
        <th class="py-2.5 px-3 border border-slate-200 bg-slate-50 text-left w-36 font-bold text-slate-700">教師姓名 (職稱)</th>
    `;
    periods.forEach(p => {
      thHtml += `
        <th class="py-2 px-1 border border-slate-200 bg-slate-50 text-center font-bold text-slate-700 text-xs">
          <div>${p.name}</div>
          <div class="text-[10px] text-slate-400 font-mono">${p.startTime}</div>
        </th>
      `;
    });
    thHtml += `</tr>`;
    thead.innerHTML = thHtml;
  }

  // 2. 統計數據計數器
  let countFreeTotal = 0;
  let countLeaveTotal = 0;
  let countSubbedTotal = 0;

  // 3. 渲染教師矩陣列
  let tbodyHtml = '';
  Object.keys(roster).forEach(teacherName => {
    const tConfig = roster[teacherName];
    tbodyHtml += `
      <tr class="hover:bg-slate-50/70 transition border-b border-slate-200 text-xs">
        <td class="py-2 px-3 border-r border-slate-200 bg-slate-50/40 font-semibold text-slate-800">
          <div class="flex items-center justify-between">
            <span class="font-bold">${teacherName}</span>
            <span class="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded">${tConfig.title}</span>
          </div>
        </td>
    `;

    periods.forEach(p => {
      const status = getTeacherPeriodStatus(teacherName, matrixSelectedDay, p.period, rocDateStr);

      if (status.type === 'FREE') countFreeTotal++;
      if (status.type === 'LEAVE') countLeaveTotal++;
      if (status.type === 'SUBBING') countSubbedTotal++;

      const isFree = status.type === 'FREE';

      tbodyHtml += `
        <td class="p-1 border-r border-slate-200 text-center align-middle h-14">
          <div onclick="${isFree ? `handleMatrixCellClick('${teacherName}', ${matrixSelectedDay}, ${p.period}, '${rocDateStr}')` : ''}"
               class="h-full w-full rounded-md border flex flex-col items-center justify-center p-1 transition ${status.badgeClass}"
               title="${teacherName} - ${p.name}：${status.desc}">
            <span class="text-[11px] leading-tight select-none">${status.desc}</span>
            ${isFree ? '<span class="text-[9px] text-emerald-600 mt-0.5 opacity-70">點擊派代 ＋</span>' : ''}
          </div>
        </td>
      `;
    });

    tbodyHtml += `</tr>`;
  });

  tbody.innerHTML = tbodyHtml;

  // 4. 更新即時人力池統計卡
  if (statPool) {
    statPool.innerHTML = `
      <div class="flex flex-wrap items-center gap-4 text-xs">
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span class="text-slate-600 font-semibold">全校當日可調用空堂節次：</span>
          <span class="font-bold text-emerald-700 font-mono text-sm">${countFreeTotal} 節次</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span class="text-slate-600 font-semibold">請假缺課節數：</span>
          <span class="font-bold text-rose-700 font-mono text-sm">${countLeaveTotal} 節</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
          <span class="text-slate-600 font-semibold">已派代支援節數：</span>
          <span class="font-bold text-indigo-700 font-mono text-sm">${countSubbedTotal} 節</span>
        </div>
      </div>
    `;
  }
}

// ==========================================
// 5. 點擊空堂一鍵直通派代與權限檢核
// ==========================================
function handleMatrixCellClick(teacherName, dayIdx, periodNum, rocDateStr) {
  // 檢查是否具備課務組長權限 (若無則觸發 PIN 碼解鎖)
  if (typeof requireAdmin === 'function') {
    requireAdmin(() => {
      openQuickAssignModal(teacherName, dayIdx, periodNum, rocDateStr);
    });
  } else {
    openQuickAssignModal(teacherName, dayIdx, periodNum, rocDateStr);
  }
}

/**
 * 開啟快速派代彈窗，預填空堂教師資料
 */
function openQuickAssignModal(teacherName, dayIdx, periodNum, rocDateStr) {
  const modal = document.getElementById('quickAssignModal');
  if (!modal) return;

  const dayNames = ['', '週一', '週二', '週三', '週四', '週五'];

  document.getElementById('qaSubTeacher').value = teacherName;
  document.getElementById('qaDate').value = rocDateStr;
  document.getElementById('qaPeriod').value = periodNum;
  document.getElementById('qaTimeHint').textContent = `${rocDateStr} (${dayNames[dayIdx]}) 第 ${periodNum} 節`;

  // 清空衝突警告標籤
  const alertBox = document.getElementById('qaConflictAlert');
  if (alertBox) alertBox.classList.add('hidden');

  modal.classList.remove('hidden');
}

function closeQuickAssignModal() {
  const modal = document.getElementById('quickAssignModal');
  if (modal) modal.classList.add('hidden');
}

// ==========================================
// 6. 智慧衝堂檢核精靈 (4 重交叉防護)
// ==========================================

/**
 * 檢查指定教師在指定日期與節次是否有衝堂
 * @returns {Object} { hasConflict: boolean, reason: string }
 */
function checkTeacherConflict(teacherName, rocDateStr, periodNum, excludeTaskId = null) {
  const dayIdx = typeof getRocDayOfWeek === 'function' ? getRocDayOfWeek(rocDateStr) : 1;
  const baselineMatrix = window.BASELINE_SCHEDULE_MATRIX || [];
  const tasks = window.appData?.tasks || [];
  const swaps = window.appData?.swaps || [];

  // 1. 檢核常態課表是否有課
  const baseClass = baselineMatrix.find(b => 
    b.teacher === teacherName && b.day === dayIdx && b.period === periodNum
  );
  if (baseClass) {
    return {
      hasConflict: true,
      reason: `${teacherName} 老師在該時段已有常態課堂【${baseClass.classId} 班 ${baseClass.subject}】，無法重複排課！`
    };
  }

  // 2. 檢核是否已代其他課
  const existingSub = tasks.find(t => 
    t.id !== excludeTaskId &&
    String(t.date).trim() === rocDateStr &&
    t.subTeacher === teacherName &&
    (Number(t.period) === periodNum || String(t.classPeriod).includes(`第${periodNum}節`) || String(t.classPeriod).endsWith(`/${periodNum}`))
  );
  if (existingSub) {
    return {
      hasConflict: true,
      reason: `${teacherName} 老師在該節已受指派代課【${existingSub.classPeriod} (代 ${existingSub.origTeacher})】，衝堂！`
    };
  }

  // 3. 檢核該師在該節是否已登記請假
  const isOnLeave = tasks.find(t => 
    String(t.date).trim() === rocDateStr &&
    t.origTeacher === teacherName &&
    (Number(t.period) === periodNum || String(t.classPeriod).includes(`第${periodNum}節`) || String(t.classPeriod).endsWith(`/${periodNum}`))
  );
  if (isOnLeave) {
    return {
      hasConflict: true,
      reason: `${teacherName} 老師在該時段已申請請假公差 (${isOnLeave.reason})，不可派代！`
    };
  }

  // 4. 檢核互調課衝突
  const swapCollision = swaps.find(s => 
    (String(s.origDate).trim() === rocDateStr && Number(s.origPeriod) === periodNum && (s.origTeacher === teacherName || s.targetTeacher === teacherName)) ||
    (String(s.targetDate).trim() === rocDateStr && Number(s.targetPeriod) === periodNum && (s.origTeacher === teacherName || s.targetTeacher === teacherName))
  );
  if (swapCollision) {
    return {
      hasConflict: true,
      reason: `${teacherName} 老師在該節有已生效的調課行程 (${swapCollision.origTeacher} ⇄ ${swapCollision.targetTeacher})！`
    };
  }

  return { hasConflict: false, reason: '' };
}

/**
 * 處理快速派代表單送出
 */
function handleQuickAssignSubmit(event) {
  event.preventDefault();

  const subTeacher = document.getElementById('qaSubTeacher').value;
  const origTeacher = document.getElementById('qaOrigTeacher').value;
  const rocDateStr = document.getElementById('qaDate').value.trim().replace(/[^0-9]/g, '');
  const periodNum = parseInt(document.getElementById('qaPeriod').value, 10);
  const targetClass = document.getElementById('qaClass').value;
  const subjectName = document.getElementById('qaSubject').value.trim() || '課程';
  const taskType = document.getElementById('qaType').value;
  const reason = document.getElementById('qaReason').value.trim() || '公差排代';

  // --- 衝堂檢核攔截 ---
  const conflictCheck = checkTeacherConflict(subTeacher, rocDateStr, periodNum);
  if (conflictCheck.hasConflict) {
    const alertBox = document.getElementById('qaConflictAlert');
    if (alertBox) {
      alertBox.textContent = `🚫 衝堂攔截：${conflictCheck.reason}`;
      alertBox.classList.remove('hidden');
    }
    if (typeof showToast === 'function') {
      showToast(conflictCheck.reason, 'error', 4500);
    }
    return;
  }

  // 封裝排代物件
  const formattedCp = `${targetClass} 第${periodNum}節`;
  const roster = window.TEACHER_ROSTER || {};
  const subTitle = roster[subTeacher] ? roster[subTeacher].title : '專任教師';

  const newTask = {
    id: 'task_' + Date.now(),
    type: taskType,
    subTeacher: subTeacher,
    subTitle: subTitle,
    docNo: rocDateStr,
    date: rocDateStr,
    periods: 1,
    hourlyRate: 455,
    homeroomFee: 0,
    origTeacher: origTeacher,
    reason: reason,
    classPeriod: formattedCp,
    period: periodNum,
    subject: subjectName
  };

  if (!window.appData.tasks) window.appData.tasks = [];
  window.appData.tasks.push(newTask);

  if (typeof saveToLocalStorage === 'function') saveToLocalStorage();

  // 刷新所有相依介面
  renderAssignmentMatrix();
  if (typeof renderTasksTable === 'function') renderTasksTable();
  if (typeof renderScheduleGrid === 'function') renderScheduleGrid();
  if (typeof renderReportTable === 'function') renderReportTable();

  closeQuickAssignModal();

  if (typeof showToast === 'function') {
    showToast(`✅ 派代成功！已安排 ${subTeacher} 老師支援 ${formattedCp} (${subjectName})。`, 'success');
  }

  if (window.appData.config.apiUrl && typeof pushToCloud === 'function') {
    pushToCloud();
  }
}

// ==========================================
// 7. 注入快速派代彈窗 DOM 結構
// ==========================================
function createQuickAssignModalDOM() {
  if (document.getElementById('quickAssignModal')) return;

  const roster = window.TEACHER_ROSTER || {};
  let teacherOptions = '';
  Object.keys(roster).forEach(name => {
    teacherOptions += `<option value="${name}">${name} (${roster[name].title})</option>`;
  });

  const modalHtml = `
    <div id="quickAssignModal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">⚡</span>
            <h3 class="text-base font-bold text-slate-800">快速指派代課 (作業矩陣)</h3>
          </div>
          <button onclick="closeQuickAssignModal()" class="text-slate-400 hover:text-slate-600 text-lg font-bold leading-none">&times;</button>
        </div>

        <form id="quickAssignForm" onsubmit="handleQuickAssignSubmit(event)" class="space-y-3 text-xs">
          <!-- 衝堂紅色警示框 -->
          <div id="qaConflictAlert" class="hidden p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 font-bold leading-relaxed"></div>

          <!-- 時段提示列 -->
          <div class="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-200 text-indigo-900 flex justify-between items-center font-bold">
            <span>指定時段：<span id="qaTimeHint" class="font-mono text-indigo-700">—</span></span>
            <span class="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">空堂可派代</span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-600 font-semibold mb-1">受派代課教師</label>
              <input type="text" id="qaSubTeacher" class="w-full border border-slate-300 rounded-lg p-2 font-bold bg-slate-100 text-slate-800" readonly>
            </div>
            <div>
              <label class="block text-slate-600 font-semibold mb-1">被代課教師 (請假同仁)</label>
              <select id="qaOrigTeacher" class="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-800">
                ${teacherOptions}
              </select>
            </div>
            <div>
              <label class="block text-slate-600 font-semibold mb-1">授課班級</label>
              <select id="qaClass" class="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-800">
                <option value="701">701 班</option>
                <option value="801">801 班</option>
                <option value="901">901 班</option>
                <option value="902">902 班</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-600 font-semibold mb-1">授課科目</label>
              <input type="text" id="qaSubject" placeholder="例：國文、數學、理化" class="w-full border border-slate-300 rounded-lg p-2 font-semibold" required>
            </div>
            <div>
              <label class="block text-slate-600 font-semibold mb-1">假別種類</label>
              <select id="qaType" class="w-full border border-slate-300 rounded-lg p-2 font-semibold">
                <option value="公假">公假 (公費排代)</option>
                <option value="公(研習)">公(研習)</option>
                <option value="身心調適假">身心調適假</option>
                <option value="事假">事假 (自費)</option>
                <option value="病假">病假 (自費)</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-600 font-semibold mb-1">每節鐘點費標準</label>
              <input type="text" value="$455 元 (公費)" class="w-full border border-slate-300 rounded-lg p-2 font-mono bg-slate-100 text-slate-600" readonly>
            </div>
          </div>

          <div>
            <label class="block text-slate-600 font-semibold mb-1">公差事由</label>
            <input type="text" id="qaReason" placeholder="例：全縣教學專業社群研習實施計畫" class="w-full border border-slate-300 rounded-lg p-2" required>
          </div>

          <!-- 隱藏欄位 -->
          <input type="hidden" id="qaDate">
          <input type="hidden" id="qaPeriod">

          <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onclick="closeQuickAssignModal()" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">取消</button>
            <button type="submit" class="px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition">
              確認派代並防衝堂檢核
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ==========================================
// 8. 匯出至全域視窗物件
// ==========================================
window.switchMatrixDay = switchMatrixDay;
window.renderAssignmentMatrix = renderAssignmentMatrix;
window.getTeacherPeriodStatus = getTeacherPeriodStatus;
window.checkTeacherConflict = checkTeacherConflict;
window.handleMatrixCellClick = handleMatrixCellClick;
window.openQuickAssignModal = openQuickAssignModal;
window.closeQuickAssignModal = closeQuickAssignModal;
window.handleQuickAssignSubmit = handleQuickAssignSubmit;