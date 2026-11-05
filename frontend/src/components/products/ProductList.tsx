
import { useMemo, useRef, useState } from "react";

import {
  confirmProductPDFImport,
  previewProductPDFImport,
  previewProductExcelImport,
  confirmProductExcelImport,
  type ProductExcelImportDecision,
  type ProductExcelImportProduct,
  type InventoryMovement,
  type Product,
  type ProductPDFImportDecision,
  type ProductPDFImportPreview,
  type ProductPDFImportProduct,
  type ProductExcelImportPreview,
} from "../../lib/api";

import { getSession } from "../../lib/auth";

type ProductListProps = {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => Promise<void>;
  onRefresh: () => void;
  onBack: () => void;
  onInitializeStock: (
    product: Product,
    openingQuantity: number,
    reason: string,
    idempotencyKey: string,
  ) => Promise<void>;
  onAdjustStock: (
    product: Product,
    quantityDelta: number,
    reason: string,
    idempotencyKey: string,
  ) => Promise<void>;
  onLoadStockMovements: (
    product: Product,
  ) => Promise<InventoryMovement[]>;
  onUpdateStockTracking: (
    product: Product,
    isStockTracked: boolean,
  ) => Promise<void>;
};

type StockAction = "initialize" | "adjust";

type PendingStockRequest = {
  productId: string;
  action: StockAction;
  quantity: number;
  reason: string;
  idempotencyKey: string;
};

function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

