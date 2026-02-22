#!/bin/bash

set -e

echo "🔧 Setting up AWS CLI for LocalStack..."

# Configure AWS CLI with LocalStack credentials
aws configure set aws_access_key_id zolvery --profile localstack
aws configure set aws_secret_access_key zolvery --profile localstack
aws configure set region us-east-2 --profile localstack
aws configure set output json --profile localstack

# Set default profile to localstack for this session
export AWS_PROFILE=localstack

echo "✅ AWS CLI configured for LocalStack!"
echo ""
echo "📋 Configuration:"
echo "   Profile: localstack"
echo "   Access Key: zolvery"
echo "   Secret Key: zolvery"
echo "   Region: us-east-2"
echo "   Endpoint: Use --endpoint-url http://localhost:4566"
echo ""
echo "🚀 Now you can run commands like:"
echo "   aws dynamodb scan --table-name zolvery-dev-use2-main --endpoint-url http://localhost:4566"
echo ""
echo "💡 To use this profile in your current shell session, run:"
echo "   export AWS_PROFILE=localstack"
echo ""
echo "🔄 Or use the --profile flag:"
echo "   aws dynamodb scan --table-name zolvery-dev-use2-main --endpoint-url http://localhost:4566 --profile localstack"