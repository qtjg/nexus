declare module '@anthropic-ai/sdk' {
  export interface MessageParam {
    role: 'user' | 'assistant';
    content: string | ContentBlock[];
  }
  export interface TextBlock { type: 'text'; text: string; }
  export interface ToolUseBlock { type: 'tool_use'; id: string; name: string; input: Record<string, unknown>; }
  export interface ToolResultBlock { type: 'tool_result'; tool_use_id: string; content: string; }
  export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;
  export interface Tool { name: string; description?: string; input_schema: Record<string, unknown>; }
  export interface Usage { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number; }
  export interface Message { id: string; type: 'message'; role: 'assistant'; content: ContentBlock[]; model: string; stop_reason: string | null; stop_sequence: string | null; usage: Usage; }
  export interface MessagesCreateParams { model: string; messages: MessageParam[]; system?: string; max_tokens: number; temperature?: number; tools?: Tool[]; tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; name: string }; }
  export interface MessagesListResponse { data: Array<{ id: string; display_name?: string }>; }
  export type StreamEvent =
    | { type: 'message_start'; message: { usage: Usage } }
    | { type: 'message_delta'; usage?: { output_tokens: number } }
    | { type: 'message_stop' }
    | { type: 'content_block_start'; content_block: { type: 'text' | 'tool_use'; id?: string; name?: string } | null }
    | { type: 'content_block_delta'; delta: { type: 'text_delta'; text: string } | { type: 'input_json_delta'; partial_json: string } }
    | { type: 'content_block_stop' };
  export class Anthropic {
    constructor(options?: { apiKey?: string; baseURL?: string });
    messages: {
      create(params: MessagesCreateParams): Promise<Message>;
      stream(params: MessagesCreateParams): AsyncIterable<StreamEvent>;
    };
    models: {
      list(params?: { limit?: number }): Promise<MessagesListResponse>;
    };
  }
  export default Anthropic;
}
export type { MessageParam as AnthropicMessageParam, TextBlock, ToolUseBlock, ToolResultBlock, ContentBlock, Tool as AnthropicTool, Usage as AnthropicUsage, Message as AnthropicMessage, MessagesCreateParams, MessagesListResponse, StreamEvent } from '@anthropic-ai/sdk';
