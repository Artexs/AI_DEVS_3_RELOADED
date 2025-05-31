import { 
    ChatCompletionMessageParam,
    ChatCompletionUserMessageParam,
    ChatCompletionAssistantMessageParam,
    ChatCompletionSystemMessageParam,
    ChatCompletionContentPartImage,
    ChatCompletionContentPartText
} from "openai/resources/chat/completions";

export type MessageRole = "system" | "user" | "assistant";

export type Message = ChatCompletionMessageParam;

export type MessageArray = Message[];

export type {
    ChatCompletionUserMessageParam,
    ChatCompletionAssistantMessageParam,
    ChatCompletionSystemMessageParam,
    ChatCompletionContentPartImage,
    ChatCompletionContentPartText
}; 