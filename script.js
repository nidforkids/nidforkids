/* ============================
   NID For Kids — Site Script
   ============================ */

/* ---------- 設定區（你要改的只有這裡） ---------- */

const CONFIG = {
  // 🔑 將下方換成你的 Google Sheets ID（網址中間那一段亂碼）
  // 例：https://docs.google.com/spreadsheets/d/ABCDEFG1234567/edit
  //                                            ↑ 這段
  SHEETS_ID: "",  // 留空時會用 fallback 靜態內容

  // Sheets 內的分頁名稱（必須跟你 Google Sheets 的分頁名稱一致）
  COURSES_SHEET: "courses",
  SCHEDULE_SHEET: "schedule",
};

/* ---------- Helper: 抓 Google Sheets 公開資料 ---------- */
// 用 gviz API，免 API key、免登入、免額度
async function fetchSheet(sheetName) {
  if (!CONFIG.SHEETS_ID) return null;

  const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEETS_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    // gviz 回傳是 google.visualization.Query.setResponse({...})，要把外層拆掉
    const json = JSON.parse(text.substring(47, text.length - 2));

    const headers = json.table.cols.map(c => (c.label || c.id).toLowerCase().trim());
    const rows = json.table.rows.map(r => {
      const obj = {};
      r.c.forEach((cell, i) => {
        obj[headers[i]] = cell ? String(cell.v ?? "").trim() : "";
      });
      return obj;
    });
    return rows;
  } catch (err) {
    console.warn(`Failed to fetch sheet "${sheetName}":`, err);
    return null;
  }
}

/* ---------- Render: 課程 ---------- */
function renderCourses(courses) {
  if (!courses || !courses.length) return;

  const list = document.getElementById("course-list");
  list.innerHTML = "";

  courses
    .sort((a, b) => Number(a.order || 99) - Number(b.order || 99))
    .forEach(c => {
      const features = (c.features || "")
        .split(/[,，、]/)
        .map(f => f.trim())
        .filter(Boolean);

      const featureHtml = features.map(f => `<li>${f}</li>`).join("");
      const detailLink = c.link || c.detail_url || "";
      const detailHtml = detailLink ? `<a href="${detailLink}" class="course-link">查看課程詳情 →</a>` : "";

      list.insertAdjacentHTML("beforeend", `
        <article class="course-card">
          <div class="course-card-img">
            <img src="${c.image || 'assets/hero-1.jpg'}" alt="${c.name}">
          </div>
          <div class="course-card-body">
            <div class="course-tag-row">
              <span class="course-tag">${c.age || ''}</span>
              <span class="course-pillar">${c.pillar || ''}</span>
            </div>
            <h3 class="course-name">${c.name || ''}</h3>
            <p class="course-tagline">${c.tagline || ''}</p>
            <p class="course-desc">${c.description || ''}</p>
            <ul class="course-features">${featureHtml}</ul>
            ${detailHtml}
          </div>
        </article>
      `);
    });
}

