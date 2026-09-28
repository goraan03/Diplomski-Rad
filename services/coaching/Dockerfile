FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/coaching ./services/coaching
RUN npm install
RUN npm run build -w @fittrack/shared
RUN npm run build -w @fittrack/coaching

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/coaching/package.json ./services/coaching/package.json
RUN npm install --omit=dev
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/services/coaching/dist ./services/coaching/dist
COPY services/coaching/sql ./services/coaching/sql
EXPOSE 4002
CMD ["node", "services/coaching/dist/index.js"]
