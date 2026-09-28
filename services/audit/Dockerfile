FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/audit ./services/audit
RUN npm install
RUN npm run build -w @fittrack/shared
RUN npm run build -w @fittrack/audit

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/audit/package.json ./services/audit/package.json
RUN npm install --omit=dev
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/services/audit/dist ./services/audit/dist
COPY services/audit/sql ./services/audit/sql
EXPOSE 4004
CMD ["node", "services/audit/dist/index.js"]