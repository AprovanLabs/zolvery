# Load Environment Variables from AWS Parameter Store

This script allows you to load environment variables from AWS Parameter Store into your local development environment.

## Prerequisites

1. AWS credentials configured (via AWS CLI, environment variables, or IAM roles)
2. Access to the Parameter Store parameters you want to load  
3. The parameter should be stored in `.env` format in Parameter Store

## Installation

The required dependencies are already included in the package.json. Run:

```bash
npm install
# or
pnpm install
```

## Usage

### Basic Usage

```bash
# Load from Parameter Store to .env file
npm run load-env -- --parameter /myapp/production/env

# Using tsx directly
tsx scripts/load-env-from-parameter-store.ts --parameter /myapp/production/env
```

### Advanced Usage

```bash
# Load to a custom file
npm run load-env -- --parameter /myapp/staging/env --output .env.staging

# Load from a different AWS region
npm run load-env -- --parameter /myapp/env --region us-west-2

# Overwrite existing .env file
npm run load-env -- --parameter /myapp/env --overwrite

# Show help
npm run load-env -- --help
```

## Parameter Store Format

Your Parameter Store parameter should contain environment variables in standard `.env` format:

```
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
DATABASE_POOL_SIZE=10

# API Keys
API_KEY=your-secret-api-key

# Feature Flags
ENABLE_FEATURE_X=true
DEBUG_MODE=false

# URLs
FRONTEND_URL=https://myapp.com
API_BASE_URL=https:/.myapp.com
```

## Programmatic Usage

You can also use the `ParameterStoreEnvLoader` class in your Node.js code:

```typescript
import ParameterStoreEnvLoader from './scripts/load-env-from-parameter-store';

const loader = new ParameterStoreEnvLoader('us-east-2');

// Load directly into process.env
await loader.loadToProcessEnv('/myapp/production/env');

// Load to a specific file
await loader.loadEnvFromParameterStore({
  parameterName: '/myapp/production/env',
  outputFile: '.env.production',
  overwrite: true
});
```

## Security Notes

- The script supports encrypted parameters (SecureString type)
- Ensure your AWS credentials have the necessary IAM permissions:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "ssm:GetParameter"
        ],
        "Resource": "arn:aws:ssm:*:*:parameter/your-parameter-path/*"
      }
    ]
  }
  ```
- Never commit the generated `.env` files to version control
- Use different Parameter Store paths for different environments

## Error Handling

The script will:
- Exit with an error if the parameter doesn't exist
- Warn about invalid lines in the parameter value
- Prevent overwriting existing files unless `--overwrite` is specified
- Provide clear error messages for AWS permission issues

## Examples

### Setting up Parameter Store

```bash
# Create a parameter in AWS Parameter Store
aws ssm put-parameter \
  --name "/kossabos/production/env" \
  --value "$(cat .env.example)" \
  --type "SecureString" \
  --description "Production environment variables for Kossabos"
```

### Loading in Development

```bash
# Load production config for testing
npm run load-env -- --parameter /kossabos/production/env --output .env.prod

# Load staging config
npm run load-env -- --parameter /kossabos/staging/env --output .env.staging
```

### Integration with npm scripts

Add to your package.json:

```json
{
  "scripts": {
    "env:prod": "npm run load-env -- --parameter /kossabos/production/env",
    "env:staging": "npm run load-env -- --parameter /kossabos/staging/env --output .env.staging",
    "dev:prod": "npm run env:prod && npm run dev"
  }
}
```
