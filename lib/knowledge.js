// lib/knowledge.js — per-brand business knowledge (shipping, returns, hours, etc.)
//
// Keyed by brand slug. The bot reads this as reference info in its system
// prompt — write in plain English, bullets/paragraphs are fine.
//
// Anything written here, the bot can use to answer customer questions.
// Anything NOT here, the bot will honestly say it doesn't know and point to
// the contact page instead of guessing.
//
// A brand with an empty string just gets no extra knowledge section — it
// isn't a bug, it just means that brand's policies haven't been written yet.
//
// To edit: change the text below, save, restart the backend (pm2 restart).

export const KNOWLEDGE_BY_BRAND = {

    tilesbay: `
  ## About Tilesbay:
  - Tilesbay is an online discount wholesaler of flooring, wall tile, natural stone, porcelain, mosaics, landscaping materials, and related tile products for contractors, trade professionals, DIY customers, and residential/commercial projects. The site says it supplies customers across every U.S. state and focuses on manufacturer-direct pricing.
  
  ## Free samples:
  - Tilesbay offers free product samples, but customers must place sample orders through the website. On desktop, customers should open the product page and click "Add a Sample" next to "Add to Cart"; on mobile/tablet, they should tap "Buying Options" first, then "Add a Sample." Only one sample per product per order is allowed; extra sample requirements should be emailed to csr@tilesbay.com
  - Sample products are free, but sample shipping/freight is paid by the customer at checkout. Sample freight can be refunded after a larger order: Tilesbay states customers should order 50 sq. ft. per sample ordered and email both the sample and final order numbers within one week. Samples are usually 4x4 or 6x6, and some items may not be available as samples.
  
  ## Shipping
  - Tilesbay's shipping page says it ships products anywhere in the United States. Shipping method is determined by order size and weight, and items can be delivered to residential or commercial addresses. Typical delivery time is about 4-8 business days from order confirmation, excluding special/container-load orders — this can vary based on local delivery conditions, so always state it as approximate ("typically 4-8 business days, though it can vary with local conditions").
  - Shipping is not shown as a flat rate. Tilesbay says freight is based on the order and delivery conditions, with options such as UPS Ground for small orders, residential curbside freight with liftgate, residential inside delivery by request, commercial freight delivery, and carrier-terminal pickup. Customers must correctly state delivery conditions such as residential/commercial and liftgate needs, or additional carrier charges may be billed later.
  - Samples ship by USPS/UPS or UPS Ground/equivalent. The shipping page says samples need 1-2 business days for processing and 1-5 business days for delivery, while the FAQ says sample orders usually ship the second day and take 4-8 business days by UPS Ground, so sample timing should be stated as approximate.
  - Rush / expedited orders: Tilesbay does have options for rush shipping on many orders (e.g. faster carrier services), but the exact availability, cost, and timeline depend on the specific product, quantity, and destination. Never say there are no rush options — instead say something like "we do have rush options for many orders — let me connect you with our team, they can check availability and pricing for your specific order."
  - Free shipping threshold: [Needs internal confirmation] — I did not find a public free-shipping threshold for regular orders.
  International shipping: [Needs internal confirmation] — the shipping page says United States; the About page mentions North America, so do not promise Canada/Mexico/international shipping until confirmed internally.
  
  ## Freight / large orders
  - Large orders that exceed standard parcel shipping ship as freight, on a pallet, and require special handling equipment (e.g. a forklift or pallet jack) to unload — this is different from a normal small-parcel delivery. Because of this, exact freight cost can't be calculated automatically; it depends on pallet count, destination, and delivery conditions (residential vs. commercial, liftgate needs, etc). Tell the customer plainly why: "This order ships as a freight/pallet shipment, which needs special handling equipment, so I can't calculate an exact shipping cost here — our team can get you an accurate freight quote." Then offer to connect them with a person.
  
  ## Returns and exchanges
  - Use this as the safer public policy: Tilesbay's formal Returns & Refunds page says there is a 30-day money-back guarantee and regular returns must be new, undamaged, unused, uninstalled, in original packaging, and in resellable condition. Returns require an RMA requested by emailing csr@tilesbay.com, and the RMA may take 2-3 days.
  - Tilesbay says it does not accept partial returns, does not accept returns/refunds on samples or sample shipping, and does not accept returns after installation. Regular returns are refunded less actual shipping/handling costs and are subject to a 25% restocking fee; customers pay shipping both ways if Tilesbay is not at fault. Returns are usually processed 3-5 business days after arriving at Tilesbay's location.
  - Non-returnable items include used/damaged items, items marked "as-is," "no returns accepted," "all sales final," special orders, and custom-made items. Damaged or missing products should be reported by email within 48 hours, and wrong products should be reported within 3 days with pictures.
  - Important policy conflict: the FAQ shows an older/different return policy of 15 days and 30% restocking fee, while the Returns page and Terms of Sale say 30 days and 25%. This needs internal confirmation before publishing broader chatbot answers — when in doubt, use 30 days / 25%.
  
  ## Pricing and discounts
  - The site currently shows: "Avail 5% Additional Discount on Orders above $2500." Tilesbay also shows product-level quantity pricing on some items. For example, one product page shows lower per-sq.-ft. pricing at 40 sq. ft. and 80 sq. ft. quantity tiers, so bulk discounts may vary by product.
  - Tilesbay has a New Wholesale Account Setup page that asks for business details, EIN, annual sales, nature of business, states covered, and trade references, so trade/wholesale pricing appears to be available through an application process.
  - Promo codes / price matching: [Needs internal confirmation] — I did not find a clear public price-match policy or promo-code policy. Terms of Sale says Tilesbay may run special promotions and can cancel promotions at its discretion.
  
  ## Order process
  - Customers can place orders through the website. Tilesbay's Order Status page says customers can check status using their order number and email address. After payment clears, customers receive a confirmation email with an order number; Tilesbay then reviews the order and sends product details to the warehouse. The warehouse begins processing within 1 business day after receiving order information.
  - When an order ships, Tilesbay emails a tracking number. Transit time depends on where the order ships from in the U.S. and can range from a few days to a week. Large freight orders arrive by truck, and customers are responsible for unloading/taking items inside/removing packaging unless they arranged additional services.
  - Accepted payment methods include Visa, MasterCard, American Express, Discover, company checks, personal checks, money orders, certified checks, and wire transfers. Orders must be paid in full before shipping, and check payments may delay shipment until cleared. Terms of Sale also mentions approved credit card, wire transfer, electronic funds transfer, or other prearranged methods approved by Tilesbay.
  - Account required to order: [Needs internal confirmation] — public pages show My Account/Login, but I did not find a clear statement that customers must create an account before checkout.
  
  ## Contact and support
  - Customer service page: https://www.tilesbay.com/contact-us
  - Phone: (855) 740-5157
  - Fax: (855) 744-6023
  - Email: csr@tilesbay.com
  - Support hours: Weekdays, 9 AM-5 PM EST. (Product representatives specifically are available Monday-Friday, 8 AM-4 PM EST — mention 9 AM-5 PM EST as the general support hours unless asked specifically about product reps.)
  
  ## Anything else
  - Tilesbay sells natural stone, porcelain, ceramic, vinyl plank flooring, mosaics, trims/borders, landscaping products, pool coping/tiles, pavers, wall caps, ledger panels, glass/metal tiles, backsplash tiles, and related categories. The About page says Tilesbay stocks over 2,600 colors and styles of mosaics.
  - Natural stone and tile products can vary in color, shade, finish, size, and lot. Tilesbay recommends ordering samples first, checking lot-specific pictures when needed, blending tiles from different boxes, verifying square footage/overage, and inspecting all boxes/pieces immediately upon receipt.
  - Tilesbay recommends ordering 5-10% extra for wastage and 10% extra for diagonal installations. It also states that it does not sell setting adhesive materials, which customers should buy from a local tile dealer or home center.
  - Warranty should not be promised broadly. Terms of Sale says Tilesbay does not provide warranties once the product is installed or once the return period has passed, whichever comes first.
  - PEI rating: [Needs internal confirmation] — the FAQ mentions PEI ratings, but I did not find a clear public explanation of what they mean.
  `,
  
    findstone: `
  ## About Findstone:
  - Findstone.us is an online discount wholesaler of natural stone, tile, mosaics, moldings, and landscape materials for contractors, trade professionals, DIY customers, and residential/commercial projects. The About page says it serves customers in every U.S. state and emphasizes manufacturer-direct/wholesale pricing and same-day-ship inventory on weekdays.

  ## Free samples:
  - Product pages have an "Add a Sample" button next to "Add to Cart," the same flow as Tilesbay. Only one sample per product per order is allowed.
  - The Returns & Refunds page says samples are non-returnable and non-refundable, but separately mentions samples are "recommended and credited towards purchase" — the exact mechanics (free or paid, what counts, deadline) aren't spelled out anywhere on the site. [Needs internal confirmation] before promising a sample credit/refund to a customer.
  - Samples ship via USPS or UPS, 1-2 business days processing plus 1-5 business days delivery — state as approximate.

  ## Shipping
  - Ships anywhere in the United States. Typical delivery is approximately 4-8 business days from order confirmation, excluding special/container-load orders — always state as approximate.
  - UPS Ground curbside is recommended for orders under 20 sq ft; larger orders ship third-party freight as residential curbside with liftgate (default), residential inside delivery (by request), commercial delivery (loading dock), or terminal pickup. Customers must state delivery conditions correctly or extra carrier charges may be billed later.
  - Rush/expedited orders: [Needs internal confirmation] — no published rush option; say the team can check availability and pricing rather than saying no.
  - Free shipping threshold: [Needs internal confirmation] — none found.
  - International shipping: conflicting signals — the About page says "anywhere in North America" but the Shipping & Delivery page says United States only. Treat as US-only until confirmed internally.

  ## Freight / large orders
  - Large orders ship as freight on a pallet and need special handling equipment to unload. Orders over 4,000 sq ft get "a much negotiated freight/shipping charge" per the shipping page — contact the team for a quote rather than calculating one. Explain plainly why an exact number can't be given, then offer to connect them with a person.

  ## Returns and exchanges
  - Returns require an RMA from contact@findstone.us. The Returns & Refunds page is internally inconsistent: it says returns must be made "within 15 days of order" but also says returns won't be accepted "beyond the 30th day of order." The FAQ backs the 15-day window; Terms of Sale says 30 days. Use 15 days as the primary guidance with 30 days as an absolute outer limit, and flag this for internal confirmation.
  - Restocking fee: 25% per the Returns page and Terms of Sale, but the FAQ says 30% — treat 25% as authoritative (two sources agree) and flag the FAQ's 30% as needing confirmation.
  - No partial returns. Customer pays return shipping both ways unless Findstone is at fault (deducted from the refund even on orders that shipped free). Samples are non-returnable. No returns once installed. Card refunds carry an extra 5% fee unless taken as store credit.
  - Non-returnable: used/damaged goods, "as-is"/"all sales final" items, special/custom orders. Wrong products: report within 3 days with photos. Damage: report as soon as possible (no specific hour window found, unlike Tilesbay's 48 hours). Processed returns take 3-5 business days after arrival.

  ## Pricing and discounts
  - Homepage runs a general "Ongoing Discount / Limited Deals" banner (no fixed % or threshold published) plus a "Wholesale Account — Special Pricing — Apply Now" banner offering special pricing, faster handling, custom shipping support, and blind shipment options for trade accounts.
  - Product pages show quantity-tiered per-sq-ft pricing that varies by product.
  - Promo codes / price matching: [Needs internal confirmation] — none found publicly.

  ## Order process
  - Customers can look up an order without logging in (Order ID + billing last name + email or ZIP). Whether an account is required to place an order in the first place: [Needs internal confirmation].
  - Accepted payment: Visa, MasterCard, American Express, Discover, company/personal checks, money orders, certified checks, wire transfers. Orders must be paid in full before shipping; check payments may delay shipment until cleared.
  - Container-load orders can be canceled any time before Findstone physically ships them; canceling after shipment may add shipping/restocking fees.

  ## Contact and support
  - Contact page: https://www.findstone.us/contact-us
  - Phone: (949) 484-5371
  - Email: contact@findstone.us
  - Fax: [Needs internal confirmation] — none found.
  - Support hours: Monday-Friday, 8 AM-5 PM EST.
  - A live chat widget is also available on the site for design-related questions.

  ## Anything else
  - Findstone's catalog centers on natural stone (granite, marble, travertine, slate/quartzite, onyx, limestone), ceramic/porcelain tile, luxury vinyl tile, mosaics/backsplash (glass, ceramic, metal, waterjet), moldings/trim, and landscape products (pavers, ledger veneer, pool coping, fire glass, turf) — more stone/mosaic/molding-forward than Tilesbay's broader flooring catalog. The About page claims over 2,600 colors and styles in stock.
  - Natural stone "inherently lacks uniformity" in color/shade/finish — recommend ordering a sample first since it's a natural, not man-made, material.
  - Order 5-10% extra for wastage, 10% extra for diagonal installations.
  - Warranty should not be promised broadly — Findstone doesn't provide warranties once installed or once the return period has passed. Liability is capped at the amount the customer paid for the purchase.
  - PEI rating: [Needs internal confirmation] — not mentioned anywhere on the site.
  `,
    flooringntile: `
  ## About FlooringnTile:
  - FlooringnTile (flooringntile.com) is an online retailer of natural stone, porcelain, ceramic, and landscape/paver tile for residential and commercial projects, operated by Premier Worldwide LLC (dba "Flooring n Tile"), a Georgia-registered company. The About Us page describes it as "one of the largest suppliers of stones and tiles in the US," selling natural stone (granite, marble, limestone, sandstone, travertine, slate, quartzite, onyx) alongside manufactured ceramic/porcelain tile, landscaping stone, and kitchen/bath accessories, and says it ships anywhere in the U.S. It also mentions a "lowest price challenge" — if a customer finds a better price, they're invited to report it.
  - Note: as of this research, the live site is behind a Sucuri bot-check that blocked automated fetches, so this block was reconstructed from Wayback Machine snapshots (most recently confirmed good in 2023) — recommend a human spot-check of the live phone/email and current promos.

  ## Free samples:
  - Samples are free; open the product page and click "Add a Sample" next to "Add to Cart" (hidden where samples aren't offered). Only one sample per product per order is honored; extra requests go to info@flooringntile.com or (732) 723-7314.
  - Samples are usually 4x4 or 6x6 and ship via UPS Ground or equivalent, with a nominal sample shipping charge calculated at checkout. Paid expedited options: +$10/package for UPS 3rd Day, +$20/package for UPS 2nd Day. Some items (pool copings, medallions, faucets, sinks) can't be sampled.
  - No policy was found for refunding sample shipping against a later bulk order (unlike Tilesbay) — don't promise that. Samples and sample shipping are never returnable/refundable.

  ## Shipping
  - Ships anywhere in the United States. Typical delivery is approximately 4-8 business days from order confirmation, excluding special/container-load orders — state as approximate.
  - UPS Ground for small orders (not recommended for 12"+ tile due to breakage risk); residential curbside delivery with liftgate; residential inside delivery by request (added cost); commercial delivery to a loading dock; or pickup at the freight carrier's local terminal (often the cheapest option). Customers must state correct delivery conditions or the carrier may bill extra later.
  - Container-load orders (over 4,000 sq ft) get an individually negotiated freight rate — contact the team directly rather than quoting a number.
  - Sample shipping timing has two different public numbers (1-2 days processing + 1-5 days delivery vs. an 8 AM EST cutoff shipping the "second day" and taking 4-8 business days) — state sample shipping time as approximate.
  - Rush/expedited shipping is confirmed for samples only (paid UPS 2nd/3rd Day). For regular orders, no public rush option is listed — say the team can check expedited options for a specific order rather than ruling it out.
  - Free shipping threshold: [Needs internal confirmation] — none found.
  - International shipping: [Needs internal confirmation] — all pages checked say "United States" only; don't promise Canada/international shipping until confirmed internally.

  ## Freight / large orders
  - Orders that ship via pallet/freight need a liftgate or loading-dock equipment to unload, so exact cost can't be calculated without knowing pallet count and delivery conditions. This applies especially to container-load orders (4,000+ sq ft), which get individually negotiated shipping and pricing.
  - Say plainly: "This ships as a freight/pallet order, which typically needs special unloading equipment, so I can't calculate an exact shipping cost here — let me connect you with our team for an accurate freight quote."

  ## Returns and exchanges
  - The Returns & Refund page headlines a "30 day money back guarantee," but its "Regular Returns" section says: return new/undamaged items in original packaging within 15 days of the order for a refund (less actual shipping/handling), subject to a 25% restocking fee, with an absolute cutoff of no returns after the 30th day. Returns require an RMA (email info@flooringntile.com; can take 2-3 days).
  - Policy conflict: the FAQ states a 30% restocking fee with a flat 15-day window (no 30-day outer limit mentioned), while the Returns & Refund page and Terms of Sale both say 25%. Treat 25% as authoritative when in doubt, and mention the 30-day outer cutoff.
  - Separate conflict on cancellations: the Returns & Refund page says an order canceled before shipping is "treated as a regular return" (25% fee), while Terms of Sale separately says canceling an order "once ready to ship" incurs a 15% fee. Don't quote an exact percentage for a pre-shipment cancellation — say a restocking fee applies and the team will confirm the amount.
  - No partial returns; no returns/refunds on samples (incl. shipping); nothing returnable once installed. Non-returnable: items with signs of use/damage, items marked "as-is"/"no returns accepted"/"all sales final," and special-order/custom-made items.
  - Damaged/missing product: contact immediately. 5-7% chipped/broken tile in transit is called normal, up to 10% still considered acceptable (usable as cut pieces); above 10%, get it noted on the delivery paperwork and take photos. Wrong product: report within 3 days with photos — full replacement or refund (including shipping) at no extra cost.
  - Returns are typically processed 3-5 business days after arriving back. "No Open Box" policy: FlooringnTile won't break open a box to ship loose pieces — orders round up to full-box multiples.

  ## Pricing and discounts
  - Product listings show tiered "As low as" per-sq-ft pricing on many items — bulk/quantity pricing exists at the product level, with thresholds varying by product. No sitewide banner discount (e.g., "X% off orders over $Y") was found, unlike some sibling sites.
  - Promotions apply only to orders placed and paid during the promo window, and can be cancelled at FlooringnTile's discretion. Listed prices are described as "Wholesale Price or special negotiated prices," excluding destination/handling charges, subject to change.
  - Wholesale/trade account program: [Needs internal confirmation] — no dedicated application page found. Promo codes / formal price-match policy beyond the "lowest price challenge" claim: [Needs internal confirmation].

  ## Order process
  - After payment clears, the customer gets a confirmation email with an order number; processing begins within 1 business day. Once shipped, a tracking number is emailed. Transit time depends on which U.S. warehouse it ships from and can take "a couple days to a week" — state as approximate. Freight orders arrive by truck; the customer is responsible for unloading and removing packaging unless other services were arranged.
  - Order status can be checked via a "Check My Order Status" page using the order number and email address.
  - Accepted payment: Visa, MasterCard, American Express, Discover, company/personal checks, money orders, certified checks, wire transfers. Orders must be paid in full before shipping; check payments may delay shipment until cleared.
  - The shipping address cannot be changed after the order is placed — it can only be canceled and re-ordered to a new address. Container-load orders can be canceled for a full refund any time before physical shipment.
  - Account required to order: [Needs internal confirmation] — site shows My Account/Login, but no explicit "must register" statement was found.

  ## Contact and support
  - Contact page: https://www.flooringntile.com/contact-us (web form)
  - Phone: (732) 723-7314 — this differs from the (855) 740-5157 on file (which is actually Tilesbay's number, likely a copy-paste mix-up between sibling brands); use (732) 723-7314 instead.
  - Email: info@flooringntile.com — this differs from csr@flooringntile.com on file; use info@flooringntile.com instead.
  - Fax: [Needs internal confirmation] — none found.
  - Support hours: [Needs internal confirmation] — no explicit hours statement found; the only clue is an 8:00 AM EST sample-order cutoff, suggesting an Eastern-time team.

  ## Anything else
  - Product range: natural stone (granite, marble, limestone, travertine, slate, quartzite, onyx), ceramic and porcelain tile, luxury vinyl tile, glass/metal/marble/onyx/travertine/ceramic mosaics, subway tile, bullnose, moldings/trim, backsplash, peel-n-stick tile, waterjet tile, ledger/veneer panels, and a landscape/paver line (French-pattern paver kits, uniform pavers, pool coping, pool tile, fire glass, turf).
  - Natural stone/mosaic varies in color/shade/finish/lot since it's a natural material — recommends blending tiles from different boxes, sealing all natural stone with a penetrating sealer, and inspecting all boxes/pieces immediately on receipt. For a guaranteed shade match, suggests warehouse pickup instead of shipping.
  - Order 5-10% extra for wastage and 10% extra for diagonal installations; keep a few leftover tiles for future repairs. Does not sell setting adhesive/thinset — buy that from a local tile dealer or home center.
  - Warranty should not be promised broadly — no warranties once the product is installed or the return period has passed, whichever comes first.
  - PEI rating: [Needs internal confirmation] — no public explanation found on this site.
  - Orders are accepted in, and governed by, the State of Georgia, consistent with FlooringnTile being operated by Premier Worldwide LLC.
  `,
    backsplash: `
  ## About Backsplash Tile:
  - Backsplash Tile (backsplash-tile.us, "Backsplash Tile USA") is an online discount wholesaler of kitchen backsplash, subway, mosaic, and decorative wall tile, plus natural stone, ledger panels, trim/molding, and related products, for contractors, trade professionals, DIY customers, and residential/commercial projects. Its About Us page describes it as one of the leading online discount wholesalers of flooring, wall tiles, and landscaping materials, with customers in every U.S. state, selling at manufacturer-direct prices.
  - Note: as of this research, the live site blocks automated access (firewall geo-rule), so this block was reconstructed from the most recent full Wayback Machine archive (roughly 2023-early 2024) rather than a live fetch — treat current promo banners and the Order Status feature specifically as needing a fresh human recheck.

  ## Free samples:
  - Samples are free; order from the product page via "Add a Sample" next to "Add to Cart" (hidden if a product has no sample option). Only one sample per product per order counts. Samples are 4x4 or 6x6, ship via UPS Ground or equivalent with a nominal shipping charge calculated at checkout. Some items (pool copings, medallions, faucets, sinks) can't be sampled.
  - Rush sample shipping: +$10/package for UPS 3rd Day, +$20/package for UPS 2nd Day.
  - Samples are non-returnable/non-refundable, including sample shipping. Unlike Tilesbay's "order 50 sq ft per sample, get freight refunded" program, no equivalent sample-freight-credit offer was found here. [Needs internal confirmation]

  ## Shipping
  - Ships anywhere in the United States, to residential or commercial addresses. Typical delivery is approximately 4-8 business days from order confirmation, excluding special/container-load orders — state as approximate.
  - UPS Ground for orders under about 20 sq ft (not recommended for 12"+ tile due to breakage risk); residential curbside with liftgate; residential inside delivery by request (added cost); commercial dock delivery; carrier-terminal pickup. Customer must state correct delivery conditions or the carrier may bill extra later.
  - Container-load orders (over 4,000 sq ft) get individually negotiated freight rates — route these to the team rather than quoting a number.
  - Sample shipping timing is inconsistent across pages: 1-2 business days processing + 1-5 business days delivery on one page, vs. an 8 AM EST cutoff shipping the second day and taking 4-8 business days by UPS Ground on the FAQ — state sample timing as approximate.
  - Rush/expedited on regular orders: [Needs internal confirmation] — no public options or pricing found; say the team can check availability and pricing rather than saying no.
  - Free shipping threshold: [Needs internal confirmation] — none found.
  - International shipping: [Needs internal confirmation] — the Shipping page says United States only; the About page separately claims delivery "anywhere in North America" — don't promise Canada/Mexico shipping until confirmed internally.

  ## Freight / large orders
  - Large/container-load orders ship as freight on a pallet and need special handling equipment (forklift, pallet jack, liftgate) to unload. All pallet deliveries default to curbside with no guaranteed delivery date. Exact freight cost can't be calculated automatically — depends on pallet count, destination, and delivery conditions. Tell the customer plainly, then offer to connect them with the team for a quote.
  - Whoever accepts a freight delivery must inspect it and note any damage on the paperwork before the driver leaves — undocumented damage can't be reimbursed. About 5-10% chipped/broken tile in transit is considered normal and usable for cuts.

  ## Returns and exchanges
  - Use this as the safer public policy: Terms of Sale is the cleanest statement — returns accepted within 30 days of order for a full refund excluding shipping, RMA required by email, product unused/uninstalled/in original packaging, 25% restocking fee, customer pays return shipping.
  - Important policy conflict, worse than Tilesbay's: the dedicated Returns & Refunds page headlines a "30 day money back guarantee" but its own body text says items can be returned "within 15 days of the order," barred "beyond the 30th day" — inconsistent within a single page. The FAQ states yet another version: 15 days, a 30% restocking fee. With three inconsistent figures, default to the Terms of Sale numbers (30 days, 25% restocking fee) and flag this for internal cleanup.
  - No partial returns; no returns/refunds on samples (incl. sample shipping); no returns after installation. Non-returnable: used/damaged items, items marked "as-is"/"no returns"/"all sales final," special-order or custom-made items.
  - Damaged/missing product: report as soon as possible with photos (Terms of Sale separately requires freight/damage claims within 24 hours of delivery — use that if pressed for a number). Wrong product: report within 3 days with photos; replaced or fully refunded (including shipping) at no extra cost.
  - Returns are typically processed 3-5 business days after arriving back. Cancelling an order after it's already staged to ship can incur a separate 15% fee, distinct from the 25% restocking fee on completed returns.

  ## Pricing and discounts
  - The site runs rotating storefront-wide promotions (e.g., "Up to 30% Off in the new collection") plus per-product markdowns — treat any specific percentage as a changeable promotion, not a fixed policy.
  - Prices can reflect "Wholesale Price or special negotiated prices" and are subject to change; the company may run and cancel special promotions at its discretion.
  - Wholesale/trade account application, promo codes, and price-matching: [Needs internal confirmation] — no dedicated wholesale-signup page or public promo-code/price-match policy found.

  ## Order process
  - Orders are placed on the website; the shipping address can't be changed after placing an order (must be cancelled and re-ordered to change it). All orders are inspected before shipment.
  - The general process mirrors Tilesbay's: confirmation email with order number once payment clears, warehouse begins processing within 1 business day, tracking number emailed on shipment, transit time "a couple days to a week" depending on origin, customer responsible for unloading/unpacking a freight delivery. [Needs internal confirmation] whether a dedicated Order Status page/feature still exists — it wasn't found in more recent site navigation.
  - Accepted payment: Visa, MasterCard, American Express, Discover, company/personal checks, money orders, certified checks, wire transfers, or other prearranged payment method. Orders must be paid in full before shipping; check payments may delay shipment until cleared.
  - Account required to order: [Needs internal confirmation] — site has My Account/Login, but no explicit "must register to check out" language found.
  - Backsplash Tile USA is a subsidiary of Premier Worldwide LLC (Georgia); orders are accepted in, and the agreement is governed by, Georgia and U.S. federal law.

  ## Contact and support
  - Contact page: https://www.backsplash-tile.us/contacts
  - Phone: (855) 740-5157 (matches the number on file — a separate number found via general web search, (346) 330-2010, wasn't corroborated on the site itself, so disregard it).
  - Email: support@backsplash-tile.us — this differs from csr@backsplash-tile.us on file; use support@backsplash-tile.us unless corrected internally.
  - Fax: [Needs internal confirmation] — no dedicated fax number found.
  - Support hours: Monday-Friday, 8 AM-4 PM EST to speak with a product representative by phone; online ordering is available 24/7. No separate broader "general support hours" line was found, unlike Tilesbay.

  ## Anything else
  - Catalog centers on backsplash and subway tile: ceramic, porcelain, stacked stone, marble, slate/quartzite, travertine and onyx mosaics, and porcelain panels under "Kitchen Backsplash"; glass/marble/travertine/porcelain/ceramic under "Subway Tile"; shaped tile (herringbone, octagon, arabesque, chevron, encaustic pattern, basketweave, penny round, hexagon); mosaic backsplash (square, metal, stainless steel, rectangle, random strip); decorative glass/stone/metal blends; trim & accessories (crown molding, bullnose, pencil molding, stone borders); and featured tiles like peel-and-stick, printed tile, splitface, waterjet, wood-look, and pool tile. Ledger panels also show up as top sellers despite not having their own nav category.
  - The About page claims over 2,600 colors/styles of mosaics in stock — the same figure Tilesbay uses.
  - Order 5-10% extra for wastage, 10% extra for diagonal installs; blend tiles from multiple boxes before installing since natural stone and glass/mosaic sheets vary by lot. Does not sell setting adhesive/thin-set (buy locally); metal tile should use a high-performance mastic or epoxy-based setting material, glass tile should use white modified thin-set to avoid discoloration.
  - No warranty once a product is installed or the return period has passed, whichever comes first — don't promise a warranty beyond that.
  - "No Open Box Policy": the company won't break open boxes to ship loose/partial pieces — orders must round up to full-box multiples.
  - PEI rating: [Needs internal confirmation] — no mention found anywhere on the site.
  `,
    floortiles: `
  ## About Floor Tiles:
  - Floor Tiles USA (floor-tiles.us, operated by Premier Worldwide LLC dba Floor Tiles USA) is an online retailer of natural stone (marble, granite, travertine, slate, sandstone, onyx, limestone), porcelain and ceramic flooring, luxury vinyl tile (Everlife line), and mosaics, for contractors, trade professionals, DIY customers, and residential/commercial projects. The About page calls itself "the pioneer of online tile shopping" and says it serves customers in every U.S. state.

  ## Free samples:
  - Samples are free; open the product page and click "Add a Sample" next to "Add to Cart." Only one sample per product per order is allowed. Samples are 4x4 or 6x6. Pool copings, medallions, faucets, and sinks aren't available as samples.
  - Sample shipping isn't always free — a "nominal shipping charge" may apply, calculated at checkout. Expedited sample shipping costs extra ($10 for 3rd Day, $20 for 2nd Day). The Returns & Refunds page explicitly excludes samples and sample shipping from any return/refund — unlike Tilesbay, there's no stated program to credit sample shipping toward a larger order, so don't promise that.
  - Sample delivery timing is stated two ways (1-2 days processing + 1-5 days delivery on the shipping page vs. 4-8 business days via UPS Ground on the FAQ) — state as approximate.

  ## Shipping
  - Orders under about 20 sq ft typically ship UPS Ground; larger orders ship third-party freight in 30'-50' trailers. Orders over 4,000 sq ft get "a much negotiated freight/shipping charge" — contact sales for a quote.
  - Delivery options: residential curbside with liftgate (default), residential inside delivery (extra fee), commercial delivery (loading dock/forklift), or terminal pickup. All freight defaults to curbside with no guaranteed delivery date. Customers must state correct delivery conditions or extra carrier charges may be billed later, and should inspect for damage before the driver leaves.
  - Typical delivery time is approximately 4-8 business days from order confirmation — state as approximate; special/container-load orders need to contact sales@floor-tiles.us for a schedule.
  - Rush/expedited: confirmed only for samples (paid UPS 3rd/2nd Day upgrades); no published rush option for regular orders — say the team can check rather than saying no.
  - Free shipping threshold: [Needs internal confirmation] — none found.
  - International shipping: [Needs internal confirmation] — Terms of Use say the site is intended for U.S. businesses/customers only; don't promise international shipping.

  ## Freight / large orders
  - Orders over roughly 4,000 sq ft, or any tile 12"+ not suited to UPS Ground, ship as freight on a pallet in a 30'-50' trailer and need special handling equipment. Exact freight cost depends on destination and delivery conditions and can't be calculated automatically — tell the customer plainly and offer to connect them with the team for a negotiated quote.
  - Up to 10% breakage in transit is treated as normal — advise customers to inspect on delivery and note any damage before the driver leaves.

  ## Returns and exchanges
  - The Returns & Refunds page advertises a "30 day Money back Guarantee" but its own body text says regular returns must be made "within 15 days of the order for a full refund" — an inconsistency within the same page. Terms of Sale separately states a 30-day window with a 25% restocking fee; the FAQ says 15 days and 30%. Given three different combinations, use 25% restocking fee (backed by two pages) and flag the day-count as unresolved needing internal confirmation.
  - Returns require an RMA (2-3 days to obtain); no partial returns; samples and sample shipping are never returnable/refundable. Customers pay return shipping both ways unless Floor Tiles USA is at fault, including on orders that shipped free.
  - Separately, cancelling an order once it's "ready to ship" costs a 15% fee (a different scenario from a post-delivery return) — don't conflate the two with a customer.
  - Non-returnable: used/damaged items, special/custom orders, "as-is"/"all sales final" items, and anything installed. Wrong products: report within 3 days with photos; damage: report immediately (up to 10% breakage considered normal).

  ## Pricing and discounts
  - Terms of Use say listed prices are "Wholesale Price." The homepage runs rotating promo banners (e.g., up to 35% off, extra 15% off) that change often — don't treat as fixed policy.
  - Product pages show quantity-tiered per-sq-ft pricing that varies by product.
  - A site-wide dollar-threshold discount and a wholesale/trade-account application page: [Needs internal confirmation] — not confirmed live on the site (a "5% off orders above $2,500" banner appears on sibling sites but wasn't found here).
  - Promo codes / price matching: [Needs internal confirmation] — none found; Terms of Sale says promotions only apply to orders placed and paid during the advertised period.

  ## Order process
  - Order Status page tracks orders via order number + email through four stages: Order Placed, Processing (warehouse begins within 1 business day), Shipped (tracking number provided), and Arrival (customer responsible for unloading). Transit time is described as "a couple days to a week" depending on origin.
  - Accepted payment: Visa, MasterCard, American Express, Discover, company/personal checks, money orders, certified checks, wire transfers. Orders must be paid in full before shipping.
  - An account is not required to order — Terms of Use phrase account creation as optional ("may open" a Customer Account).

  ## Contact and support
  - Contact page: https://www.floor-tiles.us/contact-us
  - Phone: (214) 440-3610
  - Email: sales@floor-tiles.us
  - Fax: [Needs internal confirmation] — none found.
  - Support hours: Monday-Friday, 8 AM-4 PM EST (the only hours statement found on the site).

  ## Anything else
  - Floor Tiles USA sells natural stone (marble, granite, travertine, slate, sandstone, onyx, limestone), porcelain (wood-look, marble-look, stone-look finishes), ceramic flooring, luxury vinyl tile (Everlife line), and mosaics, plus visualizer tools and installation videos. The About page claims over 2,600 colors and styles of mosaics in stock.
  - Natural stone/tile can vary by lot — recommend blending tiles from different boxes. Order 5-10% extra for wastage, 10% extra for diagonal installations.
  - Warranty should not be promised broadly — no warranties once installed or once the return period has passed, whichever comes first; implied warranties of merchantability/fitness are disclaimed.
  - PEI rating: [Needs internal confirmation] — not mentioned in the FAQ or glossary.
  - Operated by Premier Worldwide LLC dba Floor Tiles USA, governed by Georgia law.
  `,
    patiopavers: `
  ## About Patio Pavers:
  - Patio Pavers USA (patio-pavers.us) sells natural stone pavers, porcelain pavers (its Arterra line), pool coping, wall caps, beach pebbles, cobblestone and other hardscape, stepping stones/flagstone, fire glass, and artificial grass, for driveways, walkways, patios, pool surrounds, and landscaping. It serves contractors, trade professionals, DIY customers, and retail buyers for residential/commercial projects, and pitches manufacturer-direct wholesale pricing with customers in every U.S. state.

  ## Free samples:
  - Product pages have an "Add a Sample" button next to "Add to Cart." Only one sample per product per order is allowed. Samples are 4x4 or 6x6; pool copings, medallions, faucets, and sinks aren't available as samples.
  - Samples are free but shipping is a "nominal charge" billed at actual cost at checkout, via UPS Ground from a California warehouse. Paid expedite upgrades: +$10 for 3-Day, +$20 for 2-Day.
  - [Needs internal confirmation] — no page describing a sample-shipping refund after a larger order was found; don't promise this for Patio Pavers.

  ## Shipping
  - Ships anywhere in the United States. Typical delivery is approximately 4-8 business days from order confirmation, excluding special/container-load orders — state as approximate.
  - UPS Ground for orders under 20 sq ft; larger orders ship freight as residential curbside with liftgate (default), residential inside delivery (extra cost, by request), commercial delivery (loading dock), or terminal pickup (useful for congested driveways/active job sites).
  - Rush/expedited for regular orders: [Needs internal confirmation] — only samples have published expedite options; say the team can check for a specific order rather than saying no.
  - Free shipping threshold: [Needs internal confirmation] — none found.
  - International shipping: [Needs internal confirmation] — the Shipping & Delivery page says United States only; the About page mentions North America — treat as US-only until confirmed.

  ## Freight / large orders
  - Because pavers and coping are heavy per piece (e.g., one 24x48 porcelain paver alone weighs about 74 lbs), typical paver orders reach freight/pallet shipping faster than lighter tile products would — this isn't a rare scenario for this brand. Freight ships curbside by default on 30'-50' trailers with no guaranteed delivery date and needs special handling equipment to unload.
  - Exact freight cost can't be calculated automatically — it depends on pallet count, destination, and delivery conditions. Tell the customer plainly why, then offer to connect them with the team for an accurate quote.

  ## Returns and exchanges
  - Returns require an RMA (reply to the order confirmation email; takes 2-3 business days). The Return & Refund page contradicts itself: its headline says "30 day Money back Guarantee" but the body says returns must be made "within 15 days of the order," while also saying returns won't be accepted "beyond the 30th day." The FAQ gives 15 days / 30% restocking fee; Terms of Sale gives 30 days / 25% restocking fee, plus a separate 15% cancellation fee for orders canceled after they're ready to ship.
  - Given the conflict, follow the safer/more-corroborated combination: 30 days / 25% restocking fee (Terms of Sale, backed partially by the Returns page's own 25% figure) — flag the day-count conflict as needing internal confirmation.
  - No partial returns; items must be new, unused, uninstalled, in original packaging; installation counts as acceptance. No refunds on samples or sample shipping. Customer pays return shipping unless Patio Pavers is at fault (deducted from refund, even on orders that shipped free). Orders must be placed in full-box multiples and the shipping address can't be changed once placed (Terms of Sale).
  - Non-returnable: used/damaged items, "as-is"/"all sales final" items, special/custom orders, sorted/culled-through items. Damage: contact immediately (no specific hour window published — don't assume Tilesbay's 48 hours). Wrong products: report within 3 days with photos, replaced at no extra shipping cost. Up to 10% breakage in transit is treated as normal.

  ## Pricing and discounts
  - Homepage shows the same "Avail 5% Additional Discount on Orders above $2500" banner as Tilesbay. Product pages show quantity-tiered per-sq-ft pricing that varies by product.
  - Wholesale/trade account application: [Needs internal confirmation] — no dedicated page found (unlike Tilesbay's New Wholesale Account page).
  - Promo codes / price matching: [Needs internal confirmation] — none found; promotions apply only to orders placed and paid during the advertised period per Terms of Sale.

  ## Order process
  - Order Status page: check with order number + email. Warehouse begins processing within 1 business day; tracking number is emailed once shipped. Transit time ranges "a couple days to a week" depending on origin. Customers are responsible for unloading freight deliveries and removing packaging unless extra services were arranged.
  - Accepted payment: Visa, MasterCard, American Express, Discover, company/personal checks, money orders, certified checks, wire transfers. Orders must be paid in full before shipping.
  - Account required to order: [Needs internal confirmation] — not stated publicly.

  ## Contact and support
  - Contact page: https://www.patio-pavers.us/contact-us
  - Phone: (480) 866-9660
  - Email: care@patio-pavers.us
  - Fax: [Needs internal confirmation] — none found.
  - Support hours: Monday-Friday, 8 AM-4 PM EST (the only hours statement found, on the About page).

  ## Anything else
  - Patio Pavers' catalog is Natural Stone Pavers, Arterra Porcelain Pavers, Pool Coping, Wall Caps, Beach Pebbles, Cobblestone and other hardscape, plus stepping-stone/flagstone products, fire glass, and artificial grass — oriented to outdoor driveways, walkways, patios, and pool surrounds rather than interior flooring/wall tile.
  - Natural stone varies in color/shade/finish by lot — recommend choosing pieces from multiple boxes for a blended look and inspecting all boxes on receipt.
  - Order 5-10% extra for wastage, 10% extra for diagonal installations. Patio Pavers does not sell setting/adhesive materials — buy those from a local dealer or home center.
  - Warranty should not be promised broadly — no warranties once installed or once the return period has passed, whichever comes first.
  - PEI rating: [Needs internal confirmation] — not mentioned anywhere (may not be a relevant spec for pavers/hardscape).
  `,
    porcelaintile: `
  ## About Porcelain Tile:
  - Porcelain Tile USA (porcelain-tile.us) is an online discount wholesaler of porcelain and ceramic flooring, mosaics, backsplash/wall tile, patio pavers and pool coping, and accent/trim tile, for contractors, trade professionals, and DIY/residential and commercial customers. The About Us page says it supplies customers in every U.S. state and ships "door-to-door, to absolutely anywhere in North America," cutting out the middleman to sell at manufacturer-direct/wholesale pricing. Note: the About Us copy also touts a "Largest inventory of Granite, Marble, Limestone, Travertine, Slate," but the site's actual live navigation is centered on porcelain/ceramic tile, mosaics, and pavers/coping with no dedicated natural-stone-flooring category — this reads like boilerplate carried over from a sister site's template, so trust the live category nav over the About page's product list.
  - Operated by Premier Worldwide LLC dba Porcelain Tile USA, based in Georgia; disputes are governed by Georgia law.

  ## Free samples:
  - Samples are free; order from the product page via "Add a Sample" next to "Add to Cart." Only one sample per product per order is allowed; anything beyond that should be emailed to csr@porcelain-tile.us.
  - There may be a nominal sample shipping charge calculated at checkout; samples ship via UPS Ground or equivalent. Rush sample shipping costs extra: +$10/package for UPS 3rd Day, +$20/package for UPS 2nd Day.
  - Samples are 4x4 or 6x6; items like pool coping, medallions, faucets, and sinks generally can't be sampled. Unlike Tilesbay, no program was found for refunding sample shipping after a larger follow-up order — [Needs internal confirmation] whether that program exists for this brand too. Samples cannot be returned or refunded, including shipping fees.

  ## Shipping
  - Ships anywhere in the United States, to residential or commercial addresses. The About Us page separately claims "anywhere in North America" — don't promise Canada/Mexico shipping until confirmed internally; default to "we ship anywhere in the U.S."
  - Typical delivery is approximately 4-8 business days from order confirmation, excluding special/container-load orders — always state as approximate.
  - Options include UPS Ground (recommended under 20 sq ft, not recommended for 12"+ tiles due to breakage risk), residential curbside delivery with liftgate, residential inside delivery by request (added cost), commercial dock delivery, and carrier-terminal pickup. Customers must state correct delivery conditions (residential/commercial, liftgate needs) or may be billed later for extra carrier charges.
  - Orders over 4,000 sq ft are "Container Load Orders" and get a specially negotiated freight rate — tell the customer to contact the team for a quote rather than stating a number.
  - Sample shipping timing is inconsistent: the Shipping & Delivery page says 1-2 business days processing + 1-5 business days delivery, while the FAQ says an 8 AM EST order cutoff usually ships the second day and takes 4-8 business days by UPS Ground — state sample timing as approximate.
  - Rush/expedited shipping is confirmed for samples only (for a fee). For regular orders, no public rush-shipping language was found — never say rush isn't available; offer to connect the customer with the team to check options/pricing.
  - Free shipping threshold: [Needs internal confirmation] — none found.
  - International shipping: [Needs internal confirmation] — see the About Us vs. Shipping page conflict noted above.

  ## Freight / large orders
  - Large/heavy orders ship as freight on a pallet via third-party trucking rather than small parcel, needing special handling equipment (liftgate, forklift, or pallet jack) to unload — exact freight cost can't be calculated automatically; it depends on pallet count, destination, and delivery conditions. All pallet deliveries default to curbside with no guaranteed delivery date.
  - Tell the customer plainly: "This ships as a freight/pallet shipment, which needs special handling equipment to unload, so I can't calculate an exact shipping cost here — our team can get you an accurate freight quote," then offer to connect them with a person.
  - Whoever accepts a freight delivery must inspect the material and note any damage on the delivery slip before the driver leaves, or replacement/reimbursement may not be possible.

  ## Returns and exchanges
  - Important policy conflict, worse than Tilesbay's three-way split: the Returns & Refunds page is headlined "30 Day Money back Guarantee" but its own body text says regular returns must happen "within 15 days of the order," that the company "WILL NOT accept any returns beyond the 30th day of order," and sets a 25% restocking fee. The FAQ repeats the 15-day/30-day language but cites a 30% restocking fee instead. The formal Terms of Sale instead says customers can return product "for any reason within 30 days of order" with a 25% restocking fee, with no 15-day cutoff mentioned. Given this, when in doubt use the Terms of Sale version — 30 days, 25% restocking fee — but this needs internal confirmation before quoting a hard number.
  - Returns require an RMA (reply to the order-confirmation email or email csr@porcelain-tile.us), which can take 2-3 days. No partial returns; no returns/refunds on samples or sample shipping; items must be unused, uninstalled, in original packaging; no returns/claims once installed. Customer pays return shipping both ways if the company isn't at fault, even on orders that shipped free. Processing typically takes 3-5 business days after the return arrives.
  - Damaged/missing product: contact immediately; up to 10% chipped/broken tiles in a shipment is considered normal transit damage. Wrong product: photos and contact within 3 days of delivery for a replacement or full refund (including shipping) at no extra cost.
  - Non-returnable: anything with signs of use/damage, "as-is"/"no returns accepted"/"all sales final" items, special orders, custom-made items. Separately, cancelling an order after it's already been processed for shipment incurs a 15% restocking fee (distinct from the 25%/30% fee on completed returns).

  ## Pricing and discounts
  - Homepage currently banners "Porcelain Tile Sale — Up to 35% Off," "100% Money Back Guarantee," and "Free Sample" — marketing banners, not fixed thresholds, so don't quote a percentage without checking the live site/product price. That "100% Money Back Guarantee" banner is much narrower in practice once you factor in restocking fees and non-returnable categories — don't repeat it to a customer without those caveats.
  - Individual products carry volume/quantity-tier pricing that varies by product. Terms of Use state "All prices shown are Wholesale Price or special negotiated prices with each customer."
  - Wholesale/trade account application page: [Needs internal confirmation] — no dedicated page found, unlike Tilesbay's "New Wholesale Account Setup" page.
  - Promo codes / price matching: [Needs internal confirmation] — none found; promotions are honored only for orders placed/paid during the promo period and can be cancelled at the company's discretion.

  ## Order process
  - Orders are placed through the website. An order confirmation alone doesn't guarantee acceptance — the company can still decline it (e.g. stock/payment issues) and will refund any payment already made if so.
  - Accepted payment: Visa, MasterCard, American Express, Discover, company/personal checks, money orders, certified checks, wire transfers, or other prearranged payment method. Orders must be paid in full before shipping; check payments may delay shipment until cleared.
  - Once placed, the shipping address on an order can't be changed — only cancelled and re-ordered with the new address. Orders ship in full-box multiples only ("No Open Box Policy") — the company won't break open a box to ship loose pieces.
  - Account required to order: [Needs internal confirmation] — a Customer Account/Administrator/Authorized User system exists, but no clear statement that an account is mandatory to check out was found.

  ## Contact and support
  - Contact page: https://www.porcelain-tile.us/contact-us
  - Phone: (904) 478-8200
  - Email: csr@porcelain-tile.us
  - Fax: [Needs internal confirmation] — none found.
  - Support hours: Monday-Friday, 8 AM-4 PM EST (no separate broader general-support-hours statement found, unlike Tilesbay's 9-5 split).

  ## Anything else
  - Live catalog centers on Porcelain Tile Flooring (brick, fabric, cement, concrete, metal, wood, marble, stone "looks," plus a Versailles pattern), Ceramic Flooring, Mosaic (porcelain and ceramic), Backsplash & Wall Tile, Patio Pavers/Coping, and Accent & Trim Tile (bullnose, listello/molding), plus named collections. The About Us page claims over 2,600 colors/styles of mosaics.
  - Product pages show a PEI rating (e.g. "PEI Rating 4") for wear resistance, but no public page explains the scale — [Needs internal confirmation] on how to explain PEI ratings to a customer.
  - Color/lot variation guidance mirrors Tilesbay's: recommend blending tiles from different boxes, ordering samples first, verifying square footage/overage, and inspecting all boxes/pieces on receipt. Order 5-10% extra for waste, 10% extra for diagonal installs. Does not sell setting/adhesive materials — buy those from a local tile dealer or home center.
  - Warranty should not be promised broadly — no warranty once installed or once the return period has passed, whichever comes first; implied warranties of merchantability/fitness are disclaimed.
  `,
    stackedstone: `
  ## About Stacked Stone:
  - Stacked Stone (stacked-stone.us) is an online discount wholesaler specializing in stacked stone, ledger panels, and stone veneer, alongside porcelain panels and peel-and-stick tile. It serves DIY homeowners, interior/exterior design pros, and contractors for residential and commercial projects, and says it ships door-to-door "to absolutely anywhere in North America" (see international note under Shipping). The About page uses language very close to Tilesbay's ("manufacturer-direct prices," over 2,600 colors/styles, customers "in every state in the U.S."), which strongly suggests a shared parent company/platform.

  ## Free samples:
  - Samples are ordered from the product page via an "Order a Sample" / "Add a Sample" link near Add to Cart. Only one sample per product per order is allowed. Sample sizes are 4x4 or 6x6 inches; some specialty items (pool copings, medallions, faucets, sinks) aren't available as samples.
  - Samples themselves are free, but shipping is billed at actual cost at checkout, paid by the customer. Unlike Tilesbay, I found no statement that sample shipping can be refunded/credited after a larger order — treat that as [Needs internal confirmation] rather than assuming it works the same way.
  - Expedited sample shipping is available for a fee (3rd-day for $10, 2nd-day for $20) via UPS Ground from a California warehouse. For special sample requirements, the site directs customers to support@stacked-stone.us.

  ## Shipping
  - Typical delivery is approximately 4-8 business days from order confirmation, excluding special/container-load orders — always state as approximate.
  - Freight ships via third-party trucking (30'-50' trailers) with liftgate to curbside/driveway by default; the customer is responsible for moving materials indoors unless inside delivery is arranged. Options include residential curbside with liftgate, residential inside delivery (extra fee), commercial delivery via loading dock, and terminal pickup for congested sites. Customers must state delivery conditions accurately or risk extra carrier charges billed later.
  - UPS Ground is used for small orders (recommended under 20 sq ft) and isn't recommended for tiles 12" and larger without added insurance, due to breakage risk. Deliveries don't require a signature by default; "Signature Required" costs extra.
  - Sample shipping timing is inconsistent across pages: the Shipping page says 1-2 business days processing + 1-5 business days delivery, while the FAQ says standard UPS Ground with orders placed before 8 AM EST shipping the next business day — state sample shipping as approximate.
  - Rush/expedited shipping: the FAQ directs customers to support@stacked-stone.us for expedited requests rather than stating fixed rush options — say the team can check availability and pricing rather than saying no.
  - Free shipping threshold: [Needs internal confirmation] — not found publicly.
  - International shipping: [Needs internal confirmation] — the About page claims delivery "anywhere in North America," but the Shipping & Delivery page only documents shipping within the United States. Don't promise Canada/Mexico/international shipping until confirmed internally.

  ## Freight / large orders
  - Large orders ship as freight on a pallet and require special handling equipment to unload — pallet deliveries default to curbside without a guaranteed delivery date, and the customer must inspect on arrival. Exact freight cost can't be calculated automatically; it depends on pallet count, destination, and delivery conditions.
  - Orders exceeding 4,000 sq ft can qualify for negotiated container-load shipping rates. Explain plainly that it ships as a freight/pallet shipment needing special handling, that an exact shipping cost can't be calculated here, and offer to connect the customer with the team for an accurate freight quote.

  ## Returns and exchanges
  - Important policy conflict, needs internal confirmation before publishing broader answers: the formal Return & Refund page has an internal contradiction of its own — it advertises a "30 day Money back Guarantee" headline, but its policy text says regular returns must be requested "within 15 days of the order for a full refund" (less shipping), with a 25% restocking fee, and separately states returns won't be accepted "beyond 30 days from the order date." The FAQ agrees on 15 days but states a 30% restocking fee; the Terms of Sale page states a 30-day window with a 25% restocking fee.
  - Until confirmed internally, the safest combination to quote is 15 days / 25% restocking fee (the most corroborated across pages) — but flag to the team that the site's own return policy is internally inconsistent.
  - Non-returnable items: anything marked "as-is," "no returns accepted," or "all sales final," special orders, custom-made items, and any installed product (installation = acceptance). Partial returns aren't accepted. Samples are non-returnable, with no refund on sample shipping.
  - Customer pays return shipping when Stacked Stone isn't at fault (e.g., color mismatch); outbound shipping is deducted from refunds even on orders that shipped free. Returns require an RMA (via the order confirmation email), which can take 2-3 days. Refunds process 3-5 business days after the return arrives.
  - Damaged/missing items should be reported immediately upon receipt. Up to 10% tile breakage in transit is considered acceptable/normal — useful context if a customer reports a small amount of breakage.

  ## Pricing and discounts
  - The site shows "Avail 5% Additional Discount on Orders above $2500" on category pages — identical wording and threshold to Tilesbay's.
  - Homepage banners advertise rotating promos ("Up to 35% Off," "Extra 15% Discount"). Promotions apply only to orders placed and paid during the advertised period, and Stacked Stone can cancel promotions at its discretion.
  - Product-level quantity pricing exists and varies by product (e.g., ledger panels get progressively cheaper per sq ft at higher quantity tiers).
  - Unlike Tilesbay, no dedicated wholesale/trade account application page was found — whether a trade/wholesale program exists (perhaps handled by phone/email) is [Needs internal confirmation].
  - Promo codes / price matching: [Needs internal confirmation] — none found beyond the stated discount banners.

  ## Order process
  - Unlike Tilesbay's ambiguous account situation, Stacked Stone's Terms of Use explicitly states customers must create a customer account to place orders — treat an account as required here.
  - Accepted payment: Visa, MasterCard, American Express, Discover, company/personal checks, money orders, certified checks, wire transfers, or other prearranged/electronic funds transfer method approved by Stacked Stone. Full payment is required before shipment; check payments may delay shipping until they clear.
  - The company takes orders online 24/7, and "during the week almost all orders ship the next day" per the About page. No dedicated Order Status/tracking page was found like Tilesbay's — treat tracking-number delivery via email as likely but [Needs internal confirmation] on the exact order-status lookup process.

  ## Contact and support
  - Contact page: https://www.stacked-stone.us/contact-us
  - Phone: (404) 905-9675 — confirmed on the Contact Us page and site footer. This is genuinely different from the (855) 740-5157 used by most sibling brands.
  - Email: support@stacked-stone.us — this appears consistently across the FAQ, Terms of Use, and sample-ordering page.
  - Fax: [Needs internal confirmation] — none found.
  - Support hours: [Needs internal confirmation] — no published support/business hours were found anywhere on the site.

  ## Anything else
  - Stacked Stone sells stacked-stone/ledger panels (flat panels, mini panels, L-corner pieces) in split face, 3D honed, and pencil-edge finishes, plus porcelain panels, peel-and-stick tile, and stone veneer panels; the About page also references broader natural stone materials (granite, marble, travertine, slate, limestone) and porcelain.
  - The site offers self-service visualizer tools (kitchen, bathroom, stacked-stone wall, mosaic tile, edge profile) and installation videos — useful to point customers toward for planning/visualizing a project.
  - Natural stone and tile color, finish, and lot can vary; blend tiles from different boxes for a consistent look.
  - Order 5-10% extra for wastage, plus an additional 10% for diagonal installations.
  - Warranty should not be promised — Stacked Stone provides no warranty once a product is installed or the return period has passed, whichever comes first, and disclaims all other warranties including merchantability and fitness for a particular purpose. Liability is capped at the lesser of $100 or the amount paid.
  - PEI rating: [Needs internal confirmation] — not mentioned anywhere on the site.
  `,
    lvp: `
  ## About Luxury Vinyl Plank Flooring:
  - Luxury Vinyl Plank Flooring (luxury-vinyl-plank-flooring.com) sells luxury vinyl plank (LVP) and luxury vinyl tile (LVT) flooring plus matching vinyl trim pieces (end caps, quarter round, etc.), for residential and commercial projects, serving both DIY customers and trade/contractor buyers. It positions itself as an online discount wholesaler with manufacturer-direct pricing, with distribution/warehouse locations in Atlanta, Dallas, Irvine, Newark, Chicago, Houston, Miami, and Phoenix.
  - Note: the site's About Us page copy is largely reused stone/tile boilerplate (mentions granite/marble/travertine and "2,600 colors and styles of mosaics") that doesn't match this brand's actual vinyl-flooring catalog — describe the site by what it actually sells (LVP/LVT + trims), not by the About page's category list.

  ## Free samples:
  - Samples are free; on desktop click "Add a Sample" next to "Add to Cart," on mobile tap "Buying Options" first then "Add a Sample." Only one sample per product per order is allowed. Samples are 4x4 or 6x6; some specialty exclusions are listed but read like leftover boilerplate from a stone/tile sister site, so treat vinyl-specific sample exclusions as [Needs internal confirmation].
  - Customers pay actual carrier-rate shipping on samples at checkout; expedited sample shipping costs extra ($10 for 3-Day, $20 for 2-Day UPS). Sample shipping can be refunded after a larger order using the same formula as Tilesbay: order 50 sq. ft. per sample ordered, then email both the sample and final order numbers to sales@luxury-vinyl-plank-flooring.com within one week.

  ## Shipping
  - Ships anywhere in the United States. Typical delivery is approximately 4-8 business days from order confirmation, excluding special/container-load orders — state as approximate.
  - Orders under 20 sq ft generally ship small-parcel via UPS Ground. Larger orders ship as freight on a pallet via third-party trucking, delivered curbside with a liftgate by default; inside delivery, commercial (loading-dock) delivery, and terminal pickup are also available. Orders of roughly 4,000+ sq ft can qualify for negotiated freight rates. Curbside freight has no guaranteed delivery date.
  - Sample shipping timing is stated two ways (1-2 days processing + 1-5 days delivery vs. ~4-8 business days via UPS Ground with an 8 AM EST cutoff) — state as approximate.
  - Rush/expedited shipping for regular orders: [Needs internal confirmation] — only sample shipping has published paid upgrades. Don't say rush isn't available; say the team can check options for a specific order.
  - Free shipping threshold: [Needs internal confirmation] — the returns page references orders "sent as free shipping" in passing, implying free-shipping offers exist sometimes, but no threshold is published.
  - International shipping: [Needs internal confirmation] — only "United States" is stated; don't promise Canada/Mexico/international shipping until confirmed.

  ## Freight / large orders
  - LVP planks are lighter per sq ft than stone/porcelain tile, so small orders often stay under parcel shipping — but the site's own cutoff (under 20 sq ft ships parcel) means even modest whole-room orders commonly tip into freight/pallet shipping, so this isn't a rare scenario for this brand. Some SKUs are sold only by the pallet and are freight-only regardless of order size.
  - Freight/pallet orders need special handling equipment to unload and have no guaranteed delivery date; exact cost depends on pallet count, destination, and delivery conditions. Tell the customer plainly why an exact number can't be given here, then offer to connect them with the team for a quote.

  ## Returns and exchanges
  - Use this as the safer public policy: the formal Return & Refund page and Terms of Sale agree on a 30-day return window and a 25% restocking fee. Items must be new, undamaged, unused, uninstalled, and in original packaging — installation counts as acceptance. An RMA is required (email sales@luxury-vinyl-plank-flooring.com; 2-3 days to process). No partial returns. Customer pays return shipping both ways unless the company is at fault, including on orders that shipped free (deducted from the refund). Refunds process 3-5 business days after the item arrives back; PayPal refunds have an additional 3% processing fee.
  - Important policy conflict: the FAQ states an older/different policy of 15 days and a 30% restocking fee. When in doubt, use 30 days / 25%.
  - Cancellations are handled separately and inconsistently: one page says cancelling after a 2-hour window incurs the 25% restocking fee plus shipping, while Terms of Sale says a 15% fee applies once an order is ready to ship at the warehouse (container-load orders can cancel free until physical shipment). Don't quote a specific cancellation percentage — offer to check with the team.
  - Non-returnable: used/damaged items, "as-is"/"all sales final" items, special/custom orders, installed product, and samples (including sample shipping). Damage: report within 48 hours (up to 10% breakage is normal); wrong product: report within 3 days with photos.

  ## Pricing and discounts
  - Homepage advertises rotating promos ("Up to 35% Off," "Extra 15% Discount," "Buy 1 Get One Free" on select items) alongside per-product markdowns. Promotions apply only to orders placed and paid during the advertised period, per Terms of Sale, and can be cancelled at the company's discretion.
  - Product pages show quantity-tiered per-sq-ft pricing that varies by product.
  - Wholesale/trade account program: [Needs internal confirmation] — no dedicated application page found, unlike some sibling sites.
  - Promo codes / price matching: [Needs internal confirmation] — none found publicly.

  ## Order process
  - Orders are placed through the website. Accepted payment: Visa, MasterCard, American Express, Discover, company/personal checks, money orders, certified checks, wire transfers. Orders must be paid in full before shipping; check payments may delay shipment until cleared.
  - Processing before shipment is roughly 2 business days on at least some products — treat as approximate rather than a firm SLA. Freight/pallet orders arrive by truck; customers are responsible for unloading and moving material inside unless inside delivery was arranged.
  - Order status lookup page / account-required-to-order: [Needs internal confirmation] — no dedicated order-status page or account requirement statement was found.

  ## Contact and support
  - Contact page: https://www.luxury-vinyl-plank-flooring.com/contact-us
  - Phone: (248) 864-0911
  - Email: sales@luxury-vinyl-plank-flooring.com
  - Fax: [Needs internal confirmation] — none found.
  - Support hours: Monday-Friday, 9 AM-5 PM EST (no separate product-rep hours found, unlike Tilesbay).

  ## Anything else
  - Catalog is organized as Shop by Series, Shop by Type, Shop by Look, Shop by Application, Shop by Installation, and Vinyl Trims. Products sell either by the box (e.g., ~23.8 sq ft/~41.5 lbs per box) or, for some SKUs, only by the pallet (e.g., ~1,307 sq ft/~2,285 lbs per pallet). Specs typically include thickness (e.g., 5mm), wear layer in mils (e.g., 12 mil), and locking system (e.g., UniClic click-lock).
  - The site repeats the same 5-10% wastage / 10% diagonal-install guidance and "we don't sell adhesive, buy it from a local dealer" language used on sibling sites, though the "diagonal" framing reads like it was written for tile rather than plank flooring — treat as general guidance, not plank-specific advice. Similarly, some published substrate-prep guidance reads like leftover ceramic-tile boilerplate; treat specific installation instructions as [Needs internal confirmation] rather than vinyl-specific fact.
  - Warranty should not be promised broadly — no warranty once installed or once the return period has passed, whichever comes first; liability is capped at $100 or the amount paid, whichever is less. Governed by Georgia law.
  - PEI rating: PEI is a ceramic/porcelain hardness rating and doesn't apply to vinyl flooring. If asked, explain PEI isn't the relevant spec for LVP and point to wear-layer thickness (mils) instead, which is listed on product pages.
  `,
  
  };
  
  export function getKnowledge(slug) {
    return KNOWLEDGE_BY_BRAND[slug] || '';
  }