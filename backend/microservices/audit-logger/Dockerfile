# ============================================================
# OmniCast - Audit Logger gRPC Microservice Docker Image
# ============================================================
#
# Multi-stage build:
#   1. build:    Install dev deps and compile TypeScript
#   2. runtime:  Distroless Node 22 — minimal attack surface
#
# Image size: ~150MB (vs ~900MB for the full NestJS HTTP API image).
# ============================================================

# 1. Build stage
FROM node:22-alpine AS build
WORKDIR /usr/src/app

# Install only what's needed to build.
COPY package*.json tsconfig*.json nest-cli.json ./
COPY protos ./protos
RUN npm ci --omit=optional

COPY src ./src
RUN npm run build

# 2. Runtime stage
FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runtime

WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PORT=3100

# Copy compiled JS + .proto + minimal node_modules.
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/protos ./protos
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package.json ./package.json

EXPOSE 3100 50051

USER nonroot
CMD ["dist/main.js"]
