package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"github.com/kabirpanda/resq/internal/handler"
	"github.com/kabirpanda/resq/internal/notify"
	"github.com/kabirpanda/resq/internal/storage"
	"github.com/kabirpanda/resq/internal/store"
)

var (
	router      http.Handler
	httpHandler *httpadapter.HandlerAdapter
)

func init() {
	ctx := context.Background()
	s, err := store.New(ctx)
	if err != nil {
		log.Fatalf("store: %v", err)
	}
	n, err := notify.New(ctx)
	if err != nil {
		log.Fatalf("notify: %v", err)
	}
	e, err := storage.New(ctx)
	if err != nil {
		log.Fatalf("storage: %v", err)
	}
	h := handler.New(s, n, e)
	router = h.Router()
	httpHandler = httpadapter.New(router)
}

func main() {
	if os.Getenv("AWS_LAMBDA_FUNCTION_NAME") == "" {
		port := os.Getenv("PORT")
		if port == "" {
			port = "8080"
		}
		log.Printf("local server on :%s", port)
		log.Fatal(http.ListenAndServe(":"+port, router))
		return
	}
	lambda.Start(func(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		return httpHandler.ProxyWithContext(ctx, req)
	})
}
