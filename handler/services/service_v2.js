import { collectUpdatedCustomFields } from "../components/util.js";

const API_CONFIG = {
  endpoint: "/api/tickets/custom-fields", // Update to match your backend endpoint URL
  method: "POST", // Update to "PUT" or "PATCH" if required by your API
  sendWrappedCustomFields: false // Set to true if backend expects { customFields: {...} }
};

function getAuthHeaders() {
  const headers = {
    "Content-Type": "application/json"
  };

  const token =
    window?.PayloadData?.authToken ||
    window?.PayloadData?.token ||
    window?.sessionStorage?.getItem("authToken") ||
    window?.localStorage?.getItem("authToken");

  if (token) {
    headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }

  return headers;
}

function buildRequestBody(updatedCustomFields) {
  const ticketId =
    window?.PayloadData?.ticketId ||
    window?.PayloadData?.ticket_id ||
    window?.PayloadData?.id ||
    null;

  if (API_CONFIG.sendWrappedCustomFields) {
    return {
      ...(ticketId ? { ticketId } : {}),
      customFields: updatedCustomFields
    };
  }

  return updatedCustomFields;
}

export async function submitCustomFields(updatedCustomFields) {
  const payload = buildRequestBody(updatedCustomFields);
  console.log("Submitting payload:", payload);

  const response = await fetch(API_CONFIG.endpoint, {
    method: API_CONFIG.method,
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  const contentType = response.headers.get("content-type") || "";
  const responseData = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const errorMessage =
      typeof responseData === "object" && responseData?.message
        ? responseData.message
        : `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  // Keep in-memory customFields synced with the latest saved state
  window.PayloadData = window.PayloadData || {};
  window.PayloadData.customFields = {
    ...(window.PayloadData.customFields || {}),
    ...updatedCustomFields
  };

  return responseData;
}

export function addSubmitFormEventListener() {
  const form = document.getElementById("customForm");
  if (!form) return;

  if (form.dataset.submitListenerAttached === "true") return;
  form.dataset.submitListenerAttached = "true";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitBtn =
      form.querySelector("#btn_store") || form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : "";

    const updatedCustomFields = collectUpdatedCustomFields(form);

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving...";
      }

      const result = await submitCustomFields(updatedCustomFields);
      console.log("Custom fields updated successfully:", result);
      alert("Data successfully updated.");
    } catch (error) {
      console.error("Failed to submit custom fields:", error);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText || "Submit";
      }
    }
  });
}
