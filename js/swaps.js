/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 同仁自辦調代課模組 (js/swaps.js)
 * 職責：互調課表單校驗登記、調課總表渲染、動態課表連動、公務紙本簽核單產製與列印
 */

// ==========================================
// 1. 同仁自辦調課表單送出處理
// ==========================================
function handleSwapSubmit(event) {
  event.preventDefault();

  const origTeacher = document.getElementById('swapOrigTeacher').value;
  const origClassSubject = document.getElementById('swapOrigClassSubject').value.trim();
  const rawOrigDate = document.getElementById('swapOrigDate').value.trim();
  const origPeriod = document.getElementById('swapOrigPeriod').value;

  const targetTeacher = document.getElementById('swapTargetTeacher').value;
  const targetClassSubject = document.getElementById('swapTargetClassSubject').value.trim();
  const rawTargetDate = document.getElementById('swapTargetDate').value.trim();
  const targetPeriod = document.getElementById('swapTargetPeriod').value;

  const reason = document.getElementById('swapReason').value.trim();

  // --- 防呆驗證機制 ---
  if (origTeacher === targetTeacher) {
    alert('⚠️ 申請教師與協同調課教師不可為同一人！若需單向請假排代，請至模組 2 登記。');
    return;
  }

  const cleanOrigDate = rawOrigDate.replace(/[^0-9]/g, '');
  const cleanTargetDate = rawTargetDate.replace(/[^0-9]/g, '');

  if (cleanOrigDate.length < 6 || cleanTargetDate.length < 6) {
    alert('⚠️ 請輸入正確的民國日期格式（例如：1151020）！');
    return;
  }

  // 封裝調課資料物件
  const newSwapRecord = {
    id: 'swap_' + Date.now(),
    origTeacher: origTeacher,
    origClassSubject: origClassSubject,
    origDate: cleanOrigDate,
    origPeriod: parseInt(origPeriod, 10),
    targetTeacher: targetTeacher,
    targetClassSubject: targetClassSubject,
    targetDate: cleanTargetDate,
    targetPeriod: parseInt(targetPeriod, 10),
    reason: reason,
    status: '已登記',
    createdAt: new Date().toISOString()
  };

  // 寫入全域狀態中心
  if (!window.appData.swaps) {
    window.appData.swaps = [];
  }
  window.appData.swaps.push(newSwapRecord);

  // 本機快取儲存
  if (typeof saveToLocalStorage === 'function') {
    saveToLocalStorage();
  }

  // 重新渲染調課總表
  renderSwapsTable();

  // 即時聯動動態課表網格
  if (typeof renderScheduleGrid === 'function') {
    renderScheduleGrid();
  }

  // 重置表單並提示同仁
  event.target.reset();
  alert(`✅ 調課登記成功！\n${origTeacher} 老師 ⇄ ${targetTeacher} 老師 之課表已自動對調。`);

  // 雲端同步
  if (window.appData.config.apiUrl && typeof pushToCloud === 'function') {
    pushToCloud();
  }
}

