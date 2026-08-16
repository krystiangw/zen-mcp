# ZEN MCP

[![npm version](https://img.shields.io/npm/v/%40krystiangw%2Fzen-mcp)](https://www.npmjs.com/package/@krystiangw/zen-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An MCP server that lets AI assistants work with the ZEN.com Payment Gateway: hosted payment links, transaction lookup, refunds, payouts, and reporting.

[Project page](https://krystiangw.github.io/zen-mcp/)

> **Unofficial.** This project is not affiliated with, endorsed by, or maintained by ZEN.com.

## What it does

Read-only tools:

- List terminal payment methods and documented currencies.
- Look up transactions, payment links, and payouts.
- List payment links and request reconciliation reports.
- Verify IPN webhook signatures locally.

Write tools:

- Create hosted payment links and QR codes without handling card data.
- Capture or cancel transactions and issue full or partial refunds.
- Create payouts and customer records.

## Disclaimer

This integration was built from public ZEN documentation without access to a live merchant account. Endpoint versions, request fields, response fields, signing details, and webhook behavior must be checked against ZEN's current OpenAPI or Postman collection before production use. Mock mode is included for evaluation without an account.

## Install

Add the published package to Claude Code:

```sh
claude mcp add zen --env ZEN_API_KEY=your_terminal_api_key -- npx -y @krystiangw/zen-mcp
```

For Claude Desktop, add this entry to its MCP configuration:

```json
{
  "mcpServers": {
    "zen": {
      "command": "npx",
      "args": ["-y", "@krystiangw/zen-mcp"],
      "env": {
        "ZEN_API_KEY": "your_terminal_api_key",
        "ZEN_PAYWALL_SECRET": "your_paywall_secret",
        "ZEN_IPN_SECRET": "your_ipn_secret",
        "ZEN_ENV": "sandbox"
      }
    }
  }
}
```

## Configuration

| Variable | Required | Description |
|---|---:|---|
| `ZEN_API_KEY` | Outside mock mode | Terminal API Key sent in `Authorization` without a Bearer prefix |
| `ZEN_PAYWALL_SECRET` | Write operations | Checkout/paywall secret used to sign request bodies |
| `ZEN_IPN_SECRET` | Webhook verification | IPN secret used only by `verify_webhook_signature` |
| `ZEN_ENV` | No | `sandbox` (default) or `production` |
| `ZEN_BASE_URL` | No | API base URL override; takes priority over `ZEN_ENV` |
| `ZEN_MOCK` | No | `1` or `true` enables deterministic offline responses |
| `ZEN_HASH_ALG` | No | `sha224`, `sha256` (default), `sha384`, or `sha512` |

In the ZEN merchant panel, go to **my.zen.com → Shop settings → Terminal** to find the Terminal API Key. Use sandbox first; the default API host is `api.zen-test.com`, although sandbox availability and onboarding requirements should be confirmed with ZEN.

## Tools

| Name | Type | Description |
|---|---|---|
| `list_payment_methods` | Read | List payment methods for the terminal |
| `get_transaction` | Read | Get a transaction by ZEN or merchant ID |
| `list_payment_links` | Read | List hosted payment links |
| `get_payment_link` | Read | Get one hosted payment link |
| `get_payout` | Read | Get a payout by ZEN ID |
| `download_report` | Read | Request a report download |
| `list_supported_currencies` | Read | List documented supported currencies |
| `verify_webhook_signature` | Read | Verify a ZEN IPN signature locally |
| `create_payment_link` | Write | Create a hosted checkout link and QR code |
| `refund_transaction` | Write, destructive | Issue a full or partial refund |
| `capture_transaction` | Write, destructive | Capture an authorized transaction |
| `cancel_transaction` | Write, destructive | Cancel a transaction |
| `create_payout` | Write, destructive | Send an outbound payout |
| `create_customer` | Write | Create a customer record |

## Security

- Tools are read-only by default; operations that move or reverse money are marked destructive for MCP clients.
- Secrets are read only from environment variables and are never tool arguments.
- Payment acceptance uses ZEN-hosted links, so this server does not collect or transmit card numbers.
- The signing algorithm follows public ZEN documentation, but nested-object and array flattening are not fully specified publicly. Verify it against the live API.
- Verify every IPN webhook signature with `ZEN_IPN_SECRET` before trusting its contents.
- Use least-privilege terminal credentials and keep human confirmation enabled for write tools.

## Demo without an account

Run the server with deterministic canned API responses:

```sh
ZEN_MOCK=1 npx -y @krystiangw/zen-mcp
```

From a development checkout:

```sh
npm install
npm run build
ZEN_MOCK=1 npm run inspect
```

## Development

Requires Node.js 18 or newer.

```sh
npm install
npm run typecheck
npm run build
npm test
ZEN_MOCK=1 npm run inspect
```

## Roadmap

- Raw card charges only after a deliberate PCI/security design; they are excluded from the MVP.
- Recurring and one-click payments after the tokenization flow is verified.
- Consumer ZEN features such as cashback and personal cards if ZEN publishes a supported API.
- Remote Streamable HTTP transport and OAuth after the stdio MVP.

## License

[MIT](LICENSE)
