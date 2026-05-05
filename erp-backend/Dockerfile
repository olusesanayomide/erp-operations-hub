FROM node:20-bullseye-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY scripts ./scripts
COPY prisma ./prisma
RUN npm ci

COPY src ./src
COPY nest-cli.json tsconfig.json tsconfig.build.json ./

RUN npx prisma generate
RUN npm run build

FROM node:20-bullseye-slim AS production-deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

FROM node:20-bullseye-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
COPY package.json ./

RUN node scripts/ensure-prisma-client.cjs

EXPOSE 3000

CMD ["node", "dist/src/main"]
