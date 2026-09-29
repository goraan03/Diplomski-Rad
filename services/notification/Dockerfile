FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/notification ./services/notification
RUN npm install
RUN npm run build -w @fittrack/shared
RUN npm run build -w @fittrack/notification

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/notification/package.json ./services/notification/package.json
RUN npm install --omit=dev
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/services/notification/dist ./services/notification/dist
EXPOSE 4005
CMD ["node", "services/notification/dist/index.js"]