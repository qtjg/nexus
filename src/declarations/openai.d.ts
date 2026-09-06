declare module 'openai' {
  export interface ChatCompletionMessageParam {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string;
    name?: string;
    tool_call_id?: string;
    tool_calls?: ChatCompletionMessageToolCall[];
  }
  export interface ChatCompletionMessageToolCall {
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }
  export interface ChatCompletionTool {
    type: 'function';
    function: { name: string; description?: string; parameters?: Record<string, unknown> };
  }
  export interface CompletionUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  }
  export interface ChatCompletionChunk {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
      index: number;
      delta: { content?: string; tool_calls?: Array<{ id?: string; type?: string; function?: { name?: string; arguments?: string } }> };
      finish_reason?: string | null;
    }>;
    usage?: CompletionUsage;
  }
  export interface ChatCompletion {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
      index: number;
      message: { role: string; content: string | null; tool_calls?: ChatCompletionMessageToolCall[] };
      finish_reason: string | null;
    }>;
    usage?: CompletionUsage;
  }
  export interface Model { id: string; object: string; owned_by: string; }
  export interface ModelsList { data: Model[]; object: string; }
  export class OpenAI {
    constructor(options?: { apiKey?: string; baseURL?: string });
    chat: {
      completions: {
        create(params: any): Promise<ChatCompletion> | AsyncIterable<ChatCompletionChunk>;
      };
    };
    models: {
      list(): Promise<ModelsList>;
      retrieve(id: string): Promise<Model>;
    };
  }
  export default OpenAI;
}
export type { ChatCompletionMessageParam, ChatCompletionMessageToolCall, ChatCompletionTool, CompletionUsage, ChatCompletionChunk, ChatCompletion, Model as OpenAIModel, ModelsList } from 'openai';
