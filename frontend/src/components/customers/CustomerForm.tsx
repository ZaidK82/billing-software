
import { useState } from "react";
import type { FormEvent } from "react";

type CustomerFormData = {
  name: string;
  phone: string;
  email: string;
  address: string;
};

type CustomerFormProps = {
  customer?: CustomerFormData;
  isSaving: boolean;
  error: string | null;
  onSubmit: (customer: CustomerFormData) => void;
  onCancel: () => void;
};

function CustomerForm({
  customer,
  isSaving,
  error,
  onSubmit,
  onCancel,
}: CustomerFormProps) {
  const [formData, setFormData] = useState<CustomerFormData>(() => ({
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    address: customer?.address ?? "",
  }));

  function handleChange(
    field: keyof CustomerFormData,
    value: string,
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    onSubmit({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
    });
  }

  const isEditMode = Boolean(customer);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">

        {/* Back navigation */}
        <div className="mb-6">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-ghost btn-sm"
          >
            ← Back to Customers
          </button>
        </div>

        {/* Form card */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Header */}
          <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Customer management
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {isEditMode ? "Edit Customer" : "Add Customer"}
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {isEditMode
                ? "Update the saved customer details."
                : "Save customer details for future invoices."}
            </p>
          </div>

          {/* Form body */}
          <div className="p-5 sm:p-7">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Basic information */}
              <section className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Basic information
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Enter the customer's name and contact details.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="customer-name"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Customer Name *
                  </label>

                  <input
                    id="customer-name"
                    type="text"
                    value={formData.name}
                    onChange={(event) =>
                      handleChange("name", event.target.value)
                    }
                    placeholder="Enter customer name"
                    required
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="customer-phone"
                      className="mb-1.5 block text-sm font-semibold text-slate-700"
                    >
                      Phone
                    </label>

                    <input
                      id="customer-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(event) =>
                        handleChange("phone", event.target.value)
                      }
                      placeholder="Enter phone number"
                      className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="customer-email"
                      className="mb-1.5 block text-sm font-semibold text-slate-700"
                    >
                      Email
                    </label>

                    <input
                      id="customer-email"
                      type="email"
                      value={formData.email}
                      onChange={(event) =>
                        handleChange("email", event.target.value)
                      }
                      placeholder="Enter email address"
                      className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </section>

              {/* Address */}
              <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
                <h2 className="text-base font-bold text-slate-900">
                  Address information
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add the customer's billing or contact address.
                </p>

                <div className="mt-4">
                  <label
                    htmlFor="customer-address"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Address
                  </label>

                  <textarea
                    id="customer-address"
                    value={formData.address}
                    onChange={(event) =>
                      handleChange("address", event.target.value)
                    }
                    placeholder="Enter customer address"
                    rows={4}
                    className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </section>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  <p className="font-semibold">
                    Unable to save customer
                  </p>
                  <p className="mt-1">
                    {error}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSaving}
                  className="btn btn-secondary btn-block sm:w-auto"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving || !formData.name.trim()}
                  className="btn btn-primary btn-block sm:w-auto"
                >
                  {isSaving
                    ? "Saving..."
                    : isEditMode
                      ? "Save Changes"
                      : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export default CustomerForm;
