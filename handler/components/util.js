const choicesInstances = new WeakMap();

export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/'/g, "'");
}

export function destroyChoicesOnSelect(select) {
  if (!select) return;
  const existing = choicesInstances.get(select);
  if (existing && typeof existing.destroy === "function") {
    try {
      existing.destroy();
    } catch (_) {
      // Ignore if already detached from DOM
    }
  }
  choicesInstances.delete(select);
}

export function initChoicesOnSelect(select) {
  if (!select) return;
  destroyChoicesOnSelect(select);

  if (typeof window.Choices === "function") {
    const instance = new window.Choices(select, {
      searchEnabled: true,
      shouldSort: false,
      itemSelectText: "",
      placeholder: true,
      placeholderValue: select.dataset.placeholder || "Select an option"
    });
    choicesInstances.set(select, instance);
  }
}

export function getCustomFieldConfig(cfKey) {
  const fields = window?.PayloadCustomFields;
  if (!Array.isArray(fields)) return null;
  return fields.find((item) => String(item.key) === String(cfKey)) || null;
}

export function getPrefilledHierarchyValues(cfKey) {
  const raw = window?.PayloadData?.customFields?.[cfKey];
  if (raw === undefined || raw === null || raw === "") return [];

  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (item && typeof item === "object") {
          return String(item.id ?? item.value ?? item.name ?? "");
        }
        return String(item ?? "");
      })
      .filter((v) => v !== "");
  }

  if (typeof raw === "object") {
    const candidates = [
      raw.product ?? raw.level0 ?? raw[0],
      raw.classification ?? raw.level1 ?? raw[1],
      raw.subclassification ?? raw.sub_classification ?? raw.level2 ?? raw[2],
      raw.details ?? raw.detail ?? raw.level3 ?? raw[3]
    ];
    return candidates
      .filter((v) => v !== undefined && v !== null && v !== "")
      .map((v) => (typeof v === "object" ? String(v.id ?? v.value ?? v.name ?? "") : String(v)));
  }

  return [String(raw)];
}

