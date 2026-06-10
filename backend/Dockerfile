# ---- authora-backend ----
# Debian-slim (glibc) so better-sqlite3 uses prebuilt binaries — no node-gyp/Python.
# Node 22 to satisfy ruru's engine requirement (>=22).
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Directory for the SQLite database file (mounted as a volume in compose).
RUN mkdir -p /data
EXPOSE 3010
CMD ["node", "dist/app/server.js"]
