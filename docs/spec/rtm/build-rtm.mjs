// Builds the Requirements Traceability Matrix (spec §16) from the SRS text extract.
// Usage: node docs/spec/rtm/build-rtm.mjs
// Outputs: docs/spec/rtm/rtm.csv and docs/spec/16-rtm.md, and fails on any coverage, consistency or hygiene gap.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const specDir = join(here, "..");
const srcDir = join(specDir, "..", "source");
const srs = readFileSync(join(srcDir, "srs-full.txt"), "utf8");
const ids = JSON.parse(readFileSync(join(srcDir, "srs-ids.json"), "utf8")).ids;

const SECTION = {
  TCK: "§4", ACC: "§5", SOC: "§6", INC: "§7", CCC: "§8", SPT: "§9", FAC: "§10", BMS: "§11",
  PWR: "§12", PRK: "§13", HRM: "§14", VND: "§15", EVT: "§16", CXP: "§17", HSP: "§18",
  DGT: "§19", FIN: "§20", PRC: "§21", BI: "§22", FNB: "§22A",
};
const MODULE = {
  SOC: "Smart Security Operations Center", INC: "AI Incident Response", CCC: "Command & Control Center",
  SPT: "Sports Operations", FAC: "Smart Facility Management", BMS: "Building Management System",
  PWR: "Power Station Management", PRK: "Parking & Traffic", HRM: "Employee Management Suite",
  VND: "Vendor & Business Partner", EVT: "Event & Sponsor", CXP: "Customer Experience Platform",
  HSP: "Hospitality & Accommodation", DGT: "Digital Twin & Virtual Tour", FIN: "Finance & Accounting ERP",
  PRC: "Procurement & Inventory", BI: "Business Intelligence & AI Copilot", FNB: "Food, Beverage & Retail Ordering",
};
const RESPONSES = new Set(["Comply", "Comply with Configuration", "Comply with Customization", "Not Compliant", "Roadmap"]);
const CLASSES = new Set(["SRS-MUST", "SRS-SHALL", "SRS-MUST-INTERFACE", "DERIVED-MANDATORY", "RECOMMENDED", "OUT-OF-SCOPE / ROADMAP"]);
const COLS = [
  "req_id", "source_clause", "source_quote", "classification", "response", "requirement_text", "design_element",
  "api_endpoint", "data_entity", "screen_id", "test_case_ids", "acceptance_criteria", "verification_method", "owner", "status",
];

function quote(text, max = 25) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  return words.length <= max ? words.join(" ") : words.slice(0, max).join(" ") + " …";
}

// ---- Parse FR blocks verbatim from the SRS text (first occurrence of each ID wins) ----
function parseFrs() {
  const lines = srs.split(/\r?\n/);
  const out = new Map();
  const start = /^(FR-[A-Z]+-\d{3})\b\s*(.*)$/;
  const prio = /^(Must|Should|Could)$/;
  const trailingPrio = /^(.*?)\s+(Must|Should|Could)\s*$/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].trim().match(start);
    if (!m || out.has(m[1])) continue;
    const id = m[1];
    let buf = [];
    let priority = null;
    const first = m[2].trim();
    if (first) {
      const t = first.match(trailingPrio);
      if (t && t[1].length > 10) { buf.push(t[1]); priority = t[2]; }
      else buf.push(first);
    }
    for (let j = i + 1; !priority && j < lines.length; j++) {
      const l = lines[j].trim();
      if (!l || l === "(NEW)" || l === "(UPDATED)" || l === "ID Requirement Priority") continue;
      if (prio.test(l)) { priority = l; break; }
      const t = l.match(trailingPrio);
      if (t) { buf.push(t[1]); priority = t[2]; break; }
      buf.push(l);
    }
    const joined = buf.reduce((acc, l) => (acc.endsWith("-") ? acc + l : acc ? `${acc} ${l}` : l), "");
    const text = joined.replace(/\(NEW\)|\(UPDATED\)/g, "").replace(/\s+/g, " ").trim();
    out.set(id, { id, text, priority });
  }
  return out;
}
const frs = parseFrs();

