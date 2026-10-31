/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 靜態資料底冊庫 (js/data.js)
 * 包含：學期時間設定、全校 13 位教師編制超鐘點配置、全校 158 節常態課表矩陣
 */

// ==========================================
// 1. 學期時間軸與日曆常數設定
// ==========================================
const FEISHA_CONFIG_CONSTANTS = {
  academicYear: 115,
  semester: 1,
  startDate: '2026-08-31T00:00:00', // 115-1 第一週週一
  totalWeeks: 21,
  defaultCalendarId: 'c_9f7d9e917c79ee2de6f54ed275f97d9bfdb493ba457a0135b69438213e217ba6@group.calendar.google.com',
  hourlyRates: {
    regular: 455,      // 日間第 1-7 節公費/自費鐘點
    afterSchool: 450,  // 第 8 節課後輔導鐘點
    fullDayHomeroom: 493, // 全日代理導師費
    halfDayHomeroom: 246  // 半日代理導師費
  }
};

// ==========================================
// 2. 每日各節次時段定義 (第 1 節 ~ 第 8 節)
// ==========================================
const FEISHA_PERIODS = [
  { period: 1, name: '第 1 節', startTime: '08:20', endTime: '09:05', display: '08:20 - 09:05' },
  { period: 2, name: '第 2 節', startTime: '09:15', endTime: '10:00', display: '09:15 - 10:00' },
  { period: 3, name: '第 3 節', startTime: '10:10', endTime: '10:55', display: '10:10 - 10:55' },
  { period: 4, name: '第 4 節', startTime: '11:05', endTime: '11:50', display: '11:05 - 11:50' },
  { period: 5, name: '第 5 節', startTime: '13:10', endTime: '13:55', display: '13:10 - 13:55' },
  { period: 6, name: '第 6 節', startTime: '14:05', endTime: '14:50', display: '14:05 - 14:50' },
  { period: 7, name: '第 7 節', startTime: '15:00', endTime: '15:45', display: '15:00 - 15:45' },
  { period: 8, name: '第 8 節', startTime: '16:00', endTime: '16:45', display: '16:00 - 16:45' }
];

// ==========================================
// 3. 全校 13 位教師編制與指定兼課超鐘點時段
// (代碼格式: '星期-節次'，例如 '2-3' 代表週二第 3 節)
// ==========================================
const TEACHER_ROSTER = {
  '蔡明振': {
    title: '801導師',
    subject: '國文',
    baseHours: 16,
    overloadHours: 3,
    overloadPeriods: ['2-3', '3-6', '4-2']
  },
  '吳靜瑜': {
    title: '專任教師',
    subject: '英語',
    baseHours: 18,
    overloadHours: 2,
    overloadPeriods: ['2-4', '4-6']
  },
  '林威珽': {
    title: '902導師',
    subject: '自然',
    baseHours: 16,
    overloadHours: 2,
    overloadPeriods: ['1-5', '5-3']
  },
  '蔡芷儀': {
    title: '專任教師',
    subject: '藝術',
    baseHours: 18,
    overloadHours: 3,
    overloadPeriods: ['1-4', '3-2', '5-1']
  },
  '張碧菁': {
    title: '901導師',
    subject: '英語',
    baseHours: 16,
    overloadHours: 2,
    overloadPeriods: ['2-2', '4-4']
  },
  '阮建安': {
    title: '701導師',
    subject: '數學',
    baseHours: 16,
    overloadHours: 2,
    overloadPeriods: ['3-3', '5-2']
  },
  '鄭宇涵': {
    title: '資源班導師',
    subject: '特教',
    baseHours: 16,
    overloadHours: 1,
    overloadPeriods: ['4-3']
  },
  '施銘權': {
    title: '教務組長',
    subject: '數學',
    baseHours: 10,
    overloadHours: 2,
    overloadPeriods: ['2-1', '4-5']
  },
  '林秋霞': {
    title: '訓導組長',
    subject: '綜合',
    baseHours: 10,
    overloadHours: 1,
    overloadPeriods: ['3-1']
  },
  '李貞慧': {
    title: '輔導主任',
    subject: '輔導',
    baseHours: 2,
    overloadHours: 1,
    overloadPeriods: ['1-6']
  },
  '吳俊德': {
    title: '總務主任',
    subject: '健體',
    baseHours: 2,
    overloadHours: 1,
    overloadPeriods: ['2-5']
  },
  '陳文鈴': {
    title: '專任教師',
    subject: '社會',
    baseHours: 18,
    overloadHours: 2,
    overloadPeriods: ['3-4', '5-4']
  },
  '蔡麗昭': {
    title: '專任教師',
    subject: '健體',
    baseHours: 18,
    overloadHours: 1,
    overloadPeriods: ['5-6']
  }
};

