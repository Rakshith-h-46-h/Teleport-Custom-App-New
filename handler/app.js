
import { applyDebugState } from "./components/applyDebugState.js";
import { renderForm } from "./components/main_form.js";

export let yAppWidget = null;

(async () => {
  try {
    const { YAppWidget } = await import(
      "https://cdn.yellowmessenger.com/yapps-sdk/v1.0.0/widget.js"
    );

    yAppWidget = new YAppWidget();

    // Apply local debug data, if available
    await applyDebugState(runRenderForm);

    // Fetch ticket and custom field information
    const data = await yAppWidget.ask("ask_ticket_cf_info");

    console.log("Received ticket information:", data);

    const eventData = data?.eventResponse?.eventData;

    if (!eventData) {
      throw new Error("eventData is missing from the platform response");
    }

    // Store platform-provided data
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

function runRenderForm() {
  const messageDisplay = document.getElementById(
    "ticket-title-forbidden"
  );

  if (window.PayloadData && window.PayloadCustomFields) {
    if (messageDisplay) {
      messageDisplay.innerText = "";
    }

    renderForm();

    document.querySelectorAll("#customForm select").forEach(select => {
      new Choices(select, {
        searchEnabled: true,
        shouldSort: false,
        itemSelectText: "",
        searchResultLimit: 9999,
        renderChoiceLimit: -1,
        removeItemButton: true,
        allowHTML: false,
        fuseOptions: {
          threshold: 0.3
        }
      });
    });

  } else if (messageDisplay) {
    messageDisplay.innerText = "Loading...";
  }
}