/* ---------- Render: 班次 ---------- */
function renderSchedule(rows) {
  if (!rows || !rows.length) return;

  // 按 location 分組
  const grouped = {};
  rows.forEach(r => {
    const loc = r.location || "其他";
    if (!grouped[loc]) {
      grouped[loc] = {
        area: r.location_address || r.area || "",
        classes: []
      };
    }
    grouped[loc].classes.push(r);
  });

  const list = document.getElementById("schedule-list");
  list.innerHTML = "";

  Object.entries(grouped).forEach(([loc, data]) => {
    const classRows = data.classes.map(c => {
      const capacity = Number(c.capacity) || 0;
      const enrolled = Number(c.enrolled) || 0;
      const remaining = Math.max(capacity - enrolled, 0);

      // 價格計算：判斷早鳥是否還有效
      const price = Number(c.price) || 0;
      const totalClasses = Number(c.total_classes) || 0;
      const earlyBirdPrice = Number(c.early_bird_price) || 0;
      const earlyBirdUntil = c.early_bird_until ? new Date(c.early_bird_until) : null;

      let isEarlyBird = false;
      if (earlyBirdPrice > 0 && earlyBirdUntil && earlyBirdUntil > new Date()) {
        isEarlyBird = true;
      }

      const effectivePrice = isEarlyBird ? earlyBirdPrice : price;
      const totalAmount = effectivePrice * totalClasses;

      // 名額顯示
      let spotsClass = "";
      let spotsText = `剩 ${remaining} / ${capacity} 位`;
      let enrollBtn = "";

      if (remaining <= 0 || (c.status || "").includes("額滿")) {
        spotsClass = "full";
        spotsText = "額滿";
        enrollBtn = `<a class="class-enroll disabled">候補登記</a>`;
      } else {
        if (remaining <= 2) spotsClass = "few";
        const params = new URLSearchParams({
          course: c.course || "",
          loc: loc,
          day: c.day || "",
          time: c.time || "",
        });
        enrollBtn = `<a href="enroll.html?${params.toString()}" class="class-enroll">立即報名</a>`;
      }

      // 價格顯示區塊
      let priceHtml = "";
      if (price > 0) {
        if (isEarlyBird) {
          priceHtml = `
            <div class="class-price has-discount">
              <span class="price-original">NT$ ${price}/堂</span>
              <span class="price-current">早鳥 NT$ ${earlyBirdPrice}/堂</span>
            </div>
          `;
        } else {
          priceHtml = `<div class="class-price"><span class="price-current">NT$ ${price}/堂</span>${totalClasses ? ` <span class="price-note">× ${totalClasses} 堂</span>` : ''}</div>`;
        }
      }

      return `
        <div class="class-row">
          <div class="class-info">
            <span class="class-time">${c.day || ''} ${c.time || ''}</span>
            <span class="class-name">${c.course || ''}</span>
            <span class="class-age">${c.age || ''}</span>
            ${priceHtml}
          </div>
          <div class="class-meta">
            <span class="class-spots ${spotsClass}">${spotsText}</span>
            ${enrollBtn}
          </div>
        </div>
      `;
    }).join("");

    list.insertAdjacentHTML("beforeend", `
      <div class="location-card">
        <div class="location-head">
          <h3 class="location-name">${loc}</h3>
          <p class="location-area">${data.area}</p>
        </div>
        <div class="location-classes">${classRows}</div>
      </div>
    `);
  });
}

/* ---------- 初始化資料 ---------- */
async function initData() {
  if (!CONFIG.SHEETS_ID) {
    console.info("[NID For Kids] Sheets ID 未設定，使用靜態 fallback 內容。");
    return;
  }

  const [courses, schedule] = await Promise.all([
    fetchSheet(CONFIG.COURSES_SHEET),
    fetchSheet(CONFIG.SCHEDULE_SHEET),
  ]);

  if (courses) renderCourses(courses);
  if (schedule) renderSchedule(schedule);
}

/* ---------- Hero 圖片輪播 ---------- */
function initHeroSlider() {
  const imgs = document.querySelectorAll(".hero-img");
  if (imgs.length < 2) return;

  let current = 0;
  setInterval(() => {
    imgs[current].classList.remove("active");
    current = (current + 1) % imgs.length;
    imgs[current].classList.add("active");
  }, 5000);
}

/* ---------- 導航：滾動變色 ---------- */
function initNavScroll() {
  const nav = document.querySelector(".nav");
  let lastScroll = 0;

  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    if (y > 80) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
    lastScroll = y;
  });
}

/* ---------- 漢堡選單 ---------- */
function initNavToggle() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    links.classList.toggle("open");
  });

  // 點連結後自動關閉
  links.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => links.classList.remove("open"));
  });
}

/* ---------- 入場動畫 ---------- */
function initScrollReveal() {
  const items = document.querySelectorAll(".section-title, .course-card, .location-card, .contact-card, .value-item, .faq-item");

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = 1;
        entry.target.style.transform = "translateY(0)";
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  items.forEach(el => {
    el.style.opacity = 0;
    el.style.transform = "translateY(30px)";
    el.style.transition = "opacity 0.8s ease, transform 0.8s ease";
    io.observe(el);
  });
}

/* ---------- 啟動 ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initHeroSlider();
  initNavScroll();
  initNavToggle();
  initScrollReveal();
  initData();
});
