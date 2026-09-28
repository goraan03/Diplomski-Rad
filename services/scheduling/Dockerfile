FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/scheduling ./services/scheduling
RUN npm install
RUN npm run build -w @fittrack/shared
RUN npm run build -w @fittrack/scheduling

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/scheduling/package.json ./services/scheduling/package.json
RUN npm install --omit=dev
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/services/scheduling/dist ./services/scheduling/dist
COPY services/scheduling/sql ./services/scheduling/sql
EXPOSE 4003
CMD ["node", "services/scheduling/dist/index.js"]
