export function generateCustomField(cfKey, containerClassName, isRequired = false) {
  let fieldHtml = '';

  const customField = window?.PayloadCustomFields?.find(cf => cf.key === cfKey);

  if (customField) {
    if (customField.element === 'radiobuttons') {
      fieldHtml += generateDropdownCustomField(customField, containerClassName, isRequired);
    } else if (customField.element === 'longText' || customField.element === 'shortText') {
      fieldHtml += generateTextCustomField(customField, containerClassName, isRequired);
    } else if (customField.element === 'date') {
      fieldHtml += generateDateCustomField(customField, containerClassName, isRequired);
    } else if (customField.element === 'number') {
      fieldHtml += generateNumberCustomField(customField, containerClassName, isRequired);
    } else if (customField.element === 'hierarchical' || customField.element === 'hierarchy') {
      fieldHtml += generateHierarchicalCustomField(customField, containerClassName, isRequired);
    }
  }

  return fieldHtml;
}

function getCustomFieldValue(cfKey) {
  const raw = window?.PayloadData?.customFields?.[cfKey];
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'value' in raw) {
    return raw.value;
  }
  return raw;
}

function generateDropdownCustomField(customField, containerClassName, isRequired) {
  let fieldHtml = '';

  const ticketCustomFieldValue = getCustomFieldValue(customField.key);
  const safeName = escapeHtml(customField.name);
  const safeKey = escapeHtml(customField.key);
  const safeClass = escapeHtml(containerClassName || '');
  const labelName = isRequired ? `${safeName} *` : safeName;
  const requiredAttr = isRequired ? ' required' : '';

  const options = Array.isArray(customField.radiobuttons) ? customField.radiobuttons : [];
  const hasMatchingOption =
    ticketCustomFieldValue !== undefined &&
    ticketCustomFieldValue !== null &&
    ticketCustomFieldValue !== '' &&
    options.some(option => option === ticketCustomFieldValue);

  const hasInvalidValue =
    ticketCustomFieldValue !== undefined &&
    ticketCustomFieldValue !== null &&
    ticketCustomFieldValue !== '' &&
    !hasMatchingOption;

  const placeholderSelected = !hasMatchingOption && !hasInvalidValue ? ' selected' : '';

  fieldHtml += `<div id="${safeKey}-container" class="${safeClass}">`;
  fieldHtml += `<label for="${safeKey}">${labelName}</label>`;
  fieldHtml += `<select id="${safeKey}" name="${safeName}" class="dynamic-dropdown"${requiredAttr}>`;
  fieldHtml += `<option value="" disabled${placeholderSelected}>Select ${safeName}</option>`;

  for (const option of options) {
    const isSelected = option === ticketCustomFieldValue ? ' selected' : '';
    fieldHtml += `<option value="${escapeHtml(option)}"${isSelected}>${escapeHtml(option)}</option>`;
  }

  // Keep invalid existing values so saving without changing this field preserves them
  if (hasInvalidValue) {
    fieldHtml += `<option value="${escapeHtml(ticketCustomFieldValue)}" selected disabled>${escapeHtml(ticketCustomFieldValue)}</option>`;
  }

  fieldHtml += `</select>`;
  fieldHtml += `<span id="${safeKey}-error-message" class="error-message hidden">${safeName} cannot be empty</span>`;
  fieldHtml += `</div>`;

  return fieldHtml;
}

function generateTextCustomField(customField, containerClassName, isRequired) {
  let fieldHtml = '';

  const ticketCustomFieldValue = getCustomFieldValue(customField.key);
  const safeName = escapeHtml(customField.name);
  const safeKey = escapeHtml(customField.key);
  const safeClass = escapeHtml(containerClassName || '');
  const labelName = isRequired ? `${safeName} *` : safeName;
  const requiredAttr = isRequired ? ' required' : '';
  const safeValue =
    ticketCustomFieldValue !== undefined && ticketCustomFieldValue !== null
      ? escapeHtml(ticketCustomFieldValue)
      : '';

  fieldHtml += `<div id="${safeKey}-container" class="${safeClass}">`;
  fieldHtml += `<label for="${safeKey}">${labelName}</label>`;
  fieldHtml += `<input type="text" id="${safeKey}" name="${safeName}" placeholder="${safeName}" value="${safeValue}"${requiredAttr} />`;
  fieldHtml += `<span id="${safeKey}-error-message" class="error-message hidden">${safeName} cannot be empty</span>`;
  fieldHtml += `</div>`;

  return fieldHtml;
}

