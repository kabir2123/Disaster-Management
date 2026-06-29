package store

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sort"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/google/uuid"
	"github.com/kabirpanda/resq/internal/models"
)

var (
	ErrNotFound      = errors.New("not found")
	ErrAlreadyExists = errors.New("already exists")
)

type Store struct {
	client         *dynamodb.Client
	usersTable     string
	incidentsTable string
	resourcesTable string
}

func New(ctx context.Context) (*Store, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, err
	}
	clientOptions := []func(*dynamodb.Options){}
	if endpoint := os.Getenv("DYNAMODB_ENDPOINT_URL"); endpoint != "" {
		clientOptions = append(clientOptions, func(o *dynamodb.Options) {
			o.BaseEndpoint = aws.String(endpoint)
		})
	}
	return &Store{
		client:         dynamodb.NewFromConfig(cfg, clientOptions...),
		usersTable:     env("USERS_TABLE", "resq-users"),
		incidentsTable: env("INCIDENTS_TABLE", "resq-incidents"),
		resourcesTable: env("RESOURCES_TABLE", "resq-resources"),
	}, nil
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func (s *Store) CreateUser(ctx context.Context, user models.User) error {
	if _, err := s.GetUserByContact(ctx, user.Contact); err == nil {
		return ErrAlreadyExists
	} else if !errors.Is(err, ErrNotFound) {
		return err
	}

	_, err := s.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           aws.String(s.usersTable),
		Item:                mustMarshal(user),
		ConditionExpression: aws.String("attribute_not_exists(userID)"),
	})
	if err != nil {
		var cond *types.ConditionalCheckFailedException
		if errors.As(err, &cond) {
			return ErrAlreadyExists
		}
		return err
	}
	return nil
}

func (s *Store) GetUserByID(ctx context.Context, userID string) (*models.User, error) {
	out, err := s.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(s.usersTable),
		Key: map[string]types.AttributeValue{
			"userID": &types.AttributeValueMemberS{Value: userID},
		},
	})
	if err != nil {
		return nil, err
	}
	if out.Item == nil {
		return nil, ErrNotFound
	}
	var user models.User
	if err := attributevalue.UnmarshalMap(out.Item, &user); err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *Store) GetUserByContact(ctx context.Context, contact string) (*models.User, error) {
	input := &dynamodb.ScanInput{
		TableName:        aws.String(s.usersTable),
		FilterExpression: aws.String("contact = :contact"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":contact": &types.AttributeValueMemberS{Value: contact},
		},
	}

	users := []models.User{}
	for {
		out, err := s.client.Scan(ctx, input)
		if err != nil {
			return nil, err
		}
		for _, item := range out.Items {
			var user models.User
			if err := attributevalue.UnmarshalMap(item, &user); err != nil {
				return nil, err
			}
			users = append(users, user)
		}
		if len(out.LastEvaluatedKey) == 0 {
			break
		}
		input.ExclusiveStartKey = out.LastEvaluatedKey
	}
	if len(users) == 0 {
		return nil, ErrNotFound
	}
	sort.Slice(users, func(i, j int) bool {
		return users[i].CreatedAt > users[j].CreatedAt
	})
	return &users[0], nil
}

func (s *Store) CreateIncident(ctx context.Context, incident models.Incident) error {
	_, err := s.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(s.incidentsTable),
		Item:      mustMarshal(incident),
	})
	return err
}

func (s *Store) GetIncident(ctx context.Context, districtID, incidentID string) (*models.Incident, error) {
	out, err := s.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(s.incidentsTable),
		Key: map[string]types.AttributeValue{
			"districtID": &types.AttributeValueMemberS{Value: districtID},
			"incidentID": &types.AttributeValueMemberS{Value: incidentID},
		},
	})
	if err != nil {
		return nil, err
	}
	if out.Item == nil {
		return nil, ErrNotFound
	}
	var incident models.Incident
	if err := attributevalue.UnmarshalMap(out.Item, &incident); err != nil {
		return nil, err
	}
	return &incident, nil
}

