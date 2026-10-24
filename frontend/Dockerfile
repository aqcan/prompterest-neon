# ── Build stage ──────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Vite env vars are baked into the public bundle: never pass secrets here.
# AI provider keys live on the backend (see docker-compose.yml).
ARG VITE_API_URL=/prompterest
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build:web

# ── Serve stage ───────────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/web /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
