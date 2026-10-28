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
  quantity: number;
  unit_price: number;
  line_total?: number;
  custom_values: Record<string, unknown>;
  highlight_style: string | null;
};


export type CreateBillRequest = {
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  invoice_columns?: InvoiceColumn[];
  appearance_settings: InvoiceAppearanceSettings;
  items: CreateBillItem[];
};


export type SavedBillItem = {
  id: string;
  product_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: string;
  line_total: string;
  custom_values: Record<string, unknown>;
  highlight_style: string | null;
};

export type SavedBill = {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  subtotal: string;
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


export type Product = {
  id: string;
  name: string;
  description: string | null;
  default_unit_price: string;
  is_stock_tracked: boolean;
  stock_quantity: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateProductRequest = {
  name: string;
  description: string | null;
  default_unit_price: number;
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
  created_at: string;
};

export type InitializeStockRequest = {
  opening_quantity: number;
  reason: string;
  idempotency_key: string;
};

export type AdjustStockRequest = {
  quantity_delta: number;
  reason: string;
  idempotency_key: string;
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