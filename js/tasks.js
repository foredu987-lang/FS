/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 標準 12 欄清冊模組 (js/tasks.js)
 * 升級功能：
 * 1. 表頭全欄位點擊即時排序 (代課日期、姓名、金額、節數、班級)
 * 2. 9月份民國日期自動正規化補零引擎 (杜絕 115901 造成 Google 日曆漂移到 1922 年)
 */

let pendingCsvContent = '';

// 全域排序狀態
let taskSortColumn = 'date';    // 預設排序欄位：代課日期
let taskSortDirection = 'asc';  // 'asc' (升冪) 或 'desc' (降冪)

// ==========================================
// 1. 民國日期強固標準化引擎 (徹底解決 9 月日曆問題)
// ==========================================
function normalizeRocDate(rawDate) {
  if (!rawDate) return '';
  const s = String(rawDate).trim();

  // 情況 A：含分隔符號 (例: 115/9/1, 115-9-15, 115.9.3, 2026/09/01)
  if (s.includes('/') || s.includes('-') || s.includes('.')) {
    const parts = s.split(/[\/\-\.]/);
    if (parts.length >= 3) {
      let y = parseInt(parts[0], 10);
      if (y > 1900) y -= 1911; // 西元轉民國
      const m = String(parseInt(parts[1], 10)).padStart(2, '0');
      const d = String(parseInt(parts[2], 10)).padStart(2, '0');
      return `${y}${m}${d}`;
    }
  }

  // 情況 B：純數字字串
  const num = s.replace(/[^0-9]/g, '');
  if (num.length === 7) {
    return num; // 標準 7 碼 (例: 1150901, 1151001)
  }
  
  if (num.length === 6) {
    // 6 碼處理：115901 (115年9月01日) 或 115091 (115年09月1日)
    if (num.startsWith('115')) {
      const monthPart = parseInt(num.substring(3, 4), 10);
      if (monthPart === 9) {
        // 115 + 9 + 01 -> 1150901
        const d = num.substring(4).padStart(2, '0');
        return `11509${d}`;
      } else {
        // 115 + 10 + 1 -> 1151001
        const m = num.substring(3, 5);
        const d = num.substring(5).padStart(2, '0');
        return `115${m}${d}`;
      }
    }
  }

  if (num.length === 5) {
    // 5 碼處理：11591 (115年9月1日) -> 1150901
    if (num.startsWith('115')) {
      const m = String(parseInt(num.substring(3, 4), 10)).padStart(2, '0');
      const d = String(parseInt(num.substring(4, 5), 10)).padStart(2, '0');
      return `115${m}${d}`;
    }
  }

  return num;
}

// ==========================================
// 2. 表頭點擊排序控制器
// ==========================================
function toggleTaskSort(columnKey) {
  if (taskSortColumn === columnKey) {
    taskSortDirection = taskSortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    taskSortColumn = columnKey;
    taskSortDirection = 'asc';
  }
  renderTasksTable();
}

/**
 * 取得表頭排序箭頭圖示
 */
function getSortIndicator(columnKey) {
  if (taskSortColumn !== columnKey) {
    return '<span class="text-slate-300 ml-1 text-[10px]">↕</span>';
  }
  return taskSortDirection === 'asc' 
    ? '<span class="text-indigo-600 ml-1 font-bold text-xs">▲</span>' 
    : '<span class="text-indigo-600 ml-1 font-bold text-xs">▼</span>';
}