function generateDateCustomField(customField, containerClassName, isRequired) {
  let fieldHtml = '';

  const ticketCustomFieldValue = getCustomFieldValue(customField.key);
  const safeName = escapeHtml(customField.name);
  const safeKey = escapeHtml(customField.key);
  const safeClass = escapeHtml(containerClassName || '');
  const labelName = isRequired ? `${safeName} *` : safeName;
  const requiredAttr = isRequired ? ' required' : '';

  let formattedDate = '';
  if (ticketCustomFieldValue) {
    const parsedDate = new Date(ticketCustomFieldValue);
    if (!Number.isNaN(parsedDate.getTime())) {
      formattedDate = parsedDate.toISOString().split('T')[0];
    }
  }

  fieldHtml += `<div id="${safeKey}-container" class="${safeClass}">`;
  fieldHtml += `<label for="${safeKey}">${labelName}</label>`;
  fieldHtml += `<input type="date" id="${safeKey}" name="${safeName}" placeholder="${safeName}" value="${escapeHtml(formattedDate)}"${requiredAttr} />`;
  fieldHtml += `<span id="${safeKey}-error-message" class="error-message hidden">${safeName} cannot be empty</span>`;
  fieldHtml += `</div>`;

  return fieldHtml;
}

function generateNumberCustomField(customField, containerClassName, isRequired) {
  let fieldHtml = '';

  const ticketCustomFieldValue = getCustomFieldValue(customField.key);
  const safeName = escapeHtml(customField.name);
  const safeKey = escapeHtml(customField.key);
  const safeClass = escapeHtml(containerClassName || '');
  const labelName = isRequired ? `${safeName} *` : safeName;
  const requiredAttr = isRequired ? ' required' : '';
  const safeValue =
    ticketCustomFieldValue !== undefined &&
    ticketCustomFieldValue !== null &&
    ticketCustomFieldValue !== ''
      ? escapeHtml(ticketCustomFieldValue)
      : '';

  fieldHtml += `<div id="${safeKey}-container" class="${safeClass}">`;
  fieldHtml += `<label for="${safeKey}">${labelName}</label>`;
  fieldHtml += `<input type="number" id="${safeKey}" name="${safeName}" placeholder="${safeName}" value="${safeValue}"${requiredAttr} />`;
  fieldHtml += `<span id="${safeKey}-error-message" class="error-message hidden">${safeName} cannot be empty</span>`;
  fieldHtml += `</div>`;

  return fieldHtml;
}