func (s *Store) ListIncidentsByDistrict(ctx context.Context, districtID string) ([]models.Incident, error) {
	out, err := s.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(s.incidentsTable),
		KeyConditionExpression: aws.String("districtID = :districtID"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":districtID": &types.AttributeValueMemberS{Value: districtID},
		},
	})
	if err != nil {
		return nil, err
	}
	incidents := make([]models.Incident, 0, len(out.Items))
	for _, item := range out.Items {
		var incident models.Incident
		if err := attributevalue.UnmarshalMap(item, &incident); err != nil {
			return nil, err
		}
		incidents = append(incidents, incident)
	}
	return incidents, nil
}

func (s *Store) UpdateIncident(ctx context.Context, incident models.Incident) error {
	_, err := s.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(s.incidentsTable),
		Item:      mustMarshal(incident),
	})
	return err
}

func (s *Store) ListStaleIncidents(ctx context.Context, status string, olderThan time.Time) ([]models.Incident, error) {
	out, err := s.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(s.incidentsTable),
		IndexName:              aws.String("StatusIndex"),
		KeyConditionExpression: aws.String("#status = :status AND updatedAt < :cutoff"),
		ExpressionAttributeNames: map[string]string{
			"#status": "status",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":status": &types.AttributeValueMemberS{Value: status},
			":cutoff": &types.AttributeValueMemberS{Value: olderThan.UTC().Format(time.RFC3339)},
		},
	})
	if err != nil {
		return nil, err
	}
	return unmarshalIncidents(out.Items)
}

func (s *Store) CreateResource(ctx context.Context, resource models.Resource) error {
	_, err := s.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(s.resourcesTable),
		Item:      mustMarshal(resource),
	})
	return err
}

func (s *Store) GetResource(ctx context.Context, districtID, resourceID string) (*models.Resource, error) {
	out, err := s.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(s.resourcesTable),
		Key: map[string]types.AttributeValue{
			"districtID": &types.AttributeValueMemberS{Value: districtID},
			"resourceID": &types.AttributeValueMemberS{Value: resourceID},
		},
	})
	if err != nil {
		return nil, err
	}
	if out.Item == nil {
		return nil, ErrNotFound
	}
	var resource models.Resource
	if err := attributevalue.UnmarshalMap(out.Item, &resource); err != nil {
		return nil, err
	}
	return &resource, nil
}

func (s *Store) ListResourcesByDistrict(ctx context.Context, districtID string) ([]models.Resource, error) {
	out, err := s.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              aws.String(s.resourcesTable),
		KeyConditionExpression: aws.String("districtID = :districtID"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":districtID": &types.AttributeValueMemberS{Value: districtID},
		},
	})
	if err != nil {
		return nil, err
	}
	resources := make([]models.Resource, 0, len(out.Items))
	for _, item := range out.Items {
		var resource models.Resource
		if err := attributevalue.UnmarshalMap(item, &resource); err != nil {
			return nil, err
		}
		resources = append(resources, resource)
	}
	return resources, nil
}

func (s *Store) UpdateResource(ctx context.Context, resource models.Resource) error {
	_, err := s.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(s.resourcesTable),
		Item:      mustMarshal(resource),
	})
	return err
}

func NewUserID() string {
	return uuid.NewString()
}

func NewIncidentID() string {
	return uuid.NewString()
}

func NewResourceID() string {
	return uuid.NewString()
}

func mustMarshal(v any) map[string]types.AttributeValue {
	item, err := attributevalue.MarshalMap(v)
	if err != nil {
		panic(fmt.Sprintf("marshal: %v", err))
	}
	return item
}

func unmarshalIncidents(items []map[string]types.AttributeValue) ([]models.Incident, error) {
	incidents := make([]models.Incident, 0, len(items))
	for _, item := range items {
		var incident models.Incident
		if err := attributevalue.UnmarshalMap(item, &incident); err != nil {
			return nil, err
		}
		incidents = append(incidents, incident)
	}
	return incidents, nil
}
