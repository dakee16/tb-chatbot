# Tilesbay Chatbot

Customer-facing chatbot agent for Tilesbay.com. MVP scope: **product recommender** + **tile coverage calculator**.

## Architecture

```
Tilesbay.com (Magento 1.7)
    │  <script src="https://your-backend.vercel.app/widget.js" async></script>
    ▼
widget.js (vanilla JS chat UI)
    │  POST /api/chat
    ▼
api/chat.js (Vercel serverless)
    │
    ├──▶ Claude API (claude-sonnet-4-6, tool use loop)
    │
    └──▶ Magento 1 REST API (OAuth 1.0a, product search/details)
```

Nothing in Magento changes except adding one `<script>` tag (or a CMS Static Block).

## Setup

### 1. Install + env

```bash
npm install
cp .env.example .env.local
# fill in the keys
```

### 2. Get Magento OAuth tokens

Consumer key/secret come from the admin (System → Web Services → REST OAuth Consumers).

The **access token + secret** require a one-time 3-legged OAuth dance. Use the bootstrap script:

```bash
npm install
# fill .env.local with MAGENTO_BASE_URL + MAGENTO_CONSUMER_KEY + MAGENTO_CONSUMER_SECRET

# IMPORTANT: in Magento admin, edit your OAuth Consumer and set
# Callback URL to: http://localhost:3030/callback

npm run oauth
```

The script will:
1. Print a URL — open it in your browser, log in as admin, approve
2. Catch the callback automatically
3. Print `MAGENTO_ACCESS_TOKEN` and `MAGENTO_ACCESS_TOKEN_SECRET`
4. Paste those into `.env.local` and you're done (these tokens don't expire — set once, use forever)

### 3. Deploy

```bash
npx vercel
# then set env vars in Vercel dashboard
npx vercel --prod
```

### 4. Embed on Tilesbay

In Magento admin, **CMS → Static Blocks → Add New**:
- Identifier: `tilesbay_chatbot`
- Content:
  ```html
  <script src="https://your-backend.vercel.app/widget.js" async></script>
  ```

Then add to the footer via layout XML update (or have the owner add `{{block type="cms/block" block_id="tilesbay_chatbot"}}` to the footer template).

## File structure

```
api/
  chat.js              POST endpoint, runs Claude tool-use loop
lib/
  system-prompt.js     The system prompt for the bot
  tools.js             Claude tool definitions + handlers
  magento.js           Magento 1 REST + OAuth 1.0a client
public/
  widget.js            Drop-in chat widget (vanilla JS)
scripts/
  oauth-bootstrap.js   One-time helper to get Magento access token
```

## What's next (post-MVP)

- Order status lookup (tool: `get_order_by_number_and_email`)
- Tile compatibility checker (needs product attribute audit first)
- Live agent handoff (Intercom or email/Slack fallback)
- Conversation logging for QA
