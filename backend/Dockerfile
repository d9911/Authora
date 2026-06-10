# ---- authora-backend ----
# Debian-slim (glibc). Build tools are installed in the build stage so the
# native module `better-sqlite3` always compiles for the current Node ABI,
# even when no prebuilt binary exists (e.g. on newer Node majors).
FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Reuse the already-built node_modules (incl. the working better-sqlite3 binary)
# instead of reinstalling — avoids any native-rebuild at runtime.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
# Directory for the SQLite database file (mounted as a volume in compose).
RUN mkdir -p /data
EXPOSE 3010
CMD ["node", "dist/app/server.js"]
