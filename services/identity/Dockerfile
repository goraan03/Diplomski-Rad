# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/identity ./services/identity
RUN npm install
RUN npm run build -w @fittrack/shared
RUN npm run build -w @fittrack/identity

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/identity/package.json ./services/identity/package.json
RUN npm install --omit=dev
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/services/identity/dist ./services/identity/dist
COPY services/identity/sql ./services/identity/sql
EXPOSE 4001
CMD ["node", "services/identity/dist/index.js"]
