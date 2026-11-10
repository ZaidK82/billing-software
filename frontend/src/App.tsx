import {
  useCallback,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";

import type { FormEvent } from "react";

import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Dashboard from "./components/dashboard/Dashboard";
import AppNavbar from "./components/navigation/AppNavbar";
import RouteErrorBoundary from "./components/RouteErrorBoundary";

const BillEditor = lazy(
  () => import("./components/billing/BillEditor"),
);

const BillPreview = lazy(
  () => import("./components/billing/BillPreview"),
);

const BillHistory = lazy(
  () => import("./components/billing/BillHistory"),
);

const CustomerList = lazy(
  () => import("./components/customers/CustomerList"),
);

const CustomerForm = lazy(
  () => import("./components/customers/CustomerForm"),
);

const BusinessProfilePage = lazy(
  () => import("./components/business/BusinessProfile"),
);

const ProductList = lazy(
  () => import("./components/products/ProductList"),
);

const ProductForm = lazy(
  () => import("./components/products/ProductForm"),
);

const SalesReport = lazy(
  () => import("./components/reports/SalesReport"),
);

const InventoryReport = lazy(
  () => import("./components/reports/InventoryReport"),
);

const CustomerReport = lazy(
  () => import("./components/reports/CustomerReport"),
);

const ProfitabilityReport = lazy(
  () => import("./components/reports/ProfitabilityReport"),
);

import {
  createBusiness,
  createCustomer,
  deleteBill,
  getBill,
  getBills,
  getBusinessAssetUrl,
  getBusinessProfile,
  getCurrentUser,
  getCustomers,
  getHealth,
  updateBusinessProfile,
  updateCustomer,
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
  initializeProductStock,
  adjustProductStock,
  getProductStockMovements,
  updateProductStockTracking,
  type BillListItem,
  type BusinessProfile,
  type Customer,
  type SavedBill,
  type Product,
  type CreateProductRequest,
  type InventoryMovement,
} from "./lib/api";

import {
  getSession,
  login,
  logout,
  register,
} from "./lib/auth";

import { supabase } from "./lib/supabase";

type ApiHealth = {
  status: string;
  service: string;
  version: string;
  database_configured: boolean;
};

type CurrentUser = {
  user_id: string;
  business_id: string;
  business_name: string;
  role: string;
  business_created: boolean;
};

const DATA_CACHE_MAX_AGE = 5 * 60 * 1000;
const ASSET_CACHE_MAX_AGE = 55 * 60 * 1000;

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [health, setHealth] =
    useState<ApiHealth | null>(null);

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [business, setBusiness] =
    useState<BusinessProfile | null>(null);

  const [logoUrl, setLogoUrl] =
    useState<string | null>(null);

  const [signatureUrl, setSignatureUrl] =
    useState<string | null>(null);

  const [assetsLoadedAt, setAssetsLoadedAt] =
    useState<number | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [mode, setMode] =
    useState<"login" | "register">("register");

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [authInitializing, setAuthInitializing] =
    useState(true);

  const initializationStarted = useRef(false);

  const assetRefreshInProgress = useRef(false);

  const [savedBill, setSavedBill] =
    useState<SavedBill | null>(null);

  const [isBillLoading, setIsBillLoading] =
    useState(true);

  const [bills, setBills] =
    useState<BillListItem[]>([]);

  const [billsLoadedAt, setBillsLoadedAt] =
    useState<number | null>(null);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [customersLoadedAt, setCustomersLoadedAt] =
    useState<number | null>(null);

  const [isCustomersLoading, setIsCustomersLoading] =
    useState(false);

  const [customersError, setCustomersError] =
    useState<string | null>(null);

  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null);

  const [isEditingCustomerLoading, setIsEditingCustomerLoading] =
    useState(false);

  const [isCustomerSaving, setIsCustomerSaving] =
    useState(false);

  const [customerSaveError, setCustomerSaveError] =
    useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);

  const [productsLoadedAt, setProductsLoadedAt] =
    useState<number | null>(null);

  const [isProductsLoading, setIsProductsLoading] =
    useState(false);

  const [productsError, setProductsError] =
    useState<string | null>(null);

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [isProductSaving, setIsProductSaving] =
    useState(false);

  const [productSaveError, setProductSaveError] =
    useState<string | null>(null);

  const [isBillsLoading, setIsBillsLoading] =
    useState(false);

  const [billsError, setBillsError] =
    useState<string | null>(null);

  useEffect(() => {
    async function initialize() {
      if (initializationStarted.current) {
        return;
      }

      initializationStarted.current = true;

      try {
        const healthData = await getHealth();
        setHealth(healthData);

        const session = await getSession();

        if (!session?.access_token) {
          setCurrentUser(null);
          setBusiness(null);
          return;
        }

        const user = await getCurrentUser(
          session.access_token,
        );

        const businessData =
          await createBusiness(
            session.access_token,
          );

        setCurrentUser({
          ...user,
          business_id:
            businessData.business_id,
          business_name:
            businessData.business_name,
          role: businessData.role,
          business_created:
            businessData.created,
        });

        const profile =
          await getBusinessProfile(
            session.access_token,
          );

        setBusiness(profile);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to initialize application.",
        );
      } finally {
        setAuthInitializing(false);
      }
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT") {
          setCurrentUser(null);
          setBusiness(null);
          setSavedBill(null);
          setEditingCustomer(null);
          setLogoUrl(null);
          setSignatureUrl(null);
          setAssetsLoadedAt(null);
          navigate("/");
          setAuthInitializing(false);
        }
      },
    );
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "register") {
        const data = await register(
          email,
          password,
        );

        if (data.session) {
          const user = await getCurrentUser(
            data.session.access_token,
          );

          const businessData =
            await createBusiness(
              data.session.access_token,
            );

          setCurrentUser({
            ...user,
            business_id:
              businessData.business_id,
            business_name:
              businessData.business_name,
            role: businessData.role,
            business_created:
              businessData.created,
          });

          const profile =
            await getBusinessProfile(
              data.session.access_token,
            );

          setBusiness(profile);
          navigate("/dashboard");

          setMessage(
            "Registration successful.",
          );
        } else {
          setMessage(
            "Registration successful. Check your email to confirm your account, then log in.",
          );
        }
      } else {
        const data = await login(
          email,
          password,
        );

        if (!data.session) {
          throw new Error(
            "Login succeeded but no session was returned.",
          );
        }

        const user = await getCurrentUser(
          data.session.access_token,
        );

        const businessData =
          await createBusiness(
            data.session.access_token,
          );

        setCurrentUser({
          ...user,
          business_id:
            businessData.business_id,
          business_name:
            businessData.business_name,
          role: businessData.role,
          business_created:
            businessData.created,
        });

        const profile =
          await getBusinessProfile(
            data.session.access_token,
          );

        setBusiness(profile);
        navigate("/dashboard");

        setMessage("Login successful.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await logout();

    setCurrentUser(null);
    setBusiness(null);
    setSavedBill(null);
    setEditingCustomer(null);
    setLogoUrl(null);
    setSignatureUrl(null);
    setAssetsLoadedAt(null);
    navigate("/");

      setMessage("Logged out successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to log out.",
      );
    } finally {
      setLoading(false);
    }
  }


  const loadBusinessAssets = useCallback(async (
    forceRefresh = false,
  ): Promise<{
    logoUrl: string | null;
    signatureUrl: string | null;
  }> => {
    const now = Date.now();

    const cacheIsFresh =
      assetsLoadedAt !== null &&
      now - assetsLoadedAt < ASSET_CACHE_MAX_AGE;

    if (!forceRefresh && cacheIsFresh) {
      return {
        logoUrl,
        signatureUrl,
      };
    }

    try {
      const session = await getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      const [logoResult, signatureResult] =
        await Promise.allSettled([
          getBusinessAssetUrl(
            session.access_token,
            "logo",
          ),
          getBusinessAssetUrl(
            session.access_token,
            "signature",
          ),
        ]);

      const nextLogoUrl =
        logoResult.status === "fulfilled"
          ? logoResult.value.url
          : null;

      const nextSignatureUrl =
        signatureResult.status === "fulfilled"
          ? signatureResult.value.url
          : null;

      setLogoUrl(nextLogoUrl);
      setSignatureUrl(nextSignatureUrl);

      if (
        logoResult.status === "fulfilled" &&
        signatureResult.status === "fulfilled"
      ) {
        setAssetsLoadedAt(Date.now());
      } else {
        setAssetsLoadedAt(null);
      }

      return {
        logoUrl: nextLogoUrl,
        signatureUrl: nextSignatureUrl,
      };
    } catch {
      setLogoUrl(null);
      setSignatureUrl(null);
      setAssetsLoadedAt(null);

      return {
        logoUrl: null,
        signatureUrl: null,
      };
    }
  }, [assetsLoadedAt, logoUrl, signatureUrl]);

