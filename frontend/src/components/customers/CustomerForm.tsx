import { useEffect, useState } from "react";
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
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
      });
    } else {
      setFormData({
        name: "",
        phone: "",
        email: "",
        address: "",
      });
    }
  }, [customer]);

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
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-5">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-10 rounded-lg px-1 text-sm font-medium text-blue-600 transition hover:bg-blue-50 active:bg-blue-100"
          >
            ← Customers
          </button>
        </div>

        <div className="mb-5 sm:mb-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {isEditMode ? "Edit Customer" : "Add Customer"}
          </h1>

          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            {isEditMode
              ? "Update the saved customer details."
              : "Save customer details for future bills."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="customer-name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
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
                className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="customer-phone"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
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
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="customer-email"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
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
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="customer-address"
                className="mb-1.5 block text-sm font-medium text-slate-700"
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
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="sticky bottom-0 -mx-5 mt-6 flex gap-3 border-t border-slate-100 bg-white p-5 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving || !formData.name.trim()}
              className="min-h-11 flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
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
    </main>
  );
}

export default CustomerForm;