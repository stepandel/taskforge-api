FROM node:20-slim AS build

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/taskforge.db

COPY --from=build /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY src ./src
COPY scripts ./scripts

RUN mkdir -p /data && chown -R node:node /data
USER node

EXPOSE 3000

CMD ["sh", "-c", "node src/seed.js && node --require ./src/instrument.js src/server.js"]