async function handleAssetLoadError() {
  if (assetRefreshInProgress.current) {
    return;
  }

  assetRefreshInProgress.current = true;

  try {
    await loadBusinessAssets(true);
  } finally {
    assetRefreshInProgress.current = false;
  }
}

  const loadCustomers = useCallback(async (
    forceRefresh = false,
  ): Promise<Customer[] | null> => {
    const now = Date.now();

    const cacheIsFresh =
      customersLoadedAt !== null &&
      now - customersLoadedAt < DATA_CACHE_MAX_AGE;

    if (!forceRefresh && cacheIsFresh) {
      return customers;
    }

    setIsCustomersLoading(true);
    setCustomersError(null);

    try {
      const session = await getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      const savedCustomers =
        await getCustomers(
          session.access_token,
        );

      setCustomers(savedCustomers);
      setCustomersLoadedAt(Date.now());

      return savedCustomers;
    } catch (error) {
      setCustomersError(
        error instanceof Error
          ? error.message
          : "Unable to load customers.",
      );

      return null;
    } finally {
      setIsCustomersLoading(false);
    }
  }, [customersLoadedAt, customers]);

  const loadBills = useCallback(async (
    forceRefresh = false,
  ) => {
    const now = Date.now();

    const cacheIsFresh =
      billsLoadedAt !== null &&
      now - billsLoadedAt < DATA_CACHE_MAX_AGE;

    if (!forceRefresh && cacheIsFresh) {
      return;
    }

    setBillsError(null);

    try {
      const session = await getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      setIsBillsLoading(true);

      const savedBills =
        await getBills(
          session.access_token,
        );

      setBills(savedBills);
      setBillsLoadedAt(Date.now());
    } catch (error) {
      setBillsError(
        error instanceof Error
          ? error.message
          : "Unable to load bills.",
      );
    } finally {
      setIsBillsLoading(false);
    }
  }, [billsLoadedAt]);

  async function handleCreateCustomer(
    customer: {
      name: string;
      phone: string;
      email: string;
      address: string;
    },
  ) {
    setIsCustomerSaving(true);
    setCustomerSaveError(null);

    try {
      const session = await getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      const createdCustomer =
      await createCustomer(
        session.access_token,
        {
          name: customer.name,
          phone: customer.phone || null,
          email: customer.email || null,
          address: customer.address || null,
        },
      );

    setCustomers((previous) => [
      createdCustomer,
      ...previous,
    ]);

    setCustomersLoadedAt(Date.now());

    navigate("/customers");
    } catch (error) {
      setCustomerSaveError(
        error instanceof Error
          ? error.message
          : "Unable to save customer.",
      );
    } finally {
      setIsCustomerSaving(false);
    }
  }

  async function handleUpdateCustomer(
    customer: {
      name: string;
      phone: string;
      email: string;
      address: string;
    },
  ) {
    if (!editingCustomer) {
      return;
    }

    setIsCustomerSaving(true);
    setCustomerSaveError(null);

    try {
      const session = await getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      const updatedCustomer =
        await updateCustomer(
          session.access_token,
          editingCustomer.id,
          {
            name: customer.name,
            phone: customer.phone || null,
            email: customer.email || null,
            address: customer.address || null,
          },
        );

      setCustomers((previous) =>
        previous.map((item) =>
          item.id === updatedCustomer.id
            ? updatedCustomer
            : item,
        ),
      );

      setCustomersLoadedAt(Date.now());

      setEditingCustomer(null);

      navigate("/customers");

    } catch (error) {
      setCustomerSaveError(
        error instanceof Error
          ? error.message
          : "Unable to update customer.",
      );
    } finally {
      setIsCustomerSaving(false);
    }
  }


  const loadProducts = useCallback(async (
    forceRefresh = false,
  ) => {
    const now = Date.now();

    const cacheIsFresh =
      productsLoadedAt !== null &&
      now - productsLoadedAt < DATA_CACHE_MAX_AGE;

    if (!forceRefresh && cacheIsFresh) {
      return;
    }

    setIsProductsLoading(true);
    setProductsError(null);

    try {
      const session = await getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      const savedProducts = await getProducts(
        session.access_token,
      );

      setProducts(savedProducts);
      setProductsLoadedAt(Date.now());
    } catch (err) {
      setProductsError(
        err instanceof Error
          ? err.message
          : "Unable to load products.",
      );
    } finally {
      setIsProductsLoading(false);
    }
  }, [productsLoadedAt]);

  async function handleCreateProduct(
    values: {
      name: string;
      description: string;
      purchase_price: string;
      default_unit_price: string;
      base_unit: string;
      selling_units: Product["selling_units"];
    },
  ) {
    setIsProductSaving(true);
    setProductSaveError(null);

    try {
      const session = await getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      const payload: CreateProductRequest = {
        name: values.name.trim(),
        description: values.description.trim() || null,
        purchase_price:
          values.purchase_price.trim() === ""
            ? null
            : Number(values.purchase_price),
        default_unit_price: Number(values.default_unit_price),
        base_unit: values.base_unit.trim(),
        selling_units: values.selling_units,
      };

      const createdProduct = await createProduct(
        session.access_token,
        payload,
      );

      setProducts((previous) =>
        [...previous, createdProduct].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );

      setProductsLoadedAt(Date.now());
      setEditingProduct(null);
      navigate("/products");
    } catch (err) {
      setProductSaveError(
        err instanceof Error
          ? err.message
          : "Unable to create product.",
      );
    } finally {
      setIsProductSaving(false);
    }
  }

  async function handleUpdateProduct(
    values: {
      name: string;
      description: string;
      purchase_price: string;
      default_unit_price: string;
      base_unit: string;
      selling_units: Product["selling_units"];
    },
  ) {
    if (!editingProduct) {
      return;
    }

    setIsProductSaving(true);
    setProductSaveError(null);

    try {
      const session = await getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      const payload: CreateProductRequest = {
        name: values.name.trim(),
        description: values.description.trim() || null,
        purchase_price:
          values.purchase_price.trim() === ""
            ? null
            : Number(values.purchase_price),
        default_unit_price: Number(values.default_unit_price),
        base_unit: values.base_unit.trim(),
        selling_units: values.selling_units,
      };

      const updatedProduct = await updateProduct(
        session.access_token,
        editingProduct.id,
        payload,
      );

      setProducts((previous) =>
        previous
          .map((item) =>
            item.id === updatedProduct.id
              ? updatedProduct
              : item,
          )
          .sort((a, b) => a.name.localeCompare(b.name)),
      );

      setProductsLoadedAt(Date.now());
      setEditingProduct(null);
      navigate("/products");
    } catch (err) {
      setProductSaveError(
        err instanceof Error
          ? err.message
          : "Unable to update product.",
      );
    } finally {
      setIsProductSaving(false);
    }
  }

  async function handleDeleteProduct(product: Product) {
    const session = await getSession();

    if (!session?.access_token) {
      throw new Error(
        "Your session has expired. Please log in again.",
      );
    }

    await deleteProduct(session.access_token, product.id);

    setProducts((previous) =>
      previous.filter((item) => item.id !== product.id),
    );

    setProductsLoadedAt(Date.now());
  }

  async function handleInitializeProductStock(
    product: Product,
    openingQuantity: number,
    reason: string,
    idempotencyKey: string,
  ): Promise<void> {
    const session = await getSession();

    if (!session?.access_token) {
      throw new Error(
        "Your session has expired. Please log in again.",
      );
    }

    const updatedProduct = await initializeProductStock(
      session.access_token,
      product.id,
      {
        opening_quantity: openingQuantity,
        reason,
        idempotency_key: idempotencyKey,
      },
    );

    setProducts((previous) =>
      previous.map((item) =>
        item.id === updatedProduct.id ? updatedProduct : item,
      ),
    );

    setProductsLoadedAt(Date.now());
    setProductsError(null);
  }

  async function handleAdjustProductStock(
    product: Product,
    quantityDelta: number,
    reason: string,
    idempotencyKey: string,
  ): Promise<void> {
    const session = await getSession();

    if (!session?.access_token) {
      throw new Error(
        "Your session has expired. Please log in again.",
      );
    }

    const updatedProduct = await adjustProductStock(
      session.access_token,
      product.id,
      {
        quantity_delta: quantityDelta,
        reason,
        idempotency_key: idempotencyKey,
      },
    );

    setProducts((previous) =>
      previous.map((item) =>
        item.id === updatedProduct.id ? updatedProduct : item,
      ),
    );

    setProductsLoadedAt(Date.now());
    setProductsError(null);
  }

  async function handleLoadProductStockMovements(
    product: Product,
  ): Promise<InventoryMovement[]> {
    const session = await getSession();

    if (!session?.access_token) {
      throw new Error(
        "Your session has expired. Please log in again.",
      );
    }

    return getProductStockMovements(
      session.access_token,
      product.id,
    );
  }

  async function handleUpdateProductStockTracking(
    product: Product,
    isStockTracked: boolean,
  ): Promise<void> {
    const session = await getSession();

    if (!session?.access_token) {
      throw new Error(
        "Your session has expired. Please log in again.",
      );
    }

    const updatedProduct = await updateProductStockTracking(
      session.access_token,
      product.id,
      isStockTracked,
    );

    setProducts((previous) =>
      previous.map((item) =>
        item.id === updatedProduct.id ? updatedProduct : item,
      ),
    );

    setProductsLoadedAt(Date.now());
    setProductsError(null);
  }


  useEffect(() => {
    if (!currentUser || !business) {
      return;
    }

    let cancelled = false;

    void Promise.resolve().then(() => {
      if (cancelled) {
        return;
      }

      if (
        location.pathname === "/bills" ||
        location.pathname === "/dashboard"
      ) {
        void loadBills();
      }

      const needsCustomers =
        location.pathname === "/dashboard" ||
        location.pathname === "/customers" ||
        location.pathname === "/bills/new" ||
        /^\/bills\/[^/]+\/edit$/.test(location.pathname);

      if (needsCustomers) {
        void loadCustomers();
      }

      const needsProducts =
        location.pathname === "/dashboard" ||
        location.pathname === "/products" ||
        location.pathname === "/products/new" ||
        /^\/products\/[^/]+\/edit$/.test(location.pathname);

      if (needsProducts) {
        void loadProducts();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    currentUser,
    business,
    location.pathname,
    loadBills,
    loadCustomers,
    loadProducts,
  ]);


  useEffect(() => {
    if (!currentUser || !business) {
      return;
    }

    if (location.pathname === "/bills/new") {
      return;
    }

    const match = location.pathname.match(
      /^\/bills\/([^/]+)(?:\/edit)?$/,
    );

    if (!match) {
      return;
    }

    const billId = match[1];

    if (savedBill?.id === billId) {
      return;
    }

    let cancelled = false;

    async function loadBill() {
      setIsBillLoading(true);
      setBillsError(null);

      try {
        const session = await getSession();

        if (cancelled) {
          return;
        }

        if (!session?.access_token) {
          throw new Error(
            "Your session has expired. Please log in again.",
          );
        }

        const [bill, assets] = await Promise.all([
          getBill(
            session.access_token,
            billId,
          ),
          loadBusinessAssets(),
        ]);

        if (cancelled) {
          return;
        }

        setSavedBill(bill);
        setLogoUrl(assets.logoUrl);
        setSignatureUrl(assets.signatureUrl);
      } catch (error) {
        if (!cancelled) {
          setBillsError(
            error instanceof Error
              ? error.message
              : "Unable to load the bill.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsBillLoading(false);
        }
      }
    }

    void loadBill();

    return () => {
      cancelled = true;
    };
  }, [
    currentUser,
    business,
    location.pathname,
    savedBill?.id,
    loadBusinessAssets,
  ]);

  // Load product when directly navigating to product edit.
  useEffect(() => {
    if (!currentUser || !business) {
      return;
    }

    const match = location.pathname.match(
      /^\/products\/([^/]+)\/edit$/,
    );

    if (!match) {
      return;
    }

    const productId = match[1];

    if (editingProduct?.id === productId) {
      return;
    }

    let cancelled = false;

    async function loadEditingProduct() {
      setProductSaveError(null);

      try {
        let product =
          products.find((item) => item.id === productId) ??
          null;

        if (!product) {
          await loadProducts(true);

          if (cancelled) {
            return;
          }

          // Read the refreshed catalogue through the API.
          const session = await getSession();

          if (!session?.access_token) {
            throw new Error(
              "Your session has expired. Please log in again.",
            );
          }

          const loadedProducts = await getProducts(
            session.access_token,
          );

          if (cancelled) {
            return;
          }

          setProducts(loadedProducts);
          setProductsLoadedAt(Date.now());

          product =
            loadedProducts.find(
              (item) => item.id === productId,
            ) ?? null;
        }

        if (!product) {
          throw new Error("Product could not be found.");
        }

        if (!cancelled) {
          setEditingProduct(product);
        }
      } catch (err) {
        if (!cancelled) {
          setProductSaveError(
            err instanceof Error
              ? err.message
              : "Unable to load product.",
          );
        }
      }
    }

    void loadEditingProduct();

    return () => {
      cancelled = true;
    };
  }, [
    currentUser,
    business,
    location.pathname,
    products,
    editingProduct?.id,
    loadProducts,
  ]);

  // Load customer when directly navigating to customer edit.
  useEffect(() => {
    if (!currentUser || !business) {
      return;
    }

    const match = location.pathname.match(
      /^\/customers\/([^/]+)\/edit$/,
    );

    if (!match) {
      return;
    }

    const customerId = match[1];

    if (editingCustomer?.id === customerId) {
      return;
    }

    let cancelled = false;

    async function loadEditingCustomer() {
      setIsEditingCustomerLoading(true);
      setCustomerSaveError(null);

      try {
        let customer =
          customers.find(
            (item) => item.id === customerId,
          ) ?? null;

        if (!customer) {
          const loadedCustomers =
            await loadCustomers();

          if (cancelled) {
            return;
          }

          customer =
            loadedCustomers?.find(
              (item) => item.id === customerId,
            ) ?? null;
        }

        if (!customer) {
          throw new Error(
            "Customer could not be found.",
          );
        }

        if (!cancelled) {
          setEditingCustomer(customer);
        }
      } catch (error) {
        if (!cancelled) {
          setCustomerSaveError(
            error instanceof Error
              ? error.message
              : "Unable to load customer.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsEditingCustomerLoading(false);
        }
      }
    }

    void loadEditingCustomer();

    return () => {
      cancelled = true;
    };
  }, [
    currentUser,
    business,
    location.pathname,
    customers,
    editingCustomer?.id,
    loadCustomers,
  ]);

  if (authInitializing) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="flex min-h-[90vh] items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-medium text-slate-600">
              Loading Billing Software...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (currentUser && business) {
    const navigation = (
      <AppNavbar
        onDashboard={() => {
          navigate("/dashboard");
        }}
        onCreateBill={() => {
          navigate("/bills/new");
        }}
        onBills={() => {
          navigate("/bills");
        }}
        onCustomers={() => {
          navigate("/customers");
        }}
        onReports={() => {
          navigate("/reports");
        }}
        onProducts={() => {
          navigate("/products");
        }}
        onBusinessProfile={() => {
          navigate("/business");
        }}
        onLogout={handleLogout}
      />
    );

    return (
      <>
      {navigation}

      <RouteErrorBoundary>
      <Suspense
        fallback={
          <main className="min-h-screen bg-slate-100 px-4 py-6">
            <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center">
              <p className="text-sm font-medium text-slate-600">
                Loading page...
              </p>
            </div>
          </main>
        }
      >
        <Routes>
          <Route
            path="/"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

          <Route
            path="/dashboard"
            element={
              <Dashboard
                business={business}
                bills={bills}
                customers={customers}
                products={products}
                isBillsLoading={isBillsLoading}
                isCustomersLoading={isCustomersLoading}
                isProductsLoading={isProductsLoading}
                billsError={billsError}
                customersError={customersError}
                productsError={productsError}
                onCreateBill={() => navigate("/bills/new")}
                onBills={() => navigate("/bills")}
                onCustomers={() => navigate("/customers")}
                onProducts={() => navigate("/products")}
                onReports={() => navigate("/reports")}
                onBusinessProfile={() => navigate("/business")}
                onRetryBills={() => void loadBills(true)}
                onRetryCustomers={() => void loadCustomers(true)}
                onRetryProducts={() => void loadProducts(true)}
                onLogout={handleLogout}
              />
            }
          />

          <Route
            path="/reports"
            element={<SalesReport />}
          />
          <Route
            path="/reports/inventory"
            element={<InventoryReport />}
          />
          <Route
            path="/reports/customers"
            element={<CustomerReport />}
          />
          <Route
            path="/reports/profitability"
            element={<ProfitabilityReport />}
          />
          <Route
            path="/business"
            element={
              <BusinessProfilePage
                business={business}
                currentUserRole={currentUser.role}
                saving={false}
                loading={loading}
                message={message}
                error={error}
                onBusinessChange={setBusiness}
                onSubmit={async (event) => {
                  event.preventDefault();

                  setError(null);
                  setMessage(null);

                  try {
                    const session = await getSession();

                    if (!session?.access_token) {
                      throw new Error(
                        "Your session has expired. Please log in again.",
                      );
                    }

                    const updated =
                      await updateBusinessProfile(
                        session.access_token,
                        {
                          name: business.name,
                          phone: business.phone,
                          email: business.email,
                          address: business.address,
                          city: business.city,
                          state: business.state,
                          pincode: business.pincode,
                          gstin: business.gstin,
                          udyam_number: business.udyam_number,
                          logo_path: business.logo_path,
                          signature_path:
                            business.signature_path,
                          terms_and_conditions:
                            business.terms_and_conditions,
                          invoice_columns:
                            business.invoice_columns,
                          invoice_prefix: business.invoice_prefix,
                          next_invoice_number: business.next_invoice_number,
                        },
                      );

                    setBusiness(updated);

                    setCurrentUser((previous) =>
                      previous
                        ? {
                            ...previous,
                            business_name:
                              updated.name,
                          }
                        : previous,
                    );

                    setMessage(
                      "Business profile saved successfully.",
                    );
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Unable to save business profile.",
                    );
                  }
                }}
                onBack={() => {
                  navigate("/dashboard");
                }}
                onBills={() => {
                  navigate("/bills");
                }}
                onCreateBill={() => {
                  navigate("/bills/new");
                }}
                onCustomers={() => {
                  navigate("/customers");
                }}
                onLogout={handleLogout}
              />
            }
          />

          <Route
            path="/bills"
            element={
              <BillHistory
                bills={bills}
                isLoading={isBillsLoading}
                error={billsError}

                onCreateBill={() => {
                  navigate("/bills/new");
                }}

                onBack={() => {
                  navigate("/dashboard");
                }}

                onRefresh={() => {
                  loadBills(true);
                }}

                onDeleteBill={async (billId) => {
                  const session = await getSession();

                  if (!session?.access_token) {
                    throw new Error(
                      "Your session has expired. Please log in again.",
                    );
                  }

                  await deleteBill(session.access_token, billId);

                  // Update the visible history only after server success.
                  setBills((currentBills) =>
                    currentBills.filter((bill) => bill.id !== billId),
                  );

                  // Keep the local cache timestamp consistent with the updated list.
                  setBillsLoadedAt(Date.now());
                  setBillsError(null);
                }}

                onViewBill={async (billId) => {
                  setIsBillLoading(true);

                  try {
                    const session = await getSession();

                    if (!session?.access_token) {
                      throw new Error(
                        "Your session has expired. Please log in again.",
                      );
                    }

                    const [bill, assets] = await Promise.all([
                      getBill(
                        session.access_token,
                        billId,
                      ),
                      loadBusinessAssets(),
                    ]);

                    setSavedBill(bill);

                    setLogoUrl(assets.logoUrl);
                    setSignatureUrl(assets.signatureUrl);

                    setBillsError(null);
                    setIsBillLoading(false);

                    navigate(`/bills/${billId}`);
                  } catch (error) {
                    setIsBillLoading(false);

                    setBillsError(
                      error instanceof Error
                        ? error.message
                        : "Unable to load the bill.",
                    );
                  }
                }}
                onEditBill={(billId) => {
                  navigate(`/bills/${billId}/edit`);
                }}
              />
            }
          />

          <Route
            path="/bills/new"
            element={
              <BillEditor
              business={business}
              customers={customers}
              isLoadingCustomers={isCustomersLoading}
              customerLoadError={customersError}
              onCancel={() => {
                navigate("/dashboard");
              }}
              onSaved={(bill) => {
                const newBillListItem: BillListItem = {
                  id: bill.id,
                  invoice_number: bill.invoice_number,
                  customer_name: bill.customer_name,
                  total: bill.total,
                  created_at: bill.created_at,
                };

                setBills((previous) => [
                  newBillListItem,
                  ...previous.filter(
                    (item) => item.id !== newBillListItem.id,
                  ),
                ]);

                setBillsLoadedAt(Date.now());

                setSavedBill(bill);
                setIsBillLoading(false);
                setMessage(null);
                navigate(`/bills/${bill.id}`);
              }}
            />
            }
          />

          <Route
            path="/bills/:billId/edit"
            element={
              isBillLoading ||
              !savedBill ||
              savedBill.id !== location.pathname.split("/")[2] ? (
                <main className="min-h-screen bg-slate-100 px-4 py-6">
                  <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center">
                    <p className="text-sm font-medium text-slate-600">
                      Loading invoice for editing...
                    </p>
                  </div>
                </main>
              ) : (
                <BillEditor
                  key={savedBill.id}
                  business={business}
                  customers={customers}
                  isLoadingCustomers={isCustomersLoading}
                  customerLoadError={customersError}
                  initialBill={savedBill}
                  onCancel={() => {
                    navigate("/bills");
                  }}
                  onSaved={(bill) => {
                    const updatedBillListItem: BillListItem = {
                      id: bill.id,
                      invoice_number: bill.invoice_number,
                      customer_name: bill.customer_name,
                      total: bill.total,
                      created_at: bill.created_at,
                    };

                    setBills((previous) =>
                      previous.map((item) =>
                        item.id === updatedBillListItem.id
                          ? updatedBillListItem
                          : item,
                      ),
                    );

                    setBillsLoadedAt(Date.now());
                    setSavedBill(bill);
                    setIsBillLoading(false);
                    setBillsError(null);

                    navigate(`/bills/${bill.id}`);
                  }}
                />
              )
            }
          />


          <Route
            path="/bills/:billId"
            element={
              isBillLoading || !savedBill ? (
                <main className="min-h-screen bg-slate-100 px-4 py-6">
                  <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center">
                    <p className="text-sm font-medium text-slate-600">
                      Loading bill...
                    </p>
                  </div>
                </main>
              ) : (
                <BillPreview
                  bill={savedBill}
                  businessName={business.name}
                  logoUrl={logoUrl}
                  signatureUrl={signatureUrl}
                  onRefreshAssets={() => {
                    void handleAssetLoadError();
                  }}
                  businessPhone={business.phone}
                  businessEmail={business.email}
                  businessAddress={business.address}
                  businessCity={business.city}
                  businessState={business.state}
                  businessPincode={business.pincode}
                  businessGstin={business.gstin}
                  businessUdyamNumber={
                    business.udyam_number
                  }
                  onCreateNew={() => {
                    setSavedBill(null);
                    navigate("/bills/new");
                  }}
                  onBack={() => {
                    setSavedBill(null);
                    navigate("/dashboard");
                  }}
                  onBackToBills={() => {
                    navigate("/bills");
                  }}
                />
              )
            }
          />

          <Route
            path="/customers"
            element={
              <CustomerList
                customers={customers}
                isLoading={isCustomersLoading}
                error={customersError}
                onRefresh={() => {
                  loadCustomers(true);
                }}
                onAddCustomer={() => {
                  setCustomerSaveError(null);
                  setEditingCustomer(null);
                  navigate("/customers/new");
                }}
                onEditCustomer={(customer) => {
                  setCustomerSaveError(null);
                  setEditingCustomer(customer);
                  navigate(
                    `/customers/${customer.id}/edit`,
                  );
                }}
                onBack={() => {
                  navigate("/dashboard");
                }}
              />
            }
          />

          <Route
            path="/customers/new"
            element={
              <CustomerForm
                key="new-customer"
                customer={undefined}
                isSaving={isCustomerSaving}
                error={customerSaveError}
                onSubmit={handleCreateCustomer}
                onCancel={() => {
                  setCustomerSaveError(null);
                  setEditingCustomer(null);
                  navigate("/customers");
                }}
              />
            }
          />

          <Route
            path="/customers/:customerId/edit"
            element={
              isEditingCustomerLoading ? (
                <main className="min-h-screen bg-slate-100 px-4 py-6">
                  <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center">
                    <p className="text-sm font-medium text-slate-600">
                      Loading customer...
                    </p>
                  </div>
                </main>
              ) : (
                <CustomerForm
                  key={editingCustomer?.id ?? location.pathname}
                  customer={
                    editingCustomer
                      ? {
                          name: editingCustomer.name,
                          phone:
                            editingCustomer.phone ?? "",
                          email:
                            editingCustomer.email ?? "",
                          address:
                            editingCustomer.address ?? "",
                        }
                      : undefined
                  }
                  isSaving={isCustomerSaving}
                  error={customerSaveError}
                  onSubmit={handleUpdateCustomer}
                  onCancel={() => {
                    setCustomerSaveError(null);
                    setEditingCustomer(null);
                    navigate("/customers");
                  }}
                />
              )
            }
          />


          <Route
            path="/products"
            element={
              <ProductList
                products={products}
                isLoading={isProductsLoading}
                error={productsError}
                onRefresh={() => {
                  void loadProducts(true);
                }}
                onAddProduct={() => {
                  setProductSaveError(null);
                  setEditingProduct(null);
                  navigate("/products/new");
                }}
                onEditProduct={(product) => {
                  setProductSaveError(null);
                  setEditingProduct(product);
                  navigate(`/products/${product.id}/edit`);
                }}
                onDeleteProduct={handleDeleteProduct}
                onInitializeStock={handleInitializeProductStock}
                onAdjustStock={handleAdjustProductStock}
                onLoadStockMovements={handleLoadProductStockMovements}
                onUpdateStockTracking={handleUpdateProductStockTracking}
                onBack={() => {
                  navigate("/dashboard");
                }}
              />
            }
          />

          <Route
            path="/products/new"
            element={
              <ProductForm
                key="new-product"
                product={undefined}
                isSaving={isProductSaving}
                error={productSaveError}
                onSubmit={handleCreateProduct}
                onCancel={() => {
                  setProductSaveError(null);
                  setEditingProduct(null);
                  navigate("/products");
                }}
              />
            }
          />

          <Route
            path="/products/:productId/edit"
            element={
              editingProduct &&
              editingProduct.id ===
                location.pathname.split("/")[2] ? (
                <ProductForm
                  key={editingProduct.id}
                  product={editingProduct}
                  isSaving={isProductSaving}
                  error={productSaveError}
                  onSubmit={handleUpdateProduct}
                  onCancel={() => {
                    setProductSaveError(null);
                    setEditingProduct(null);
                    navigate("/products");
                  }}
                />
              ) : (
                <main className="min-h-screen bg-slate-100 px-4 py-6">
                  <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center">
                    <p className="text-sm font-medium text-slate-600">
                      Loading product...
                    </p>
                  </div>
                </main>
              )
            }
          />


          <Route
            path="*"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />
        </Routes>
        </Suspense>
      </RouteErrorBoundary>
      </>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto flex min-h-[90vh] max-w-md items-center justify-center">
        <section className="w-full rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6 sm:mb-8">
            <p className="text-sm font-medium text-blue-600">
              Billing Software
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              {mode === "register"
                ? "Create your account"
                : "Welcome back"}
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {mode === "register"
                ? "Create an account to start using the billing system."
                : "Log in to continue to your business."}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={
                  mode === "register"
                    ? "new-password"
                    : "current-password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="min-h-11 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : mode === "register"
                  ? "Create account"
                  : "Log in"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(
                  mode === "register"
                    ? "login"
                    : "register",
                );

                setError(null);
                setMessage(null);
              }}
              className="w-full py-2 text-sm font-medium text-blue-600"
            >
              {mode === "register"
                ? "Already have an account? Log in"
                : "Need an account? Register"}
            </button>
          </form>

          {message && (
            <div
              role="status"
              aria-live="polite"
              className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800"
            >
              {message}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {health && (
            <div className="mt-6 border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-500">
                API: {health.status} · Database:{" "}
                {health.database_configured
                  ? "connected"
                  : "not configured"}
              </p>
            </div>
          )}
        </section>
      </div>
      </main>
    );
  }
export default App;
