# Image du site : compilation Astro puis service par Caddy.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV STRICT_ASSETS=1
RUN npm run check && npm run build

FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY deploy/redirects.caddy /etc/caddy/redirects.caddy
COPY --from=build /app/dist /srv/site
