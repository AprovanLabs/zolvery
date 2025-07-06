#!/bin/sh

set -e

# Environment variables for naming resources
ORG_ID=${ORG_ID:-"aprovan"}
PROJECT_ID="kossabos"
ENVIRONMENT=${ENVIRONMENT:-"prd"}
AWS_REGION=${AWS_REGION:-"us-east-2"}
REGION_SHORT_CODE="use2"  # us-east-2 -> use2

# LocalStack endpoint
LOCALSTACK_ENDPOINT="http://localhost:4566"

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

# Database name: kossabos_prd_use1_lake
DATABASE_NAME="${PROJECT_ID}_${ENVIRONMENT}_${REGION_SHORT_CODE}_lake"

echo "📊 Creating DynamoDB table: $TABLE_NAME"
aws dynamodb create-table \
    --endpoint-url $LOCALSTACK_ENDPOINT \
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
    --endpoint-url $LOCALSTACK_ENDPOINT \
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

