const KEY = "bsc-ticket-orders";

export interface RememberedOrder {
  reference: string;
  mobile: string;
}

export function rememberedOrders(): RememberedOrder[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]") as RememberedOrder[];
    return Array.isArray(parsed) ? parsed.filter((item) => item.reference && item.mobile) : [];
  } catch {
    return [];
  }
}

export function rememberOrder(reference: string, mobile: string) {
  const next = [{ reference, mobile }, ...rememberedOrders().filter((item) => item.reference !== reference)].slice(0, 20);
  localStorage.setItem(KEY, JSON.stringify(next));
  sessionStorage.setItem("bsc-active-order", JSON.stringify({ reference, mobile }));
}

export function activeOrder(): RememberedOrder | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem("bsc-active-order") ?? "null") as RememberedOrder | null;
    if (parsed?.reference && parsed.mobile) return parsed;
  } catch {
    /* ignore broken storage */
  }
  return null;
}
