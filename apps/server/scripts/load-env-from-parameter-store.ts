#!/usr/bin/env tsx

import { promises as fs } from 'fs';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import chalk from 'chalk';

interface LoadEnvOptions {
  parameterName: string;
  region?: string;
  outputFile: string;
  overwrite?: boolean;
}

/**
 * Loads environment variables from AWS Parameter Store and writes them to a .env file
 */
export class ParameterStoreEnvLoader {
  private ssmClient: SSMClient;

  constructor(region: string = 'us-east-2') {
    this.ssmClient = new SSMClient({ region });
  }

  /**
   * Retrieves a parameter from AWS Parameter Store
   */
  getParameter = async (parameterName: string, withDecryption: boolean = true): Promise<string> => {
    try {
      const command = new GetParameterCommand({
        Name: parameterName,
        WithDecryption: withDecryption,
      });

      const response = await this.ssmClient.send(command);
      
      if (!response.Parameter?.Value) {
        throw new Error(`Parameter ${parameterName} not found or has no value`);
      }

      return response.Parameter.Value;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to retrieve parameter ${parameterName}: ${error.message}`);
      }
      throw error;
    }
  };

  /**
   * Parses .env format string into key-value pairs
   */
  parseEnvFormat = (envContent: string): Record<string, string> => {
    const envVars: Record<string, string> = {};
    
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Parse KEY=VALUE format
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex === -1) {
        console.warn(`Skipping invalid line: ${trimmedLine}`);
        continue;
      }
      
      const key = trimmedLine.substring(0, equalIndex).trim();
      let value = trimmedLine.substring(equalIndex + 1).trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      envVars[key] = value;
    }
    
    return envVars;
  };

  /**
   * Writes environment variables to a .env file
   */
  writeEnvFile = async (envVars: Record<string, string>, outputFile: string, overwrite: boolean = false): Promise<void> => {
    try {
      await fs.access(outputFile);
      if (!overwrite) {
        throw new Error(`File ${outputFile} already exists. Use --overwrite flag to replace it.`);
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT' && !error.message.includes('already exists')) {
        throw error;
      }
    }

    const envContent = Object.entries(envVars)
      .map(([key, value]) => {
        // Escape values that contain special characters
        const needsQuotes = /[\\"\s]/.test(value);
        const escapedValue = needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value;
        return `${key}=${escapedValue}`;
      })
      .join('\n');

    await fs.writeFile(outputFile, envContent + '\n', 'utf8');
    console.log(chalk.green(`✅ Environment variables written to ${outputFile}`));
  };

  /**
   * Main method to load environment variables from Parameter Store and save to file
   */
  loadEnvFromParameterStore = async (options: LoadEnvOptions): Promise<void> => {
    try {
      console.log(chalk.blue(`🔄 Retrieving parameter: ${options.parameterName}`));
      
      const envContent = await this.getParameter(options.parameterName);
      const envVars = this.parseEnvFormat(envContent);
      
      console.log(chalk.cyan(`📋 Found ${Object.keys(envVars).length} environment variables`));
      
      await this.writeEnvFile(envVars, options.outputFile, options.overwrite || false);
      
    } catch (error) {
      console.error(chalk.red('❌ Error loading environment variables:'), error);
      process.exit(1);
    }
  };
}

// CLI functionality
const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
${chalk.bold('Usage:')} tsx scripts/load-env-from-parameter-store.ts [options]

${chalk.bold('Options:')}
  --parameter, -p <name>     Parameter Store parameter name (required)
  --region, -r <region>      AWS region (default: us-east-2)
  --output, -o <file>        Output .env file path (default: .env)
  --overwrite               Overwrite existing output file
  --help, -h                Show this help message

${chalk.bold('Examples:')}
  # Load to .env file
  tsx scripts/load-env-from-parameter-store.ts --parameter /myapp/production/env

  # Load to custom file
  tsx scripts/load-env-from-parameter-store.ts --parameter /myapp/staging/env --output .env.staging

  # Load from different region
  tsx scripts/load-env-from-parameter-store.ts --parameter /myapp/env --region us-west-2

  # Overwrite existing file
  tsx scripts/load-env-from-parameter-store.ts --parameter /myapp/env --overwrite
`);
    process.exit(0);
  }

  let parameterName = '';
  let region = 'us-east-2';
  let outputFile = '.env';
  let overwrite = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--parameter':
      case '-p':
        parameterName = args[++i];
        break;
      case '--region':
      case '-r':
        region = args[++i];
        break;
      case '--output':
      case '-o':
        outputFile = args[++i];
        break;
      case '--overwrite':
        overwrite = true;
        break;
      default:
        console.error(chalk.red(`Unknown option: ${args[i]}`));
        process.exit(1);
    }
  }

  if (!parameterName) {
    console.error(chalk.red('❌ Parameter name is required. Use --parameter or -p flag.'));
    process.exit(1);
  }

  const loader = new ParameterStoreEnvLoader(region);
  await loader.loadEnvFromParameterStore({
    parameterName,
    region,
    outputFile,
    overwrite,
  });
};

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default ParameterStoreEnvLoader;
