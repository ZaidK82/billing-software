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
}: BillPreviewProps) {
  const businessLocation = [
    businessCity,
    businessState,
    businessPincode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-blue-600"
          >
            ← Business Profile
          </button>

          <button
            type="button"
            onClick={onCreateNew}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            New Bill
          </button>
        </div>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {businessName}
                </h1>

                {businessPhone && (
                  <p className="mt-1 text-sm text-slate-600">
                    {businessPhone}
                  </p>
                )}

                {businessEmail && (
                  <p className="text-sm text-slate-600">
                    {businessEmail}
                  </p>
                )}

                {businessAddress && (
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
                    {businessAddress}
                  </p>
                )}

                {businessLocation && (
                  <p className="text-sm text-slate-600">
                    {businessLocation}
                  </p>
                )}
              </div>

              <div className="sm:text-right">
                <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
                  Invoice
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {bill.invoice_number}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {new Date(
                    bill.created_at,
                  ).toLocaleDateString("en-IN")}
                </p>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Bill To
            </p>

            <p className="mt-2 text-base font-semibold text-slate-900">
              {bill.customer_name}
            </p>

            {bill.customer_phone && (
              <p className="mt-1 text-sm text-slate-600">
                {bill.customer_phone}
              </p>
            )}

            {bill.customer_address && (
              <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
                {bill.customer_address}
              </p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">
                    Item
                  </th>

                  <th className="px-3 py-3 text-right">
                    Qty
                  </th>

                  <th className="px-3 py-3 text-right">
                    Unit Price
                  </th>

                  <th className="px-5 py-3 text-right">
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
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {item.item_name}
                    </td>

                    <td className="px-3 py-4 text-right text-slate-600">
                      {item.quantity}
                    </td>

                    <td className="px-3 py-4 text-right text-slate-600">
                      ₹
                      {Number(
                        item.unit_price,
                      ).toFixed(2)}
                    </td>

                    <td className="px-5 py-4 text-right font-medium text-slate-900">
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

          <div className="border-t border-slate-200 p-5">
            <div className="ml-auto max-w-xs space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>

                <span>
                  ₹
                  {Number(
                    bill.subtotal,
                  ).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold text-slate-900">
                <span>Total</span>

                <span>
                  ₹
                  {Number(
                    bill.total,
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default BillPreview;