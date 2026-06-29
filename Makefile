.PHONY: build-ApiFunction build-EscalationFunction build-SmsFunction tidy test build local-api local-sms sam-build sam-deploy

GOOS=linux
GOARCH=arm64
CGO_ENABLED=0
BUILD_FLAGS=-tags lambda.norpc

build-ApiFunction:
	GOOS=$(GOOS) GOARCH=$(GOARCH) CGO_ENABLED=$(CGO_ENABLED) go build $(BUILD_FLAGS) -o $(ARTIFACTS_DIR)/bootstrap ./cmd/api

build-EscalationFunction:
	GOOS=$(GOOS) GOARCH=$(GOARCH) CGO_ENABLED=$(CGO_ENABLED) go build $(BUILD_FLAGS) -o $(ARTIFACTS_DIR)/bootstrap ./cmd/escalation

build-SmsFunction:
	GOOS=$(GOOS) GOARCH=$(GOARCH) CGO_ENABLED=$(CGO_ENABLED) go build $(BUILD_FLAGS) -o $(ARTIFACTS_DIR)/bootstrap ./cmd/sms

tidy:
	go mod tidy

test:
	go test ./...

build:
	GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o bin/api ./cmd/api
	GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o bin/escalation ./cmd/escalation
	GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o bin/sms ./cmd/sms

local-api:
	go run ./cmd/api

local-sms:
	go run ./cmd/sms

sam-build:
	sam validate --lint
	sam build

sam-deploy:
	sam deploy --guided

smoke-test:
	chmod +x scripts/smoke-test.sh
	./scripts/smoke-test.sh $(BASE_URL)
