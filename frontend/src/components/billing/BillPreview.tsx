import { useState } from "react";

import { downloadBillPdf } from "../../lib/api";
import { getSession } from "../../lib/auth";

import type {
  InvoiceColumn,
  SavedBill,
} from "../../lib/api";

type BillPreviewProps = {
  bill: SavedBill;
  businessName: string;
  logoUrl: string | null;
  signatureUrl: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  businessAddress: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessPincode: string | null;
  businessGstin: string | null;
  businessUdyamNumber: string | null;
  onCreateNew: () => void;
  onBack: () => void;
  onBackToBills: () => void;
};

function BillPreview({
  bill,
  businessName,
  logoUrl,
  signatureUrl,
  businessPhone,
  businessEmail,
  businessAddress,
  businessCity,
  businessState,
  businessPincode,
  businessGstin,
  businessUdyamNumber,
  onCreateNew,
  onBack,
  onBackToBills,
}: BillPreviewProps) {

  const [isDownloading, setIsDownloading] =
    useState(false);

  const [downloadError, setDownloadError] =
    useState<string | null>(null);

  function formatMoney(value: string | number): string {
    return `₹${Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatInvoiceDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();

    return `${day}-${month}-${year}`;
  }
  
  const businessLocation = [
    businessCity,
    businessPincode,
  ]
    .filter(Boolean)
    .join(", ");

    const defaultInvoiceColumns: InvoiceColumn[] = [
    {
        key: "item_name",
        label: "Item",
        type: "text",
        source: "core",
        position: 1,
        required: true,
    },
    {
        key: "quantity",
        label: "Qty",
        type: "number",
        source: "core",
        position: 2,
        required: true,
    },
    {
        key: "unit_price",
        label: "Unit Price",
        type: "number",
        source: "core",
        position: 3,
        required: true,
    },
    {
        key: "line_total",
        label: "Total",
        type: "number",
        source: "core",
        position: 4,
        required: true,
    },
    ];

    const invoiceColumns: InvoiceColumn[] = (
    bill.invoice_columns?.length
        ? bill.invoice_columns
        : defaultInvoiceColumns
    ).sort((a, b) => a.position - b.position);

  function getColumnValue(
    item: SavedBill["items"][number],
    column: InvoiceColumn,
  ): string {
    if (column.source === "core") {
      switch (column.key) {
        case "item_name":
          return item.item_name;

        case "quantity":
          return String(item.quantity);

        case "unit_price":
          return formatMoney(item.unit_price);
        case "line_total":
          return formatMoney(item.line_total);

        default:
          return "";
      }
    }

    const value =
      item.custom_values?.[column.key];

    if (
      value === undefined ||
      value === null ||
      String(value).trim() === ""
    ) {
      return "—";
    }

    if (column.type === "number") {
      const numberValue = Number(value);

      if (!Number.isNaN(numberValue)) {
        return numberValue.toFixed(2);
      }
    }

    return String(value);
  }

  function numberToWordsUnder1000(
    number: number,
  ): string {
    const ones = [
      "Zero",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];

    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    if (number < 20) {
      return ones[number];
    }

    if (number < 100) {
      const remainder = number % 10;

      if (remainder === 0) {
        return tens[Math.floor(number / 10)];
      }

      return `${tens[Math.floor(number / 10)]} ${ones[remainder]}`;
    }

    const remainder = number % 100;

    if (remainder === 0) {
      return `${ones[Math.floor(number / 100)]} Hundred`;
    }

    return `${ones[Math.floor(number / 100)]} Hundred ${numberToWordsUnder1000(
      remainder,
    )}`;
  }

  function numberToWords(number: number): string {
    if (number === 0) {
      return "Zero";
    }

    const parts: string[] = [];

    let remaining = number;

    const crore = Math.floor(
      remaining / 10_000_000,
    );
    remaining %= 10_000_000;

    const lakh = Math.floor(
      remaining / 100_000,
    );
    remaining %= 100_000;

    const thousand = Math.floor(
      remaining / 1_000,
    );
    remaining %= 1_000;

    if (crore) {
      parts.push(
        `${numberToWordsUnder1000(crore)} Crore`,
      );
    }

    if (lakh) {
      parts.push(
        `${numberToWordsUnder1000(lakh)} Lakh`,
      );
    }

    if (thousand) {
      parts.push(
        `${numberToWordsUnder1000(thousand)} Thousand`,
      );
    }

    if (remaining) {
      parts.push(
        numberToWordsUnder1000(remaining),
      );
    }

    return parts.join(" ");
  }

  function amountInWords(value: number): string {
    const amount = Math.abs(
      Math.round(value * 100) / 100,
    );

    const rupees = Math.floor(amount);

    const paise = Math.round(
      (amount - rupees) * 100,
    );

    const words = numberToWords(rupees);

    if (paise > 0) {
      return `${words} Rupees And ${numberToWordsUnder1000(
        paise,
      )} Paise Only`;
    }

    return `${words} Only`;
  }

  const billAmountInWords = amountInWords(
    Number(bill.total),
  );

  async function handleDownloadPdf() {
    setIsDownloading(true);
    setDownloadError(null);

    try {
      const session = await getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      const pdfBlob = await downloadBillPdf(
        session.access_token,
        bill.id,
      );

      const url = window.URL.createObjectURL(
        pdfBlob,
      );

      const link = document.createElement("a");
      link.href = url;
      link.download = `${bill.invoice_number}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : "Unable to download PDF.",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-4 flex flex-col gap-3 sm:mb-6">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={onBack}
              className="min-h-10 rounded-lg px-1 text-sm font-medium text-blue-600 transition hover:bg-blue-50 active:bg-blue-100"
            >
              ← Dashboard
            </button>

            <button
              type="button"
              onClick={onBackToBills}
              className="min-h-10 rounded-lg px-1 text-sm font-medium text-blue-600 transition hover:bg-blue-50 active:bg-blue-100"
            >
              ← Bills
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isDownloading
                ? "Preparing PDF..."
                : "Download PDF"}
            </button>

            <button
              type="button"
              onClick={onCreateNew}
              className="min-h-11 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 sm:w-auto"
            >
              New Bill
            </button>
          </div>
        </div>

        {downloadError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {downloadError}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 pb-5 pt-6 sm:px-8 sm:pb-6">
            <h1 className="mb-5 text-center text-xl font-bold tracking-wide text-slate-800 sm:text-2xl">
              INVOICE
            </h1>

            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-xl font-bold text-slate-900 sm:text-2xl">
                  {businessName}
                </h2>

                {businessAddress && (
                  <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-600">
                    {businessAddress}
                  </p>
                )}

                {businessLocation && (
                  <p className="break-words text-sm text-slate-600">
                    {businessLocation}
                  </p>
                )}

                {businessState && (
                  <p className="break-words text-sm text-slate-600">
                    State: {businessState}
                  </p>
                )}

                {businessGstin && (
                  <p className="break-words text-sm text-slate-600">
                    GSTIN: {businessGstin}
                  </p>
                )}

                {businessUdyamNumber && (
                  <p className="break-words text-sm text-slate-600">
                    Udyam No.: {businessUdyamNumber}
                  </p>
                )}

                {businessPhone && (
                  <p className="break-words text-sm text-slate-600">
                    Phone: {businessPhone}
                  </p>
                )}

                {businessEmail && (
                  <p className="break-words text-sm text-slate-600">
                    Email: {businessEmail}
                  </p>
                )}
              </div>

              {logoUrl && (
                <div className="flex w-1/3 shrink-0 justify-end">
                  <img
                    src={logoUrl}
                    alt={`${businessName} logo`}
                    className="max-h-24 max-w-full object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="border-b border-slate-200 px-5 py-5 sm:px-8 sm:py-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-xs font-bold text-slate-800">
                  Bill To:
                </p>

                <p className="break-words text-sm font-bold text-slate-900">
                  {bill.customer_name || "Walk-in Customer"}
                </p>

                {bill.customer_phone && (
                  <p className="mt-1 break-words text-sm text-slate-600">
                    {bill.customer_phone}
                  </p>
                )}

                {bill.customer_address && (
                  <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-600">
                    {bill.customer_address}
                  </p>
                )}
              </div>

              <div className="grid shrink-0 grid-cols-[auto_auto] content-start gap-x-4 gap-y-2 text-sm sm:w-[240px]">
                <span className="font-semibold text-slate-700">
                  Invoice No:
                </span>
                <span className="break-all text-slate-900">
                  {bill.invoice_number}
                </span>

                <span className="font-semibold text-slate-700">
                  Invoice Date:
                </span>
                <span className="text-slate-900">
                  {formatInvoiceDate(bill.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-slate-800">
                <tr className="text-left text-xs uppercase tracking-wide text-white">
                  {invoiceColumns.map((column) => (
                    <th
                      key={column.key}
                      className={`px-3 py-3 first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6 ${
                        column.type === "number" ||
                        column.source === "core" &&
                        (
                          column.key ===
                            "quantity" ||
                          column.key ===
                            "unit_price" ||
                          column.key ===
                            "line_total"
                        )
                          ? "text-right"
                          : ""
                      }`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {bill.items.map((item) => (
                  <tr
                    key={item.id}
                    style={
                      item.highlight_style === "yellow"
                        ? { backgroundColor: "#FEF3C7" }
                        : undefined
                    }
                    className="border-t border-slate-100"
                  >
                    {invoiceColumns.map(
                      (column) => {
                        const value =
                          getColumnValue(
                            item,
                            column,
                          );

                        const isNumeric =
                          column.type ===
                            "number" ||
                          (
                            column.source ===
                              "core" &&
                            (
                              column.key ===
                                "quantity" ||
                              column.key ===
                                "unit_price" ||
                              column.key ===
                                "line_total"
                            )
                          );

                        return (
                          <td
                            key={column.key}
                            className={`max-w-[240px] break-words px-3 py-3 text-slate-600 first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6 ${
                              isNumeric
                                ? "text-right"
                                : ""
                            } ${
                              column.key ===
                              "item_name"
                                ? "font-medium text-slate-900"
                                : ""
                            }`}
                          >
                            {value}
                          </td>
                        );
                      },
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-5 py-6 sm:px-8 sm:py-7">
            {/* Totals */}
            <div className="ml-auto w-full max-w-xs">
              <div className="flex justify-between gap-6 py-2 text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="whitespace-nowrap tabular-nums">
                  {formatMoney(bill.subtotal)}
                </span>
              </div>

              <div className="flex justify-between gap-6 border-t-2 border-slate-800 pt-3 text-base font-bold text-slate-900 sm:text-lg">
                <span>TOTAL</span>
                <span className="whitespace-nowrap tabular-nums">
                  {formatMoney(bill.total)}
                </span>
              </div>
            </div>

            {/* Amount in words */}
            <div className="mt-6 border-t border-slate-200 pt-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                  Amount in Words
                </p>

                <p className="break-words text-sm leading-6 text-slate-700">
                  {billAmountInWords}
                </p>
              </div>
            </div>

            {/* Terms and conditions */}
            {bill.terms_and_conditions && (
              <div className="mt-5 border-t border-slate-200 pt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                  Terms &amp; Conditions
                </p>

                <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-600">
                  {bill.terms_and_conditions}
                </p>
              </div>
            )}

            {/* Authorized signature */}
            {signatureUrl && (
              <div className="mt-8 flex justify-end">
                <div className="flex w-48 flex-col items-center">
                  <img
                    src={signatureUrl}
                    alt="Authorized signature"
                    className="max-h-20 max-w-full object-contain"
                  />

                  <div className="mt-2 w-full border-t border-slate-400 pt-2 text-center">
                    <p className="text-xs font-semibold text-slate-700">
                      Authorized Signatory
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Invoice footer */}
          <div className="border-t border-slate-200 px-5 py-4 text-center sm:px-8">
            <p className="text-sm font-medium text-slate-600">
              Thank you for your business.
            </p>
          </div>
        </section>

        <div className="h-4 sm:h-6" />
      </div>
    </main>
  );
}

export default BillPreview;