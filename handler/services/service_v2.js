import { yAppWidget } from "../app.js";
import { collectUpdatedCustomFields } from "../components/util.js";

function isElementHidden(el) {
  if (!el) return true;
  if (el.hasAttribute("hidden")) return true;

  const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
  if (style && (style.display === "none" || style.visibility === "hidden")) {
    return true;
  }

  const wrapper = el.closest(".field-item, .hierarchy-level-item, .default-field-container");
  if (wrapper) {
    if (wrapper.classList.contains("hidden")) return true;
    const wrapperStyle = window.getComputedStyle ? window.getComputedStyle(wrapper) : null;
    if (wrapperStyle && (wrapperStyle.display === "none" || wrapperStyle.visibility === "hidden")) {
      return true;
    }
  }

  return false;
}

function validateVisibleFields(form) {
  let hasError = false;

  // Clear `required` on hidden hierarchy selects so they never block validation/submission
  form.querySelectorAll("select.hierarchy-select").forEach((sel) => {
    if (isElementHidden(sel)) {
      sel.required = false;
      sel.removeAttribute("required");
    }
  });

  const fields = form.querySelectorAll("input, select, textarea");
  fields.forEach((field) => {
    if (!field.id || field.id.trim() === "") return;
    if (field.classList?.contains("choices__input")) return;

    const errorSpan = document.getElementById(`${field.id}-error-message`);
    if (isElementHidden(field) || !field.required) {
      errorSpan?.classList.add("hidden");
      return;
    }

    const val = String(field.value ?? "").trim();
    if (val === "") {
      hasError = true;
      errorSpan?.classList.remove("hidden");
    } else {
      errorSpan?.classList.add("hidden");
    }
  });

  return !hasError;
}

export function addSubmitFormEventListener() {
  const button = document.getElementById("btn_store");
  const form = document.getElementById("customForm");
  if (!button || !form) return;

  if (button.dataset.submitListenerAttached === "true") return;
  button.dataset.submitListenerAttached = "true";

  button.addEventListener("click", async (event) => {
    event.preventDefault();

    const isValid = validateVisibleFields(form);
    if (!isValid) return;

    const updatedCustomFields = collectUpdatedCustomFields(form);

    // Format date inputs to match existing date+T+time convention
    const time = new Date().toISOString().split("T")[1];
    form.querySelectorAll('input[type="date"]').forEach((dateInput) => {
      if (!dateInput.id || isElementHidden(dateInput)) return;
      const cleanKey = dateInput.id.startsWith("cf_") ? dateInput.id.slice(3) : dateInput.id;
      if (dateInput.value) {
        updatedCustomFields[cleanKey] = `${dateInput.value}T${time}`;
      }
    });

    // Preserve k19 team field if present in PayloadData
    if (window?.PayloadData?.customFields?.k19 !== undefined) {
      updatedCustomFields.k19 = window.PayloadData.customFields.k19;
    }

    console.log(updatedCustomFields);
    console.log("Submitting payload:");
    console.log(JSON.stringify(updatedCustomFields, null, 2));

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Saving...";

    try {
      const submittedData = await yAppWidget.update(
        "update_custom_fields",
        updatedCustomFields
      );

      window.PayloadData = window.PayloadData || {};
      window.PayloadData.customFields = {
        ...(window.PayloadData.customFields || {}),
        ...updatedCustomFields
      };

      console.log("custom fields updated", submittedData);
      alert("Data successfully updated.");
    } catch (error) {
      console.error("Error updating custom fields:", error);
    } finally {
      button.disabled = false;
      button.textContent = originalText || "Submit";
    }
  });
}
