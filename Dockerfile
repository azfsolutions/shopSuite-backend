FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Prisma generate needs a valid DATABASE_URL format (no real connection during build)
RUN echo "DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder" > prisma/.env
RUN npx prisma generate

COPY . .

RUN npm run build

# Fail build explicitly if dist/main.js was not produced
RUN test -f /app/dist/main.js || (echo "ERROR: dist/main.js not found after nest build" && ls -la /app/dist/ 2>/dev/null || echo "dist/ does not exist" && exit 1)

# ── Runtime image ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev

# Copy built output and generated Prisma client from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
