import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { CATALOG_TAG } from "@/lib/cache";
import { couponErrorMessage, normalizeCouponCode } from "@/lib/coupons/codes";
import { cashfreeConfig } from "@/lib/payments/cashfree";
import { browserOrigin } from "@/lib/seo/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { placeOrderSchema } from "@/lib/validations/checkout";
import { settleStaleOnlinePayments, startOnlinePayment } from "@/services/payments";

const FRIENDLY_ERRORS: Record<string, string> = {
  NO_ITEMS: "Your cart is empty.",
  INVALID_CUSTOMER: "Please enter your name and mobile number.",
  INVALID_EMAIL: "Please enter your email address.",
  INVALID_ADDRESS: "Please enter a complete shipping address.",
  MISSING_UPI_TXN: "Please enter your UPI transaction/reference ID.",
  INVALID_QUANTITY: "One of the items in your cart has an invalid quantity.",
  PRODUCT_UNAVAILABLE: "One of the items in your cart is no longer available.",
  VARIANT_UNAVAILABLE: "One of the selected sizes/colours is no longer available.",
  OUT_OF_STOCK: "One of the items in your cart just sold out. Please update your cart.",
  INVALID_CUSTOM_ITEM: "One of your custom tees is incomplete. Please design it again.",
  CUSTOM_OPTION_UNAVAILABLE:
    "A garment, colour, size, fabric or print option on one of your custom tees is no longer available. Please design it again.",
  DESIGN_UNAVAILABLE: "A design on one of your custom tees is no longer available. Please pick another design.",
  INVALID_PAYMENT_METHOD: "Online payment isn't available right now. Please refresh the page and try again.",
};

function friendlyMessageFor(rawMessage: string): string {
  const code = Object.keys(FRIENDLY_ERRORS).find((key) => rawMessage.includes(key));
  return code
    ? FRIENDLY_ERRORS[code]
    : "Something went wrong while placing your order. Please try again.";
}

export async function POST(request: Request) {
  // Orders now require an account — the /checkout page already redirects signed-out
  // visitors to /login, this is the defense-in-depth check against calling the API directly.
  const authedSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authedSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to place an order." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = placeOrderSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? "Please check the details you entered." },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const supabase = createAdminClient();

  // With Cashfree set up, every order is paid online; without it, by UPI transaction ID.
  const online = cashfreeConfig() !== null;
  if (online !== (input.paymentMethod === "cashfree")) {
    return NextResponse.json(
      { error: "The payment options have changed. Please refresh the page and try again." },
      { status: 409 }
    );
  }
  // Unpaid online orders from earlier give their stock back before this one takes any.
  if (online) await settleStaleOnlinePayments();

  const productItems = input.items.flatMap((item) =>
    item.type === "custom"
      ? []
      : [{ product_id: item.productId, variant_id: item.variantId, quantity: item.quantity }]
  );
  const customItems = input.items.flatMap((item) =>
    item.type === "custom"
      ? [
          {
            garment_id: item.garmentId,
            size_id: item.sizeId,
            color_id: item.colorId,
            gsm_id: item.gsmId ?? null,
            placements: item.placements.map((p) =>
              p.kind === "custom"
                ? { kind: "custom", side: p.side, design_id: p.designId, design_source: p.designSource, rect: p.rect }
                : {
                    kind: "fixed",
                    side: p.side,
                    print_option_id: p.printOptionId,
                    design_id: p.designId,
                    design_source: p.designSource,
                    transform: p.transform,
                  }
            ),
            quantity: item.quantity,
          },
        ]
      : []
  );

  const couponCode = input.couponCode ? normalizeCouponCode(input.couponCode) : "";
  const orderArgs = {
    p_full_name: input.fullName,
    p_mobile_number: input.mobileNumber,
    p_email: input.email || null,
    p_instagram_username: input.instagramUsername || null,
    p_address_line1: input.addressLine1,
    p_address_line2: input.addressLine2 || null,
    p_area: input.area || null,
    p_city: input.city,
    p_state: input.state,
    p_pincode: input.pincode,
    p_order_notes: input.orderNotes || null,
    p_upi_transaction_id: online ? null : input.upiTransactionId,
    p_items: productItems,
    p_auth_user_id: user.id,
    // Only sent when needed, so product-only orders keep working on a database that
    // hasn't run 0009_custom_studio.sql yet.
    ...(customItems.length > 0 ? { p_custom_items: customItems } : {}),
    // Only sent for online payments, so manual UPI keeps working before 0018_online_payments.sql.
    ...(online ? { p_payment_method: "cashfree" } : {}),
  };
  // With a coupon, the same order plus the discount in one transaction (0019_coupons.sql);
  // without one, plain place_order, so checkout works on a database that hasn't run 0019 yet.
  const { data, error } = couponCode
    ? await supabase.rpc("place_order_with_coupon", {
        ...orderArgs,
        p_custom_items: customItems,
        p_payment_method: online ? "cashfree" : "upi_manual",
        p_coupon_code: couponCode,
      })
    : await supabase.rpc("place_order", orderArgs);

  if (error) {
    const couponProblem = couponErrorMessage(error.message);
    if (!couponProblem) console.error("place_order failed:", error);
    return NextResponse.json(
      { error: couponProblem ?? friendlyMessageFor(error.message), ...(couponProblem ? { couponError: true } : {}) },
      { status: 400 }
    );
  }

  // Stock went down: cached product pages refresh in the background on their next visit.
  revalidateTag(CATALOG_TAG, "max");

  const result = Array.isArray(data) ? data[0] : data;
  if (!result) {
    return NextResponse.json(
      { error: "Something went wrong while placing your order. Please try again." },
      { status: 500 }
    );
  }

  if (!online) {
    return NextResponse.json({
      orderNumber: result.out_order_number,
      trackingToken: result.out_tracking_token,
      total: result.out_total,
    });
  }

  const payment = await startOnlinePayment({
    orderId: result.out_order_id,
    customer: { userId: user.id, name: input.fullName, email: input.email, phone: input.mobileNumber },
    origin: browserOrigin(request),
    buyNow: input.source === "buy_now",
  });
  if (!payment) {
    return NextResponse.json(
      { error: "We couldn't start the payment just now. Nothing was charged — please try again in a minute." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    orderNumber: result.out_order_number,
    trackingToken: result.out_tracking_token,
    total: result.out_total,
    payment: { sessionId: payment.sessionId, mode: payment.mode },
  });
}
