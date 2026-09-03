# syntax=docker/dockerfile:1
# ============================================================
# Backend - Portal de Clientes Externos (ARQ-2, anexo v1.2)
# Dockerfile multi-stage: targets `dev` (desarrollo con hot-reload)
# y `prod` (runtime minimo). Node 20 LTS fijo (paridad dev/CI/prod).
# ============================================================

FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=development
# npm ci requiere package-lock.json versionado en el repo
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate

# --- Target DEV (docker-compose dev usa este target; bind-mount del codigo) ---
FROM base AS dev
EXPOSE 3000
CMD ["npm", "run", "dev"]

# --- Build de produccion (TypeScript -> dist) ---
FROM base AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Target PROD (runtime minimo) ---
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/index.js"]
