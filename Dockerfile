FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN apk add --no-cache openssl

RUN npm ci

# Prisma generate needs a valid DATABASE_URL format (no real connection during build)
RUN echo "DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder" > prisma/.env
RUN npx prisma generate

COPY . .

RUN npm run build

# ── Runtime image ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

RUN apk add --no-cache openssl

RUN npm ci --omit=dev

# Copy built output and generated Prisma client from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
