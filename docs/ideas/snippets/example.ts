import {} from 'kaulje'; // like oil
import {} from 'wezenum'; // intelligence x2
import {} from 'ilmurita'; // science scribe
import {} from 'ilmuveda'; // science x2
import {} from 'autopia';
import {} from 'autolib';
import {} from 'urpc';

import { mastra, kossabos } from '@urpc/clients';
import { logger, metrics, trace } from '@urpc/telemetry';

logger.info('Example URPC tool execution started.');
trace.startSpan('exampleToolExecution', async (span) => {
  metrics.incrementCounter('example_tool_invocations');
  span.setAttribute('tool.execution.status', 'completed');
  logger.info('Example URPC tool execution completed.');
});

export default async () => {
  const dailyPoem = await mastra.generate({
    description: 'Generate a prompt for a poetry competition.',
    structuredOutput: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Writing prompt for the day',
        },
        examples: {
          type: 'array',
          description: 'Example poems',
          items: {
            type: 'array',
            minItems: 3,
            maxItems: 3,
            items: {
              type: 'string',
            },
          },
        },
      },
      required: ['prompt', 'examples'],
    },
  });
  await kossabos.saveDailyData(dailyPoem);
};

kossabos.subscribe('player.joined', (event) => {
  console.log(`Player joined: ${event.playerName}`);
});

// Git update
import { args, git } from '@urpc/clients';

git.commit({ message: args.get('message') }).then(git.push({ force: true }));

// Git refresh
import { git } from '@urpc/clients';

Promise.all([
  git.revParse({ abbrevRef: 'HEAD' }),
  git.symbolicRef({ name: 'refs/remotes/origin/HEAD' }),
]).then(([root, currentBranch]) => {
  if (root === currentBranch) {
    git.pull();
    return;
  }
  git
    .checkout({ branch: root })
    .then(() => git.pull())
    .then(() => git.checkout({ branch: currentBranch }));
});
