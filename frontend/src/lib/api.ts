const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function getHealth() {
  const response = await fetch(`${API_URL}/health`);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

export async function getCurrentUser(accessToken: string) {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail || `Authentication request failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function createBusiness(accessToken: string) {
  const response = await fetch(`${API_URL}/business`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Business request failed: ${response.status}`,
    );
  }

  return response.json();
}



export type InvoiceAppearanceSettings = {
  invoice_title_size: number;
  business_name_size: number;
  business_details_size: number;
  table_text_size: number;
  logo_width_mm: number;
  logo_height_mm: number;
  signature_width_mm: number;
  signature_height_mm: number;

  customer_title_size: number;
  customer_name_size: number;
  customer_details_size: number;
};



export const DEFAULT_INVOICE_APPEARANCE: InvoiceAppearanceSettings = {
  invoice_title_size: 20,
  business_name_size: 17,
  business_details_size: 9,
  table_text_size: 9,
  logo_width_mm: 45,
  logo_height_mm: 25,
  signature_width_mm: 45,
  signature_height_mm: 25,

  customer_title_size: 8.5,
  customer_name_size: 10,
  customer_details_size: 9,
};



export type InvoiceColumn = {
  key: string;
  label: string;
  type: string;
  source: string;
  position: number;
  required: boolean;
};

export type BusinessProfile = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstin: string | null;
  udyam_number: string | null;
  logo_path: string | null;
  signature_path: string | null;
  terms_and_conditions: string | null;
  invoice_columns: InvoiceColumn[];
  invoice_prefix: string;
  next_invoice_number: number;

};

