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

export type BusinessProfile = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
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

export type CreateBillItem = {
  item_name: string;
  quantity: number;
  unit_price: number;
};

export type CreateBillRequest = {
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  items: CreateBillItem[];
};

export type SavedBillItem = {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: string;
  line_total: string;
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