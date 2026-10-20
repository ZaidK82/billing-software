
export type ParsedInvoiceItem = {
  item_name: string;
  quantity: number;
  unit_price: number;
  stated_total: number | null;
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

    if (/^order\s*(?:no\.?|number|#)\s*[:\-]?/i.test(line)) {
      inAddressBlock = false;
      continue;
    }

    if (
      /^(?:adress|address)\s+location\s*[:\-]/i.test(line) ||
      /^https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(line)
    ) {
      inAddressBlock = false;
      continue;
    }

    // Handle invoice summary before product parsing.
    if (/^total\b/i.test(line)) {
      inAddressBlock = false;

      const totalMatch = line.match(
        /^total\s*[:\-]?\s*₹?\s*([\d,]+(?:\.\d{1,2})?)/i,
      );

      if (totalMatch) {
        statedInvoiceTotal = roundCurrency(
          parseAmount(totalMatch[1]),
        );
      }

      // Supports both "delivery 50rs" and "50rs delivery".
      const deliveryMatch =
        line.match(
          /(?:delivery|shipping|transport)\s*(?:charge|charges|fee)?\s*[:\-]?\s*₹?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?)?/i,
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
  let unitPrice = amounts[0];

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
  };
}

export function parsePlainTextInvoice(
  input: string,
): ParsedPlainTextInvoice {
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
