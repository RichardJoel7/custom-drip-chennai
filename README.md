# Custom Drip Chennai

A mobile-first ecommerce site for **Custom Drip Chennai**, a Chennai-based T-shirt brand. Customers browse, pick a size/colour, check out, and pay via UPI (manually verified) — no payment gateway required. Admins manage products, orders, and store settings from a simple `/admin` panel.

This README is for the **developer** setting up and deploying the project. If you're the non-technical co-founder managing the store day-to-day, read [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) instead.

## Tech Stack

- **Frontend:** Next.js 16 (App Router, TypeScript, React 19)
- **Styling:** Tailwind CSS v4
- **Database + Auth + Storage:** Supabase
- **Hosting:** Vercel
- **Payment:** Manual UPI (no payment gateway) — customer pays via UPI and enters a transaction ID, admin verifies manually

Total monthly cost at small scale: **₹0** (Supabase free tier + Vercel free tier).

## Project Structure

```
src/
  app/
    (site)/          customer-facing pages (home, shop, product, cart, checkout, ...)
    admin/            admin panel (login page outside the auth-gate; (dashboard) group inside it)
    api/checkout/     the one API route — validated, atomic order creation
  components/
    ui/               buttons, inputs, badges, toggle — shared primitives
    layout/           header, footer
    products/         product card/grid/gallery/purchase panel
    cart/             cart context (localStorage) + cart UI
    checkout/         checkout form + UPI payment panel
    admin/            admin-only components (product form, image uploader, order tools)
    track/            order tracking timeline
  lib/
    supabase/         browser client, server (SSR) client, service-role client, admin-check
    validations/      zod schemas
    utils/            formatting, slugs, image compression, cn()
  services/           server-side data-access functions (products, orders, settings, stats)
  types/               shared TypeScript types
supabase/
  migrations/          SQL migrations — run these against your Supabase project, in order
  seed/                OPTIONAL demo product data for local testing (never for production)
```

## How Orders Actually Get Created (important)

The browser never decides a price, never touches the database directly, and never bypasses stock checks. Checkout POSTs to `/api/checkout`, which (using the server-only service-role key) calls a single Postgres function, `place_order()` (see `supabase/migrations/0002_functions.sql`). That function, in one transaction:

1. Re-reads the real price from `products` (ignores anything the browser sent).
2. Locks the specific size/colour variant row and checks live stock.
3. Rejects the order if the product is inactive, the variant doesn't exist, or stock is insufficient.
4. Decrements stock, computes shipping from `settings`, and creates the order + order items.

This means stock can never be oversold by two simultaneous checkouts, and no one can tamper with a price from devtools.

Order tracking works without customer accounts: every order gets a random `tracking_token` (not the sequential order number), and `/track/[token]` is the only way to view an order's status as a guest — guessing another customer's order number reveals nothing.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase project's values:

