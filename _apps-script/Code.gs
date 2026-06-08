/**
 * ============================================
 * NID For Kids - 報名表單後端處理
 * ============================================
 *
 * 部署步驟見 SETUP_GUIDE.md
 *
 * Google Sheets 需要的分頁：
 * 1. courses     ← 課程資訊
 * 2. schedule    ← 班次（含 capacity / enrolled / price / total_classes / early_bird_price / early_bird_until）
 * 3. enrollments ← 報名資料（這個分頁會自動建立）
 */

const CONFIG = {
  NOTIFY_EMAIL_FROM_NAME: "NID For Kids",
  INTERNAL_NOTIFY_EMAIL: "nidforkids@gmail.com",

  PAYMENT: {
    bank_name: "富邦銀行",
    bank_code: "012",
    branch: "東湖分行",
    account_number: "686102009800",
    account_name: "恩艾迪有限公司",
  },

  LINE_URL: "https://lin.ee/PbnzLWp",
};


function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    saveEnrollment(data);
    updateScheduleEnrolled(data.course);
    sendParentEmail(data);

    if (CONFIG.INTERNAL_NOTIFY_EMAIL) {
      sendInternalEmail(data);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error(err);
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


function saveEnrollment(data) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("enrollments");

  if (!sheet) {
    sheet = ss.insertSheet("enrollments");
    sheet.appendRow([
      "報名時間", "課程班次",
      "單堂費用", "課程堂數", "總金額", "是否早鳥", "原價",
      "孩子姓名", "孩子年齡", "性別", "學校",
      "運動習慣", "身體狀況", "課程目標",
      "家長姓名", "與孩子關係", "手機", "Email", "認識管道",
      "匯款後五碼", "付款狀態", "備註"
    ]);
    sheet.getRange(1, 1, 1, 22)
      .setBackground("#0a0a0a")
      .setFontColor("#F5C518")
      .setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    new Date(),
    data.course || "",
    data.price_per_class || "",
    data.total_classes || "",
    data.total_amount || "",
    data.is_early_bird || "",
    data.original_price || "",
    data.child_name || "",
    data.child_age || "",
    data.child_gender || "",
    data.child_school || "",
    data.activity_level || "",
    data.health_notes || "",
    data.goal || "",
    data.parent_name || "",
    data.parent_relation || "",
    data.parent_phone || "",
    data.parent_email || "",
    data.source || "",
    data.payment_last5 || "",
    "待匯款",
    ""
  ]);

  // 為剛新增的這一列套上「付款狀態」下拉選單
  applyStatusValidationToRow(sheet, sheet.getLastRow());
}

/* 付款狀態的所有可選值 */
const PAYMENT_STATUSES = ["待匯款", "已付款", "已取消", "已釋出", "未付款已釋出"];

/* 對指定列的「付款狀態」欄套用下拉選單驗證 */
function applyStatusValidationToRow(sheet, rowNum) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const statusCol = headers.indexOf("付款狀態") + 1;
  if (statusCol === 0 || rowNum < 2) return;
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(PAYMENT_STATUSES, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(rowNum, statusCol).setDataValidation(rule);
}

/* 一鍵：把付款狀態下拉套用到 enrollments 現有所有資料列（手動執行用） */
function applyStatusDropdown() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("enrollments");
  if (!sheet) {
    console.log("找不到 enrollments 分頁");
    return;
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    console.log("目前沒有報名資料列，未來新增的報名會自動帶下拉選單。");
    return;
  }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const statusCol = headers.indexOf("付款狀態") + 1;
  if (statusCol === 0) {
    console.log("找不到「付款狀態」欄");
    return;
  }
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(PAYMENT_STATUSES, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, statusCol, lastRow - 1, 1).setDataValidation(rule);
  console.log("✅ 已為 " + (lastRow - 1) + " 列套上付款狀態下拉選單");
}


