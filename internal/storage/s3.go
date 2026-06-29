package storage

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

type Evidence struct {
	client  *s3.Client
	presign *s3.PresignClient
	bucket  string
	mode    string
}

func New(ctx context.Context) (*Evidence, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, err
	}
	client := s3.NewFromConfig(cfg)
	return &Evidence{
		client:  client,
		presign: s3.NewPresignClient(client),
		bucket:  env("EVIDENCE_BUCKET", "resq-evidence"),
		mode:    env("EVIDENCE_STORAGE_MODE", "s3"),
	}, nil
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func (e *Evidence) PresignUpload(ctx context.Context, districtID, incidentID, filename string) (string, string, error) {
	key := fmt.Sprintf("%s/%s/%s-%s", districtID, incidentID, uuid.NewString(), filename)
	if e.mode == "local" {
		return "local-evidence://" + key, key, nil
	}
	out, err := e.presign.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(e.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(15*time.Minute))
	if err != nil {
		return "", "", err
	}
	return out.URL, key, nil
}
