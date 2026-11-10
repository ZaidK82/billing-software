
export type ParsedInvoiceItem = {
  item_name: string;
  quantity: number;
  unit_price: number;
  stated_total: number | null;
  unit_name: string | null;
};


export type ParsedPlainTextInvoice = {
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items: ParsedInvoiceItem[];
  delivery_charge: number | null;
  stated_invoice_total: number | null;
  warnings: string[];
};


const MONEY_PATTERN =
  /(?:₹\s*|Rs\.?\s*|INR\s*)(\d[\d,]*(?:\.\d{1,2})?)|(\d[\d,]*(?:\.\d{1,2})?)\s*(?:\/\s*-|rs\.?|rupees?\b)/gi;

const QUANTITY_PATTERN =
  /\b(\d+(?:\.\d+)?)\s*(pcs?|pieces?|units?|boxes?|bottles?|bags?|sets?)\b/i;

const KNOWN_STATES = new Set([
  "andhra pradesh",
  "arunachal pradesh",
  "assam",
  "bihar",
  "chhattisgarh",
  "goa",
  "gujarat",
  "haryana",
  "himachal pradesh",
  "jharkhand",
  "karnataka",
  "kerala",
  "madhya pradesh",
  "maharashtra",
  "manipur",
  "meghalaya",
  "mizoram",
  "nagaland",
  "odisha",
  "punjab",
  "rajasthan",
  "sikkim",
  "tamil nadu",
  "telangana",
  "tripura",
  "uttar pradesh",
  "uttarakhand",
  "west bengal",
]);

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeFieldLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ");
}

const CUSTOMER_FIELD_ALIASES: Record<string, string[]> = {
  name: [
    "name",
    "customer name",
    "customer",
  ],
  phone: [
    "phone",
    "phone no",
    "phone number",
    "mobile",
    "mobile no",
    "mobile number",
    "contact",
    "contact no",
    "contact number",
    "no",
  ],
  address: [
    "address",
    "add",
    "adress",
    "delivery address",
  ],
  city: [
    "city",
    "town",
  ],
  state: [
    "state",
    "province",
  ],
  pincode: [
    "pincode",
    "pin code",
    "pin",
    "postal code",
    "zip",
    "zip code",
  ],
};

const SHIPPING_FIELD_ALIASES = [
  "shipping",
  "shipping fee",
  "shipping charge",
  "delivery",
  "delivery fee",
  "delivery charge",
  "transport",
  "transport fee",
  "transport charge",
  "courier",
  "courier fee",
  "courier charge",
  "postage",
  "postage charge",
];

const TOTAL_FIELD_ALIASES = [
  "order total",
  "total",
  "grand total",
  "final amount",
  "net amount",
];

function getCustomerFieldKey(label: string): string | null {
  const normalized = normalizeFieldLabel(label);

  for (const [field, aliases] of Object.entries(
    CUSTOMER_FIELD_ALIASES,
  )) {
    if (aliases.includes(normalized)) {
      return field;
    }
  }

  return null;
}

function isShippingField(label: string): boolean {
  return SHIPPING_FIELD_ALIASES.includes(
    normalizeFieldLabel(label),
  );
}

function isTotalField(label: string): boolean {
  return TOTAL_FIELD_ALIASES.includes(
    normalizeFieldLabel(label),
  );
}

