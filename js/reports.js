/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 月結公文核銷中心模組 (js/reports.js)
 * 升級：支援自由起訖日期統計 (如 1150831 ~ 1150930) 與月份快捷按鈕
 */

let currentModule5SubTab = '5-1';
let reportStartDate = '1150831';
let reportEndDate = '1150930';
let monthlyOverloadWeeks = 4;

function switchModule5SubTab(subTabId) {
  currentModule5SubTab = subTabId;
  document.querySelectorAll('.subtab-btn').forEach(btn => {
    btn.className = "subtab-btn px-3 py-1.5 rounded-md text-slate-500 hover:text-slate-800 transition font-semibold";
  });

  const activeBtn = document.getElementById(`subtab-${subTabId}`);
  if (activeBtn) {
    activeBtn.className = "subtab-btn px-3 py-1.5 rounded-md bg-white shadow text-indigo-700 font-bold transition";
  }

  const ctrl52 = document.getElementById('module52Controls');
  if (ctrl52) {
    if (subTabId === '5-2') {
      ctrl52.classList.remove('hidden');
    } else {
      ctrl52.classList.add('hidden');
    }
  }
  renderReportTable();
}

/**
 * 快捷設定結算起訖區間
 */
function setReportDateRange(startRoc, endRoc) {
  reportStartDate = String(startRoc);
  reportEndDate = String(endRoc);

  const startInput = document.getElementById('reportStartDateInput');
  const endInput = document.getElementById('reportEndDateInput');
  if (startInput) startInput.value = reportStartDate;
  if (endInput) endInput.value = reportEndDate;

  // 自動估算該區間教學週數 (天數 / 7)
  const diffDays = calculateDiffDays(reportStartDate, reportEndDate);
  monthlyOverloadWeeks = Math.max(1, Math.min(6, Math.round(diffDays / 7)));

  const disp = document.getElementById('monthlyWeeksDisplay');
  if (disp) disp.textContent = monthlyOverloadWeeks;

  renderReportTable();
}

function onCustomReportDateChange() {
  const startInput = document.getElementById('reportStartDateInput');
  const endInput = document.getElementById('reportEndDateInput');
  if (startInput && endInput) {
    reportStartDate = startInput.value.replace(/[^0-9]/g, '');
    reportEndDate = endInput.value.replace(/[^0-9]/g, '');
    const diffDays = calculateDiffDays(reportStartDate, reportEndDate);
    monthlyOverloadWeeks = Math.max(1, Math.min(6, Math.round(diffDays / 7)));
    const disp = document.getElementById('monthlyWeeksDisplay');
    if (disp) disp.textContent = monthlyOverloadWeeks;
    renderReportTable();
  }
}

function adjustMonthlyWeeks(delta) {
  const targetWeeks = monthlyOverloadWeeks + delta;
  if (targetWeeks >= 1 && targetWeeks <= 6) {
    monthlyOverloadWeeks = targetWeeks;
    const disp = document.getElementById('monthlyWeeksDisplay');
    if (disp) disp.textContent = monthlyOverloadWeeks;
    renderReportTable();
  }
}

