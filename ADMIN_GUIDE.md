# Custom Drip Chennai — Admin Guide

This guide is for running the store day-to-day. No technical knowledge needed — just follow the steps. You can do all of this from your phone.

Go to **yourwebsite.com/admin** and log in with the email and password given to you.

---

## How to Add a T-Shirt

1. Log in.
2. Tap **Products**.
3. Tap **+ Add Product**.
4. Fill in:
   - **T-Shirt Name** — the name customers will see, e.g. "Messiah Oversized Tee"
   - **Description** — a short sentence about the tee
   - **Price** — in rupees, e.g. 799
   - **Compare At Price** (optional) — a higher "was" price to show a discount, e.g. 999
5. Tap **+ Upload Photos**. Choose one or more photos from your phone's gallery, or take a new photo. Your photos are automatically resized so the site stays fast.
6. Tap **Set as Main** under the photo you want customers to see first.
7. Tap the **Sizes** you're selling (S, M, L, XL, XXL).
8. Tap the **Colours** you're selling. If a colour isn't listed, type it into "Add a custom colour" and tap **Add**.
9. Under **Stock**, enter how many of each size you have for each colour.
10. (Optional) Tap **Category** and type something like "Oversized T-Shirt".
11. Leave **Featured Product** ON if you want it to show on the homepage.
12. Leave **Available for Sale** ON so customers can buy it (turn it OFF later to hide it without deleting it).
13. Tap **Save & Publish**.

That's it — the T-shirt is now live on the website.

---

## How to Edit a T-Shirt (change price, photos, stock, etc.)

1. Tap **Products**.
2. Find the T-shirt and tap **Edit**.
3. Change anything you need — price, description, photos, sizes, colours, stock.
4. To remove a photo, tap the **✕** on it. To add more, tap **+ Upload Photos** again.
5. Tap **Save Changes**.

Changes appear on the website immediately.

---

## How to Change Stock

1. Tap **Products** → **Edit** on the T-shirt.
2. Scroll to **Stock**.
3. Update the number for the size/colour that changed.
4. Tap **Save Changes**.

If a size/colour reaches 0, customers will automatically see "Sold Out" for that option and won't be able to order it.

---

## How to Temporarily Hide a T-Shirt (without deleting it)

1. Tap **Products**.
2. Tap **Deactivate** next to the T-shirt.

It disappears from the website but stays in your admin panel. Tap **Activate** to bring it back anytime.

---

## How to Check and Confirm an Order

1. Log in.
2. Tap **Orders**.
3. Tap the order you want to check (shows order number, customer name, amount, and status).
4. Check the **UPI Transaction ID** the customer entered.
5. Open your bank/UPI app and confirm you actually received that exact payment.
6. If the payment is correct, tap **✓ Confirm Payment**. This automatically emails the customer that their payment is confirmed and their order will ship in 3–7 business days — you don't need to message them yourself.
   If it looks wrong or you can't find it, tap **✕ Reject Payment** and message the customer on Instagram.
7. That's it for now — the order will show up in **Print Queue** until you ship it (see below). You don't need to update its status manually at every step.

---

## How to See What Needs Printing Today

1. Tap **Print Queue**.

This shows every order that's been paid and is waiting to be printed and shipped — with the T-shirt, colour, size, and quantity for each. It stays on this list until you mark it shipped (below) — there's nothing extra to update while it's being printed and packed.

---

## How to Mark an Order as Shipped

1. Tap **Orders** → open the order (or tap **Enter Shipping Details →** from the Print Queue).
2. Scroll to **Shipment Details**.
3. Enter the **Courier Name** (e.g. Delhivery) and the **Tracking Number**.
4. Tap **Save & Mark Shipped**.

This automatically emails the customer that their order has shipped, with the courier and tracking number — you don't need to message them yourself. It also updates their order tracking page.

---

## How to Change Your UPI ID or QR Code

1. Tap **Settings**.
2. Under **Payment (UPI)**, update the **UPI ID** and/or **UPI Display Name**.
3. To change the QR code, tap **Replace QR Code** and upload a new screenshot of your UPI QR (from any UPI app's "receive money" screen).
4. Tap **Save Settings**.

This updates instantly — every customer checking out after this will see the new details.

---

## How to Change the Shipping Fee

1. Tap **Settings**.
2. Under **Shipping**, update:
   - **Standard Shipping Fee** — what customers pay for shipping
   - **Free Shipping Above** — order amount above which shipping becomes free
3. Tap **Save Settings**.

---

## How to Check Your Sales

1. Tap **Dashboard**.
2. Tap **Today**, **This Week**, **This Month**, **This Quarter**, or **This Year** to change the time period.

You'll see orders and revenue for that period (revenue only counts orders you've confirmed payment for), plus any failed/rejected payments. Below that, **Payments Pending** and **To Fulfill** always show what needs your attention right now, regardless of which time period you've selected.

---

## About Automatic Emails

When you tap **Confirm Payment**, the customer automatically gets an email saying their payment is confirmed and their order ships in 3–7 business days. When you save **Shipment Details**, they automatically get an email with their courier and tracking number. You don't need to message customers yourself for either of these — though you're always welcome to.

If a customer didn't enter a valid email, or if your developer hasn't finished setting up the email service yet, these emails just won't send — nothing else breaks. The order still works normally and the customer can always check **Track Your Order** from their order confirmation page.

---

## Things You Never Need to Do

- You never need to edit any code.
- You never need to touch a database.
- You never need to rename a photo before uploading — upload it as-is and just type the T-shirt name.
- Customers never need to create an account to order or to track their order.

If anything looks broken or confusing, take a screenshot and send it to your developer rather than trying to fix it from the database.