// ---- Overlays for rows this subsystem builds, interfaces, or defers ----
const O = {
  "FR-TCK-001": { cls: "SRS-MUST", resp: "Comply with Customization", req: "TSA-IDN-001…010: registration on Web/App/Kiosk/assisted with validation, OTP, consent (incl. refusals), neutral de-duplication, guardian links.", design: "Identity & consent service", api: "POST /visitors; POST /otp/*; POST /visitors/{id}/consents; POST /visitors/{id}/guardian-links", entity: "VISITOR; IDENTITY_DOCUMENT; CONSENT; GUARDIAN_LINK; ACCESS_SUBJECT", screen: "SCR-APP-01; SCR-WEB-02; SCR-KSK-01; SCR-BOX-01", tests: "TC-REG-01; TC-REG-02; TC-REG-03; TC-REG-04; TC-CNS-01; TC-KSK-01", accept: "All four channels register valid visitors; invalid fields rejected with pointers; duplicates not disclosed", owner: "Ticket Administrator" },
  "FR-TCK-002": { cls: "SRS-MUST", resp: "Comply with Customization", req: "TSA-BIO-001…006: opt-in face enrolment at issuance with PAD, vault templates only, deletion ledger, demographic testing.", design: "Face enrolment via INT-01; biometric vault", api: "POST/DELETE /visitors/{id}/face-enrolments", entity: "BIOMETRIC_PROFILE; CONSENT; DELETION_LEDGER", screen: "SCR-APP-01; SCR-KSK-01; SCR-BOX-01", tests: "TC-BIO-01; TC-BIO-02; TC-BIO-03; TC-BIO-04", accept: "Enrolment with PAD; non-biometric path always available; deletion evidenced", owner: "Privacy Officer / CDO" },
  "FR-TCK-003": { cls: "SRS-MUST", resp: "Comply with Configuration", req: "TSA-CAT-001/002: eight sports as configurable TICKET_PRODUCTs bound to resource slots.", design: "Catalogue + inventory", api: "GET /products; GET /availability; POST /bookings", entity: "TICKET_PRODUCT; PRICE_VERSION; RESOURCE_SLOT", screen: "SCR-BO-01; SCR-APP-03; SCR-WEB-02; SCR-KSK-02", tests: "TC-CAT-01; TC-E2E-01", accept: "All eight sports sold with correct pricing in the 100-transaction run", owner: "Ticket Administrator" },
  "FR-TCK-004": { cls: "SRS-MUST", resp: "Comply with Configuration", req: "TSA-CAT-003: four free-pass types as zero-value bookings, no revenue posting.", design: "Catalogue (FREE_PASS); zero-value HOLD → CONFIRMED", api: "POST /bookings", entity: "TICKET_PRODUCT; BOOKING; TICKET", screen: "SCR-APP-03; SCR-KSK-02; SCR-BOX-01", tests: "TC-CAT-02; TC-E2E-01", accept: "Zero-value passes issue credentials and post no revenue", owner: "Ticket Administrator" },
  "FR-TCK-005": { cls: "SRS-MUST", resp: "Comply with Configuration", req: "TSA-CAT-001, TSA-ALC-001: VIP/VVIP/Corporate/Media with distinct price lists and zone permissions; controlled issuance for COMP.", design: "Catalogue + zone policy", api: "POST /bookings; POST /tickets/controlled-issuance; POST /allocation-pools", entity: "TICKET_PRODUCT; PRICE_VERSION; ZONE_PERMISSION; ALLOCATION_POOL", screen: "SCR-BO-01; SCR-BO-07; SCR-WEB-03", tests: "TC-CAT-01; TC-GAT-04; TC-ALC-01", accept: "Premium categories priced and zoned distinctly", owner: "Ticket Administrator" },
  "FR-TCK-006": { cls: "SRS-MUST", resp: "Comply with Customization", req: "TSA-MEM-001…006: four membership types, renewal, tokenised auto-billing, dunning, season entitlements.", design: "Membership service → payment orchestration", api: "POST /memberships; POST /memberships/{id}/renewals; POST /memberships/{id}/members", entity: "MEMBERSHIP_PLAN; MEMBERSHIP; MEMBERSHIP_MEMBER; SEASON_ENTITLEMENT; PAYMENT_INSTRUMENT", screen: "SCR-APP-08; SCR-WEB-01; SCR-BO-01", tests: "TC-MEM-01; TC-MEM-02; TC-MEM-03", accept: "Renewal and auto-billing with GRACE / SUSPENDED per policy", owner: "Ticket Administrator" },
  "FR-TCK-007": { cls: "SRS-MUST", resp: "Comply", req: "TSA-CRD-001…006, TSA-INV-009: one credential per attendee (rotating/static QR, RFID, NFC) with polymorphic owner and validity window; offline render; feature-phone fallback.", design: "Credential service; wallet passes (INT-06)", api: "GET /visitors/{id}/wallet; GET /tickets/{id}/credential; POST /tickets/{id}/credential/reissue", entity: "TICKET; ATTENDEE; CREDENTIAL", screen: "SCR-APP-07; SCR-APP-09", tests: "TC-CRD-01; TC-CRD-02; TC-CRD-03; TC-CRD-04; TC-CRD-05; TC-CRD-06; TC-CRD-07", accept: "One unique credential per attendee; replay and copies rejected", owner: "Ticket Administrator" },
  "FR-TCK-008": { cls: "OUT-OF-SCOPE / ROADMAP", resp: "Roadmap", req: "Customer self-service cancellation/transfer in Release B; operator refunds delivered now as TSA-RFD-001…005 (D-05).", design: "Refund saga (operator)", api: "POST /refunds; POST /refunds/{id}/approval", entity: "REFUND; TAX_DOCUMENT; CHARGEBACK", screen: "SCR-BO-01", tests: "TC-RFD-01; TC-RFD-02; TC-RFD-03", accept: "Operator refunds revoke credentials and reverse GL atomically", owner: "Finance Controller" },
  "FR-TCK-009": { cls: "OUT-OF-SCOPE / ROADMAP", resp: "Roadmap", req: "Dynamic/early-bird/off-peak/bundle pricing in Release B; minimal promo codes delivered now as TSA-PRM-001 (D-06).", design: "Promotion engine (minimal)", api: "POST /promotions/validations", entity: "PROMOTION; PROMOTION_REDEMPTION", screen: "SCR-BO-01; SCR-APP-05", tests: "TC-PRM-01", accept: "Promo caps and abuse controls enforced", owner: "Ticket Administrator" },
  "FR-TCK-010": { cls: "SRS-MUST", resp: "Comply with Customization", req: "TSA-FIN-001…006, TSA-BOX-002/003: daily rerun-safe reconciliation bookings↔payments↔settlements↔cash to GL; exception queue.", design: "Reconciliation service; journal export (INT-15)", api: "POST /reconciliation/batches; GET /finance/vouchers; POST /box-office/shifts", entity: "RECONCILIATION_BATCH; RECONCILIATION_ITEM; JOURNAL_EXPORT; GL_MAPPING; SHIFT; CASH_DRAWER", screen: "SCR-BO-05; SCR-BO-06", tests: "TC-FIN-01; TC-FIN-02; TC-FIN-04; TC-PAY-10; TC-BOX-01", accept: "Zero variance over 10 business days", owner: "Finance Controller" },
  "FR-TCK-011": { cls: "OUT-OF-SCOPE / ROADMAP", resp: "Roadmap", req: "Wearables in Release B; credential model accepts WRISTBAND without schema change (TSA-CRD-007).", design: "Credential type enum", api: "—", entity: "CREDENTIAL", screen: "SCR-APP-12 (linkage reserved)", tests: "—", accept: "Schema review at Design Acceptance", method: "Inspection", owner: "Ticket Administrator" },

  "FR-ACC-001": { cls: "SRS-MUST", resp: "Comply with Customization", req: "TSA-GAT-004, TSA-BIO-005: edge 1:N against event-scoped gallery with in-lane fallback and breaker.", design: "Edge face matcher (INT-01, INT-02)", api: "POST /access/verifications (FACE)", entity: "BIOMETRIC_PROFILE; ACCESS_EVENT", screen: "SCR-SEC-01", tests: "TC-GAT-02; TC-GAT-03; TC-BIO-04", accept: "Face entry ≤ 1.5 s P95; FRR ≤ 1 %, FAR ≤ 0.1 %", owner: "Security Administrator" },
  "FR-ACC-002": { cls: "SRS-MUST", resp: "Comply with Customization", req: "TSA-BLK-001…005: blacklist / watch-list on every attempt ≤ 1 s, unregistered faces, four-eyes.", design: "Edge blacklist snapshot + central list", api: "/blacklist; POST /access/verifications; GET /edge/snapshots/{type}", entity: "BLACKLIST_ENTRY; BLACKLIST_MATCH_LOG; ACCESS_SUBJECT; ACCESS_EVENT", screen: "SCR-BO-03; SCR-SEC-01", tests: "TC-BLK-01; TC-BLK-02; TC-BLK-03", accept: "10/10 blacklisted denied ≤ 1 s", owner: "Security Administrator" },
  "FR-ACC-003": { cls: "OUT-OF-SCOPE / ROADMAP", resp: "Roadmap", req: "VIP/VVIP concierge notification workflow in Release B.", design: "—", api: "—", entity: "—", screen: "—", tests: "—", accept: "—", method: "Inspection", owner: "SOC Manager" },
  "FR-ACC-004": { cls: "OUT-OF-SCOPE / ROADMAP", resp: "Roadmap", req: "Repeat-visitor context in Release B.", design: "—", api: "—", entity: "—", screen: "—", tests: "—", accept: "—", method: "Inspection", owner: "Ticket Administrator" },
  "FR-ACC-005": { cls: "SRS-MUST", resp: "Comply with Configuration", req: "TSA-GAT-001, TSA-GAT-007: Face/QR/RFID/NFC selectable per gate; registered devices.", design: "Gate configuration + controller adapters (INT-04)", api: "GET/PATCH /gates; /devices", entity: "GATE; DEVICE", screen: "SCR-BO-03", tests: "TC-GAT-01", accept: "Mode change audited and effective after sync", owner: "Access Administrator" },
  "FR-ACC-006": { cls: "SRS-MUST", resp: "Comply with Customization", req: "TSA-ZON-001…004, TSA-GAT-003: deny-by-default zone permissions for all subject types; re-entry policies; HRM/Vendor/Sports masters consumed.", design: "Policy engine", api: "POST /access/verifications; /zone-permissions; POST /access/unscans", entity: "ACCESS_SUBJECT; ZONE; ZONE_PERMISSION", screen: "SCR-BO-03", tests: "TC-GAT-04; TC-GAT-06; TC-GAT-08; TC-STF-01", accept: "Restricted zones deny non-permitted subjects", owner: "Access Administrator" },
  "FR-ACC-007": { cls: "SRS-MUST", resp: "Comply", req: "TSA-LOG-001: every decision logged with required fields; ≥ 12-month retention; tamper-evident.", design: "Access event store (partitioned)", api: "GET /access/events; POST /edge/access-events:batch", entity: "ACCESS_EVENT", screen: "SCR-BO-03", tests: "TC-LOG-01", accept: "All fields present; retention job verified", owner: "SOC Manager" },
  "FR-ACC-008": { cls: "SRS-MUST", resp: "Comply", req: "TSA-OVR-001/002: override with reason, step-up, SOC Manager for blacklist.", design: "Override service", api: "POST /access/overrides", entity: "OVERRIDE", screen: "SCR-SEC-01", tests: "TC-OVR-01; TC-OVR-02; TC-OVR-03", accept: "No override without permission and reason", owner: "SOC Manager" },

  "FR-SOC-005": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", req: "TSA-BLK-004, TSA-SOC-001: access alerts with gate, zone and camera reference published to SOC in real time.", design: "Event access.alert.raised (INT-18)", api: "Webhook / broker; POST /incidents", entity: "ACCESS_EVENT; BLACKLIST_MATCH_LOG", screen: "SCR-CCC-01", tests: "TC-SOC-01", accept: "Alert on SOC ≤ 5 s with camera reference", owner: "SOC Manager" },
  "FR-INC-001": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", req: "TSA-SOC-002: TSA supplies Security Breach signals (access alerts, escalations) to the Incident module; classification owned by INC.", design: "INT-18", api: "POST /incidents; POST /incidents/{id}/escalate", entity: "ACCESS_EVENT", screen: "SCR-CCC-05 (Other)", tests: "TC-SOC-01; TC-SOC-02", accept: "Escalated access alerts create incidents", owner: "SOC Manager" },
  "FR-CCC-001": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", req: "TSA-DSH-002: gate status, access alerts and entry flow to the Security Dashboard.", design: "INT-19", api: "GET /dashboards/kpi?dashboard=security; events", entity: "ACCESS_EVENT; GATE; DEVICE", screen: "SCR-CCC-01", tests: "TC-SOC-01; TC-DSH-02", accept: "Gate status and alerts visible live", owner: "SOC Manager" },
  "FR-CCC-003": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", req: "TSA-DSH-001: ticket and membership revenue panels in near real time.", design: "Ticket panels + marts (INT-20)", api: "GET /dashboards/kpi?dashboard=revenue", entity: "BOOKING; PAYMENT; JOURNAL_EXPORT", screen: "SCR-CCC-02", tests: "TC-DSH-01", accept: "Closed-day totals equal GL; refresh ≤ 5 min", owner: "Finance Controller" },
  "FR-CCC-004": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", req: "TSA-DSH-003, TSA-SOC-003: occupancy and ticket revenue KPIs to the Executive Dashboard.", design: "INT-19", api: "GET /dashboards/kpi?dashboard=executive", entity: "ACCESS_EVENT", screen: "SCR-CCC-03", tests: "TC-DSH-02", accept: "Occupancy = IN − OUT per zone", owner: "Executive (CCC)" },
  "FR-CCC-005": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", req: "Role-based visibility and drill-down to transaction level in TSA panels.", design: "RBAC + permission-tagged marts", api: "GET /dashboards/kpi", entity: "Marts", screen: "SCR-CCC-02", tests: "TC-DSH-01; TC-SEC-01", accept: "Drill-down respects role", owner: "System Administrator" },
  "FR-SPT-001": { cls: "SRS-MUST", resp: "Comply with Customization", req: "TSA-INV-001/003: real-time availability calendars with maintenance / blocked states.", design: "Inventory service", api: "GET /availability; POST /bookings", entity: "RESOURCE; RESOURCE_SLOT; INVENTORY_UNIT", screen: "SCR-APP-03; SCR-WEB-02", tests: "TC-INV-01", accept: "Availability authoritative at hold", owner: "Inventory Manager" },
  "FR-SPT-002": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", req: "TSA-ZON-003: team registrations feed Player/Coach access subjects.", design: "INT-22", api: "Inbound roster events", entity: "ACCESS_SUBJECT; CREDENTIAL; ZONE_PERMISSION", screen: "—", tests: "TC-GAT-04", accept: "Registered players admitted to permitted zones", owner: "Access Administrator" },
  "FR-SPT-003": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", req: "TSA-ZON-003: academy enrolment feeds student and coach access subjects.", design: "INT-22", api: "Inbound roster events", entity: "ACCESS_SUBJECT; CREDENTIAL", screen: "—", tests: "TC-GAT-04", accept: "Enrolled students admitted per schedule", owner: "Access Administrator" },
  "FR-SPT-005": { cls: "OUT-OF-SCOPE / ROADMAP", resp: "Roadmap", req: "Booking reminders in Release B (TSA-NTF-004).", design: "Notification templates reserved", api: "—", entity: "NOTIFICATION", screen: "SCR-APP-10", tests: "—", accept: "—", method: "Inspection", owner: "Ticket Administrator" },
  "FR-SPT-006": { cls: "SRS-MUST", resp: "Comply", req: "TSA-INV-004…007: double booking impossible via database constraints; retry hold and pending-payment grace.", design: "§5.4 constraints", api: "POST /bookings", entity: "INVENTORY_UNIT; HOLD; RESOURCE_SLOT", screen: "SCR-APP-03", tests: "TC-INV-01; TC-INV-02; TC-INV-05", accept: "500 concurrent holds → exactly 1 winner", owner: "Inventory Manager" },
  "FR-EVT-001": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", req: "TSA consumes event, venue and date masters from the Event module for event ticketing.", design: "INT-23", api: "Inbound event master", entity: "EVENT; SEAT_MAP", screen: "SCR-BO-02", tests: "TC-INV-04", accept: "Events sellable once published", owner: "Inventory Manager" },
  "FR-EVT-002": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", req: "TSA consumes sponsor package inventory as allocation caps.", design: "INT-23", api: "Inbound package inventory", entity: "ALLOCATION_POOL; SPONSOR_ENTITLEMENT", screen: "SCR-BO-07", tests: "TC-ALC-02", accept: "Allocation never exceeds package", owner: "Ticket Administrator" },
  "FR-EVT-003": { cls: "SRS-MUST", resp: "Comply with Customization", req: "TSA-ALC-002/003, TSA-INV-001/002: event seat maps, allocation and sponsor entitlements, never oversold.", design: "Allocation service", api: "POST /allocation-pools; POST /allocation-pools/{id}/assignments; GET /seat-maps/{eventId}", entity: "ALLOCATION_POOL; SPONSOR_ENTITLEMENT; INVENTORY_UNIT; SEAT_MAP", screen: "SCR-WEB-04; SCR-BO-07; SCR-APP-04", tests: "TC-ALC-02; TC-INV-04", accept: "Exactly the entitled quantity issued", owner: "Ticket Administrator" },
  "FR-CXP-001": { cls: "SRS-MUST", resp: "Comply with Customization", req: "TSA-CXP-001: ticket-support intents scoped to the authenticated visitor.", design: "Concierge tool APIs (INT-24)", api: "GET /visitors/{id}/wallet; GET /bookings/{id}", entity: "BOOKING; TICKET", screen: "SCR-APP-11", tests: "TC-CXP-01", accept: "Correct own-booking answers; no cross-user data", owner: "Customer Support Agent lead" },
  "FR-CXP-002": { cls: "OUT-OF-SCOPE / ROADMAP", resp: "Roadmap", req: "WhatsApp, Messenger, Voice channels in Release B (D-04).", design: "—", api: "—", entity: "—", screen: "—", tests: "—", accept: "—", method: "Inspection", owner: "Customer Support Agent lead" },
  "FR-CXP-003": { cls: "SRS-MUST", resp: "Comply with Customization", req: "TSA-CXP-002/003: human handoff with conversation and booking history ≤ 60 s; masked agent view.", design: "Handoff context API", api: "GET /visitors/{id}/transactions (agent, masked)", entity: "BOOKING; TRANSACTION_LEDGER", screen: "SCR-APP-11; SCR-BO-04", tests: "TC-CXP-02; TC-SEC-07", accept: "Handoff ≤ 60 s with context", owner: "Customer Support Agent lead" },
  "FR-CXP-004": { cls: "SRS-MUST", resp: "Comply", req: "TSA-CXP-001, TSA-NFR-020: Bengali and English.", design: "i18n", api: "Accept-Language", entity: "VISITOR.preferred_lang", screen: "SCR-APP-11", tests: "TC-CXP-01; TC-UX-01", accept: "bn/en answers and UI", owner: "Customer Support Agent lead" },
  "FR-CXP-005": { cls: "OUT-OF-SCOPE / ROADMAP", resp: "Roadmap", req: "Additional languages in Release B.", design: "i18n catalogue extensible", api: "—", entity: "—", screen: "—", tests: "—", accept: "—", method: "Inspection", owner: "Customer Support Agent lead" },
  "FR-FIN-001": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", req: "TSA-FIN-004: rerun-safe GL journals and AR invoices to the Finance ERP.", design: "INT-15", api: "GET /finance/vouchers; ERP posting (consumer)", entity: "JOURNAL_EXPORT; TAX_DOCUMENT; CORPORATE_ACCOUNT", screen: "SCR-BO-05", tests: "TC-FIN-01; TC-FIN-02", accept: "Journals post once, per cost centre", owner: "Finance Controller" },
  "FR-FIN-002": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", req: "TSA-FIN-005: Mushak-6.3 tax documents, credit notes, Mushak-9.1 data [LEGAL-VERIFY].", design: "Tax-document service; EFD/SDC (INT-14)", api: "GET /tax-documents/{id}; POST /tax-documents/{id}/credit-notes", entity: "TAX_DOCUMENT; TAX_CODE", screen: "SCR-BO-05", tests: "TC-FIN-03", accept: "Gap-free serials; credit notes on refunds", owner: "Finance Controller" },
  "FR-HRM-001": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", req: "TSA-ZON-003/004: employee joiner/mover/leaver events drive staff access.", design: "INT-16", api: "Inbound HRM events", entity: "ACCESS_SUBJECT; CREDENTIAL", screen: "—", tests: "TC-STF-01", accept: "Leaver revoked ≤ 15 min", owner: "Access Administrator" },
  "FR-BI-002": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", req: "TSA-DSH-004: curated ticketing/access marts for the AI Copilot.", design: "INT-20 CDC → marts", api: "Marts", entity: "Marts (subject_ref)", screen: "—", tests: "TC-DSH-01", accept: "Copilot answers from marts only", owner: "Finance Controller" },
  "FR-BI-003": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", req: "Permission tags on TSA marts enforce role scoping.", design: "Row tags", api: "Marts", entity: "Marts", screen: "—", tests: "TC-DSH-01", accept: "Two roles see different scopes", owner: "System Administrator" },
  "FR-FNB-001": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Configuration", req: "F&B owns outlet listing; TSA supplies the authenticated visitor identity / session (OIDC) it relies on.", design: "Shared customer IdP", api: "OIDC", entity: "VISITOR", screen: "SCR-APP-15 (Other)", tests: "TC-FNB-01", accept: "F&B uses TSA identity", owner: "F&B module owner" },
  "FR-FNB-002": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Configuration", req: "F&B owns indoor positioning; TSA supplies visitor identity only.", design: "Shared customer IdP", api: "OIDC", entity: "VISITOR", screen: "SCR-APP-15 (Other)", tests: "TC-FNB-01", accept: "F&B uses TSA identity", owner: "F&B module owner" },
  "FR-FNB-003": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Configuration", req: "F&B owns order routing; TSA supplies identity and payment confirmation events.", design: "Shared IdP; payment.captured", api: "Events", entity: "PAYMENT", screen: "SCR-APP-15 (Other)", tests: "TC-FNB-01", accept: "Payment events consumed", owner: "F&B module owner" },
  "FR-FNB-004": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Configuration", req: "F&B owns fulfilment modes; TSA supplies identity.", design: "Shared customer IdP", api: "OIDC", entity: "VISITOR", screen: "SCR-APP-15 (Other)", tests: "TC-FNB-01", accept: "F&B uses TSA identity", owner: "F&B module owner" },
  "FR-FNB-005": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", req: "TSA-PAY-008: shared payment orchestration, saved instruments and consolidated per-visitor ledger for F&B.", design: "Payment service (service clients, INT-21)", api: "POST /payments; GET/POST /visitors/{id}/transactions", entity: "PAYMENT; PAYMENT_INSTRUMENT; TRANSACTION_LEDGER", screen: "SCR-APP-07", tests: "TC-FNB-01", accept: "50 orders over 3 outlets paid via shared gateway", owner: "Finance Controller" },
  "FR-FNB-006": { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", req: "TSA records only payment legs; order revenue reconciles once via the Vendor module.", design: "payment.captured to VND (INT-17)", api: "Events", entity: "TRANSACTION_LEDGER", screen: "—", tests: "TC-FNB-01", accept: "Zero duplicate or missing entries", owner: "Finance Controller" },
  "FR-PRK-003": { cls: "OUT-OF-SCOPE / ROADMAP", resp: "Roadmap", req: "TSA publishes booking.confirmed webhooks now; parking reservation linkage owned by Parking (Should).", design: "INT-25", api: "POST /webhooks/subscribe", entity: "OUTBOX_EVENT", screen: "—", tests: "TC-PRK-01", accept: "Signed event delivered", owner: "Parking module owner" },
};

const US = [
  ["US-01", "Visitor: book a swimming pool slot from the mobile app and pay online", "FR-TCK-001, FR-TCK-007, FR-SPT-001", { cls: "SRS-MUST", resp: "Comply with Customization", tests: "TC-REG-01; TC-INV-01; TC-PAY-05; TC-CRD-01", screen: "SCR-APP-03; SCR-APP-05; SCR-APP-07", api: "POST /bookings; POST /payments", entity: "BOOKING; PAYMENT; TICKET; CREDENTIAL" }],
  ["US-02", "Visitor: enter the venue by simply scanning my face at the gate", "FR-TCK-002, FR-ACC-001, FR-ACC-005", { cls: "SRS-MUST", resp: "Comply with Customization", tests: "TC-GAT-02; TC-BIO-01; TC-BIO-02", screen: "SCR-APP-01; SCR-SEC-01", api: "POST /access/verifications", entity: "BIOMETRIC_PROFILE; ACCESS_EVENT" }],
  ["US-03", "Security Operator: see an automatic alert with camera reference when an intruder is detected in a restricted zone", "FR-SOC-002, FR-SOC-005, FR-INC-003", { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", tests: "TC-SOC-01", screen: "SCR-CCC-01", api: "access.alert.raised; POST /incidents", entity: "ACCESS_EVENT; BLACKLIST_MATCH_LOG", req: "TSA delivers access-point intrusion alerts with camera reference; video intruder analytics owned by SOC." }],
  ["US-04", "SOC Manager: see crowd density heatmaps in real time during a major match", "FR-SOC-003, FR-CCC-001"],
  ["US-05", "Facility Manager: have the system auto-escalate an overdue pool-cleaning task to my supervisor", "FR-FAC-002, FR-FAC-004, FR-FAC-005"],
  ["US-06", "Academy Coordinator: enroll a new academy student and assign a coach in one workflow", "FR-SPT-003"],
  ["US-07", "Finance Controller: have daily ticketing revenue reconcile automatically with the General Ledger", "FR-TCK-010, FR-FIN-001", { cls: "SRS-MUST", resp: "Comply with Customization", tests: "TC-FIN-01; TC-FIN-02", screen: "SCR-BO-05", api: "POST /reconciliation/batches; GET /finance/vouchers", entity: "RECONCILIATION_BATCH; JOURNAL_EXPORT" }],
  ["US-08", "Vendor Partner (Food Court): see my daily sales and revenue-share settlement in a partner portal", "FR-VND-001, FR-VND-002"],
  ["US-09", "Executive: see a single dashboard showing today's revenue, current occupancy, and open incidents", "FR-CCC-004", { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", tests: "TC-DSH-01; TC-DSH-02", screen: "SCR-CCC-03", api: "GET /dashboards/kpi", entity: "Marts", req: "TSA feeds ticket revenue and occupancy; dashboard owned by CCC." }],
  ["US-10", "Executive: ask “Which facilities need maintenance?” in plain language and get an instant answer", "FR-BI-002"],
  ["US-11", "HR Manager: have field staff attendance captured via GPS and face recognition automatically", "FR-HRM-005, FR-HRM-002"],
  ["US-12", "Parking Attendant: have the system recognize a vehicle's plate and allocate the nearest available slot", "FR-PRK-001, FR-PRK-002"],
  ["US-13", "Event Manager: allocate sponsor tickets automatically against the sponsorship package inventory", "FR-EVT-002, FR-EVT-003", { cls: "SRS-MUST", resp: "Comply with Customization", tests: "TC-ALC-02", screen: "SCR-BO-07; SCR-WEB-04", api: "POST /allocation-pools", entity: "ALLOCATION_POOL; SPONSOR_ENTITLEMENT" }],
  ["US-14", "Visitor (Emergency): reach a real person via WhatsApp concierge and have them see my whole booking history", "FR-CXP-001, FR-CXP-003", { cls: "SRS-MUST", resp: "Comply with Customization", tests: "TC-CXP-02", screen: "SCR-APP-11; SCR-BO-04", api: "Handoff context API", entity: "BOOKING", req: "Handoff with booking history on App/Web now; WhatsApp channel Roadmap per FR-CXP-002 (D-04)." }],
  ["US-15", "Emergency Response Officer: have the system automatically alert the medical team and log the response time when a medical emergency is detected", "FR-INC-001, FR-INC-003, FR-INC-005"],
  ["US-16", "IT Administrator: have role-based access enforced on every dashboard and API", "FR-CCC-005, FR-BI-003, Section 33", { cls: "SRS-MUST", resp: "Comply", tests: "TC-SEC-01; TC-SEC-02; TC-SEC-07", screen: "SCR-BO-08", api: "All", entity: "—", req: "RBAC at UI and API with object-, property- and function-level checks (§4, §7.1 TSA-API-011)." }],
  ["US-17", "Visitor: order food from any restaurant in the facility without leaving my seat or current location", "FR-FNB-001, FR-FNB-002, FR-FNB-003, FR-FNB-005", { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", tests: "TC-FNB-01", screen: "SCR-APP-15 (Other)", api: "POST /payments", entity: "PAYMENT; TRANSACTION_LEDGER", req: "TSA supplies identity, payment and ledger; ordering owned by F&B." }],
];

const UC = [
  ["UC-TCK-01", "Purchase a Sports Ticket and Gain Venue Access", { cls: "SRS-MUST", resp: "Comply with Customization", tests: "TC-E2E-01; TC-INV-03; TC-INV-05; TC-PAY-01; TC-PAY-02; TC-PAY-03; TC-PAY-04; TC-PAY-11; TC-BLK-01; TC-GAT-05", screen: "SCR-APP-03; SCR-APP-05; SCR-APP-06; SCR-APP-07; SCR-SEC-01", api: "POST /bookings; POST /payments; POST /access/verifications", entity: "BOOKING; HOLD; PAYMENT; TICKET; CREDENTIAL; ACCESS_EVENT", req: "Main flow 1–8 and exceptions 3a, 7a, 7b (§10.3); PoC and UAT per §13.3." }],
  ["UC-SEC-01", "Detect and Respond to an Unauthorized Access Attempt", { cls: "SRS-MUST", resp: "Comply with Customization", tests: "TC-SOC-01; TC-SOC-02; TC-OVR-03; TC-BLK-02", screen: "SCR-CCC-01; SCR-SEC-01", api: "POST /access/verifications; POST /access/overrides; POST /incidents; POST /incidents/{id}/escalate", entity: "ACCESS_EVENT; OVERRIDE; BLACKLIST_ENTRY; BLACKLIST_MATCH_LOG", req: "Main flow 1–7 and exceptions 4a, 6a (§10.4); PoC and UAT per §13.3." }],
  ["UC-INC-01", "Automated Fire Detection and Emergency Response"],
  ["UC-FAC-01", "Scheduled Facility Maintenance with Escalation"],
  ["UC-BI-01", "Executive Natural-Language Query via AI Copilot"],
  ["UC-VND-01", "Automated Vendor Revenue-Share Settlement"],
  ["UC-FNB-01", "Order Food & Beverage via Location-Aware Ordering", { cls: "SRS-MUST-INTERFACE", resp: "Comply with Customization", tests: "TC-FNB-01", screen: "SCR-APP-15 (Other)", api: "POST /payments", entity: "PAYMENT; TRANSACTION_LEDGER", req: "TSA delivers step 5 (shared wallet/payment gateway) and the payment leg of step 8." }],
];

// SHALL-type obligations from SRS sections outside the FR tables that bind this subsystem.
const SHALL = [
  ["SRS-2.1-MIG", "§2.1", "Data migration of existing visitor, membership, and asset records (where applicable).", "TSA-MIG-001", "TC-MIG-01"],
  ["SRS-3.1-AVAIL", "§3.1", "99.9% uptime for Layer 1/2/3 transactional systems; 99.95% for Layer 4/6 life-safety and security functions", "§9.1", "TC-DR-01"],
  ["SRS-3.1-SCALE", "§3.1", "minimum of 100,000 registered visitor profiles and 20,000 concurrent app/portal sessions during peak events", "TSA-NFR-004; §9.4; TSA-WR-001", "TC-PERF-01; TC-WR-01"],
  ["SRS-3.1-LAT", "§3.1", "Access-control decision (face/QR/RFID scan to turnstile release) shall complete in ≤ 1.5 seconds at the 95th percentile.", "TSA-NFR-001; TSA-GAT-005; §9.3", "TC-GAT-07"],
  ["SRS-3.1-INTEROP", "§3.1", "All modules shall expose RESTful JSON APIs and support webhook-based event publishing", "TSA-API-001; §7.7", "TC-API-01; TC-PRK-01"],
  ["SRS-3.1-DEPLOY", "§3.1", "Hybrid: Cloud-hosted application tier with on-premises edge nodes for CCTV/IoT processing and local failover.", "§11.1; §11.2; TSA-EDG-001/002", "TC-EDG-01; TC-EDG-02"],
  ["SRS-3.1-RESID", "§3.1", "PII of Bangladeshi citizens shall be stored in-country unless otherwise approved by ABG legal/compliance.", "A-05; D-14; §8.8; TSA-DR-002", "TC-DR-01"],
  ["SRS-3.1-DR", "§3.1", "RPO ≤ 15 minutes, RTO ≤ 4 hours for core transactional systems; RPO ≤ 1 hour, RTO ≤ 1 hour for SOC/life-safety systems.", "TSA-DR-001", "TC-DR-01"],
  ["SRS-26.1-SCREENS", "§26.1", "Visitor Mobile App screens: Onboarding & Registration … Profile & Settings", "§3.1 SCR-APP-*", "TC-UX-02"],
  ["SRS-26.2-SCREENS", "§26.2", "Web Portal screens: Public Landing Page, Booking Engine, Corporate Portal, Sponsor Portal, Vendor / Partner Portal", "§3.2 SCR-WEB-*", "TC-UX-02; TC-ALC-01"],
  ["SRS-26.3-SCREENS", "§26.3", "Self-Service Kiosk: Walk-in Ticket Purchase, Membership Check-in, Wayfinding", "§3.3 SCR-KSK-*; TSA-MEM-004", "TC-KSK-01; TC-KSK-02; TC-KSK-03; TC-MEM-03"],
  ["SRS-26.4-SCREENS", "§26.4", "Security Dashboard … Revenue Dashboard … Executive Dashboard", "§3.4 SCR-CCC-01…03; §9.6 KPI catalogue", "TC-DSH-01; TC-DSH-02"],
  ["SRS-26.5-SCREENS", "§26.5", "Ticketing & Pricing Admin … refund approval; Access & Zone Permission Admin … blacklist management, override audit log", "§3.5 SCR-BO-*", "TC-CAT-01; TC-BLK-03; TC-RFD-01"],
  ["SRS-26.6-LANG", "§26.6", "All visitor-facing screens shall support Bengali and English, switchable by the user", "TSA-NFR-020", "TC-UX-01"],
  ["SRS-26.6-WCAG", "§26.6", "All screens shall meet WCAG 2.1 AA … accessibility guidelines at minimum.", "TSA-NFR-021; D-02", "TC-UX-02"],
  ["SRS-26.6-DARK", "§26.6", "Operator consoles shall support both dark and light mode for extended SOC shift usage.", "TSA-NFR-022", "TC-UX-02"],
  ["SRS-26.6-RESP", "§26.6", "Response layouts shall support desktop, tablet, and large-format video-wall resolutions.", "TSA-NFR-023", "TC-UX-02"],
  ["SRS-26.6-AUDIT", "§26.6", "Every admin action that changes access rights, pricing, or financial data shall require an audit-logged confirmation step.", "TSA-CAT-004; §4.4", "TC-CAT-01; TC-GAT-01"],
  ["SRS-27.1-REST", "§27.1", "All modules shall expose RESTful APIs using JSON payloads over HTTPS (TLS 1.2 or higher).", "TSA-API-001; D-01", "TC-SEC-02"],
  ["SRS-27.1-VERSION", "§27.1", "APIs shall be versioned (e.g., /api/v1/...) with a documented deprecation policy of at least 12 months' notice.", "TSA-API-002", "TC-API-01"],
  ["SRS-27.1-OAUTH", "§27.1", "Authentication shall use OAuth 2.0 / OpenID Connect with short-lived access tokens and refresh tokens.", "TSA-API-003", "TC-SEC-02"],
  ["SRS-27.1-OPENAPI", "§27.1", "All APIs shall be documented using the OpenAPI 3.x specification and published to a developer portal.", "TSA-API-004; DL-02", "TC-API-01"],
  ["SRS-27.1-EVENTS", "§27.1", "Event-driven integrations shall be supported via webhooks and/or a message broker", "TSA-API-012; §7.7", "TC-PRK-01"],
  ["SRS-27.1-RATE", "§27.1", "All APIs shall implement rate limiting and quota management per consuming application.", "TSA-API-007", "TC-WR-02"],
  ["SRS-27.1-AUDIT", "§27.1", "Sensitive endpoints (access control, financial, PII) shall log every call with caller identity, timestamp, and payload hash", "TSA-API-008; §8.10", "TC-SEC-03"],
  ["SRS-27.2-ENDPOINTS", "§27.2", "/tickets, /tickets/{id}/checkin, /visitors, /access/verify, /blacklist, /dashboards/kpi, /webhooks/subscribe", "§7.4 E-01…E-47; §7.5 aliases", "TC-API-01; TC-API-02; TC-GAT-07"],
  ["SRS-27.3-RESP", "§27.3", "95th percentile response time ≤ 500 ms for read APIs; ≤ 1.5 s for access-control verification APIs.", "TSA-NFR-002", "TC-PERF-01; TC-GAT-07"],
  ["SRS-27.3-THRU", "§27.3", "Access-verification API shall sustain a minimum of 50 requests/second per gate cluster during peak ingress.", "TSA-NFR-003; §9.4.2", "TC-GAT-07"],
  ["SRS-27.3-IDEMP", "§27.3", "All state-changing POST endpoints shall support idempotency keys to safely handle retries.", "TSA-API-005; §7.2", "TC-API-01; TC-PAY-01"],
  ["SRS-27.3-ERR", "§27.3", "APIs shall return standardized error envelopes with machine-readable error codes and human-readable messages.", "TSA-API-006; §7.3", "TC-SEC-03"],
  ["SRS-27.3-COMPAT", "§27.3", "Non-breaking changes only within a major version; breaking changes require a new version.", "TSA-API-002; TSA-CICD-007", "TC-API-01"],
  ["SRS-27.3-SANDBOX", "§27.3", "A sandbox/UAT environment with representative test data shall be available", "TSA-API-010; TSA-CICD-008", "TC-PAY-05"],
  ["SRS-28.1-FACE", "§28.1", "Real-time identity match callback (≤ 1 second) to the Access Control module; enrolment sync API.", "INT-01; INT-02", "TC-GAT-02; TC-BIO-03"],
  ["SRS-28.1-CCTV", "§28.1", "RTSP/ONVIF video stream access for AI analytics; event/metadata push to SOC module.", "INT-03", "TC-SOC-01"],
  ["SRS-28.1-TURNSTILE", "§28.1", "Bi-directional: credential verification request/response and physical open/deny command.", "INT-04", "TC-GAT-07"],
  ["SRS-28.1-RFID", "§28.1", "Read-event ingestion and credential lifecycle sync (issue, suspend, revoke), including wearable credentials", "INT-05; INT-06; TSA-CRD-006", "TC-CRD-05"],
  ["SRS-28.1-PAYMENT", "§28.1", "Payment initiation, callback/webhook confirmation, refund API, settlement file reconciliation.", "INT-07…INT-10; §10.2; TSA-PAY-007", "TC-PAY-05; TC-PAY-06; TC-PAY-07; TC-PAY-08; TC-PAY-12"],
  ["SRS-28.1-SMS", "§28.1", "Outbound transactional and alert messaging with delivery-status callback.", "INT-11", "TC-NTF-01"],
  ["SRS-28.1-EMAIL", "§28.1", "Transactional email (SMTP/API) with bounce/delivery tracking.", "INT-12", "TC-NTF-01"],
  ["SRS-28.1-ERP", "§28.1", "Native or API-based integration; no duplicate master data with the core platform.", "INT-15", "TC-FIN-01"],
  ["SRS-28.1-MOBILE", "§28.1", "Full REST API coverage plus push-notification service (FCM/APNs).", "INT-13", "TC-NTF-01"],
  ["SRS-28.2-LIFESAFETY", "§28.2", "Life-safety systems … shall retain independent, hard-wired failure-safe operation regardless of software/network status.", "INT-26; §8.5 A10", "TC-SEC-06"],
  ["SRS-28.2-BUFFER", "§28.2", "All integrations shall be resilient to transient network loss with local buffering/replay for at least 30 minutes of data at the edge.", "TSA-EDG-004; §11.3", "TC-EDG-02"],
  ["SRS-28.2-OPEN", "§28.2", "ONVIF, BACnet, Modbus, MQTT, and REST/Webhook standards shall be preferred.", "§10.1", "TC-SOC-01"],
  ["SRS-28.2-SANDBOX", "§28.2", "A sandbox integration environment shall be provided per Section 27.3 to validate each integration prior to production cutover.", "TSA-API-010; §10.1 Sandbox column", "TC-PAY-05"],
  ["SRS-29.2-MDM-PERSON", "§29.2", "Visitor/Member identity shall be governed as a single master record across ticketing, access control, CRM, hospitality, and food/retail ordering", "§5.1; TSA-IDN-004", "TC-REG-02"],
  ["SRS-29.2-MDM-EMP", "§29.2", "Employee identity shall be mastered in HRM and referenced (not duplicated) by attendance, access control, and payroll.", "TSA-IDN-009; TSA-ZON-003", "TC-STF-01"],
  ["SRS-29.2-DQ", "§29.2", "A data-quality rule set (mandatory fields, format validation, de-duplication matching) shall be enforced at the point of ingestion.", "TSA-NFR-025", "TC-REG-01; TC-MIG-01"],
  ["SRS-29.3-PII", "§29.3", "PII fields (NID/passport, biometric templates, health data) shall be encrypted at rest with field-level access controls", "TSA-SEC-022; §8.3", "TC-SEC-03; TC-SEC-07"],
  ["SRS-29.3-BIO", "§29.3", "Biometric templates shall be stored as non-reversible mathematical representations, never as raw images", "TSA-BIO-003", "TC-BIO-01; TC-BIO-03"],
  ["SRS-29.3-RET", "§29.3", "Data retention periods shall be explicitly configurable per domain … with automated purge.", "§5.5", "TC-LOG-01; TC-DSR-01"],
  ["SRS-29.3-LINEAGE", "§29.3", "Data lineage shall be traceable from any BI dashboard figure or AI Copilot answer back to its source system record.", "TSA-NFR-026; TSA-API-009", "TC-E2E-02"],
  ["SRS-29.3-CONSENT", "§29.3", "Consent capture and withdrawal … shall be recorded and enforced at the query layer.", "TSA-IDN-006", "TC-CNS-01"],
  ["SRS-29.4-DW", "§29.4", "A curated data warehouse (or equivalent data-mart layer) shall serve all dashboards", "TSA-DSH-004", "TC-DSH-01"],
  ["SRS-29.4-REFRESH", "§29.4", "Near-real-time refresh (≤ 5 minutes) shall be supported for Command Center dashboards", "TSA-NFR-010", "TC-DSH-01"],
  ["SRS-29.4-COPILOT", "§29.4", "The AI Copilot (FR-BI-002) shall query only the governed, permission-tagged data layer", "TSA-DSH-004", "TC-DSH-01"],
  ["SRS-30.1-ACCESS", "§30.1", "Average gate transaction time ≤ 2 seconds; False rejection rate ≤ 1%; False acceptance rate ≤ 0.1%", "TSA-NFR-007/008; §9.6", "TC-GAT-07; TC-BIO-04"],
  ["SRS-30.1-SECKPI", "§30.1", "Mean time to detect (MTTD) a security incident ≤ 30 seconds; Mean time to first responder dispatch ≤ 3 minutes", "TSA-NFR-009; TSA-SOC-002; §9.6", "TC-SOC-01; TC-SOC-02"],
  ["SRS-30.2-REVENUE", "§30.2", "Daily ticketing revenue reconciliation accuracy 100% match to GL within 24 hours; booking conversion ≥ 60%; renewal ≥ 75%", "TSA-NFR-011…013; §9.6", "TC-FIN-02; TC-DSH-01"],
  ["SRS-30.3-CX", "§30.3", "AI Concierge first-contact resolution rate ≥ 70%; escalation-to-human handoff time ≤ 60 seconds", "TSA-NFR-014", "TC-CXP-01; TC-CXP-02"],
  ["SRS-31.1-GATES", "§31.1", "Each gate requires formal sign-off by the ABG Project Steering Committee before the next stage or payment milestone is released.", "§13.1; §13.5", "TC-SEC-05; TC-PERF-01"],
  ["SRS-31.2-TCK", "§31.2", "100 consecutive test transactions across all ticket types … blacklist test entries are correctly denied every time.", "§13.2", "TC-E2E-01; TC-BLK-01"],
  ["SRS-31.2-FIN", "§31.2", "Daily ticketing revenue reconciles to the General Ledger with zero variance across a 10-business-day test window.", "TSA-FIN-006", "TC-FIN-02"],
  ["SRS-31.2-FNB", "§31.2", "50 consecutive test orders … correct wallet payment, and revenue that reconciles to the vendor settlement record", "TSA-PAY-008", "TC-FNB-01"],
  ["SRS-31.2-CYBER", "§31.2", "MFA, SSO, and encryption controls verified; penetration test closure report accepted", "§8.2; §8.4", "TC-SEC-02; TC-SEC-05"],
  ["SRS-32.1-AVAIL", "§32.1", "Tier 1 … Access Control 99.95% Monthly; Tier 2 … Ticketing … 99.9% Monthly", "§9.1 tier per component; D-10", "TC-DR-01"],
  ["SRS-32.2-SEV", "§32.2", "Critical (S1) … ≤ 15 minutes, 24/7 … ≤ 4 hours", "TSA-NFR-017; A-14; DL-39", "TC-DR-01"],
  ["SRS-32.3-SUPPORT", "§32.3", "Backup verification (restore test) shall be performed and evidenced at least quarterly.", "TSA-DR-007; TSA-NFR-019", "TC-DR-01"],
  ["SRS-32.3-PATCH", "§32.3", "Quarterly security patching cadence at minimum, with emergency patching for actively exploited vulnerabilities within 72 hours of vendor patch release.", "TSA-SEC-040; TSA-NFR-018; D-11", "TC-SEC-08"],
  ["SRS-32.4-RPO", "§32.4", "Tier 1 — Life-Safety & Security ≤ 1 hour ≤ 1 hour; Tier 2 — Core Transactional ≤ 15 minutes ≤ 4 hours", "TSA-DR-001; §11.5", "TC-DR-01"],
  ["SRS-33.1-STD", "§33.1", "ISO/IEC 27001 … ISO/IEC 27701 … SOC 2 Type II … OWASP Top 10 / ASVS … PCI DSS", "§8.1; D-15; TSA-PAY-003", "TC-SEC-05; TC-PAY-09"],
  ["SRS-33.2-IAM", "§33.2", "Multi-Factor Authentication (MFA) shall be enforced for all administrative, financial, and SOC operator accounts.", "TSA-SEC-001…010; §4", "TC-SEC-02"],
  ["SRS-33.3-DP", "§33.3", "Encryption at rest (AES-256 or equivalent) for all databases, file stores, and backups.", "TSA-SEC-020…026", "TC-SEC-03"],
  ["SRS-33.4-APPSEC", "§33.4", "Secure Software Development Lifecycle (SSDLC) including static (SAST) and dynamic (DAST) application security testing", "TSA-SEC-030…034; §12", "TC-SEC-05; TC-SEC-08"],
  ["SRS-33.5-MON", "§33.5", "Immutable audit logs shall be retained for a minimum of 12 months … and protected from tampering.", "TSA-LOG-001; TSA-SEC-035/036; §8.10", "TC-SEC-04"],
  ["SRS-33.6-SUPPLY", "§33.6", "All third-party hardware/software integrations (Section 28) shall undergo a security review prior to production connection.", "TSA-SEC-037; TSA-CICD-002/003/013", "TC-SEC-05; TC-SEC-08"],
  ["SRS-33.7-GOV", "§33.7", "Independent penetration testing shall be conducted at least annually and after any major release", "TSA-SEC-038", "TC-SEC-05"],
  ["SEC-GOV-08", "§33.7 Important Note", "No release, including go-live, shall proceed with an open P1 item.", "TSA-SEC-039; TSA-CICD-005; §13.6", "TC-SEC-05"],
  ["SRS-34.1-MATRIX", "§34.1", "Point-by-point compliance matrix against every FR-ID, US-ID, and UC-ID in this document", "§16 (this RTM); §15.5", "—"],
];

// ---- Build rows ----
const rows = [];
const defaultOther = (prefix) => ({
  cls: "OUT-OF-SCOPE / ROADMAP",
  resp: "Not Compliant",
  req: `Owned by the ${MODULE[prefix] ?? prefix} module specification; not delivered by this subsystem.`,
  design: "—", api: "—", entity: "—", screen: "—", tests: "—", accept: "—",
  method: "Inspection", owner: `${MODULE[prefix] ?? prefix} module owner`, status: "Out of subsystem scope",
});
for (const id of ids.FR) {
  const fr = frs.get(id);
  if (!fr) throw new Error(`FR not found in SRS text: ${id}`);
  const prefix = id.split("-")[1];
  const o = O[id] ?? defaultOther(prefix);
  rows.push({
    _priority: fr.priority,
    req_id: id, source_clause: `SRS ${SECTION[prefix]} (${fr.priority})`, source_quote: quote(fr.text),
    classification: o.cls, response: o.resp, requirement_text: o.req, design_element: o.design,
    api_endpoint: o.api, data_entity: o.entity, screen_id: o.screen, test_case_ids: o.tests,
    acceptance_criteria: o.accept, verification_method: o.method ?? (o.tests && o.tests !== "—" ? "Test" : "Inspection"),
    owner: o.owner, status: o.status ?? (o.resp === "Roadmap" ? "Roadmap (Release B)" : "Baselined v3.0"),
  });
}
for (const [id, text, trace, o] of US) {
  const oo = o ?? { cls: "OUT-OF-SCOPE / ROADMAP", resp: "Not Compliant", tests: "—", screen: "—", api: "—", entity: "—" };
  rows.push({
    _priority: "US",
    req_id: id, source_clause: "SRS §23 (User story)", source_quote: quote(text),
    classification: oo.cls, response: oo.resp,
    requirement_text: oo.req ?? (o ? `Satisfied through ${trace}.` : `Traces to ${trace}; owned by another module.`),
    design_element: o ? `See ${trace}` : "—", api_endpoint: oo.api, data_entity: oo.entity, screen_id: oo.screen,
    test_case_ids: oo.tests, acceptance_criteria: o ? "Story demonstrable end to end in UAT" : "—",
    verification_method: o ? "Demonstration" : "Inspection", owner: o ? "Ticket Administrator" : "Owning module",
    status: o ? "Baselined v3.0" : "Out of subsystem scope",
  });
}
for (const [id, title, o] of UC) {
  const oo = o ?? { cls: "OUT-OF-SCOPE / ROADMAP", resp: "Not Compliant", tests: "—", screen: "—", api: "—", entity: "—" };
  rows.push({
    _priority: "UC",
    req_id: id, source_clause: "SRS §24 (Use case)", source_quote: quote(`${id} — ${title}`),
    classification: oo.cls, response: oo.resp,
    requirement_text: oo.req ?? "Owned by another module; TSA touchpoints (if any) listed in §13.3.",
    design_element: o ? "§10.3 / §10.4 sequences" : "—", api_endpoint: oo.api, data_entity: oo.entity, screen_id: oo.screen,
    test_case_ids: oo.tests, acceptance_criteria: o ? "Main and all alternate/exception flows pass in PoC and UAT" : "—",
    verification_method: o ? "Test" : "Inspection", owner: o ? "Ticket Administrator" : "Owning module",
    status: o ? "Baselined v3.0" : "Out of subsystem scope",
  });
}
for (const [id, sec, q, design, tests] of SHALL) {
  rows.push({
    _priority: "SHALL",
    req_id: id, source_clause: `SRS ${sec} (SHALL)`, source_quote: quote(q),
    classification: "SRS-SHALL", response: id === "SRS-34.1-MATRIX" ? "Comply" : "Comply with Customization",
    requirement_text: `Implemented by ${design}.`, design_element: design, api_endpoint: "—", data_entity: "—", screen_id: "—",
    test_case_ids: tests, acceptance_criteria: "Per referenced test(s)",
    verification_method: tests === "—" ? "Inspection" : "Test", owner: "Vendor SA / ABG PO", status: "Baselined v3.0",
  });
}

// ---- Validation ----
const read = (f) => readFileSync(join(specDir, f), "utf8");
const catalogue = read("13-14-acceptance-review.md");
const knownTests = new Set([...catalogue.matchAll(/^\| (TC-[A-Z0-9]+-\d+) \| [FISPRAD] \|/gm)].map((m) => m[1]));
const errors = [];
for (const r of rows) {
  if (!RESPONSES.has(r.response)) errors.push(`${r.req_id}: bad response ${r.response}`);
  if (!CLASSES.has(r.classification)) errors.push(`${r.req_id}: bad classification ${r.classification}`);
  if (r.source_quote.replace(" …", "").split(" ").length > 25) errors.push(`${r.req_id}: quote > 25 words`);
  for (const t of r.test_case_ids.split(";").map((s) => s.trim()).filter((s) => s.startsWith("TC-"))) {
    if (!knownTests.has(t)) errors.push(`${r.req_id}: unknown test ${t}`);
  }
  if (r._priority === "Must" && r.classification === "OUT-OF-SCOPE / ROADMAP" && O[r.req_id]) {
    errors.push(`${r.req_id}: Must-priority row in this subsystem's scope marked roadmap`);
  }
}
const frCount = rows.filter((r) => r.req_id.startsWith("FR-")).length;
if (frCount !== ids.FR.length) errors.push(`FR coverage ${frCount} != ${ids.FR.length}`);
// IDs that occur in the SRS text without a definition; listed in §16 and §18 instead of being traced.
const UNDEFINED_IDS = {
  "UC-SEC-02": "Appears only as an example in \"How Vendors Should Use This Document\"; no such use case is defined in §24 (OQ-07).",
};
const srsUs = [...new Set(srs.match(/\bUS-\d{2}\b/g))].filter((x) => !UNDEFINED_IDS[x]).sort();
const srsUc = [...new Set(srs.match(/\bUC-[A-Z]+-\d{2}\b/g))].filter((x) => !UNDEFINED_IDS[x]).sort();
const sameSet = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
if (!sameSet(srsUs, US.map((u) => u[0]).sort())) errors.push(`US set mismatch: SRS has ${srsUs.join(",")}`);
if (!sameSet(srsUc, UC.map((u) => u[0]).sort())) errors.push(`UC set mismatch: SRS has ${srsUc.join(",")}`);

// Every test ID cited anywhere in the spec must exist in the §13 catalogue.
for (const f of readdirSync(specDir).filter((n) => /^\d.*\.md$/.test(n) && n !== "16-rtm.md")) {
  for (const m of read(f).matchAll(/\bTC-[A-Z0-9]+-\d+\b/g)) {
    if (!knownTests.has(m[0])) errors.push(`${f}: cites unknown test ${m[0]}`);
  }
}
// Stated counts must match the tables they describe.
const statedTests = catalogue.match(/The catalogue contains \*\*(\d+)\*\* test cases/);
if (!statedTests || Number(statedTests[1]) !== knownTests.size) errors.push(`§13 stated test count ${statedTests?.[1]} != ${knownTests.size}`);
const delivery = read("15-delivery-roadmap.md");
const dlRows = new Set([...delivery.matchAll(/^\| (DL-\d+) \|/gm)].map((m) => m[1])).size;
const statedDl = delivery.match(/There are \*\*(\d+) deliverables\*\*/);
if (!statedDl || Number(statedDl[1]) !== dlRows) errors.push(`§15 stated deliverables ${statedDl?.[1]} != ${dlRows}`);
const roadmapFr = rows.filter((r) => r.req_id.startsWith("FR-") && r.response === "Roadmap").length;
const statedRoadmap = delivery.match(/That is (\d+) FRs, matching the (\d+) "Roadmap" responses/);
if (!statedRoadmap || Number(statedRoadmap[1]) !== roadmapFr || Number(statedRoadmap[2]) !== roadmapFr) errors.push(`§15 roadmap FR count ${statedRoadmap?.[1]} != ${roadmapFr}`);
for (const f of readdirSync(specDir).filter((n) => /^\d.*\.md$/.test(n))) {
  if (/\b92 test cases\b|all 92\b/.test(read(f))) errors.push(`${f}: stale test count 92`);
}

const forbidden = /(\bfilecite\b|\bturn\d+search\d+\b|【|】|[\uE000-\uF8FF])/u;
const citeToken = /\bcite(turn|:)\b/;
for (const f of readdirSync(specDir).filter((n) => n.endsWith(".md"))) {
  const body = read(f);
  if (forbidden.test(body) || citeToken.test(body)) errors.push(`${f}: forbidden token or private-use character`);
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }

// ---- Emit CSV ----
const csvCell = (v) => (/[",\r\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
writeFileSync(join(here, "rtm.csv"), "\uFEFF" + [COLS.join(","), ...rows.map((r) => COLS.map((c) => csvCell(r[c] ?? "")).join(","))].join("\r\n") + "\r\n");

// ---- Emit Markdown ----
const count = (pred) => rows.filter(pred).length;
const group = (prefix) => rows.filter((r) => r.req_id.startsWith(prefix));
const byCls = (list) => [...CLASSES].map((c) => `${c}: ${list.filter((r) => r.classification === c).length}`).join("; ");
const byResp = (list) => [...RESPONSES].map((c) => `${c}: ${list.filter((r) => r.response === c).length}`).join("; ");
const frRows = group("FR-"), usRows = group("US-"), ucRows = group("UC-");
const shallRows = rows.filter((r) => r._priority === "SHALL");
const mustFr = frRows.filter((r) => r._priority === "Must");
const mustInScope = mustFr.filter((r) => r.classification !== "OUT-OF-SCOPE / ROADMAP");
const md = (v) => String(v).replace(/\|/g, "\\|");
const usedTests = new Set(rows.flatMap((r) => r.test_case_ids.split(";").map((s) => s.trim()).filter((s) => s.startsWith("TC-"))));
const unusedTests = [...knownTests].filter((t) => !usedTests.has(t));
const traced = (list) => list.filter((r) => r.response && r.classification && r.source_quote).length;
const coverage = `${traced(frRows)} of ${ids.FR.length} FR-IDs, ${traced(usRows)} of ${srsUs.length} US-IDs, ${traced(ucRows)} of ${srsUc.length} UC-IDs traced`;

const out = [];
out.push("# 16. Requirements Traceability Matrix (RTM)");
out.push("");
out.push("This file is generated by `rtm/build-rtm.mjs` from `docs/source/srs-full.txt` and `docs/source/srs-ids.json`. **Do not edit it by hand**: edit the overlays in the script and re-run. The CSV is `rtm/rtm.csv` (UTF-8 with BOM, CRLF).");
out.push("");
out.push("**How to read the response column.** It uses only the five SRS response values. For rows owned by another SSCOS module, \"Not Compliant\" means *not delivered by this ticketing subsystem*; the platform-level response is in the owning module's specification. Source quotes are verbatim from the SRS text, cut at 25 words (\"…\" marks a cut). The priority in `source_clause` is parsed from the SRS text, not re-typed.");
out.push("");
out.push("## 16.1 Coverage counts");
out.push("");
out.push("| Set | Rows | Expected | Covered |");
out.push("|---|---|---|---|");
out.push(`| FR IDs (SRS §4–§22A) | ${frRows.length} | ${ids.FR.length} | ${frRows.length === ids.FR.length ? "100 %" : "GAP"} |`);
out.push(`| US IDs (SRS §23) | ${usRows.length} | ${srsUs.length} | ${usRows.length === srsUs.length ? "100 %" : "GAP"} |`);
out.push(`| UC IDs (SRS §24) | ${ucRows.length} | ${srsUc.length} | ${ucRows.length === srsUc.length ? "100 %" : "GAP"} |`);
out.push(`| SHALL obligations (SRS §2, §3, §26–§34, SEC-GOV-08) | ${shallRows.length} | ${SHALL.length} | 100 % |`);
out.push(`| **Total rows** | **${rows.length}** | ${ids.FR.length + srsUs.length + srsUc.length + SHALL.length} | — |`);
out.push("");
out.push(`- FR priority split (parsed): Must ${count((r) => r.req_id.startsWith("FR-") && r._priority === "Must")}, Should ${count((r) => r.req_id.startsWith("FR-") && r._priority === "Should")}, Could ${count((r) => r.req_id.startsWith("FR-") && r._priority === "Could")}.`);
out.push(`- FR by classification: ${byCls(frRows)}.`);
out.push(`- FR by response: ${byResp(frRows)}.`);
out.push(`- US by classification: ${byCls(usRows)}.`);
out.push(`- UC by classification: ${byCls(ucRows)}.`);
out.push(`- Must-priority FRs built or interfaced by this subsystem: ${mustInScope.length} of ${mustFr.length}. Every one has a design element, an API or explicit interface, an entity, a screen (or "—" for headless interfaces) and at least one test. The other ${mustFr.length - mustInScope.length} Must FRs belong to other SSCOS modules.`);
out.push(`- Test cases in the §13 catalogue: ${knownTests.size}; referenced by the RTM: ${usedTests.size}; not referenced: ${unusedTests.length ? unusedTests.join(", ") : "none"}.`);
for (const [id, why] of Object.entries(UNDEFINED_IDS)) out.push(`- Not traced: \`${id}\`. ${why}`);
out.push("");
out.push("## 16.2 Matrix");
out.push("");
out.push("| " + COLS.join(" | ") + " |");
out.push("|" + COLS.map(() => "---").join("|") + "|");
for (const r of rows) out.push("| " + COLS.map((c) => md(r[c] ?? "")).join(" | ") + " |");
out.push("");
out.push(`**${coverage}.**`);
out.push("");
writeFileSync(join(specDir, "16-rtm.md"), out.join("\n"));

console.log(JSON.stringify({
  rows: rows.length, fr: frRows.length, us: usRows.length, uc: ucRows.length, shall: shallRows.length,
  frByClass: byCls(frRows), frByResp: byResp(frRows), mustInScope: `${mustInScope.length}/${mustFr.length}`,
  tests: knownTests.size, unusedTests, deliverables: dlRows, roadmapFr, coverage,
}, null, 2));
