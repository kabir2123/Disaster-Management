package notify

import (
	"context"
	"fmt"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sns"
)

type Notifier struct {
	client   *sns.Client
	topicARN string
}

func New(ctx context.Context) (*Notifier, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, err
	}
	topicARN := os.Getenv("SNS_TOPIC_ARN")
	return &Notifier{
		client:   sns.NewFromConfig(cfg),
		topicARN: topicARN,
	}, nil
}

func (n *Notifier) Publish(ctx context.Context, subject, message string) error {
	if n.topicARN == "" {
		fmt.Printf("[notify] %s: %s\n", subject, message)
		return nil
	}
	_, err := n.client.Publish(ctx, &sns.PublishInput{
		TopicArn: aws.String(n.topicARN),
		Subject:  aws.String(subject),
		Message:  aws.String(message),
	})
	return err
}
