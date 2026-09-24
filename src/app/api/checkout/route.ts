import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { placeOrderSchema } from "@/lib/validations/checkout";

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
    "A colour, size or print option on one of your custom tees is no longer available. Please design it again.",
  DESIGN_UNAVAILABLE: "A design on one of your custom tees is no longer available. Please pick another design.",
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

  const productItems = input.items.flatMap((item) =>
    item.type === "custom"
      ? []
      : [{ product_id: item.productId, variant_id: item.variantId, quantity: item.quantity }]
  );
  const customItems = input.items.flatMap((item) =>
    item.type === "custom"
      ? [
          {
            size_id: item.sizeId,
            color_id: item.colorId,
            print_option_id: item.printOptionId,
            sides: item.sides,
            front_design_id: item.sides === "back" ? null : item.frontDesignId,
            back_design_id: item.sides === "front" ? null : item.backDesignId,
            quantity: item.quantity,
          },
        ]
      : []
  );

  const { data, error } = await supabase.rpc("place_order", {
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
    p_upi_transaction_id: input.upiTransactionId,
    p_items: productItems,
    p_auth_user_id: user.id,
    // Only sent when needed, so product-only orders keep working on a database that
    // hasn't run 0009_custom_studio.sql yet.
    ...(customItems.length > 0 ? { p_custom_items: customItems } : {}),
  });

  if (error) {
    console.error("place_order failed:", error);
    return NextResponse.json({ error: friendlyMessageFor(error.message) }, { status: 400 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result) {
    return NextResponse.json(
      { error: "Something went wrong while placing your order. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    orderNumber: result.out_order_number,
    trackingToken: result.out_tracking_token,
    total: result.out_total,
  });
}
