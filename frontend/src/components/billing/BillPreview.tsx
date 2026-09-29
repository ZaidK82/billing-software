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
  console.log("Bill preview terms:", bill.terms_and_conditions);

  const [isDownloading, setIsDownloading] =
    useState(false);

  const [downloadError, setDownloadError] =
    useState<string | null>(null);
  
  const businessLocation = [
    businessCity,
    businessState,
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
          return `₹${Number(
            item.unit_price,
          ).toFixed(2)}`;

        case "line_total":
          return `₹${Number(
            item.line_total,
          ).toFixed(2)}`;

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
          <div className="border-b border-slate-200 p-5 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                {logoUrl && (
                    <div className="mb-4">
                    <img
                        src={logoUrl}
                        alt={`${businessName} logo`}
                        className="max-h-20 max-w-[180px] object-contain"
                    />
                    </div>
                )}

                <h1 className="break-words text-xl font-bold text-slate-900 sm:text-2xl">
                    {businessName}
                </h1>

                {businessPhone && (
                  <p className="mt-2 break-words text-sm text-slate-600">
                    {businessPhone}
                  </p>
                )}

                {businessEmail && (
                <p className="break-words text-sm text-slate-600">
                    {businessEmail}
                </p>
                )}

                {businessGstin && (
                <p className="mt-1 break-words text-sm text-slate-600">
                    GSTIN: {businessGstin}
                </p>
                )}

                {businessUdyamNumber && (
                <p className="break-words text-sm text-slate-600">
                    Udyam No.: {businessUdyamNumber}
                </p>
                )}

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
              </div>

              <div className="shrink-0 sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-sm">
                  Invoice
                </p>

                <p className="mt-1 break-all text-xl font-bold text-slate-900 sm:text-2xl">
                  {bill.invoice_number}
                </p>

                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  {new Date(
                    bill.created_at,
                  ).toLocaleDateString("en-IN")}
                </p>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 p-5 sm:p-6 lg:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Bill To
            </p>

            <p className="mt-2 break-words text-base font-semibold text-slate-900">
              {bill.customer_name}
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

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
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
                            className={`max-w-[240px] break-words px-3 py-4 text-slate-600 first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6 ${
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
          <div className="border-t border-slate-200 p-5 sm:p-6 lg:p-8">
            <div className="ml-auto w-full max-w-xs space-y-2">
              <div className="flex justify-between gap-6 text-sm text-slate-600">
                <span>Subtotal</span>

                <span className="whitespace-nowrap">
                  ₹
                  {Number(
                    bill.subtotal,
                  ).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between gap-6 border-t border-slate-200 pt-3 text-lg font-bold text-slate-900">
                <span>Total</span>

                <span className="whitespace-nowrap">
                  ₹
                  {Number(
                    bill.total,
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-500">
                Amount in Words:
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-700">
                {billAmountInWords}
              </p>
            </div>

            {bill.terms_and_conditions && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Terms & Conditions
                </p>

                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                  {bill.terms_and_conditions}
                </p>
              </div>
            )}

            {signatureUrl && (
              <div className="mt-8 flex justify-end">
                <div className="w-48 text-center">
                  <img
                    src={signatureUrl}
                    alt="Authorized signature"
                    className="mx-auto max-h-20 max-w-full object-contain"
                  />

                  <div className="mt-2 border-t border-slate-300 pt-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Authorized Signatory
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="h-4 sm:h-6" />
      </div>
    </main>
  );
}

export default BillPreview;