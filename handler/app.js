import { applyDebugState } from "./components/applyDebugState.js";
import { renderForm } from "./components/main_form.js";
import { initChoicesOnSelect } from "./components/util.js";

export let yAppWidget = null;

(async () => {
  try {
    const { YAppWidget } = await import(
      "https://cdn.yellowmessenger.com/yapps-sdk/v1.0.0/widget.js"
    );

    yAppWidget = new YAppWidget();

    const fraudRes = await fetch("./assets/json/fraud.json", { cache: "no-store" });
    if (!fraudRes.ok) {
      throw new Error("Cannot load fraud.json");
    }
    window.DefaultFieldsData = await fraudRes.json();
    console.log("Loaded: fraud");

    await applyDebugState(runRenderForm);

    const data = await yAppWidget.ask("ask_ticket_cf_info");
    console.log("Received ticket information:", data);

    const eventData = data?.eventResponse?.eventData;
    if (!eventData) {
      throw new Error("eventData is missing from the platform response");
    }

    window.PayloadData = eventData.ticketDetails;
    window.PayloadCustomFields = eventData.customFields;

    console.log("Ticket details:", window.PayloadData);
    console.log("Custom fields:", window.PayloadCustomFields);

    if (!Array.isArray(window.PayloadCustomFields)) {
      throw new Error("Custom fields response is not an array");
    }

    runRenderForm();
  } catch (error) {
    console.error("Error initializing custom app:", error);
  }
})();

function getCurrentFieldValue(field) {
  const raw =
    field.currentValue ??
    field.selectedValue ??
    field.selectedValues ??
    field.value ??
    null;

  if (Array.isArray(field.levels) && Array.isArray(field.options)) {
    const nameById = new Map();
    field.options.flat().forEach((opt) => {
      if (opt && opt.id) nameById.set(opt.id, opt.name ?? opt.id);
    });

    if (Array.isArray(raw) && raw.length > 0) {
      return raw
        .map((item) => {
          if (typeof item === "object" && item !== null) {
            return item.name ?? nameById.get(item.id) ?? item.id ?? "";
          }
          return nameById.get(item) ?? String(item);
        })
        .filter(Boolean)
        .join(" → ");
    }

    if (raw && typeof raw === "object") {
      return Object.values(raw)
        .map((val) => nameById.get(val) ?? String(val))
        .filter(Boolean)
        .join(" → ");
    }

    if (typeof raw === "string" && raw) {
      return nameById.get(raw) ?? raw;
    }

    return "Not set";
  }

  if (raw === null || raw === undefined || raw === "") {
    return "Not set";
  }
  if (Array.isArray(raw)) {
    return raw
      .map((v) => (typeof v === "object" ? v.name ?? v.label ?? JSON.stringify(v) : v))
      .join(", ");
  }
  if (typeof raw === "object") {
    return JSON.stringify(raw);
  }
  return String(raw);
}

function renderPayloadViewer(fields, containerId = "payload-fields-viewer") {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!Array.isArray(fields) || fields.length === 0) {
    container.innerHTML = "<p>No custom fields found.</p>";
    return;
  }

  container.innerHTML = fields
    .map((field) => {
      const label = field.label || field.name || field.key || "Field";
      const val = getCurrentFieldValue(field);
      return `
        <div class="field-row" style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee;">
          <span><strong>${label}</strong> <small>(${field.key || ""})</small></span>
          <span>${val}</span>
        </div>
      `;
    })
    .join("");
}

function runRenderForm() {
  const messageDisplay = document.getElementById("ticket-title-forbidden");

  if (window.PayloadData && window.PayloadCustomFields) {
    if (messageDisplay) {
      messageDisplay.innerText = "";
    }

    renderForm();
    renderPayloadViewer(window.PayloadCustomFields);

    document.querySelectorAll("#customForm select").forEach((select) => {
      initChoicesOnSelect(select);
    });
  } else if (messageDisplay) {
    messageDisplay.innerText = "Loading...";
  }
}