function ProductList({
  products,
  isLoading,
  error,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onRefresh,
  onBack,
  onInitializeStock,
  onAdjustStock,
  onLoadStockMovements,
  onUpdateStockTracking,
}: ProductListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockAction, setStockAction] = useState<StockAction>("initialize");
  const [stockQuantity, setStockQuantity] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [stockError, setStockError] = useState<string | null>(null);
  const [stockSuccess, setStockSuccess] = useState<string | null>(null);
  const [isStockSaving, setIsStockSaving] = useState(false);
  const [pendingStockRequest, setPendingStockRequest] =
    useState<PendingStockRequest | null>(null);

  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [trackingProductId, setTrackingProductId] =
    useState<string | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] =
    useState<ProductPDFImportPreview | null>(null);
  const [importDecisions, setImportDecisions] = useState<
    Record<number, ProductPDFImportDecision>
  >({});
  const [importSearch, setImportSearch] = useState("");
  const [importFilter, setImportFilter] = useState<
    "all" | "new" | "existing" | "changed" | "review"
  >("all");
  const [isImportPreviewLoading, setIsImportPreviewLoading] =
    useState(false);
  const [isImportConfirming, setIsImportConfirming] =
    useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
    total: number;
  } | null>(null);
  const [excelImportFile, setExcelImportFile] = useState<File | null>(null);
  const [excelImportPreview, setExcelImportPreview] =
    useState<ProductExcelImportPreview | null>(null);
  const [isExcelPreviewLoading, setIsExcelPreviewLoading] = useState(false);
  const [excelImportError, setExcelImportError] = useState<string | null>(null);
  const [excelImportDecisions, setExcelImportDecisions] = useState<
    Record<number, ProductExcelImportDecision>
  >({});

  const [isExcelImportConfirming, setIsExcelImportConfirming] =
    useState(false);

  const [excelImportSuccess, setExcelImportSuccess] =
    useState<string | null>(null);

  const [excelImportResult, setExcelImportResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
    stock_initialized: number;
    total: number;
  } | null>(null);


  function resetProductImport() {
    setImportFile(null);
    setImportPreview(null);
    setImportDecisions({});
    setImportSearch("");
    setImportFilter("all");
    setImportError(null);
    setImportSuccess(null);
    setImportResult(null);

    if (importFileInputRef.current) {
      importFileInputRef.current.value = "";
    }
  }

  async function handlePreviewProductImport() {
    if (!importFile || isImportPreviewLoading) {
      return;
    }

    setIsImportPreviewLoading(true);
    setImportError(null);
    setImportSuccess(null);
    setImportResult(null);
    setImportPreview(null);
    setImportDecisions({});

    try {
      const session = await getSession();

      if (!session?.access_token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const preview = await previewProductPDFImport(
        session.access_token,
        importFile,
      );

      const initialDecisions: Record<
        number,
        ProductPDFImportDecision
      > = {};

      for (const product of preview.products) {
        const safeToUpdate =
          product.match_status === "exact_match" &&
          product.matched_product_id !== null &&
          product.base_unit_matches === true &&
          product.warnings.length === 0;

        initialDecisions[product.serial_number] = {
          serial_number: product.serial_number,
          action: product.match_status === "new" ? "create" : "skip",
          ...(safeToUpdate
            ? { product_id: product.matched_product_id! }
            : {}),
        };
      }

      setImportPreview(preview);
      setImportDecisions(initialDecisions);
    } catch (err) {
      setImportError(
        err instanceof Error
          ? err.message
          : "Unable to preview the PDF.",
      );
    } finally {
      setIsImportPreviewLoading(false);
    }
  }

  async function handlePreviewProductExcelImport() {
    if (!excelImportFile || isExcelPreviewLoading) {
      return;
    }

    setIsExcelPreviewLoading(true);
    setExcelImportError(null);
    setExcelImportPreview(null);
    setExcelImportDecisions({});
    setExcelImportResult(null);
    setExcelImportSuccess(null);

    try {
      const session = await getSession();

      if (!session?.access_token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const preview = await previewProductExcelImport(
        session.access_token,
        excelImportFile,
      );

    const initialDecisions: Record<
      number,
      ProductExcelImportDecision
    > = {};

    for (const product of preview.products) {
      const safeToUpdate =
        product.match_status === "exact_match" &&
        product.matched_product_id !== null &&
        product.base_unit_matches === true &&
        product.warnings.length === 0;

      const safeToCreate =
        product.match_status === "new" &&
        product.base_unit !== null &&
        product.warnings.length === 0;

      initialDecisions[product.serial_number] = {
        serial_number: product.serial_number,
        action: safeToCreate
          ? "create"
          : safeToUpdate
            ? "update"
            : "skip",
        ...(safeToUpdate
          ? { product_id: product.matched_product_id! }
          : {}),
        initialize_stock: false,
      };
    }

    setExcelImportDecisions(initialDecisions);
    setExcelImportResult(null);
    setExcelImportSuccess(null);
    setExcelImportPreview(preview);
    } catch (err) {
      setExcelImportError(
        err instanceof Error
          ? err.message
          : "Unable to preview the Excel file.",
      );
    } finally {
      setIsExcelPreviewLoading(false);
    }
  }

  function updateExcelImportDecision(
    product: ProductExcelImportProduct,
    action: "create" | "update" | "skip",
    productId?: string,
  ) {
    setExcelImportDecisions((current) => ({
      ...current,
      [product.serial_number]: {
        ...current[product.serial_number],
        serial_number: product.serial_number,
        action,
        ...(productId ? { product_id: productId } : {}),
        ...(action !== "update" ? { product_id: undefined } : {}),
        initialize_stock:
          current[product.serial_number]?.initialize_stock ?? false,
      },
    }));
  }

  function applyBulkExcelDecision(action: "create" | "skip") {
    if (!excelImportPreview) return;

    setExcelImportDecisions((current) => {
      const next = { ...current };

      for (const product of excelImportPreview.products) {
        const canCreate =
          product.match_status === "new" &&
          product.base_unit !== null &&
          product.warnings.length === 0;

        next[product.serial_number] = {
          ...next[product.serial_number],
          serial_number: product.serial_number,
          action: action === "create" && canCreate ? "create" : "skip",
          product_id: undefined,
          initialize_stock:
            next[product.serial_number]?.initialize_stock ?? false,
        };
      }

      return next;
    });
  }

  function updateExcelStockDecision(
    product: ProductExcelImportProduct,
    initialize: boolean,
  ) {
    setExcelImportDecisions((current) => {
      const existing = current[product.serial_number];

      return {
        ...current,
        [product.serial_number]: {
          ...existing,
          serial_number: product.serial_number,
          initialize_stock: initialize,
          ...(initialize
            ? {
                stock_idempotency_key:
                  existing?.stock_idempotency_key ??
                  crypto.randomUUID(),
              }
            : {
                stock_idempotency_key: undefined,
              }),
        },
      };
    });
  }

  async function handleConfirmProductExcelImport() {
    if (
      !excelImportFile ||
      !excelImportPreview ||
      isExcelImportConfirming
    ) {
      return;
    }

    const decisions = excelImportPreview.products.map(
      (product) => excelImportDecisions[product.serial_number],
    );

    if (decisions.some((decision) => !decision)) {
      setExcelImportError("Every product needs an import decision.");
      return;
    }

    for (const product of excelImportPreview.products) {
      const decision = excelImportDecisions[product.serial_number];

      if (
        decision.action === "create" &&
        (
          product.match_status !== "new" ||
          !product.base_unit ||
          product.warnings.length > 0
        )
      ) {
        setExcelImportError(
          `Cannot create "${product.name}". Resolve its matching or extraction warnings first.`,
        );
        return;
      }

      if (decision.action === "update") {
        if (!decision.product_id) {
          setExcelImportError(
            `Select an existing catalogue product for "${product.name}".`,
          );
          return;
        }

        const selectedProduct = products.find(
          (item) => item.id === decision.product_id,
        );

        if (!selectedProduct) {
          setExcelImportError(
            `The selected catalogue product for "${product.name}" is no longer available. Refresh the catalogue and try again.`,
          );
          return;
        }

        const isValidCandidate =
          product.match_status === "ambiguous"
            ? product.candidate_product_ids.includes(
                decision.product_id,
              )
            : product.match_status === "exact_match" &&
              product.matched_product_id === decision.product_id;

        if (!isValidCandidate) {
          setExcelImportError(
            `The selected product is not a valid match for "${product.name}".`,
          );
          return;
        }

        const baseUnitsMatch =
          selectedProduct.base_unit?.trim().toLowerCase() ===
          product.base_unit?.trim().toLowerCase();

        const remainingWarnings = product.warnings.filter(
          (warning) =>
            !(
              product.match_status === "ambiguous" &&
              warning ===
                "Multiple existing products have this exact name. Select the correct product manually."
            ),
        );

        if (
          !product.base_unit ||
          !baseUnitsMatch ||
          remainingWarnings.length > 0
        ) {
          setExcelImportError(
            `Cannot update "${product.name}" because its units or extracted data need review.`,
          );
          return;
        }
      }

      if (decision.initialize_stock) {
        if (product.opening_stock === null) {
          setExcelImportError(
            `No opening stock value is available for "${product.name}".`,
          );
          return;
        }

        const selectedProduct =
          decision.action === "update"
            ? products.find(
                (item) => item.id === decision.product_id,
              )
            : null;

        if (
          decision.action === "update" &&
          !selectedProduct
        ) {
          setExcelImportError(
            `The selected product for "${product.name}" could not be found. Refresh the catalogue before importing.`,
          );
          return;
        }

        if (
          selectedProduct &&
          selectedProduct.stock_quantity !== null
        ) {
          setExcelImportError(
            `Stock for "${product.name}" is already initialized. It cannot be overwritten.`,
          );
          return;
        }

        if (decision.action === "skip") {
          setExcelImportError(
            `Skipped product "${product.name}" cannot initialize stock.`,
          );
          return;
        }
      }
    }

    const createCount = decisions.filter(
      (decision) => decision.action === "create",
    ).length;

    const updateCount = decisions.filter(
      (decision) => decision.action === "update",
    ).length;

    const skipCount = decisions.filter(
      (decision) => decision.action === "skip",
    ).length;

    const stockCount = decisions.filter(
      (decision) => decision.initialize_stock,
    ).length;

    const confirmed = window.confirm(
      `Import ${createCount + updateCount} products?\n\n` +
      `Create: ${createCount}\n` +
      `Update: ${updateCount}\n` +
      `Skip: ${skipCount}\n` +
      `Initialize opening stock: ${stockCount}\n\n` +
      "Existing stock balances will not be overwritten.",
    );

    if (!confirmed) {
      return;
    }

    setIsExcelImportConfirming(true);
    setExcelImportError(null);
    setExcelImportSuccess(null);

    try {
      const session = await getSession();

      if (!session?.access_token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const finalDecisions = decisions.map((decision) => {
        if (
          decision.initialize_stock &&
          !decision.stock_idempotency_key
        ) {
          throw new Error(
            "A stock initialization key is missing. Toggle opening stock off and on again before retrying.",
          );
        }

        return decision;
      });

      const result = await confirmProductExcelImport(
        session.access_token,
        excelImportFile,
        finalDecisions,
      );

      setExcelImportResult(result);
      setExcelImportSuccess(
        "Excel product import completed successfully.",
      );

      setExcelImportPreview(null);
      setExcelImportFile(null);
      setExcelImportDecisions({});

      if (excelImportFileInputRef.current) {
        excelImportFileInputRef.current.value = "";
      }

      onRefresh();
    } catch (err) {
      setExcelImportError(
        err instanceof Error
          ? err.message
          : "Excel product import failed.",
      );
    } finally {
      setIsExcelImportConfirming(false);
    }
  }


  function updateImportDecision(
    product: ProductPDFImportProduct,
    action: "create" | "update" | "skip",
    productId?: string,
  ) {
    setImportDecisions((current) => ({
      ...current,
      [product.serial_number]: {
        serial_number: product.serial_number,
        action,
        ...(productId ? { product_id: productId } : {}),
      },
    }));
  }

  function applyBulkPDFDecision(action: "create" | "skip") {
    if (!importPreview) return;

    setImportDecisions((current) => {
      const next = { ...current };

      for (const product of importPreview.products) {
        const canCreate =
          product.match_status === "new" &&
          product.base_unit !== null &&
          product.warnings.length === 0;

        next[product.serial_number] = {
          serial_number: product.serial_number,
          action: action === "create" && canCreate ? "create" : "skip",
        };
      }

      return next;
    });
  }

  async function handleConfirmProductImport() {
    if (
      !importFile ||
      !importPreview ||
      isImportConfirming
    ) {
      return;
    }

    const decisions = importPreview.products.map(
      (product) => importDecisions[product.serial_number],
    );

    if (decisions.some((decision) => !decision)) {
      setImportError("Every product needs an import decision.");
      return;
    }

    const unsafeUpdate = importPreview.products.some((product) => {
      const decision = importDecisions[product.serial_number];

      return (
        decision.action === "update" &&
        (
          product.match_status !== "exact_match" ||
          !decision.product_id ||
          product.base_unit_matches !== true ||
          product.warnings.length > 0
        )
      );
    });

    if (unsafeUpdate) {
      setImportError(
        "Some update decisions need manual review. Resolve their warnings before importing.",
      );
      return;
    }

    const unsafeCreate = importPreview.products.some((product) => {
      const decision = importDecisions[product.serial_number];

      return (
        decision.action === "create" &&
        (
          product.match_status !== "new" ||
          product.base_unit === null ||
          product.warnings.length > 0
        )
      );
    });

    if (unsafeCreate) {
      setImportError(
        "Some new products have extraction warnings or an existing match. Review them before importing.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Import ${decisions.filter((item) => item.action !== "skip").length} products? This will create ${decisions.filter((item) => item.action === "create").length} products and update ${decisions.filter((item) => item.action === "update").length} existing products. Skipped products will remain unchanged.`,
    );

    if (!confirmed) {
      return;
    }

    setIsImportConfirming(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const session = await getSession();

      if (!session?.access_token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const result = await confirmProductPDFImport(
        session.access_token,
        importFile,
        decisions,
      );

      setImportResult(result);
      setImportSuccess("Product PDF import completed successfully.");
      setImportPreview(null);
      setImportFile(null);
      setImportDecisions({});

      if (importFileInputRef.current) {
        importFileInputRef.current.value = "";
      }

      onRefresh();
    } catch (err) {
      setImportError(
        err instanceof Error
          ? err.message
          : "Product import failed.",
      );
    } finally {
      setIsImportConfirming(false);
    }
  }

  const importFileInputRef = useRef<HTMLInputElement>(null);
  const excelImportFileInputRef = useRef<HTMLInputElement>(null);

  const filteredImportProducts = useMemo(() => {
    if (!importPreview) {
      return [];
    }

    return importPreview.products.filter((product) => {
      const query = importSearch.trim().toLowerCase();

      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        String(product.serial_number).includes(query);

      const decision = importDecisions[product.serial_number];

      const hasChangedPrice =
        product.base_price_changed === true ||
        product.purchase_price_changed === true ||
        product.selling_units.some(
          (unit) => unit.price_changed === true,
        );

      const needsReview =
        product.warnings.length > 0 ||
        product.match_status === "ambiguous" ||
        (
          product.match_status === "exact_match" &&
          product.base_unit_matches !== true
        );

      const matchesFilter =
        importFilter === "all" ||
        (importFilter === "new" && product.match_status === "new") ||
        (
          importFilter === "existing" &&
          product.match_status === "exact_match"
        ) ||
        (importFilter === "changed" && hasChangedPrice) ||
        (importFilter === "review" && needsReview);

      return matchesSearch && matchesFilter && decision !== undefined;
    });
  }, [importPreview, importSearch, importFilter, importDecisions]);

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `Delete "${product.name}" from your product catalogue? Existing invoices will not be changed.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(product.id);
    setDeleteError(null);

    try {
      await onDeleteProduct(product);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Unable to delete product.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function openStockForm(product: Product, action: StockAction) {
    setStockProduct(product);
    setStockAction(action);
    setStockQuantity("");
    setStockReason("");
    setStockError(null);
    setStockSuccess(null);
    setPendingStockRequest(null);
    setHistoryProduct(null);
  }

  function closeStockForm() {
    // A failed request may have reached the server. Keep its
    // original payload available for an exact retry.
    if (isStockSaving || pendingStockRequest) {
      return;
    }

    setStockProduct(null);
    setStockError(null);
  }

  async function handleStockSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!stockProduct || isStockSaving) {
      return;
    }

    let request = pendingStockRequest;

    if (request) {
      // A retry must use the exact original payload and key.
      if (
        request.productId !== stockProduct.id ||
        request.action !== stockAction
      ) {
        setStockError(
          "The pending request does not match this product. Close and resolve the pending request first.",
        );
        return;
      }
    } else {
      const quantityText = stockQuantity.trim();
      const quantity = Number(quantityText);
      const reason = stockReason.trim();

      const quantityPattern =
        stockAction === "initialize"
          ? /^\d+(\.\d{1,3})?$/
          : /^-?\d+(\.\d{1,3})?$/;

      if (
        !Number.isFinite(quantity) ||
        !quantityPattern.test(quantityText)
      ) {
        setStockError(
          "Enter a valid quantity with up to 3 decimal places.",
        );
        return;
      }

      if (stockAction === "initialize" && quantity < 0) {
        setStockError("Opening stock cannot be negative.");
        return;
      }

      if (stockAction === "adjust" && quantity === 0) {
        setStockError("Adjustment must be a non-zero quantity.");
        return;
      }

      if (!reason) {
        setStockError("A reason is required.");
        return;
      }

      request = {
        productId: stockProduct.id,
        action: stockAction,
        quantity,
        reason,
        idempotencyKey: createIdempotencyKey(),
      };

      setPendingStockRequest(request);
    }

    setIsStockSaving(true);
    setStockError(null);
    setStockSuccess(null);

    try {
      if (request.action === "initialize") {
        await onInitializeStock(
          stockProduct,
          request.quantity,
          request.reason,
          request.idempotencyKey,
        );
        setStockSuccess("Opening stock initialized successfully.");
      } else {
        await onAdjustStock(
          stockProduct,
          request.quantity,
          request.reason,
          request.idempotencyKey,
        );
        setStockSuccess("Stock adjustment saved successfully.");
      }

      setStockProduct(null);
      setPendingStockRequest(null);

    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to update stock. Retry the same request.";

      setStockError(message);

      // A definitive negative-stock rejection did not apply the
      // adjustment. Allow the user to correct the quantity.
      if (
        request.action === "adjust" &&
        /stock cannot become negative|insufficient stock|negative stock/i.test(
          message,
        )
      ) {
        setPendingStockRequest(null);
      }
    } finally {
      setIsStockSaving(false);
    }

  }

  async function handleToggleStockTracking(product: Product) {
    if (trackingProductId !== null) {
      return;
    }

    const nextTrackingState = !product.is_stock_tracked;

    if (nextTrackingState && product.stock_quantity === null) {
      setTrackingError(
        "Initialize opening stock before enabling stock tracking.",
      );
      return;
    }

    const confirmed = window.confirm(
      nextTrackingState
        ? `Enable stock tracking for "${product.name}"? Future eligible invoice changes will affect its stock balance.`
        : `Disable stock tracking for "${product.name}"? Its current stock balance will be retained.`,
    );

    if (!confirmed) {
      return;
    }

    setTrackingProductId(product.id);
    setTrackingError(null);

    try {
      await onUpdateStockTracking(product, nextTrackingState);
    } catch (err) {
      setTrackingError(
        err instanceof Error
          ? err.message
          : "Unable to update stock tracking.",
      );
    } finally {
      setTrackingProductId(null);
    }
  }

  async function handleLoadHistory(product: Product) {
    setHistoryProduct(product);
    setMovements([]);
    setHistoryError(null);
    setIsHistoryLoading(true);
    setStockProduct(null);

    try {
      const result = await onLoadStockMovements(product);
      setMovements(result);
    } catch (err) {
      setHistoryError(
        err instanceof Error
          ? err.message
          : "Unable to load stock movement history.",
      );
    } finally {
      setIsHistoryLoading(false);
    }
  }

  function formatQuantity(value: string | number) {
    return Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="min-h-10 self-start rounded-lg px-1 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            ← Dashboard
          </button>

          <button
            type="button"
            onClick={onAddProduct}
            className="min-h-11 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:w-auto"
          >
            + Add Product
          </button>
        </div>

        {/* PDF product import */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Import Supplier Price List
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload a PDF to compare supplier prices with your catalogue.
              </p>
            </div>

            {!importPreview && (
              <button
                type="button"
                onClick={() => importFileInputRef.current?.click()}
                className="min-h-10 rounded-lg bg-blue-50 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                Choose PDF
              </button>
            )}
          </div>

          <input
            ref={importFileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(event) => {
              const selectedFile = event.target.files?.[0] ?? null;
              setImportFile(selectedFile);
              setImportPreview(null);
              setImportDecisions({});
              setImportError(null);
              setImportSuccess(null);
              setImportResult(null);
            }}
          />

          {importFile && !importPreview && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="break-all text-sm text-slate-700">
                {importFile.name} · {(importFile.size / 1024 / 1024).toFixed(2)} MB
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={resetProductImport}
                  className="min-h-10 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isImportPreviewLoading}
                  onClick={() => void handlePreviewProductImport()}
                  className="min-h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isImportPreviewLoading ? "Reading PDF..." : "Preview Import"}
                </button>
              </div>
            </div>
          )}

          {importError && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {importError}
            </p>
          )}

          {importSuccess && (
            <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
              <p className="font-semibold">{importSuccess}</p>
              {importResult && (
                <p className="mt-1">
                  Created: {importResult.created} · Updated: {importResult.updated} · Skipped: {importResult.skipped} · Total: {importResult.total}
                </p>
              )}
            </div>
          )}

          {importPreview && (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Review import
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {importPreview.product_count} products · {importPreview.processed_pages} processed pages · Columns: {importPreview.price_columns.join(", ")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetProductImport}
                  disabled={isImportConfirming}
                  className="self-start rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  Discard preview
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  {
                    label: "New",
                    count: importPreview.products.filter((p) => p.match_status === "new").length,
                  },
                  {
                    label: "Existing",
                    count: importPreview.products.filter((p) => p.match_status === "exact_match").length,
                  },
                  {
                    label: "Price changes",
                    count: importPreview.products.filter(
                      (p) =>
                        p.base_price_changed === true ||
                        p.purchase_price_changed === true ||
                        p.selling_units.some((u) => u.price_changed === true),
                    ).length,
                  },
                  {
                    label: "Needs review",
                    count: importPreview.products.filter((p) => p.warnings.length > 0 || p.match_status === "ambiguous" || (p.match_status === "exact_match" && p.base_unit_matches !== true)).length,
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{item.count}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  value={importSearch}
                  onChange={(event) => setImportSearch(event.target.value)}
                  placeholder="Search product name or serial number..."
                  className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
                />

                <select
                  value={importFilter}
                  onChange={(event) => setImportFilter(event.target.value as typeof importFilter)}
                  className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm"
                >
                  <option value="all">All products</option>
                  <option value="new">New products</option>
                  <option value="existing">Existing products</option>
                  <option value="changed">Price changes</option>
                  <option value="review">Needs review</option>
                </select>
              </div>

              <div className="mt-4 space-y-3">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => applyBulkPDFDecision("create")}
                    className="min-h-9 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Create all eligible new products
                  </button>

                  <button
                    type="button"
                    onClick={() => applyBulkPDFDecision("skip")}
                    className="min-h-9 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Skip all
                  </button>
                </div>
                {filteredImportProducts.map((product) => {
                  const decision = importDecisions[product.serial_number];

                  const canUpdate =
                    product.match_status === "exact_match" &&
                    product.matched_product_id !== null &&
                    product.base_unit_matches === true &&
                    product.warnings.length === 0;

                  const canCreate =
                    product.match_status === "new" &&
                    product.base_unit !== null &&
                    product.warnings.length === 0;

                  return (
                    <article
                      key={product.serial_number}
                      className="rounded-xl border border-slate-200 p-3 sm:p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500">
                            #{product.serial_number} · Page {product.source_page}
                          </p>
                          <h4 className="mt-1 break-words font-semibold text-slate-900">
                            {product.name}
                          </h4>
                          <p className="mt-1 text-sm text-slate-600">
                            Base unit: {product.base_unit ?? "Needs review"}
                          </p>
                        </div>

                        <span className={`self-start rounded-full px-2.5 py-1 text-xs font-semibold ${
                          product.match_status === "new"
                            ? "bg-blue-50 text-blue-700"
                            : product.match_status === "exact_match"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-amber-50 text-amber-700"
                        }`}>
                          {product.match_status === "new"
                            ? "New product"
                            : product.match_status === "exact_match"
                              ? "Existing match"
                              : "Ambiguous match"}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-medium text-slate-500">
                            Purchase price
                          </p>

                          <p className="mt-1 text-sm text-slate-800">
                            Supplier:{" "}
                            {product.supplier_purchase_price === null
                              ? "Not provided"
                              : `₹${product.supplier_purchase_price}`}
                          </p>

                          <p className="text-sm text-slate-600">
                            Current:{" "}
                            {product.current_purchase_price === null
                              ? "Not recorded"
                              : `₹${product.current_purchase_price}`}
                          </p>

                          {product.purchase_price_changed && (
                            <p className="mt-1 text-xs font-semibold text-amber-700">
                              Purchase price differs
                            </p>
                          )}
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-medium text-slate-500">
                            Base-unit price
                          </p>
                          <p className="mt-1 text-sm text-slate-800">
                            Supplier: {product.supplier_base_price === null ? "Unavailable" : `₹${product.supplier_base_price}`}
                          </p>
                          <p className="text-sm text-slate-600">
                            Current: {product.current_base_price === null ? "—" : `₹${product.current_base_price}`}
                          </p>
                          {product.base_price_changed && (
                            <p className="mt-1 text-xs font-semibold text-amber-700">
                              Price differs
                            </p>
                          )}
                        </div>

                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-medium text-slate-500">
                            Selling-unit prices
                          </p>
                          {product.selling_units.map((unit) => (
                            <p key={unit.name} className="mt-1 text-sm text-slate-700">
                              {unit.name}: ₹{unit.supplier_rate ?? "—"}
                              {unit.current_rate !== null && (
                                <span className="text-slate-500">
                                  {" "} / current ₹{unit.current_rate}
                                </span>
                              )}
                              {unit.price_changed && (
                                <span className="ml-1 text-xs font-semibold text-amber-700">
                                  Changed
                                </span>
                              )}
                            </p>
                          ))}
                        </div>
                      </div>

                      {product.warnings.length > 0 && (
                        <div className="mt-3 rounded-lg bg-amber-50 p-3">
                          {product.warnings.map((warning, index) => (
                            <p key={index} className="text-xs text-amber-800">
                              {warning}
                            </p>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {canCreate && (
                          <button
                            type="button"
                            onClick={() => updateImportDecision(product, "create")}
                            className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${
                              decision.action === "create"
                                ? "bg-blue-600 text-white"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            Create
                          </button>
                        )}

                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => updateImportDecision(product, "update", product.matched_product_id!)}
                            className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${
                              decision.action === "update"
                                ? "bg-blue-600 text-white"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            Update prices
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => updateImportDecision(product, "skip")}
                          className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${
                            decision.action === "skip"
                              ? "bg-slate-700 text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          Skip
                        </button>
                      </div>
                    </article>
                  );
                })}

                {filteredImportProducts.length === 0 && (
                  <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">
                    No products match this filter.
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">
                  Create: {Object.values(importDecisions).filter((d) => d.action === "create").length} · Update: {Object.values(importDecisions).filter((d) => d.action === "update").length} · Skip: {Object.values(importDecisions).filter((d) => d.action === "skip").length}
                </p>

                <button
                  type="button"
                  disabled={isImportConfirming || importPreview.products.length === 0}
                  onClick={() => void handleConfirmProductImport()}
                  className="min-h-11 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {isImportConfirming ? "Importing..." : "Confirm Import"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Excel product import */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Import Products from Excel
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Preview product prices, purchase prices, and opening stock from an .xlsx file.
              </p>
            </div>

            {!excelImportPreview && (
              <button
                type="button"
                onClick={() => excelImportFileInputRef.current?.click()}
                className="min-h-10 rounded-lg bg-blue-50 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                Choose Excel
              </button>
            )}
          </div>

          <input
            ref={excelImportFileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(event) => {
              setExcelImportFile(event.target.files?.[0] ?? null);
              setExcelImportPreview(null);
              setExcelImportError(null);
            }}
          />

          {excelImportFile && !excelImportPreview && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="break-all text-sm text-slate-700">
                {excelImportFile.name} · {(excelImportFile.size / 1024 / 1024).toFixed(2)} MB
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExcelImportFile(null);
                    setExcelImportError(null);
                    if (excelImportFileInputRef.current) {
                      excelImportFileInputRef.current.value = "";
                    }
                  }}
                  className="min-h-10 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isExcelPreviewLoading}
                  onClick={() => void handlePreviewProductExcelImport()}
                  className="min-h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isExcelPreviewLoading ? "Reading Excel..." : "Preview Excel"}
                </button>
              </div>
            </div>
          )}

          {excelImportError && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {excelImportError}
            </p>
          )}

          {excelImportPreview && (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Excel import preview
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Sheet: {excelImportPreview.sheet_name} · {excelImportPreview.product_count} products
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Price columns: {excelImportPreview.price_columns.join(", ")}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Purchase price column: {excelImportPreview.has_purchase_price_column ? "Present" : "Not provided"}
                    {" · "}
                    Opening stock column: {excelImportPreview.has_opening_stock_column ? "Present" : "Not provided"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setExcelImportPreview(null);
                    setExcelImportFile(null);
                    setExcelImportError(null);
                    if (excelImportFileInputRef.current) {
                      excelImportFileInputRef.current.value = "";
                    }
                  }}
                  className="self-start rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Discard preview
                </button>
              </div>

              {excelImportPreview.warnings.length > 0 && (
                <div className="mt-3 rounded-lg bg-amber-50 p-3">
                  {excelImportPreview.warnings.map((warning, index) => (
                    <p key={index} className="text-sm text-amber-800">
                      {warning}
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-4 space-y-3">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => applyBulkExcelDecision("create")}
                    className="min-h-9 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Create all eligible new products
                  </button>

                  <button
                    type="button"
                    onClick={() => applyBulkExcelDecision("skip")}
                    className="min-h-9 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Skip all
                  </button>
                </div>
                {excelImportPreview.products.map((product) => (
                  <article
                    key={product.serial_number}
                    className="rounded-xl border border-slate-200 p-3 sm:p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs text-slate-500">
                          Row {product.source_row} · #{product.serial_number}
                        </p>
                        <h4 className="mt-1 break-words font-semibold text-slate-900">
                          {product.name}
                        </h4>
                        <p className="mt-1 text-sm text-slate-600">
                          Base unit: {product.base_unit ?? "Needs review"}
                        </p>
                      </div>

                      <span className={`self-start rounded-full px-2.5 py-1 text-xs font-semibold ${
                        product.match_status === "new"
                          ? "bg-blue-50 text-blue-700"
                          : product.match_status === "exact_match"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-amber-50 text-amber-700"
                      }`}>
                        {product.match_status === "new"
                          ? "New product"
                          : product.match_status === "exact_match"
                            ? "Existing match"
                            : "Ambiguous match"}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-500">
                          Purchase price
                        </p>
                        <p className="mt-1 text-sm text-slate-800">
                          Supplier: {product.supplier_purchase_price ?? "Not provided"}
                        </p>
                        <p className="text-sm text-slate-600">
                          Current: {product.current_purchase_price ?? "Not recorded"}
                        </p>
                        {product.purchase_price_changed && (
                          <p className="mt-1 text-xs font-semibold text-amber-700">
                            Purchase price differs
                          </p>
                        )}
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-500">
                          Base-unit price
                        </p>
                        <p className="mt-1 text-sm text-slate-800">
                          Supplier: {product.supplier_base_price ?? "Unavailable"}
                        </p>
                        <p className="text-sm text-slate-600">
                          Current: {product.current_base_price ?? "Not recorded"}
                        </p>
                        {product.base_price_changed && (
                          <p className="mt-1 text-xs font-semibold text-amber-700">
                            Price differs
                          </p>
                        )}
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3 sm:col-span-2">
                        <p className="text-xs font-medium text-slate-500">
                          Selling-unit prices
                        </p>
                        {product.selling_units.map((unit) => (
                          <p key={unit.name} className="mt-1 text-sm text-slate-700">
                            {unit.name}: ₹{unit.supplier_rate ?? "—"}
                            {unit.current_rate !== null && (
                              <span className="text-slate-500">
                                {" "} / current ₹{unit.current_rate}
                              </span>
                            )}
                            {unit.price_changed && (
                              <span className="ml-1 text-xs font-semibold text-amber-700">
                                Price differs
                              </span>
                            )}
                          </p>
                        ))}
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3 sm:col-span-2">
                        <p className="text-xs font-medium text-slate-500">
                          Opening stock
                        </p>
                        <p className="mt-1 text-sm text-slate-800">
                          {product.opening_stock ?? "Not provided"}
                        </p>
                      </div>
                    </div>

                    {product.warnings.length > 0 && (
                      <div className="mt-3 rounded-lg bg-amber-50 p-3">
                        {product.warnings.map((warning, index) => (
                          <p key={index} className="text-xs text-amber-800">
                            {warning}
                          </p>
                        ))}
                      </div>
                    )}

                    {(() => {
                      const decision = excelImportDecisions[product.serial_number];

                      const selectedProduct = decision?.product_id
                        ? products.find((item) => item.id === decision.product_id)
                        : null;

                      const candidateIds =
                        product.match_status === "ambiguous"
                          ? product.candidate_product_ids
                          : product.matched_product_id
                            ? [product.matched_product_id]
                            : [];

                      const canInitializeStock =
                        product.opening_stock !== null &&
                        decision?.action !== "skip" &&
                        (
                          decision?.action === "create" ||
                          (
                            decision?.action === "update" &&
                            selectedProduct?.stock_quantity === null
                          )
                        );

                      return (
                        <div className="mt-4 space-y-3 border-t border-slate-200 pt-3">
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Import decision
                            </p>

                            <div className="flex flex-wrap gap-2">
                              {product.match_status === "new" && (
                                <button
                                  type="button"
                                  onClick={() => updateExcelImportDecision(product, "create")}
                                  className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${
                                    decision?.action === "create"
                                      ? "bg-blue-600 text-white"
                                      : "bg-blue-50 text-blue-700"
                                  }`}
                                >
                                  Create
                                </button>
                              )}

                              {product.match_status !== "new" && (
                                <button
                                  type="button"
                                  disabled={
                                    product.match_status === "exact_match" &&
                                    product.base_unit_matches !== true
                                  }
                                  onClick={() =>
                                    updateExcelImportDecision(
                                      product,
                                      "update",
                                      product.matched_product_id ?? undefined,
                                    )
                                  }
                                  className={`min-h-9 rounded-lg px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                                    decision?.action === "update"
                                      ? "bg-green-600 text-white"
                                      : "bg-green-50 text-green-700"
                                  }`}
                                >
                                  Update
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => updateExcelImportDecision(product, "skip")}
                                className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${
                                  decision?.action === "skip"
                                    ? "bg-slate-700 text-white"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                Skip
                              </button>
                            </div>
                          </div>

                          {product.match_status === "ambiguous" && (
                            <div>
                              <label className="mb-1 block text-sm font-medium text-slate-700">
                                Select the matching catalogue product
                              </label>

                              <select
                                value={decision?.product_id ?? ""}
                                onChange={(event) => {
                                  const productId = event.target.value;

                                  updateExcelImportDecision(
                                    product,
                                    productId ? "update" : "skip",
                                    productId || undefined,
                                  );
                                }}
                                className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                              >
                                <option value="">Choose a product...</option>

                                {candidateIds.map((candidateId) => {
                                  const candidate = products.find(
                                    (item) => item.id === candidateId,
                                  );

                                  return (
                                    <option key={candidateId} value={candidateId}>
                                      {candidate
                                        ? `${candidate.name} · ${candidate.base_unit}`
                                        : candidateId}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          )}

                          {canInitializeStock && (
                            <label className="flex items-start gap-2 rounded-lg bg-amber-50 p-3">
                              <input
                                type="checkbox"
                                checked={decision?.initialize_stock ?? false}
                                onChange={(event) =>
                                  updateExcelStockDecision(product, event.target.checked)
                                }
                                className="mt-1"
                              />

                              <span className="text-sm text-amber-900">
                                <span className="block font-semibold">
                                  Initialize opening stock
                                </span>
                                Record {product.opening_stock} {product.base_unit} as
                                opening stock through the inventory ledger.
                              </span>
                            </label>
                          )}

                          {decision?.action === "update" &&
                            selectedProduct?.stock_quantity !== null &&
                            selectedProduct && (
                              <p className="text-xs text-slate-500">
                                Existing stock: {selectedProduct.stock_quantity}{" "}
                                {selectedProduct.base_unit}. It will be preserved.
                              </p>
                            )}
                        </div>
                      );
                    })()}

                    {product.match_status === "ambiguous" && (
                      <p className="mt-3 text-sm text-amber-800">
                        Multiple catalogue products have this name. Manual matching is required.
                      </p>
                    )}
                  </article>
                ))}
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-600">
                    Create: {Object.values(excelImportDecisions).filter((d) => d.action === "create").length}
                    {" · "}
                    Update: {Object.values(excelImportDecisions).filter((d) => d.action === "update").length}
                    {" · "}
                    Skip: {Object.values(excelImportDecisions).filter((d) => d.action === "skip").length}
                  </p>

                  <button
                    type="button"
                    disabled={
                      isExcelImportConfirming ||
                      excelImportPreview.products.length === 0
                    }
                    onClick={() => void handleConfirmProductExcelImport()}
                    className="min-h-11 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {isExcelImportConfirming
                      ? "Importing..."
                      : "Confirm Excel Import"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {excelImportSuccess && excelImportResult && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <p className="font-semibold">{excelImportSuccess}</p>
            <p className="mt-1">
              Created: {excelImportResult.created}
              {" · "}
              Updated: {excelImportResult.updated}
              {" · "}
              Skipped: {excelImportResult.skipped}
              {" · "}
              Stock initialized: {excelImportResult.stock_initialized}
            </p>
          </div>
        )}

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Product Catalogue
            </h1>
            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Manage reusable products, prices, and stock.
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="min-h-10 self-start rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 sm:self-auto"
          >
            {isLoading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {deleteError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {deleteError}
          </div>
        )}

        {trackingError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {trackingError}
          </div>
        )}

        {stockSuccess && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {stockSuccess}
          </div>
        )}

        {stockProduct && (
          <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              {stockAction === "initialize"
                ? `Set opening stock — ${stockProduct.name}`
                : `Adjust stock — ${stockProduct.name}`}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {stockAction === "initialize"
                ? "This establishes the starting balance and enables stock tracking."
                : "Use a positive quantity to add stock or a negative quantity to remove stock."}
            </p>

            <form onSubmit={handleStockSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="stock-quantity"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  {stockAction === "initialize"
                    ? "Opening quantity"
                    : "Quantity change"}
                </label>
                <input
                  id="stock-quantity"
                  type="number"
                  required
                  min={stockAction === "initialize" ? "0" : undefined}
                  step="0.001"
                  max="99999999999.999"
                  disabled={isStockSaving || Boolean(pendingStockRequest)}
                  value={stockQuantity}
                  onChange={(event) => setStockQuantity(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder={stockAction === "initialize" ? "e.g. 100" : "e.g. 5 or -2"}
                />
              </div>

              <div>
                <label
                  htmlFor="stock-reason"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Reason
                </label>
                <textarea
                  id="stock-reason"
                  required
                  maxLength={500}
                  rows={2}
                  disabled={isStockSaving || Boolean(pendingStockRequest)}
                  value={stockReason}
                  onChange={(event) => setStockReason(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder={
                    stockAction === "initialize"
                      ? "e.g. Initial physical stock count"
                      : "e.g. Damaged goods or stock recount"
                  }
                />
              </div>

              {stockError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {stockError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeStockForm}
                  disabled={isStockSaving || Boolean(pendingStockRequest)}
                  className="min-h-11 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isStockSaving || !stockQuantity.trim() || !stockReason.trim()}
                  className="min-h-11 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isStockSaving
                    ? "Saving..."
                    : pendingStockRequest
                      ? "Retry Same Request"
                      : stockAction === "initialize"
                        ? "Initialize Stock"
                        : "Save Adjustment"}
                </button>
              </div>
            </form>
          </section>
        )}

        {historyProduct && (
          <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Stock movement history
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {historyProduct.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryProduct(null)}
                className="min-h-9 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            {isHistoryLoading && (
              <p className="mt-4 text-sm text-slate-500">
                Loading movement history...
              </p>
            )}

            {historyError && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {historyError}
              </p>
            )}

            {!isHistoryLoading && !historyError && movements.length === 0 && (
              <p className="mt-4 text-sm text-slate-500">
                No stock movements found.
              </p>
            )}

            {movements.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-2 py-3 font-medium">Date</th>
                      <th className="px-2 py-3 font-medium">Type</th>
                      <th className="px-2 py-3 text-right font-medium">Change</th>
                      <th className="px-2 py-3 text-right font-medium">Balance</th>
                      <th className="px-2 py-3 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr key={movement.id} className="border-b border-slate-100">
                        <td className="whitespace-nowrap px-2 py-3 text-slate-600">
                          {new Date(movement.created_at).toLocaleString()}
                        </td>
                        <td className="px-2 py-3 text-slate-700">
                          {movement.movement_type.replaceAll("_", " ")}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-right text-slate-700">
                          {Number(movement.quantity_delta) > 0 ? "+" : ""}
                          {formatQuantity(movement.quantity_delta)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-right font-medium text-slate-900">
                          {formatQuantity(movement.stock_after)}
                        </td>
                        <td className="px-2 py-3 text-slate-600">
                          {movement.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {isLoading && products.length === 0 && !error && (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Loading products...
          </div>
        )}

        {!isLoading && !error && products.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm sm:p-8">
            <p className="font-medium text-slate-900">No products yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Add a product to reuse its name and default price when creating invoices.
            </p>
            <button
              type="button"
              onClick={onAddProduct}
              className="mt-4 min-h-11 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
            >
              Add First Product
            </button>
          </div>
        )}

        {products.length > 0 && (
          <div className="space-y-3">
            {products.map((product) => {
              const initialized = product.stock_quantity !== null;
              const tracked = product.is_stock_tracked;

              return (
                <article
                  key={product.id}
                  className="rounded-2xl bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="break-words font-semibold text-slate-900">
                        {product.name}
                      </h2>

                      {product.description && (
                        <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-600">
                          {product.description}
                        </p>
                      )}

                    <div className="mt-2 space-y-1 text-sm">
                      <p className="font-medium text-slate-800">
                        Selling price: ₹{Number(product.default_unit_price).toFixed(2)} / {product.base_unit}
                      </p>

                      <p className="text-slate-600">
                        Purchase price:{" "}
                        {product.purchase_price !== null
                          ? `₹${Number(product.purchase_price).toFixed(2)} / ${product.base_unit}`
                          : "Not recorded"}
                      </p>
                    </div>

                      <p className="mt-1 text-sm text-slate-600">
                        Base unit: <span className="font-medium">{product.base_unit}</span>
                      </p>

                      {product.selling_units.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-medium text-slate-700">
                            Selling units:
                          </p>

                          {product.selling_units.map((unit) => (
                            <p key={unit.name} className="text-sm text-slate-600">
                              **{unit.name}**
                              {" — "}
                              1 {unit.name} = {unit.factor} {product.base_unit}
                              {" — "}
                              Selling price:{" "}
                              {unit.price !== null && unit.price !== undefined
                                ? `₹${Number(unit.price).toFixed(2)}`
                                : `₹${(Number(product.default_unit_price) * Number(unit.factor)).toFixed(2)} (proportional)`}
                            </p>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 space-y-1 text-sm">
                        <p className="text-slate-700">
                          Stock tracking:{" "}
                          <span className={tracked ? "font-semibold text-green-700" : "font-semibold text-slate-500"}>
                            {tracked ? "Enabled" : "Disabled"}
                          </span>
                        </p>

                        <p className="text-slate-700">
                          Stock balance:{" "}
                          <span className="font-semibold">
                            {initialized
                            ? `${formatQuantity(product.stock_quantity!)} ${product.base_unit}`
                            : "Not initialized"}
                          </span>
                        </p>

                        {!tracked && initialized && (
                          <p className="text-xs text-slate-500">
                            The saved balance is retained; invoice stock deduction is disabled.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onEditProduct(product)}
                        className="min-h-10 rounded-lg px-3 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                      >
                        Edit
                      </button>

                      {product.stock_quantity !== null && (
                        <button
                          type="button"
                          disabled={trackingProductId !== null}
                          onClick={() => void handleToggleStockTracking(product)}
                          className="min-h-10 rounded-lg px-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                        >
                          {trackingProductId === product.id
                            ? "Updating..."
                            : product.is_stock_tracked
                              ? "Disable Tracking"
                              : "Enable Tracking"}
                        </button>
                      )}

                      {!initialized ? (
                        <button
                          type="button"
                          onClick={() => openStockForm(product, "initialize")}
                          className="min-h-10 rounded-lg bg-blue-50 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          Set Opening Stock
                        </button>
                      ) : tracked ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openStockForm(product, "adjust")}
                            className="min-h-10 rounded-lg bg-blue-50 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Adjust Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleLoadHistory(product)}
                            className="min-h-10 rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            View History
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleLoadHistory(product)}
                          className="min-h-10 rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          View History
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={deletingId === product.id}
                        onClick={() => void handleDelete(product)}
                        className="min-h-10 rounded-lg px-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === product.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default ProductList;
