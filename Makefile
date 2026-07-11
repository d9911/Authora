# ---- Root Makefile for the Authora monorepo ----
.PHONY: setup init install dev backend-dev frontend-dev backend-build frontend-build \
        backend-start backend-test backend-test-sqlite security-audit load-test test-all \
        seed seed-mongo seed-sqlite docker-up docker-down \
        db-mongo-up doc-mongo db-postgres-up db-sqlite-up clean-ports \
        check-source check-types check-account-recovery check-i18n-http check

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

setup:
	@cd backend && ([ -f .env ] || cp .env.example .env)
	@cd frontend && ([ -f .env ] || cp .env.example .env)
	@echo "$(GREEN)✅ .env files created (if they were missing)$(NC)"

install:
	cd backend && yarn install
	cd frontend && yarn install

# Удобная команда, которая делает всё сразу
init: setup install

# --- dev ---
## run backend + frontend together (Ctrl-C stops both)
dev: clean-ports
	@echo "$(BLUE)🚀 Старт backend (:$(BACKEND_PORT)) + frontend (:$(FRONTEND_PORT))$(NC)"
	@trap 'kill 0' INT TERM EXIT; \
	( cd $(BACKEND_DIR) && yarn run dev ) & \
	( cd $(FRONTEND_DIR) && yarn run dev ) & \
	wait

backend-dev:
	cd backend && yarn run dev

frontend-dev:
	cd frontend && yarn run dev

# --- build ---
backend-build:
	cd backend && yarn run build

frontend-build:
	cd frontend && yarn run build

build: backend-build frontend-build


# --- production ---
backend-start:
	cd backend && pm2 start ecosystem.config.js

# --- tests ---
backend-test:
	cd backend && yarn run test:smoke:sqlite

backend-test-sqlite:
	cd backend && yarn run test:smoke:sqlite

# --- security & load testing ---
check-source:          ## fast source-level regression checks
	node tests/check-source.mjs

check-types:           ## backend + frontend TypeScript checks
	cd backend && yarn run typecheck
	cd frontend && yarn run typecheck

check-account-recovery: ## compiled account-recovery behavior tests
	cd backend && yarn run test:account-recovery

check-i18n-http:       ## run against an already-started production frontend
	NODE_ENV=production node tests/i18n-production-fallback.mjs
	I18N_BASE_URL=$${I18N_BASE_URL:-http://127.0.0.1:5178} node tests/i18n-http-routing.mjs

check: check-source check-types check-account-recovery

security-audit:        ## OWASP-style security checks (boots its own server)
	cd backend && yarn node ../tests/security/audit.mjs

load-test:             ## k6 (auth + oauth) + autocannon throughput
	bash tests/run-tests.sh load

test-all:              ## security audit + load tests
	bash tests/run-tests.sh all

# --- seed ---
seed:
	cd backend && yarn run seed

seed-mongo:
	cd backend && yarn run seed:mongo

seed-sqlite:
	cd backend && yarn run seed:sqlite

# --- docker ---
# Default stack: backend + frontend on SQLite.
docker-up:
	docker compose up -d --build

dock-fb:
	docker compose --profile mongo -f docker-compose.yml -f docker-compose.mongo.yml up -d --no-build --force-recreate backend
	docker compose --profile mongo -f docker-compose.yml -f docker-compose.mongo.yml up -d --build --force-recreate backend frontend

# 	set -a; source backend/.env; set +a; docker compose --profile mongo -f docker-compose.yml -f docker-compose.mongo.yml -f <(printf '%s\n' 'services:' '  backend:' '    environment:' '      OWNER_EMAIL: ${OWNER_EMAIL}' '      SMTP_HOST: ${SMTP_HOST}' '      SMTP_PORT: ${SMTP_PORT}' '      SMTP_USER: ${SMTP_USER}' '      SMTP_PASS: ${SMTP_PASS}') up -d --build --force-recreate backend frontend
docker-down:
	docker compose down

# Seed sample data INSIDE the running backend container (shares its DB/volume).
docker-seed:
	docker compose exec backend node dist/infrastructure/database/sqlite/seed.js

docker-seed-mongo:
	docker compose --profile mongo -f docker-compose.yml -f docker-compose.mongo.yml exec backend node dist/infrastructure/database/mongo/seed.js

# Bring up the full stack on MongoDB (backend waits for mongo to be healthy),
# then seed it.
db-mongo-up:
	docker compose --profile mongo -f docker-compose.yml -f docker-compose.mongo.yml up -d --build
	@echo "⏳ waiting for backend to become healthy before seeding..."
	@until [ "$$(docker inspect -f '{{.State.Health.Status}}' authora-backend-1 2>/dev/null)" = "healthy" ]; do sleep 2; done
	docker compose --profile mongo -f docker-compose.yml -f docker-compose.mongo.yml exec backend node dist/infrastructure/database/mongo/seed.js
	@echo "✅ MongoDB stack up and seeded"

doc-mongo: build
	@if docker image inspect authora-backend:latest >/dev/null 2>&1 \
		&& docker image inspect authora-frontend:latest >/dev/null 2>&1; then \
		docker compose --profile mongo -f docker-compose.yml -f docker-compose.mongo.yml build --pull=false backend frontend; \
		docker compose --profile mongo -f docker-compose.yml -f docker-compose.mongo.yml up -d --no-build --force-recreate backend frontend; \
	else \
		docker compose --profile mongo -f docker-compose.yml -f docker-compose.mongo.yml up -d --build --force-recreate backend frontend; \
	fi

db-postgres-up:
	docker compose --profile postgres up -d

db-sqlite-up:
	@echo "SQLite does not require a docker container"
