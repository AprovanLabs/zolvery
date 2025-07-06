#!/bin/sh

set -e

echo "🚀 Initializing AWS resources in LocalStack..."
echo "   Organization: $ORG_ID"
echo "   Project: $PROJECT_ID"
echo "   Environment: $ENVIRONMENT"
echo "   Region: $AWS_REGION ($REGION_SHORT_CODE)"
echo ""

# Generate resource names following the CDK naming convention
# Table name: kossabos-prd-use1-main
TABLE_NAME="$PROJECT_ID-$ENVIRONMENT-$REGION_SHORT_CODE-main"

# Bucket name: aprovan-kossabos-prd-use1-data  
BUCKET_NAME="$ORG_ID-$PROJECT_ID-$ENVIRONMENT-$REGION_SHORT_CODE-data"

echo "📊 Creating DynamoDB table: $TABLE_NAME"
aws dynamodb create-table \
    --table-name $TABLE_NAME \
    --attribute-definitions \
        AttributeName=PK,AttributeType=S \
        AttributeName=SK,AttributeType=S \
        AttributeName=GSI,AttributeType=N \
    --key-schema \
        AttributeName=PK,KeyType=HASH \
        AttributeName=SK,KeyType=RANGE \
    --global-secondary-indexes \
        IndexName=GSI,KeySchema='[{AttributeName=GSI,KeyType=HASH},{AttributeName=SK,KeyType=RANGE}]',Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=1,WriteCapacityUnits=1}' \
    --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
    --region $AWS_REGION || echo "⚠️  Table $TABLE_NAME already exists"

echo "🪣 Creating S3 bucket: $BUCKET_NAME"
aws s3 mb s3://$BUCKET_NAME \
    --region $AWS_REGION || echo "⚠️  Bucket $BUCKET_NAME already exists"

echo ""
echo "✅ LocalStack initialization complete!"
echo ""
echo "📋 Created resources:"
echo "   DynamoDB Table: $TABLE_NAME"
echo "   S3 Bucket: $BUCKET_NAME"
echo ""
echo "🔗 Access LocalStack at: $LOCALSTACK_ENDPOINT"
echo "🌐 Web UI available at: http://localhost:4566/_localstack/health"

