/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 晨報速發與課前提醒模組 (js/morning.js)
 * 職責：課前提醒分鐘數偏好設定、08:00 晨間代課總匯晨報產製、LINE 訊息格式封裝與剪貼簿連動
 */

// ==========================================
// 1. 課前提醒分鐘數設定管理
// ==========================================

/**
 * 更新課前提醒分鐘數設定
 * @param {string|number} value - 提醒分鐘數 (0, 5, 10, 15, 20, 30)
 */
function updateReminderSetting(value) {
  const minutes = parseInt(value, 10) || 0;
  
  if (!window.appData.config) {
    window.appData.config = {};
  }
  window.appData.config.reminderMinutes = minutes;

  // 儲存至本機 LocalStorage
  if (typeof saveToLocalStorage === 'function') {
    saveToLocalStorage();
  }

  // 若已綁定 Google Apps Script API，將最新提醒偏好同步至後端
  if (window.appData.config.apiUrl && typeof pushToCloud === 'function') {
    pushToCloud();
  }
}

// ==========================================
// 2. 08:00 代課晨報速發視窗控制
// ==========================================

/**
 * 開啟當日 08:00 代課晨報速發視窗
 */
function openMorningDigestModal() {
  const modal = document.getElementById('morningDigestModal');
  if (!modal) return;

  // 預設填入今日之民國 7 碼日期
  setDigestDateToday();

  // 產生晨報內文
  generateMorningDigestText();

  // 顯示視窗
  modal.classList.remove('hidden');
}

/**
 * 關閉代課晨報視窗
 */
