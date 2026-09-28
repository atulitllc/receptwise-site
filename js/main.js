/* ReceptWise prototype: vanilla JS, no dependencies. */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  /*
   * BOOKING LINK
   * There is no booking system yet, so every "Book a free chat" button opens the
   * on-page contact form modal, which does NOT send data anywhere.
   * When a real booking page exists (e.g. Calendly), paste its URL here, e.g.
   *   var BOOKING_URL = "https://calendly.com/your-team/20min";
   * and the buttons will open that link in a new tab instead of the modal.
   */
  var BOOKING_URL = "";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header: mobile nav + shadow on scroll ---------- */
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  function closeNav() {
    if (!nav) return;
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("nav-open", open);
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a, button")) closeNav();
    });
  }
  function onScroll() {
    if (header) header.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Scroll reveal ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (!reduceMotion && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Savings calculator ---------- */
  var WEEKS_PER_MONTH = 52 / 12;       // about 4.33
  var HANDLED_SHARE = 0.6;             // assumed share of calls handled start to finish
  var DEFAULTS = { "in-calls": 80, "in-missed": 25, "in-book": 30, "in-value": 75, "in-minutes": 4, "in-wage": 18, "in-hours": 20, plan: "399" };
  var PLAN_NAMES = { "199": "Starter", "399": "Growth", "599": "Pro" };

  var form = document.getElementById("calc-form");
  var money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  var num1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
  var num0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

  function $(id) { return document.getElementById(id); }
  function val(id) {
    var el = $(id);
    var v = parseFloat(el.value);
    if (!isFinite(v) || v < 0) v = 0;
    var max = parseFloat(el.max);
    if (isFinite(max) && v > max) v = max;
    return v;
  }
  function paintRange(r) {
    var min = parseFloat(r.min) || 0, max = parseFloat(r.max) || 100;
    var p = Math.max(0, Math.min(100, ((parseFloat(r.value) - min) / (max - min)) * 100));
    r.style.setProperty("--p", p + "%");
  }
  function setText(id, text) {
    var el = $(id);
    if (el.textContent !== text) {
      el.textContent = text;
      if (!reduceMotion && el.classList.contains("result-value")) {
        el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
      }
    }
  }

  function calculate() {
    var calls = val("in-calls");
    var missedPct = val("in-missed") / 100;
    var bookPct = val("in-book") / 100;
    var value = val("in-value");
    var minutes = val("in-minutes");
    var wage = val("in-wage");
    var hours = val("in-hours");
    var planEl = form.querySelector('input[name="plan"]:checked');
    var planPrice = planEl ? parseFloat(planEl.value) : 399;
    var planName = PLAN_NAMES[String(planPrice)] || "Plan";

    var recovered = calls * missedPct * WEEKS_PER_MONTH;         // missed calls answered / month
    var bookings = recovered * bookPct;                          // extra bookings / month
    var revenue = bookings * value;                              // extra revenue / month
    var hoursSaved = (calls * minutes / 60) * HANDLED_SHARE;     // staff hours / week
    var recepCost = hours * wage * WEEKS_PER_MONTH;              // receptionist wages / month

    setText("out-recovered", "≈ " + num0.format(recovered));
    setText("out-revenue", "≈ " + money.format(revenue));
    setText("out-hours", "≈ " + num1.format(hoursSaved) + " hrs");
    setText("out-timevalue", "≈ " + money.format(hoursSaved * wage * WEEKS_PER_MONTH));
    setText("out-recep", money.format(recepCost));
    setText("out-plan", money.format(planPrice));
    $("plan-name").textContent = planName;

    $("how-recovered").textContent = num0.format(calls) + " calls/week × " + num0.format(missedPct * 100) + "% missed × 4.33 weeks.";
    $("how-revenue").textContent = num0.format(recovered) + " answered calls × " + num0.format(bookPct * 100) + "% who'd book = about " + num1.format(bookings) + " bookings × " + money.format(value) + " each.";
    $("how-hours").textContent = num0.format(calls) + " calls × " + num1.format(minutes) + " min ÷ 60 × 60% (we assume ReceptWise fully handles about 6 in 10 calls; the rest still need you).";
    $("how-timevalue").textContent = num1.format(hoursSaved) + " hrs/week × " + money.format(wage) + "/hr × 4.33 weeks. Time your team can spend on customers in front of them.";
    $("how-recep").textContent = num1.format(hours) + " hrs/week × " + money.format(wage) + "/hr × 4.33 weeks. Wages only; payroll taxes, benefits and training would add more.";

    var max = Math.max(recepCost, planPrice, 1);
    $("bar-recep").style.width = (recepCost / max * 100) + "%";
    $("bar-plan").style.width = (planPrice / max * 100) + "%";

    var diff = recepCost - planPrice;
    var diffEl = $("out-diff");
    if (hours === 0 || wage === 0) {
      diffEl.textContent = "Enter receptionist hours and a wage to compare costs.";
    } else if (diff > 0) {
      diffEl.textContent = "Estimated difference: about " + money.format(diff) + " less per month with " + planName + " than the receptionist wages above.";
    } else if (diff < 0) {
      diffEl.textContent = "With these numbers, " + planName + " costs about " + money.format(-diff) + " more per month than the receptionist wages above, but it answers 24/7, not just during those hours.";
    } else {
      diffEl.textContent = "With these numbers, the monthly costs are about the same.";
    }
  }

  if (form) {
    // keep each slider and number box in sync
    form.querySelectorAll('input[type="range"][data-sync]').forEach(function (r) {
      var box = $(r.getAttribute("data-sync"));
      paintRange(r);
      r.addEventListener("input", function () { box.value = r.value; paintRange(r); calculate(); });
      box.addEventListener("input", function () {
        var v = parseFloat(box.value);
        if (isFinite(v)) { r.value = Math.min(v, parseFloat(r.max)); paintRange(r); }
        calculate();
      });
      box.addEventListener("blur", function () {
        // tidy up empty / out-of-range values
        box.value = val(box.id);
        calculate();
      });
    });
    form.addEventListener("change", calculate);
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    $("calc-reset").addEventListener("click", function () {
      Object.keys(DEFAULTS).forEach(function (k) {
        if (k === "plan") return;
        $(k).value = DEFAULTS[k];
        var r = $(k + "-range");
        if (r) { r.value = DEFAULTS[k]; paintRange(r); }
      });
      $("plan-growth").checked = true;
      calculate();
    });
    calculate();
  }

  /* ---------- Contact modal ---------- */
  var modal = $("contact-modal");
  var cform = $("contact-form");
  var formView = $("modal-form-view");
  var thanks = $("modal-thanks");
  var lastTrigger = null;

  function openModal(trigger) {
    if (BOOKING_URL) { window.open(BOOKING_URL, "_blank", "noopener"); return; }
    lastTrigger = trigger || null;
    var plan = trigger && trigger.getAttribute("data-plan");
    $("cf-plan").value = plan || "";
    formView.hidden = false;
    thanks.hidden = true;
    if (typeof modal.showModal === "function") modal.showModal();
    else modal.setAttribute("open", "");
    setTimeout(function () { $("cf-name").focus(); }, 30);
  }
  function closeModal() {
    if (typeof modal.close === "function" && modal.open) modal.close();
    else modal.removeAttribute("open");
  }
  modal.addEventListener("close", function () {
    if (lastTrigger) lastTrigger.focus();
  });
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-open-contact]");
    if (t) { e.preventDefault(); openModal(t); return; }
    if (e.target.closest("[data-close-contact]")) closeModal();
    if (e.target.closest("#contact-modal a[href^='tel:']")) closeModal();
  });
  // click on the backdrop closes the dialog
  modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });

  function showErr(input, errEl, bad) {
    errEl.hidden = !bad;
    if (input) {
      if (bad) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
    }
  }
  cform.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("cf-name"), phone = $("cf-phone"), email = $("cf-email");
    var nameBad = !name.value.trim();
    var emailVal = email.value.trim();
    var emailOk = emailVal && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
    var phoneOk = phone.value.replace(/\D/g, "").length >= 7;
    var contactBad = !(emailOk || phoneOk);
    showErr(name, $("cf-name-err"), nameBad);
    showErr(phone, $("cf-contact-err"), contactBad);
    if (contactBad) email.setAttribute("aria-invalid", "true"); else email.removeAttribute("aria-invalid");
    if (nameBad) { name.focus(); return; }
    if (contactBad) { (phone.value ? phone : email).focus(); return; }

    // PROTOTYPE: nothing is sent. Replace this block with a real submission
    // (fetch() to your form backend) or redirect to BOOKING_URL (e.g. Calendly).
    $("thanks-title").textContent = "Call to book your demo";
    $("thanks-msg").textContent = "This form does not send yet. Call (781) 705-7179 and our AI receptionist will book your free 20-minute demo.";
    formView.hidden = true;
    thanks.hidden = false;
    cform.reset();
    $("thanks-title").focus();
  });
})();
