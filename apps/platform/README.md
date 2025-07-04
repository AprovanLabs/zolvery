# Kossabos Backend Platform

Serverless platform on AWS providing a storage and compute backend for Kossabos applications.

## Architecture

Store user and game-level data in DynamoDB. Run serverless functions in response to HTTP requests and WebSocket events using AWS Lambda, in Node.js.

# Kossabos Platform Infrastructure (CDK)

This CDK app defines the AWS infrastructure for the Kossabos backend platform, including:

- DynamoDB table for storing user game events and scores (with 3-month TTL)
- Lambda functions for event storage, leaderboard, and user status
- API Gateway endpoints for each Lambda

## Directory Structure

- `src/kossabos-platform-stack.ts` — Main CDK stack
- `src/app.ts` — CDK app entrypoint
- `src/handlers/` — Lambda function handlers

## Usage

1. Install dependencies:
   ```sh
   npm install
   ```
2. Bootstrap your AWS environment (once per account/region):
   ```sh
   npx cdk bootstrap
   ```
3. Deploy the stack:
   ```sh
   npx cdk deploy
   ```

## Email Forwarding

https://app.improvmx.com

- [admin@aprovan.com](mailto:admin@aprovan.com)
- [info@aprovan.com](mailto:info@aprovan.com)
