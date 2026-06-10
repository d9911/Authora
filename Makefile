# ---- Root Makefile for the Authora monorepo ----
.PHONY: install dev backend-dev frontend-dev backend-build frontend-build \
        backend-start backend-test backend-test-sqlite seed seed-mongo seed-sqlite docker-up docker-down \
        db-mongo-up db-postgres-up db-sqlite-up clean-ports

BACKEND_DIR = backend
FRONTEND_DIR = frontend
BACKEND_PORT = 3010
FRONTEND_PORT = 5178

GREEN  := \033[0;32m
YELLOW := \033[0;33m
BLUE   := \033[0;34m
BOLD   := \033[1m
NC     := \033[0m

clean-ports:
	@echo "$(YELLOW)🧹 Очищаем порты...$(NC)"
	@-lsof -ti :$(BACKEND_PORT) | xargs kill -9 2>/dev/null || true
	@-lsof -ti :$(FRONTEND_PORT) | xargs kill -9 2>/dev/null || true
	@echo "$(GREEN)✅ Порты свободны$(NC)"

install:
	cd backend && yarn install
	cd frontend && yarn install

# --- dev ---
dev: backend-dev frontend-dev

backend-dev:
	cd backend && yarn run dev

frontend-dev:
	cd frontend && yarn run dev

# --- build ---
backend-build:
	cd backend && yarn run build

frontend-build:
	cd frontend && yarn run build

# --- production ---
backend-start:
	cd backend && pm2 start ecosystem.config.js

# --- tests ---
backend-test:
	cd backend && npx ts-node-dev --transpile-only smoke-test.ts

backend-test-sqlite:
	cd backend && npx ts-node-dev --transpile-only smoke-test-sqlite.ts

# --- seed ---
seed:
	cd backend && yarn run seed

seed-mongo:
	cd backend && yarn run seed:mongo

seed-sqlite:
	cd backend && yarn run seed:sqlite

# --- docker ---
docker-up:
	docker compose up -d

docker-down:
	docker compose down

db-mongo-up:
	docker compose --profile mongo up -d

db-postgres-up:
	docker compose --profile postgres up -d

db-sqlite-up:
	@echo "SQLite does not require a docker container"
