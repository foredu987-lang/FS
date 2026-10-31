/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 標準 12 欄清冊與 CSV 引擎模組 (js/tasks.js)
 * 職責：標準 12 欄公課清冊渲染、RFC 4180 CSV 解析、手動排代、銷假管理、LINE 單堂通知
 */

// ==========================================
// 1. 模組內部暫存變數
// ==========================================
let pendingCsvContent = '';

// ==========================================
// 2. 標準 12 欄清冊表格渲染引擎
// ==========================================
function renderTasksTable() {
  const tbody = document.getElementById('tasksTbody');
  const emptyHint = document.getElementById('tasksEmptyHint');
  if (!tbody) return;

  const tasks = window.appData ? window.appData.tasks : [];

  if (!tasks || tasks.length === 0) {
    tbody.innerHTML = '';
    if (emptyHint) emptyHint.classList.remove('hidden');
    return;
  }

  if (emptyHint) emptyHint.classList.add('hidden');
  let html = '';

  tasks.forEach((item, index) => {
    const periods = Number(item.periods) || 0;
    const hourlyRate = Number(item.hourlyRate) || 455;
    const homeroomFee = Number(item.homeroomFee) || 0;
    const totalAmount = (periods * hourlyRate) + homeroomFee;
    const isHomeroomSub = homeroomFee > 0;

    // 假別樣式分流
    let typeBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    if (item.type.includes('公')) {
      typeBadgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    } else if (item.type.includes('身心') || item.type.includes('調適')) {
      typeBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (item.type.includes('事') || item.type.includes('病')) {
      typeBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
    }

    html += `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
        <!-- 1. 種類 -->
        <td class="py-2.5 px-3">
          <span class="px-2 py-0.5 rounded text-[11px] font-semibold border ${typeBadgeClass}">
            ${item.type}
          </span>
        </td>

        <!-- 2. 代課人姓名 -->
        <td class="py-2.5 px-3 font-bold text-slate-800">${item.subTeacher}</td>

        <!-- 3. 職稱 -->
        <td class="py-2.5 px-3 text-slate-600">${item.subTitle || '專任教師'}</td>

        <!-- 4. 核准文號 -->
        <td class="py-2.5 px-3 font-mono text-[11px] text-slate-600 max-w-[140px] truncate" title="${item.docNo || ''}">
          ${item.docNo || '—'}
        </td>

        <!-- 5. 代課日期 -->
        <td class="py-2.5 px-3 font-mono font-bold text-slate-800">${item.date}</td>

        <!-- 6. 代課節數 -->
        <td class="py-2.5 px-3 text-center font-bold font-mono text-slate-800">${periods}</td>

        <!-- 7. 每節鐘點費 -->
        <td class="py-2.5 px-3 text-right font-mono text-slate-600">$${hourlyRate}</td>

        <!-- 8. 代理導師費 -->
        <td class="py-2.5 px-3 text-right font-mono ${isHomeroomSub ? 'text-amber-600 font-bold' : 'text-slate-400'}">
          ${isHomeroomSub ? '$' + homeroomFee : '$0'}
        </td>

        <!-- 9. 應領金額 -->
        <td class="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">$${totalAmount}</td>

        <!-- 10. 被代課教師 -->
        <td class="py-2.5 px-3 font-semibold text-slate-700">${item.origTeacher}</td>

        <!-- 11. 代課事由 -->
        <td class="py-2.5 px-3 text-slate-600 max-w-xs truncate" title="${item.reason}">
          ${item.reason}
        </td>

        <!-- 12. 班級/節 -->
        <td class="py-2.5 px-3 font-bold text-indigo-900">${item.classPeriod}</td>

        <!-- 操作 -->
        <td class="py-2.5 px-3 text-center">
          <div class="inline-flex items-center gap-1.5">
            <button onclick="shareTaskLine(${index})" class="px-2 py-1 text-[11px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs">
              LINE
            </button>
            <button onclick="deleteTask(${index})" class="px-2 py-1 text-[11px] font-bold rounded bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition shadow-2xs">
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
// 3. RFC 4180 標準 CSV 解析核心演算法
// (完全支援欄位內含換行、雙引號跳脫與逗號)
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
        i++; // 跳過下一個轉義雙引號
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

  // 過濾掉全空的空白列
  return rows.filter(r => r.length > 1 && r.some(cell => cell.trim() !== ''));
}

// ==========================================
// 4. CSV 檔案選取與匯入處理流程
// ==========================================
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
    if (uploadBtn) {
      uploadBtn.disabled = false;
    }
  };
  reader.readAsText(file);
}

/**
 * 執行 CSV 解析並對齊雲林縣府 12 欄標準結構
 */
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

  // 1. 清洗表頭換行與空白字元
  const rawHeader = parsedRows[0];
  const cleanedHeader = rawHeader.map(h => h.replace(/\r?\n|\r|\s+/g, ''));

  // 2. 嚴格欄位特徵匹配，徹底杜絕「節」字劫持代課節數
  const colType = cleanedHeader.findIndex(h => h.includes('種類'));
  const colSubTeacher = cleanedHeader.findIndex(h => h.includes('代課人') || h.includes('姓名'));
  const colTitle = cleanedHeader.findIndex(h => h.includes('職稱'));
  const colDocNo = cleanedHeader.findIndex(h => h.includes('核准') || h.includes('文號'));
  const colDate = cleanedHeader.findIndex(h => h.includes('代課日期') || h.includes('日期'));
  const colPeriods = cleanedHeader.findIndex(h => h === '代課節數' || h === '節數');
  const colRate = cleanedHeader.findIndex(h => h.includes('鐘點費') || h.includes('每節'));
  const colHomeFee = cleanedHeader.findIndex(h => h.includes('代理導師費') || h.includes('導師費'));
  const colTotal = cleanedHeader.findIndex(h => h.includes('應領金額') || h.includes('實領'));
  const colOrigTeacher = cleanedHeader.findIndex(h => h.includes('被代課') || h.includes('原任'));
  const colReason = cleanedHeader.findIndex(h => h.includes('事由') || h.includes('原因'));
  const colClassPeriod = cleanedHeader.findIndex(h => h.includes('班級/節') || h.includes('班級') || h.includes('授課班'));

  let importedCount = 0;

  for (let r = 1; r < parsedRows.length; r++) {
    const row = parsedRows[r].map(c => c.trim());
    if (row.length < 5 || !row.some(c => c !== '')) continue;

    // 擷取代課教師姓名與日期 (核心防空值校驗)
    const subName = colSubTeacher !== -1 ? row[colSubTeacher] : row[1];
    const rawDate = colDate !== -1 ? row[colDate] : row[4];
    if (!subName || !rawDate) continue;

    // 處理假別種類 (單字「公」自動補正為「公假」)
    let taskType = colType !== -1 ? row[colType] : row[0];
    if (!taskType || taskType === '公') taskType = '公假';

    // 處理代課日期 (移除非數字字元)
    const dateFormatted = rawDate.replace(/[^0-9]/g, '');

    // 處理班級與節次 (支援 901/6、902/7、全日代導)
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
      if (match) {
        periodNumber = parseInt(match[1], 10);
      }
    }

    // 數值轉換
    const periodsCount = colPeriods !== -1 ? (parseInt(row[colPeriods], 10) || 1) : (parseInt(row[5], 10) || 1);
    const hourlyRate = colRate !== -1 ? (parseInt(row[colRate], 10) || 455) : (parseInt(row[6], 10) || 455);
    const homeroomFee = colHomeFee !== -1 ? (parseInt(row[colHomeFee], 10) || 0) : (parseInt(row[7], 10) || 0);
    const origTeacher = colOrigTeacher !== -1 ? row[colOrigTeacher] : (row[9] || '蔡芷儀');
    const reason = colReason !== -1 ? row[colReason] : (row[10] || '公差研習');
    const docNo = colDocNo !== -1 ? row[colDocNo] : (row[3] || '1151001');
    const title = colTitle !== -1 ? row[colTitle] : (row[2] || '專任教師');

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

  // 儲存至本機快取
  if (typeof saveToLocalStorage === 'function') {
    saveToLocalStorage();
  }

  // 刷新所有相依介面
  renderTasksTable();
  if (typeof renderScheduleGrid === 'function') renderScheduleGrid();
  if (typeof renderReportTable === 'function') renderReportTable();

  closeCsvUploadModal();
  alert(`✅ 成功匯入並解析 ${importedCount} 筆標準 12 欄排代資料！`);

  // 若已設定雲端 API，自動推播更新
  if (window.appData.config.apiUrl && typeof pushToCloud === 'function') {
    pushToCloud();
  }
}

/**
 * 依據原任課教師或節次特徵智慧推導科目名稱
 */
function inferSubject(classPeriodStr, origTeacher) {
  const roster = window.TEACHER_ROSTER || {};
  if (roster[origTeacher] && roster[origTeacher].subject) {
    return roster[origTeacher].subject;
  }

  if (classPeriodStr.includes('代導') || classPeriodStr.includes('導師')) {
    return '導師責任代導';
  }

  // 備用對照
  const subjectMap = {
    '蔡明振': '國文',
    '吳靜瑜': '英語',
    '林威珽': '自然',
    '蔡芷儀': '藝術',
    '張碧菁': '英語',
    '阮建安': '數學',
    '鄭宇涵': '特教',
    '施銘權': '數學',
    '林秋霞': '綜合',
    '李貞慧': '輔導',
    '吳俊德': '健體',
    '陳文鈴': '社會',
    '蔡麗昭': '健體'
  };

  return subjectMap[origTeacher] || '課程';
}

/**
 * 下載雲林縣府標準 12 欄 CSV 空白範本
 */
function downloadCsvTemplate() {
  const csvHeader = "\uFEFF種類,代課人\n姓  名,職稱,核准文號,代課日期,代課\n節數,每節\n鐘點費,代理\n導師費,應領\n金額,被代課\n教師,代課事由,班級/節\n";
  const sampleRows = [
    "公,李貞慧,輔導主任,1151001,1151001,1,455,0,455,蔡芷儀,教育輔導團藝術領域分團研習,901/6\n",
    "公(研習),施銘權,教務組長,1151005,1151005,1,455,0,455,蔡明振,國語文領域教學增能研習,801/2\n",
    "公假,蔡明振,801導師,1151014,1151014,0,455,493,493,張碧菁,全日公假排代導師,901/全日代導\n"
  ].join('');

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

// ==========================================
// 5. 手動新增 1 筆排代彈窗邏輯
// ==========================================
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

  const newTask = {
    id: 'task_' + Date.now(),
    type: document.getElementById('modalTaskType').value,
    subTeacher: document.getElementById('modalSubTeacher').value,
    subTitle: document.getElementById('modalSubTitle').value,
    docNo: document.getElementById('modalDocNo').value.trim(),
    date: document.getElementById('modalDate').value.replace(/[^0-9]/g, ''),
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
  alert('✅ 手動新增排代成功！課表已即時連動更新。');

  if (window.appData.config.apiUrl && typeof pushToCloud === 'function') {
    pushToCloud();
  }
}

// ==========================================
// 6. 銷假作業管理
// ==========================================
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

// ==========================================
// 7. LINE 單筆課堂通報格式封裝
// ==========================================
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

// ==========================================
// 8. 匯出至全域視窗物件
// ==========================================
window.renderTasksTable = renderTasksTable;
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