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
