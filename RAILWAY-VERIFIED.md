# Railway deployment

The old deployment reports describe preparation, not verified running infrastructure.

## Configuration

Create a Railway PostgreSQL service and an API service from this repository. Build with the root Dockerfile. Generate an API domain on port 3001. Set API variables:

- NODE_ENV: production
- PORT: 3001
- DATABASE_URL: reference to the PostgreSQL service's DATABASE_URL (private network)
- JWT_SECRET: a newly generated random secret, never a committed example
- STRIPE_SECRET_KEY: a restricted Stripe key with the permissions required to create Checkout Sessions
- STRIPE_WEBHOOK_SECRET: signing secret for this exact endpoint and Stripe mode
- FRONTEND_URL: actual frontend origin

Railway's generated RAILWAY_PUBLIC_DOMAIN supplies the API return URL. Outside Railway, set APP_URL explicitly. The previously documented back-to-me-landing.pages.dev did not resolve during inspection; frontend publication is not established.

Tables and all 90 cards are initialized on startup, before listening. Seeding is repeatable and repairs a partial seed. /health queries PostgreSQL and returns 503 if it is unavailable.

## Stripe

Register https://API-DOMAIN/api/stripe/webhook with snapshot events:

- checkout.session.completed
- checkout.session.async_payment_succeeded
- checkout.session.async_payment_failed

Use a matching test/sandbox key and webhook secret for validation. An HTTP 200 alone is insufficient: verify a paid checkout activates the matching purchase, user tier, and 30-day access. Repeated events must not extend access. Failures return 500 for retry. This is a one-time payment for 30 days, not a recurring subscription. Prices remain USD 29.99 / 49.99 from the original code.

## Validation

npm ci
npm test
npm audit --omit=dev

The automated suite starts an isolated local PostgreSQL server, uses synthetic users and signed test webhook fixtures, and stubs Checkout creation. It does not by itself prove delivery from Stripe or a real checkout.

Do not commit .env files or node_modules. Existing history is preserved; never reuse the formerly committed JWT secret. Docker contains only production dependencies, src, and the card JSON.

## Verified deployment — 2026-10-20 (BRT)

- API: https://api-production-4996.up.railway.app
- Health: https://api-production-4996.up.railway.app/health — HTTP 200 with PostgreSQL check.
- Railway project: Back to Me, 30b8889d-2d57-4cb0-b00e-932425d116d0; API service 10604879-b0b9-4c7e-a17e-bad058c8aa10; environment production. The environment name does not mean Stripe live mode.
- Deployed application commit: 77cce3aa5001be8e04aca084a10efa18bc3a78c6; successful deployment 86cf19ec-9541-4a22-a7f5-6b1d31899bd9.
- Docker build succeeded on Railway using Node 24. PostgreSQL 18 is private and online with a persistent volume.
- All seven listed application variables are configured. The eighth URL value is Railway's generated RAILWAY_PUBLIC_DOMAIN.
- Signup 201, login 200, free history 30 cards; actual Stripe sandbox checkout completed/paid and its webhook upgraded the same test user to Premium with 90 cards. No live payment was made.
- Stripe sandbox: acct_1UKzzR1BrJdh1NNG. Restricted key: Checkout Sessions read/write only. Webhook we_1USnhP1BrJdh1NNGdahG7k4n, enabled for the three events listed above. Event evt_1USnnX1BrJdh1NNGLN9peany had zero pending deliveries.
- Railway's new services no longer consume railway.json. Healthcheck /health, timeout 120, restart ON_FAILURE/3 and Dockerfile path were configured directly and verified in the running deployment manifest. The file remains as a legacy reference, not the source of the deployed settings.

### Remaining integration work

The FRONTEND_URL currently retains the repository's intended origin, which does not resolve. Supply the real frontend URL before customer use. Stripe is sandbox-only; live activation requires a separate matching key and webhook. Railway is on its trial; no paid plan was purchased.

GitHub source is connected as a public repository, but automatic deploy triggers cannot be created until the Railway GitHub integration has access to this repository. PR #1 contains the deployment fixes and remains open. The default master branch still has the old code: do not use --from-source until it contains the verified changes.

To redeploy the verified version explicitly (from this linked checkout):

```sh
npx @railway/cli redeploy --service api --commit 77cce3aa5001be8e04aca084a10efa18bc3a78c6 --yes
```

No secrets are stored in this document.