function getSortedLevelOptions(field, levelIndex, parentId = null) {
  const levelList = Array.isArray(field?.options?.[levelIndex]) ? field.options[levelIndex] : [];

  return levelList
    .filter((opt) => {
      if (!opt) return false;
      if (levelIndex === 0 || parentId === null || parentId === "") {
        return opt.parent === null || opt.parent === undefined || opt.parent === "";
      }
      return String(opt.parent) === String(parentId);
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function resolveOptionId(options, rawValue) {
  if (!rawValue) return "";
  const match = options.find(
    (opt) => String(opt.id) === String(rawValue) || String(opt.name).trim() === String(rawValue).trim()
  );
  return match ? String(match.id) : String(rawValue);
}

function buildSelectOptionsHtml(options, placeholder, selectedId = "") {
  let html = `<option value="" ${!selectedId ? "selected" : ""}>${escapeHtml(placeholder)}</option>`;
  options.forEach((opt) => {
    const optId = String(opt.id);
    const isSelected = selectedId !== "" && optId === String(selectedId) ? "selected" : "";
    html += `<option value="${escapeHtml(optId)}" ${isSelected}>${escapeHtml(String(opt.name).trim())}</option>`;
  });
  return html;
}

function generateHierarchyFieldHtml(field, wrapperClass, isRequired) {
  const levels = Array.isArray(field.levels) && field.levels.length > 0 ? field.levels : [field.name || field.key];
  const reqAttr = isRequired ? "required" : "";
  const reqStar = isRequired ? " *" : "";

  let html = `<div class="hierarchy-field-group ${escapeHtml(wrapperClass)}" data-hierarchy-key="${escapeHtml(field.key)}">`;

  levels.forEach((levelLabel, idx) => {
    const selectId = `${field.key}_level_${idx}`;
    const wrapperId = `${selectId}-wrapper`;
    const placeholder = `Select ${levelLabel}`;
    const hiddenClass = idx === 0 ? "" : " hidden";

    html += `<div id="${escapeHtml(wrapperId)}" class="field-item hierarchy-level-item${hiddenClass}" data-level-index="${idx}">`;
    html += `<label for="${escapeHtml(selectId)}">${escapeHtml(levelLabel)}${reqStar}</label>`;
    html += `<select id="${escapeHtml(selectId)}" name="${escapeHtml(selectId)}" class="dynamic-dropdown hierarchy-select" data-hierarchy-key="${escapeHtml(field.key)}" data-level-index="${idx}" data-placeholder="${escapeHtml(placeholder)}" ${reqAttr}>`;
    html += `<option value="" selected>${escapeHtml(placeholder)}</option>`;
    html += `</select>`;
    html += `<span id="${escapeHtml(selectId)}-error-message" class="error-message hidden">${escapeHtml(levelLabel)} cannot be empty</span>`;
    html += `</div>`;
  });

  html += `</div>`;
  return html;
}

function populateAndToggleHierarchyLevel(field, levelIndex, parentId, rawPrefilledValue, initChoices = false) {
  const select = document.getElementById(`${field.key}_level_${levelIndex}`);
  const wrapper = document.getElementById(`${field.key}_level_${levelIndex}-wrapper`);
  if (!select || !wrapper) return { selectedId: "", hasOptions: false };

  const levels = Array.isArray(field.levels) ? field.levels : [];
  const levelLabel = levels[levelIndex] || `Level ${levelIndex + 1}`;
  const placeholder = `Select ${levelLabel}`;

  const canShowParentDependent = levelIndex === 0 || (parentId !== null && parentId !== "");
  const options = canShowParentDependent ? getSortedLevelOptions(field, levelIndex, parentId) : [];
  const resolvedSelectedId = resolveOptionId(options, rawPrefilledValue);

  select.innerHTML = buildSelectOptionsHtml(options, placeholder, resolvedSelectedId);
  if (resolvedSelectedId) {
    select.value = resolvedSelectedId;
  }

  const shouldShow =
    levelIndex === 0 ||
    (canShowParentDependent && (options.length > 0 || resolvedSelectedId !== ""));

  wrapper.classList.toggle("hidden", !shouldShow);

  if (initChoices) {
    initChoicesOnSelect(select);
  }

  return {
    selectedId: resolvedSelectedId,
    hasOptions: options.length > 0
  };
}

export function hydratePrefilledHierarchies(rootElement = document) {
  const groups = rootElement.querySelectorAll("[data-hierarchy-key]");

  groups.forEach((group) => {
    const cfKey = group.getAttribute("data-hierarchy-key");
    const field = getCustomFieldConfig(cfKey);
    if (!field || !Array.isArray(field.levels)) return;

    const prefilledValues = getPrefilledHierarchyValues(cfKey);
    let currentParentId = null;

    field.levels.forEach((_, idx) => {
      const prefillForLevel = prefilledValues[idx] || "";
      const { selectedId, hasOptions } = populateAndToggleHierarchyLevel(
        field,
        idx,
        currentParentId,
        prefillForLevel,
        false
      );

      // Move down the chain whenever a value is prefilled (or if level 0 has a prefilled value)
      if (selectedId) {
        currentParentId = selectedId;
      } else if (prefillForLevel) {
        currentParentId = prefillForLevel;
      } else {
        currentParentId = "";
      }

      // If no value is prefilled at this level, hide any levels deeper than this one
      if (!currentParentId && !hasOptions) {
        for (let deeper = idx + 1; deeper < field.levels.length; deeper++) {
          const deeperWrapper = document.getElementById(`${field.key}_level_${deeper}-wrapper`);
          const deeperSelect = document.getElementById(`${field.key}_level_${deeper}`);
          if (deeperSelect) destroyChoicesOnSelect(deeperSelect);
          if (deeperWrapper) deeperWrapper.classList.add("hidden");
        }
      }
    });

    // Initialize Choices.js on all level selects after all values & visibility are set
    field.levels.forEach((_, idx) => {
      const select = document.getElementById(`${field.key}_level_${idx}`);
      if (select) initChoicesOnSelect(select);
    });
  });
}

export function bindProductHierarchyEvents(formContainer) {
  if (!formContainer) return;

  formContainer.addEventListener("change", (event) => {
    const target = event.target;
    if (!target || !target.classList?.contains("hierarchy-select")) return;

    const cfKey = target.getAttribute("data-hierarchy-key");
    const changedLevel = Number(target.getAttribute("data-level-index"));
    const field = getCustomFieldConfig(cfKey);
    if (!field || !Array.isArray(field.levels) || Number.isNaN(changedLevel)) return;

    let parentId = target.value || "";

    for (let nextIdx = changedLevel + 1; nextIdx < field.levels.length; nextIdx++) {
      const nextSelect = document.getElementById(`${field.key}_level_${nextIdx}`);
      const nextWrapper = document.getElementById(`${field.key}_level_${nextIdx}-wrapper`);

      if (nextIdx === changedLevel + 1 && parentId) {
        const { hasOptions } = populateAndToggleHierarchyLevel(field, nextIdx, parentId, "", true);
        if (!hasOptions) {
          parentId = "";
        }
      } else {
        if (nextSelect) {
          destroyChoicesOnSelect(nextSelect);
          const nextLabel = field.levels[nextIdx] || `Level ${nextIdx + 1}`;
          nextSelect.innerHTML = `<option value="" selected>Select ${escapeHtml(nextLabel)}</option>`;
          initChoicesOnSelect(nextSelect);
        }
        if (nextWrapper) {
          nextWrapper.classList.add("hidden");
        }
      }
    }
  });
}

export function generateCustomField(cfKey, containerClass = "custom-field-container", isRequired = false) {
  const field = getCustomFieldConfig(cfKey);
  if (!field) return "";

  if (Array.isArray(field.levels) && field.levels.length > 0 && Array.isArray(field.options)) {
    return generateHierarchyFieldHtml(field, containerClass, isRequired);
  }

  const savedValue = window?.PayloadData?.customFields?.[field.key] ?? "";
  const reqAttr = isRequired ? "required" : "";
  const reqStar = isRequired ? " *" : "";
  const fieldId = `cf_${field.key}`;
  const labelText = `${field.label || field.name || field.key}${reqStar}`;

  let html = `<div id="${escapeHtml(fieldId)}-container" class="field-item ${escapeHtml(containerClass)}">`;
  html += `<label for="${escapeHtml(fieldId)}">${escapeHtml(labelText)}</label>`;

  if (field.element === "dropdown" || field.element === "select") {
    const opts = Array.isArray(field.options) ? field.options : [];
    html += `<select id="${escapeHtml(fieldId)}" name="${escapeHtml(fieldId)}" class="dynamic-dropdown" data-placeholder="Select ${escapeHtml(field.label || field.name || field.key)}" ${reqAttr}>`;
    html += `<option value="" ${!savedValue ? "selected" : ""}>Select ${escapeHtml(field.label || field.name || field.key)}</option>`;
    opts.forEach((opt) => {
      const val = typeof opt === "object" ? (opt.id ?? opt.value ?? opt.name) : opt;
      const text = typeof opt === "object" ? (opt.name ?? opt.label ?? opt.value) : opt;
      const sel = String(val) === String(savedValue) ? "selected" : "";
      html += `<option value="${escapeHtml(val)}" ${sel}>${escapeHtml(text)}</option>`;
    });
    html += `</select>`;
  } else if (field.element === "textarea" || field.element === "longText") {
    html += `<textarea id="${escapeHtml(fieldId)}" name="${escapeHtml(fieldId)}" ${reqAttr}>${escapeHtml(savedValue)}</textarea>`;
  } else {
    const inputType = field.element === "number" ? "number" : field.element === "date" ? "date" : "text";
    html += `<input type="${inputType}" id="${escapeHtml(fieldId)}" name="${escapeHtml(fieldId)}" value="${escapeHtml(savedValue)}" ${reqAttr} />`;
  }

  html += `<span id="${escapeHtml(fieldId)}-error-message" class="error-message hidden">${escapeHtml(field.label || field.name || field.key)} cannot be empty</span>`;
  html += `</div>`;

  return html;
}
	
export function collectUpdatedCustomFields(formElement = document.getElementById("customForm")) {
  const existing = { ...(window?.PayloadData?.customFields || {}) };
  if (!formElement) return existing;
  const controls = formElement.querySelectorAll("input, select, textarea");
  controls.forEach((el) => {
    if (el.classList?.contains("hierarchy-select")) return;
    if (!el.name && !el.id) return;
    const rawKey = el.name || el.id;
    const cleanKey = rawKey.startsWith("cf_") ? rawKey.slice(3) : rawKey;
    if (el.type === "checkbox") {
      existing[cleanKey] = Boolean(el.checked);
    } else if (el.type === "radio") {
      if (el.checked) existing[cleanKey] = el.value;
    } else if (el.value !== undefined && el.value !== "") {
      existing[cleanKey] = el.value;
    }
  });
  const hierarchyGroups = formElement.querySelectorAll("[data-hierarchy-key]");
  hierarchyGroups.forEach((group) => {
    const cfKey = group.getAttribute("data-hierarchy-key");
    if (!cfKey) return;
    const levelSelects = Array.from(group.querySelectorAll("select.hierarchy-select")).sort(
      (a, b) => Number(a.dataset.levelIndex || 0) - Number(b.dataset.levelIndex || 0)
    );
    const selectedValues = levelSelects
      .map((sel) => {
        const wrapper = sel.closest(".hierarchy-level-item");
        const isHidden = wrapper?.classList?.contains("hidden");
        return !isHidden && sel.value ? sel.value : null;
      })
      .filter((val) => val !== null && val !== "");
    if (selectedValues.length > 0) {
      existing[cfKey] = selectedValues;
    }
  });
  return existing;
}
