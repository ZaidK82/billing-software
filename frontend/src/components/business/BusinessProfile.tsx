import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  getBusinessAssetUrl,
  uploadBusinessAsset,
  type BusinessProfile,
} from "../../lib/api";
import { getSession } from "../../lib/auth";
import InvoiceColumnManager from "./InvoiceColumnManager";

type BusinessProfileProps = {
  business: BusinessProfile;
  currentUserRole: string;
  saving: boolean;
  loading: boolean;
  message: string | null;
  error: string | null;
  onBusinessChange: (
    business: BusinessProfile,
  ) => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void;
  onBack: () => void;
  onBills: () => void;
  onCreateBill: () => void;
  onCustomers: () => void;
  onLogout: () => void;
};

function BusinessProfilePage({
  business,
  currentUserRole,
  saving,
  loading,
  message,
  error,
  onBusinessChange,
  onSubmit,
  onBack,
  onBills,
  onCreateBill,
  onCustomers,
  onLogout,
}: BusinessProfileProps) {
  const [uploadingAsset, setUploadingAsset] = useState<
    "logo" | "signature" | null
  >(null);

  const [uploadError, setUploadError] = useState<string | null>(
    null,
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(true);



    useEffect(() => {
    let cancelled = false;

    async function loadBusinessAssets() {
      setLoadingAssets(true);
      setUploadError(null);

      try {
        const session = await getSession();

        if (!session?.access_token) {
          throw new Error(
            "Your session has expired. Please log in again.",
          );
        }

        const [logoResult, signatureResult] =
          await Promise.all([
            business.logo_path
              ? getBusinessAssetUrl(
                  session.access_token,
                  "logo",
                )
              : Promise.resolve(null),

            business.signature_path
              ? getBusinessAssetUrl(
                  session.access_token,
                  "signature",
                )
              : Promise.resolve(null),
          ]);

        if (cancelled) {
          return;
        }

        setLogoUrl(logoResult?.url ?? null);
        setSignatureUrl(signatureResult?.url ?? null);
      } catch (assetError) {
        if (!cancelled) {
          setUploadError(
            assetError instanceof Error
              ? assetError.message
              : "Unable to load business images.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingAssets(false);
        }
      }
    }

    void loadBusinessAssets();

    return () => {
      cancelled = true;
    };
  }, [business.logo_path, business.signature_path]);



  function updateBusiness(
    changes: Partial<BusinessProfile>,
  ) {
    onBusinessChange({
      ...business,
      ...changes,
    });
  }

  async function handleAssetUpload(
    assetType: "logo" | "signature",
    file: File,
  ) {
    setUploadingAsset(assetType);
    setUploadError(null);

    try {
      const session = await getSession();

      if (!session?.access_token) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const result = await uploadBusinessAsset(
        session.access_token,
        assetType,
        file,
      );

      const assetUrl = await getBusinessAssetUrl(
        session.access_token,
        assetType,
      );

      if (assetType === "logo") {
        setLogoUrl(assetUrl.url);
      } else {
        setSignatureUrl(assetUrl.url);
      }

      updateBusiness(
        assetType === "logo"
          ? { logo_path: result.path }
          : { signature_path: result.path },
      );
    } catch (uploadError) {
      setUploadError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload image.",
      );
    } finally {
      setUploadingAsset(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6 lg:p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onBack}
                className="min-h-10 rounded-lg px-1 text-sm font-medium text-blue-600 transition hover:bg-blue-50 active:bg-blue-100"
              >
                ← Dashboard
              </button>
            </div>

            <p className="mt-5 text-sm font-medium text-blue-600">
              Billing Software
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Business Profile
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Enter the business details that will
              appear on your invoices.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={onBills}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:bg-slate-100"
              >
                Bills
              </button>

              <button
                type="button"
                onClick={onCreateBill}
                className="min-h-11 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 active:bg-slate-950"
              >
                Create Bill
              </button>

              <button
                type="button"
                onClick={onCustomers}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:bg-slate-100"
              >
                Customers
              </button>
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="business-name"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Business Name *
              </label>

              <input
                id="business-name"
                type="text"
                required
                value={business.name}
                onChange={(event) =>
                  updateBusiness({
                    name: event.target.value,
                  })
                }
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="My Business"
              />
            </div>

            <div>
              <label
                htmlFor="business-phone"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Phone
              </label>

              <input
                id="business-phone"
                type="tel"
                value={business.phone ?? ""}
                onChange={(event) =>
                  updateBusiness({
                    phone: event.target.value,
                  })
                }
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="9876543210"
              />
            </div>

            <div>
              <label
                htmlFor="business-email"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Email
              </label>

              <input
                id="business-email"
                type="email"
                value={business.email ?? ""}
                onChange={(event) =>
                  updateBusiness({
                    email: event.target.value,
                  })
                }
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="business@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="business-address"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Address
              </label>

              <textarea
                id="business-address"
                rows={3}
                value={business.address ?? ""}
                onChange={(event) =>
                  updateBusiness({
                    address: event.target.value,
                  })
                }
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="Shop / office address"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="business-city"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  City
                </label>

                <input
                  id="business-city"
                  type="text"
                  value={business.city ?? ""}
                  onChange={(event) =>
                    updateBusiness({
                      city: event.target.value,
                    })
                  }
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Mumbai"
                />
              </div>

              <div>
                <label
                  htmlFor="business-state"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  State
                </label>

                <input
                  id="business-state"
                  type="text"
                  value={business.state ?? ""}
                  onChange={(event) =>
                    updateBusiness({
                      state: event.target.value,
                    })
                  }
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Maharashtra"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="business-pincode"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Pincode
              </label>

              <input
                id="business-pincode"
                type="text"
                inputMode="numeric"
                value={business.pincode ?? ""}
                onChange={(event) =>
                  updateBusiness({
                    pincode: event.target.value,
                  })
                }
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="400001"
              />
            </div>

            <div>
              <label
                htmlFor="business-gstin"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                GSTIN
              </label>

              <input
                id="business-gstin"
                type="text"
                value={business.gstin ?? ""}
                onChange={(event) =>
                  updateBusiness({
                    gstin: event.target.value,
                  })
                }
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="22AAAAA0000A1Z5"
              />
            </div>

            <div>
              <label
                htmlFor="business-udyam"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Udyam Number
              </label>

              <input
                id="business-udyam"
                type="text"
                value={business.udyam_number ?? ""}
                onChange={(event) =>
                  updateBusiness({
                    udyam_number: event.target.value,
                  })
                }
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="UDYAM-MH-00-0000000"
              />
            </div>

            <div>
              <label
                htmlFor="business-terms"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Terms & Conditions
              </label>

              <textarea
                id="business-terms"
                rows={6}
                value={business.terms_and_conditions ?? ""}
                onChange={(event) =>
                  updateBusiness({
                    terms_and_conditions: event.target.value,
                  })
                }
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Enter the terms and conditions that should appear on your invoices."
              />

              <p className="mt-1 text-xs text-slate-500">
                These terms will be displayed on your invoices.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="min-h-11 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Save Business Profile"}
            </button>
          </form>

          <section className="mt-6 border-t border-slate-200 pt-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Invoice Branding
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Upload the logo and signature that should appear on your
              invoices.
            </p>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-200 p-4">
                <label
                  htmlFor="business-logo"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Business Logo
                </label>

                <p className="mt-1 text-xs text-slate-500">
                  PNG, JPEG, or WebP. Maximum size: 2 MB.
                </p>

                <div className="mt-4 flex min-h-28 items-center justify-center rounded-xl bg-slate-50 p-4">
                  {loadingAssets ? (
                    <p className="text-sm text-slate-500">
                      Loading logo...
                    </p>
                  ) : logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Business logo"
                      className="max-h-24 max-w-full object-contain"
                    />
                  ) : (
                    <p className="text-sm text-slate-400">
                      No logo uploaded
                    </p>
                  )}
                </div>

                <input
                  id="business-logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploadingAsset !== null}
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                      void handleAssetUpload("logo", file);
                    }

                    event.target.value = "";
                  }}
                  className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                />

                {uploadingAsset === "logo" && (
                  <p className="mt-2 text-sm text-blue-600">
                    Uploading logo...
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <label
                  htmlFor="business-signature"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Authorized Signature
                </label>

                <p className="mt-1 text-xs text-slate-500">
                  PNG, JPEG, or WebP. Maximum size: 2 MB.
                </p>

                <div className="mt-4 flex min-h-28 items-center justify-center rounded-xl bg-slate-50 p-4">
                  {loadingAssets ? (
                    <p className="text-sm text-slate-500">
                      Loading signature...
                    </p>
                  ) : signatureUrl ? (
                    <img
                      src={signatureUrl}
                      alt="Authorized signature"
                      className="max-h-24 max-w-full object-contain"
                    />
                  ) : (
                    <p className="text-sm text-slate-400">
                      No signature uploaded
                    </p>
                  )}
                </div>

                <input
                  id="business-signature"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploadingAsset !== null}
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                      void handleAssetUpload(
                        "signature",
                        file,
                      );
                    }

                    event.target.value = "";
                  }}
                  className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                />

                {uploadingAsset === "signature" && (
                  <p className="mt-2 text-sm text-blue-600">
                    Uploading signature...
                  </p>
                )}
              </div>
            </div>

            {uploadError && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {uploadError}
              </div>
            )}
          </section>

          <InvoiceColumnManager
            business={business}
            onBusinessChange={onBusinessChange}
          />

          {message && (
            <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 border-t border-slate-200 pt-4">
            <div className="mb-4 text-xs text-slate-500">
              Signed in as {currentUserRole}
            </div>

            <button
              type="button"
              onClick={onLogout}
              disabled={loading}
              className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Logging out..."
                : "Log out"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default BusinessProfilePage;