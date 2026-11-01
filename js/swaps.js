/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 同仁自辦調課模組 (js/swaps.js)
 * 升級功能：
 * 1. 申請人單方密碼驗證 (預設 1234)
 * 2. 教師自辦修改調課密碼 (直接同步至試算表)
 */

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

  swaps.forEach((swap, index) => {
    html += `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
        <td class="py-2.5 px-3 font-bold text-slate-800">${swap.origTeacher}</td>
        <td class="py-2.5 px-3 font-mono text-slate-600">${swap.origDate} 第${swap.origPeriod}節</td>
        <td class="py-2.5 px-3 font-bold text-indigo-900">${swap.origClassSubject}</td>
        <td class="py-2.5 px-3 text-center text-slate-400 font-bold">⇄</td>
        <td class="py-2.5 px-3 font-bold text-slate-800">${swap.targetTeacher}</td>
        <td class="py-2.5 px-3 font-mono text-slate-600">${swap.targetDate} 第${swap.targetPeriod}節</td>
        <td class="py-2.5 px-3 font-bold text-indigo-900">${swap.targetClassSubject}</td>
        <td class="py-2.5 px-3 text-slate-600 max-w-xs truncate" title="${swap.reason}">${swap.reason}</td>
        <td class="py-2.5 px-3 text-center">
          <button onclick="deleteSwapWithAuth(${index})" class="px-2 py-1 text-[11px] font-bold rounded bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition shadow-2xs">
            撤銷
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function handleAddSwapSubmit(event) {
  event.preventDefault();

  const origTeacher = document.getElementById('swapOrigTeacher').value;
  const targetTeacher = document.getElementById('swapTargetTeacher').value;

  if (origTeacher === targetTeacher) {
    alert('⚠️ 申請教師與協同教師不能為同一人！');
    return;
  }

  // 1. 申請人單方密碼驗證
  const roster = window.TEACHER_ROSTER || {};
  const correctPwd = roster[origTeacher]?.password || '1234';

  const userPwd = window.prompt(`🔒 請輸入【${origTeacher} 老師】的調課密碼 (預設為 1234)：`);
  if (userPwd === null) return; // 使用者按取消

  if (userPwd.trim() !== correctPwd) {
    alert('❌ 密碼錯誤！調課申請已取消。\n若忘記密碼請洽課務組長協助重設。');
    return;
  }

  // 2. 建立調課物件
  const newSwap = {
    id: 'swap_' + Date.now(),
    origTeacher: origTeacher,
    origDate: document.getElementById('swapOrigDate').value.replace(/[^0-9]/g, ''),
    origPeriod: parseInt(document.getElementById('swapOrigPeriod').value, 10),
    origClassSubject: document.getElementById('swapOrigClassSubject').value.trim(),
    targetTeacher: targetTeacher,
    targetDate: document.getElementById('swapTargetDate').value.replace(/[^0-9]/g, ''),
    targetPeriod: parseInt(document.getElementById('swapTargetPeriod').value, 10),
    targetClassSubject: document.getElementById('swapTargetClassSubject').value.trim(),
    reason: document.getElementById('swapReason').value.trim()
  };

  window.appData.swaps.push(newSwap);

  if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
  renderSwapsTable();
  if (typeof renderScheduleGrid === 'function') renderScheduleGrid();

  document.getElementById('addSwapForm').reset();
  alert(`✅ 調課申請成功！\n課表與日曆已即時同步更新。`);

  if (window.appData.config.apiUrl && typeof pushToCloud === 'function') {
    pushToCloud();
  }
}

function deleteSwapWithAuth(index) {
  const swap = window.appData.swaps[index];
  if (!swap) return;

  const isAdmin = window.isAdminUnlocked === true;
  const roster = window.TEACHER_ROSTER || {};
  const correctPwd = roster[swap.origTeacher]?.password || '1234';

  if (!isAdmin) {
    const inputPwd = window.prompt(`🔒 撤銷調課確認：\n請輸入【${swap.origTeacher} 老師】的調課密碼，或由組長解鎖最高權限：`);
    if (inputPwd === null) return;
    if (inputPwd.trim() !== correctPwd && inputPwd.trim() !== (window.appData.config.adminPassword || 'fatman')) {
      alert('❌ 密碼驗證失敗，無法撤銷此筆調課！');
      return;
    }
  }

  if (window.confirm(`確定要撤銷 ${swap.origTeacher} ⇄ ${swap.targetTeacher} 的調課申請嗎？`)) {
    window.appData.swaps.splice(index, 1);
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    renderSwapsTable();
    if (typeof renderScheduleGrid === 'function') renderScheduleGrid();
    alert('✅ 調課已順利撤銷！');

    if (window.appData.config.apiUrl && typeof pushToCloud === 'function') {
      pushToCloud();
    }
  }
}

/**
 * 教師自辦修改調課密碼
 */
function promptChangeTeacherPassword() {
  const roster = window.TEACHER_ROSTER || {};
  const names = Object.keys(roster);
  if (names.length === 0) {
    alert('尚未載入教師名冊！');
    return;
  }

  const name = window.prompt(`請輸入欲修改密碼的教師姓名 (例如：蔡明振)：`);
  if (!name || !roster[name]) {
    if (name) alert(`找不到「${name}」老師，請確認姓名是否正確。`);
    return;
  }

  const oldPwd = window.prompt(`請輸入【${name} 老師】的原密碼 (預設為 1234)：`);
  if (oldPwd === null) return;
  if (oldPwd.trim() !== (roster[name].password || '1234')) {
    alert('❌ 原密碼不正確！');
    return;
  }

  const newPwd = window.prompt(`請輸入新密碼 (4~8 碼數字或英文字元)：`);
  if (!newPwd || newPwd.trim().length < 4) {
    alert('⚠️ 新密碼長度不得少於 4 碼！');
    return;
  }

  // 1. 本地更新
  roster[name].password = newPwd.trim();
  localStorage.setItem('feisha_teacher_roster_115_1', JSON.stringify(roster));

  // 2. 雲端同步寫回試算表「教師編制」第 G 欄
  const apiUrl = window.appData?.config?.apiUrl;
  if (apiUrl && apiUrl.startsWith('http')) {
    fetch(apiUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'updateTeacherPassword',
        teacherName: name,
        newPassword: newPwd.trim()
      })
    }).then(() => {
      alert(`🎉 恭喜【${name} 老師】！\n調課密碼已成功修改為新密碼，並已即時同步至雲端試算表。`);
    });
  } else {
    alert(`🎉 【${name} 老師】調課密碼已在本機更新完成！`);
  }
}

window.renderSwapsTable = renderSwapsTable;
window.handleAddSwapSubmit = handleAddSwapSubmit;
window.deleteSwapWithAuth = deleteSwapWithAuth;
window.promptChangeTeacherPassword = promptChangeTeacherPassword;