function parseCommaSeparatedInvoice(
  input: string,
): ParsedPlainTextInvoice | null {
  const lines = input
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim());

  const hasCustomerSection = lines.some((line) =>
    /^(?:CUSTOMER DETAILS|CUSTOMER)\s*:/i.test(line),
  );

  const hasItemsSection = lines.some((line) =>
    /^ITEMS\s*:/i.test(line),
  );

  const hasNewFormat =
    hasCustomerSection && hasItemsSection;

  if (!hasNewFormat) {
    return null;
  }

  const warnings: string[] = [];

  let customer_name = "";
  let customer_phone = "";
  let customer_address = "";
  let city = "";
  let state = "";
  let pincode = "";

  let delivery_charge = 0;
  let hasShippingField = false;
  let stated_invoice_total: number | null = null;

  let section: "none" | "customer" | "items" = "none";

  const items: ParsedInvoiceItem[] = [];

  function parseMoney(value: string): number | null {
    const normalized = value
      .replace(/^(?:₹|Rs\.?|INR)\s*/i, "")
      .replace(/(?:\/\s*-|rs\.?|rupees?)$/i, "")
      .replace(/,/g, "")
      .trim();

    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
      return null;
    }

    const amount = Number(normalized);

    return Number.isFinite(amount) && amount >= 0
      ? roundCurrency(amount)
      : null;
  }

  function parseQuantityAndUnit(
    value: string,
  ): { quantity: number; unit_name: string } | null {
    const match = value.trim().match(
      /^(\d+(?:\.\d+)?)\s*(pc|pcs|piece|pieces|unit|units|box|boxes|bottle|bottles|bag|bags|set|sets|kg|gm|g|ml|l|litre|litres|liter|liters|pack|packs)$/i,
    );

    if (!match) {
      return null;
    }

    const quantity = Number(match[1]);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return null;
    }

    const rawUnit = match[2].toLowerCase();

    const unitAliases: Record<string, string> = {
      pcs: "pc",
      piece: "pc",
      pieces: "pc",
      unit: "pc",
      units: "pc",
      box: "box",
      boxes: "box",
      bottle: "bottle",
      bottles: "bottle",
      bag: "bag",
      bags: "bag",
      set: "set",
      sets: "set",
      kg: "kg",
      gm: "gm",
      g: "gm",
      ml: "ml",
      l: "litre",
      litre: "litre",
      litres: "litre",
      liter: "litre",
      liters: "litre",
      pack: "pack",
      packs: "pack",
    };

    return {
      quantity,
      unit_name: unitAliases[rawUnit],
    };
  }

  for (const line of lines) {
    if (!line) continue;

    if (/^ORDER\s*(?:NO\.?|NUMBER|#)\s*:/i.test(line)) {
      continue;
    }

    if (/^(?:CUSTOMER DETAILS|CUSTOMER)\s*:/i.test(line)) {
      section = "customer";
      continue;
    }

    if (/^ITEMS\s*:/i.test(line)) {
      section = "items";
      continue;
    }

    const summaryField = line.match(
      /^([a-z][a-z ._-]*)\s*[:-]\s*(.*)$/i,
    );

    if (summaryField) {
      const label = normalizeFieldLabel(summaryField[1]);
      const value = summaryField[2].trim();

      if (isShippingField(label)) {
        section = "none";

        if (hasShippingField) {
          warnings.push(
            "Multiple shipping/delivery charges were provided. Only the latest valid value is being used.",
          );
        }

        hasShippingField = true;

        const amount = parseMoney(value);

        if (amount === null) {
          warnings.push(`Invalid shipping charge: "${value}".`);
        } else {
          delivery_charge = amount;
        }

        continue;
      }

      if (isTotalField(label)) {
        section = "none";

        const amount = parseMoney(value);

        if (amount === null) {
          warnings.push(`Invalid order total: "${value}".`);
        } else {
          if (stated_invoice_total !== null) {
            warnings.push(
              "Multiple order-total fields were provided. Only the latest valid value is being used.",
            );
          }

          stated_invoice_total = amount;
        }

        continue;
      }
    }

    if (section === "customer") {
      const field = line.match(/^([a-z][a-z ._-]*)\s*[:-]\s*(.*)$/i);

      if (!field) {
        warnings.push(`Unrecognized customer detail: "${line}".`);
        continue;
      }

      const key = getCustomerFieldKey(field[1]);
      const value = field[2].trim();

      if (!key) {
        warnings.push(
          `Unknown customer field "${field[1]}" was ignored.`,
        );
        continue;
      }

      if (key === "name") {
        customer_name = value;
      } else if (key === "phone") {
        customer_phone = value;
      } else if (key === "address") {
        customer_address = value;
      } else if (key === "city") {
        city = value;
      } else if (key === "state") {
        state = value;
      } else if (key === "pincode") {
        pincode = value;
      }

      continue;
    }

    if (section === "items") {
      const fields = line.split(",").map((field) => field.trim());

      if (fields.length !== 4) {
        warnings.push(
          `Invalid product row "${line}". Expected: Item name, Quantity with unit, Rate, Line total.`,
        );
        continue;
      }

      const [item_name, quantityText, rateText, totalText] = fields;

      if (!item_name) {
        warnings.push(`Product name is missing in "${line}".`);
        continue;
      }

      const quantityInfo = parseQuantityAndUnit(quantityText);

      if (!quantityInfo) {
        warnings.push(
          `"${item_name}": invalid quantity/unit "${quantityText}".`,
        );
        continue;
      }

      const unitPrice = parseMoney(rateText);
      const statedTotal = parseMoney(totalText);

      if (unitPrice === null) {
        warnings.push(`"${item_name}": invalid rate "${rateText}".`);
        continue;
      }

      if (statedTotal === null) {
        warnings.push(
          `"${item_name}": invalid line total "${totalText}".`,
        );
        continue;
      }

      const calculatedTotal = roundCurrency(
        quantityInfo.quantity * unitPrice,
      );

      if (calculatedTotal !== statedTotal) {
        warnings.push(
          `"${item_name}": quantity × rate is ₹${calculatedTotal.toFixed(2)}, but the stated line total is ₹${statedTotal.toFixed(2)}.`,
        );
      }

      items.push({
        item_name,
        quantity: quantityInfo.quantity,
        unit_price: unitPrice,
        stated_total: statedTotal,
        unit_name: quantityInfo.unit_name,
      });
    }
  }

  if (!customer_name) {
    warnings.push("Customer name was not provided.");
  }

  if (!customer_phone) {
    warnings.push("Customer phone number was not provided.");
  }

  if (!items.length) {
    warnings.push("No valid product rows were detected.");
  }

  if (pincode && !/^\d{6}$/.test(pincode)) {
    warnings.push(`Invalid PIN code: "${pincode}".`);
  }

  const addressParts = [
    customer_address,
    city,
    state,
    pincode,
  ].filter(Boolean);

  customer_address = addressParts.join(", ");

  const calculatedOrderTotal = roundCurrency(
    items.reduce(
      (sum, item) => sum + (item.stated_total ?? 0),
      0,
    ) + delivery_charge,
  );

  if (stated_invoice_total !== null) {
    if (calculatedOrderTotal !== stated_invoice_total) {
      warnings.push(
        `Order total mismatch: calculated ₹${calculatedOrderTotal.toFixed(2)}, stated ₹${stated_invoice_total.toFixed(2)}.`,
      );
    }
  }

  return {
    customer_name,
    customer_phone,
    customer_address,
    items,
    delivery_charge,
    stated_invoice_total,
    warnings,
  };
}

