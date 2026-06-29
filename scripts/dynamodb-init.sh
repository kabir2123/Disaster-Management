#!/bin/sh
set -eu

endpoint="${DYNAMODB_ENDPOINT_URL:-http://resq-dynamodb:8000}"

aws_dynamodb() {
  aws dynamodb --endpoint-url "$endpoint" "$@"
}

until aws_dynamodb list-tables >/dev/null 2>&1; do
  echo "waiting for DynamoDB Local at $endpoint"
  sleep 1
done

if ! aws_dynamodb describe-table --table-name "$USERS_TABLE" >/dev/null 2>&1; then
  aws_dynamodb create-table \
    --table-name "$USERS_TABLE" \
    --attribute-definitions AttributeName=userID,AttributeType=S \
    --key-schema AttributeName=userID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST >/dev/null
fi

if ! aws_dynamodb describe-table --table-name "$INCIDENTS_TABLE" >/dev/null 2>&1; then
  aws_dynamodb create-table \
    --table-name "$INCIDENTS_TABLE" \
    --attribute-definitions \
      AttributeName=districtID,AttributeType=S \
      AttributeName=incidentID,AttributeType=S \
      AttributeName=status,AttributeType=S \
      AttributeName=updatedAt,AttributeType=S \
    --key-schema AttributeName=districtID,KeyType=HASH AttributeName=incidentID,KeyType=RANGE \
    --global-secondary-indexes "IndexName=StatusIndex,KeySchema=[{AttributeName=status,KeyType=HASH},{AttributeName=updatedAt,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
    --billing-mode PAY_PER_REQUEST >/dev/null
fi

if ! aws_dynamodb describe-table --table-name "$RESOURCES_TABLE" >/dev/null 2>&1; then
  aws_dynamodb create-table \
    --table-name "$RESOURCES_TABLE" \
    --attribute-definitions AttributeName=districtID,AttributeType=S AttributeName=resourceID,AttributeType=S \
    --key-schema AttributeName=districtID,KeyType=HASH AttributeName=resourceID,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST >/dev/null
fi

echo "DynamoDB Local tables are ready"
