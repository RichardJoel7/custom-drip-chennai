import type { Metadata } from "next";
import { LabelSheets } from "@/components/admin/label-sheets";
import { MigrationNotice } from "@/components/admin/migration-notice";
import { ShippingLabel } from "@/components/admin/shipping-label";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getOrdersForLabels, getShippingSettings, getStoreContact } from "@/services/shipping";

export const metadata: Metadata = { title: "Print Shipping Labels" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LABELS = 200;

// Outside the dashboard layout on purpose: just the labels and a toolbar that doesn't print.
export default async function PrintLabelsPage({ searchParams }: PageProps<"/admin/print-labels">) {
  await requireAdmin();
  const { ids } = await searchParams;
  const orderIds = [...new Set((Array.isArray(ids) ? ids.join(",") : (ids ?? "")).split(","))]
    .map((id) => id.trim())
    .filter((id) => UUID.test(id))
    .slice(0, MAX_LABELS);

  const [{ shipFrom, ready }, store, orders] = await Promise.all([
    getShippingSettings(),
    getStoreContact(),
    getOrdersForLabels(orderIds),
  ]);

  if (!ready) {
    return (
      <div className="p-6">
        <MigrationNotice file="0017_shipping_labels.sql" />
      </div>
    );
  }

  return (
    <LabelSheets
      orderIds={orders.map((o) => o.id)}
      missingShipFrom={!shipFrom.from_address}
      labels={orders.map((order) => (
        <ShippingLabel
          key={order.id}
          order={order}
          shipFrom={shipFrom}
          storeName={store.store_name}
          storePhone={store.contact_number}
        />
      ))}
    />
  );
}
