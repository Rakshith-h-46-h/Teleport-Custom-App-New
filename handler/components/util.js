const choicesInstances = new WeakMap();

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
    } else if (
      customField.element === 'hierarchical' ||
      customField.element === 'hierarchy' ||
      customField.element === 'hierarchicalCustomField'
    ) {
      fieldHtml += generateHierarchicalCustomField(customField, containerClassName, isRequired);
    }
  }

  return fieldHtml;
}

export function initChoicesOnSelect(selectElement) {
  if (!selectElement || selectElement.tagName !== 'SELECT') return null;

  if (choicesInstances.has(selectElement)) {
    return choicesInstances.get(selectElement);
  }

  if (typeof window.Choices === 'function') {
    const instance = new window.Choices(selectElement, {
      searchEnabled: true,
      shouldSort: false,
      itemSelectText: '',
      removeItemButton: false
    });
    choicesInstances.set(selectElement, instance);
    return instance;
  }

  return null;
}

export function destroyChoicesOnSelect(selectElement) {
  if (!selectElement) return;

  const instance = choicesInstances.get(selectElement) || selectElement._choicesInstance;
  const parent = selectElement.parentElement;

  if (instance && typeof instance.destroy === 'function') {
    try {
      instance.destroy();
    } catch (_) {
      // Ignore if already torn down
    }
  }

  if (parent) {
    const choicesWrapper = parent.closest('.choices') || parent.querySelector('.choices');
    if (choicesWrapper && choicesWrapper.parentNode) {
      if (choicesWrapper.contains(selectElement)) {
        choicesWrapper.parentNode.insertBefore(selectElement, choicesWrapper);
      }
      choicesWrapper.remove();
    }
  }

  choicesInstances.delete(selectElement);
  if (selectElement._choicesInstance) {
    delete selectElement._choicesInstance;
  }
}

function buildHierarchyLevelsHtml(customField, rawValue, treeRoot, levels, selectedPath, requiredAttr) {
  const safeKey = escapeHtml(customField.key);
  let levelsHtml = '';

  for (let idx = 0; idx < levels.length; idx++) {
    const level = levels[idx] || {
      label: `${customField.name || customField.label || 'Hierarchy'} - Level ${idx + 1}`,
      options: []
    };

    const currentVal = selectedPath[idx] ?? '';

    // For level > 0, require a selection in the immediately preceding level
    if (idx > 0 && !selectedPath[idx - 1]) {
      break;
    }

    const levelOptions = getOptionsForLevel(level, idx, selectedPath, treeRoot);

    // Only render child levels if there are actual options available to pick
    if (idx > 0 && (!Array.isArray(levelOptions) || levelOptions.length === 0)) {
      break;
    }

    const hasMatch =
      currentVal !== '' &&
      Array.isArray(levelOptions) &&
      levelOptions.some(opt => getOptionValue(opt) === currentVal);

    const levelId = `${safeKey}-level-${idx}`;
    const selectedObj = Array.isArray(rawValue) ? rawValue[idx] : null;
    const levelLabelText =
      (selectedObj && typeof selectedObj === 'object' && selectedObj.levelName) ||
      level.label ||
      `${customField.name || customField.label || 'Hierarchy'} - Level ${idx + 1}`;
    const levelLabel = escapeHtml(levelLabelText);

    const placeholderSelected = !hasMatch ? ' selected' : '';

    levelsHtml += `<div class="hierarchy-level" data-level-index="${idx}">`;
    levelsHtml += `<label for="${levelId}">${levelLabel}</label>`;
    levelsHtml += `<select id="${levelId}" data-hierarchy-key="${safeKey}" data-level-index="${idx}" data-level-name="${escapeHtml(levelLabelText)}" class="dynamic-dropdown dynamic-hierarchy-select hierarchy-select"${requiredAttr}>`;
    levelsHtml += `<option value="" disabled${placeholderSelected}>Select ${levelLabel}</option>`;

    for (const opt of levelOptions) {
      const optVal = getOptionValue(opt);
      const optText = getOptionLabel(opt);
      const selected = optVal === currentVal ? ' selected' : '';
      levelsHtml += `<option value="${escapeHtml(optVal)}"${selected}>${escapeHtml(optText)}</option>`;
    }

    levelsHtml += `</select>`;
    levelsHtml += `</div>`;
  }

  return levelsHtml;
}

