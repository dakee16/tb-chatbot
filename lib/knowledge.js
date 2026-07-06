// Brand knowledge for the Tilesbay chatbot.
//
// Fill in the placeholders below with real Tilesbay info. Write in plain English —
// the bot reads this as instructions, so clarity matters more than format.
// You can use bullets, paragraphs, headers — whatever's easiest to read.
//
// Anything you write here, the bot can use to answer customer questions.
// Anything NOT here, the bot will honestly say it doesn't know and redirect
// to the contact page.
//
// To edit: change the text below, save the file, refresh the test page.
// (No restart needed — the file is re-read on every request.)

export const BRAND_KNOWLEDGE = `
## About Tilesbay:
- Tilesbay is an online discount wholesaler of flooring, wall tile, natural stone, porcelain, mosaics, landscaping materials, and related tile products for contractors, trade professionals, DIY customers, and residential/commercial projects. The site says it supplies customers across every U.S. state and focuses on manufacturer-direct pricing.

## Free samples:
- Tilesbay offers free product samples, but customers must place sample orders through the website. On desktop, customers should open the product page and click “Add a Sample” next to “Add to Cart”; on mobile/tablet, they should tap “Buying Options” first, then “Add a Sample.” Only one sample per product per order is allowed; extra sample requirements should be emailed to csr@tilesbay.com
- Sample products are free, but sample shipping/freight is paid by the customer at checkout. Sample freight can be refunded after a larger order: Tilesbay states customers should order 50 sq. ft. per sample ordered and email both the sample and final order numbers within one week. Samples are usually 4x4 or 6x6, and some items may not be available as samples.

## Shipping
- Tilesbay's shipping page says it ships products anywhere in the United States. Shipping method is determined by order size and weight, and items can be delivered to residential or commercial addresses. The FAQ says typical delivery time is about 4-8 business days from order confirmation, excluding special/container-load orders.
- Shipping is not shown as a flat rate. Tilesbay says freight is based on the order and delivery conditions, with options such as UPS Ground for small orders, residential curbside freight with liftgate, residential inside delivery by request, commercial freight delivery, and carrier-terminal pickup. Customers must correctly state delivery conditions such as residential/commercial and liftgate needs, or additional carrier charges may be billed later.
- Samples ship by USPS/UPS or UPS Ground/equivalent. The shipping page says samples need 1-2 business days for processing and 1-5 business days for delivery, while the FAQ says sample orders usually ship the second day and take 4-8 business days by UPS Ground, so sample timing should be stated as approximate.
- Free shipping threshold: [Needs internal confirmation] — I did not find a public free-shipping threshold for regular orders.
International shipping: [Needs internal confirmation] — the shipping page says United States; the About page mentions North America, so do not promise Canada/Mexico/international shipping until confirmed internally.

## Returns and exchanges
- Use this as the safer public policy: Tilesbay’s formal Returns & Refunds page says there is a 30-day money-back guarantee and regular returns must be new, undamaged, unused, uninstalled, in original packaging, and in resellable condition. Returns require an RMA requested by emailing csr@tilesbay.com, and the RMA may take 2-3 days.
- Tilesbay says it does not accept partial returns, does not accept returns/refunds on samples or sample shipping, and does not accept returns after installation. Regular returns are refunded less actual shipping/handling costs and are subject to a 25% restocking fee; customers pay shipping both ways if Tilesbay is not at fault. Returns are usually processed 3–5 business days after arriving at Tilesbay’s location.
- Non-returnable items include used/damaged items, items marked “as-is,” “no returns accepted,” “all sales final,” special orders, and custom-made items. Damaged or missing products should be reported by email within 48 hours, and wrong products should be reported within 3 days with pictures.
- Important policy conflict: the FAQ shows an older/different return policy of 15 days and 30% restocking fee, while the Returns page and Terms of Sale say 30 days and 25%. I would update the FAQ or confirm internally before publishing chatbot answers.

## Pricing and discounts
- The site currently shows: “Avail 5% Additional Discount on Orders above $2500.” Tilesbay also shows product-level quantity pricing on some items. For example, one product page shows lower per-sq.-ft. pricing at 40 sq. ft. and 80 sq. ft. quantity tiers, so bulk discounts may vary by product.
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
- Support hours: Weekdays, 9 AM-5 PM EST. The About page also says product representatives are available Monday-Friday, 8 AM-4 PM EST.

## Products and specs
[FILL IN — anything customers commonly ask that's not on individual product pages. Examples:
- Do all tiles come with the same warranty?
- Are tiles in the same collection sold separately or only in sets?
- What does "PEI rating" mean on product pages?
- How do you ensure dye lots match across boxes?
- Do you sell installation tools or trim pieces?]

## Anything else
- Tilesbay sells natural stone, porcelain, ceramic, vinyl plank flooring, mosaics, trims/borders, landscaping products, pool coping/tiles, pavers, wall caps, ledger panels, glass/metal tiles, backsplash tiles, and related categories. The About page says Tilesbay stocks over 2,600 colors and styles of mosaics.
- Natural stone and tile products can vary in color, shade, finish, size, and lot. Tilesbay recommends ordering samples first, checking lot-specific pictures when needed, blending tiles from different boxes, verifying square footage/overage, and inspecting all boxes/pieces immediately upon receipt.
- Tilesbay recommends ordering 5-10% extra for wastage and 10% extra for diagonal installations. It also states that it does not sell setting adhesive materials, which customers should buy from a local tile dealer or home center.
- Warranty should not be promised broadly. Terms of Sale says Tilesbay does not provide warranties once the product is installed or once the return period has passed, whichever comes first.
- PEI rating: [Needs internal confirmation] — the FAQ mentions PEI ratings, but I did not find a clear public explanation of what they mean.
`;