// ==========================================
// 2. 調課紀錄總表渲染引擎
// ==========================================
function renderSwapsTable() {
  const tbody = document.getElementById('swapsTbody');
  const emptyHint = document.getElementById('swapsEmptyHint');
  if (!tbody) return;

  const swaps = window.appData ? window.appData.swaps : [];

  if (!swaps || swaps.length === 0) {
    tbody.innerHTML = '';
    if (emptyHint) emptyHint.classList.remove('hidden');
    return;
  }

  if (emptyHint) emptyHint.classList.add('hidden');
  let html = '';

  swaps.forEach((item, index) => {
    html += `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
        <!-- 登記序號 -->
        <td class="py-2.5 px-3 font-mono font-bold text-slate-400">
          #${index + 1}
        </td>

        <!-- 申請調課教師 (調出) -->
        <td class="py-2.5 px-3 font-bold text-slate-800">
          <span class="inline-flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            ${item.origTeacher}
          </span>
        </td>

        <!-- 原時段與班級科目 -->
        <td class="py-2.5 px-3 font-mono text-slate-600">
          <span class="font-bold text-slate-700">${item.origDate}</span>
          <span class="text-indigo-600 font-bold ml-1">第${item.origPeriod}節</span>
          <span class="text-slate-500 ml-1">(${item.origClassSubject})</span>
        </td>

        <!-- 協同調課教師 (調入) -->
        <td class="py-2.5 px-3 font-bold text-emerald-700">
          <span class="inline-flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            ${item.targetTeacher}
          </span>
        </td>

        <!-- 對調後時段與班級科目 -->
        <td class="py-2.5 px-3 font-mono text-slate-600">
          <span class="font-bold text-slate-700">${item.targetDate}</span>
          <span class="text-emerald-600 font-bold ml-1">第${item.targetPeriod}節</span>
          <span class="text-slate-500 ml-1">(${item.targetClassSubject})</span>
        </td>

        <!-- 調課事由 -->
        <td class="py-2.5 px-3 text-slate-600 max-w-xs truncate" title="${item.reason}">
          ${item.reason}
        </td>

        <!-- 單據操作與刪除 -->
        <td class="py-2.5 px-3 text-center">
          <div class="inline-flex items-center gap-2">
            <button onclick="printSwapSlip(${index})" class="px-2 py-1 text-[11px] font-bold rounded bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition shadow-2xs" title="產製並列印簽核單">
              📄 印簽核單
            </button>
            <button onclick="deleteSwap(${index})" class="px-2 py-1 text-[11px] font-bold rounded bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition shadow-2xs" title="取消此筆調課">
              刪除
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// ==========================================
// 3. 刪除與撤銷調課登記
// ==========================================
function deleteSwap(index) {
  const swap = window.appData.swaps[index];
  if (!swap) return;

  const msg = `確定要取消以下這筆調課登記嗎？\n\n` +
    `• 申請人：${swap.origTeacher} (${swap.origDate} 第${swap.origPeriod}節)\n` +
    `• 對調人：${swap.targetTeacher} (${swap.targetDate} 第${swap.targetPeriod}節)\n\n` +
    `取消後雙方課表將自動還原回常態節次。`;

  if (window.confirm(msg)) {
    window.appData.swaps.splice(index, 1);

    if (typeof saveToLocalStorage === 'function') {
      saveToLocalStorage();
    }

    renderSwapsTable();

    if (typeof renderScheduleGrid === 'function') {
      renderScheduleGrid();
    }

    alert('✅ 調課登記已取消，課表已自動還原！');

    if (window.appData.config.apiUrl && typeof pushToCloud === 'function') {
      pushToCloud();
    }
  }
}

// ==========================================
// 4. 標準紙本「教師調課申請簽核單」產製與列印
// ==========================================
function printSwapSlip(index) {
  const s = window.appData.swaps[index];
  if (!s) return;

  // 建立獨立的列印視窗
  const printWindow = window.open('', '_blank', 'width=800,height=650');
  if (!printWindow) {
    alert('⚠️ 瀏覽器阻擋了列印彈出視窗，請允許本網站開啟快顯視窗。');
    return;
  }

  const today = new Date();
  const printDateStr = `${today.getFullYear() - 1911} 年 ${today.getMonth() + 1} 月 ${today.getDate()} 日`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
      <meta charset="UTF-8">
      <title>飛沙國中_教師調代課申請單_${s.origTeacher}_${s.targetTeacher}</title>
      <style>
        body {
          font-family: "標楷體", "DFKai-SB", "Times New Roman", serif;
          padding: 30px;
          color: #000;
          background: #fff;
        }
        .header {
          text-align: center;
          margin-bottom: 25px;
        }
        .header h1 {
          font-size: 22pt;
          margin: 0;
          letter-spacing: 2px;
        }
        .header h2 {
          font-size: 16pt;
          margin: 8px 0 0 0;
          letter-spacing: 1px;
        }
        .meta-bar {
          display: flex;
          justify-content: space-between;
          font-size: 11pt;
          margin-bottom: 12px;
          border-bottom: 1px solid #000;
          padding-bottom: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 12pt;
        }
        th, td {
          border: 1px solid #000;
          padding: 10px 12px;
          text-align: center;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        .text-left {
          text-align: left;
        }
        .sign-area {
          margin-top: 50px;
          display: flex;
          justify-content: space-between;
          text-align: center;
          font-size: 12pt;
        }
        .sign-box {
          width: 18%;
        }
        .sign-line {
          margin-top: 50px;
          border-bottom: 1px solid #000;
        }
        .notice {
          margin-top: 35px;
          font-size: 10pt;
          line-height: 1.6;
          color: #333;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>雲林縣立飛沙國民中學</h1>
        <h2>教師調代課申請簽核單 (115-1學期)</h2>
      </div>

      <div class="meta-bar">
        <span>登記編號：${s.id}</span>
        <span>申請日期：${printDateStr}</span>
        <span>編製：教務處課務組</span>
      </div>

      <table>
        <tr>
          <th style="width: 20%;">項目類別</th>
          <th style="width: 40%;">申請調出教師 (甲方)</th>
          <th style="width: 40%;">協同調入教師 (乙方)</th>
        </tr>
        <tr>
          <td><strong>教師姓名</strong></td>
          <td style="font-size: 14pt; font-weight: bold;">${s.origTeacher} 老師</td>
          <td style="font-size: 14pt; font-weight: bold;">${s.targetTeacher} 老師</td>
        </tr>
        <tr>
          <td><strong>授課班級與科目</strong></td>
          <td>${s.origClassSubject}</td>
          <td>${s.targetClassSubject}</td>
        </tr>
        <tr>
          <td><strong>原排定授課時段</strong></td>
          <td>民國 ${s.origDate} 第 ${s.origPeriod} 節</td>
          <td>民國 ${s.targetDate} 第 ${s.targetPeriod} 節</td>
        </tr>
        <tr>
          <td><strong>對調後授課時段</strong></td>
          <td style="color: #000; font-weight: bold;">改於：民國 ${s.targetDate} 第 ${s.targetPeriod} 節</td>
          <td style="color: #000; font-weight: bold;">改於：民國 ${s.origDate} 第 ${s.origPeriod} 節</td>
        </tr>
        <tr>
          <td><strong>調課具體事由</strong></td>
          <td colspan="2" class="text-left" style="height: 60px; vertical-align: top;">
            ${s.reason}
          </td>
        </tr>
      </table>

      <div class="notice">
        <strong>注意事項：</strong><br>
        1. 依教育部中小學兼任代課及代理教師聘任辦法，同仁自辦調課應於調課日前填妥本單經教務處備查。<br>
        2. 自行調代課時段如遇公差派代或兼課超鐘點結算，系統將依本簽核單對調後之實際授課時段進行核銷。
      </div>

      <div class="sign-area">
        <div class="sign-box">
          <div>申請教師 (調出)</div>
          <div class="sign-line"></div>
        </div>
        <div class="sign-box">
          <div>協同教師 (調入)</div>
          <div class="sign-line"></div>
        </div>
        <div class="sign-box">
          <div>課務組長</div>
          <div class="sign-line"></div>
        </div>
        <div class="sign-box">
          <div>教務主任</div>
          <div class="sign-line"></div>
        </div>
        <div class="sign-box">
          <div>校長</div>
          <div class="sign-line"></div>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      <\/script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

// ==========================================
// 5. 匯出至全域視窗物件
// ==========================================
window.handleSwapSubmit = handleSwapSubmit;
window.renderSwapsTable = renderSwapsTable;
window.deleteSwap = deleteSwap;
window.printSwapSlip = printSwapSlip;