function generateHierarchicalCustomField(customField, containerClassName, isRequired) {
  const safeKey = escapeHtml(customField.key);
  const safeName = escapeHtml(customField.name);
  const safeClass = escapeHtml(containerClassName || '');
  const labelName = isRequired ? `${safeName} *` : safeName;
  const requiredAttr = isRequired ? ' required' : '';

  const rawValue = getCustomFieldValue(customField.key);
  const treeRoot =
    customField.options ||
    customField.children ||
    customField.hierarchy ||
    customField.radiobuttons ||
    [];

  const levels = normalizeHierarchyLevels(customField, treeRoot);

  const selectedPath = Array.isArray(rawValue)
    ? rawValue.map(item =>
        typeof item === 'object' && item !== null ? String(item.id ?? item.value ?? '') : String(item)
      )
    : resolveSelectedHierarchyPath(rawValue, levels, treeRoot);

  let levelsHtml = '';

  levels.forEach((level, idx) => {
    const levelId = `${safeKey}-level-${idx}`;
    const selectedObj = Array.isArray(rawValue) ? rawValue[idx] : null;
    const levelLabelText =
      (selectedObj && typeof selectedObj === 'object' && selectedObj.levelName) ||
      level.label ||
      `${customField.name} - Level ${idx + 1}`;
    const levelLabel = escapeHtml(levelLabelText);

    const levelOptions = getOptionsForLevel(level, idx, selectedPath, treeRoot);
    const currentVal = selectedPath[idx] ?? '';
    const hasMatch =
      currentVal !== '' && levelOptions.some(opt => getOptionValue(opt) === currentVal);
    const hasInvalid = currentVal !== '' && !hasMatch;
    const placeholderSelected = !hasMatch && !hasInvalid ? ' selected' : '';

    const invalidLabel =
      selectedObj && typeof selectedObj === 'object' && selectedObj.name
        ? selectedObj.name
        : currentVal;

    levelsHtml += `<div class="hierarchy-level" data-level-index="${idx}">`;
    levelsHtml += `<label for="${levelId}">${levelLabel}</label>`;
    levelsHtml += `<select id="${levelId}" data-hierarchy-key="${safeKey}" data-level-index="${idx}" data-level-name="${escapeHtml(levelLabelText)}" class="dynamic-dropdown dynamic-hierarchy-select"${requiredAttr}>`;
    levelsHtml += `<option value="" disabled${placeholderSelected}>Select ${levelLabel}</option>`;

    for (const opt of levelOptions) {
      const optVal = getOptionValue(opt);
      const optText = getOptionLabel(opt);
      const selected = optVal === currentVal ? ' selected' : '';
      levelsHtml += `<option value="${escapeHtml(optVal)}"${selected}>${escapeHtml(optText)}</option>`;
    }

    if (hasInvalid) {
      levelsHtml += `<option value="${escapeHtml(currentVal)}" selected disabled>${escapeHtml(invalidLabel)}</option>`;
    }

    levelsHtml += `</select>`;
    levelsHtml += `</div>`;
  });

  const serializedValue =
    rawValue !== undefined && rawValue !== null
      ? typeof rawValue === 'object'
        ? JSON.stringify(rawValue)
        : String(rawValue)
      : '';

  let fieldHtml = '';
  fieldHtml += `<div id="${safeKey}-container" class="${safeClass} hierarchy-field-container" data-field-key="${safeKey}">`;
  fieldHtml += `<div class="hierarchy-field-header"><span class="hierarchy-field-title">${labelName}</span></div>`;
  fieldHtml += `<input type="hidden" id="${safeKey}" name="${safeName}" value="${escapeHtml(serializedValue)}"${requiredAttr} />`;
  fieldHtml += `<div id="${safeKey}-levels" class="hierarchy-levels-wrapper">${levelsHtml}</div>`;
  fieldHtml += `<span id="${safeKey}-error-message" class="error-message hidden">${safeName} cannot be empty</span>`;
  fieldHtml += `</div>`;

  return fieldHtml;
}

function normalizeHierarchyLevels(customField, treeRoot) {
  if (Array.isArray(customField.levels) && customField.levels.length > 0) {
    return customField.levels;
  }

  const depth = Math.max(1, getMaxTreeDepth(treeRoot));
  return Array.from({ length: depth }, (_, idx) => ({
    label: `${customField.name} - Level ${idx + 1}`,
    options: idx === 0 ? treeRoot : []
  }));
}

function getMaxTreeDepth(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) return 0;
  let maxDepth = 1;
  for (const node of nodes) {
    const children = node?.children || node?.options || node?.subOptions || [];
    if (Array.isArray(children) && children.length > 0) {
      maxDepth = Math.max(maxDepth, 1 + getMaxTreeDepth(children));
    }
  }
  return maxDepth;
}

