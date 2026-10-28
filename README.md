# Admin · panel personal

Suscripciones (qué día cobran y cuánto necesitas al mes), pendientes con y sin fecha, gastos del mes y un scoreboard de metas de ahorro.
Tipo de cambio del día (oficial BCB, paralelo, Binance P2P y cada banco) y gastos en bolivianos según lo que cobró cada banco.

Next.js 16 · Drizzle ORM · Postgres (Neon en producción, PGlite en local) · Tailwind.

## Usarlo en tu PC

```bash
npm install
npm run db:migrate   # crea las tablas
npm run db:seed      # datos de ejemplo (solo si la base está vacía)
npm run dev          # http://localhost:3000
```

La contraseña para entrar está en `.env.local` (`APP_PASSWORD`); cámbiala ahí cuando quieras.
Sin `DATABASE_URL`, los datos se guardan en `./.data/pglite` (detén `npm run dev` antes de correr `db:migrate` o `db:seed`).

## Publicarlo (PC + celular)

1. Instala y entra a Vercel: `npm i -g vercel` y `vercel login`.
2. Vincula el proyecto: `vercel link`.
3. Agrega la base de datos Neon: `vercel integration add neon` (o en el dashboard: *Storage → Neon*). Esto crea `DATABASE_URL`.
4. Agrega tus secretos para producción:
   ```bash
   vercel env add APP_PASSWORD production
   vercel env add SESSION_SECRET production   # una cadena aleatoria larga
   vercel env add WAVESOFT_API_KEY production # tipo de cambio
   ```
5. Trae las variables a local **sin perder las tuyas**: `vercel env pull .env.vercel` y copia `DATABASE_URL` a `.env.local`.
6. Crea las tablas en Neon: `npm run db:migrate` (y `npm run db:seed` si quieres los datos de ejemplo).
7. Publica: `vercel --prod`.

En el celular abre la URL y usa *Compartir → Agregar a pantalla de inicio* para tenerla como app.

> Con `DATABASE_URL` en `.env.local`, el `npm run dev` local también usa Neon: mismos datos en PC y celular.

## Tipo de cambio

Los datos vienen de la API de [NextWave Software](https://wavesoft.cloud/developers) (`WAVESOFT_API_KEY` en `.env.local`; la key es gratis, se crea entrando con Google).

- `/api/v1/tc`: oficial BCB y paralelo · `/api/v1/tc/banks`: compra (BCB) y venta (pizarra) de cada banco · `/api/v1/p2p?fiat=BOB`: Binance P2P USDT.
- Se guardan en caché de Next (1 h el oficial y bancos, 15 min el P2P) para no gastar el límite de 60 peticiones por minuto.
- Al registrar un gasto en USD eliges con qué pagaste: los Bs cobrados se estiman con la **venta** de ese banco (o la compra de USDT en Binance P2P) y puedes corregirlos con lo que realmente te descontaron. El total del mes en Bs usa ese monto.
- Las condiciones de la API piden mostrar el crédito “NextWave Software” con enlace a wavesoft.cloud (ya está en Inicio y en Tipo de cambio).

## Cambios en la base de datos

Edita `src/db/schema.ts`, luego `npm run db:generate` y `npm run db:migrate`.

## Estructura

- `src/app/(app)/` — páginas: Inicio, Pendientes, Suscripciones, Gastos, Metas, Tipo de cambio, Ajustes
- `src/lib/exchange.ts` — cliente de la API de tipo de cambio · `src/lib/payment-methods.ts` — bancos y medios de pago
- `src/actions/` — server actions (crear/editar/borrar)
- `src/lib/dates.ts` — próximo cobro, agrupación por fechas · `src/lib/money.ts` — USD ↔ moneda local
- `src/db/` — esquema y conexión · `scripts/` — migrar y sembrar
