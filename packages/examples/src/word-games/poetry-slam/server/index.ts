import OpenAI from 'openai';

// Uses 'OPENAI_API_KEY' evironment variable
const client = new OpenAI();

export default () => {
  return {
    generate: async () => {
      const response = await client.responses.create({
        model: 'gpt-4o',
        input: 'Generate a prompt for a poetry competition.',
      });
      return response.output_text;
    }
  }
}
