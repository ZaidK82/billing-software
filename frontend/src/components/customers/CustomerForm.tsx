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
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-blue-600"
          >
            ← Customers
          </button>
        </div>

        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditMode ? "Edit Customer" : "Add Customer"}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {isEditMode
              ? "Update the saved customer details."
              : "Save customer details for future bills."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-5 shadow-sm"
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
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

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
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
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
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving || !formData.name.trim()}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
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