export function hydratePrefilledHierarchies(rootElement = document, overridePath = null) {
  if (!rootElement) return;

  const containers = rootElement.querySelectorAll('.hierarchy-field-container');
  containers.forEach((container) => {
    const cfKey = container.dataset.fieldKey;
    if (!cfKey) return;

    const customField = window?.PayloadCustomFields?.find(cf => cf.key === cfKey);
    if (!customField) return;

    const levelsWrapper =
      container.querySelector(`#${CSS.escape(cfKey)}-levels`) ||
      container.querySelector('.hierarchy-levels-wrapper');
    if (!levelsWrapper) return;

    const existingSelects = Array.from(levelsWrapper.querySelectorAll('.dynamic-hierarchy-select'));
    existingSelects.forEach(sel => destroyChoicesOnSelect(sel));

    const rawValue = getCustomFieldValue(cfKey);
    const treeRoot = getTreeRoot(customField);
    const levels = normalizeHierarchyLevels(customField, treeRoot);

    // Use active selection path when changing dropdowns; otherwise derive from saved value
    const selectedPath = Array.isArray(overridePath)
      ? overridePath
      : extractSelectedPath(rawValue, levels, treeRoot);

    const requiredAttr = container.querySelector('input[type="hidden"]')?.hasAttribute('required')
      ? ' required'
      : '';

    levelsWrapper.innerHTML = buildHierarchyLevelsHtml(
      customField,
      rawValue,
      treeRoot,
      levels,
      selectedPath,
      requiredAttr
    );

    const newSelects = Array.from(levelsWrapper.querySelectorAll('.dynamic-hierarchy-select'));
    newSelects.forEach(sel => initChoicesOnSelect(sel));

    syncHiddenHierarchyInput(container, cfKey, customField);
  });
}

function getCustomFieldValue(cfKey) {
  const raw = window?.PayloadData?.customFields?.[cfKey];
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'value' in raw) {
    return raw.value;
  }
  return raw;
}

function getTreeRoot(customField) {
  if (!customField) return [];
  return (
    customField.options ||
    customField.children ||
    customField.hierarchy ||
    customField.values ||
    customField.items ||
    customField.radiobuttons ||
    []
  );
}

function extractSelectedPath(rawValue, levels, treeRoot) {
  if (Array.isArray(rawValue)) {
    return rawValue.map(item =>
      typeof item === 'object' && item !== null ? String(item.id ?? item.value ?? '') : String(item)
    );
  }
  return resolveSelectedHierarchyPath(rawValue, levels, treeRoot);
}

function syncHiddenHierarchyInput(container, cfKey, customField) {
  const hiddenInput = document.getElementById(cfKey);
  if (!hiddenInput) return;

  const allSelects = Array.from(container.querySelectorAll('.dynamic-hierarchy-select'));
  const updatedPathValue = [];

  allSelects.forEach((sel, idx) => {
    if (sel.value) {
      const selectedOption = sel.options[sel.selectedIndex];
      updatedPathValue.push({
        id: sel.value,
        levelName:
          sel.dataset.levelName ||
          customField?.levels?.[idx]?.label ||
          customField?.levels?.[idx] ||
          `Level ${idx + 1}`,
        name: selectedOption ? selectedOption.textContent : sel.value
      });
    }
  });

  window.PayloadData = window.PayloadData || {};
  window.PayloadData.customFields = window.PayloadData.customFields || {};

  const existingFieldData = window.PayloadData.customFields[cfKey];
  if (
    existingFieldData &&
    typeof existingFieldData === 'object' &&
    !Array.isArray(existingFieldData) &&
    'value' in existingFieldData
  ) {
    existingFieldData.value = updatedPathValue;
  } else {
    window.PayloadData.customFields[cfKey] = updatedPathValue;
  }

  hiddenInput.value = JSON.stringify(updatedPathValue);
}

