import { useState } from "react";

import { downloadBillPdf } from "../../lib/api";
import { getSession } from "../../lib/auth";
import type { SavedBill } from "../../lib/api";

type BillPreviewProps = {
  bill: SavedBill;
  businessName: string;
  businessPhone: string | null;
  businessEmail: string | null;
  businessAddress: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessPincode: string | null;
  onCreateNew: () => void;
  onBack: () => void;
  onBackToBills: () => void;
};

function BillPreview({
  bill,
  businessName,
  businessPhone,
  businessEmail,
  businessAddress,
  businessCity,
  businessState,
  businessPincode,
  onCreateNew,
  onBack,
  onBackToBills,
}: BillPreviewProps) {
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
                  <th className="px-5 py-3 sm:px-6">
                    Item
                  </th>

                  <th className="px-3 py-3 text-right">
                    Qty
                  </th>

                  <th className="px-3 py-3 text-right">
                    Unit Price
                  </th>

                  <th className="px-5 py-3 text-right sm:px-6">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {bill.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-100"
                  >
                    <td className="max-w-[240px] break-words px-5 py-4 font-medium text-slate-900 sm:px-6">
                      {item.item_name}
                    </td>

                    <td className="px-3 py-4 text-right text-slate-600">
                      {item.quantity}
                    </td>

                    <td className="whitespace-nowrap px-3 py-4 text-right text-slate-600">
                      ₹
                      {Number(
                        item.unit_price,
                      ).toFixed(2)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right font-medium text-slate-900 sm:px-6">
                      ₹
                      {Number(
                        item.line_total,
                      ).toFixed(2)}
                    </td>
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
          </div>
        </section>

        <div className="h-4 sm:h-6" />
      </div>
    </main>
  );
}

export default BillPreview;