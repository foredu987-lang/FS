// 雲林縣立飛沙國民中學 115-1 學期 教職員官方編制名冊
const INITIAL_TEACHERS = [
  { id: "T01", name: "施銘權", title: "教學組長", role: "admin", subject: "數學", overtimeWeekly: 2, isSubTutorQualified: false },
  { id: "T02", name: "程式管理人員", title: "系統管理員", role: "admin", subject: "系統維運", overtimeWeekly: 0, isSubTutorQualified: false },
  { id: "T03", name: "蔡麗昭", title: "教導主任", role: "teacher", subject: "自然", overtimeWeekly: 2, isSubTutorQualified: false },
  { id: "T04", name: "吳俊德", title: "總務主任", role: "teacher", subject: "生活科技", overtimeWeekly: 0, isSubTutorQualified: false },
  { id: "T05", name: "李貞慧", title: "輔導主任", role: "teacher", subject: "社會", overtimeWeekly: 4, isSubTutorQualified: false },
  { id: "T06", name: "林秋霞", title: "訓導組長", role: "teacher", subject: "體育", overtimeWeekly: 1, isSubTutorQualified: false },
  { id: "T07", name: "阮建安", title: "701班導師", role: "teacher", subject: "國文", overtimeWeekly: 3, isSubTutorQualified: false },
  { id: "T08", name: "蔡明振", title: "801班導師", role: "teacher", subject: "國文", overtimeWeekly: 3, isSubTutorQualified: false },
  { id: "T09", name: "張碧菁", title: "901班導師", role: "teacher", subject: "數學", overtimeWeekly: 1, isSubTutorQualified: false },
  { id: "T10", name: "林山戊鋌", alias: "林㞽鋌", title: "902班導師", role: "teacher", subject: "自然", overtimeWeekly: 3, isSubTutorQualified: false },
  { id: "T11", name: "蔡芷儀", title: "專任教師", role: "teacher", subject: "藝術", overtimeWeekly: 0, isSubTutorQualified: true },
  { id: "T12", name: "陳文鈴", title: "專任教師", role: "teacher", subject: "綜合", overtimeWeekly: 0, isSubTutorQualified: true },
  { id: "T13", name: "吳靜瑜", title: "專任教師", role: "teacher", subject: "英語", overtimeWeekly: 0, isSubTutorQualified: true },
  { id: "T14", name: "鄭宇涵", title: "特教教師", role: "teacher", subject: "特教資源班", overtimeWeekly: 0, isSubTutorQualified: false }
];

const CLASSES = ["701", "801", "901", "902"];

const PERIODS = [
  { id: 0, name: "早自修", time: "07:30 - 08:15" },
  { id: 1, name: "第 1 節", time: "08:25 - 09:10" },
  { id: 2, name: "第 2 節", time: "09:20 - 10:05" },
  { id: 3, name: "第 3 節", time: "10:15 - 11:00" },
  { id: 4, name: "第 4 節", time: "11:10 - 11:55" },
  { id: 5, name: "第 5 節", time: "13:10 - 13:55" },
  { id: 6, name: "第 6 節", time: "14:05 - 14:50" },
  { id: 7, name: "第 7 節", time: "15:00 - 15:45" },
  { id: 8, name: "第 8 節", time: "16:00 - 16:45" }
];