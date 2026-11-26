import {
  generateCustomField,
  initChoicesOnSelect,
  destroyChoicesOnSelect,
  hydratePrefilledHierarchies,
  escapeHtml
} from "./util.js";

function initContainerChoices(container) {
  if (!container) return;
  container.querySelectorAll("select:not(.hierarchy-select)").forEach((select) => {
    initChoicesOnSelect(select);
  });
}

function destroyContainerChoices(container) {
  if (!container) return;
  container.querySelectorAll("select").forEach((select) => {
    destroyChoicesOnSelect(select);
  });
}

export function generateTicketTypeField() {
  const config = window?.DefaultFieldsData?.ticketTypeConfig;
  if (!config || !Array.isArray(config.options)) return "";

  const savedValue = window?.PayloadData?.customFields?.[config.key] || "";
  const label = `${escapeHtml(config.label || "Ticket Type")} *`;
  const placeholder = config.placeholder || "Select Ticket Type";

  let html = `<div id="${escapeHtml(config.key)}-container" class="default-field-container ticket-type-wrapper">`;
  html += `<label for="${escapeHtml(config.key)}">${label}</label>`;
  html += `<select id="${escapeHtml(config.key)}" name="${escapeHtml(config.key)}" class="dynamic-dropdown" data-placeholder="${escapeHtml(placeholder)}" required>`;
  html += `<option value="" disabled ${!savedValue ? "selected" : ""}>${escapeHtml(placeholder)}</option>`;

  config.options.forEach((opt) => {
    const selected = String(opt.value) === String(savedValue) ? "selected" : "";
    html += `<option value="${escapeHtml(opt.value)}" ${selected}>${escapeHtml(opt.label)}</option>`;
  });

  html += `</select>`;
  html += `<span id="${escapeHtml(config.key)}-error-message" class="error-message hidden">${escapeHtml(config.label || "Ticket Type")} cannot be empty</span>`;
  html += `</div>`;

  return html;
}

export function loadTicketTypeFields(selectedTicketType) {
  const container = document.getElementById("ticketTypeFieldsContainer");
  if (!container) return;

  destroyContainerChoices(container);

  const options = window?.DefaultFieldsData?.ticketTypeConfig?.options || [];
  const matchedOption = options.find((opt) => String(opt.value) === String(selectedTicketType));

  if (!matchedOption || !Array.isArray(matchedOption.fields)) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = matchedOption.fields
    .map((f) => generateCustomField(f.key, "ticket-type-field-container", Boolean(f.isRequired)))
    .join("");

  hydratePrefilledHierarchies(container);
  initContainerChoices(container);
}

export function addTicketTypeEventListener() {
  const formContainer = document.getElementById("formContainer");
  const config = window?.DefaultFieldsData?.ticketTypeConfig;
  if (!formContainer || !config?.key) return;

  formContainer.addEventListener("change", (event) => {
    if (event.target.id === config.key) {
      loadTicketTypeFields(event.target.value);
    }
  });
}

export function generateDefaultFields() {
  let fieldHtml = "";

  if (!window.DefaultFieldsData) {
    console.log("DefaultFieldsData not loaded");
    return "";
  }

  const defaultFields = Array.isArray(window.DefaultFieldsData.defaultFields)
    ? window.DefaultFieldsData.defaultFields
    : [];

  defaultFields.forEach((defaultField) => {
    fieldHtml += generateCustomField(
      defaultField.key,
      "default-field-container",
      defaultField.isRequired
    );
  });

  return fieldHtml;
}

export function generateCaseFields(selectedCase) {
  let fieldHtml = "";

  const caseFields = window?.DefaultFieldsData?.cases?.[selectedCase];

  if (!caseFields) return "";

  caseFields.forEach((field) => {
    fieldHtml += generateCustomField(
      field.key,
      "case-field-container",
      field.isRequired
    );
  });

  return fieldHtml;
}

export function addDefaultFieldsEventListener() {
  const formContainer = document.getElementById("formContainer");
  if (!formContainer) return;

  formContainer.addEventListener("change", (event) => {
    if (event.target.id !== "k7") return;

    const selectedCase = event.target.value;
    loadCaseFields(selectedCase);
  });
}

export function loadCaseFields(selectedCase) {
  const caseContainer = document.getElementById("caseFieldsContainer");
  if (!caseContainer) return;

  destroyContainerChoices(caseContainer);

  const caseHtml = generateCaseFields(selectedCase);
  caseContainer.innerHTML = caseHtml;

  hydratePrefilledHierarchies(caseContainer);
  initContainerChoices(caseContainer);
}