function parseStructuredPlainTextInvoice(
  input: string,
): ParsedPlainTextInvoice | null {
  const lines = input
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim());

  // Only activate this parser when the explicit structured format
  // is detected. Other existing formats continue through the old parser.
  const hasStructuredFormat =
    lines.some((line) => /^CUSTOMER\s*:/i.test(line)) &&
    lines.some((line) => /^ITEMS\s*:/i.test(line)) &&
    lines.some((line) => /^Product\s*:/i.test(line));

  if (!hasStructuredFormat) {
    return null;
  }

  const warnings: string[] = [];

  let customer_name = "";
  let customer_phone = "";
  let customer_address = "";
  const delivery_charge: number | null = null;
  const stated_invoice_total: number | null = null;

  let section: "none" | "customer" | "items" | "notes" = "none";

  type PendingItem = {
    item_name: string;
    quantity: number | null;
    unit_name: string | null;
    unit_price: number | null;
    stated_total: number | null;
  };

  const items: ParsedInvoiceItem[] = [];
  let pending: PendingItem | null = null;

  function finishItem() {
    if (!pending) return;

    const name = pending.item_name.trim();

    if (!name) {
      warnings.push("An item with no product name was skipped.");
      pending = null;
      return;
    }

    if (pending.quantity === null || pending.quantity <= 0) {
      warnings.push(
        `"${name}": quantity is missing or invalid. This item was not imported.`,
      );
      pending = null;
      return;
    }

    if (pending.unit_price === null || pending.unit_price < 0) {
      warnings.push(
        `"${name}": rate is missing or invalid. This item was not imported.`,
      );
      pending = null;
      return;
    }

    const calculatedTotal = roundCurrency(
      pending.quantity * pending.unit_price,
    );

    if (
      pending.stated_total !== null &&
      calculatedTotal !== pending.stated_total
    ) {
      warnings.push(
        `"${name}": stated total ₹${pending.stated_total.toFixed(2)} does not match quantity × rate (₹${calculatedTotal.toFixed(2)}).`,
      );
    }

    items.push({
      item_name: name,
      quantity: pending.quantity,
      unit_price: roundCurrency(pending.unit_price),
      stated_total: pending.stated_total,
      unit_name: pending.unit_name,
    });

    pending = null;
  }

  function parseStructuredNumber(value: string): number | null {
    const normalized = value.replace(/,/g, "").trim();

    if (!normalized || !/^\d+(?:\.\d{1,3})?$/.test(normalized)) {
      return null;
    }

    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : null;
  }

  for (const line of lines) {
    if (!line) continue;

    if (/^CUSTOMER\s*:/i.test(line)) {
      section = "customer";
      continue;
    }

    if (/^ITEMS\s*:/i.test(line)) {
      section = "items";
      continue;
    }

    if (/^NOTES\s*:/i.test(line)) {
      section = "notes";
      finishItem();
      continue;
    }

    if (section === "notes") {
      continue;
    }

    if (section === "customer") {
      const field = line.match(/^([a-z ]+)\s*:\s*(.*)$/i);

      if (!field) {
        warnings.push(`Unrecognized customer detail: "${line}".`);
        continue;
      }

      const key = field[1].trim().toLowerCase();
      const value = field[2].trim();

      if (key === "name") {
        customer_name = value;
      } else if (key === "phone" || key === "mobile") {
        customer_phone = value;
      } else if (key === "address") {
        customer_address = value;
      } else if (key === "email") {
        // Email is not currently part of ParsedPlainTextInvoice.
        // Do not silently put it into another customer field.
        if (value) {
          warnings.push(
            "Email was detected but is not currently supported by the invoice text parser.",
          );
        }
      } else {
        warnings.push(`Unknown customer field "${key}" was ignored.`);
      }

      continue;
    }

    if (section === "items") {
      const field = line.match(/^([a-z _-]+)\s*:\s*(.*)$/i);

      if (!field) {
        warnings.push(`Unrecognized item detail: "${line}".`);
        continue;
      }

      const key = field[1].trim().toLowerCase();
      const value = field[2].trim();

      if (key === "product" || key === "product name") {
        finishItem();

        pending = {
          item_name: value,
          quantity: null,
          unit_name: null,
          unit_price: null,
          stated_total: null,
        };

        continue;
      }

      if (!pending) {
        warnings.push(
          `"${key}" was provided before a Product field and was ignored.`,
        );
        continue;
      }

      if (key === "quantity" || key === "qty") {
        pending.quantity = parseStructuredNumber(value);
        if (pending.quantity === null || pending.quantity <= 0) {
          warnings.push(
            `"${pending.item_name}": invalid quantity "${value}".`,
          );
        }
      } else if (key === "unit") {
        pending.unit_name = value || null;
      } else if (
        key === "rate" ||
        key === "price" ||
        key === "unit price"
      ) {
        pending.unit_price = parseStructuredNumber(
          value.replace(/^(?:₹|Rs\.?|INR)\s*/i, ""),
        );

        if (pending.unit_price === null || pending.unit_price < 0) {
          warnings.push(
            `"${pending.item_name}": invalid rate "${value}".`,
          );
        }
      } else if (key === "total" || key === "amount") {
        pending.stated_total = parseStructuredNumber(
          value.replace(/^(?:₹|Rs\.?|INR)\s*/i, ""),
        );
      } else {
        warnings.push(`Unknown item field "${key}" was ignored.`);
      }
    }
  }

  finishItem();

  if (!customer_name) {
    warnings.push("Customer name was not provided.");
  }

  if (items.length === 0) {
    warnings.push("No valid product rows were detected.");
  }

  return {
    customer_name,
    customer_phone,
    customer_address,
    items,
    delivery_charge,
    stated_invoice_total,
    warnings,
  };
}

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, ""));
}

