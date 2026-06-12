/* ============================
   NID For Kids — Trial Class Enrollment
   ============================ */

/* === 設定區 === */
const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxteEJmDZ2w8j4xRcTE87kloH9Fm7jtaFm3PKH-oX5WIfuVClvPfKqdfaktaqOdXgKL/exec";

/* 體驗報名各課各自截止（由每個 option 的 data-deadline 決定）。
   最晚截止日（趣味/訓練 6/27）= 全部結束的判斷點。 */
const TRIAL_FINAL_DEADLINE = new Date("2026-06-27T23:59:59+08:00");

/* === DOM === */
const form = document.getElementById("trial-form");
const submitBtn = document.getElementById("submit-btn");
const formSection = document.getElementById("enroll-form-section");
const successSection = document.getElementById("success-section");
const closedSection = document.getElementById("closed-section");
const courseSelect = document.getElementById("course");
const priceDisplay = document.getElementById("price-display");
const displayTotal = document.getElementById("display-total");

/* === 截止判斷 ===
   1) 移除已過各自截止日的班次選項（option）
   2) 若某 optgroup 底下選項全沒了，連 optgroup 一起移除
   3) 若全部班次都過期，顯示「已截止」整頁並導私訊 */
(function checkDeadlines() {
  const now = new Date();

  if (courseSelect) {
    courseSelect.querySelectorAll("option[data-deadline]").forEach(opt => {
      const dl = new Date(opt.dataset.deadline);
      if (now > dl) opt.remove();
    });
    // 清掉空的 optgroup
    courseSelect.querySelectorAll("optgroup").forEach(g => {
      if (!g.querySelector("option")) g.remove();
    });
  }

  // 全部過期 → 顯示截止頁
  if (now > TRIAL_FINAL_DEADLINE) {
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

    /* 送出前再擋一次截止（防止使用者開著頁面過了該班截止才送） */
    const selOpt = courseSelect.options[courseSelect.selectedIndex];
    if (selOpt && selOpt.dataset.deadline && new Date() > new Date(selOpt.dataset.deadline)) {
      showError("這個體驗班次的報名已截止，請改選其他班次，或透過 LINE 私訊小編詢問。");
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

    /* === 送出前必填驗證（因表單有 novalidate，需自行檢查） === */
    const required = [
      ["course", "請選擇體驗班次"],
      ["child_name", "請填寫孩子姓名"],
      ["child_age", "請填寫孩子年齡"],
      ["activity_level", "請選擇孩子的運動習慣"],
      ["parent_name", "請填寫家長姓名"],
      ["parent_relation", "請填寫與孩子的關係"],
      ["parent_phone", "請填寫聯絡電話"],
      ["parent_email", "請填寫 Email"],
      ["payment_last5", "請填寫匯款帳號後五碼"],
    ];
    for (const [key, msg] of required) {
      if (!data[key] || String(data[key]).trim() === "") {
        showError(msg + "。");
        const el = form.querySelector('[name="' + key + '"]');
        if (el) el.focus();
        return;
      }
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.parent_email)) {
      showError("Email 格式看起來不正確，請再確認一次。");
      return;
    }
    if (String(data.parent_phone).replace(/\D/g, "").length < 8) {
      showError("聯絡電話格式看起來不正確，請再確認一次。");
      return;
    }
    if (!/^\d{5}$/.test(String(data.payment_last5).trim())) {
      showError("匯款帳號後五碼需為 5 位數字。");
      return;
    }
    if (!data.price_per_class || !data.total_classes) {
      showError("課程資料未正確帶入，請重新選擇。");
      return;
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
      if (typeof fbq === "function") {
        fbq("track", "SubmitApplication", {
          content_name: data.course || "",
          value: Number(data.total_amount) || 0,
          currency: "TWD",
        });
      }
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

/* ---------- 服務條款 Modal 開關 ---------- */
(function initTermsModal() {
  const openLink = document.getElementById("open-terms");
  const modal = document.getElementById("terms-modal");
  const closeBtn = document.getElementById("close-terms");
  const agreeBtn = document.getElementById("agree-and-close");
  const agreeCheckbox = document.getElementById("agree");
  if (!openLink || !modal) return;

  function openModal(e) {
    if (e) e.preventDefault();
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  openLink.addEventListener("click", openModal);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  // 「我已閱讀，關閉並繼續」順便勾選同意
  if (agreeBtn) agreeBtn.addEventListener("click", () => {
    if (agreeCheckbox) agreeCheckbox.checked = true;
    closeModal();
  });
  // 點背景關閉
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  // Esc 關閉
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
  });
})();
