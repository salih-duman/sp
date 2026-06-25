.PHONY: docker-build docker-down docker-logs docker-migrate docker-ps docker-reset docker-test-register docker-up test

docker-build:
	docker compose build

docker-migrate:
	docker compose --profile tools run --rm migrate

docker-up:
	docker compose up --build

docker-down:
	docker compose down

docker-reset:
	docker compose down -v

docker-logs:
	docker compose logs -f api worker postgres redis rabbitmq

docker-ps:
	docker compose ps

docker-test-register:
	curl -X POST http://localhost:3000/auth/register \
	  -H "Content-Type: application/json" \
	  -d '{"email":"local@example.com","password":"very-secure-password","name":"Local User"}'

test:
	npm test