export async function getBusinessProfile(
  accessToken: string,
): Promise<BusinessProfile> {
  const response = await fetch(`${API_URL}/business`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Business request failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function updateBusinessProfile(
  accessToken: string,
  profile: Omit<BusinessProfile, "id">,
): Promise<BusinessProfile> {
  const response = await fetch(`${API_URL}/business`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Business update failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function deleteBusinessAsset(
  accessToken: string,
  assetType: "logo" | "signature",
): Promise<void> {
  const response = await fetch(
    `${API_URL}/business/${assetType}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Business ${assetType} deletion failed: ${response.status}`,
    );
  }
}

export async function uploadBusinessAsset(
  accessToken: string,
  assetType: "logo" | "signature",
  file: File,
): Promise<{
  asset_type: "logo" | "signature";
  path: string;
}> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/business/${assetType}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Business ${assetType} upload failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function getBusinessAssetUrl(
  accessToken: string,
  assetType: "logo" | "signature",
): Promise<{
  asset_type: "logo" | "signature";
  url: string;
}> {
  const response = await fetch(
    `${API_URL}/business/${assetType}/url`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Business ${assetType} URL request failed: ${response.status}`,
    );
  }

  return response.json();
}

export type CreateBillItem = {
  id?: string;
  item_name: string;
  product_id?: string | null;
  unit_name?: string | null;
  quantity: number;
  unit_price: number;
  line_total?: number;
  custom_values: Record<string, unknown>;
  highlight_style: string | null;
};


export type CreateBillRequest = {
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  shipping_charge: number;
  invoice_columns?: InvoiceColumn[];
  appearance_settings: InvoiceAppearanceSettings;
  items: CreateBillItem[];
};


export type SavedBillItem = {
  id: string;
  product_id: string | null;
  item_name: string;
  quantity: number;
  unit_name: string | null;
  conversion_factor: string | null;
  base_quantity: string | null;
  unit_price: string;
  purchase_price_snapshot: string | null;
  line_total: string;
  custom_values: Record<string, unknown>;
  highlight_style: string | null;
};

export type SavedBill = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  subtotal: string;
  shipping_charge: string;
  total: string;
  created_at: string;
  invoice_columns: InvoiceColumn[];
  appearance_settings: InvoiceAppearanceSettings;
  terms_and_conditions: string | null;
  items: SavedBillItem[];
};

export async function saveBill(
  accessToken: string,
  bill: CreateBillRequest,
): Promise<SavedBill> {
  const response = await fetch(`${API_URL}/bills`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bill),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Bill creation failed: ${response.status}`,
    );
  }

  return response.json();
}


export async function updateBill(
  accessToken: string,
  billId: string,
  bill: CreateBillRequest,
): Promise<SavedBill> {
  const response = await fetch(
    `${API_URL}/bills/${billId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bill),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Bill update failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function correctInvoiceItemPurchaseCost(
  accessToken: string,
  billId: string,
  itemId: string,
  purchasePriceSnapshot: number,
): Promise<SavedBillItem> {
  const response = await fetch(
    `${API_URL}/bills/${billId}/items/${itemId}/purchase-cost`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        purchase_price_snapshot: purchasePriceSnapshot,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Purchase cost correction failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function downloadBillPdf(
  accessToken: string,
  billId: string,
): Promise<Blob> {
  const response = await fetch(
    `${API_URL}/bills/${billId}/pdf`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `PDF download failed: ${response.status}`,
    );
  }

  return response.blob();
}

export type BillListItem = {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  total: string;
  created_at: string;
};

export async function deleteBill(
  accessToken: string,
  billId: string,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/bills/${billId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Bill deletion failed: ${response.status}`,
    );
  }
}

export async function getBills(
  accessToken: string,
): Promise<BillListItem[]> {
  const response = await fetch(`${API_URL}/bills`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Bills request failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function getBill(
  accessToken: string,
  billId: string,
): Promise<SavedBill> {
  const response = await fetch(
    `${API_URL}/bills/${billId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Bill request failed: ${response.status}`,
    );
  }

  return response.json();
}

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerMatchRequest = {
  name?: string | null;
  phone?: string | null;
};

export type CustomerMatchCandidate = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export type CustomerMatchResponse = {
  status: "matched" | "ambiguous" | "not_found";
  match_type: "phone" | "name" | null;
  candidates: CustomerMatchCandidate[];
};

export type CreateCustomerRequest = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export type UpdateCustomerRequest =
  CreateCustomerRequest;

export async function getCustomers(
  accessToken: string,
): Promise<Customer[]> {
  const response = await fetch(
    `${API_URL}/customers`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Customers request failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function matchCustomer(
  accessToken: string,
  payload: CustomerMatchRequest,
): Promise<CustomerMatchResponse> {
  const response = await fetch(
    `${API_URL}/customers/match`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Customer matching failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function createCustomer(
  accessToken: string,
  customer: CreateCustomerRequest,
): Promise<Customer> {
  const response = await fetch(
    `${API_URL}/customers`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(customer),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Customer creation failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function updateCustomer(
  accessToken: string,
  customerId: string,
  customer: UpdateCustomerRequest,
): Promise<Customer> {
  const response = await fetch(
    `${API_URL}/customers/${customerId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(customer),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Customer update failed: ${response.status}`,
    );
  }

  return response.json();
}

export type SellingUnit = {
  name: string;
  factor: number | string;
  price?: number | string | null;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  purchase_price: string | null;
  default_unit_price: string;
  base_unit: string;
  selling_units: SellingUnit[];
  is_stock_tracked: boolean;
  stock_quantity: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductPDFImportUnit = {
  name: string;
  factor_to_base: string | null;
  supplier_rate: string | null;
  current_rate: string | null;
  price_changed: boolean | null;
};

export type ProductPDFImportProduct = {
  serial_number: number;
  name: string;
  source_page: number;
  base_unit: string | null;
  match_status: "new" | "exact_match" | "ambiguous";
  matched_product_id: string | null;
  matched_product_name: string | null;
  candidate_product_ids: string[];
  current_base_unit: string | null;
  supplier_base_price: string | null;
  current_base_price: string | null;
  base_price_changed: boolean | null;
  base_unit_matches: boolean | null;
  selling_units: ProductPDFImportUnit[];
  purchase_price: string | null;
  supplier_purchase_price: string | null;
  current_purchase_price: string | null;
  purchase_price_changed: boolean | null;
  opening_stock: string | null;
  warnings: string[];
};

export type ProductPDFImportPreview = {
  filename: string;
  page_count: number;
  processed_pages: number;
  product_count: number;
  price_columns: string[];
  products: ProductPDFImportProduct[];
  warnings: string[];
};

export type ProductPDFImportDecision = {
  serial_number: number;
  action: "create" | "update" | "skip";
  product_id?: string;
};

export type ProductPDFImportResult = {
  message: string;
  created: number;
  updated: number;
  skipped: number;
  total: number;
};

export type ProductExcelImportUnit = {
  name: string;
  factor_to_base: string | null;
  supplier_rate: string | null;
  current_rate: string | null;
  price_changed: boolean | null;
};

export type ProductExcelImportProduct = {
  serial_number: number;
  name: string;
  source_page: number | null;
  source_row: number;
  base_unit: string | null;
  match_status: "new" | "exact_match" | "ambiguous";
  matched_product_id: string | null;
  matched_product_name: string | null;
  candidate_product_ids: string[];
  current_base_unit: string | null;
  supplier_base_price: string | null;
  current_base_price: string | null;
  base_price_changed: boolean | null;
  base_unit_matches: boolean | null;
  selling_units: ProductExcelImportUnit[];
  purchase_price: string | null;
  supplier_purchase_price: string | null;
  current_purchase_price: string | null;
  purchase_price_changed: boolean | null;
  opening_stock: string | null;
  warnings: string[];
};

export type ProductExcelImportPreview = {
  filename: string;
  sheet_name: string;
  product_count: number;
  price_columns: string[];
  has_purchase_price_column: boolean;
  has_opening_stock_column: boolean;
  products: ProductExcelImportProduct[];
  warnings: string[];
};


export type ProductExcelImportDecision = {
  serial_number: number;
  action: "create" | "update" | "skip";
  product_id?: string;
  initialize_stock?: boolean;
  stock_idempotency_key?: string;
};

export type ProductExcelImportResult = {
  message: string;
  created: number;
  updated: number;
  skipped: number;
  stock_initialized: number;
  total: number;
};


export type ProductMatchRequest = {
  name: string;
};

export type ProductMatchCandidate = {
  id: string;
  name: string;
  purchase_price: number | string | null;
  default_unit_price: number | string;
  base_unit: string;
  selling_units: SellingUnit[];
  is_stock_tracked: boolean;
  stock_quantity: number | string | null;
};

export type ProductMatchResponse = {
  status: "matched" | "ambiguous" | "not_found";
  candidates: ProductMatchCandidate[];
};

export type CreateProductRequest = {
  name: string;
  description: string | null;
  purchase_price: number | null;
  default_unit_price: number;
  base_unit: string;
  selling_units: SellingUnit[];
};

export type UpdateProductRequest = CreateProductRequest;

export async function getProducts(
  accessToken: string,
): Promise<Product[]> {
  const response = await fetch(`${API_URL}/products`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail || `Products request failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function previewProductPDFImport(
  accessToken: string,
  file: File,
): Promise<ProductPDFImportPreview> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/products/import/pdf/preview`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.detail || `PDF preview failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function previewProductExcelImport(
  accessToken: string,
  file: File,
): Promise<ProductExcelImportPreview> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/products/import/excel/preview`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail || `Excel preview failed: ${response.status}`,
    );
  }

  return response.json();
}


export async function confirmProductExcelImport(
  accessToken: string,
  file: File,
  decisions: ProductExcelImportDecision[],
): Promise<ProductExcelImportResult> {
  const formData = new FormData();

  formData.append("file", file);
  formData.append(
    "decisions_json",
    JSON.stringify(decisions),
  );

  const response = await fetch(
    `${API_URL}/products/import/excel/confirm`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Excel import failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function confirmProductPDFImport(
  accessToken: string,
  file: File,
  decisions: ProductPDFImportDecision[],
): Promise<ProductPDFImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("decisions_json", JSON.stringify(decisions));

  const response = await fetch(
    `${API_URL}/products/import/pdf/confirm`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.detail || `PDF import failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function matchProduct(
  accessToken: string,
  payload: ProductMatchRequest,
): Promise<ProductMatchResponse> {
  const response = await fetch(
    `${API_URL}/products/match`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Product matching failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function getProduct(
  accessToken: string,
  productId: string,
): Promise<Product> {
  const response = await fetch(
    `${API_URL}/products/${productId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail || `Product request failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function createProduct(
  accessToken: string,
  product: CreateProductRequest,
): Promise<Product> {
  const response = await fetch(`${API_URL}/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Product creation failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function updateProduct(
  accessToken: string,
  productId: string,
  product: UpdateProductRequest,
): Promise<Product> {
  const response = await fetch(
    `${API_URL}/products/${productId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(product),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Product update failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function deleteProduct(
  accessToken: string,
  productId: string,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/products/${productId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Product deletion failed: ${response.status}`,
    );
  }
}

export type InventoryMovement = {
  id: string;
  business_id: string;
  product_id: string;
  quantity_delta: string | number;
  stock_after: string | number;
  movement_type: string;
  reason: string;
  bill_id: string | null;
  idempotency_key: string | null;
  entered_quantity: string | number | null;
  entered_unit: string | null;
  conversion_factor: string | number | null;
  created_at: string;
};

export type InitializeStockRequest = {
  opening_quantity: number;
  reason: string;
  idempotency_key: string;
  unit_name?: string | null;
};

export type AdjustStockRequest = {
  quantity_delta: number;
  reason: string;
  idempotency_key: string;
  unit_name?: string | null;
};

export async function initializeProductStock(
  accessToken: string,
  productId: string,
  payload: InitializeStockRequest,
): Promise<Product> {
  const response = await fetch(
    `${API_URL}/products/${productId}/stock/initialize`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.detail ||
        `Stock initialization failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function adjustProductStock(
  accessToken: string,
  productId: string,
  payload: AdjustStockRequest,
): Promise<Product> {
  const response = await fetch(
    `${API_URL}/products/${productId}/stock/adjust`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.detail ||
        `Stock adjustment failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function getProductStockMovements(
  accessToken: string,
  productId: string,
): Promise<InventoryMovement[]> {
  const response = await fetch(
    `${API_URL}/products/${productId}/stock/movements`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.detail ||
        `Stock movement history failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function updateProductStockTracking(
  accessToken: string,
  productId: string,
  isStockTracked: boolean,
): Promise<Product> {
  const response = await fetch(
    `${API_URL}/products/${productId}/stock/tracking`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        is_stock_tracked: isStockTracked,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.detail ||
        `Stock tracking update failed: ${response.status}`,
    );
  }

  return response.json();
}

export type SalesTrendPoint = {
  date: string;
  invoice_count: number;
  sales_total: string | number;
};

export type ProductSales = {
  product_id: string;
  item_name: string;
  base_unit_name: string | null;
  quantity: string | number | null;
  sales_total: string | number;
  invoice_count: number;
};

export type SalesReport = {
  start_date: string;
  end_date: string;
  reporting_timezone: string;
  invoice_count: number;
  sales_total: string | number;
  average_invoice_value: string | number;
  trend: SalesTrendPoint[];
  products: ProductSales[];
};

export async function getSalesReport(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<SalesReport> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });

  const response = await fetch(
    `${API_URL}/reports/sales?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Sales report request failed: ${response.status}`,
    );
  }

  return response.json();
}

export type InventoryStockItem = {
  product_id: string;
  product_name: string;
  base_unit: string;
  stock_quantity: string | number | null;
};

export type InventoryMovementSummary = {
  movement_type: string;
  movement_count: number;
};

export type InventoryReportMovement = {
  id: string;
  product_id: string;
  product_name: string;
  movement_type: string;
  quantity_delta: string | number;
  stock_after: string | number;
  reason: string;
  bill_id: string | null;
  created_at: string;
};

export type InventoryReport = {
  start_date: string;
  end_date: string;
  reporting_timezone: string;
  tracked_product_count: number;
  out_of_stock_count: number;
  stock_overview: InventoryStockItem[];
  movement_summary: InventoryMovementSummary[];
  movements: InventoryReportMovement[];
};

export async function getInventoryReport(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<InventoryReport> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });

  const response = await fetch(
    `${API_URL}/reports/inventory?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Inventory report request failed: ${response.status}`,
    );
  }

  return response.json();
}

export type CustomerInsightItem = {
  customer_id: string;
  customer_name: string;
  phone: string | null;
  created_at: string;
  is_new_customer: boolean;
  has_ever_purchased: boolean;
  is_first_time_buyer: boolean;
  invoice_count: number;
  purchase_total: string | number;
  average_invoice_value: string | number;
};

export type CustomerReport = {
  start_date: string;
  end_date: string;
  reporting_timezone: string;
  total_customer_count: number;
  new_customer_count: number;
  first_time_buyer_count: number;
  active_customer_count: number;
  never_purchased_count: number;
  previously_purchased_inactive_count: number;
  customers: CustomerInsightItem[];
};

export async function getCustomerReport(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<CustomerReport> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });

  const response = await fetch(
    `${API_URL}/reports/customers?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Customer report request failed: ${response.status}`,
    );
  }

  return response.json();
}


export interface ProductProfitability {
  product_id: string;
  product_name: string;
  base_unit_name: string | null;
  quantity_sold: number | null;
  invoice_count: number;
  line_count: number;
  revenue: number;
  known_cost_revenue: number;
  known_estimated_cost: number;
  estimated_gross_profit: number | null;
  estimated_gross_margin: number | null;
  missing_cost_line_count: number;
  missing_cost_revenue: number;
  cost_coverage_percentage: number | null;
  profitability_status: "complete" | "partial" | "unavailable";
}

export interface ProfitabilityReport {
  start_date: string;
  end_date: string;
  reporting_timezone: string;
  total_product_count: number;
  complete_cost_product_count: number;
  partial_cost_product_count: number;
  unavailable_cost_product_count: number;
  products: ProductProfitability[];
}


export async function getProfitabilityReport(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<ProfitabilityReport> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });

  const response = await fetch(
    `${API_URL}/reports/profitability?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ||
        `Profitability report request failed: ${response.status}`,
    );
  }

  return response.json();
}
