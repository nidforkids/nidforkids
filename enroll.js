/* ============================
   NID For Kids — Enrollment Form
   ============================ */

/* === 設定區（你要改的只有這裡） === */
const GAS_WEBAPP_URL = ""; // 👈 將 Google Apps Script 部署後的 Web App URL 貼這裡

/* === DOM === */
const form = document.getElementById("enroll-form");
const submitBtn = document.getElementById("submit-btn");
const formSection = document.getElementById("enroll-form-section");
const successSection = document.getElementById("success-section");
const courseSelect = document.getElementById("course");
const priceDisplay = document.getElementById("price-display");
const displayPerClass = document.getElementById("display-per-class");
const displayClasses = document.getElementById("display-classes");
const displayTotal = document.getElementById("display-total");
const discountNote = document.getElementById("price-discount-note");

/* === 動態價格顯示 === */
function updatePriceDisplay() {
  const selected = courseSelect.options[courseSelect.selectedIndex];
  if (!selected || !selected.value) {
    priceDisplay.style.display = "none";
    return;
  }

  const price = Number(selected.dataset.price) || 0;
  const classes = Number(selected.dataset.classes) || 0;
  const originalPrice = Number(selected.dataset.originalPrice) || 0;
  const isEarlyBird = selected.dataset.earlyBird === "true";

  if (price === 0 || classes === 0) {
    priceDisplay.style.display = "none";
    return;
  }

  if (isEarlyBird && originalPrice > price) {
    displayPerClass.innerHTML = '<span class="strike">NT$ ' + originalPrice + '</span>NT$ ' + price;
  } else {
    displayPerClass.textContent = "NT$ " + price;
  }

  displayClasses.textContent = classes + " 堂";

  const total = price * classes;
  displayTotal.textContent = "NT$ " + total.toLocaleString();

  if (isEarlyBird) {
    const savings = (originalPrice - price) * classes;
    discountNote.textContent = "🏷 早鳥優惠｜共省 NT$ " + savings.toLocaleString();
    discountNote.style.display = "block";
  } else {
    discountNote.style.display = "none";
  }

  priceDisplay.style.display = "block";
}

if (courseSelect) {
  courseSelect.addEventListener("change", updatePriceDisplay);
}

/* === URL 參數預填課程 === */
(function prefillFromURL() {
  const params = new URLSearchParams(window.location.search);
  const course = params.get("course");
  const loc = params.get("loc");
  const day = params.get("day");
  const time = params.get("time");

  if (course && loc && day && time) {
    const targetValue = loc + " | " + day + " " + time + " | " + course;
    const select = document.getElementById("course");
    if (select) {
      Array.from(select.options).forEach(opt => {
        if (opt.value === targetValue) opt.selected = true;
      });
      updatePriceDisplay();
    }
  } else if (course) {
    const select = document.getElementById("course");
    if (select) {
      for (const opt of select.options) {
        if (!opt.selected && opt.value.includes(course)) {
          opt.selected = true;
          updatePriceDisplay();
          break;
        }
      }
    }
  }
})();

/* === 表單送出 === */
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
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
      const isEarlyBird = selectedOpt.dataset.earlyBird === "true";
      const originalPrice = Number(selectedOpt.dataset.originalPrice) || 0;

      data.price_per_class = price;
      data.total_classes = classes;
      data.total_amount = price * classes;
      data.is_early_bird = isEarlyBird ? "是" : "否";
      if (originalPrice > 0) data.original_price = originalPrice;
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
        console.warn("[NID For Kids] GAS_WEBAPP_URL 未設定", data);
        await new Promise(r => setTimeout(r, 800));
      }

      showSuccess(data);
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

function showSuccess(data) {
  const amountEl = document.getElementById("payment-amount");
  if (amountEl && data.total_amount) {
    const total = Number(data.total_amount);
    const perClass = Number(data.price_per_class);
    const classes = Number(data.total_classes);
    const isEarlyBird = data.is_early_bird === "是";
    const originalPrice = Number(data.original_price) || 0;

    amountEl.innerHTML = "NT$ " + total.toLocaleString() + ' <small>(' + perClass + " × " + classes + " 堂" + (isEarlyBird ? " · 早鳥價" : "") + ")</small>";

    if (isEarlyBird && originalPrice > 0) {
      const savings = (originalPrice - perClass) * classes;
      const note = document.createElement("p");
      note.style.cssText = "margin-top:1rem;padding-top:1rem;border-top:1px dashed rgba(255,255,255,0.2);color:#F5C518;font-size:0.9rem;text-align:center;";
      note.textContent = "🏷 已套用早鳥優惠，共省 NT$ " + savings.toLocaleString();
      amountEl.parentNode.parentNode.appendChild(note);
    }
  }

  formSection.style.display = "none";
  successSection.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