function closeMorningDigestModal() {
  const modal = document.getElementById('morningDigestModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * 將晨報檢視日期設為今日 (民國 7 碼格式，例如: 1151031)
 */
function setDigestDateToday() {
  const input = document.getElementById('digestDateInput');
  if (!input) return;

  const today = new Date();
  const rocYear = today.getFullYear() - 1911;
  const monthStr = String(today.getMonth() + 1).padStart(2, '0');
  const dayStr = String(today.getDate()).padStart(2, '0');

  input.value = `${rocYear}${monthStr}${dayStr}`;
  generateMorningDigestText();
}

// ==========================================
// 3. 晨報內容自動組裝與格式化引擎
// ==========================================

/**
 * 根據所選日期檢索當日所有代課與互調課，組合為標準 LINE 晨報格式
 */
function generateMorningDigestText() {
  const input = document.getElementById('digestDateInput');
  const textarea = document.getElementById('digestTextContent');
  if (!input || !textarea) return;

  const targetDate = input.value.trim().replace(/[^0-9]/g, '');
  if (!targetDate) {
    textarea.value = '請輸入欲查詢的民國日期（如：1151020）';
    return;
  }

  // 1. 換算星期名稱與公曆對照
  const rocYear = parseInt(targetDate.substring(0, targetDate.length - 4), 10);
  const month = parseInt(targetDate.substring(targetDate.length - 4, targetDate.length - 2), 10);
  const day = parseInt(targetDate.substring(targetDate.length - 2), 10);
  const solarYear = rocYear + 1911;
  const dateObj = new Date(solarYear, month - 1, day);
  
  const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const dayName = !isNaN(dateObj.getTime()) ? dayNames[dateObj.getDay()] : '';

  // 2. 檢索當日排代清單 (appData.tasks)
  const allTasks = window.appData ? window.appData.tasks : [];
  const todaysTasks = allTasks.filter(t => String(t.date).trim() === targetDate);

  // 排序：依節次由先至後 (第 0 節/代導排前或後，第 1 至 8 節依序)
  todaysTasks.sort((a, b) => {
    const pA = Number(a.period) || 99;
    const pB = Number(b.period) || 99;
    return pA - pB;
  });

  // 3. 檢索當日互調課清單 (appData.swaps)
  const allSwaps = window.appData ? window.appData.swaps : [];
  const todaysSwaps = allSwaps.filter(s => 
    String(s.origDate).trim() === targetDate || String(s.targetDate).trim() === targetDate
  );

  // 4. 取得當前設定之提醒分鐘數
  const reminderMinutes = (window.appData.config && window.appData.config.reminderMinutes) ? window.appData.config.reminderMinutes : 15;

  // 5. 組合晨報文案
  let reportText = `🌅【飛沙國中 課務晨報】\n`;
  reportText += `📅 日期：民國 ${rocYear} 年 ${month} 月 ${day} 日 (${dayName})\n`;
  reportText += `------------------------------------\n`;

  if (todaysTasks.length === 0 && todaysSwaps.length === 0) {
    reportText += `✨ 今日全校課務正常運行，無同仁公差派代或調課課堂。\n`;
    reportText += `祝全校全體教職員工 教學順心、愉快！\n`;
  } else {
    // --- 區塊 A: 今日公差排代課堂 ---
    if (todaysTasks.length > 0) {
      reportText += `📋【今日公課排代課堂】(共 ${todaysTasks.length} 堂)：\n\n`;

      todaysTasks.forEach((task, idx) => {
        const isHomeroom = Number(task.homeroomFee) > 0;
        const periodDisplay = task.classPeriod || `第 ${task.period} 節`;
        const subjectDisplay = task.subject || '課務';

        reportText += `${idx + 1}. [${periodDisplay}] ${task.subTeacher} 老師\n`;
        reportText += `   • 授課科目：${subjectDisplay}\n`;
        reportText += `   • 原任教師：${task.origTeacher} 老師 (${task.reason})\n`;

        if (isHomeroom) {
          reportText += `   • ⚠️ 代理導師：包含全日班級整潔、秩序與出缺席代理責任\n`;
        }
        reportText += `\n`;
      });
    }

    // --- 區塊 B: 今日同仁互調課課堂 ---
    if (todaysSwaps.length > 0) {
      reportText += `🔄【今日教師自辦互調課】：\n\n`;
      todaysSwaps.forEach((swap, idx) => {
        if (String(swap.origDate).trim() === targetDate) {
          reportText += `• [原第${swap.origPeriod}節 ${swap.origClassSubject}]\n`;
          reportText += `  ${swap.origTeacher} 老師 ⇄ ${swap.targetTeacher} 老師 (${swap.reason})\n`;
        } else {
          reportText += `• [原第${swap.targetPeriod}節 ${swap.targetClassSubject}]\n`;
          reportText += `  ${swap.targetTeacher} 老師 ⇄ ${swap.origTeacher} 老師 (${swap.reason})\n`;
        }
      });
      reportText += `\n`;
    }

    // --- 區塊 C: 課前提醒備忘 ---
    reportText += `------------------------------------\n`;
    if (reminderMinutes > 0) {
      reportText += `🔔 課前提醒：上述所有排代行程已自動同步至「學校共同日曆」，並將於上課前 ${reminderMinutes} 分鐘發出提醒鈴響，請授課同仁留意授課時段！\n`;
    } else {
      reportText += `🔔 課前提醒：請各位代課同仁準時至各班授課，謝謝大家的行政協同與辛勞協助！\n`;
    }
  }

  reportText += `教務處課務組 敬啟`;

  // 寫入介面文字框
  textarea.value = reportText;
}

// ==========================================
// 4. 晨報剪貼簿複製與 LINE 速發
// ==========================================

/**
 * 複製晨報純文字至剪貼簿
 */
function copyDigestText() {
  const textarea = document.getElementById('digestTextContent');
  if (!textarea) return;

  const content = textarea.value;
  if (!content) {
    alert('晨報內容為空！');
    return;
  }

  if (typeof copyToClipboard === 'function') {
    copyToClipboard(content);
    alert('📋 今日代課晨報已成功複製到剪貼簿！可直接切換至 LINE 貼上。');
  } else {
    textarea.select();
    document.execCommand('copy');
    alert('📋 今日代課晨報已複製！');
  }
}

/**
 * 一鍵呼叫 LINE 應用程式發送晨報
 */
function shareDigestToLine() {
  const textarea = document.getElementById('digestTextContent');
  if (!textarea) return;

  const content = textarea.value;
  if (!content) {
    alert('晨報內容為空！');
    return;
  }

  // 複製一份至剪貼簿以防跳轉遺失
  if (typeof copyToClipboard === 'function') {
    copyToClipboard(content);
  }

  // 呼叫 LINE URL Scheme (支援行動裝置直接開啟對話選擇視窗)
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(content)}`;
  window.location.href = lineUrl;
}

// ==========================================
// 5. 匯出至全域視窗物件
// ==========================================
window.updateReminderSetting = updateReminderSetting;
window.openMorningDigestModal = openMorningDigestModal;
window.closeMorningDigestModal = closeMorningDigestModal;
window.setDigestDateToday = setDigestDateToday;
window.generateMorningDigestText = generateMorningDigestText;
window.copyDigestText = copyDigestText;
window.shareDigestToLine = shareDigestToLine;