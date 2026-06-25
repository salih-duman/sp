FROM node:24-bookworm-slim AS base

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