function findAmounts(line: string): number[] {
  return Array.from(line.matchAll(MONEY_PATTERN), (match) =>
    parseAmount(match[1] ?? match[2]),
  );
}

function isPricingLine(line: string): boolean {
  return /^\s*(?:(?:₹|Rs\.?|INR)\s*\d[\d,]*(?:\.\d{1,2})?|\d[\d,]*(?:\.\d{1,2})?\s*(?:\/\s*-|rs\.?|rupees?\b))/i.test(
    line,
  );
}

function extractQuantity(
  line: string,
): { quantity: number; itemName: string } | null {
  const match = line.match(QUANTITY_PATTERN);

  if (!match) {
    return null;
  }

  const quantity = Number(match[1]);

  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    return null;
  }

  return {
    quantity,
    itemName: line.replace(match[0], "").trim(),
  };
}


function extractCustomerDetails(
  lines: string[],
  warnings: string[],
) {
  let customerName = "";
  let customerPhone = "";
  let city = "";
  let state = "";
  let pincode = "";
  let deliveryCharge: number | null = null;
  let statedInvoiceTotal: number | null = null;
  let inAddressBlock = false;

  const addressParts: string[] = [];
  const productLines: string[] = [];

  for (const originalLine of lines) {
    const line = originalLine.trim();

    if (!line) {
      inAddressBlock = false;
      continue;
    }

    if (/^order\s*(?:no\.?|number|#)\s*[:-]?/i.test(line)) {
      inAddressBlock = false;
      continue;
    }

    if (
      /^(?:adress|address)\s+location\s*[:-]/i.test(line) ||
      /^https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(line)
    ) {
      inAddressBlock = false;
      continue;
    }

    // Handle invoice summary before product parsing.
    if (/^total\b/i.test(line)) {
      inAddressBlock = false;

      const totalMatch = line.match(
        /^total\s*[:-]?\s*₹?\s*([\d,]+(?:\.\d{1,2})?)/i,
      );

      if (totalMatch) {
        statedInvoiceTotal = roundCurrency(
          parseAmount(totalMatch[1]),
        );
      }

      // Supports both "delivery 50rs" and "50rs delivery".
      const deliveryMatch =
        line.match(
          /(?:delivery|shipping|transport)\s*(?:charge|charges|fee)?\s*[:-]?\s*₹?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?)?/i,
        ) ??
        line.match(
          /₹?\s*([\d,]+(?:\.\d{1,2})?)\s*rs\.?\s*(?:delivery|shipping|transport)\b/i,
        );

      if (deliveryMatch) {
        deliveryCharge = roundCurrency(
          parseAmount(deliveryMatch[1]),
        );
      }

      continue;
    }

    let match = line.match(/^name\s*[-:]+\s*(.*)$/i);
    if (match) {
      inAddressBlock = false;
      customerName = match[1].trim();
      continue;
    }

    match = line.match(
      /^(?:mobile(?:\s+number)?|phone|contact(?:\s+number)?|mo|no)\s*\.?\s*[-:]+\s*(.*)$/i,
    );
    if (match) {
      inAddressBlock = false;
      customerPhone = match[1].trim();
      continue;
    }

    match = line.match(/^(?:address|adress)\s*[-:]+\s*(.*)$/i);
    if (match) {
      inAddressBlock = true;
      const address = match[1].trim();

      if (address) {
        addressParts.push(address);
      }
      continue;
    }

    match = line.match(/^city\s*[-:]+\s*(.*)$/i);
    if (match) {
      inAddressBlock = false;
      city = match[1].trim();
      continue;
    }

    match = line.match(/^state\s*[-:]+\s*(.*)$/i);
    if (match) {
      inAddressBlock = false;
      state = match[1].trim();
      continue;
    }

    match = line.match(/^pincode\s*[-:]+\s*(.*)$/i);
    if (match) {
      inAddressBlock = false;
      pincode = match[1].trim();
      continue;
    }

    if (KNOWN_STATES.has(line.toLowerCase())) {
      inAddressBlock = false;
      state = line;
      continue;
    }

    // Continue collecting a multiline address until another
    // recognized field or summary line is encountered.
    if (inAddressBlock) {
      addressParts.push(line);
      continue;
    }

    // Standalone numeric order identifiers are not products.
    if (/^\d{1,8}$/.test(line)) {
      continue;
    }

    productLines.push(line);
  }

  const cleanedAddressParts = addressParts.filter((part) => {
    const normalized = part.toLowerCase().trim();

    if (city && normalized === city.toLowerCase()) {
      return false;
    }

    if (
      pincode &&
      new RegExp(`\\b${pincode}\\b`).test(part) &&
      /(?:^|\s)[-\u2013,]?\s*\d{6}\s*$/.test(part)
    ) {
      return false;
    }

    return true;
  });

  const customerAddress = [
    ...cleanedAddressParts,
    city,
    state,
    pincode ? `PIN ${pincode}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  if (!customerName) {
    warnings.push("Customer name was not detected.");
  }

  return {
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_address: customerAddress,
    delivery_charge: deliveryCharge,
    stated_invoice_total: statedInvoiceTotal,
    productLines,
  };
}


function parsePricingLine(
  line: string,
  headerQuantity: number | null,
  itemName: string,
  warnings: string[],
): ParsedInvoiceItem | null {
  const amounts = findAmounts(line);

  if (amounts.length === 0) {
    warnings.push(`No price detected for "${itemName}".`);
    return null;
  }

  const explicitQuantityMatch =
    line.match(/(?:\/\s*-\s*(?:x|×)?\s*|[x×]\s*)(\d+)\s*=/i);

  let quantity = headerQuantity;
  let statedTotal: number | null = null;
  const unitPrice = amounts[0];

  if (explicitQuantityMatch) {
    const expressionQuantity = Number(explicitQuantityMatch[1]);

    if (Number.isSafeInteger(expressionQuantity) && expressionQuantity > 0) {
      if (
        quantity !== null &&
        quantity !== expressionQuantity
      ) {
        warnings.push(
          `"${itemName}": quantity in the product line (${quantity}) differs from the price expression (${expressionQuantity}).`,
        );
      } else {
        quantity = expressionQuantity;
      }
    }
  }

  if (amounts.length >= 2) {
    statedTotal = roundCurrency(amounts[amounts.length - 1]);
  }

  if (quantity === null && statedTotal !== null && unitPrice > 0) {
    const inferredQuantity = statedTotal / unitPrice;

    if (
      Number.isSafeInteger(inferredQuantity) &&
      inferredQuantity > 0
    ) {
      quantity = inferredQuantity;
      warnings.push(
        `"${itemName}": quantity ${quantity} was inferred from rate and total. Please verify it.`,
      );
    }
  }

  if (quantity === null) {
    quantity = 1;
    warnings.push(
      `"${itemName}": quantity was assumed to be 1. Please verify it.`,
    );
  }

  if (quantity <= 0 || unitPrice < 0) {
    warnings.push(`"${itemName}" has an invalid quantity or rate.`);
    return null;
  }

  const calculatedTotal = roundCurrency(quantity * unitPrice);

  if (
    statedTotal !== null &&
    calculatedTotal !== statedTotal
  ) {
    warnings.push(
      `"${itemName}": stated total ₹${statedTotal.toFixed(2)} does not match quantity × rate (₹${calculatedTotal.toFixed(2)}).`,
    );
  }

  return {
    item_name: itemName,
    quantity,
    unit_price: roundCurrency(unitPrice),
    stated_total: statedTotal,
    unit_name: null,
  };
}

export function parsePlainTextInvoice(
  input: string,
): ParsedPlainTextInvoice {
  const commaSeparatedResult = parseCommaSeparatedInvoice(input);

  if (commaSeparatedResult) {
    return commaSeparatedResult;
  }

  const structuredResult = parseStructuredPlainTextInvoice(input);

  if (structuredResult) {
    return structuredResult;
  }

  const warnings: string[] = [];
  const lines = input
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim());

  const customer = extractCustomerDetails(lines, warnings);
  const items: ParsedInvoiceItem[] = [];

  let pendingName = "";
  let pendingQuantity: number | null = null;

  function finishPending() {
    if (!pendingName) return;

    warnings.push(
      `Could not find a price for "${pendingName}". This item was not imported.`,
    );

    pendingName = "";
    pendingQuantity = null;
  }


  for (const line of customer.productLines) {
    // Case 1: A product's size and price are on a continuation line,
    // e.g. "ahmed al magribi Rawdha" followed by "25gm - 200/-".
    // Handle this BEFORE the generic price-line and product-line branches.
    const sizePriceMatch = line.match(
      /^\s*(\d+(?:\.\d+)?\s*(?:gm|g|kg|ml|l|liters?|litres?))\s*[-:]\s*(.+)$/i,
    );

    if (
      sizePriceMatch &&
      findAmounts(sizePriceMatch[2]).length > 0
    ) {
      if (!pendingName) {
        warnings.push(
          `Price line "${line}" was not attached to a product.`,
        );
        continue;
      }

      const itemName = `${pendingName} ${sizePriceMatch[1]}`.trim();
      const item = parsePricingLine(
        sizePriceMatch[2],
        pendingQuantity,
        itemName,
        warnings,
      );

      if (item) items.push(item);

      pendingName = "";
      pendingQuantity = null;
      continue;
    }

    // Case 2: A conventional price line follows a product name.
    if (isPricingLine(line)) {
      if (!pendingName) {
        warnings.push(
          `Price line "${line}" was not attached to a product.`,
        );
        continue;
      }

      const item = parsePricingLine(
        line,
        pendingQuantity,
        pendingName,
        warnings,
      );

      if (item) items.push(item);

      pendingName = "";
      pendingQuantity = null;
      continue;
    }

    // Case 3: A product name and price appear on the same line.
    const amounts = findAmounts(line);

    if (amounts.length > 0) {
      const amountMatches = Array.from(line.matchAll(MONEY_PATTERN));
      const lastAmountMatch = amountMatches[amountMatches.length - 1];

      const productName = lastAmountMatch
        ? line
            .slice(0, lastAmountMatch.index)
            .replace(/[:\-–\s]+$/, "")
            .replace(/^\s*\d+\s*[.)]\s*/, "")
            .trim()
        : "";

      if (productName && lastAmountMatch) {
        finishPending();

        const quantityInfo = extractQuantity(productName);
        const itemName = quantityInfo?.itemName || productName;

        const item = parsePricingLine(
          line.slice(lastAmountMatch.index),
          quantityInfo?.quantity ?? null,
          itemName,
          warnings,
        );

        if (item) items.push(item);
        continue;
      }
    }

    // Case 4: A size-only continuation line follows a product name.
    // Keep the pending product instead of finishing it prematurely.
    const quantityInfo = extractQuantity(line);
    const cleanedName = (quantityInfo?.itemName || line)
      .replace(/^\s*\d+\s*[.)]\s*/, "")
      .trim();

    if (
      pendingName &&
      /^\d+(?:\.\d+)?\s*(?:gm|g|kg|ml|l|liters?|litres?)$/i.test(
        cleanedName,
      )
    ) {
      pendingName = `${pendingName} ${cleanedName}`.trim();
      pendingQuantity = quantityInfo?.quantity ?? pendingQuantity;
      continue;
    }

    // This line starts a new product, so finish any previous unfinished one.
    finishPending();

    pendingName = cleanedName;
    pendingQuantity = quantityInfo?.quantity ?? null;
  }

  // Report a final product that never received a price.
  finishPending();


  if (items.length === 0) {
    warnings.push(
      "No complete product rows were detected. Check the format and try again.",
    );
  }

  
  return {
    customer_name: customer.customer_name,
    customer_phone: customer.customer_phone,
    customer_address: customer.customer_address,
    delivery_charge: customer.delivery_charge,
    stated_invoice_total: customer.stated_invoice_total,
    items,
    warnings,
  };

}
