FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate
RUN npm run build


FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Alpine's musl libc ignores the TZ env var unless the zoneinfo database is
# present — without this, Date.getHours() (used by the Telegram delivery
# alert scheduler) silently stays on UTC regardless of TZ.
RUN apk add --no-cache tzdata

# Copying the full node_modules from the build stage (instead of a fresh
# `npm ci --omit=dev`) keeps the already-generated Prisma client and engine
# binaries intact and avoids re-triggering `prisma generate` without the
# CLI (a devDependency) present.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh && mkdir -p uploads

EXPOSE 4310
ENTRYPOINT ["./docker-entrypoint.sh"]
