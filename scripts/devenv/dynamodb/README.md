# DynamoDB

## Getting Started

```bash
# List all items in DynamoDB
AWS_PROFILE=localstack aws dynamodb scan \
    --table-name kossabos-dev-use2-main \
    --endpoint-url http://localhost:4566 \
    --region us-east-2 | jq '.Items[]'
```
