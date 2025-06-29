import OpenAI from "openai";
import type { ChatCompletion } from "openai/resources/chat/completions";
import { MessageArray } from "../index";

export const MODELS = {
    'mini': "gpt-4o-mini",
    '4o': "gpt-4o",
    '41': "gpt-4.1",
    // 'bielik': "bielik-11b-v2.3-instruct",
    'fine-tuned-mini': 'ft:gpt-4o-mini-2024-07-18:personal:ai-devs-3r-fine-tuning:BeNTB6Vw'
} as const;

export class OpenAIService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI();
        // this.openai = new OpenAI({
        //     baseURL: "http://localhost:1234/v1/",
        //     apiKey: "lm-studio" // Any string, LM Studio does not validate the key
        //   });
          
    }

    async processText(
        messages: MessageArray,
        model: keyof typeof MODELS = 'mini',
        temperature?: number,
        jsonMode: boolean = false,  // change to undefined when dealing with BIELIK
    ): Promise<string> {
        const response: ChatCompletion = await this.openai.chat.completions.create({
            model: MODELS[model],
            messages,
            ...(temperature !== undefined && { temperature }),
            ...(jsonMode !== undefined && { response_format: { type: jsonMode ? "json_object" : "text" } })
        });
        // console.log("response", response)
        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('No response content received from LLM');
        }

        return content.trim();
    }

    async processTextAsJson(
        messages: MessageArray,
        model: keyof typeof MODELS = 'mini',
        temperature?: number
    ): Promise<Record<string, any>> {
        const response = await this.processText(messages, model, temperature, true);
        const parsed = JSON.parse(response);
        if (typeof parsed !== 'object' || parsed === null) {
            throw new Error(`Response from LLM is not a valid JSON object --- object: ${response}`);
        }
        return parsed;
    }
} 