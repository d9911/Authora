# ---- authora-backend ----
# Debian-slim (glibc) so better-sqlite3 uses prebuilt binaries — no node-gyp/Python.
# Node 22 to satisfy ruru's engine requirement (>=22).
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Reuse the already-built node_modules (incl. the working better-sqlite3 binary)
# instead of reinstalling — avoids native-rebuild breakage at runtime.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
# Directory for the SQLite database file (mounted as a volume in compose).
RUN mkdir -p /data
EXPOSE 3010
CMD ["node", "dist/app/server.js"]
