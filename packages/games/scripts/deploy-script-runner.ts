import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const accessToken = process.env.DENO_DEPLOY_ACCESS_TOKEN;
const orgId = process.env.DENO_DEPLOY_ORG_ID;

if (!accessToken || !orgId) {
  throw new Error('Missing required environment variables: DENO_DEPLOY_ACCESS_TOKEN and DENO_DEPLOY_ORG_ID');
}

const API = "https://api.deno.com/v1";
const PROJECT_ID = 'games';
const ENV_SHORT_NAME = 'prd';

const projectName = `${PROJECT_ID}-${ENV_SHORT_NAME}`
const headers = {
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
};

const getOrCreateProject = async () => {
  // First, try to get existing projects
  try {
    const listResponse = await fetch(`${API}/organizations/${orgId}/projects`, {
      method: "GET",
      headers,
    });
    
    if (listResponse.ok) {
      const projects = await listResponse.json();
      const existingProject = projects.find((p: any) => p.name === projectName);
      
      if (existingProject) {
        console.log(`📦 Using existing project: ${projectName} (${existingProject.id})`);
        return existingProject;
      }
    }
  } catch (error) {
    console.warn('Could not list existing projects, attempting to create new one...');
  }

  // Create new project if none exists
  console.log(`🆕 Creating new project: ${projectName}`);
  const createResponse = await fetch(`${API}/organizations/${orgId}/projects`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: projectName }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    
    // Check if project already exists (common error)
    if (createResponse.status === 409 || errorText.includes('already exists')) {
      console.log(`📦 Project ${projectName} already exists, fetching it...`);
      // Try to get the existing project by listing again
      const listResponse = await fetch(`${API}/organizations/${orgId}/projects`, {
        method: "GET",
        headers,
      });
      
      if (listResponse.ok) {
        const projects = await listResponse.json();
        const existingProject = projects.find((p: any) => p.name === projectName);
        if (existingProject) {
          return existingProject;
        }
      }
    }
    
    throw new Error(`Failed to create project: ${createResponse.status} - ${errorText}`);
  }

  return await createResponse.json();
}

const deployScriptRunner = async () => {
  const project = await getOrCreateProject();

  const deploymentPayload = {
    entryPointUrl: "main.ts",
    assets: {
      "main.ts": {
        "kind": "file",
        "content": `
export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const script = url.searchParams.get('script');
    
    if (!script) {
      return new Response(JSON.stringify({
        error: 'Missing script parameter',
        usage: 'Add ?script=export defult () { return 0; }'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      await Deno.writeTextFile(
        "runner.ts",
        script,
        { create: true },
      );
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to save script',
        message: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      // Dynamically import and execute the TypeScript file
      const module = await import('runner.ts');
      
      // If the module has a default export that's a function, call it
      if (typeof module.default === 'function') {
        const result = await module.default(req);
        
        // If result is a Response, return it directly
        if (result instanceof Response) {
          return result;
        }
        
        // Otherwise, return the result as JSON
        return new Response(JSON.stringify({ result }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // If no default function, return the module exports
      return new Response(JSON.stringify({ 
        message: 'Script executed successfully',
        exports: Object.keys(module)
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Script execution failed',
        message: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
        `,
        "encoding": "utf-8",
      },
    },
    envVars: {},
  };

  // Try to get existing deployments first
  try {
    const listDeploymentsResponse = await fetch(`${API}/projects/${project.id}/deployments`, {
      method: "GET",
      headers,
    });

    if (listDeploymentsResponse.ok) {
      const deployments = await listDeploymentsResponse.json();
      const activeDeployment = deployments.find((d: any) => d.status === 'success');
      
      if (activeDeployment) {
        console.log(`🔄 Updating existing deployment: ${activeDeployment.id}`);
      }
    }
  } catch (error) {
    console.warn('Could not check existing deployments, creating new one...');
  }

  // Create new deployment (Deno Deploy creates new deployments rather than updating existing ones)
  console.log(`🚀 Creating new deployment for project: ${project.name}`);
  const deployResponse = await fetch(`${API}/projects/${project.id}/deployments`, {
    method: "POST",
    headers,
    body: JSON.stringify(deploymentPayload),
  });

  if (!deployResponse.ok) {
    const errorText = await deployResponse.text();
    throw new Error(`Failed to create deployment: ${deployResponse.status} - ${errorText}`);
  }

  return await deployResponse.json();
}

const main = async () => {
  try {
    const deployment = await deployScriptRunner();
    const baseUrl = `https://${projectName}-${deployment.id}.deno.dev`;
    
    console.log(`🚀 Deployment successful!`);
    console.log(`Base URL: ${baseUrl}`);
    console.log(`\n📋 Test URLs:`);
    console.log(`• Basic test: ${baseUrl}`);
    console.log(`• Example script: ${baseUrl}?script=./example-script.ts`);
    console.log(`• Example with params: ${baseUrl}?script=./example-script.ts&name=TypeScript`);
    console.log(`\n💡 Usage:`);
    console.log(`Add ?script=path/to/your/script.ts to run any TypeScript file`);
    console.log(`Your script should export a default function that accepts a Request and returns a Response or value`);
    
    return baseUrl;
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    if (error instanceof Error && 'response' in error) {
      const response = (error as any).response;
      if (response && typeof response.text === 'function') {
        console.error('Response:', await response.text());
      }
    }
    process.exit(1);
  }
};

main();
