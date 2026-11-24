import {
  generateDefaultFields,
  addDefaultFieldsEventListener,
  loadCaseFields,
  generateTicketTypeField,
  addTicketTypeEventListener,
  loadTicketTypeFields
} from "./fraud.template.js";
import { bindProductHierarchyEvents } from "./util.js";
import { addSubmitFormEventListener } from "../services/service_v2.js";

export function renderForm() {
  const formContainer = document.getElementById("formContainer");
  if (!formContainer) return;

  let formHtml = '<form id="customForm">';

  const messageDisplay = document.getElementById("ticket-title");
  if (messageDisplay && window?.PayloadData?.ticketId) {
    messageDisplay.innerText = "Conditional Custom Fields (#" + window.PayloadData.ticketId + ")";
  }

  formHtml += generateTicketTypeField();
  formHtml += generateDefaultFields();
  formHtml += `<div id="ticketTypeFieldsContainer"></div>`;
  formHtml += `<div id="caseFieldsContainer"></div>`;
  formHtml += '<button id="btn_store">Submit</button>';
  formHtml += "</form>";

  formContainer.innerHTML = formHtml;

  addTicketTypeEventListener();
  addDefaultFieldsEventListener();
  bindProductHierarchyEvents(formContainer);

  const ticketTypeKey = window?.DefaultFieldsData?.ticketTypeConfig?.key;
  const savedTicketType = ticketTypeKey ? window?.PayloadData?.customFields?.[ticketTypeKey] : "";
  if (savedTicketType) {
    loadTicketTypeFields(savedTicketType);
  }

  const selectedCase = window?.PayloadData?.customFields?.k7;
  if (selectedCase) {
    loadCaseFields(selectedCase);
  }

  addSubmitFormEventListener();
}
