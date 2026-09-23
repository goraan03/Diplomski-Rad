FROM node:20-slim AS build
WORKDIR /app
COPY package.json ./
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY gateway ./gateway
RUN npm install
RUN npm run build -w @fittrack/shared
RUN npm run build -w @fittrack/gateway

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY gateway/package.json ./gateway/package.json
RUN npm install --omit=dev || true
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/gateway/dist ./gateway/dist
WORKDIR /app/gateway
EXPOSE 4000
CMD ["node", "dist/index.js"]