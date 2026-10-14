export type FieldKind = "text" | "number" | "date" | "time" | "select" | "textarea" | "stamp";
export type DeskWorkflow = "module" | "attendance" | "approval";

export interface DeskField {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  options?: string[];
  list?: boolean;
  money?: boolean;
}

export interface FeatureForm {
  blurb: string;
  titleKey: string;
  partyKey: string;
  amountKey?: string;
  workflow: DeskWorkflow;
  fields: DeskField[];
}

function text(key: string, label: string, required = true): DeskField {
  return { key, label, kind: "text", required, list: true };
}
function num(key: string, label: string, required = true): DeskField {
  return { key, label, kind: "number", required, list: true };
}
function money(key: string, label: string, required = true): DeskField {
  return { key, label, kind: "number", required, list: true, money: true };
}
function date(key: string, label: string, required = true): DeskField {
  return { key, label, kind: "date", required, list: true };
}
function time(key: string, label: string, required = true): DeskField {
  return { key, label, kind: "time", required, list: true };
}
function choice(key: string, label: string, options: string[], required = true): DeskField {
  return { key, label, kind: "select", options, required, list: true };
}
function note(): DeskField {
  return { key: "notes", label: "Notes", kind: "textarea", list: false };
}
function stamp(key: "checkInAt" | "checkOutAt", label: string): DeskField {
  return { key, label, kind: "stamp", list: true };
}

function form(
  blurb: string,
  titleKey: string,
  partyKey: string,
  fields: DeskField[],
  extra?: { workflow?: DeskWorkflow; amountKey?: string },
): FeatureForm {
  return {
    blurb,
    titleKey,
    partyKey,
    fields,
    workflow: extra?.workflow ?? "module",
    amountKey: extra?.amountKey,
  };
}

const MARKS = ["Present", "Absent", "Late", "On leave"];
const LEAVE = ["Annual", "Sick", "Casual", "Unpaid"];
const ACCOUNT = ["Asset", "Liability", "Equity", "Income", "Expense"];
const CHANNELS = ["App", "SMS", "Email", "Box office"];

