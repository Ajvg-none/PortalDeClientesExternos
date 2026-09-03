# syntax=docker/dockerfile:1
# ============================================================
# Frontend - Portal de Clientes Externos (ARQ-2, anexo v1.2)
# Multi-stage: target `dev` (Vite dev server con HMR) y `prod`
# (imagen Nginx que sirve el bundle estatico; el proxy /api hacia
# el backend lo define el despliegue de produccion, Fase 8).
# ============================================================

FROM node:20-alpine AS base
WORKDIR /app

# --- Target DEV ---
FROM base AS dev
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# --- Build (bundle estatico) ---
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Target PROD (Nginx sirviendo el bundle; TLS/config en Fase 8) ---
FROM nginx:1.27-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