// ==========================================
// 3. 標準 12 欄清冊表格渲染引擎 (支援排序)
// ==========================================
function renderTasksTable() {
  const table = document.querySelector('#module2 table');
  const thead = table ? table.querySelector('thead') : null;
  const tbody = document.getElementById('tasksTbody');
  const emptyHint = document.getElementById('tasksEmptyHint');
  if (!tbody) return;

  const rawTasks = window.appData ? window.appData.tasks : [];

  if (!rawTasks || rawTasks.length === 0) {
    tbody.innerHTML = '';
    if (emptyHint) emptyHint.classList.remove('hidden');
    return;
  }

  if (emptyHint) emptyHint.classList.add('hidden');

  // 動態更新表頭 (賦予可點擊與視覺回饋)
  if (thead) {
    thead.innerHTML = `
      <tr class="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold whitespace-nowrap select-none">
        <th class="py-3 px-3 cursor-pointer hover:bg-slate-100 transition" onclick="toggleTaskSort('type')">
          1.種類 ${getSortIndicator('type')}
        </th>
        <th class="py-3 px-3 cursor-pointer hover:bg-slate-100 transition" onclick="toggleTaskSort('subTeacher')">
          2.代課人姓名 ${getSortIndicator('subTeacher')}
        </th>
        <th class="py-3 px-3">3.職稱</th>
        <th class="py-3 px-3">4.核准文號</th>
        <th class="py-3 px-3 cursor-pointer hover:bg-indigo-50/70 text-indigo-950 transition" onclick="toggleTaskSort('date')">
          5.代課日期 ${getSortIndicator('date')}
        </th>
        <th class="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 transition" onclick="toggleTaskSort('periods')">
          6.代課節數 ${getSortIndicator('periods')}
        </th>
        <th class="py-3 px-3 text-right">7.每節鐘點費</th>
        <th class="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition" onclick="toggleTaskSort('homeroomFee')">
          8.代理導師費 ${getSortIndicator('homeroomFee')}
        </th>
        <th class="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition" onclick="toggleTaskSort('totalAmount')">
          9.應領金額 ${getSortIndicator('totalAmount')}
        </th>
        <th class="py-3 px-3 cursor-pointer hover:bg-slate-100 transition" onclick="toggleTaskSort('origTeacher')">
          10.被代課教師 ${getSortIndicator('origTeacher')}
        </th>
        <th class="py-3 px-3">11.代課事由</th>
        <th class="py-3 px-3 cursor-pointer hover:bg-slate-100 transition" onclick="toggleTaskSort('classPeriod')">
          12.班級/節 ${getSortIndicator('classPeriod')}
        </th>
        <th class="py-3 px-3 text-center">操作</th>
      </tr>
    `;
  }

  // 排序資料副本
  const tasks = [...rawTasks];
  tasks.sort((a, b) => {
    let valA = a[taskSortColumn];
    let valB = b[taskSortColumn];

    if (taskSortColumn === 'totalAmount') {
      valA = ((Number(a.periods) || 0) * (Number(a.hourlyRate) || 455)) + (Number(a.homeroomFee) || 0);
      valB = ((Number(b.periods) || 0) * (Number(b.hourlyRate) || 455)) + (Number(b.homeroomFee) || 0);
    } else if (taskSortColumn === 'periods' || taskSortColumn === 'homeroomFee') {
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
    } else if (taskSortColumn === 'date') {
      valA = parseInt(normalizeRocDate(valA), 10) || 0;
      valB = parseInt(normalizeRocDate(valB), 10) || 0;
      // 日期相同時，次要排序依節次排序
      if (valA === valB) {
        const pA = Number(a.period) || 1;
        const pB = Number(b.period) || 1;
        return taskSortDirection === 'asc' ? pA - pB : pB - pA;
      }
    } else {
      valA = String(valA || '');
      valB = String(valB || '');
    }

    if (valA < valB) return taskSortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return taskSortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  let html = '';

  tasks.forEach((item, index) => {
    const periods = Number(item.periods) || 0;
    const hourlyRate = Number(item.hourlyRate) || 455;
    const homeroomFee = Number(item.homeroomFee) || 0;
    const totalAmount = (periods * hourlyRate) + homeroomFee;
    const isHomeroomSub = homeroomFee > 0;
    const itemType = String(item.type || '公假');

    let typeBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    if (itemType.includes('公')) {
      typeBadgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    } else if (itemType.includes('身心') || itemType.includes('調適')) {
      typeBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (itemType.includes('事') || itemType.includes('病')) {
      typeBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
    }

    // 找到在原始 appData.tasks 中的真實索引
    const origIndex = window.appData.tasks.findIndex(t => t.id === item.id);

    html += `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
        <td class="py-2.5 px-3">
          <span class="px-2 py-0.5 rounded text-[11px] font-semibold border ${typeBadgeClass}">
            ${itemType}
          </span>
        </td>
        <td class="py-2.5 px-3 font-bold text-slate-800">${item.subTeacher || ''}</td>
        <td class="py-2.5 px-3 text-slate-600">${item.subTitle || '專任教師'}</td>
        <td class="py-2.5 px-3 font-mono text-[11px] text-slate-600 max-w-[140px] truncate" title="${item.docNo || ''}">
          ${item.docNo || '—'}
        </td>
        <td class="py-2.5 px-3 font-mono font-bold text-indigo-900 bg-indigo-50/20">${normalizeRocDate(item.date)}</td>
        <td class="py-2.5 px-3 text-center font-bold font-mono text-slate-800">${periods}</td>
        <td class="py-2.5 px-3 text-right font-mono text-slate-600">$${hourlyRate}</td>
        <td class="py-2.5 px-3 text-right font-mono ${isHomeroomSub ? 'text-amber-600 font-bold' : 'text-slate-400'}">
          ${isHomeroomSub ? '$' + homeroomFee : '$0'}
        </td>
        <td class="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">$${totalAmount}</td>
        <td class="py-2.5 px-3 font-semibold text-slate-700">${item.origTeacher || ''}</td>
        <td class="py-2.5 px-3 text-slate-600 max-w-xs truncate" title="${item.reason || ''}">
          ${item.reason || ''}
        </td>
        <td class="py-2.5 px-3 font-bold text-indigo-900">${item.classPeriod || ''}</td>
        <td class="py-2.5 px-3 text-center">
          <div class="inline-flex items-center gap-1.5">
            <button onclick="shareTaskLine(${origIndex})" class="px-2 py-1 text-[11px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs">
              LINE
            </button>
            <button onclick="deleteTask(${origIndex})" class="px-2 py-1 text-[11px] font-bold rounded bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition shadow-2xs">
              銷假
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// ==========================================
// 4. RFC 4180 標準 CSV 解析與匯入引擎
// ==========================================
function parseRFC4180CSV(text) {
  let prevChar = '';
  let row = [''];
  let rows = [row];
  let colIndex = 0;
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        row[colIndex] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      colIndex++;
      row[colIndex] = '';
    } else if (char === '\n' && !inQuotes) {
      if (prevChar === '\r') {
        row[colIndex] = row[colIndex].slice(0, -1);
      }
      row = [''];
      colIndex = 0;
      rows.push(row);
    } else {
      row[colIndex] += char;
    }
    prevChar = char;
  }
  return rows.filter(r => r.length > 1 && r.some(cell => cell.trim() !== ''));
}

function openCsvUploadModal() {
  const fileInput = document.getElementById('csvFileInput');
  const fileInfo = document.getElementById('csvFileInfo');
  const uploadBtn = document.getElementById('startUploadBtn');
  if (fileInput) fileInput.value = '';
  if (fileInfo) fileInfo.classList.add('hidden');
  if (uploadBtn) uploadBtn.disabled = true;
  pendingCsvContent = '';
  const modal = document.getElementById('csvUploadModal');
  if (modal) modal.classList.remove('hidden');
}

function closeCsvUploadModal() {
  const modal = document.getElementById('csvUploadModal');
  if (modal) modal.classList.add('hidden');
}

function handleCsvFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    pendingCsvContent = e.target.result;
    const fileInfo = document.getElementById('csvFileInfo');
    const uploadBtn = document.getElementById('startUploadBtn');
    if (fileInfo) {
      fileInfo.textContent = `📄 已選取檔案：${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      fileInfo.classList.remove('hidden');
    }
    if (uploadBtn) uploadBtn.disabled = false;
  };
  reader.readAsText(file);
}

function processCsvUpload() {
  if (!pendingCsvContent) {
    alert('請先選取 CSV 檔案！');
    return;
  }

  const parsedRows = parseRFC4180CSV(pendingCsvContent);
  if (parsedRows.length < 2) {
    alert('❌ CSV 內容無有效資料列或格式不符合規範！');
    return;
  }

  const rawHeader = parsedRows[0];
  const cleanedHeader = rawHeader.map(h => h.replace(/\r?\n|\r|\s+/g, ''));

  const colType = cleanedHeader.findIndex(h => h.includes('種類'));
  const colSubTeacher = cleanedHeader.findIndex(h => h.includes('代課人') || h.includes('姓名'));
  const colTitle = cleanedHeader.findIndex(h => h.includes('職稱'));
  const colDocNo = cleanedHeader.findIndex(h => h.includes('核准') || h.includes('文號'));
  const colDate = cleanedHeader.findIndex(h => h.includes('代課日期') || h.includes('日期'));
  const colPeriods = cleanedHeader.findIndex(h => h === '代課節數' || h === '節數');
  const colRate = cleanedHeader.findIndex(h => h.includes('鐘點費') || h.includes('每節'));
  const colHomeFee = cleanedHeader.findIndex(h => h.includes('代理導師費') || h.includes('導師費'));
  const colOrigTeacher = cleanedHeader.findIndex(h => h.includes('被代課') || h.includes('原任'));
  const colReason = cleanedHeader.findIndex(h => h.includes('事由') || h.includes('原因'));
  const colClassPeriod = cleanedHeader.findIndex(h => h.includes('班級/節') || h.includes('班級') || h.includes('授課班'));

  let importedCount = 0;

  for (let r = 1; r < parsedRows.length; r++) {
    const row = parsedRows[r].map(c => c.trim());
    if (row.length < 5 || !row.some(c => c !== '')) continue;

    const subName = colSubTeacher !== -1 ? row[colSubTeacher] : row[1];
    const rawDate = colDate !== -1 ? row[colDate] : row[4];
    if (!subName || !rawDate) continue;

    let taskType = colType !== -1 ? row[colType] : row[0];
    if (!taskType || taskType === '公') taskType = '公假';

    // 關鍵修復：呼叫 normalizeRocDate 自動補零轉為標準 7 碼民國年
    const dateFormatted = normalizeRocDate(rawDate);

    let rawClassPeriod = colClassPeriod !== -1 ? row[colClassPeriod] : (row[11] || '801 第1節');
    let formattedClassPeriod = rawClassPeriod;
    let periodNumber = 1;

    if (rawClassPeriod.includes('/')) {
      const parts = rawClassPeriod.split('/');
      const className = parts[0].trim();
      const periodPart = parts[1].trim();
      if (periodPart.includes('導')) {
        formattedClassPeriod = `${className} 全日代導`;
        periodNumber = 0;
      } else {
        periodNumber = parseInt(periodPart, 10) || 1;
        formattedClassPeriod = `${className} 第${periodNumber}節`;
      }
    } else {
      const match = rawClassPeriod.match(/第?\s*([1-8])\s*節?/);
      if (match) periodNumber = parseInt(match[1], 10);
    }

    const periodsCount = colPeriods !== -1 ? (parseInt(row[colPeriods], 10) || 1) : 1;
    const hourlyRate = colRate !== -1 ? (parseInt(row[colRate], 10) || 455) : 455;
    const homeroomFee = colHomeFee !== -1 ? (parseInt(row[colHomeFee], 10) || 0) : 0;
    const origTeacher = colOrigTeacher !== -1 ? row[colOrigTeacher] : '蔡芷儀';
    const reason = colReason !== -1 ? row[colReason] : '公差研習';
    const docNo = colDocNo !== -1 ? row[colDocNo] : '1151001';
    const title = colTitle !== -1 ? row[colTitle] : '專任教師';

    const taskObject = {
      id: 'task_' + Date.now() + '_' + r,
      type: taskType,
      subTeacher: subName,
      subTitle: title,
      docNo: docNo,
      date: dateFormatted,
      periods: periodsCount,
      hourlyRate: hourlyRate,
      homeroomFee: homeroomFee,
      origTeacher: origTeacher,
      reason: reason,
      classPeriod: formattedClassPeriod,
      period: periodNumber,
      subject: inferSubject(formattedClassPeriod, origTeacher)
    };

    window.appData.tasks.push(taskObject);
    importedCount++;
  }

  if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
  renderTasksTable();
  if (typeof renderScheduleGrid === 'function') renderScheduleGrid();
  if (typeof renderReportTable === 'function') renderReportTable();

  closeCsvUploadModal();
  alert(`✅ 成功匯入並解析 ${importedCount} 筆標準 12 欄排代資料！\n日期已全數標準化，日曆行程已同步推播。`);

  if (window.appData.config.apiUrl && typeof pushToCloud === 'function') {
    pushToCloud();
  }
}

function inferSubject(classPeriodStr, origTeacher) {
  const roster = window.TEACHER_ROSTER || {};
  if (roster[origTeacher] && roster[origTeacher].subject) {
    return roster[origTeacher].subject;
  }
  if (classPeriodStr.includes('代導') || classPeriodStr.includes('導師')) {
    return '導師責任代導';
  }
  const subjectMap = {
    '蔡明振': '國文',
    '吳靜瑜': '英語',
    '林威珽': '自然',
    '蔡芷儀': '藝術',
    '張碧菁': '數學',
    '阮建安': '國文/數學',
    '鄭宇涵': '特教',
    '施銘權': '數學',
    '林秋霞': '體育',
    '李貞慧': '社會',
    '吳俊德': '健體',
    '陳文鈴': '綜合/童軍',
    '蔡麗昭': '自然'
  };
  return subjectMap[origTeacher] || '課程';
}

function downloadCsvTemplate() {
  const csvHeader = "\uFEFF種類,代課人\n姓  名,職稱,核准文號,代課日期,代課\n節數,每節\n鐘點費,代理\n導師費,應領\n金額,被代課\n教師,代課事由,班級/節\n";
  const sampleRows = "公,李貞慧,輔導主任,1151001,1151001,1,455,0,455,蔡芷儀,教育輔導團藝術領域分團研習,901/6\n";
  const blob = new Blob([csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "飛沙國中_標準12欄排代清冊空白範本.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openAddTaskModal() {
  const form = document.getElementById('addTaskForm');
  if (form) form.reset();
  const modal = document.getElementById('addTaskModal');
  if (modal) modal.classList.remove('hidden');
}

function closeAddTaskModal() {
  const modal = document.getElementById('addTaskModal');
  if (modal) modal.classList.add('hidden');
}

function handleAddTaskSubmit(event) {
  event.preventDefault();

  const rawClassPeriod = document.getElementById('modalClassPeriod').value.trim();
  let periodNumber = 1;
  let formattedCp = rawClassPeriod;

  if (rawClassPeriod.includes('/')) {
    const parts = rawClassPeriod.split('/');
    const className = parts[0].trim();
    const pPart = parts[1].trim();

    if (pPart.includes('導')) {
      formattedCp = `${className} 全日代導`;
      periodNumber = 0;
    } else {
      periodNumber = parseInt(pPart, 10) || 1;
      formattedCp = `${className} 第${periodNumber}節`;
    }
  } else {
    const match = rawClassPeriod.match(/第?\s*([1-8])\s*節?/);
    if (match) periodNumber = parseInt(match[1], 10);
  }

  const homeroomFee = parseInt(document.getElementById('modalHomeFee').value, 10) || 0;
  const periodsCount = homeroomFee > 0 && periodNumber === 0 ? 0 : 1;
  const rawDate = document.getElementById('modalDate').value;
  const normalizedDate = normalizeRocDate(rawDate);

  const newTask = {
    id: 'task_' + Date.now(),
    type: document.getElementById('modalTaskType').value,
    subTeacher: document.getElementById('modalSubTeacher').value,
    subTitle: document.getElementById('modalSubTitle').value,
    docNo: document.getElementById('modalDocNo').value.trim(),
    date: normalizedDate,
    periods: periodsCount,
    hourlyRate: 455,
    homeroomFee: homeroomFee,
    origTeacher: document.getElementById('modalOrigTeacher').value,
    reason: document.getElementById('modalReason').value.trim(),
    classPeriod: formattedCp,
    period: periodNumber,
    subject: inferSubject(formattedCp, document.getElementById('modalOrigTeacher').value)
  };

  window.appData.tasks.push(newTask);

  if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
  renderTasksTable();
  if (typeof renderScheduleGrid === 'function') renderScheduleGrid();
  if (typeof renderReportTable === 'function') renderReportTable();

  closeAddTaskModal();
  alert('✅ 手動新增排代成功！課表與日曆已即時連動更新。');

  if (window.appData.config.apiUrl && typeof pushToCloud === 'function') {
    pushToCloud();
  }
}

function deleteTask(index) {
  const task = window.appData.tasks[index];
  if (!task) return;

  const confirmMsg = `確定要為 ${task.subTeacher} 老師辦理銷假嗎？\n\n` +
    `• 課堂：${task.date} ${task.classPeriod}\n` +
    `• 原任：${task.origTeacher} 老師\n` +
    `銷假後課表將復原為常態課堂。`;

  if (window.confirm(confirmMsg)) {
    window.appData.tasks.splice(index, 1);
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    renderTasksTable();
    if (typeof renderScheduleGrid === 'function') renderScheduleGrid();
    if (typeof renderReportTable === 'function') renderReportTable();
    alert('✅ 銷假成功！');
    if (window.appData.config.apiUrl && typeof pushToCloud === 'function') {
      pushToCloud();
    }
  }
}

function shareTaskLine(index) {
  const task = window.appData.tasks[index];
  if (!task) return;

  const reminderMins = window.appData.config.reminderMinutes || 15;
  const isHomeroom = Number(task.homeroomFee) > 0;

  let lineText = `【飛沙國中 課務派代通知】\n` +
    `👤 代課教師：${task.subTeacher} 老師\n` +
    `📅 代課日期：${task.date}\n` +
    `🏫 班級節次：${task.classPeriod}\n` +
    `📚 授課科目：${task.subject || '課程'}\n` +
    `🤝 原任教師：${task.origTeacher} 老師\n` +
    `📌 假別事由：${task.reason}\n`;

  if (isHomeroom) {
    lineText += `⚠️ 本課堂包含代理導師責任 (導師費 $${task.homeroomFee})\n`;
  }

  lineText += `🔔 課前提醒：上課前 ${reminderMins} 分鐘共同日曆將發出提醒\n` +
    `敬請老師準時至班級授課，謝謝您的辛勞協助！`;

  if (typeof copyToClipboard === 'function') {
    copyToClipboard(lineText);
  }

  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = `https://line.me/R/msg/text/?${encodeURIComponent(lineText)}`;
  } else {
    alert('📋 代課通知已複製到剪貼簿！可直接切換至 LINE 電腦版群組貼上發送。');
  }
}

window.renderTasksTable = renderTasksTable;
window.toggleTaskSort = toggleTaskSort;
window.parseRFC4180CSV = parseRFC4180CSV;
window.openCsvUploadModal = openCsvUploadModal;
window.closeCsvUploadModal = closeCsvUploadModal;
window.handleCsvFileSelected = handleCsvFileSelected;
window.processCsvUpload = processCsvUpload;
window.downloadCsvTemplate = downloadCsvTemplate;
window.openAddTaskModal = openAddTaskModal;
window.closeAddTaskModal = closeAddTaskModal;
window.handleAddTaskSubmit = handleAddTaskSubmit;
window.deleteTask = deleteTask;
window.shareTaskLine = shareTaskLine;
window.inferSubject = inferSubject;
window.normalizeRocDate = normalizeRocDate;