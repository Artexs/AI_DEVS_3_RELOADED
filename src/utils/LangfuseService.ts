import { Langfuse, LangfuseTraceClient, LangfuseSpanClient, LangfuseGenerationClient } from 'langfuse';
import type { LangfusePromptClient, TextPromptClient, ChatPromptClient, CreateChatPromptBody } from "langfuse-core";
import { OpenAIService } from './OpenAIService';

// Define a new type that's compatible with both Langfuse and OpenAI
type CompatibleChatMessage = Omit<{ role: string; content: string }, "externalId" | "traceIdType">;

export interface ProcessOptions {
  model?: string;
  temperature?: number;
}

export interface UsageStats {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export class LangfuseService {
  public langfuse: Langfuse;
  private openai: OpenAIService;

  constructor() {
    this.langfuse = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_HOST
    });
    this.openai = new OpenAIService();

    this.langfuse.on("error", (error: Error) => {
      console.error("Langfuse error:", error);
    });

    if (process.env.NODE_ENV === 'development') {
      this.langfuse.debug();
    }
  }

  flushAsync(): Promise<void> {
    return this.langfuse.flushAsync();
  }

  createTrace(options: { id: string, name: string, sessionId: string }): LangfuseTraceClient {
    return this.langfuse.trace(options);
  }

  createSpan(trace: LangfuseTraceClient, name: string, input?: any): LangfuseSpanClient {
    return trace.span({ name, input: input ? input : undefined });
  }

  finalizeSpan(span: LangfuseSpanClient, name: string, input: any, output: any): void {
    span.update({
      name,
      output,
    });
    span.end();
  }

  async finalizeTrace(trace: LangfuseTraceClient, input: any, output: any): Promise<void> {
    await trace.update({ 
      input,
      output,
    });
    await this.langfuse.flushAsync();
  }

  async shutdownAsync(): Promise<void> {
    await this.langfuse.shutdownAsync();
  }

  createGeneration(
    trace: LangfuseTraceClient, 
    name: string, 
    input: any, 
    prompt?: LangfusePromptClient,
    config?: Record<string, any>
  ): LangfuseGenerationClient {
    return trace.generation({
      name,
      input,
      prompt,
      ...config
    });
  }

  finalizeGeneration(
    generation: LangfuseGenerationClient, 
    output: any, 
    model: string, 
    usage?: { promptTokens?: number, completionTokens?: number, totalTokens?: number }
  ): void {
    generation.update({
      output,
      model,
      usage,
    });
    generation.end();
  }

  async getPrompt(
    name: string,
    version?: number,
    options?: {
      label?: string;
      cacheTtlSeconds?: number;
      fallback?: string;
      maxRetries?: number;
      type?: "text";
      fetchTimeoutMs?: number;
    }
  ): Promise<TextPromptClient> {
    return this.langfuse.getPrompt(name, version, options);
  }

  async createPrompt(body: CreateChatPromptBody): Promise<ChatPromptClient> {
    return this.langfuse.createPrompt(body);
  }

  compilePrompt(prompt: TextPromptClient | ChatPromptClient, variables: Record<string, any>): string | CompatibleChatMessage[] {
    const compiled = prompt.compile(variables);
    if (typeof compiled === 'string') {
      return compiled;
    } else if (Array.isArray(compiled)) {
      return compiled.map(message => ({
        role: message.role,
        content: message.content
      }));
    } else {
      throw new Error('Unexpected prompt compilation result');
    }
  }

  async preFetchPrompts(promptNames: string[]): Promise<void> {
    await Promise.all(promptNames.map(name => this.getPrompt(name)));
  }

  async processPrompt(
    promptName: string,
    userMessage: string = '',
    options: ProcessOptions = { model: 'gpt-4o-mini' },
    usage: UsageStats = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  ): Promise<string> {
    let generation;
    const trace = this.createTrace({
      id: `${promptName}-${Date.now()}`,
      name: promptName,
      sessionId: `${promptName}-session`
    });

    try {
      const prompt = await this.getPrompt(promptName);
      const systemMessage = prompt.compile();
      const thread = [systemMessage];

      generation = this.createGeneration(
        trace,
        promptName,
        thread,
        prompt
      );

      const response = await this.openai.processText(userMessage, systemMessage, options);
      
      this.finalizeGeneration(
        generation,
        { role: 'assistant', content: response },
        options.model!,
        usage
      );

      await this.finalizeTrace(trace, thread, { response });
      return response;
    } catch (error) {
      if (generation) {
        this.finalizeGeneration(
          generation,
          { error: error instanceof Error ? error.message : String(error) },
          'unknown'
        );
      }
      console.error(`Error processing prompt ${promptName}:`, error);
      throw error;
    } finally {
      await this.shutdownAsync();
    }
  }
}