function generateDropdownCustomField(customField, containerClassName, isRequired) {
  let fieldHtml = '';

  const ticketCustomFieldValue = getCustomFieldValue(customField.key);
  const safeName = escapeHtml(customField.name || customField.label || customField.key);
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
  const safeName = escapeHtml(customField.name || customField.label || customField.key);
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
  const safeName = escapeHtml(customField.name || customField.label || customField.key);
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
  const safeName = escapeHtml(customField.name || customField.label || customField.key);
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
  const safeName = escapeHtml(customField.name || customField.label || customField.key);
  const safeClass = escapeHtml(containerClassName || '');
  const labelName = isRequired ? `${safeName} *` : safeName;
  const requiredAttr = isRequired ? ' required' : '';

  const rawValue = getCustomFieldValue(customField.key);
  const treeRoot = getTreeRoot(customField);
  const levels = normalizeHierarchyLevels(customField, treeRoot);
  const selectedPath = extractSelectedPath(rawValue, levels, treeRoot);

  const levelsHtml = buildHierarchyLevelsHtml(
    customField,
    rawValue,
    treeRoot,
    levels,
    selectedPath,
    requiredAttr
  );

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
  const isLevelBuckets =
    Array.isArray(treeRoot) &&
    treeRoot.length > 0 &&
    Array.isArray(treeRoot[0]);

  const bucketCount = isLevelBuckets
    ? treeRoot.filter(arr => Array.isArray(arr) && arr.length > 0).length
    : 0;

  if (Array.isArray(customField?.levels) && customField.levels.length > 0) {
    const count = Math.max(customField.levels.length, bucketCount, 1);
    return Array.from({ length: count }, (_, idx) => {
      const lvl = customField.levels[idx];
      const label =
        (typeof lvl === 'string' ? lvl : lvl?.label) ||
        `${customField?.name || customField?.label || 'Hierarchy'} - Level ${idx + 1}`;
      return {
        label,
        options: typeof lvl === 'object' && Array.isArray(lvl?.options) ? lvl.options : []
      };
    });
  }

  const depth = Math.max(1, bucketCount || getMaxTreeDepth(treeRoot));
  return Array.from({ length: depth }, (_, idx) => ({
    label: `${customField?.name || customField?.label || 'Hierarchy'} - Level ${idx + 1}`,
    options: []
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
  const isLevelBuckets =
    Array.isArray(treeRoot) &&
    treeRoot.length > 0 &&
    Array.isArray(treeRoot[0]);

  if (isLevelBuckets) {
    const bucket = Array.isArray(treeRoot[levelIndex]) ? treeRoot[levelIndex] : [];
    if (levelIndex === 0) {
      return bucket;
    }

    const parentValue = selectedPath[levelIndex - 1];
    if (!parentValue) {
      return [];
    }

    return bucket.filter(item => {
      const parentId =
        typeof item === 'object' && item !== null
          ? (item.parent ?? item.parentId ?? item.parentValue ?? null)
          : null;
      return parentId !== null && String(parentId) === String(parentValue);
    });
  }

  if (levelIndex === 0) {
    return Array.isArray(treeRoot) && treeRoot.length > 0 ? treeRoot : (level?.options || []);
  }

  const parentValue = selectedPath[levelIndex - 1];
  if (!parentValue) {
    return [];
  }

  const parentNode = findNodeByValue(treeRoot, parentValue);
  const childNodes = parentNode?.children || parentNode?.options || parentNode?.subOptions || [];
  return Array.isArray(childNodes) ? childNodes : [];
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

  const isLevelBuckets =
    Array.isArray(treeRoot) &&
    treeRoot.length > 0 &&
    Array.isArray(treeRoot[0]);

  if (isLevelBuckets) {
    for (let lvlIdx = treeRoot.length - 1; lvlIdx >= 0; lvlIdx--) {
      const bucket = Array.isArray(treeRoot[lvlIdx]) ? treeRoot[lvlIdx] : [];
      const current = bucket.find(node => getOptionValue(node) === String(rawValue));
      if (current) {
        const path = Array(lvlIdx + 1).fill('');
        path[lvlIdx] = getOptionValue(current);
        let parentId = current.parent ?? current.parentId ?? null;
        for (let upIdx = lvlIdx - 1; upIdx >= 0 && parentId; upIdx--) {
          const parentBucket = Array.isArray(treeRoot[upIdx]) ? treeRoot[upIdx] : [];
          const parentNode = parentBucket.find(n => getOptionValue(n) === String(parentId));
          if (!parentNode) break;
          path[upIdx] = getOptionValue(parentNode);
          parentId = parentNode.parent ?? parentNode.parentId ?? null;
        }
        return path;
      }
    }
  }

  const path = findPathToValue(treeRoot, rawValue);
  if (path.length > 0) {
    return path;
  }

  return levels.length > 1 ? [...Array(levels.length - 1).fill(''), String(rawValue)] : [String(rawValue)];
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

export function collectUpdatedCustomFields(rootElement = document) {
  const updated = {};
  const existingCustomFields = window?.PayloadData?.customFields || {};

  const hierarchyContainers = rootElement.querySelectorAll('.hierarchy-field-container');
  hierarchyContainers.forEach((container) => {
    const cfKey = container.dataset.fieldKey;
    if (!cfKey) return;

    const customField = window?.PayloadCustomFields?.find(cf => cf.key === cfKey);
    const selects = Array.from(container.querySelectorAll('.dynamic-hierarchy-select'));

    const pathValue = [];
    selects.forEach((sel, idx) => {
      if (sel.value) {
        const selectedOption = sel.options[sel.selectedIndex];
        pathValue.push({
          id: sel.value,
          levelName:
            sel.dataset.levelName ||
            customField?.levels?.[idx]?.label ||
            customField?.levels?.[idx] ||
            `Level ${idx + 1}`,
          name: selectedOption ? selectedOption.textContent : sel.value
        });
      }
    });

    const existingFieldData = existingCustomFields[cfKey];
    if (
      existingFieldData &&
      typeof existingFieldData === 'object' &&
      !Array.isArray(existingFieldData) &&
      'value' in existingFieldData
    ) {
      updated[cfKey] = {
        ...existingFieldData,
        value: pathValue
      };
    } else {
      updated[cfKey] = pathValue;
    }
  });

  const fieldContainers = rootElement.querySelectorAll('[id$="-container"]:not(.hierarchy-field-container)');
  fieldContainers.forEach((container) => {
    const containerId = container.id;
    const cfKey = containerId.replace(/-container$/, '');
    if (!cfKey || cfKey in updated) return;

    const control = container.querySelector(`#${CSS.escape(cfKey)}, select, input, textarea`);
    if (!control) return;

    if (control.type === 'checkbox') {
      updated[cfKey] = control.checked;
    } else {
      updated[cfKey] = control.value;
    }
  });

  return updated;
}

export function bindProductHierarchyEvents(rootElement = document) {
  const target = rootElement || document;
  if (target._productHierarchyBound) return;
  target._productHierarchyBound = true;

  target.addEventListener('change', (event) => {
    const select = event.target.closest('.dynamic-hierarchy-select');
    if (!select) return;

    const cfKey = select.dataset.hierarchyKey;
    const levelIndex = Number(select.dataset.levelIndex);
    const container = document.getElementById(`${cfKey}-container`);
    const hiddenInput = document.getElementById(cfKey);
    if (!container || !hiddenInput) return;

    const allSelects = Array.from(container.querySelectorAll('.dynamic-hierarchy-select'));

    // Build the exact path up to and including the level just changed
    const nextSelectedPath = [];
    for (let i = 0; i <= levelIndex; i++) {
      nextSelectedPath.push(allSelects[i]?.value || '');
    }

    hydratePrefilledHierarchies(container, nextSelectedPath);
  });
}

bindProductHierarchyEvents(document);
