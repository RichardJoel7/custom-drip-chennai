// Opens Cashfree's payment page in the browser with their official v3 script, loaded only
// when someone actually pays. https://www.cashfree.com/docs/payments/online/web/redirect
const SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";

type CashfreeFactory = (options: { mode: "sandbox" | "production" }) => {
  checkout: (options: { paymentSessionId: string; redirectTarget?: "_self" | "_blank" | "_top" | "_modal" }) => Promise<unknown>;
};

declare global {
  interface Window {
    Cashfree?: CashfreeFactory;
  }
}

let loading: Promise<CashfreeFactory> | null = null;

function loadSdk(): Promise<CashfreeFactory> {
  if (window.Cashfree) return Promise.resolve(window.Cashfree);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => (window.Cashfree ? resolve(window.Cashfree) : reject(new Error("Cashfree didn't load")));
    script.onerror = () => {
      loading = null;
      reject(new Error("Cashfree didn't load"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Takes the customer to Cashfree to pay; they come back to the order page when it's done. */
export async function openCashfreeCheckout(payment: { sessionId: string; mode: "sandbox" | "production" }) {
  const cashfree = (await loadSdk())({ mode: payment.mode });
  await cashfree.checkout({ paymentSessionId: payment.sessionId, redirectTarget: "_self" });
}
