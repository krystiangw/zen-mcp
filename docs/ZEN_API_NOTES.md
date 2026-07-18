# ZEN.com API — fakty (research agent 1)

## Produkt
ZEN.COM — EMI licencjonowane przez Bank Litwy. Produkt z API: **ZEN Payments** (bramka płatnicza + payouts + karty/customers). Konsumenckie karty/konta ZEN **nie mają** publicznego API. KYC/onboarding tylko przez panel, nie API.

## Base URLs
- Production: `https://api.zen.com/`
- Sandbox/test: `https://api.zen-test.com/`
- Panel: `my.zen.com` (prod), `my.zen-test.com` (test)
- Docs canonical: `docs.zen.com` (żywe). `developer.zen.com` + OpenAPI `powerapi.html` — nieosiągalne przez fetch (geo/region gate?), do zdobycia ręcznie (OpenAPI/Postman).

## Auth
- Header: `Authorization: <Terminal API Key>` (BEZ `Bearer`), `Content-Type: application/json`, HTTPS wymagane.
- In-body `signature`: flatten JSON do dot-notation → lowercase → sort alfabetycznie (całe stringi) → join `&` → doklej `paywallSecret` na końcu → SHA224/256/384/512 → format `"<hexhash>;sha256"`.
- 3 osobne sekrety: **Terminal API Key** (auth header), **paywallSecret/Checkout Secret** (podpis requestu), **IPN Secret** (weryfikacja webhooków).
- Brak OAuth. Statyczny klucz per-terminal.

## Endpointy (✅ = dosłownie w docs)
### Transactions
- POST `/v1/transactions` ✅ — utwórz transakcję (purchase)
- POST `/v1/transactions/{id}/capture` ✅
- GET `/v1/transactions/{zenId}` ✅
- GET `/v1/transactions/merchant/{merchantId}` ✅
- POST `/v1/transactions/{id}/cancel` ✅
- POST `/v1/transactions/{id}/renew` ✅
- Pola request: authorization{amount,currency,sessionId,type}, source{...}, merchantTransactionId, amount, currency, customIpnUrl, comment, items[], customer{}, paymentSpecificData{type,...}, billingAddress{}, shippingAddress{}, cashback{}, signature
- Response 201: id, merchantTransactionId, redirectUrl, amount, currency, status, paymentChannel, createdAt, cardInfo, refunds, actions, customer, ...
### Refunds
- POST `/v1/refunds` ✅
### Payouts
- POST `/v1/payouts` ✅
- GET `/v1/payouts/{zenId}` ✅
- POST `/v1/payouts/{id}/capture` ✅
- POST `/v1/payouts/{id}/cancel` ✅
- Pola: merchantTransactionId, paymentChannel (np. PCL_CARD), amount (string), currency, customer{}, paymentSpecificData (crypto dest addr), ...
### Customers & cards (wersje do weryfikacji live)
- POST `/v3/customers`
- POST/GET/PATCH/DELETE `/v2/purchase-cards[/{cardId}]`
- POST/GET/PATCH/DELETE `/v2/payout-profiles/card[/{cardId}]`
### Inne
- GET `/v1/payment-methods`
- POST/GET `/v1/payment-links`
- GET `/v1/reports/download`
- BLIK payment tokens (POST/GET)

**Uwaga wersji:** transactions/refunds/payouts = v1, cards = v2, customers = v3. Weryfikować per-serwis.

## Webhooki (IPN — Instant Payment Notification)
- Domyślnie włączone, dla każdej sfinalizowanej transakcji + refundy.
- Override per-transakcja: `customIpnUrl`; albo URL na poziomie terminala.
- Podpis: ten sam algorytm concat+SHA, sekret = **IPN Secret**. Rekomputacja i porównanie.
- Statusy: NEW, PENDING, AUTHORIZED, ACCEPTED, REJECTED, CANCELED.
- GAP: dokładny payload JSON + kod ACK + retry policy — strona JS-rendered, nie wyekstrahowano. Do potwierdzenia z żywej strony/Postman.

## Ograniczenia
- Waluty (potwierdzone): AED,AUD,BGN,CAD,CHF,CNY,CZK,DKK,EUR,GBP,HKD,HUF,ILS,JPY,KES,MXN,NOK,NZD,PLN,QAR,RON,SAR,SEK,SGD,THB,TRY,UGX,USD,ZAR,ISK.
- Metody: Card (+Apple/Google Pay), BLIK, Bancontact, iDEAL, Sofort, Neosurf, Neteller, Skrill, UnionPay, Pay By Link EE, Pay By ZEN, Multibanco, Dragon (crypto).
- Produkcja wymaga pełnego onboardingu merchant + KYC. Brak self-serve API onboarding.
- Sandbox: istnieje (api.zen-test.com), ale dostęp prawdopodobnie za rejestracją merchant — NIEPOTWIERDZONE czy no-KYC self-serve.
- Rate limity: niedokumentowane.

## Integration models
Basic (redirect hosted checkout), Advanced (direct REST), Plugin (WooCommerce/PrestaShop/Magento).

## Kluczowe GAP-y do domknięcia
1. IPN payload schema + ACK + retry — zdobyć z żywej strony/Postman.
2. developer.zen.com / OpenAPI nieosiągalne — zdobyć OpenAPI/Postman collection.
3. Wersje v1/v2/v3 — weryfikować live.
4. Rate limity nieznane.
5. Dostęp do sandbox — zweryfikować czy wymaga KYC.
