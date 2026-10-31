/**
 * 雲林縣立飛沙國民中學 115學年度第1學期
 * 課務排代、調課與月結管理系統 - 官方真實課表底冊庫 (js/data.js)
 * 資料來源：Google 雲端硬碟 schedule_base.js (178節官方核定完整課表)
 */

// ==========================================
// 1. 學期時間軸與鐘點費率設定
// ==========================================
const FEISHA_CONFIG_CONSTANTS = {
  academicYear: 115,
  semester: 1,
  startDate: '2026-08-31T00:00:00', // 115-1 第一週週一
  totalWeeks: 21,
  defaultCalendarId: 'c_9f7d9e917c79ee2de6f54ed275f97d9bfdb493ba457a0135b69438213e217ba6@group.calendar.google.com',
  hourlyRates: {
    regular: 455,         // 日間第 1-7 節鐘點費
    afterSchool: 450,     // 第 8 節課後輔導鐘點費
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
// (代碼格式: '星期-節次'，例如 '1-5' 代表週一第 5 節)
// ==========================================
const TEACHER_ROSTER = {
  '阮建安': {
    title: '701導師',
    subject: '國文/數學',
    baseHours: 16,
    overloadHours: 3,
    overloadPeriods: ['1-5', '2-1', '3-1'] // 701 社會兼課
  },
  '吳靜瑜': {
    title: '專任教師',
    subject: '英語',
    baseHours: 18,
    overloadHours: 2,
    overloadPeriods: ['1-8', '3-8'] // 第8節輔導兼課
  },
  '蔡明振': {
    title: '801導師',
    subject: '國文',
    baseHours: 16,
    overloadHours: 3,
    overloadPeriods: ['1-3', '2-6', '3-6'] // 801 社會兼課
  },
  '張碧菁': {
    title: '901導師',
    subject: '數學',
    baseHours: 16,
    overloadHours: 1,
    overloadPeriods: ['5-4'] // 701 閩南語兼課
  },
  '林威珽': {
    title: '902導師',
    subject: '自然',
    baseHours: 16,
    overloadHours: 3,
    overloadPeriods: ['2-4', '3-4', '4-5'] // 資訊/飛海沙/說古道今
  },
  '施銘權': {
    title: '教務組長',
    subject: '數學',
    baseHours: 10,
    overloadHours: 2,
    overloadPeriods: ['1-7', '4-6'] // 701健康、801健康
  },
  '林秋霞': {
    title: '訓導組長',
    subject: '體育',
    baseHours: 10,
    overloadHours: 1,
    overloadPeriods: ['2-2'] // 701 體育兼課
  },
  '李貞慧': {
    title: '輔導主任',
    subject: '社會',
    baseHours: 2,
    overloadHours: 4,
    overloadPeriods: ['1-7', '2-1', '2-4', '4-3'] // 世界之眼與社會兼課
  },
  '吳俊德': {
    title: '總務主任',
    subject: '生科/健體',
    baseHours: 2,
    overloadHours: 2,
    overloadPeriods: ['1-5', '2-3']
  },
  '蔡芷儀': {
    title: '專任教師',
    subject: '藝術',
    baseHours: 18,
    overloadHours: 0,
    overloadPeriods: []
  },
  '陳文鈴': {
    title: '專任教師',
    subject: '綜合/童軍',
    baseHours: 18,
    overloadHours: 0,
    overloadPeriods: []
  },
  '蔡麗昭': {
    title: '專任教師',
    subject: '自然',
    baseHours: 18,
    overloadHours: 2,
    overloadPeriods: ['3-3', '4-3'] // 902自然、901自然兼課
  },
  '鄭宇涵': {
    title: '資源班導師',
    subject: '特教',
    baseHours: 16,
    overloadHours: 0,
    overloadPeriods: []
  }
};

// ==========================================
// 4. 全校 178 節官方真實基準課表底冊
// (含 701、801、901、902 四班及學701、學801特教抽離)
// ==========================================
const BASELINE_SCHEDULE_MATRIX = [
  // ─── 701 班 (40 節) ───
  { id: "SCH_001", classId: "701", day: 1, period: 1, subject: "國文", teacher: "阮建安", isOvertime: false, isAfterschool: false, room: "701教室" },
  { id: "SCH_002", classId: "701", day: 1, period: 2, subject: "英語", teacher: "吳靜瑜", isOvertime: false, isAfterschool: false, room: "701教室" },
  { id: "SCH_003", classId: "701", day: 1, period: 3, subject: "童軍", teacher: "陳文鈴", isOvertime: false, isAfterschool: false, room: "童軍教室" },
  { id: "SCH_004", classId: "701", day: 1, period: 4, subject: "自然", teacher: "林威珽", isOvertime: false, isAfterschool: false, room: "理化實驗室" },
  { id: "SCH_005", classId: "701", day: 1, period: 5, subject: "社會", teacher: "阮建安", isOvertime: true, isAfterschool: false, room: "701教室" },
  { id: "SCH_006", classId: "701", day: 1, period: 6, subject: "藝術", teacher: "蔡芷儀", isOvertime: false, isAfterschool: false, room: "美術教室" },
  { id: "SCH_007", classId: "701", day: 1, period: 7, subject: "健康", teacher: "施銘權", isOvertime: true, isAfterschool: false, room: "701教室" },
  { id: "SCH_008", classId: "701", day: 1, period: 8, subject: "數學_輔", teacher: "施銘權", isOvertime: false, isAfterschool: true, room: "701教室" },
  { id: "SCH_009", classId: "701", day: 2, period: 1, subject: "社會", teacher: "阮建安", isOvertime: true, isAfterschool: false, room: "701教室" },
  { id: "SCH_010", classId: "701", day: 2, period: 2, subject: "體育", teacher: "林秋霞", isOvertime: true, isAfterschool: false, room: "操場" },
  { id: "SCH_011", classId: "701", day: 2, period: 3, subject: "生活科技", teacher: "吳俊德", isOvertime: false, isAfterschool: false, room: "生科教室" },
  { id: "SCH_012", classId: "701", day: 2, period: 4, subject: "資訊科技", teacher: "林威珽", isOvertime: true, isAfterschool: false, room: "電腦教室" },
  { id: "SCH_013", classId: "701", day: 2, period: 5, subject: "英語", teacher: "吳靜瑜", isOvertime: false, isAfterschool: false, room: "701教室" },
  { id: "SCH_014", classId: "701", day: 2, period: 6, subject: "數學", teacher: "施銘權", isOvertime: false, isAfterschool: false, room: "701教室" },
  { id: "SCH_015", classId: "701", day: 2, period: 7, subject: "國文", teacher: "阮建安", isOvertime: false, isAfterschool: false, room: "701教室" },
  { id: "SCH_016", classId: "701", day: 2, period: 8, subject: "國文_輔", teacher: "阮建安", isOvertime: false, isAfterschool: true, room: "701教室" },
  { id: "SCH_017", classId: "701", day: 3, period: 1, subject: "社會", teacher: "阮建安", isOvertime: true, isAfterschool: false, room: "701教室" },
  { id: "SCH_018", classId: "701", day: 3, period: 2, subject: "國文", teacher: "阮建安", isOvertime: false, isAfterschool: false, room: "701教室" },
  { id: "SCH_019", classId: "701", day: 3, period: 3, subject: "藝術", teacher: "蔡芷儀", isOvertime: false, isAfterschool: false, room: "音樂教室" },
  { id: "SCH_020", classId: "701", day: 3, period: 4, subject: "飛海沙", teacher: "林威珽", isOvertime: true, isAfterschool: false, room: "701教室" },
  { id: "SCH_021", classId: "701", day: 3, period: 5, subject: "輔導", teacher: "陳文鈴", isOvertime: false, isAfterschool: false, room: "輔導教室" },
  { id: "SCH_022", classId: "701", day: 3, period: 6, subject: "數學", teacher: "施銘權", isOvertime: false, isAfterschool: false, room: "701教室" },
  { id: "SCH_023", classId: "701", day: 3, period: 7, subject: "藝起繪英語", teacher: "吳靜瑜", isOvertime: false, isAfterschool: false, room: "701教室" },
  { id: "SCH_024", classId: "701", day: 3, period: 8, subject: "自然_輔", teacher: "林威珽", isOvertime: false, isAfterschool: true, room: "理化實驗室" },
  { id: "SCH_025", classId: "701", day: 4, period: 1, subject: "藝術", teacher: "蔡芷儀", isOvertime: false, isAfterschool: false, room: "美術教室" },
  { id: "SCH_026", classId: "701", day: 4, period: 2, subject: "體育", teacher: "林秋霞", isOvertime: false, isAfterschool: false, room: "操場" },
  { id: "SCH_027", classId: "701", day: 4, period: 3, subject: "國文", teacher: "阮建安", isOvertime: false, isAfterschool: false, room: "701教室" },
  { id: "SCH_028", classId: "701", day: 4, period: 4, subject: "數學", teacher: "施銘權", isOvertime: false, isAfterschool: false, room: "701教室" },
  { id: "SCH_029", classId: "701", day: 4, period: 5, subject: "家政", teacher: "陳文鈴", isOvertime: false, isAfterschool: false, room: "家政教室" },
  { id: "SCH_030", classId: "701", day: 4, period: 6, subject: "自然", teacher: "林威珽", isOvertime: false, isAfterschool: false, room: "理化實驗室" },
  { id: "SCH_031", classId: "701", day: 4, period: 7, subject: "英語", teacher: "吳靜瑜", isOvertime: false, isAfterschool: false, room: "701教室" },
  { id: "SCH_032", classId: "701", day: 4, period: 8, subject: "社會_輔", teacher: "阮建安", isOvertime: false, isAfterschool: true, room: "701教室" },
  { id: "SCH_033", classId: "701", day: 5, period: 1, subject: "數學", teacher: "施銘權", isOvertime: false, isAfterschool: false, room: "701教室" },
  { id: "SCH_034", classId: "701", day: 5, period: 2, subject: "國文", teacher: "阮建安", isOvertime: false, isAfterschool: false, room: "701教室" },
  { id: "SCH_035", classId: "701", day: 5, period: 3, subject: "自然", teacher: "林威珽", isOvertime: false, isAfterschool: false, room: "理化實驗室" },
  { id: "SCH_036", classId: "701", day: 5, period: 4, subject: "閩南語", teacher: "張碧菁", isOvertime: true, isAfterschool: false, room: "701教室" },
  { id: "SCH_037", classId: "701", day: 5, period: 5, subject: "飛中藝人", teacher: "陳文鈴", isOvertime: false, isAfterschool: false, room: "701教室" },
  { id: "SCH_038", classId: "701", day: 5, period: 6, subject: "飛中藝人", teacher: "陳文鈴", isOvertime: false, isAfterschool: false, room: "701教室" },
  { id: "SCH_039", classId: "701", day: 5, period: 7, subject: "飛中好品", teacher: "阮建安", isOvertime: false, isAfterschool: false, room: "701教室" },
  { id: "SCH_040", classId: "701", day: 5, period: 8, subject: "英語_輔", teacher: "吳靜瑜", isOvertime: false, isAfterschool: true, room: "701教室" },

  // ─── 801 班 (40 節) ───
  { id: "SCH_041", classId: "801", day: 1, period: 1, subject: "英語", teacher: "吳靜瑜", isOvertime: false, isAfterschool: false, room: "801教室" },
  { id: "SCH_042", classId: "801", day: 1, period: 2, subject: "體育", teacher: "林秋霞", isOvertime: false, isAfterschool: false, room: "操場" },
  { id: "SCH_043", classId: "801", day: 1, period: 3, subject: "社會", teacher: "蔡明振", isOvertime: true, isAfterschool: false, room: "801教室" },
  { id: "SCH_044", classId: "801", day: 1, period: 4, subject: "數學", teacher: "施銘權", isOvertime: false, isAfterschool: false, room: "801教室" },
  { id: "SCH_045", classId: "801", day: 1, period: 5, subject: "生活科技", teacher: "吳俊德", isOvertime: false, isAfterschool: false, room: "生科教室" },
  { id: "SCH_046", classId: "801", day: 1, period: 6, subject: "自然", teacher: "林威珽", isOvertime: false, isAfterschool: false, room: "理化實驗室" },
  { id: "SCH_047", classId: "801", day: 1, period: 7, subject: "國文", teacher: "蔡明振", isOvertime: false, isAfterschool: false, room: "801教室" },
  { id: "SCH_048", classId: "801", day: 1, period: 8, subject: "國文_輔", teacher: "蔡明振", isOvertime: false, isAfterschool: true, room: "801教室" },
  { id: "SCH_049", classId: "801", day: 2, period: 1, subject: "童軍", teacher: "陳文鈴", isOvertime: false, isAfterschool: false, room: "童軍教室" },
  { id: "SCH_050", classId: "801", day: 2, period: 2, subject: "國文", teacher: "蔡明振", isOvertime: false, isAfterschool: false, room: "801教室" },
  { id: "SCH_051", classId: "801", day: 2, period: 3, subject: "資訊科技", teacher: "林威珽", isOvertime: false, isAfterschool: false, room: "電腦教室" },
  { id: "SCH_052", classId: "801", day: 2, period: 4, subject: "英語", teacher: "吳靜瑜", isOvertime: false, isAfterschool: false, room: "801教室" },
  { id: "SCH_053", classId: "801", day: 2, period: 5, subject: "藝術", teacher: "蔡芷儀", isOvertime: false, isAfterschool: false, room: "音樂教室" },
  { id: "SCH_054", classId: "801", day: 2, period: 6, subject: "社會", teacher: "蔡明振", isOvertime: true, isAfterschool: false, room: "801教室" },
  { id: "SCH_055", classId: "801", day: 2, period: 7, subject: "數學", teacher: "施銘權", isOvertime: false, isAfterschool: false, room: "801教室" },
  { id: "SCH_056", classId: "801", day: 2, period: 8, subject: "自然_輔", teacher: "林威珽", isOvertime: false, isAfterschool: true, room: "理化實驗室" },
  { id: "SCH_057", classId: "801", day: 3, period: 1, subject: "自然", teacher: "林威珽", isOvertime: false, isAfterschool: false, room: "理化實驗室" },
  { id: "SCH_058", classId: "801", day: 3, period: 2, subject: "輔導", teacher: "陳文鈴", isOvertime: false, isAfterschool: false, room: "輔導教室" },
  { id: "SCH_059", classId: "801", day: 3, period: 3, subject: "國文", teacher: "蔡明振", isOvertime: false, isAfterschool: false, room: "801教室" },
  { id: "SCH_060", classId: "801", day: 3, period: 4, subject: "數學", teacher: "施銘權", isOvertime: false, isAfterschool: false, room: "801教室" },
  { id: "SCH_061", classId: "801", day: 3, period: 5, subject: "閩南語", teacher: "張碧菁", isOvertime: false, isAfterschool: false, room: "801教室" },
  { id: "SCH_062", classId: "801", day: 3, period: 6, subject: "社會", teacher: "蔡明振", isOvertime: true, isAfterschool: false, room: "801教室" },
  { id: "SCH_063", classId: "801", day: 3, period: 7, subject: "藝術", teacher: "蔡芷儀", isOvertime: false, isAfterschool: false, room: "美術教室" },
  { id: "SCH_064", classId: "801", day: 3, period: 8, subject: "英語_輔", teacher: "吳靜瑜", isOvertime: false, isAfterschool: true, room: "801教室" },
  { id: "SCH_065", classId: "801", day: 4, period: 1, subject: "國文", teacher: "蔡明振", isOvertime: false, isAfterschool: false, room: "801教室" },
  { id: "SCH_066", classId: "801", day: 4, period: 2, subject: "藝術", teacher: "蔡芷儀", isOvertime: false, isAfterschool: false, room: "視聽教室" },
  { id: "SCH_067", classId: "801", day: 4, period: 3, subject: "體育", teacher: "林秋霞", isOvertime: false, isAfterschool: false, room: "操場" },
  { id: "SCH_068", classId: "801", day: 4, period: 4, subject: "英語", teacher: "吳靜瑜", isOvertime: false, isAfterschool: false, room: "801教室" },
  { id: "SCH_069", classId: "801", day: 4, period: 5, subject: "說古道今", teacher: "林威珽", isOvertime: true, isAfterschool: false, room: "801教室" },
  { id: "SCH_070", classId: "801", day: 4, period: 6, subject: "健康", teacher: "施銘權", isOvertime: true, isAfterschool: false, room: "801教室" },
  { id: "SCH_071", classId: "801", day: 4, period: 7, subject: "家政", teacher: "陳文鈴", isOvertime: false, isAfterschool: false, room: "家政教室" },
  { id: "SCH_072", classId: "801", day: 4, period: 8, subject: "數學_輔", teacher: "施銘權", isOvertime: false, isAfterschool: true, room: "801教室" },
  { id: "SCH_073", classId: "801", day: 5, period: 1, subject: "自然", teacher: "林威珽", isOvertime: false, isAfterschool: false, room: "理化實驗室" },
  { id: "SCH_074", classId: "801", day: 5, period: 2, subject: "大藝術家英語", teacher: "吳靜瑜", isOvertime: false, isAfterschool: false, room: "801教室" },
  { id: "SCH_075", classId: "801", day: 5, period: 3, subject: "數學", teacher: "施銘權", isOvertime: false, isAfterschool: false, room: "801教室" },
  { id: "SCH_076", classId: "801", day: 5, period: 4, subject: "國文", teacher: "蔡明振", isOvertime: false, isAfterschool: false, room: "801教室" },
  { id: "SCH_077", classId: "801", day: 5, period: 5, subject: "飛中藝人", teacher: "吳靜瑜", isOvertime: false, isAfterschool: false, room: "801教室" },
  { id: "SCH_078", classId: "801", day: 5, period: 6, subject: "飛中藝人", teacher: "吳靜瑜", isOvertime: false, isAfterschool: false, room: "801教室" },
  { id: "SCH_079", classId: "801", day: 5, period: 7, subject: "飛中好品", teacher: "蔡明振", isOvertime: false, isAfterschool: false, room: "801教室" },
  { id: "SCH_080", classId: "801", day: 5, period: 8, subject: "社會_輔", teacher: "蔡明振", isOvertime: false, isAfterschool: true, room: "801教室" },

  // ─── 901 班 (40 節) ───
  { id: "SCH_081", classId: "901", day: 1, period: 1, subject: "數學", teacher: "張碧菁", isOvertime: false, isAfterschool: false, room: "901教室" },
  { id: "SCH_082", classId: "901", day: 1, period: 2, subject: "社會", teacher: "李貞慧", isOvertime: false, isAfterschool: false, room: "901教室" },
  { id: "SCH_083", classId: "901", day: 1, period: 3, subject: "體育", teacher: "林秋霞", isOvertime: false, isAfterschool: false, room: "操場" },
  { id: "SCH_084", classId: "901", day: 1, period: 4, subject: "藝術", teacher: "蔡芷儀", isOvertime: false, isAfterschool: false, room: "美術教室" },
  { id: "SCH_085", classId: "901", day: 1, period: 5, subject: "家政", teacher: "陳文鈴", isOvertime: false, isAfterschool: false, room: "家政教室" },
  { id: "SCH_086", classId: "901", day: 1, period: 6, subject: "英語", teacher: "吳靜瑜", isOvertime: false, isAfterschool: false, room: "901教室" },
  { id: "SCH_087", classId: "901", day: 1, period: 7, subject: "國文", teacher: "阮建安", isOvertime: false, isAfterschool: false, room: "901教室" },
  { id: "SCH_088", classId: "901", day: 1, period: 8, subject: "國文_輔", teacher: "阮建安", isOvertime: false, isAfterschool: true, room: "901教室" },
  { id: "SCH_089", classId: "901", day: 2, period: 1, subject: "社會", teacher: "李貞慧", isOvertime: true, isAfterschool: false, room: "901教室" },
  { id: "SCH_090", classId: "901", day: 2, period: 2, subject: "資訊科技", teacher: "林威珽", isOvertime: false, isAfterschool: false, room: "電腦教室" },
  { id: "SCH_091", classId: "901", day: 2, period: 3, subject: "國文", teacher: "阮建安", isOvertime: false, isAfterschool: false, room: "901教室" },
  { id: "SCH_092", classId: "901", day: 2, period: 4, subject: "世界之眼", teacher: "李貞慧", isOvertime: true, isAfterschool: false, room: "901教室" },
  { id: "SCH_093", classId: "901", day: 2, period: 5, subject: "輔導", teacher: "陳文鈴", isOvertime: false, isAfterschool: false, room: "輔導教室" },
  { id: "SCH_094", classId: "901", day: 2, period: 6, subject: "數學", teacher: "張碧菁", isOvertime: false, isAfterschool: false, room: "901教室" },
  { id: "SCH_095", classId: "901", day: 2, period: 7, subject: "自然", teacher: "蔡麗昭", isOvertime: false, isAfterschool: false, room: "理化實驗室" },
  { id: "SCH_096", classId: "901", day: 2, period: 8, subject: "數學_輔", teacher: "張碧菁", isOvertime: false, isAfterschool: true, room: "901教室" },
  { id: "SCH_097", classId: "901", day: 3, period: 1, subject: "自然", teacher: "蔡麗昭", isOvertime: false, isAfterschool: false, room: "理化實驗室" },
  { id: "SCH_098", classId: "901", day: 3, period: 2, subject: "健康", teacher: "張碧菁", isOvertime: false, isAfterschool: false, room: "901教室" },
  { id: "SCH_099", classId: "901", day: 3, period: 3, subject: "英語", teacher: "吳靜瑜", isOvertime: false, isAfterschool: false, room: "901教室" },
  { id: "SCH_100", classId: "901", day: 3, period: 4, subject: "國文", teacher: "阮建安", isOvertime: false, isAfterschool: false, room: "901教室" },
  { id: "SCH_101", classId: "901", day: 3, period: 5, subject: "藝術", teacher: "蔡芷儀", isOvertime: false, isAfterschool: false, room: "視聽教室" },
  { id: "SCH_102", classId: "901", day: 3, period: 6, subject: "體育", teacher: "林秋霞", isOvertime: false, isAfterschool: false, room: "操場" },
  { id: "SCH_103", classId: "901", day: 3, period: 7, subject: "數學", teacher: "張碧菁", isOvertime: false, isAfterschool: false, room: "901教室" },
  { id: "SCH_104", classId: "901", day: 3, period: 8, subject: "社會_輔", teacher: "李貞慧", isOvertime: false, isAfterschool: true, room: "901教室" },
  { id: "SCH_105", classId: "901", day: 4, period: 1, subject: "國文", teacher: "阮建安", isOvertime: false, isAfterschool: false, room: "901教室" },
  { id: "SCH_106", classId: "901", day: 4, period: 2, subject: "英語", teacher: "吳靜瑜", isOvertime: false, isAfterschool: false, room: "901教室" },
  { id: "SCH_107", classId: "901", day: 4, period: 3, subject: "自然", teacher: "蔡麗昭", isOvertime: true, isAfterschool: false, room: "理化實驗室" },
  { id: "SCH_108", classId: "901", day: 4, period: 4, subject: "社會", teacher: "李貞慧", isOvertime: false, isAfterschool: false, room: "901教室" },
  { id: "SCH_109", classId: "901", day: 4, period: 5, subject: "書海飛閱", teacher: "阮建安", isOvertime: false, isAfterschool: false, room: "901教室" },
  { id: "SCH_110", classId: "901", day: 4, period: 6, subject: "藝術", teacher: "蔡芷儀", isOvertime: false, isAfterschool: false, room: "音樂教室" },
  { id: "SCH_111", classId: "901", day: 4, period: 7, subject: "生活科技", teacher: "吳俊德", isOvertime: false, isAfterschool: false, room: "生科教室" },
  { id: "SCH_112", classId: "901", day: 4, period: 8, subject: "英語_輔", teacher: "吳靜瑜", isOvertime: false, isAfterschool: true, room: "901教室" },
  { id: "SCH_113", classId: "901", day: 5, period: 1, subject: "數學", teacher: "張碧菁", isOvertime: false, isAfterschool: false, room: "901教室" },
  { id: "SCH_114", classId: "901", day: 5, period: 2, subject: "童軍", teacher: "陳文鈴", isOvertime: false, isAfterschool: false, room: "童軍教室" },
  { id: "SCH_115", classId: "901", day: 5, period: 3, subject: "國文", teacher: "阮建安", isOvertime: false, isAfterschool: false, room: "901教室" },
  { id: "SCH_116", classId: "901", day: 5, period: 4, subject: "神遊希臘神話", teacher: "吳靜瑜", isOvertime: false, isAfterschool: false, room: "901教室" },
  { id: "SCH_117", classId: "901", day: 5, period: 5, subject: "飛中藝人", teacher: "張碧菁", isOvertime: false, isAfterschool: false, room: "901教室" },
  { id: "SCH_118", classId: "901", day: 5, period: 6, subject: "飛中藝人", teacher: "張碧菁", isOvertime: false, isAfterschool: false, room: "901教室" },
  { id: "SCH_119", classId: "901", day: 5, period: 7, subject: "飛中好品", teacher: "張碧菁", isOvertime: false, isAfterschool: false, room: "901教室" },
  { id: "SCH_120", classId: "901", day: 5, period: 8, subject: "自然_輔", teacher: "蔡麗昭", isOvertime: false, isAfterschool: true, room: "理化實驗室" },

  // ─── 902 班 (40 節) ───
  { id: "SCH_121", classId: "902", day: 1, period: 1, subject: "國文", teacher: "蔡明振", isOvertime: false, isAfterschool: false, room: "902教室" },
  { id: "SCH_122", classId: "902", day: 1, period: 2, subject: "童軍", teacher: "陳文鈴", isOvertime: false, isAfterschool: false, room: "童軍教室" },
  { id: "SCH_123", classId: "902", day: 1, period: 3, subject: "健康", teacher: "張碧菁", isOvertime: false, isAfterschool: false, room: "902教室" },
  { id: "SCH_124", classId: "902", day: 1, period: 4, subject: "數學", teacher: "張碧菁", isOvertime: false, isAfterschool: false, room: "902教室" },
  { id: "SCH_125", classId: "902", day: 1, period: 5, subject: "藝術", teacher: "蔡芷儀", isOvertime: false, isAfterschool: false, room: "視聽教室" },
  { id: "SCH_126", classId: "902", day: 1, period: 6, subject: "體育", teacher: "林秋霞", isOvertime: false, isAfterschool: false, room: "操場" },
  { id: "SCH_127", classId: "902", day: 1, period: 7, subject: "世界之眼", teacher: "李貞慧", isOvertime: true, isAfterschool: false, room: "902教室" },
  { id: "SCH_128", classId: "902", day: 1, period: 8, subject: "英語_輔", teacher: "吳靜瑜", isOvertime: false, isAfterschool: true, room: "902教室" },
  { id: "SCH_129", classId: "902", day: 2, period: 1, subject: "資訊科技", teacher: "林威珽", isOvertime: false, isAfterschool: false, room: "電腦教室" },
  { id: "SCH_130", classId: "902", day: 2, period: 2, subject: "英語", teacher: "吳靜瑜", isOvertime: false, isAfterschool: false, room: "902教室" },
  { id: "SCH_131", classId: "902", day: 2, period: 3, subject: "輔導", teacher: "陳文鈴", isOvertime: false, isAfterschool: false, room: "輔導教室" },
  { id: "SCH_132", classId: "902", day: 2, period: 4, subject: "國文", teacher: "蔡明振", isOvertime: false, isAfterschool: false, room: "902教室" },
  { id: "SCH_133", classId: "902", day: 2, period: 5, subject: "社會", teacher: "李貞慧", isOvertime: false, isAfterschool: false, room: "902教室" },
  { id: "SCH_134", classId: "902", day: 2, period: 6, subject: "自然", teacher: "蔡麗昭", isOvertime: false, isAfterschool: false, room: "理化實驗室" },
  { id: "SCH_135", classId: "902", day: 2, period: 7, subject: "藝術", teacher: "蔡芷儀", isOvertime: false, isAfterschool: false, room: "美術教室" },
  { id: "SCH_136", classId: "902", day: 2, period: 8, subject: "國文_輔", teacher: "蔡明振", isOvertime: false, isAfterschool: true, room: "902教室" },
  { id: "SCH_137", classId: "902", day: 3, period: 1, subject: "國文", teacher: "蔡明振", isOvertime: false, isAfterschool: false, room: "902教室" },
  { id: "SCH_138", classId: "902", day: 3, period: 2, subject: "體育", teacher: "林秋霞", isOvertime: false, isAfterschool: false, room: "操場" },
  { id: "SCH_139", classId: "902", day: 3, period: 3, subject: "自然", teacher: "蔡麗昭", isOvertime: true, isAfterschool: false, room: "理化實驗室" },
  { id: "SCH_140", classId: "902", day: 3, period: 4, subject: "家政", teacher: "陳文鈴", isOvertime: false, isAfterschool: false, room: "家政教室" },
  { id: "SCH_141", classId: "902", day: 3, period: 5, subject: "神遊希臘神話", teacher: "吳靜瑜", isOvertime: false, isAfterschool: false, room: "902教室" },
  { id: "SCH_142", classId: "902", day: 3, period: 6, subject: "數學", teacher: "張碧菁", isOvertime: false, isAfterschool: false, room: "902教室" },
  { id: "SCH_143", classId: "902", day: 3, period: 7, subject: "社會", teacher: "李貞慧", isOvertime: false, isAfterschool: false, room: "902教室" },
  { id: "SCH_144", classId: "902", day: 3, period: 8, subject: "數學_輔", teacher: "張碧菁", isOvertime: false, isAfterschool: true, room: "902教室" },
  { id: "SCH_145", classId: "902", day: 4, period: 1, subject: "英語", teacher: "吳靜瑜", isOvertime: false, isAfterschool: false, room: "902教室" },
  { id: "SCH_146", classId: "902", day: 4, period: 2, subject: "國文", teacher: "蔡明振", isOvertime: false, isAfterschool: false, room: "902教室" },
  { id: "SCH_147", classId: "902", day: 4, period: 3, subject: "社會", teacher: "李貞慧", isOvertime: true, isAfterschool: false, room: "902教室" },
  { id: "SCH_148", classId: "902", day: 4, period: 4, subject: "數學", teacher: "張碧菁", isOvertime: false, isAfterschool: false, room: "902教室" },
  { id: "SCH_149", classId: "902", day: 4, period: 5, subject: "書海飛閱", teacher: "蔡明振", isOvertime: false, isAfterschool: false, room: "902教室" },
  { id: "SCH_150", classId: "902", day: 4, period: 6, subject: "生活科技", teacher: "吳俊德", isOvertime: false, isAfterschool: false, room: "生科教室" },
  { id: "SCH_151", classId: "902", day: 4, period: 7, subject: "藝術", teacher: "蔡芷儀", isOvertime: false, isAfterschool: false, room: "音樂教室" },
  { id: "SCH_152", classId: "902", day: 4, period: 8, subject: "自然_輔", teacher: "蔡麗昭", isOvertime: false, isAfterschool: true, room: "理化實驗室" },
  { id: "SCH_153", classId: "902", day: 5, period: 1, subject: "英語", teacher: "吳靜瑜", isOvertime: false, isAfterschool: false, room: "902教室" },
  { id: "SCH_154", classId: "902", day: 5, period: 2, subject: "數學", teacher: "張碧菁", isOvertime: false, isAfterschool: false, room: "902教室" },
  { id: "SCH_155", classId: "902", day: 5, period: 3, subject: "國文", teacher: "蔡明振", isOvertime: false, isAfterschool: false, room: "902教室" },
  { id: "SCH_156", classId: "902", day: 5, period: 4, subject: "自然", teacher: "蔡麗昭", isOvertime: false, isAfterschool: false, room: "理化實驗室" },
  { id: "SCH_157", classId: "902", day: 5, period: 5, subject: "飛中藝人", teacher: "蔡芷儀", isOvertime: false, isAfterschool: false, room: "902教室" },
  { id: "SCH_158", classId: "902", day: 5, period: 6, subject: "飛中藝人", teacher: "蔡芷儀", isOvertime: false, isAfterschool: false, room: "902教室" },
  { id: "SCH_159", classId: "902", day: 5, period: 7, subject: "飛中好品", teacher: "林威珽", isOvertime: false, isAfterschool: false, room: "902教室" },
  { id: "SCH_160", classId: "902", day: 5, period: 8, subject: "社會_輔", teacher: "李貞慧", isOvertime: false, isAfterschool: true, room: "902教室" },

  // ─── 學701 (特教抽離 11 節) ───
  { id: "SCH_161", classId: "學701", day: 1, period: 1, subject: "國文", teacher: "鄭宇涵", isOvertime: false, isAfterschool: false, isSpecialEd: true, room: "資源教室" },
  { id: "SCH_162", classId: "學701", day: 2, period: 6, subject: "數學", teacher: "鄭宇涵", isOvertime: false, isAfterschool: false, isSpecialEd: true, room: "資源教室" },
  { id: "SCH_163", classId: "學701", day: 2, period: 7, subject: "國文", teacher: "鄭宇涵", isOvertime: false, isAfterschool: false, isSpecialEd: true, room: "資源教室" },
  { id: "SCH_164", classId: "學701", day: 3, period: 1, subject: "學習策略", teacher: "鄭宇涵", isOvertime: false, isAfterschool: false, isSpecialEd: true, room: "資源教室" },
  { id: "SCH_165", classId: "學701", day: 3, period: 2, subject: "國文", teacher: "鄭宇涵", isOvertime: false, isAfterschool: false, isSpecialEd: true, room: "資源教室" },
  { id: "SCH_166", classId: "學701", day: 3, period: 6, subject: "數學", teacher: "鄭宇涵", isOvertime: false, isAfterschool: false, isSpecialEd: true, room: "資源教室" },
  { id: "SCH_167", classId: "學701", day: 4, period: 3, subject: "國文", teacher: "鄭宇涵", isOvertime: false, isAfterschool: false, isSpecialEd: true, room: "資源教室" },
  { id: "SCH_168", classId: "學701", day: 4, period: 4, subject: "數學", teacher: "鄭宇涵", isOvertime: false, isAfterschool: false, isSpecialEd: true, room: "資源教室" },
  { id: "SCH_169", classId: "學701", day: 5, period: 1, subject: "數學", teacher: "鄭宇涵", isOvertime: false, isAfterschool: false, isSpecialEd: true, room: "資源教室" },
  { id: "SCH_170", classId: "學701", day: 5, period: 2, subject: "國文", teacher: "鄭宇涵", isOvertime: false, isAfterschool: false, isSpecialEd: true, room: "資源教室" },
  { id: "SCH_171", classId: "學701", day: 5, period: 7, subject: "社會技巧", teacher: "鄭宇涵", isOvertime: false, isAfterschool: false, isSpecialEd: true, room: "資源教室" },

  // ─── 學801 (特教抽離 7 節) ───
  { id: "SCH_172", classId: "學801", day: 1, period: 7, subject: "國文", teacher: "鄭宇涵", isOvertime: false, isAfterschool: false, isSpecialEd: true, room: "資源教室" },
  { id: "SCH_173", classId: "學801", day: 2, period: 2, subject: "國文", teacher: "鄭宇涵", isOvertime: false, isAfterschool: false, isSpecialEd: true, room: "資源教室" },
  { id: "SCH_174", classId: "學801", day: 3, period: 1, subject: "學習策略", teacher: "鄭宇涵", isOvertime: false, isAfterschool: false, isSpecialEd: true, room: "資源教室" },
  { id: "SCH_175", classId: "學801", day: 3, period: 3, subject: "國文", teacher: "鄭宇涵", isOvertime: false, isAfterschool: false, isSpecialEd: true, room: "資源教室" },
  { id: "SCH_176", classId: "學801", day: 4, period: 1, subject: "國文", teacher: "鄭宇涵", isOvertime: false, isAfterschool: false, isSpecialEd: true, room: "資源教室" },
  { id: "SCH_177", classId: "學801", day: 5, period: 4, subject: "國文", teacher: "鄭宇涵", isOvertime: false, isAfterschool: false, isSpecialEd: true, room: "資源教室" },
  { id: "SCH_178", classId: "學801", day: 5, period: 7, subject: "社會技巧", teacher: "鄭宇涵", isOvertime: false, isAfterschool: false, isSpecialEd: true, room: "資源教室" }
];

// 相容別名對照表 (確保雲端與舊格式 林𡶙鋌 / 林山戊鋌 皆能對應到 林威珽)
BASELINE_SCHEDULE_MATRIX.forEach(item => {
  if (item.teacher === '林𡶙鋌' || item.teacher === '林山戊鋌') {
    item.teacher = '林威珽';
  }
  // 雙向相容屬性命名
  item.class_id = item.classId;
  item.is_overtime = item.isOvertime;
  item.is_afterschool = item.isAfterschool;
  item.is_special_ed = item.isSpecialEd || false;
});

// 匯出至全域視窗物件
window.FEISHA_CONFIG_CONSTANTS = FEISHA_CONFIG_CONSTANTS;
window.FEISHA_PERIODS = FEISHA_PERIODS;
window.TEACHER_ROSTER = TEACHER_ROSTER;
window.BASELINE_SCHEDULE_MATRIX = BASELINE_SCHEDULE_MATRIX;