| Variable | Where to find it | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → Project API keys → `anon` `public` | Public — RLS protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → Project API keys → `service_role` | **Secret.** Server-only. Never expose to the browser. Only used in `src/lib/supabase/admin.ts`, checkout, and order tracking. |
| `NEXT_PUBLIC_SITE_URL` | Your deployed domain (e.g. `https://customdripchennai.in`) | Used for SEO/sitemap/OG tags. Use `http://localhost:3000` locally. |
| `GMAIL_USER` | The Gmail/Workspace address emails are sent from, e.g. `customdripchennai@gmail.com` | Optional. Enables automatic "payment confirmed" and "order shipped" emails. App works fine without it — emails are just skipped. |
| `GMAIL_APP_PASSWORD` | [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (requires 2-Step Verification on that account) | Optional, required alongside `GMAIL_USER`. Never your real Gmail login password. |
| `GMAIL_FROM_NAME` | Any display name, e.g. `Custom Drip Chennai` | Optional. Defaults to "Custom Drip Chennai". The address itself always matches `GMAIL_USER` — Gmail blocks sending from any other address. |

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account/project.
2. Once created, grab the URL and keys from **Project Settings → API** and put them in `.env.local`.

## 2. Set Up the Database

Run the SQL migrations **in order** against your project. Easiest way: open the Supabase dashboard's **SQL Editor** and paste/run each file in `supabase/migrations/` in filename order (`0001_tables.sql`, `0002_functions.sql`, `0003_rls.sql`, `0004_storage.sql`).

Alternatively, with the [Supabase CLI](https://supabase.com/docs/guides/cli) installed and linked to your project:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

This creates all tables, the `place_order()` function, Row Level Security policies, and the `product-images` storage bucket.

### (Optional) Load demo products

For local testing only — **do not run this against your real production project** unless you want placeholder demo data you'll delete later. Run `supabase/seed/demo_products.sql` the same way (SQL Editor or `psql`). Demo products are flagged `is_demo = true` in the database; delete them anytime from **Admin → Products**, or with:

```sql
delete from products where is_demo = true;
```

## 3. Configure Supabase Auth + Create Your Admin User

Customers never need an account (guest checkout only). Only the `admins` table controls who can access `/admin`.

1. In the Supabase dashboard, go to **Authentication → Users → Add User** and create a user with your email and a password (or have them sign up once via Supabase Auth's API and confirm the email).
2. Copy that user's UUID (shown in the Users list).
3. In the **SQL Editor**, run:

```sql
insert into admins (id, email, full_name)
values ('paste-the-user-uuid-here', 'you@example.com', 'Your Name');
```

That's it — that email can now log in at `/admin/login`. Repeat for your co-founder's account. To revoke access, delete their row from `admins` (their login will still work, but every admin page and action checks this table and will redirect them to the login screen).

## 4. Run Locally

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the storefront and [http://localhost:3000/admin](http://localhost:3000/admin) for the admin panel.

**Developing against a local Supabase instance instead of a hosted project?** The Supabase CLI (`npx supabase start`, requires Docker) works fine — `next.config.ts` already allows loading images from `127.0.0.1` when your `NEXT_PUBLIC_SUPABASE_URL` points there.

## 5. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in [Vercel](https://vercel.com/new).
3. Add the environment variables from `.env.example` in the Vercel project settings (set `NEXT_PUBLIC_SITE_URL` to your real domain).
4. Deploy. Every push to your main branch redeploys automatically.
5. To connect `customdripchennai.in` (or any domain) later: Vercel Project → Settings → Domains → Add.

## 6. (Optional) Set Up Order Email Notifications

Customers automatically get an email when you confirm their payment, and another when you mark their order shipped (with courier + tracking number). This works without a customer account — the email just goes to whatever address they entered at checkout (email is a required field for exactly this reason).

Emails send via Gmail SMTP through an **App Password** — a special password just for this app, separate from the account's real login password. Free, no extra service to sign up for.

1. Log into the sending Gmail/Workspace account (e.g. `customdripchennai@gmail.com`) and turn on **2-Step Verification** if it isn't already (Google Account → Security) — this is required before Google will let you create an App Password.
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), name it something like "Custom Drip Chennai Website", and generate it. Copy the 16-character password shown (spaces don't matter, Google usually shows it in 4 groups of 4).
3. Set `GMAIL_USER` to that Gmail address and `GMAIL_APP_PASSWORD` to the generated password in your environment.

Regular Gmail accounts cap out at 500 emails/day (2,000/day on Google Workspace) — far more than a small store needs. The first time the app sends through a new App Password, Google may flag the sign-in as unusual and prompt a one-time "was this you?" confirmation in the account's security settings — after that it's routine.

If you skip this entirely, the app still works exactly the same — payment confirmation and shipping just won't trigger an email. Nothing else depends on it.

## 7. Configure UPI Payment

Log in to `/admin`, go to **Settings → Payment**, and fill in:

- **UPI ID** (e.g. `customdrip@upi`)
- **UPI Display Name**
- **UPI QR Code** — upload an image of your UPI QR code (generate one from any UPI app's "receive money" screen, screenshot it, upload here)

This immediately updates what customers see on the checkout payment step. No code changes, no redeploy needed.

## 8. How the Co-Founder Adds Products

Covered in full, in plain language, in [ADMIN_GUIDE.md](./ADMIN_GUIDE.md). Short version: **Admin → Products → Add Product**, fill in name/price/photos/sizes/colours/stock, **Save & Publish**. No technical knowledge, filenames, or database access required.

## 9. How Orders Are Managed

The order workflow is deliberately minimal for a two-person team: **New → Payment Confirmed → Shipped → Delivered** (or **Cancelled**).

**Admin → Orders** lists every order. Opening one shows the UPI transaction ID the customer entered, with **Confirm Payment** / **Reject Payment** buttons — confirming immediately emails the customer (if Gmail sending is configured) saying their payment is confirmed and their order ships in 3–7 business days. **Admin → Print Queue** shows every payment-confirmed order still awaiting shipment, for daily printing/packing. When an order is ready to go, open it, fill in **Shipment Details** (courier + tracking number) and save — this moves the order to "Shipped", emails the customer their tracking info, and updates their `/track/[token]` page. There's no need to click through intermediate "Processing/Printing/Packed" states — the status dropdown intentionally won't let you jump to "Shipped" directly, precisely so shipping always goes through that form and the customer always gets notified.

## 10. Changing Shipping Fee / Free Shipping Threshold

**Admin → Settings → Shipping.** Both values apply store-wide immediately — nothing is hardcoded in the app.

## Database Schema (summary)

| Table | Purpose |
|---|---|
| `products` | Core product info (name, slug, price, description, flags) |
| `product_images` | One-to-many images per product, with a designated main photo |
| `product_variants` | Size × colour combinations, each with independent stock |
| `customers` | Created at checkout time — no auth account |
| `orders` | Order + shipping + payment + status, human order number + secret tracking token |
| `order_items` | Snapshot of what was ordered (name/size/colour/price at time of order) |
| `settings` | Single-row store configuration (shipping, UPI, brand info) |
| `admins` | Whitelist of Supabase Auth user IDs allowed into `/admin` |

Full definitions, constraints, indexes, and RLS policies are in `supabase/migrations/`.

## Security Notes

- Row Level Security is enabled on every table. Product catalogue and settings are publicly readable; everything else requires `is_admin()` (checked against the `admins` table) or the server-only service-role key.
- The service-role key is used in exactly two places: placing an order and looking up an order by tracking token — both server-only, never sent to the browser.
- All admin mutations (product/order/settings changes) are Next.js Server Actions that re-verify the caller is an admin server-side, independent of Row Level Security, as defense in depth.
- Prices and stock are always re-read from the database at checkout time — never trusted from the client.

## What's Deliberately Not Built (MVP scope)

Per the project brief, these are intentionally out of scope for v1 but the architecture doesn't block adding them later: payment gateway integration (Razorpay/Cashfree/PhonePe), WhatsApp/email notifications, customer accounts, coupons, reviews, wishlists, abandoned-cart recovery, Instagram DM automation, analytics/sales reports, GST invoices, COD.

## Testing Checklist

Before going live, click through: homepage → shop → product page (variant selection, sold-out sizes) → cart → checkout → UPI payment step → order placed → order tracking link. Then in `/admin`: log in, add a product with photos, edit it, confirm a test order's payment, move it through statuses, change shipping fee, change UPI ID. Check all of the above on an actual phone, not just a resized desktop browser window.
