FROM node:20-slim AS builder

WORKDIR /app

# Copy package manifests
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy contracts symlink and frontend source
COPY contracts /contracts
RUN ln -s /contracts /app/contracts || true
COPY frontend/ ./

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "start"]