export const FEATURE_FORMS: Record<string, FeatureForm> = {
  "ticket-setup": form("Create the match or event this ticket catalogue sells.", "event", "venue", [
    text("event", "Event"), text("venue", "Venue"), date("doors", "Doors"), time("starts", "Start time"), num("capacity", "Capacity"), money("priceBdt", "Base price (BDT)"),
  ], { amountKey: "priceBdt" }),
  "stadium-layout": form("Name the layout and how many stands it contains.", "layout", "venue", [
    text("layout", "Layout"), text("venue", "Venue"), num("stands", "Stands"), num("capacity", "Capacity"), note(),
  ]),
  "seat-mapping": form("Map one seat to its section, row, and gate.", "event", "seat", [
    text("event", "Event"), text("section", "Section"), text("row", "Row"), text("seat", "Seat"), text("gate", "Gate"),
  ]),
  "stand-management": form("Add or update a stand and the gate that serves it.", "stand", "venue", [
    text("stand", "Stand"), text("venue", "Venue"), num("capacity", "Capacity"), text("gate", "Gate"),
  ]),
  "block-management": form("Split a stand into blocks with a row count.", "block", "stand", [
    text("block", "Block"), text("stand", "Stand"), num("rows", "Rows"), num("seatsPerRow", "Seats per row"),
  ]),
  "row-management": form("Set the seats in one row, including accessible seats.", "row", "block", [
    text("row", "Row"), text("block", "Block"), num("seats", "Seats"), num("accessible", "Accessible seats"),
  ]),
  "seat-allocation": form("Allocate a seat to a holder and a ticket class.", "event", "holder", [
    text("event", "Event"), text("holder", "Holder"), text("section", "Section"), text("seat", "Seat"),
    choice("allocation", "Allocation", ["Public", "VIP", "VVIP", "Sponsor", "Federation", "Complimentary"]),
  ]),
  "general-admission": form("Sell a general-admission ticket to a named buyer.", "event", "buyer", [
    text("event", "Event"), text("buyer", "Buyer"), text("mobile", "Mobile"), num("quantity", "Quantity"), money("priceBdt", "Price (BDT)"),
  ], { amountKey: "priceBdt" }),
  "vip-ticketing": form("Issue a VIP ticket against a named guest and box.", "event", "guest", [
    text("event", "Event"), text("guest", "Guest"), text("mobile", "Mobile"), text("box", "Box"), money("priceBdt", "Price (BDT)"),
  ], { amountKey: "priceBdt" }),
  "vvip-ticketing": form("Issue a VVIP ticket against a suite and a host.", "event", "guest", [
    text("event", "Event"), text("guest", "Guest"), text("mobile", "Mobile"), text("suite", "Suite"), text("host", "Host"),
  ]),
  "hospitality-ticket": form("Book a hospitality package for a guest.", "event", "guest", [
    text("event", "Event"), text("guest", "Guest"), text("packageName", "Package"), num("guests", "Guests"), money("priceBdt", "Price (BDT)"),
  ], { amountKey: "priceBdt" }),
  "season-pass": form("Issue a season pass to a holder and a seat.", "holder", "season", [
    text("holder", "Holder"), text("mobile", "Mobile"), text("season", "Season"), text("seat", "Seat"), money("priceBdt", "Price (BDT)"),
  ], { amountKey: "priceBdt" }),
  "sponsor-ticket-allocation": form("Allocate a block of tickets to a sponsor.", "sponsor", "event", [
    text("sponsor", "Sponsor"), text("event", "Event"), num("allocation", "Tickets"), text("contact", "Contact"),
  ]),
  "federation-ticket-allocation": form("Allocate a block of tickets to a federation.", "federation", "event", [
    text("federation", "Federation"), text("event", "Event"), num("allocation", "Tickets"), text("contact", "Contact"),
  ]),
  "complimentary-ticket": form("Issue a complimentary seat and record who approved it.", "event", "recipient", [
    text("event", "Event"), text("recipient", "Recipient"), text("reason", "Reason"), text("seat", "Seat"), text("approvedBy", "Approved by"),
  ]),
  "digital-ticket": form("Send a digital ticket to a holder on one channel.", "event", "holder", [
    text("event", "Event"), text("holder", "Holder"), text("mobile", "Mobile"), choice("channel", "Channel", CHANNELS),
  ]),
  "qr-ticket": form("Record the holder and gate for a QR ticket.", "event", "holder", [
    text("event", "Event"), text("holder", "Holder"), text("mobile", "Mobile"), text("gate", "Gate"),
  ]),
  "nfc-ticket": form("Record the holder and device for an NFC ticket.", "event", "holder", [
    text("event", "Event"), text("holder", "Holder"), text("mobile", "Mobile"), text("device", "Device"),
  ]),
  "ticket-pricing": form("Set the VAT-exclusive price for one section. VAT is 15% pending Finance and Legal.", "event", "section", [
    text("event", "Event"), text("section", "Section"), money("priceBdt", "Price (BDT, VAT exclusive)"), text("vat", "VAT note", false),
  ], { amountKey: "priceBdt" }),
  "promo-code": form("Create a promo code with a discount and an end date.", "code", "event", [
    text("code", "Code"), text("event", "Event"), num("discountPercent", "Discount %"), date("validUntil", "Valid until"), num("usageLimit", "Usage limit"),
  ]),
  "ticket-transfer": form("Move a ticket from one holder to another.", "reference", "toHolder", [
    text("reference", "Order reference"), text("fromHolder", "From"), text("toHolder", "To"), text("toMobile", "To mobile"),
  ]),
  "refund-management": form("Raise a refund case. Approving a live ticket refund still happens in the queue below.", "reference", "customer", [
    text("reference", "Order reference"), text("customer", "Customer"), money("amountBdt", "Amount (BDT)"), text("reason", "Reason"),
  ], { amountKey: "amountBdt" }),
  "cancellation-management": form("Record a cancellation request against an order.", "reference", "customer", [
    text("reference", "Order reference"), text("customer", "Customer"), text("reason", "Reason"), date("requested", "Requested"),
  ]),
  "entry-validation": form("Log a manual entry review. The scanner below is the live gate decision.", "gate", "result", [
    text("gate", "Gate"), choice("direction", "Direction", ["IN", "OUT"]), choice("result", "Result", ["ALLOW", "DENY"]), text("note", "Officer note", false),
  ]),
  "occupancy-dashboard": form("Save a section snapshot. The charts below stay on live ticket sales.", "event", "section", [
    text("event", "Event"), text("section", "Section"), num("sold", "Sold"), num("capacity", "Capacity"),
  ]),

  "chart-of-accounts": form("Add an account. This is the chart, not a posted journal.", "account", "code", [
    text("code", "Code"), text("account", "Account"), choice("type", "Type", ACCOUNT), text("parent", "Parent account", false),
  ]),
  "budget-management": form("Set a budget for a department and a period.", "budget", "department", [
    text("budget", "Budget"), text("department", "Department"), text("period", "Period"), money("amountBdt", "Amount (BDT)"), note(),
  ], { amountKey: "amountBdt" }),
  "fund-management": form("Record a fund and where the money comes from.", "fund", "source", [
    text("fund", "Fund"), text("source", "Source"), text("period", "Period"), money("amountBdt", "Amount (BDT)"),
  ], { amountKey: "amountBdt" }),
  "financial-approval": form("Submit an amount for approval. Approve or reject it from the list.", "request", "requester", [
    text("request", "Request"), text("requester", "Requester"), money("amountBdt", "Amount (BDT)"), text("purpose", "Purpose"),
  ], { workflow: "approval", amountKey: "amountBdt" }),
  "revenue-management": form("Record revenue by source and period.", "source", "description", [
    text("source", "Source"), text("description", "Description"), text("period", "Period"), money("amountBdt", "Amount (BDT)"),
  ], { amountKey: "amountBdt" }),
  "event-revenue": form("Record revenue earned by one event.", "event", "source", [
    text("event", "Event"), text("source", "Source"), text("period", "Period"), money("amountBdt", "Amount (BDT)"),
  ], { amountKey: "amountBdt" }),
  "ticket-revenue": form("Record ticket revenue for an event and a channel.", "event", "channel", [
    text("event", "Event"), choice("channel", "Channel", CHANNELS), text("period", "Period"), money("amountBdt", "Amount (BDT)"),
  ], { amountKey: "amountBdt" }),
  "membership-revenue": form("Record membership revenue for a tier.", "tier", "member", [
    text("tier", "Tier"), text("member", "Member"), text("period", "Period"), money("amountBdt", "Amount (BDT)"),
  ], { amountKey: "amountBdt" }),
  "sponsorship-revenue": form("Record sponsorship revenue against a package.", "sponsor", "packageName", [
    text("sponsor", "Sponsor"), text("packageName", "Package"), text("period", "Period"), money("amountBdt", "Amount (BDT)"),
  ], { amountKey: "amountBdt" }),
  "rental-revenue": form("Record rent for a facility and a tenant.", "facility", "tenant", [
    text("facility", "Facility"), text("tenant", "Tenant"), text("period", "Period"), money("amountBdt", "Amount (BDT)"),
  ], { amountKey: "amountBdt" }),
  "expense-management": form("Record an expense against a payee and a category.", "payee", "category", [
    text("payee", "Payee"), text("category", "Category"), date("spentOn", "Date"), money("amountBdt", "Amount (BDT)"), note(),
  ], { amountKey: "amountBdt" }),
  "invoice-management": form("Register an invoice, who it is for, and when it is due.", "invoice", "party", [
    text("invoice", "Invoice"), text("party", "Party"), date("due", "Due"), money("amountBdt", "Amount (BDT)"),
  ], { amountKey: "amountBdt" }),
  "payment-tracking": form("Record a payment, the method, and the date it was made.", "payment", "party", [
    text("payment", "Payment"), text("party", "Party"), choice("method", "Method", ["Bank", "Cash", "Card", "Sandbox"]), date("paidOn", "Paid on"), money("amountBdt", "Amount (BDT)"),
  ], { amountKey: "amountBdt" }),
  "receivable-management": form("Track what a customer still owes.", "customer", "invoice", [
    text("customer", "Customer"), text("invoice", "Invoice"), date("due", "Due"), money("amountBdt", "Amount (BDT)"),
  ], { amountKey: "amountBdt" }),
  "payable-management": form("Track a vendor bill that is still unpaid.", "vendor", "bill", [
    text("vendor", "Vendor"), text("bill", "Bill"), date("due", "Due"), money("amountBdt", "Amount (BDT)"),
  ], { amountKey: "amountBdt" }),
  "tax-management": form("Record tax for a period. VAT 15% is the baseline and is pending Finance and Legal.", "taxType", "period", [
    text("taxType", "Tax"), text("period", "Period"), money("taxableBdt", "Taxable (BDT)"), money("taxBdt", "Tax (BDT)"),
  ], { amountKey: "taxBdt" }),
  "financial-reports": form("File a prepared finance report for a period.", "report", "preparedBy", [
    text("report", "Report"), text("period", "Period"), text("preparedBy", "Prepared by"), note(),
  ]),
  "profitability-analysis": form("Compare revenue and cost for one unit and period.", "unit", "period", [
    text("unit", "Unit"), text("period", "Period"), money("revenueBdt", "Revenue (BDT)"), money("costBdt", "Cost (BDT)"),
  ], { amountKey: "revenueBdt" }),

  "purchase-request": form("Ask for an item, a quantity, and the date it is needed.", "item", "requester", [
    text("item", "Item"), text("requester", "Requester"), num("quantity", "Quantity"), date("neededBy", "Needed by"), money("estimateBdt", "Estimate (BDT)", false),
  ], { amountKey: "estimateBdt" }),
  "approval-workflow": form("Send a request to an approver. Approve or reject it from the list.", "request", "approver", [
    text("request", "Request"), text("approver", "Approver"), text("step", "Step"), text("comments", "Comments", false),
  ], { workflow: "approval" }),
  "purchase-approval": form("Put a purchase in front of an approver.", "request", "approver", [
    text("request", "Request"), text("approver", "Approver"), money("amountBdt", "Amount (BDT)"), text("note", "Note", false),
  ], { workflow: "approval", amountKey: "amountBdt" }),
  "emergency-purchase": form("Record an emergency buy, the vendor, and why it could not wait.", "item", "vendor", [
    text("item", "Item"), text("vendor", "Vendor"), num("quantity", "Quantity"), text("reason", "Reason"), money("amountBdt", "Amount (BDT)"),
  ], { amountKey: "amountBdt" }),
  "vendor-quotation": form("Store a vendor quote and the date it expires.", "vendor", "item", [
    text("vendor", "Vendor"), text("item", "Item"), money("quotedBdt", "Quoted (BDT)"), date("validUntil", "Valid until"),
  ], { amountKey: "quotedBdt" }),
  "rfq-management": form("Open a request for quotation.", "rfq", "vendor", [
    text("rfq", "RFQ"), text("vendor", "Vendor"), text("item", "Item"), date("closes", "Closes"),
  ]),
  "tender-management": form("Open a tender and its closing date.", "tender", "vendor", [
    text("tender", "Tender"), text("vendor", "Vendor"), date("closes", "Closes"), money("estimateBdt", "Estimate (BDT)", false),
  ], { amountKey: "estimateBdt" }),
  "supplier-selection": form("Record which supplier was chosen and why.", "supplier", "item", [
    text("supplier", "Supplier"), text("item", "Item"), num("score", "Score"), text("reason", "Reason"),
  ]),
  "contract-purchase": form("Record a purchase made under a contract.", "contract", "supplier", [
    text("contract", "Contract"), text("supplier", "Supplier"), text("item", "Item"), money("amountBdt", "Amount (BDT)"), date("ends", "Ends"),
  ], { amountKey: "amountBdt" }),
  "purchase-order": form("Raise a purchase order for a supplier.", "order", "supplier", [
    text("order", "Purchase order"), text("supplier", "Supplier"), text("item", "Item"), num("quantity", "Quantity"), money("amountBdt", "Amount (BDT)"),
  ], { amountKey: "amountBdt" }),
  "procurement-budget": form("Set the procurement budget for a department.", "budget", "department", [
    text("budget", "Budget"), text("department", "Department"), text("period", "Period"), money("amountBdt", "Amount (BDT)"),
  ], { amountKey: "amountBdt" }),
  "delivery-tracking": form("Track a delivery against a purchase order.", "order", "supplier", [
    text("order", "Purchase order"), text("supplier", "Supplier"), date("expected", "Expected"), text("location", "Location"),
  ]),
  "invoice-matching": form("Match a supplier invoice to a purchase order.", "invoice", "supplier", [
    text("invoice", "Invoice"), text("order", "Purchase order"), text("supplier", "Supplier"), money("amountBdt", "Amount (BDT)"),
  ], { amountKey: "amountBdt" }),
  "procurement-reports": form("File a procurement report for a period.", "report", "preparedBy", [
    text("report", "Report"), text("period", "Period"), text("preparedBy", "Prepared by"), note(),
  ]),
  "cost-analysis": form("Compare unit cost and quantity for an item.", "item", "supplier", [
    text("item", "Item"), text("supplier", "Supplier"), money("unitCostBdt", "Unit cost (BDT)"), num("quantity", "Quantity"),
  ], { amountKey: "unitCostBdt" }),
  "warehouse-setup": form("Add a warehouse, where it sits, and who manages it.", "warehouse", "location", [
    text("warehouse", "Warehouse"), text("location", "Location"), text("manager", "Manager"), num("capacity", "Capacity"),
  ]),
  "store-management": form("Add a store inside a warehouse.", "store", "warehouse", [
    text("store", "Store"), text("warehouse", "Warehouse"), text("keeper", "Keeper"), text("location", "Location"),
  ]),
  "item-master": form("Add an item, its unit, and the level that should trigger a reorder.", "item", "category", [
    text("item", "Item"), text("category", "Category"), text("unit", "Unit"), num("reorderLevel", "Reorder level"),
  ]),
  "inventory-category": form("Add a stock category.", "category", "category", [
    text("category", "Category"), text("parent", "Parent", false), text("description", "Description", false),
  ]),
  "stock-receipt": form("Receive stock into a warehouse.", "item", "supplier", [
    text("item", "Item"), text("supplier", "Supplier"), num("quantity", "Quantity"), text("warehouse", "Warehouse"), date("received", "Received"),
  ]),
  "stock-issue": form("Issue stock to a person or a team.", "item", "issuedTo", [
    text("item", "Item"), text("issuedTo", "Issued to"), num("quantity", "Quantity"), text("store", "Store"), date("issued", "Issued"),
  ]),
  "stock-transfer": form("Move stock from one store to another.", "item", "fromStore", [
    text("item", "Item"), text("fromStore", "From store"), text("toStore", "To store"), num("quantity", "Quantity"),
  ]),
  "stock-adjustment": form("Correct the quantity on hand and say why.", "item", "store", [
    text("item", "Item"), text("store", "Store"), num("quantityChange", "Quantity change"), text("reason", "Reason"),
  ]),
  "barcode-management": form("Attach a barcode to an item in a store.", "item", "barcode", [
    text("item", "Item"), text("barcode", "Barcode"), text("store", "Store"),
  ]),
  "rfid-inventory": form("Attach an RFID tag to an item.", "item", "tag", [
    text("item", "Item"), text("tag", "Tag"), text("store", "Store"),
  ]),
  "batch-tracking": form("Receive a batch and the date it arrived.", "item", "batch", [
    text("item", "Item"), text("batch", "Batch"), num("quantity", "Quantity"), date("received", "Received"),
  ]),
  "expiry-tracking": form("Track a batch and the date it expires.", "item", "batch", [
    text("item", "Item"), text("batch", "Batch"), date("expires", "Expires"), num("quantity", "Quantity"),
  ]),
  "consumable-management": form("Record consumable stock and its unit.", "item", "store", [
    text("item", "Item"), text("store", "Store"), num("quantity", "Quantity"), text("unit", "Unit"),
  ]),
  "equipment-stock": form("Record equipment on hand and its condition.", "item", "store", [
    text("item", "Item"), text("store", "Store"), num("quantity", "Quantity"), choice("condition", "Condition", ["Good", "Fair", "Needs repair"]),
  ]),
  "spare-parts-inventory": form("Record a spare part against the equipment it fits.", "part", "equipment", [
    text("part", "Part"), text("equipment", "Equipment"), num("quantity", "Quantity"), text("store", "Store"),
  ]),
  "minimum-stock-level": form("Set the minimum and record what is on hand.", "item", "store", [
    text("item", "Item"), text("store", "Store"), num("minimum", "Minimum"), num("onHand", "On hand"),
  ]),
  "stock-forecasting": form("Save a forecast quantity for an item and a period.", "item", "period", [
    text("item", "Item"), text("period", "Period"), num("forecast", "Forecast quantity"), text("basis", "Basis"),
  ]),
  "inventory-reports": form("File an inventory report for a store and a period.", "report", "store", [
    text("report", "Report"), text("store", "Store"), text("period", "Period"), text("preparedBy", "Prepared by"),
  ]),

  "employee-master": form("Add an employee, their department, and the day they joined.", "employee", "department", [
    text("employee", "Employee"), text("department", "Department"), text("position", "Position"), text("phone", "Phone"), date("joined", "Joined"),
  ]),
  "staff-profile": form("Keep a staff profile and an emergency contact.", "employee", "department", [
    text("employee", "Employee"), text("department", "Department"), text("phone", "Phone"), text("emergencyContact", "Emergency contact"),
  ]),
  "department-management": form("Add a department and who leads it.", "department", "head", [
    text("department", "Department"), text("head", "Head"), text("location", "Location"),
  ]),
  "job-position-setup": form("Define a position, its grade, and how many seats are open.", "position", "department", [
    text("position", "Position"), text("department", "Department"), text("grade", "Grade"), num("openings", "Openings"),
  ]),
  "staff-document-management": form("File a staff document and the date it expires.", "employee", "document", [
    text("employee", "Employee"), text("document", "Document"), text("reference", "Reference"), date("expires", "Expires", false),
  ]),
  "recruitment-management": form("Track a candidate and the stage they are in.", "candidate", "role", [
    text("candidate", "Candidate"), text("role", "Role"), choice("stage", "Stage", ["Applied", "Interview", "Offer", "Hired"]), text("phone", "Phone"),
  ]),
  "employee-onboarding": form("Start onboarding for a new employee.", "employee", "department", [
    text("employee", "Employee"), text("department", "Department"), date("start", "Start"), text("buddy", "Buddy"),
  ]),
  "attendance-management": form("Mark attendance, then check the person in and out. The list keeps both times.", "employee", "shift", [
    text("employee", "Employee"), date("workDate", "Date"), text("shift", "Shift"), choice("mark", "Mark", MARKS),
    stamp("checkInAt", "Check-in time"), stamp("checkOutAt", "Check-out time"),
  ], { workflow: "attendance" }),
  "attendance-tracking": form("Track who is on a post. Check in and check out stamp the list.", "employee", "post", [
    text("employee", "Employee"), date("workDate", "Date"), text("post", "Post"),
    stamp("checkInAt", "Check-in time"), stamp("checkOutAt", "Check-out time"),
  ], { workflow: "attendance" }),
  "check-in-check-out": form("Add the person and their post, then use Check in and Check out. The list shows both times.", "employee", "post", [
    text("employee", "Employee"), text("post", "Post"),
    stamp("checkInAt", "Check-in time"), stamp("checkOutAt", "Check-out time"),
  ], { workflow: "attendance" }),
  "leave-management": form("Request leave. Approve or reject it from the list.", "employee", "leaveType", [
    text("employee", "Employee"), choice("leaveType", "Leave type", LEAVE), date("from", "From"), date("to", "To"), text("reason", "Reason"),
  ], { workflow: "approval" }),
  "payroll-integration": form("Record the gross figure passed to payroll for one period. This is not a payroll run.", "employee", "period", [
    text("employee", "Employee"), text("period", "Period"), money("grossBdt", "Gross (BDT)"), note(),
  ], { amountKey: "grossBdt" }),
  "workforce-planning": form("Plan headcount for a department and a period.", "plan", "department", [
    text("plan", "Plan"), text("department", "Department"), num("headcount", "Headcount"), text("period", "Period"),
  ]),
  "event-workforce-planning": form("Plan how many people a department needs for an event.", "event", "department", [
    text("event", "Event"), text("department", "Department"), num("headcount", "Headcount"), date("eventDate", "Date"),
  ]),
  "shift-scheduling": form("Schedule a shift with a start and an end.", "employee", "shift", [
    text("employee", "Employee"), text("shift", "Shift"), date("workDate", "Date"), time("starts", "Start time"), time("ends", "End time"),
  ]),
  "duty-roster": form("Place a person on a duty, a date, and a location.", "employee", "duty", [
    text("employee", "Employee"), text("duty", "Duty"), date("workDate", "Date"), text("location", "Location"),
  ]),
  "staff-allocation": form("Allocate a person to an event role.", "employee", "event", [
    text("employee", "Employee"), text("event", "Event"), text("role", "Role"), text("location", "Location"),
  ]),
  "task-assignment": form("Assign a task, a due date, and a priority.", "task", "assignee", [
    text("task", "Task"), text("assignee", "Assignee"), date("due", "Due"), choice("priority", "Priority", ["Low", "Normal", "High"]),
  ]),
  "contractor-management": form("Register a contractor and the date their pass ends.", "contractor", "company", [
    text("contractor", "Contractor"), text("company", "Company"), text("trade", "Trade"), date("validUntil", "Valid until"),
  ]),
  "volunteer-registration": form("Register a volunteer, a phone number, and a skill.", "volunteer", "phone", [
    text("volunteer", "Volunteer"), text("phone", "Phone"), text("skill", "Skill"), text("event", "Event", false),
  ]),
  "volunteer-scheduling": form("Put a volunteer on an event shift.", "volunteer", "event", [
    text("volunteer", "Volunteer"), text("event", "Event"), text("shift", "Shift"), date("workDate", "Date"),
  ]),
  "volunteer-recognition": form("Record an award given to a volunteer.", "volunteer", "award", [
    text("volunteer", "Volunteer"), text("award", "Award"), date("awarded", "Date"),
  ]),
  "badge-assignment": form("Assign a badge, the zone it opens, and when it expires.", "person", "badge", [
    text("person", "Person"), text("badge", "Badge"), text("zone", "Zone"), date("validUntil", "Valid until"),
  ]),
  "training-management": form("Schedule a course, a trainer, and the number of seats.", "course", "trainer", [
    text("course", "Course"), text("trainer", "Trainer"), date("courseDate", "Date"), num("seats", "Seats"),
  ]),
  "skill-management": form("Record a skill and the level a person holds.", "employee", "skill", [
    text("employee", "Employee"), text("skill", "Skill"), choice("level", "Level", ["Basic", "Working", "Advanced"]),
  ]),
  "skill-matching": form("Match a person and a skill to an event role.", "employee", "skill", [
    text("employee", "Employee"), text("skill", "Skill"), text("event", "Event"), text("role", "Role"),
  ]),
  "performance-management": form("Record a rating for a person and a period.", "employee", "period", [
    text("employee", "Employee"), text("period", "Period"), choice("rating", "Rating", ["1", "2", "3", "4", "5"]), text("reviewer", "Reviewer"),
  ]),
  "performance-tracking": form("Track a score for a person and a period.", "employee", "period", [
    text("employee", "Employee"), text("period", "Period"), num("score", "Score"), note(),
  ]),
  "employee-communication": form("Record a message, who it was for, and how it was sent.", "subject", "audience", [
    text("subject", "Subject"), text("audience", "Audience"), choice("channel", "Channel", ["Notice", "SMS", "Email", "Briefing"]), date("sent", "Sent"),
  ]),
  "hr-reports": form("File an HR report for a period.", "report", "preparedBy", [
    text("report", "Report"), text("period", "Period"), text("preparedBy", "Prepared by"), note(),
  ]),
  "workforce-analytics": form("Save a headcount figure for a department and a period.", "report", "department", [
    text("report", "Report"), text("department", "Department"), text("period", "Period"), num("headcount", "Headcount"),
  ]),
  "workforce-dashboard": form("Save who is on duty for a department on a date.", "snapshot", "department", [
    text("snapshot", "Snapshot"), text("department", "Department"), num("onDuty", "On duty"), date("snapshotDate", "Date"),
  ]),
};

export function featureForm(featureKey: string): FeatureForm | undefined {
  return FEATURE_FORMS[featureKey];
}