function getOptionsForLevel(level, levelIndex, selectedPath, treeRoot) {
  if (levelIndex === 0) {
    return Array.isArray(level.options) && level.options.length > 0 ? level.options : treeRoot;
  }

  const parentValue = selectedPath[levelIndex - 1];
  if (!parentValue) {
    return Array.isArray(level.options) ? level.options : [];
  }

  const parentNode = findNodeByValue(treeRoot, parentValue);
  const childNodes = parentNode?.children || parentNode?.options || parentNode?.subOptions || [];

  if (Array.isArray(childNodes) && childNodes.length > 0) {
    return childNodes;
  }

  if (Array.isArray(level.options) && level.options.length > 0) {
    return level.options.filter(opt => !opt.parentValue || opt.parentValue === parentValue);
  }

  return [];
}

function findNodeByValue(nodes, targetValue) {
  if (!Array.isArray(nodes)) return null;
  for (const node of nodes) {
    if (getOptionValue(node) === targetValue) return node;
    const children = node?.children || node?.options || node?.subOptions || [];
    const found = findNodeByValue(children, targetValue);
    if (found) return found;
  }
  return null;
}

function resolveSelectedHierarchyPath(rawValue, levels, treeRoot) {
  if (Array.isArray(rawValue)) {
    return rawValue;
  }
  if (!rawValue) {
    return [];
  }

  const path = findPathToValue(treeRoot, rawValue);
  if (path.length > 0) {
    return path;
  }

  return levels.length > 1 ? [...Array(levels.length - 1).fill(''), rawValue] : [rawValue];
}

function findPathToValue(nodes, targetValue, currentPath = []) {
  if (!Array.isArray(nodes)) return [];
  for (const node of nodes) {
    const val = getOptionValue(node);
    const nextPath = [...currentPath, val];
    if (val === targetValue) return nextPath;
    const children = node?.children || node?.options || node?.subOptions || [];
    const found = findPathToValue(children, targetValue, nextPath);
    if (found.length > 0) return found;
  }
  return [];
}

function getOptionValue(option) {
  if (typeof option === 'string' || typeof option === 'number') {
    return String(option);
  }
  return String(option?.value ?? option?.id ?? option?.key ?? option?.name ?? option?.label ?? '');
}

function getOptionLabel(option) {
  if (typeof option === 'string' || typeof option === 'number') {
    return String(option);
  }
  return String(option?.label ?? option?.name ?? option?.title ?? option?.value ?? option?.id ?? '');
}

export function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', '"')
    .replaceAll("'", "'");
}

document.addEventListener('change', (event) => {
  const select = event.target.closest('.dynamic-hierarchy-select');
  if (!select) return;

  const cfKey = select.dataset.hierarchyKey;
  const levelIndex = Number(select.dataset.levelIndex);
  const container = document.getElementById(`${cfKey}-container`);
  const hiddenInput = document.getElementById(cfKey);
  if (!container || !hiddenInput) return;

  const customField = window?.PayloadCustomFields?.find(cf => cf.key === cfKey);
  const allSelects = Array.from(container.querySelectorAll('.dynamic-hierarchy-select'));

  const updatedPathValue = [];
  allSelects.forEach((sel, idx) => {
    if (idx <= levelIndex && sel.value) {
      const selectedOption = sel.options[sel.selectedIndex];
      updatedPathValue.push({
        id: sel.value,
        levelName: sel.dataset.levelName || customField?.levels?.[idx]?.label || `Level ${idx + 1}`,
        name: selectedOption ? selectedOption.textContent : sel.value
      });
    }
  });

  window.PayloadData = window.PayloadData || {};
  window.PayloadData.customFields = window.PayloadData.customFields || {};

  const existingFieldData = window.PayloadData.customFields[cfKey];
  if (existingFieldData && typeof existingFieldData === 'object' && !Array.isArray(existingFieldData) && 'value' in existingFieldData) {
    existingFieldData.value = updatedPathValue;
  } else {
    window.PayloadData.customFields[cfKey] = updatedPathValue;
  }

  const preserveClasses = Array.from(container.classList)
    .filter(c => c !== 'hierarchy-field-container')
    .join(' ');

  container.outerHTML = generateCustomField(cfKey, preserveClasses, Boolean(hiddenInput.required));
});
