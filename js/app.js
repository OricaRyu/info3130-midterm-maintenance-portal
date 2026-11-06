/* Larchwood maintenance request prototype
   Flow: Describe issue (form) -> Review -> Confirmation.
   Front-end only: submissions are simulated and stored in localStorage. */
(function () {
  "use strict";

  var DATA = window.LARCHWOOD_DATA;
  var STORAGE_KEY = "larchwood.requests.v1";
  var MAX_PHOTOS = 3;
  var MAX_PHOTO_MB = 10;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var form = $("#request-form");
  var els = {
    property: $("#property"),
    unit: $("#unit"),
    unitLabel: $("#unit-label"),
    unitHint: $("#unit-hint"),
    area: $("#area"),
    category: $("#category"),
    summary: $("#summary"),
    description: $("#description"),
    descCount: $("#description-count"),
    started: $("#started"),
    photos: $("#photos"),
    photoList: $("#photo-list"),
    name: $("#name"),
    email: $("#email"),
    phone: $("#phone"),
    pets: $("#pets"),
    propertyNote: $("#property-note"),
    emergencyAlert: $("#emergency-alert"),
    errorSummary: $("#error-summary"),
    errorList: $("#error-summary-list"),
    errorCount: $("#error-count-text")
  };

  var STEP_TITLES = {
    form: "Report a Maintenance Issue",
    review: "Review Your Request",
    confirmation: "Request Submitted"
  };

  var state = {
    step: "form",
    attempted: false,     // true after the first "Review request" click
    selectedPhotos: [],   // File objects
    pending: null,        // data being reviewed
    submitted: null       // last submitted record
  };

  /* ---------- Helpers ---------- */
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function getProperty(id) {
    return DATA.properties.filter(function (p) { return p.id === id; })[0] || null;
  }
  function radioValue(name) {
    var checked = $('input[name="' + name + '"]:checked', form);
    return checked ? checked.value : "";
  }
  function optionLabel(list, value) {
    var item = list.filter(function (o) { return o.value === value; })[0];
    return item ? item.label : "";
  }
  function todayISO() {
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }
  function formatDate(iso) {
    if (!iso) return "";
    var parts = iso.split("-");
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    return new Intl.DateTimeFormat("en-CA", { dateStyle: "long" }).format(d);
  }
  function formatDateTime(date) {
    return new Intl.DateTimeFormat("en-CA", { dateStyle: "full", timeStyle: "short" }).format(date);
  }
  function formatBytes(bytes) {
    return bytes > 1048576 ? (bytes / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB";
  }

  /* ---------- Storage (wrapped: storage can be unavailable) ---------- */
  function loadRequests() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { return []; }
  }
  function saveRequest(record) {
    var list = loadRequests();
    list.unshift(record);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 10))); } catch (e) { /* ignore */ }
  }

  /* ---------- Populate selects ---------- */
  function fillSelect(select, placeholder, options) {
    var current = select.value;
    select.innerHTML = "";
    var ph = document.createElement("option");
    ph.value = "";
    ph.textContent = placeholder;
    select.appendChild(ph);
    var stillAvailable = false;
    options.forEach(function (o) {
      var opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      if (o.value === current) { opt.selected = true; stillAvailable = true; }
      select.appendChild(opt);
    });
    return current && !stillAvailable; // true when a previous choice was removed
  }

  function initProperties() {
    DATA.properties.forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name + " – " + p.address + " (" + p.type + ")";
      els.property.appendChild(opt);
    });
  }

  function availableFor(list, property) {
    return list.filter(function (o) {
      if (!o.requires) return true;
      return property ? property.features.indexOf(o.requires) !== -1 : false;
    });
  }

  /* Swap the unit control between free text, a fixed list and "not applicable". */
  var unitSelect = null;
  function setUnitMode(property) {
    var mode = property ? property.unitMode : "text";
    var field = $("#unit-field");

    if (unitSelect) { unitSelect.parentNode.remove(); unitSelect = null; }
    els.unit.hidden = false;

    if (mode === "select") {
      els.unit.hidden = true;
      els.unit.disabled = true;
      var wrap = document.createElement("div");
      wrap.className = "select-wrap";
      unitSelect = document.createElement("select");
      unitSelect.id = "unit-select";
      unitSelect.name = "unit";
      unitSelect.required = true;
      unitSelect.setAttribute("aria-describedby", "unit-hint");
      wrap.appendChild(unitSelect);
      field.appendChild(wrap);
      fillSelect(unitSelect, "Select a unit", property.units.map(function (u) { return { value: u, label: u }; }));
      els.unitLabel.setAttribute("for", "unit-select");
      els.unitLabel.textContent = "Unit";
      els.unitHint.textContent = "This duplex has an upper and a lower unit.";
      unitSelect.addEventListener("change", onFieldChange);
    } else if (mode === "none") {
      els.unit.disabled = true;
      els.unit.value = "";
      els.unit.required = false;
      els.unitLabel.setAttribute("for", "unit");
      els.unitLabel.innerHTML = 'Unit number <span class="optional">(not applicable)</span>';
      els.unitHint.textContent = "Not needed for a single-family home.";
      clearError("unit");
    } else {
      els.unit.disabled = false;
      els.unit.required = true;
      els.unitLabel.setAttribute("for", "unit");
      els.unitLabel.textContent = "Unit number";
      els.unitHint.textContent = "For example, 1204.";
    }
    field.classList.toggle("field--disabled", mode === "none");
  }

  function onPropertyChange() {
    var property = getProperty(els.property.value);
    setUnitMode(property);
    var lostArea = fillSelect(els.area, "Select an area", availableFor(DATA.areas, property));
    var lostCat = fillSelect(els.category, "Select a category", availableFor(DATA.categories, property));

    var note = "";
    if (property) {
      var extras = [];
      if (property.features.indexOf("elevator") !== -1) extras.push("elevator");
      if (property.features.indexOf("common") !== -1) extras.push("common area");
      if (property.features.indexOf("parking") !== -1) extras.push("parking");
      if (property.features.indexOf("exterior") !== -1) extras.push("exterior");
      if (property.features.indexOf("garage") !== -1) extras.push("garage and basement");
      note = property.type + " selected. Area and category lists now include " + extras.join(", ") + " options.";
      if (lostArea || lostCat) note += " Your previous area or category is not available for this property, so please choose again.";
    }
    els.propertyNote.textContent = note;
    if (state.attempted) validate(false);
  }

  /* ---------- Small interactions ---------- */
  function updateCount() {
    var len = els.description.value.length;
    els.descCount.textContent = len + " of 1000 characters";
    els.descCount.classList.toggle("field__count--warn", len > 900);
  }

  function updateEmergency() {
    els.emergencyAlert.hidden = radioValue("urgency") !== "emergency";
  }

  function renderPhotoList() {
    els.photoList.innerHTML = "";
    els.photoList.hidden = state.selectedPhotos.length === 0;
    state.selectedPhotos.forEach(function (file, i) {
      var li = document.createElement("li");
      li.className = "photo-list__item";
      var img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.alt = "";
      img.width = 48; img.height = 48;
      var span = document.createElement("span");
      span.className = "photo-list__name";
      span.textContent = file.name + " (" + formatBytes(file.size) + ")";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn--text";
      btn.innerHTML = 'Remove<span class="visually-hidden"> ' + esc(file.name) + "</span>";
      btn.addEventListener("click", function () {
        state.selectedPhotos.splice(i, 1);
        renderPhotoList();
        showToast("Photo removed.");
        els.photos.focus();
      });
      li.appendChild(img); li.appendChild(span); li.appendChild(btn);
      els.photoList.appendChild(li);
    });
  }

  function onPhotosChange() {
    var files = Array.prototype.slice.call(els.photos.files || []);
    var problems = [];
    files.forEach(function (f) {
      if (!/^image\/(png|jpeg)$/.test(f.type)) { problems.push(f.name + " is not a JPG or PNG"); return; }
      if (f.size > MAX_PHOTO_MB * 1048576) { problems.push(f.name + " is larger than " + MAX_PHOTO_MB + " MB"); return; }
      if (state.selectedPhotos.length >= MAX_PHOTOS) { problems.push("Only " + MAX_PHOTOS + " photos can be attached"); return; }
      state.selectedPhotos.push(f);
    });
    els.photos.value = ""; // allow adding more in a later pick
    renderPhotoList();
    if (problems.length) setError("photos", problems.join(". ") + ".");
    else clearError("photos");
  }

  /* ---------- Validation ---------- */
  function getUnitValue() {
    var property = getProperty(els.property.value);
    if (property && property.unitMode === "select") return unitSelect ? unitSelect.value : "";
    if (property && property.unitMode === "none") return "";
    return els.unit.value.trim();
  }

  function fieldTarget(key) {
    // Element that receives focus / aria-invalid for each validation key
    switch (key) {
      case "unit": return unitSelect || els.unit;
      case "urgency": return $('input[name="urgency"]', form);
      case "entry": return $('input[name="entry"]', form);
      default: return els[key] || $("#" + key);
    }
  }

  function setError(key, message) {
    var errEl = $("#" + key + "-error");
    if (!errEl) return;
    errEl.innerHTML = '<span class="visually-hidden">Error: </span>' + esc(message);
    errEl.hidden = false;
    var group = key === "urgency" ? $("#urgency-group") : key === "entry" ? $("#entry-group") : null;
    var target = group || fieldTarget(key);
    if (!target) return;
    // aria-invalid is not allowed on a fieldset (role=group), so set it on the radios instead
    if (group) $$('input[name="' + key + '"]', form).forEach(function (r) { r.setAttribute("aria-invalid", "true"); });
    else target.setAttribute("aria-invalid", "true");
    var ids = (target.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
    if (ids.indexOf(errEl.id) === -1) { ids.unshift(errEl.id); target.setAttribute("aria-describedby", ids.join(" ")); }
    (target.closest(".field") || target).classList.add("field--error");
  }

  function clearError(key) {
    var errEl = $("#" + key + "-error");
    if (!errEl) return;
    errEl.hidden = true;
    errEl.textContent = "";
    var group = key === "urgency" ? $("#urgency-group") : key === "entry" ? $("#entry-group") : null;
    var target = group || fieldTarget(key);
    if (!target) return;
    target.removeAttribute("aria-invalid");
    if (group) $$('input[name="' + key + '"]', form).forEach(function (r) { r.removeAttribute("aria-invalid"); });
    var ids = (target.getAttribute("aria-describedby") || "").split(/\s+/).filter(function (id) { return id && id !== errEl.id; });
    if (ids.length) target.setAttribute("aria-describedby", ids.join(" "));
    else target.removeAttribute("aria-describedby");
    (target.closest(".field") || target).classList.remove("field--error");
  }

  function collect() {
    var property = getProperty(els.property.value);
    return {
      propertyId: els.property.value,
      property: property,
      unit: getUnitValue(),
      area: els.area.value,
      category: els.category.value,
      urgency: radioValue("urgency"),
      summary: els.summary.value.trim(),
      description: els.description.value.trim(),
      started: els.started.value,
      photos: state.selectedPhotos.slice(),
      entry: radioValue("entry"),
      pets: els.pets.checked,
      name: els.name.value.trim(),
      email: els.email.value.trim(),
      phone: els.phone.value.trim(),
      contact: radioValue("contact")
    };
  }

  function validate(showSummary) {
    var d = collect();
    var errors = []; // [key, message] in visual order

    if (!d.propertyId) errors.push(["property", "Select the property you rent"]);
    if (d.property && d.property.unitMode === "select" && !d.unit) errors.push(["unit", "Select your unit"]);
    else if ((!d.property || d.property.unitMode === "text") && !d.unit) errors.push(["unit", "Enter your unit number"]);
    else if (d.unit && !/^[A-Za-z0-9 \-#]{1,10}$/.test(d.unit) && (!d.property || d.property.unitMode === "text")) errors.push(["unit", "Unit number can only contain letters, numbers, spaces, # and -"]);
    if (!d.area) errors.push(["area", "Select the room or area with the problem"]);
    if (!d.category) errors.push(["category", "Select a category for the issue"]);
    if (!d.urgency) errors.push(["urgency", "Select how urgent the issue is"]);
    if (!d.summary) errors.push(["summary", "Enter a short summary of the issue"]);
    else if (d.summary.length < 5) errors.push(["summary", "Summary must be at least 5 characters"]);
    if (!d.description) errors.push(["description", "Describe the issue"]);
    else if (d.description.length < 20) errors.push(["description", "Description must be at least 20 characters so we understand the problem"]);
    if (d.started && d.started > todayISO()) errors.push(["started", "Start date cannot be in the future"]);
    if (!d.entry) errors.push(["entry", "Select whether staff may enter when you are not home"]);
    if (!d.name) errors.push(["name", "Enter your name"]);
    if (d.contact === "email" && !d.email) errors.push(["email", "Enter an email address, or choose phone as your contact method"]);
    else if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) errors.push(["email", "Enter an email address in the format name@example.com"]);
    var digits = d.phone.replace(/\D/g, "");
    if (d.contact === "phone" && !d.phone) errors.push(["phone", "Enter a phone number, or choose email as your contact method"]);
    else if (d.phone && !(digits.length === 10 || (digits.length === 11 && digits[0] === "1"))) errors.push(["phone", "Enter a 10-digit phone number, for example 519-555-0123"]);

    // Keep photo errors (set on file selection) but don't block submission because of them.
    ["property", "unit", "area", "category", "urgency", "summary", "description", "started", "entry", "name", "email", "phone"]
      .forEach(clearError);
    errors.forEach(function (e) { setError(e[0], e[1]); });

    if (showSummary) renderErrorSummary(errors);
    else if (!errors.length) els.errorSummary.hidden = true;
    else if (!els.errorSummary.hidden) renderErrorSummary(errors, true);

    return errors.length === 0 ? d : null;
  }

  function renderErrorSummary(errors, quiet) {
    if (!errors.length) { els.errorSummary.hidden = true; return; }
    els.errorCount.textContent = errors.length === 1 ? "is 1 problem" : "are " + errors.length + " problems";
    els.errorList.innerHTML = errors.map(function (e) {
      return '<li><a href="#' + e[0] + '" data-key="' + e[0] + '">' + esc(e[1]) + "</a></li>";
    }).join("");
    els.errorSummary.hidden = false;
    if (!quiet) els.errorSummary.focus();
  }

  function onFieldChange() {
    if (state.attempted) validate(false);
  }

  /* ---------- Summary rendering (review + confirmation) ---------- */
  function photoHTML(photos) {
    if (!photos.length) return "None";
    return '<ul class="summary__photos">' + photos.map(function (f, i) {
      var src = f instanceof File ? URL.createObjectURL(f) : "";
      return "<li>" + (src ? '<img src="' + src + '" alt="Photo ' + (i + 1) + ": " + esc(f.name) + '" width="88" height="88">' : "") +
        "<span>" + esc(f.name) + "</span></li>";
    }).join("") + "</ul>";
  }

  function summaryHTML(d, editable) {
    var urg = DATA.urgency[d.urgency];
    var contactLine = d.contact === "phone" ? "Phone" : "Email";
    var sections = [
      { title: "Location", rows: [
        ["Property", esc(d.property.name) + "<br><span class=\"muted\">" + esc(d.property.address) + "</span>", "property"],
        ["Unit", d.property.unitMode === "none" ? "Not applicable (single-family home)" : esc(d.unit), "unit"],
        ["Room or area", esc(optionLabel(DATA.areas, d.area)), "area"]
      ]},
      { title: "Issue", rows: [
        ["Category", esc(optionLabel(DATA.categories, d.category)), "category"],
        ["Urgency", '<span class="pill pill--' + d.urgency + '">' + esc(urg.label) + "</span>", "urgency"],
        ["Summary", esc(d.summary), "summary"],
        ["Description", '<span class="prewrap">' + esc(d.description) + "</span>", "description"],
        ["Started", d.started ? esc(formatDate(d.started)) : "Not provided", "started"],
        ["Photos", photoHTML(d.photos), "photos"]
      ]},
      { title: "Access and contact", rows: [
        ["Entry permission", d.entry === "yes" ? "Staff may enter if I am not home" : "Contact me to book a time", "entry"],
        ["Pets in unit", d.pets ? "Yes" : "No", "pets"],
        ["Name", esc(d.name), "name"],
        ["Email", d.email ? esc(d.email) : "Not provided", "email"],
        ["Phone", d.phone ? esc(d.phone) : "Not provided", "phone"],
        ["Preferred contact", contactLine, "contact"]
      ]}
    ];
    return sections.map(function (s) {
      // Review: sections sit under the h2 step heading (h3).
      // Confirmation: they sit under the "Details you submitted" h3 (h4).
      var h = editable ? "h3" : "h4";
      return '<div class="summary__section"><' + h + ' class="summary__title">' + s.title + "</" + h + '><dl class="summary__list">' +
        s.rows.map(function (r) {
          var change = editable
            ? '<dd class="summary__action"><button type="button" class="btn btn--text" data-edit="' + r[2] + '">Change<span class="visually-hidden"> ' + r[0].toLowerCase() + "</span></button></dd>"
            : "";
          return '<div class="summary__row"><dt>' + r[0] + "</dt><dd>" + r[1] + "</dd>" + change + "</div>";
        }).join("") + "</dl></div>";
    }).join("");
  }

  /* ---------- Step navigation ---------- */
  function showStep(step, opts) {
    opts = opts || {};
    state.step = step;
    ["form", "review", "confirmation"].forEach(function (s) {
      $("#step-" + s).hidden = s !== step;
    });
    var order = ["form", "review", "confirmation"];
    $$(".stepper__step").forEach(function (li) {
      var idx = order.indexOf(li.dataset.step), cur = order.indexOf(step);
      li.classList.toggle("is-complete", idx < cur);
      li.classList.toggle("is-current", idx === cur);
      if (idx === cur) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
      var label = $(".stepper__label", li);
      var status = idx < cur ? " (completed)" : "";
      label.setAttribute("data-status", status);
      var vh = $(".visually-hidden", li);
      if (!vh) { vh = document.createElement("span"); vh.className = "visually-hidden"; li.appendChild(vh); }
      vh.textContent = status;
    });
    document.title = STEP_TITLES[step] + " – Larchwood Member Portal";

    // Only highlight a recent request while it is the one shown on the confirmation screen.
    renderRecent(step === "confirmation" && state.submitted ? state.submitted.record.ref : null);

    if (opts.history === "push") history.pushState({ step: step }, "", "#" + step);
    else if (opts.history === "replace") history.replaceState({ step: step }, "", "#" + step);

    if (opts.focus !== false) {
      var heading = $("#step-" + step + " .step__heading");
      // Bring the progress bar + new step into view, then move focus to the step heading
      $(".stepper-wrap").scrollIntoView({ block: "start" });
      if (heading) heading.focus({ preventScroll: true });
    }
  }

  function goToReview() {
    state.attempted = true;
    var data = validate(true);
    if (!data) return;
    state.pending = data;
    $("#review-content").innerHTML = summaryHTML(data, true);
    showStep("review", { history: "push" });
  }

  function editField(key) {
    showStep("form", { history: "push", focus: false });
    var target;
    if (key === "urgency") target = $('input[name="urgency"]:checked', form) || $('input[name="urgency"]', form);
    else if (key === "entry") target = $('input[name="entry"]:checked', form) || $('input[name="entry"]', form);
    else if (key === "contact") target = $('input[name="contact"]:checked', form);
    else if (key === "pets") target = els.pets;
    else target = fieldTarget(key);
    if (target && !target.disabled) {
      target.focus();
      target.scrollIntoView({ block: "center" });
    } else {
      $("#form-heading").focus();
    }
  }

  function makeRef(date) {
    var y = String(date.getFullYear()).slice(2);
    var m = String(date.getMonth() + 1).padStart(2, "0");
    var d = String(date.getDate()).padStart(2, "0");
    return "LPM-" + y + m + d + "-" + String(Math.floor(1000 + Math.random() * 9000));
  }

  /* Fill the confirmation screen for a request.
     isNew = true right after submitting; false when reopened from "Your recent requests". */
  function renderConfirmation(record, d, isNew) {
    state.submitted = { record: record, data: d };
    $("#confirmation-heading").textContent = isNew ? "Request submitted" : "Request details";
    STEP_TITLES.confirmation = isNew ? "Request Submitted" : "Request " + record.ref;
    $("#ref-number").textContent = record.ref;
    var t = $("#submitted-at");
    t.setAttribute("datetime", record.submittedAt);
    t.textContent = formatDateTime(new Date(record.submittedAt));
    $("#request-status").textContent = record.status || "Submitted";
    $("#next-review").textContent = DATA.urgency[d.urgency].review;
    $("#next-visit").textContent = DATA.urgency[d.urgency].visit;
    $("#confirm-emergency").hidden = d.urgency !== "emergency";
    $("#confirmation-content").innerHTML = summaryHTML(d, false);
    renderRecent(record.ref);
  }

  /* Rebuild the data object summaryHTML() expects from a stored record. */
  function dataFromRecord(record) {
    var det = record.details;
    if (!det) return null;
    var property = getProperty(det.propertyId);
    if (!property) return null;
    var d = {};
    Object.keys(det).forEach(function (k) { d[k] = det[k]; });
    d.property = property;
    d.photos = det.photos || [];
    return d;
  }

  function openRecent(ref) {
    var record = loadRequests().filter(function (r) { return r.ref === ref; })[0];
    var d = record && dataFromRecord(record);
    if (!d) { showToast("Details for this request are not available."); return; }
    renderConfirmation(record, d, false);
    showStep("confirmation", { history: state.step === "confirmation" ? "replace" : "push" });
  }

  function submitRequest() {
    if (!state.pending) { showStep("form", { history: "replace" }); return; }
    var btn = $("#submit-btn");
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    var original = btn.innerHTML;
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Submitting…';

    // Simulated network delay: there is no backend in scope.
    setTimeout(function () {
      var now = new Date();
      var d = state.pending;
      var record = {
        ref: makeRef(now),
        submittedAt: now.toISOString(),
        status: "Submitted",
        summary: d.summary,
        urgency: d.urgency,
        // Full details so the request can be reopened from "Your recent requests".
        // Photos are stored by file name only (images themselves are not uploaded).
        details: {
          propertyId: d.propertyId, unit: d.unit, area: d.area, category: d.category,
          urgency: d.urgency, summary: d.summary, description: d.description, started: d.started,
          photos: d.photos.map(function (f) { return { name: f.name }; }),
          entry: d.entry, pets: d.pets, name: d.name, email: d.email, phone: d.phone, contact: d.contact
        }
      };
      saveRequest(record);
      state.pending = null;

      // Render with the live File objects so this first view still shows photo thumbnails.
      renderConfirmation(record, d, true);

      // The request is now "sent": clear the form so any route back to it
      // (nav links, "New request", browser Back) starts a fresh request.
      // The confirmation screen keeps its own rendered copy of the details.
      resetForm();

      btn.disabled = false;
      btn.removeAttribute("aria-busy");
      btn.innerHTML = original;
      showStep("confirmation", { history: "replace" });
    }, 700);
  }

  /* ---------- Reset ---------- */
  function prefillMember() {
    els.name.value = DATA.member.name;
    els.email.value = DATA.member.email;
  }

  function resetForm() {
    form.reset();
    state.selectedPhotos = [];
    state.attempted = false;
    renderPhotoList();
    ["property", "unit", "area", "category", "urgency", "summary", "description", "started", "photos", "entry", "name", "email", "phone"].forEach(clearError);
    els.errorSummary.hidden = true;
    onPropertyChange();
    els.propertyNote.textContent = "";
    prefillMember();
    updateCount();
    updateEmergency();
  }

  /* ---------- Recent requests (sidebar) ---------- */
  function renderRecent(currentRef) {
    var list = loadRequests();
    var ul = $("#recent-list");
    ul.innerHTML = list.slice(0, 4).map(function (r) {
      var when = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(new Date(r.submittedAt));
      var urg = DATA.urgency[r.urgency] ? DATA.urgency[r.urgency].label : "";
      // Visually hidden ", " separators keep the button's spoken name readable
      // (flex children otherwise run together, e.g. "drippingRoutine").
      var sep = '<span class="visually-hidden">, </span>';
      var inner =
        '<span class="recent-list__summary">' + esc(r.summary) + sep + "</span>" +
        '<span class="recent-list__meta"><span class="pill pill--' + esc(r.urgency) + '">' + esc(urg) +
        '<span class="visually-hidden"> urgency</span></span> ' +
        esc(r.ref) + ' · <time datetime="' + esc(r.submittedAt) + '">' + when + "</time>" + sep + "</span>" +
        '<span class="recent-list__status">Status: ' + esc(r.status || "Submitted") + "</span>";
      // Older records saved without details can't be reopened, so they stay plain text.
      var body = r.details
        ? '<button type="button" class="recent-list__link" data-ref="' + esc(r.ref) + '"' +
          (r.ref === currentRef ? ' aria-current="true"' : "") + ">" + inner +
          '<span class="recent-list__cta" aria-hidden="true">View details →</span></button>'
        : '<div class="recent-list__static">' + inner + "</div>";
      return '<li class="recent-list__item">' + body + "</li>";
    }).join("");
    $("#recent-empty").hidden = list.length > 0;
  }

  /* ---------- Toast for demo-only links ---------- */
  var toastTimer;
  function showToast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-visible"); t.textContent = ""; }, 5000);
  }

  /* ---------- Mobile navigation ---------- */
  function initNav() {
    var toggle = $(".nav-toggle");
    var nav = $("#primary-nav");
    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    }
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });
    window.matchMedia("(min-width: 64em)").addEventListener("change", function () { setOpen(false); });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { setOpen(false); }); });
  }

  /* ---------- Light / dark theme ----------
     Default follows the OS (prefers-color-scheme). Clicking the toggle saves an explicit choice. */
  var THEME_KEY = "larchwood.theme";
  function initTheme() {
    var btn = $("#theme-toggle");
    var root = document.documentElement;
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    function isDark() {
      var t = root.getAttribute("data-theme");
      return t ? t === "dark" : mq.matches;
    }
    // The button is labelled with the action it performs ("Switch to light mode"),
    // so it does not also use aria-pressed (a changing label + pressed state would contradict).
    function sync() {
      var target = isDark() ? "light" : "dark";
      btn.setAttribute("data-target", target);
      $(".theme-toggle__text", btn).textContent = target === "light" ? "Light mode" : "Dark mode";
    }
    btn.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
      sync();
      showToast(next === "dark" ? "Dark mode on." : "Light mode on.");
    });
    // If the user hasn't chosen, keep following OS changes live.
    mq.addEventListener("change", sync);
    sync();
  }

  /* ---------- Init ---------- */
  function init() {
    initProperties();
    onPropertyChange();
    els.propertyNote.textContent = "";
    prefillMember();
    updateCount();
    els.started.max = todayISO();
    renderRecent();
    initNav();
    initTheme();

    els.property.addEventListener("change", onPropertyChange);
    els.description.addEventListener("input", updateCount);
    els.photos.addEventListener("change", onPhotosChange);
    $$('input[name="urgency"]', form).forEach(function (r) { r.addEventListener("change", updateEmergency); });

    form.addEventListener("change", onFieldChange);
    form.addEventListener("focusout", onFieldChange);
    form.addEventListener("submit", function (e) { e.preventDefault(); goToReview(); });

    els.errorList.addEventListener("click", function (e) {
      var a = e.target.closest("a[data-key]");
      if (!a) return;
      e.preventDefault();
      var target = fieldTarget(a.dataset.key);
      if (target) { target.focus(); target.scrollIntoView({ block: "center" }); }
    });

    $("#review-content").addEventListener("click", function (e) {
      var b = e.target.closest("[data-edit]");
      if (b) editField(b.dataset.edit);
    });
    $("#back-btn").addEventListener("click", function () { showStep("form", { history: "push" }); });
    $("#submit-btn").addEventListener("click", submitRequest);
    $("#print-btn").addEventListener("click", function () { window.print(); });
    $("#another-btn").addEventListener("click", function () {
      resetForm();
      showStep("form", { history: "push" });
    });

    // Clear-form confirmation dialog
    var dialog = $("#reset-dialog");
    var resetBtn = $("#reset-btn");
    resetBtn.addEventListener("click", function () {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
        $("#reset-cancel").focus();
      } else if (window.confirm("Clear the form? Everything you have entered will be removed.")) {
        resetForm();
      }
    });
    $("#reset-cancel").addEventListener("click", function () { dialog.close(); });
    $("#reset-confirm").addEventListener("click", function () {
      dialog.close();
      resetForm();
      showToast("Form cleared.");
    });
    dialog.addEventListener("close", function () { resetBtn.focus(); });

    // Demo-only links: keep them working (no broken links) but explain they are out of scope.
    $$(".demo-link").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        showToast("“" + a.dataset.demo + "” is not part of this prototype. Only maintenance requests are available.");
      });
    });

    // Recent requests: reopen a past request on the confirmation screen
    $("#recent-list").addEventListener("click", function (e) {
      var b = e.target.closest("[data-ref]");
      if (b) openRecent(b.dataset.ref);
    });

    // "Maintenance" and "New request" nav links: open the request form.
    // Unsent answers (form/review steps) are kept; after a submission the form is already empty.
    $$("[data-nav='new-request']").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        showStep("form", { history: state.step === "form" ? "replace" : "push" });
      });
    });

    // Browser back/forward between steps
    window.addEventListener("popstate", function (e) {
      var step = (e.state && e.state.step) || "form";
      if (step === "review" && state.pending) {
        var fresh = validate(false);
        if (fresh) { state.pending = fresh; $("#review-content").innerHTML = summaryHTML(fresh, true); showStep("review"); }
        else showStep("form");
      }
      else if (step === "confirmation" && state.submitted) showStep("confirmation");
      else showStep("form");
    });
    history.replaceState({ step: "form" }, "", location.pathname + location.search);
  }

  init();
})();
