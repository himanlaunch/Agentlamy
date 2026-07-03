import Anthropic from '@anthropic-ai/sdk';
import OpenAI, { AzureOpenAI } from 'openai';

function parseJsonResponse(content) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```json\s*([\s\S]+?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}

function openAiResponseText(response) {
  if (response.choices?.[0]?.message?.content) {
    return response.choices[0].message.content;
  }
  return '';
}

function anthropicResponseText(response) {
  if (!Array.isArray(response.content)) return '';
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

export function createProvider(config) {
  if (!config?.type || !config?.apiKey) {
    return null;
  }

  if (config.type === 'anthropic') {
    const client = new Anthropic({ apiKey: config.apiKey });
    return {
      name: 'anthropic',
      async generateStructuredOutput({ system, prompt, schema, model }) {
        const response = await client.messages.create({
          model: model || config.model || 'claude-3-7-sonnet-latest',
          max_tokens: 3000,
          system,
          messages: [
            {
              role: 'user',
              content: `${prompt}\n\nReturn JSON only.`,
            },
          ],
        });
        return schema.parse(parseJsonResponse(anthropicResponseText(response)));
      },
    };
  }

  if (config.type === 'azure-openai') {
    const client = new AzureOpenAI({
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      apiVersion: config.apiVersion,
      deployment: config.deployment,
    });

    return {
      name: 'azure-openai',
      async generateStructuredOutput({ system, prompt, schema, model }) {
        const response = await client.chat.completions.create({
          model: model || config.model || config.deployment,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
        });
        return schema.parse(parseJsonResponse(openAiResponseText(response)));
      },
    };
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.type === 'openai-compatible' ? config.baseUrl : undefined,
  });

  return {
    name: config.type,
    async generateStructuredOutput({ system, prompt, schema, model }) {
      const response = await client.chat.completions.create({
        model: model || config.model || 'gpt-4.1-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      });
      return schema.parse(parseJsonResponse(openAiResponseText(response)));
    },
  };
}
