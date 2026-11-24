import { generateCustomField, initChoicesOnSelect } from "./util.js";

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

  const caseHtml = generateCaseFields(selectedCase);
  caseContainer.innerHTML = caseHtml;

  caseContainer.querySelectorAll("select").forEach((select) => {
    initChoicesOnSelect(select);
  });
}