// ==========================================
// 4. 全校 158 節常態課表底冊矩陣 (115-1 基準)
// 包含 701、801、901、902 四個班級週一至週五完整配置
// ==========================================
const BASELINE_SCHEDULE_MATRIX = [
  // --- 701 班 (39節：日間35節 + 週一至週四第8節4節) ---
  { classId: '701', day: 1, period: 1, subject: '國文', teacher: '蔡明振', room: '701教室' },
  { classId: '701', day: 1, period: 2, subject: '英語', teacher: '吳靜瑜', room: '701教室' },
  { classId: '701', day: 1, period: 3, subject: '數學', teacher: '阮建安', room: '701教室' },
  { classId: '701', day: 1, period: 4, subject: '表演藝術', teacher: '蔡芷儀', room: '視聽教室' },
  { classId: '701', day: 1, period: 5, subject: '歷史', teacher: '陳文鈴', room: '701教室' },
  { classId: '701', day: 1, period: 6, subject: '生物', teacher: '林威珽', room: '理化實驗室' },
  { classId: '701', day: 1, period: 7, subject: '體育', teacher: '蔡麗昭', room: '操場' },
  { classId: '701', day: 1, period: 8, subject: '課後輔導', teacher: '阮建安', room: '701教室' },

  { classId: '701', day: 2, period: 1, subject: '數學', teacher: '阮建安', room: '701教室' },
  { classId: '701', day: 2, period: 2, subject: '生物', teacher: '林威珽', room: '理化實驗室' },
  { classId: '701', day: 2, period: 3, subject: '國文', teacher: '蔡明振', room: '701教室' },
  { classId: '701', day: 2, period: 4, subject: '英語', teacher: '吳靜瑜', room: '701教室' },
  { classId: '701', day: 2, period: 5, subject: '地理', teacher: '陳文鈴', room: '701教室' },
  { classId: '701', day: 2, period: 6, subject: '資訊科技', teacher: '施銘權', room: '電腦教室' },
  { classId: '701', day: 2, period: 7, subject: '健體', teacher: '蔡麗昭', room: '701教室' },
  { classId: '701', day: 2, period: 8, subject: '課後輔導', teacher: '蔡明振', room: '701教室' },

  { classId: '701', day: 3, period: 1, subject: '童軍', teacher: '林秋霞', room: '童軍教室' },
  { classId: '701', day: 3, period: 2, subject: '國文', teacher: '蔡明振', room: '701教室' },
  { classId: '701', day: 3, period: 3, subject: '數學', teacher: '阮建安', room: '701教室' },
  { classId: '701', day: 3, period: 4, subject: '公民', teacher: '陳文鈴', room: '701教室' },
  { classId: '701', day: 3, period: 5, subject: '視覺藝術', teacher: '蔡芷儀', room: '美術教室' },
  { classId: '701', day: 3, period: 6, subject: '英語', teacher: '吳靜瑜', room: '701教室' },
  { classId: '701', day: 3, period: 7, subject: '彈性課程', teacher: '阮建安', room: '701教室' },
  { classId: '701', day: 3, period: 8, subject: '課後輔導', teacher: '吳靜瑜', room: '701教室' },

  { classId: '701', day: 4, period: 1, subject: '英語', teacher: '吳靜瑜', room: '701教室' },
  { classId: '701', day: 4, period: 2, subject: '國文', teacher: '蔡明振', room: '701教室' },
  { classId: '701', day: 4, period: 3, subject: '資源班特教', teacher: '鄭宇涵', room: '資源教室' },
  { classId: '701', day: 4, period: 4, subject: '數學', teacher: '阮建安', room: '701教室' },
  { classId: '701', day: 4, period: 5, subject: '體育', teacher: '蔡麗昭', room: '操場' },
  { classId: '701', day: 4, period: 6, subject: '生活科技', teacher: '施銘權', room: '生科教室' },
  { classId: '701', day: 4, period: 7, subject: '輔導活動', teacher: '李貞慧', room: '輔導教室' },
  { classId: '701', day: 4, period: 8, subject: '課後輔導', teacher: '阮建安', room: '701教室' },

  { classId: '701', day: 5, period: 1, subject: '國文', teacher: '蔡明振', room: '701教室' },
  { classId: '701', day: 5, period: 2, subject: '彈性數學', teacher: '阮建安', room: '701教室' },
  { classId: '701', day: 5, period: 3, subject: '生物', teacher: '林威珽', room: '理化實驗室' },
  { classId: '701', day: 5, period: 4, subject: '音樂', teacher: '蔡芷儀', room: '音樂教室' },
  { classId: '701', day: 5, period: 5, subject: '歷史', teacher: '陳文鈴', room: '701教室' },
  { classId: '701', day: 5, period: 6, subject: '家政', teacher: '蔡麗昭', room: '家政教室' },
  { classId: '701', day: 5, period: 7, subject: '班會週會', teacher: '阮建安', room: '701教室' },

  // --- 801 班 (40節：日間35節 + 週一至週五第8節5節) ---
  { classId: '801', day: 1, period: 1, subject: '數學', teacher: '施銘權', room: '801教室' },
  { classId: '801', day: 1, period: 2, subject: '理化', teacher: '林威珽', room: '理化實驗室' },
  { classId: '801', day: 1, period: 3, subject: '國文', teacher: '蔡明振', room: '801教室' },
  { classId: '801', day: 1, period: 4, subject: '英語', teacher: '吳靜瑜', room: '801教室' },
  { classId: '801', day: 1, period: 5, subject: '歷史', teacher: '陳文鈴', room: '801教室' },
  { classId: '801', day: 1, period: 6, subject: '輔導活動', teacher: '李貞慧', room: '輔導教室' },
  { classId: '801', day: 1, period: 7, subject: '體育', teacher: '吳俊德', room: '操場' },
  { classId: '801', day: 1, period: 8, subject: '課後輔導', teacher: '蔡明振', room: '801教室' },

  { classId: '801', day: 2, period: 1, subject: '數學', teacher: '施銘權', room: '801教室' },
  { classId: '801', day: 2, period: 2, subject: '地理', teacher: '陳文鈴', room: '801教室' },
  { classId: '801', day: 2, period: 3, subject: '國文', teacher: '蔡明振', room: '801教室' },
  { classId: '801', day: 2, period: 4, subject: '英語', teacher: '吳靜瑜', room: '801教室' },
  { classId: '801', day: 2, period: 5, subject: '理化', teacher: '林威珽', room: '理化實驗室' },
  { classId: '801', day: 2, period: 6, subject: '資訊科技', teacher: '施銘權', room: '電腦教室' },
  { classId: '801', day: 2, period: 7, subject: '表演藝術', teacher: '蔡芷儀', room: '視聽教室' },
  { classId: '801', day: 2, period: 8, subject: '課後輔導', teacher: '施銘權', room: '801教室' },

  { classId: '801', day: 3, period: 1, subject: '英語', teacher: '吳靜瑜', room: '801教室' },
  { classId: '801', day: 3, period: 2, subject: '理化', teacher: '林威珽', room: '理化實驗室' },
  { classId: '801', day: 3, period: 3, subject: '數學', teacher: '施銘權', room: '801教室' },
  { classId: '801', day: 3, period: 4, subject: '歷史', teacher: '陳文鈴', room: '801教室' },
  { classId: '801', day: 3, period: 5, subject: '體育', teacher: '蔡麗昭', room: '操場' },
  { classId: '801', day: 3, period: 6, subject: '閱讀寫作', teacher: '蔡明振', room: '801教室' },
  { classId: '801', day: 3, period: 7, subject: '童軍', teacher: '林秋霞', room: '童軍教室' },
  { classId: '801', day: 3, period: 8, subject: '課後輔導', teacher: '林威珽', room: '801教室' },

  { classId: '801', day: 4, period: 1, subject: '理化', teacher: '林威珽', room: '理化實驗室' },
  { classId: '801', day: 4, period: 2, subject: '國文', teacher: '蔡明振', room: '801教室' },
  { classId: '801', day: 4, period: 3, subject: '公民', teacher: '陳文鈴', room: '801教室' },
  { classId: '801', day: 4, period: 4, subject: '生活科技', teacher: '施銘權', room: '生科教室' },
  { classId: '801', day: 4, period: 5, subject: '數學', teacher: '施銘權', room: '801教室' },
  { classId: '801', day: 4, period: 6, subject: '英語', teacher: '吳靜瑜', room: '801教室' },
  { classId: '801', day: 4, period: 7, subject: '家政', teacher: '蔡麗昭', room: '家政教室' },
  { classId: '801', day: 4, period: 8, subject: '課後輔導', teacher: '吳靜瑜', room: '801教室' },

  { classId: '801', day: 5, period: 1, subject: '視覺藝術', teacher: '蔡芷儀', room: '美術教室' },
  { classId: '801', day: 5, period: 2, subject: '國文', teacher: '蔡明振', room: '801教室' },
  { classId: '801', day: 5, period: 3, subject: '英語', teacher: '吳靜瑜', room: '801教室' },
  { classId: '801', day: 5, period: 4, subject: '音樂', teacher: '蔡芷儀', room: '音樂教室' },
  { classId: '801', day: 5, period: 5, subject: '健體', teacher: '蔡麗昭', room: '801教室' },
  { classId: '801', day: 5, period: 6, subject: '彈性課程', teacher: '蔡明振', room: '801教室' },
  { classId: '801', day: 5, period: 7, subject: '班會週會', teacher: '蔡明振', room: '801教室' },
  { classId: '801', day: 5, period: 8, subject: '課後輔導', teacher: '蔡明振', room: '801教室' },

  // --- 901 班 (40節：日間35節 + 週一至週五第8節5節) ---
  { classId: '901', day: 1, period: 1, subject: '英語', teacher: '張碧菁', room: '901教室' },
  { classId: '901', day: 1, period: 2, subject: '國文', teacher: '蔡明振', room: '901教室' },
  { classId: '901', day: 1, period: 3, subject: '數學', teacher: '阮建安', room: '901教室' },
  { classId: '901', day: 1, period: 4, subject: '理化', teacher: '林威珽', room: '理化實驗室' },
  { classId: '901', day: 1, period: 5, subject: '歷史', teacher: '陳文鈴', room: '901教室' },
  { classId: '901', day: 1, period: 6, subject: '體育', teacher: '蔡麗昭', room: '操場' },
  { classId: '901', day: 1, period: 7, subject: '輔導活動', teacher: '李貞慧', room: '輔導教室' },
  { classId: '901', day: 1, period: 8, subject: '課後輔導', teacher: '張碧菁', room: '901教室' },

  { classId: '901', day: 2, period: 1, subject: '國文', teacher: '蔡明振', room: '901教室' },
  { classId: '901', day: 2, period: 2, subject: '英語', teacher: '張碧菁', room: '901教室' },
  { classId: '901', day: 2, period: 3, subject: '數學', teacher: '阮建安', room: '901教室' },
  { classId: '901', day: 2, period: 4, subject: '理化', teacher: '林威珽', room: '理化實驗室' },
  { classId: '901', day: 2, period: 5, subject: '地理', teacher: '陳文鈴', room: '901教室' },
  { classId: '901', day: 2, period: 6, subject: '生活科技', teacher: '施銘權', room: '生科教室' },
  { classId: '901', day: 2, period: 7, subject: '童軍', teacher: '林秋霞', room: '童軍教室' },
  { classId: '901', day: 2, period: 8, subject: '課後輔導', teacher: '阮建安', room: '901教室' },

  { classId: '901', day: 3, period: 1, subject: '數學', teacher: '阮建安', room: '901教室' },
  { classId: '901', day: 3, period: 2, subject: '視覺藝術', teacher: '蔡芷儀', room: '美術教室' },
  { classId: '901', day: 3, period: 3, subject: '國文', teacher: '蔡明振', room: '901教室' },
  { classId: '901', day: 3, period: 4, subject: '英語', teacher: '張碧菁', room: '901教室' },
  { classId: '901', day: 3, period: 5, subject: '理化', teacher: '林威珽', room: '理化實驗室' },
  { classId: '901', day: 3, period: 6, subject: '藝術', teacher: '蔡芷儀', room: '視聽教室' },
  { classId: '901', day: 3, period: 7, subject: '體育', teacher: '蔡麗昭', room: '操場' },
  { classId: '901', day: 3, period: 8, subject: '課後輔導', teacher: '林威珽', room: '901教室' },

  { classId: '901', day: 4, period: 1, subject: '理化', teacher: '林威珽', room: '理化實驗室' },
  { classId: '901', day: 4, period: 2, subject: '數學', teacher: '阮建安', room: '901教室' },
  { classId: '901', day: 4, period: 3, subject: '國文', teacher: '蔡明振', room: '901教室' },
  { classId: '901', day: 4, period: 4, subject: '英語', teacher: '張碧菁', room: '901教室' },
  { classId: '901', day: 4, period: 5, subject: '資訊科技', teacher: '施銘權', room: '電腦教室' },
  { classId: '901', day: 4, period: 6, subject: '音樂', teacher: '蔡芷儀', room: '音樂教室' },
  { classId: '901', day: 4, period: 7, subject: '家政', teacher: '蔡麗昭', room: '家政教室' },
  { classId: '901', day: 4, period: 8, subject: '課後輔導', teacher: '張碧菁', room: '901教室' },

  { classId: '901', day: 5, period: 1, subject: '國文', teacher: '蔡明振', room: '901教室' },
  { classId: '901', day: 5, period: 2, subject: '英語閱讀', teacher: '張碧菁', room: '901教室' },
  { classId: '901', day: 5, period: 3, subject: '理化', teacher: '林威珽', room: '理化實驗室' },
  { classId: '901', day: 5, period: 4, subject: '公民', teacher: '陳文鈴', room: '901教室' },
  { classId: '901', day: 5, period: 5, subject: '健體', teacher: '蔡麗昭', room: '901教室' },
  { classId: '901', day: 5, period: 6, subject: '表演藝術', teacher: '蔡芷儀', room: '視聽教室' },
  { classId: '901', day: 5, period: 7, subject: '班會週會', teacher: '張碧菁', room: '901教室' },
  { classId: '901', day: 5, period: 8, subject: '課後輔導', teacher: '蔡明振', room: '901教室' },

  // --- 902 班 (39節：日間35節 + 週一至週四第8節4節) ---
  { classId: '902', day: 1, period: 1, subject: '國文', teacher: '蔡明振', room: '902教室' },
  { classId: '902', day: 1, period: 2, subject: '英語', teacher: '張碧菁', room: '902教室' },
  { classId: '902', day: 1, period: 3, subject: '理化', teacher: '林威珽', room: '理化實驗室' },
  { classId: '902', day: 1, period: 4, subject: '數學', teacher: '阮建安', room: '902教室' },
  { classId: '902', day: 1, period: 5, subject: '理化', teacher: '林威珽', room: '理化實驗室' },
  { classId: '902', day: 1, period: 6, subject: '視覺藝術', teacher: '蔡芷儀', room: '美術教室' },
  { classId: '902', day: 1, period: 7, subject: '歷史', teacher: '陳文鈴', room: '902教室' },
  { classId: '902', day: 1, period: 8, subject: '課後輔導', teacher: '林威珽', room: '902教室' },

  { classId: '902', day: 2, period: 1, subject: '英語', teacher: '張碧菁', room: '902教室' },
  { classId: '902', day: 2, period: 2, subject: '數學', teacher: '阮建安', room: '902教室' },
  { classId: '902', day: 2, period: 3, subject: '理化', teacher: '林威珽', room: '理化實驗室' },
  { classId: '902', day: 2, period: 4, subject: '國文', teacher: '蔡明振', room: '902教室' },
  { classId: '902', day: 2, period: 5, subject: '體育', teacher: '吳俊德', room: '操場' },
  { classId: '902', day: 2, period: 6, subject: '童軍', teacher: '林秋霞', room: '童軍教室' },
  { classId: '902', day: 2, period: 7, subject: '公民', teacher: '陳文鈴', room: '902教室' },
  { classId: '902', day: 2, period: 8, subject: '課後輔導', teacher: '張碧菁', room: '902教室' },

  { classId: '902', day: 3, period: 1, subject: '國文', teacher: '蔡明振', room: '902教室' },
  { classId: '902', day: 3, period: 2, subject: '英語', teacher: '張碧菁', room: '902教室' },
  { classId: '902', day: 3, period: 3, subject: '理化', teacher: '林威珽', room: '理化實驗室' },
  { classId: '902', day: 3, period: 4, subject: '數學', teacher: '阮建安', room: '902教室' },
  { classId: '902', day: 3, period: 5, subject: '地理', teacher: '陳文鈴', room: '902教室' },
  { classId: '902', day: 3, period: 6, subject: '生活科技', teacher: '施銘權', room: '生科教室' },
  { classId: '902', day: 3, period: 7, subject: '藝術', teacher: '蔡芷儀', room: '視聽教室' },
  { classId: '902', day: 3, period: 8, subject: '課後輔導', teacher: '林威珽', room: '902教室' },

  { classId: '902', day: 4, period: 1, subject: '數學', teacher: '阮建安', room: '902教室' },
  { classId: '902', day: 4, period: 2, subject: '英語', teacher: '張碧菁', room: '902教室' },
  { classId: '902', day: 4, period: 3, subject: '國文', teacher: '蔡明振', room: '902教室' },
  { classId: '902', day: 4, period: 4, subject: '理化', teacher: '林威珽', room: '理化實驗室' },
  { classId: '902', day: 4, period: 5, subject: '體育', teacher: '吳俊德', room: '操場' },
  { classId: '902', day: 4, period: 6, subject: '音樂', teacher: '蔡芷儀', room: '音樂教室' },
  { classId: '902', day: 4, period: 7, subject: '輔導活動', teacher: '李貞慧', room: '輔導教室' },
  { classId: '902', day: 4, period: 8, subject: '課後輔導', teacher: '蔡明振', room: '902教室' },

  { classId: '902', day: 5, period: 1, subject: '國文', teacher: '蔡明振', room: '902教室' },
  { classId: '902', day: 5, period: 2, subject: '英語閱讀', teacher: '張碧菁', room: '902教室' },
  { classId: '902', day: 5, period: 3, subject: '理化探究', teacher: '林威珽', room: '理化實驗室' },
  { classId: '902', day: 5, period: 4, subject: '資訊科技', teacher: '施銘權', room: '電腦教室' },
  { classId: '902', day: 5, period: 5, subject: '家政', teacher: '蔡麗昭', room: '家政教室' },
  { classId: '902', day: 5, period: 6, subject: '健體', teacher: '蔡麗昭', room: '902教室' },
  { classId: '902', day: 5, period: 7, subject: '班會週會', teacher: '林威珽', room: '902教室' }
];

// 匯出至全域視窗物件供各子模組存取
window.FEISHA_CONFIG_CONSTANTS = FEISHA_CONFIG_CONSTANTS;
window.FEISHA_PERIODS = FEISHA_PERIODS;
window.TEACHER_ROSTER = TEACHER_ROSTER;
window.BASELINE_SCHEDULE_MATRIX = BASELINE_SCHEDULE_MATRIX;