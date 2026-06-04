/* ============================
   NID For Kids — Trial Class Enrollment
   ============================ */

/* === 設定區 === */
const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwhPdydy5oWO6DPufyJVqzBnP5cZMAfqhzCII70vFx0_hI4GPp93Rwk4-FmWwOHgo0Y/exec";

/* 體驗報名截止時間：6/13 當天最後一班（10:00 趣味班）結束後關閉。
   設為 2026/6/13 23:59:59，過了就顯示「已截止」並導私訊。 */
const TRIAL_DEADLINE = new Date("2026-06-13T23:59:59+08:00");

/* === DOM === */
const form = document.getElementById("trial-form");
const submitBtn = document.getElementById("submit-btn");
const formSection = document.getElementById("enroll-form-section");
const successSection = document.getElementById("success-section");
const closedSection = document.getElementById("closed-section");
const courseSelect = document.getElementById("course");
const priceDisplay = document.getElementById("price-display");
const displayTotal = document.getElementById("display-total");

/* === 截止判斷：過期就只顯示「已截止」區 === */
(function checkDeadline() {
  const now = new Date();
  if (now > TRIAL_DEADLINE) {
    if (formSection) formSection.style.display = "none";
    if (successSection) successSection.style.display = "none";
    if (closedSection) closedSection.style.display = "block";
  }
})();

/* === 動態費用顯示 === */
function updatePriceDisplay() {
  const selected = courseSelect.options[courseSelect.selectedIndex];
  if (!selected || !selected.value) {
    priceDisplay.style.display = "none";
    return;
  }
  const price = Number(selected.dataset.price) || 0;
  const classes = Number(selected.dataset.classes) || 0;
  if (price === 0) {
    priceDisplay.style.display = "none";
    return;
  }
  displayTotal.textContent = "NT$ " + (price * classes).toLocaleString();
  priceDisplay.style.display = "block";
}

if (courseSelect) {
  courseSelect.addEventListener("change", updatePriceDisplay);
}

/* === URL 參數預填班次（例如從 IG 連結帶 ?course=...） === */
(function prefillFromURL() {
  const params = new URLSearchParams(window.location.search);
  const course = params.get("course");
  if (course && courseSelect) {
    for (const opt of courseSelect.options) {
      if (opt.value && opt.value.includes(course)) {
        opt.selected = true;
        updatePriceDisplay();
        break;
      }
    }
  }
})();

/* === 表單送出 === */
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    /* 送出前再擋一次截止（防止使用者開著頁面過了午夜才送） */
    if (new Date() > TRIAL_DEADLINE) {
      if (formSection) formSection.style.display = "none";
      if (closedSection) closedSection.style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const oldError = form.querySelector(".form-error");
    if (oldError) oldError.remove();

    const formData = new FormData(form);
    const data = {};
    formData.forEach((v, k) => data[k] = v);
    data.timestamp = new Date().toISOString();

    const selectedOpt = courseSelect.options[courseSelect.selectedIndex];
    if (selectedOpt && selectedOpt.value) {
      const price = Number(selectedOpt.dataset.price) || 0;
      const classes = Number(selectedOpt.dataset.classes) || 0;
      data.price_per_class = price;
      data.total_classes = classes;
      data.total_amount = price * classes;
      data.is_early_bird = "否";
    }

    if (!data.agree) {
      showError("請勾選同意條款後再送出。");
      return;
    }

    submitBtn.classList.add("loading");
    submitBtn.disabled = true;
    submitBtn.querySelector(".btn-arrow").textContent = "";

    try {
      if (GAS_WEBAPP_URL) {
        await fetch(GAS_WEBAPP_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(data),
        });
      } else {
        await new Promise(r => setTimeout(r, 800));
      }
      showSuccess();
    } catch (err) {
      console.error(err);
      showError("送出時發生錯誤，請稍後再試，或透過 LINE 直接聯繫我們。");
      submitBtn.classList.remove("loading");
      submitBtn.disabled = false;
      submitBtn.querySelector(".btn-arrow").textContent = "→";
    }
  });
}

function showError(msg) {
  const err = document.createElement("div");
  err.className = "form-error show";
  err.innerHTML = msg;
  submitBtn.parentNode.insertBefore(err, submitBtn);
  err.scrollIntoView({ behavior: "smooth", block: "center" });
}

function showSuccess() {
  formSection.style.display = "none";
  successSection.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
