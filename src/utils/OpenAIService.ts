import OpenAI from "openai";
import type { ChatCompletion, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { LLMResponse } from "../index"

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TEMPERATURE = 0.7;

export class OpenAIService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI();
    }

    createTextMessages(systemContent: string, userContent: string): ChatCompletionMessageParam[] {
        return [
            {
                role: "system",
                content: systemContent
            },
            {
                role: "user",
                content: userContent
            }
        ];
    }

    createImageMessages(systemContent: string, imageBase64: string, userContent: string = ''): ChatCompletionMessageParam[] {
        return [
            {
                role: "system",
                content: systemContent
            },
            {
                role: "user",
                content: [
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${imageBase64}`,
                            detail: "high"
                        }
                    },
                    {
                        type: "text",
                        text: userContent
                    }
                ]
            }
        ];
    }

    async processText(
        userMessage: string,
        systemContext: string,
        options: {
            model?: string;
            temperature?: number;
        } = {}
    ): Promise<string> {
        const messages = this.createTextMessages(systemContext, userMessage);
        const response = await this.completion(messages, options);
        return response;
    }

    async processTextAsJson(
        userMessage: string,
        systemContext: string,
        options: {
            model?: string;
            temperature?: number;
        } = {}
    ): Promise<Record<string, any>> {
        const response = await this.processText(userMessage, systemContext, options);
        console.log("response: " , response)
        try {
            const parsed = JSON.parse(response);
            if (typeof parsed !== 'object' || parsed === null) {
                throw new Error('Response is not a valid JSON object');
            }
            return parsed;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to parse response as JSON: ${errorMessage}`);
        }
    }

    async processImage(
        imageBase64: string,
        systemContext: string,
        options: {
            model?: string;
            temperature?: number;
        } = {}
    ): Promise<string> {
        const messages = this.createImageMessages(systemContext, imageBase64);
        return this.completion(messages, options);
    }

    private async completion(
        messages: ChatCompletionMessageParam[],
        options: {
            model?: string;
            temperature?: number;
        } = {}
    ): Promise<string> {
        const response: ChatCompletion = await this.openai.chat.completions.create({
            model: options.model ?? DEFAULT_MODEL,
            messages,
            temperature: options.temperature ?? DEFAULT_TEMPERATURE
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('No response content received from LLM');
        }

        return content.trim();
    }
} 