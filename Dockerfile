FROM golang:1.23-alpine AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/resq-api ./cmd/api

FROM alpine:3.20

RUN apk add --no-cache ca-certificates wget \
    && addgroup -S resq \
    && adduser -S -G resq -h /home/resq resq

WORKDIR /app
COPY --from=builder /out/resq-api /app/resq-api

USER resq

ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" >/dev/null || exit 1

ENTRYPOINT ["/app/resq-api"]
