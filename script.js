/* ============================
   NID For Kids — Site Script
   ============================ */

/* ---------- 報名方式設定 ----------
   本期已開課，報名改為私訊 LINE 官方帳號插班；不再使用 SurveyCake 表單。 */
const LINE_URL = "https://lin.ee/PbnzLWp";

// 所有 class="enroll-cta" 的按鈕統一導向 LINE 官方帳號（私訊插班）
function applyEnrollCTA() {
  document.querySelectorAll(".enroll-cta").forEach(el => {
    el.textContent = "私訊插班";
    el.setAttribute("href", LINE_URL);
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener");
  });
}

/* ---------- 班次卡片展開/收合 ---------- */
function initCourseTabs() {
  const tabs = document.querySelectorAll(".course-tab");
  tabs.forEach(tab => {
    const head = tab.querySelector(".course-tab-head");
    if (!head) return;
    head.addEventListener("click", () => {
      const isOpen = tab.classList.contains("is-open");
      tabs.forEach(t => {
        t.classList.remove("is-open");
        const h = t.querySelector(".course-tab-head");
        if (h) h.setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        tab.classList.add("is-open");
        head.setAttribute("aria-expanded", "true");
      }
    });
  });
}

/* ---------- 導航：滾動變色 ---------- */
function initNavScroll() {
  const nav = document.querySelector(".nav");
  if (!nav) return;
  window.addEventListener("scroll", () => {
    if (window.scrollY > 80) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
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
  initNavScroll();
  initNavToggle();
  initCourseTabs();
  initScrollReveal();
  applyEnrollCTA();
});
