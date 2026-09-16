import type { Metadata } from "next";
import { formatDate } from "@/lib/utils/format";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const metadata: Metadata = { title: "Customers" };

interface CustomerRow {
  id: string;
  full_name: string;
  mobile_number: string;
  email: string | null;
  instagram_username: string | null;
  created_at: string;
  orders: { count: number }[];
}

export default async function AdminCustomersPage() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("customers")
    .select("id, full_name, mobile_number, email, instagram_username, created_at, orders(count)")
    .order("created_at", { ascending: false });

  const customers = (data ?? []) as CustomerRow[];

  return (
    <div>
      <h1 className="font-display text-3xl tracking-wide">CUSTOMERS</h1>

      {customers.length === 0 ? (
        <p className="mt-8 text-muted-foreground">No customers yet.</p>
      ) : (
        <div className="mt-6 divide-y divide-border border-t border-border">
          {customers.map((customer) => (
            <div key={customer.id} className="flex items-center justify-between py-4">
              <div>
                <p className="font-semibold">{customer.full_name}</p>
                <p className="text-sm text-muted-foreground">{customer.mobile_number}</p>
                {customer.instagram_username && (
                  <p className="text-sm text-muted-foreground">@{customer.instagram_username}</p>
                )}
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>{customer.orders?.[0]?.count ?? 0} order(s)</p>
                <p>Since {formatDate(customer.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