function renderReportTable() {
  const thead = document.getElementById('reportThead');
  const tbody = document.getElementById('reportTbody');
  const tfoot = document.getElementById('reportTfoot');
  const subTitle = document.getElementById('reportSubTitle');
  const periodLabel = document.getElementById('reportMonthPeriod');

  if (!thead || !tbody || !tfoot) return;

  const tasks = window.appData ? window.appData.tasks : [];
  const roster = window.TEACHER_ROSTER || {};

  // 格式化公文抬頭區間字串
  const sTxt = formatRocDisplayDate(reportStartDate);
  const eTxt = formatRocDisplayDate(reportEndDate);
  if (periodLabel) {
    periodLabel.textContent = `結算期間：中華民國 ${sTxt} 至 ${eTxt}`;
  }

  // 核心過濾：僅納入介於起訖日之間的課堂
  const filteredTasks = tasks.filter(t => {
    const d = parseInt(String(t.date).replace(/[^0-9]/g, ''), 10);
    const start = parseInt(reportStartDate, 10);
    const end = parseInt(reportEndDate, 10);
    if (!d || isNaN(d)) return false;
    return d >= start && d <= end;
  });

  if (currentModule5SubTab === '5-1') {
    if (subTitle) subTitle.textContent = "115學年度第1學期 教師公差假課務派代印領清冊 (日間公費派代)";
    thead.innerHTML = `
      <tr>
        <th class="py-2.5 px-2 border border-slate-300">種類</th>
        <th class="py-2.5 px-2 border border-slate-300">代課人姓名</th>
        <th class="py-2.5 px-2 border border-slate-300">職稱</th>
        <th class="py-2.5 px-2 border border-slate-300">核准文號</th>
        <th class="py-2.5 px-2 border border-slate-300">代課日期</th>
        <th class="py-2.5 px-2 border border-slate-300 text-center">代課節數</th>
        <th class="py-2.5 px-2 border border-slate-300 text-right">鐘點費</th>
        <th class="py-2.5 px-2 border border-slate-300 text-right">代理導師費</th>
        <th class="py-2.5 px-2 border border-slate-300 text-right">應領金額</th>
        <th class="py-2.5 px-2 border border-slate-300">被代課教師</th>
        <th class="py-2.5 px-2 border border-slate-300">班級/節</th>
      </tr>
    `;

    const publicTasks = filteredTasks.filter(t => {
      const typeStr = String(t.type || '');
      const classPeriodStr = String(t.classPeriod || '');
      const isPublic = typeStr.includes('公') || typeStr.includes('研習');
      const isEighth = classPeriodStr.includes('8');
      return isPublic && !isEighth;
    });

    let sumPeriods = 0, sumHomeroom = 0, sumTotal = 0;
    let tbodyHtml = '';

    publicTasks.forEach(t => {
      const p = Number(t.periods) || 0;
      const rate = Number(t.hourlyRate) || 455;
      const hFee = Number(t.homeroomFee) || 0;
      const rowTotal = (p * rate) + hFee;

      sumPeriods += p;
      sumHomeroom += hFee;
      sumTotal += rowTotal;

      tbodyHtml += `
        <tr class="text-center hover:bg-slate-50 transition">
          <td class="py-2 px-2 border border-slate-300">${t.type || '公假'}</td>
          <td class="py-2 px-2 border border-slate-300 font-bold">${t.subTeacher || ''}</td>
          <td class="py-2 px-2 border border-slate-300">${t.subTitle || '教師'}</td>
          <td class="py-2 px-2 border border-slate-300 font-mono text-[11px]">${t.docNo || '—'}</td>
          <td class="py-2 px-2 border border-slate-300 font-mono">${t.date || ''}</td>
          <td class="py-2 px-2 border border-slate-300 font-mono font-bold">${p}</td>
          <td class="py-2 px-2 border border-slate-300 font-mono text-right">$${rate}</td>
          <td class="py-2 px-2 border border-slate-300 font-mono text-right ${hFee > 0 ? 'text-amber-700 font-bold' : 'text-slate-400'}">
            ${hFee > 0 ? '$' + hFee : '$0'}
          </td>
          <td class="py-2 px-2 border border-slate-300 font-mono font-bold text-right text-emerald-700">$${rowTotal}</td>
          <td class="py-2 px-2 border border-slate-300">${t.origTeacher || ''}</td>
          <td class="py-2 px-2 border border-slate-300 font-bold">${t.classPeriod || ''}</td>
        </tr>
      `;
    });

    tbody.innerHTML = tbodyHtml || `<tr><td colspan="11" class="py-8 text-center text-slate-400">該結算區間尚無日間公假代課資料</td></tr>`;

    tfoot.innerHTML = `
      <tr class="bg-slate-100 font-bold">
        <td colspan="5" class="py-2.5 px-3 border border-slate-300 text-center">
          合 計 (新臺幣大寫：<span class="text-indigo-800">${numberToChinese(sumTotal)}</span>)
        </td>
        <td class="py-2.5 px-2 border border-slate-300 text-center font-mono text-sm">${sumPeriods}</td>
        <td class="py-2.5 px-2 border border-slate-300 text-center">—</td>
        <td class="py-2.5 px-2 border border-slate-300 text-right font-mono text-amber-800 text-sm">$${sumHomeroom}</td>
        <td class="py-2.5 px-2 border border-slate-300 text-right font-mono text-emerald-800 text-sm font-extrabold">$${sumTotal}</td>
        <td colspan="2" class="border border-slate-300"></td>
      </tr>
    `;

  } else if (currentModule5SubTab === '5-2') {
    if (subTitle) subTitle.textContent = `115學年度第1學期 教師每週兼課超鐘點月結印領清冊 (結算教學週數：${monthlyOverloadWeeks} 週)`;
    thead.innerHTML = `
      <tr>
        <th class="py-2.5 px-2 border border-slate-300">教師姓名</th>
        <th class="py-2.5 px-2 border border-slate-300">職稱</th>
        <th class="py-2.5 px-2 border border-slate-300 text-center">每週兼課</th>
        <th class="py-2.5 px-2 border border-slate-300 text-center">期間應授 (週數×兼課)</th>
        <th class="py-2.5 px-2 border border-slate-300 text-center">請假缺授扣除節數</th>
        <th class="py-2.5 px-2 border border-slate-300 text-center">實授節數</th>
        <th class="py-2.5 px-2 border border-slate-300 text-right">鐘點標準</th>
        <th class="py-2.5 px-2 border border-slate-300 text-right">實發兼課金額</th>
        <th class="py-2.5 px-2 border border-slate-300 text-center w-28">簽名或蓋章</th>
      </tr>
    `;

    let totalOverloadAmount = 0, totalActualPeriods = 0, tbodyHtml = '';

    Object.keys(roster).forEach(teacherName => {
      const cfg = roster[teacherName];
      const weeklyOverload = cfg.overloadHours || 0;
      const shouldTeachTotal = weeklyOverload * monthlyOverloadWeeks;

      let deductedCount = 0;
      filteredTasks.forEach(task => {
        if (task.origTeacher === teacherName) {
          const taskDay = getRocDayOfWeek(task.date);
          const taskPeriod = Number(task.period);
          const taskPeriodKey = `${taskDay}-${taskPeriod}`;
          if ((cfg.overloadPeriods || []).includes(taskPeriodKey)) {
            deductedCount += (Number(task.periods) || 1);
          }
        }
      });

      const actualTeach = Math.max(0, shouldTeachTotal - deductedCount);
      const rowAmount = actualTeach * 455;
      totalOverloadAmount += rowAmount;
      totalActualPeriods += actualTeach;

      tbodyHtml += `
        <tr class="text-center hover:bg-slate-50 transition">
          <td class="py-2 px-2 border border-slate-300 font-bold">${teacherName}</td>
          <td class="py-2 px-2 border border-slate-300">${cfg.title}</td>
          <td class="py-2 px-2 border border-slate-300 font-mono font-semibold">${weeklyOverload} 節</td>
          <td class="py-2 px-2 border border-slate-300 font-mono">${shouldTeachTotal} 節</td>
          <td class="py-2 px-2 border border-slate-300 font-mono ${deductedCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}">
            ${deductedCount > 0 ? '－' + deductedCount : '0'}
          </td>
          <td class="py-2 px-2 border border-slate-300 font-mono font-bold text-indigo-700">${actualTeach} 節</td>
          <td class="py-2 px-2 border border-slate-300 font-mono text-right">$455</td>
          <td class="py-2 px-2 border border-slate-300 font-mono font-bold text-right text-emerald-700">$${rowAmount}</td>
          <td class="py-2 px-2 border border-slate-300 text-slate-300 text-[10px]"></td>
        </tr>
      `;
    });

    tbody.innerHTML = tbodyHtml;
    tfoot.innerHTML = `
      <tr class="bg-slate-100 font-bold">
        <td colspan="5" class="py-2.5 px-3 border border-slate-300 text-center">
          實發兼課總計 (新臺幣大寫：<span class="text-indigo-800">${numberToChinese(totalOverloadAmount)}</span>)
        </td>
        <td class="py-2.5 px-2 border border-slate-300 text-center font-mono text-sm text-indigo-900">${totalActualPeriods} 節</td>
        <td class="py-2.5 px-2 border border-slate-300 text-center">—</td>
        <td class="py-2.5 px-2 border border-slate-300 text-right font-mono text-emerald-800 text-sm font-extrabold">$${totalOverloadAmount}</td>
        <td class="border border-slate-300"></td>
      </tr>
    `;

  } else if (currentModule5SubTab === '5-3') {
    if (subTitle) subTitle.textContent = "115學年度 教育部身心調適假專案補助代課費核銷清冊 (每人每年 3 天)";
    thead.innerHTML = `
      <tr>
        <th class="py-2.5 px-2 border border-slate-300">請假教師</th>
        <th class="py-2.5 px-2 border border-slate-300">請假日期</th>
        <th class="py-2.5 px-2 border border-slate-300 text-center">累計天數 / 上限</th>
        <th class="py-2.5 px-2 border border-slate-300">代課教師</th>
        <th class="py-2.5 px-2 border border-slate-300 text-center">代課節數</th>
        <th class="py-2.5 px-2 border border-slate-300 text-right">專案鐘點費 ($455)</th>
        <th class="py-2.5 px-2 border border-slate-300 text-right">核銷金額</th>
        <th class="py-2.5 px-2 border border-slate-300">經費來源</th>
      </tr>
    `;

    const mentalTasks = filteredTasks.filter(t => {
      const typeStr = String(t.type || '');
      const reasonStr = String(t.reason || '');
      return typeStr.includes('調適') || typeStr.includes('身心') || reasonStr.includes('身心');
    });

    let sumMentalAmount = 0, sumMentalPeriods = 0, tbodyHtml = '';

    mentalTasks.forEach(t => {
      const p = Number(t.periods) || 1;
      const amt = p * 455;
      sumMentalPeriods += p;
      sumMentalAmount += amt;

      tbodyHtml += `
        <tr class="text-center hover:bg-slate-50 transition">
          <td class="py-2 px-2 border border-slate-300 font-bold">${t.origTeacher || ''}</td>
          <td class="py-2 px-2 border border-slate-300 font-mono">${t.date || ''}</td>
          <td class="py-2 px-2 border border-slate-300 font-bold text-amber-700">1 / 3 天</td>
          <td class="py-2 px-2 border border-slate-300 font-bold">${t.subTeacher || ''}</td>
          <td class="py-2 px-2 border border-slate-300 font-mono">${p}</td>
          <td class="py-2 px-2 border border-slate-300 font-mono text-right">$455</td>
          <td class="py-2 px-2 border border-slate-300 font-mono font-bold text-right text-emerald-700">$${amt}</td>
          <td class="py-2 px-2 border border-slate-300 text-slate-500 text-[11px]">教育部身心調適假專款</td>
        </tr>
      `;
    });

    tbody.innerHTML = tbodyHtml || `<tr><td colspan="8" class="py-8 text-center text-slate-400">該結算區間無申請身心調適假代課紀錄</td></tr>`;
    tfoot.innerHTML = `
      <tr class="bg-slate-100 font-bold">
        <td colspan="4" class="py-2.5 px-3 border border-slate-300 text-center">
          專案補助合計 (新臺幣大寫：<span class="text-indigo-800">${numberToChinese(sumMentalAmount)}</span>)
        </td>
        <td class="py-2.5 px-2 border border-slate-300 text-center font-mono text-sm">${sumMentalPeriods}</td>
        <td class="border border-slate-300"></td>
        <td class="py-2.5 px-2 border border-slate-300 text-right font-mono text-emerald-800 text-sm font-extrabold">$${sumMentalAmount}</td>
        <td class="border border-slate-300"></td>
      </tr>
    `;

  } else {
    if (subTitle) subTitle.textContent = "115學年度第1學期 第8節課後輔導費發放清冊 與 事病假自費代扣對照表";
    thead.innerHTML = `
      <tr>
        <th class="py-2.5 px-2 border border-slate-300">類別分流</th>
        <th class="py-2.5 px-2 border border-slate-300">代課/授課教師</th>
        <th class="py-2.5 px-2 border border-slate-300">授課班級與節次</th>
        <th class="py-2.5 px-2 border border-slate-300 text-right">鐘點標準</th>
        <th class="py-2.5 px-2 border border-slate-300">請假同仁 (扣薪對象)</th>
        <th class="py-2.5 px-2 border border-slate-300 text-right">公款請領金額</th>
        <th class="py-2.5 px-2 border border-slate-300 text-right">薪資自費代扣金額</th>
        <th class="py-2.5 px-2 border border-slate-300 text-center">會計傳票分錄</th>
      </tr>
    `;

    const eighthOrPrivateTasks = filteredTasks.filter(t => {
      const is8th = String(t.classPeriod || '').includes('8');
      const typeStr = String(t.type || '');
      const isPrivate = typeStr.includes('事') || typeStr.includes('病');
      return is8th || isPrivate;
    });

    let sumPublicAfterSchool = 0, sumPrivateDeduction = 0, tbodyHtml = '';

    eighthOrPrivateTasks.forEach(t => {
      const is8th = String(t.classPeriod || '').includes('8');
      const rate = is8th ? 450 : 455;
      const periods = Number(t.periods) || 1;
      const total = periods * rate;

      if (is8th) {
        sumPublicAfterSchool += total;
      } else {
        sumPrivateDeduction += total;
      }

      tbodyHtml += `
        <tr class="text-center hover:bg-slate-50 transition">
          <td class="py-2 px-2 border border-slate-300">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${is8th ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}">
              ${is8th ? '第八節課輔' : '事病假自費'}
            </span>
          </td>
          <td class="py-2 px-2 border border-slate-300 font-bold">${t.subTeacher || ''}</td>
          <td class="py-2 px-2 border border-slate-300 font-mono font-semibold">${t.classPeriod || ''}</td>
          <td class="py-2 px-2 border border-slate-300 font-mono text-right">$${rate}</td>
          <td class="py-2 px-2 border border-slate-300 font-semibold ${is8th ? 'text-slate-400' : 'text-rose-700 font-bold'}">
            ${is8th ? '—' : (t.origTeacher || '')}
          </td>
          <td class="py-2 px-2 border border-slate-300 font-mono text-right ${is8th ? 'text-emerald-700 font-bold' : 'text-slate-400'}">
            ${is8th ? '$' + total : '$0'}
          </td>
          <td class="py-2 px-2 border border-slate-300 font-mono text-right ${!is8th ? 'text-rose-600 font-bold' : 'text-slate-400'}">
            ${!is8th ? '$' + total : '$0'}
          </td>
          <td class="py-2 px-2 border border-slate-300 text-slate-500 text-[11px]">
            ${is8th ? '代收代付-課輔費' : '薪資自付代扣款'}
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = tbodyHtml || `<tr><td colspan="8" class="py-8 text-center text-slate-400">該結算區間無第 8 節課輔或事病假自費代扣項目</td></tr>`;
    tfoot.innerHTML = `
      <tr class="bg-slate-100 font-bold">
        <td colspan="5" class="py-2.5 px-3 border border-slate-300 text-center">
          課輔發放合計：$${sumPublicAfterSchool} ｜ 自費代扣總計：$${sumPrivateDeduction}
        </td>
        <td class="py-2.5 px-2 border border-slate-300 text-right font-mono text-emerald-800 text-sm font-extrabold">$${sumPublicAfterSchool}</td>
        <td class="py-2.5 px-2 border border-slate-300 text-right font-mono text-rose-700 text-sm font-extrabold">$${sumPrivateDeduction}</td>
        <td class="border border-slate-300"></td>
      </tr>
    `;
  }
}

function calculateDiffDays(startRoc, endRoc) {
  const s = parseRocDateToObj(startRoc);
  const e = parseRocDateToObj(endRoc);
  if (!s || !e) return 30;
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
}

function parseRocDateToObj(rocStr) {
  if (!rocStr) return null;
  const num = String(rocStr).replace(/[^0-9]/g, '');
  if (num.length < 5) return null;
  const y = parseInt(num.substring(0, num.length - 4), 10) + 1911;
  const m = parseInt(num.substring(num.length - 4, num.length - 2), 10) - 1;
  const d = parseInt(num.substring(num.length - 2), 10);
  return new Date(y, m, d);
}

function formatRocDisplayDate(rocStr) {
  if (!rocStr) return '';
  const num = String(rocStr).replace(/[^0-9]/g, '');
  if (num.length < 5) return rocStr;
  const y = num.substring(0, num.length - 4);
  const m = num.substring(num.length - 4, num.length - 2);
  const d = num.substring(num.length - 2);
  return `${y} 年 ${m} 月 ${d} 日`;
}

function getRocDayOfWeek(rocDateStr) {
  if (!rocDateStr) return null;
  const s = String(rocDateStr).trim().replace(/[^0-9]/g, '');
  if (s.length < 6) return null;
  const y = parseInt(s.substring(0, s.length - 4), 10) + 1911;
  const m = parseInt(s.substring(s.length - 4, s.length - 2), 10) - 1;
  const d = parseInt(s.substring(s.length - 2), 10);
  const dt = new Date(y, m, d);
  if (isNaN(dt.getTime())) return null;
  const day = dt.getDay();
  return (day >= 1 && day <= 5) ? day : null;
}

function numberToChinese(n) {
  if (!n || n === 0) return '零元整';
  const digit = ['零', '壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖'];
  const unit = [['元', '萬', '億'], ['', '拾', '佰', '仟']];
  let num = Math.abs(Math.round(n));
  let s = '';
  for (let i = 0; i < unit[0].length && num > 0; i++) {
    let p = '';
    for (let j = 0; j < unit[1].length && num > 0; j++) {
      p = digit[num % 10] + unit[1][j] + p;
      num = Math.floor(num / 10);
    }
    s = p.replace(/(零.)*零$/, '').replace(/^$/, '零') + unit[0][i] + s;
  }
  const result = s.replace(/(零.)*零元/, '元').replace(/(零.)+/g, '零').replace(/^整$/, '零元整');
  return (result.endsWith('元') ? result + '整' : result) || '零元整';
}

window.switchModule5SubTab = switchModule5SubTab;
window.setReportDateRange = setReportDateRange;
window.onCustomReportDateChange = onCustomReportDateChange;
window.adjustMonthlyWeeks = adjustMonthlyWeeks;
window.renderReportTable = renderReportTable;