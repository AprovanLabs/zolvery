import { connect } from '@kossabos/mcp';

const games = await connect('kossabos/games');
const mastra = await connect('kossabos/mastra');

export default async () => {
  const dailyPoem = mastra.generate({
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
  })
  await games.save_daily_data(dailyPoem);
};