function updateScheduleEnrolled(courseStr, delta) {
  if (!courseStr) return;
  if (delta === undefined) delta = 1;
  const parts = courseStr.split("|").map(s => s.trim());
  if (parts.length < 3) return;

  const [loc, dayTime, courseName] = parts;
  const dayTimeParts = dayTime.split(" ");
  const day = dayTimeParts[0];
  const time = dayTimeParts[1];

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("schedule");
  if (!sheet) return;

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).toLowerCase().trim());

  const idxLoc = headers.indexOf("location");
  const idxDay = headers.indexOf("day");
  const idxTime = headers.indexOf("time");
  const idxCourse = headers.indexOf("course");
  const idxEnrolled = headers.indexOf("enrolled");

  if (idxEnrolled === -1) return;

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (
      String(row[idxLoc]).trim() === loc &&
      String(row[idxDay]).trim() === day &&
      String(row[idxTime]).trim() === time &&
      String(row[idxCourse]).trim() === courseName
    ) {
      const current = Number(row[idxEnrolled]) || 0;
      let next = current + delta;
      if (next < 0) next = 0;  // 不會減到負數
      sheet.getRange(i + 1, idxEnrolled + 1).setValue(next);
      break;
    }
  }
}


function sendParentEmail(data) {
  if (!data.parent_email) return;

  const perClass = Number(data.price_per_class) || 0;
  const classes = Number(data.total_classes) || 0;
  const total = Number(data.total_amount) || (perClass * classes);
  const isEarlyBird = data.is_early_bird === "是";
  const originalPrice = Number(data.original_price) || 0;
  const savings = isEarlyBird && originalPrice ? (originalPrice - perClass) * classes : 0;

  const subject = `【NID For Kids】您的報名已收到，請於 24 小時內完成匯款`;

  const earlyBirdRow = isEarlyBird ?
    `<tr><td style="padding:6px 0;color:#666;">優惠</td><td><span style="background:#F5C518;color:#0a0a0a;padding:2px 8px;border-radius:4px;font-weight:bold;font-size:13px;">🏷 早鳥優惠</span> <span style="color:#666;font-size:13px;">原價 ${originalPrice} → ${perClass}</span></td></tr>` : '';

  const savingsRow = savings > 0 ?
    `<tr><td style="padding:6px 0;color:#666;">省下</td><td><strong style="color:#0a0a0a;">NT$ ${savings.toLocaleString()}</strong></td></tr>` : '';

  const htmlBody = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;color:#222;line-height:1.7;">
  <div style="background:#0a0a0a;color:#fff;padding:32px 24px;text-align:center;">
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:4px;color:#F5C518;">ZERO TO HERO</p>
    <h1 style="margin:0;font-size:24px;color:#F5C518;">報名已收到！</h1>
  </div>
  <div style="padding:32px 24px;background:#fff;">
    <p>${data.parent_name} 家長您好，</p>
    <p>感謝您為 <strong>${data.child_name}</strong> 報名 <strong>${data.course}</strong>。</p>
    <p>請於 <strong style="color:#d83a3a;">24 小時內</strong>完成匯款，逾期未匯款，名額將自動釋出。</p>

    <div style="margin:24px 0;padding:24px;background:#f5f1ea;border-left:4px solid #F5C518;border-radius:4px;">
      <h2 style="margin:0 0 16px;font-size:18px;color:#0a0a0a;">匯款資訊</h2>
      <table style="width:100%;font-size:15px;">
        <tr><td style="padding:6px 0;color:#666;width:90px;">戶名</td><td><strong>${CONFIG.PAYMENT.account_name}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666;">銀行</td><td><strong>${CONFIG.PAYMENT.bank_name}（${CONFIG.PAYMENT.bank_code}）</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666;">分行</td><td><strong>${CONFIG.PAYMENT.branch}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666;">帳號</td><td style="font-family:monospace;font-size:17px;"><strong>${CONFIG.PAYMENT.account_number}</strong></td></tr>
        ${earlyBirdRow}
        ${savingsRow}
        <tr><td style="padding:12px 0 0;color:#666;border-top:1px solid #ddd;">金額</td><td style="padding:12px 0 0;border-top:1px solid #ddd;"><strong style="font-size:18px;color:#0a0a0a;">NT$ ${total.toLocaleString()}</strong><span style="color:#999;font-size:13px;">（${perClass} × ${classes} 堂${isEarlyBird ? ' · 早鳥價' : ''}）</span></td></tr>
      </table>
    </div>

    <h3 style="margin:32px 0 16px;font-size:16px;">接下來請依以下步驟</h3>
    <ol style="padding-left:20px;">
      <li style="margin-bottom:12px;"><strong>於 24 小時內完成匯款</strong>，逾期名額會釋出。</li>
      <li style="margin-bottom:12px;"><strong>加入我們的 LINE 官方帳號</strong>，後續上課通知都會透過 LINE 聯繫。</li>
      <li style="margin-bottom:12px;"><strong>於 LINE 回報匯款帳號後 5 碼</strong>，我們會在 24 小時內確認並寄送上課須知。</li>
    </ol>

    <div style="margin:32px 0;text-align:center;">
      <a href="${CONFIG.LINE_URL}" style="display:inline-block;padding:14px 32px;background:#F5C518;color:#0a0a0a;text-decoration:none;border-radius:999px;font-weight:bold;">加入 LINE 官方帳號 →</a>
    </div>

    <hr style="border:none;border-top:1px solid #eee;margin:32px 0;">
    <p style="font-size:14px;color:#666;">如有任何疑問，請直接透過 LINE 官方帳號或 Email（nidforkids@gmail.com）聯繫我們。</p>
    <p style="margin-top:24px;">
      <strong>NID For Kids</strong><br>
      <span style="color:#666;font-size:13px;">A sister brand of NID Run Club</span>
    </p>
  </div>
  <div style="padding:16px;background:#0a0a0a;text-align:center;color:rgba(255,255,255,0.5);font-size:12px;">
    © 2026 NID For Kids · Made with ♥ in Taipei
  </div>
</div>
  `;

  MailApp.sendEmail({
    to: data.parent_email,
    subject: subject,
    htmlBody: htmlBody,
    name: CONFIG.NOTIFY_EMAIL_FROM_NAME,
  });
}


function sendInternalEmail(data) {
  const total = Number(data.total_amount) || 0;
  const isEarlyBird = data.is_early_bird === "是";

  const subject = "[新報名] " + (data.child_name || "?") + "（" + (data.child_age || "?") + "歲）— " + (data.course || "?");

  const body = `
有新的報名！

【課程】${data.course}
【費用】NT$ ${total.toLocaleString()}（${data.price_per_class} × ${data.total_classes} 堂${isEarlyBird ? ' · 早鳥' : ''}）

【孩子】
姓名：${data.child_name}
年齡：${data.child_age}
性別：${data.child_gender || "未填"}
學校：${data.child_school || "未填"}
運動習慣：${data.activity_level}
身體狀況：${data.health_notes || "無"}
課程目標：${data.goal || "無"}

【家長】
姓名：${data.parent_name}（${data.parent_relation}）
電話：${data.parent_phone}
Email：${data.parent_email}
認識管道：${data.source || "未填"}

請追蹤是否在 24 小時內完成匯款。
  `;

  MailApp.sendEmail({
    to: CONFIG.INTERNAL_NOTIFY_EMAIL,
    subject: subject,
    body: body,
  });
}


function testEnroll() {
  const fakeData = {
    course: "台北田徑場 | 週六 10:00 | 兒童趣味跑步班",
    price_per_class: 400,
    total_classes: 12,
    total_amount: 4800,
    is_early_bird: "是",
    original_price: 450,
    child_name: "測試小明",
    child_age: "8",
    child_gender: "男",
    child_school: "測試國小",
    activity_level: "一週 1-2 次",
    health_notes: "無",
    goal: "希望孩子愛上跑步",
    parent_name: "測試家長",
    parent_relation: "母親",
    parent_phone: "0900-000-000",
    parent_email: "your-email@example.com",  // 改成你自己的 email 測試
    source: "Instagram",
  };

  saveEnrollment(fakeData);
  updateScheduleEnrolled(fakeData.course);
  sendParentEmail(fakeData);
  console.log("測試完成，請檢查 Sheets 與 Email");
}


/* ============================
   v2 更新:課程改名 + 早鳥 9 折 + 新增週六 7:15 訓練班
   執行方式:在 Apps Script 編輯器選擇 setupSheets,按 ▶ 執行
   ============================ */
function setupSheets() {
  const ss = getSpreadsheet();

  // 設定 courses
  let coursesSheet = ss.getSheetByName("courses");
  if (!coursesSheet) {
    coursesSheet = ss.insertSheet("courses");
  } else {
    coursesSheet.clear();
  }
  const coursesData = [
    ["order", "name", "age", "pillar", "tagline", "description", "features", "image", "link"],
    [1, "幼兒跑步體適能班", "4 — 6 歲", "打基礎", "用遊戲,讓孩子愛上動。", "走、跑、跳、爬——這個階段不是學技術,是把身體用熟。讓孩子在玩之中,長出未來所有運動需要的底子。", "體能基礎,協調發展,規則理解,樂趣化學習", "assets/hero-3.jpg", "courses/kids-fitness.html"],
    [2, "兒童趣味跑步班", "6 — 12 歲", "養興趣", "讓跑步,變成孩子想做的事。", "不是為了比賽,而是為了讓他真的喜歡上跑步。從正確姿勢開始,每堂課都有挑戰與成就感,孩子越跑越有自信。", "體能提升,協調訓練,跑姿優化,樂趣化學習", "assets/hero-1.jpg", "courses/kids-running-fun.html"],
    [3, "兒童跑步訓練班", "6 — 12 歲", "練實力", "為想跑得更好的孩子設計。", "有比賽目標、有突破渴望——這堂課陪他系統性訓練。專項體能、跑姿優化、配速練習,讓努力被看見。", "專項訓練,體能強化,跑姿優化,賽事備戰", "assets/hero-4.jpg", "courses/kids-running-train.html"]
  ];
  coursesSheet.getRange(1, 1, coursesData.length, coursesData[0].length).setValues(coursesData);
  coursesSheet.getRange(1, 1, 1, coursesData[0].length).setBackground("#0a0a0a").setFontColor("#F5C518").setFontWeight("bold");
  coursesSheet.setFrozenRows(1);
  coursesSheet.autoResizeColumns(1, coursesData[0].length);

  // 設定 schedule (新增週六早上 7:15 跑步訓練班 + 早鳥 9 折)
  let scheduleSheet = ss.getSheetByName("schedule");
  if (!scheduleSheet) {
    scheduleSheet = ss.insertSheet("schedule");
  } else {
    scheduleSheet.clear();
  }
  const scheduleData = [
    ["location", "location_address", "day", "time", "course", "age", "capacity", "enrolled", "status", "price", "total_classes", "early_bird_price", "early_bird_until", "discount_note", "note"],
    ["板橋第一運動場", "新北市板橋區", "週四", "16:45", "幼兒跑步體適能班", "4-6 歲", 6, 0, "招生中", 450, 9, 405, "全新開班限定", "早鳥 9 折", ""],
    ["板橋第一運動場", "新北市板橋區", "週四", "17:45", "兒童趣味跑步班", "6-12 歲", 10, 0, "招生中", 450, 9, 405, "全新開班限定", "早鳥 9 折", ""],
    ["台北田徑場", "台北市松山區", "週五", "16:45", "幼兒跑步體適能班", "4-6 歲", 6, 0, "招生中", 450, 9, 405, "全新開班限定", "早鳥 9 折", ""],
    ["台北田徑場", "台北市松山區", "週五", "17:45", "兒童趣味跑步班", "6-12 歲", 10, 0, "招生中", 450, 9, 405, "全新開班限定", "早鳥 9 折", ""],
    ["台北田徑場", "台北市松山區", "週六", "07:15", "兒童跑步訓練班", "6-12 歲", 20, 0, "招生中", 450, 9, 405, "全新開班限定", "早鳥 9 折", ""],
    ["台北田徑場", "台北市松山區", "週六", "09:00", "幼兒跑步體適能班", "4-6 歲", 6, 0, "招生中", 450, 9, 405, "全新開班限定", "早鳥 9 折", ""],
    ["台北田徑場", "台北市松山區", "週六", "10:00", "兒童趣味跑步班", "6-12 歲", 10, 0, "招生中", 450, 9, 405, "全新開班限定", "早鳥 9 折", ""],
    ["[體驗] 板橋第一運動場", "新北市板橋區", "週四", "16:45", "幼兒跑步體適能班", "4-6 歲", 6, 0, "體驗開放", 250, 1, "", "", "", "6/11 體驗課"],
    ["[體驗] 台北田徑場", "台北市松山區", "週五", "16:45", "幼兒跑步體適能班", "4-6 歲", 6, 0, "體驗開放", 250, 1, "", "", "", "6/12 體驗課"],
    ["[體驗] 台北田徑場", "台北市松山區", "週六", "09:00", "幼兒跑步體適能班", "4-6 歲", 6, 0, "體驗開放", 250, 1, "", "", "", "6/13 體驗課"],
    ["[體驗] 板橋第一運動場", "新北市板橋區", "週四", "17:45", "兒童趣味跑步班", "6-12 歲", 10, 0, "體驗開放", 250, 1, "", "", "", "6/25 體驗課"],
    ["[體驗] 台北田徑場", "台北市松山區", "週五", "17:45", "兒童趣味跑步班", "6-12 歲", 10, 0, "體驗開放", 250, 1, "", "", "", "6/26 體驗課"],
    ["[體驗] 台北田徑場", "台北市松山區", "週六", "10:00", "兒童趣味跑步班", "6-12 歲", 10, 0, "體驗開放", 250, 1, "", "", "", "6/27 體驗課"],
    ["[體驗] 台北田徑場", "台北市松山區", "週六", "07:15", "兒童跑步訓練班", "6-12 歲", 20, 0, "體驗開放", 250, 1, "", "", "", "6/27 體驗課"]
  ];
  scheduleSheet.getRange(1, 1, scheduleData.length, scheduleData[0].length).setValues(scheduleData);
  scheduleSheet.getRange(2, 4, scheduleData.length - 1, 1).setNumberFormat("@");
  scheduleSheet.getRange(1, 1, 1, scheduleData[0].length).setBackground("#0a0a0a").setFontColor("#F5C518").setFontWeight("bold");
  scheduleSheet.setFrozenRows(1);
  scheduleSheet.autoResizeColumns(1, scheduleData[0].length);

  console.log("✅ courses 分頁建立完成");
  console.log("✅ schedule 分頁建立完成,共 " + (scheduleData.length - 1) + " 筆班次");
  console.log("🎉 全部設定完成!");
}

/* 一鍵：把現有 enrollments 表頭升級成含「匯款後五碼」欄（手動執行一次） */
function migrateEnrollmentsHeader() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("enrollments");
  if (!sheet) {
    console.log("找不到 enrollments，下次有報名時會自動以新格式建立。");
    return;
  }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf("匯款後五碼") !== -1) {
    console.log("已經有「匯款後五碼」欄，無需升級。");
    return;
  }
  // 在「認識管道」之後插入一欄
  let insertAfter = headers.indexOf("認識管道") + 1;  // 1-based
  if (insertAfter === 0) insertAfter = headers.indexOf("付款狀態"); // 退而求其次：放付款狀態前
  sheet.insertColumnAfter(insertAfter);
  sheet.getRange(1, insertAfter + 1)
    .setValue("匯款後五碼")
    .setBackground("#0a0a0a")
    .setFontColor("#F5C518")
    .setFontWeight("bold");
  console.log("✅ 已新增「匯款後五碼」欄。現有報名該欄為空，新報名會自動填入。");
}

function getSpreadsheet() {
  return SpreadsheetApp.openById("1jCcnpZRiw3bZsfKOvr50AOxhsh1fdExx0kfCaHPB4t4");
}


/**
 * ============================================
 * 自動釋出名額：當 enrollments 的「付款狀態」
 * 改成「已取消 / 已釋出 / 未付款已釋出」時，
 * 自動把 schedule 對應班次的 enrolled −1
 * ============================================
 *
 * 安裝方式：在編輯器執行一次 installTriggers()
 */

const RELEASE_STATUSES = ["已取消", "已釋出", "未付款已釋出"];

function installTriggers() {
  // 先刪掉舊的同名觸發器，避免重複
  const triggers = ScriptApp.getProjectTriggers();
  for (const t of triggers) {
    if (t.getHandlerFunction() === "onEditInstallable") {
      ScriptApp.deleteTrigger(t);
    }
  }
  // 安裝可程式化的 onEdit 觸發器（綁定到這份 Sheets）
  ScriptApp.newTrigger("onEditInstallable")
    .forSpreadsheet(getSpreadsheet())
    .onEdit()
    .create();
  console.log("✅ 觸發器安裝完成。日後將付款狀態改為「已取消 / 已釋出 / 未付款已釋出」會自動釋出名額。");
}

function onEditInstallable(e) {
  try {
    if (!e || !e.range) return;
    const sheet = e.range.getSheet();
    if (sheet.getName() !== "enrollments") return;

    const editedRow = e.range.getRow();
    const editedCol = e.range.getColumn();
    if (editedRow === 1) return;  // 表頭不處理

    // 找出「付款狀態」與「課程班次」欄位位置
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusCol = headers.indexOf("付款狀態") + 1;
    const courseCol = headers.indexOf("課程班次") + 1;
    if (statusCol === 0 || courseCol === 0) return;

    // 只在編輯到「付款狀態」那一欄時才處理
    if (editedCol !== statusCol) return;

    const newStatus = String(e.range.getValue()).trim();
    if (RELEASE_STATUSES.indexOf(newStatus) === -1) return;

    // 取該列的課程班次字串，做 −1
    const courseStr = sheet.getRange(editedRow, courseCol).getValue();
    updateScheduleEnrolled(courseStr, -1);
  } catch (err) {
    console.error("onEditInstallable error: " + err);
  }
}
