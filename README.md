# Back to Me — API Backend

Backend funcional para o programa de 30 dias "Back to Me" com autenticação JWT, gestão de cards diários por tier, integração Stripe + webhook, e feed da comunidade.

## Setup

```bash
npm install
cp .env.example .env
# Editar .env com suas credenciais
npm run seed     # Carrega 90 cards do JSON
npm start        # Inicia em port 3001
```

## API Endpoints

### Autenticação

**POST /auth/signup**
```bash
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```
Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 1, "email": "user@example.com", "tier": "Basico" }
}
```

**POST /auth/login**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Cards

**GET /api/cards/today**
Retorna 3 cards do dia baseado no tier do usuário.
```bash
curl -X GET http://localhost:3001/api/cards/today \
  -H "Authorization: Bearer <JWT_TOKEN>"
```
Response:
```json
{
  "date": "2026-10-20",
  "cards": [
    {
      "id": 1,
      "motivacao": "Você é invisível porque escolheu silêncio...",
      "reflexao": "Qual verdade sua você escondeu...",
      "acao": "Diga uma coisa verdadeira pra alguém que você ama...",
      "tier": "Básico"
    },
    ...
  ]
}
```

**GET /api/cards/history**
Retorna cards do mês (com status de conclusão).
```bash
curl -X GET http://localhost:3001/api/cards/history \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**GET /api/progress**
Retorna estatísticas: % conclusão, sequência, cards concluídos.
```bash
curl -X GET http://localhost:3001/api/progress \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**POST /api/actions/mark-complete**
Marca um card como concluído.
```bash
curl -X POST http://localhost:3001/api/actions/mark-complete \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"card_id": 1}'
```

### Comunidade (Pro/Premium)

**GET /api/community**
Feed de ações da comunidade (apenas Pro/Premium).
```bash
curl -X GET http://localhost:3001/api/community \
  -H "Authorization: Bearer <JWT_TOKEN>"
```
Response:
```json
{
  "feed": [
    {
      "user_id": 2,
      "card_id": 5,
      "acao_realizada": "Escrevi uma frase que nunca falei em voz alta",
      "timestamp": "2026-10-20T14:30:00Z",
      "tier": "Pro"
    }
  ]
}
```

### Stripe

**POST /api/stripe/checkout**
Cria sessão Checkout do Stripe.
```bash
curl -X POST http://localhost:3001/api/stripe/checkout \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"tier":"Pro"}'
```
Response:
```json
{
  "url": "https://checkout.stripe.com/pay/cs_...",
  "sessionId": "cs_..."
}
```

**POST /api/stripe/webhook**
Webhook (Stripe → confirma pagamento, ativa tier).
```bash
# Stripe envia automaticamente
# Signature validation + marcar subscription ativa
```

## Database Schema

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  tier VARCHAR(50) DEFAULT 'Basico', -- Basico, Pro, Premium
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  tier VARCHAR(50),
  status VARCHAR(50), -- active, cancelled, expired
  stripe_session_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  started_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cards_metadata (
  id SERIAL PRIMARY KEY,
  card_id INTEGER,
  data DATE,
  dia_do_mes INTEGER,
  semana INTEGER,
  tema_semana VARCHAR(255),
  motivacao TEXT,
  reflexao TEXT,
  acao TEXT,
  tier VARCHAR(50),
  data_criacao TIMESTAMP
);

CREATE TABLE actions_completed (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  card_id INTEGER,
  completed_at TIMESTAMP DEFAULT NOW()
);
```

## Fluxo Stripe

1. User clica "Upgrade" → POST `/api/stripe/checkout` com tier desejado
2. Redireciona pra Stripe Checkout
3. User preenche card + confirma
4. Stripe dispara `payment_intent.succeeded`
5. Webhook `/api/stripe/webhook` recebe evento
6. Backend marca `subscriptions` como active
7. Libera acesso a cards Pro/Premium

## Variáveis de Ambiente

```
DATABASE_URL=postgresql://user:password@localhost:5432/back_to_me
JWT_SECRET=seu-secret-aleatorio-super-seguro
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PORT=3001
```

## Testing

```bash
# Signup
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Login (guarde o token)
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Cards de hoje
TOKEN="seu_jwt_token_aqui"
curl -X GET http://localhost:3001/api/cards/today \
  -H "Authorization: Bearer $TOKEN"

# Marcar card completo
curl -X POST http://localhost:3001/api/actions/mark-complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"card_id":1}'

# Progress
curl -X GET http://localhost:3001/api/progress \
  -H "Authorization: Bearer $TOKEN"
```

## Estrutura de Pastas

```
back-to-me/
├── src/
│   ├── server.js           # Entry point
│   ├── db.js               # Connection pool PostgreSQL
│   ├── middleware/
│   │   └── auth.js         # JWT verification
│   ├── routes/
│   │   ├── auth.js
│   │   ├── cards.js
│   │   ├── actions.js
│   │   ├── community.js
│   │   └── stripe.js
│   └── scripts/
│       └── seed-cards.js   # Carrega JSON inicial
├── .env.example
├── package.json
└── README.md
```

## Notes

- Seed automático na startup (verifica se cards já existem antes de carregar)
- JWT expira em 24h
- Webhook Stripe com signature validation
- CORS habilitado para localhost + production URL
- Tier lock: Básico vê 3 cards/dia, Pro/Premium veem 3 cards/dia sem restrição
