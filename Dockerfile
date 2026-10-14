# ─── News Trends – produkciós Docker image ───
# Többlépcsős build: a "build" fázisban fordítunk, a "runtime" fázis csak a futtatáshoz szükséges fájlokat kapja.

FROM node:22-bookworm-slim AS base
# A Prisma query engine-nek OpenSSL kell, a HTTPS hívásokhoz (AI, Stripe, RSS) CA tanúsítványok
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ─── 1. BUILD ───
FROM base AS build
COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

# A SvelteKit build közben betölti a szerver modulokat (route elemzés), amelyek indításkor
# ellenőrzik a környezeti változókat. Ezek CSAK a build fázis ál-értékei, a futó image nem kapja meg őket;
# a valódi titkok futásidőben, a .env fájlból érkeznek.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    JWT_SECRET="build-only" \
    ENCRYPTION_KEY="build-only"

RUN npx prisma generate && npm run build

# ─── 2. RUNTIME ───
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000

# A node_modules a Prisma CLI miatt teljes (indításkor a séma szinkronizálásához kell)
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --chown=node:node docker-entrypoint.sh ./
# Windows alatt szerkesztett fájl esetén a CRLF sorvégeket eltávolítjuk
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

# Nem root felhasználóként futunk
USER node
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
