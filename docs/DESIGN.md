# zen-mcp — Design (MVP v0.1)

Nieoficjalny serwer **MCP (Model Context Protocol)** dla **ZEN.com Payment Gateway**
(warstwa merchant/acquiring). Pozwala asystentom AI (Claude Desktop, Claude Code,
itp.) tworzyć linki płatności, sprawdzać transakcje, robić refundy i pobierać
raporty — językiem naturalnym, na oficjalnym REST API ZEN.

> **Status:** zbudowane na podstawie publicznej dokumentacji `docs.zen.com`
> (bez aktywnego konta merchant). Kształty pól i wersje endpointów należy
> zweryfikować względem żywego OpenAPI/Postman ZEN przed użyciem produkcyjnym.
> Serwer ma tryb **mock** (`ZEN_MOCK=1`) do dem i testów bez konta.

## Dlaczego tylko merchant API
ZEN publikuje oficjalne API **wyłącznie** dla Payment Gateway. Warstwa
konsumencka (cashback, Reward Zone, karty, konta osobiste) **nie ma publicznego
API** — świadomie poza zakresem MVP (byłby to kruchy scraping). Wzorzec: Stripe/
PayPal MCP — wąsko, na oficjalnym API, wartościowo.

## Zasady projektowe
1. **Read-only first.** Narzędzia odczytu bez ryzyka; operacje ruszające pieniądze
   oznaczone `destructiveHint` i zaprojektowane wokół potwierdzenia użytkownika.
2. **Preview ≠ execute.** Tworzenie linku płatności (bezpieczne, brak danych karty)
   oddzielone od operacji wrażliwych (refund, payout).
3. **Brak danych kartowych (PAN) w MVP.** Akceptacja płatności wyłącznie przez
   **payment links / hosted checkout** — zero PCI po naszej stronie.
4. **Sekrety tylko przez env.** Nigdy jako argument narzędzia. `isSecret:true` w server.json.
5. **Idempotency** dla operacji write (nagłówek/pole idempotencyjne + `merchantTransactionId`).
6. **Walidacja Zod** twarda dla kwot/walut/ID.

## Konfiguracja (env)
| Zmienna | Wymagana | Opis |
|---|---|---|
| `ZEN_API_KEY` | tak (poza mock) | Terminal API Key — trafia do nagłówka `Authorization` (bez `Bearer`) |
| `ZEN_PAYWALL_SECRET` | do write | Sekret do podpisu request body (algorytm poniżej) |
| `ZEN_IPN_SECRET` | opcjonalna | Sekret do weryfikacji webhooków (narzędzie `verify_webhook_signature`) |
| `ZEN_ENV` | nie (domyślnie `sandbox`) | `production` → `https://api.zen.com/`, `sandbox` → `https://api.zen-test.com/` |
| `ZEN_BASE_URL` | nie | Nadpisuje base URL (ma priorytet nad `ZEN_ENV`) |
| `ZEN_MOCK` | nie | `1` → tryb mock: zwraca kanoniczne odpowiedzi, nie woła sieci (demo/testy) |
| `ZEN_HASH_ALG` | nie (domyślnie `sha256`) | Algorytm podpisu: sha224/sha256/sha384/sha512 |

## Podpis żądania (signature) — z docs.zen.com (do weryfikacji live)
Dla żądań POST budujemy pole `signature`:
1. Spłaszcz JSON body do notacji kropkowej: `obj.field=value`, tablice `col[i].field=value`.
2. Zamień na lowercase.
3. Posortuj alfabetycznie całe stringi `klucz=wartość`.
4. Złącz przez `&`.
5. Doklej na końcu `ZEN_PAYWALL_SECRET` (bez separatora).
6. Policz hash (`ZEN_HASH_ALG`), wynik: `"<hexhash>;<alg>"` (np. `"6a34...;sha256"`).

Implementacja w `src/client/signature.ts`, izolowana i pokryta testami (test wektor
z docs: hash kończy się `;sha256`). **Oznaczyć w kodzie jako do weryfikacji live.**

## Endpointy bazowe (z dokumentacji)
- Transactions: `POST /v1/transactions`, `/{id}/capture`, `/{id}/cancel`, `/{id}/renew`,
  `GET /v1/transactions/{zenId}`, `GET /v1/transactions/merchant/{merchantTransactionId}`
- Refunds: `POST /v1/refunds`
- Payouts: `POST /v1/payouts`, `GET /v1/payouts/{zenId}`, `/{id}/capture`, `/{id}/cancel`
- Customers: `POST /v3/customers`
- Payment methods: `GET /v1/payment-methods`
- Payment links: `POST /v1/payment-links`, `GET /v1/payment-links`, `GET /v1/payment-links/{id}`
- Reports: `GET /v1/reports/download`

Wersje różnią się per serwis (v1/v2/v3) — trzymać mapę ścieżek w `src/client/endpoints.ts`.

## Narzędzia MVP (tools)

### Read-only (`readOnlyHint: true`)
| Tool | Endpoint | Opis |
|---|---|---|
| `list_payment_methods` | GET /v1/payment-methods | Dostępne metody płatności terminala |
| `get_transaction` | GET /v1/transactions/{zenId} \| /merchant/{id} | Szczegóły transakcji (po ZEN id lub merchant id) |
| `list_payment_links` | GET /v1/payment-links | Lista linków płatności |
| `get_payment_link` | GET /v1/payment-links/{id} | Szczegóły linku |
| `get_payout` | GET /v1/payouts/{zenId} | Szczegóły payoutu |
| `download_report` | GET /v1/reports/download | Raport transakcji/settlement (reconciliation) |
| `list_supported_currencies` | (statyczne) | Lista walut ZEN (z dokumentacji) |

### Write — akceptacja płatności (hero, niskie ryzyko)
| Tool | Endpoint | Anotacje | Opis |
|---|---|---|---|
| `create_payment_link` | POST /v1/payment-links | write | Utwórz link/QR do zapłaty (kwota, waluta, opis, merchantTransactionId) |

### Write — wrażliwe (`destructiveHint: true`, potwierdzenie)
| Tool | Endpoint | Opis |
|---|---|---|
| `refund_transaction` | POST /v1/refunds | Zwrot środków za transakcję (pełny/częściowy) |
| `capture_transaction` | POST /v1/transactions/{id}/capture | Przechwyć autoryzację |
| `cancel_transaction` | POST /v1/transactions/{id}/cancel | Anuluj transakcję |
| `create_payout` | POST /v1/payouts | Wypłata środków (NAJWRAŻLIWSZE — ruch pieniędzy na zewnątrz) |
| `create_customer` | POST /v3/customers | Utwórz klienta (wsparcie dla recurring/one-click) |

### Narzędzie pomocnicze
| Tool | Opis |
|---|---|
| `verify_webhook_signature` | Zweryfikuj podpis IPN webhooka (używa `ZEN_IPN_SECRET`), read-only |

Każdy tool write: jasny opis skutku ubocznego w `description`, walidacja Zod,
`merchantTransactionId` + wsparcie idempotency. Kwoty jako string/minor units zgodnie
z API ZEN (do weryfikacji — API pokazuje `amount` jako string).

## Zasoby (resources)
- `zen://payment-methods` — snapshot dostępnych metod (read-only)
- `zen://currencies` — lista wspieranych walut

## Architektura plików
```
src/
  index.ts            # shebang, bootstrap stdio
  server.ts           # McpServer + rejestracja tools/resources
  config.ts           # odczyt env, wybór base URL, walidacja
  client/
    http.ts           # fetch wrapper: auth header, JSON, błędy, retry/backoff, idempotency
    signature.ts      # algorytm podpisu + weryfikacja IPN
    endpoints.ts      # mapa ścieżek (wersje per serwis)
    mock.ts           # kanoniczne odpowiedzi dla ZEN_MOCK=1
    types.ts          # typy request/response (z docs)
  tools/
    read.ts           # list_payment_methods, get_transaction, list/get payment link, get_payout, download_report, currencies
    payments.ts       # create_payment_link
    sensitive.ts      # refund, capture, cancel, payout, create_customer
    webhooks.ts       # verify_webhook_signature
```

## Testy (vitest + InMemoryTransport)
- signature.ts: wektor testowy (deterministyczny hash `;sha256`).
- Walidacja Zod: odrzucenie złych kwot/walut/ID.
- `isError:true` przy braku `ZEN_API_KEY` (poza mock).
- Tryb mock: każdy tool zwraca sensowny `structuredContent`.
- Read-only tools nie wołają write-endpointów (mock spy).

## Poza zakresem MVP (roadmap)
- Raw card charges (PAN) / bezpośredni `create_transaction` z danymi karty.
- Recurring/one-click (tokenizacja kart) — po weryfikacji flow.
- Warstwa konsumencka (cashback, Reward Zone, karty osobiste) — zależne od API ZEN.
- Transport remote (Streamable HTTP) + OAuth — po MVP stdio.
