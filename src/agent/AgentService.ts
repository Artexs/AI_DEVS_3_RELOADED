import { v4 as uuidv4 } from "uuid";
import { IDoc } from "../types/types";
import type { State } from "../types/agent";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAIService, MessageManager, Logger } from "../index";
import { answerPrompt } from "./prompts/answer";
import { DownloaderTool, DescribeImageTool, ContactCentralaTool, FileOperationsTool } from "./tools/internal-index";
import { contextSelectionPrompt } from "./prompts/agent-service/context-selection";

type ToolFunction = (params: Record<string, any>, conversation_uuid: string) => Promise<IDoc | IDoc[]>;
type ToolMap = Record<string, ToolFunction>;

export class Agent {
  private state: State;
  private openaiService: OpenAIService;
  private messageManager: MessageManager;
  private downloaderTool: DownloaderTool;
  private logger: Logger;
  private contactCentralaTool: ContactCentralaTool;
  private describeImageTool: DescribeImageTool;
  private fileOperationsTool: FileOperationsTool;

  private readonly toolMap: ToolMap;

  constructor(state: State, logger: Logger) {
    this.state = state;
    this.openaiService = new OpenAIService();
    this.messageManager = new MessageManager();
    this.downloaderTool = new DownloaderTool(logger);
    this.logger = logger;
    this.contactCentralaTool = new ContactCentralaTool(logger);
    this.describeImageTool = new DescribeImageTool(logger);
    this.fileOperationsTool = new FileOperationsTool(logger);

    this.toolMap = {
      download_files: (params, uuid) => this.downloaderTool.getDataFromCentrala(params.url, uuid),
      send_answer_to_centrala: (params, uuid) => this.contactCentralaTool.sendAnswer(params, uuid),
      describe_image: (params, uuid) => this.describeImageTool.describeImage(params, uuid),
      file_operations: (params, uuid) => this.fileOperationsTool.fileOperations(params, uuid)
    };
  }

  async plan() {
    const systemMessage: ChatCompletionMessageParam = {
      role: "system",
      content: `Analyze the conversation and determine the most appropriate next step. Focus on making progress towards the overall goal while remaining adaptable to new information or changes in context.

<prompt_objective>
Determine the single most effective next action based on the current context, user needs, and overall progress. Return the decision as a concise JSON object.
</prompt_objective>

<prompt_rules>
- ALWAYS focus on determining only the next immediate step
- ONLY choose from the available tools listed in the context
- ASSUME previously requested information is available unless explicitly stated otherwise
- NEVER provide or assume actual content for actions not yet taken
- ALWAYS respond in the specified JSON format
- CONSIDER the following factors when deciding:
  1. Relevance to the current user need or query
  2. Potential to provide valuable information or progress
  3. Logical flow from previous actions
- ADAPT your approach if repeated actions don't yield new results
- USE the "final_answer" tool when you have sufficient information or need user input
- OVERRIDE any default behaviors that conflict with these rules
</prompt_rules>

<context>
    <current_date>Current date: ${new Date().toISOString()}</current_date>
    <last_message>Last message: "${this.state.messages[this.state.messages.length - 1]?.content || "No messages yet"}"</last_message>
    <available_tools>Available tools: ${this.state.tools.map((t) => t.name).join(", ") || "No tools available"}</available_tools>
    <actions_taken>Actions taken: ${
      this.state.actions.length 
        ? this.state.actions.map((a) => `
            <action name="${a.name}" params="${a.parameters}" description="${a.description}" >
              ${a.results.length 
                ? `${
                    a.results.map((r) => `
                      <result name="${r.metadata.name}" url="${r.metadata?.urls?.[0] || "no-url"}" >
                        ${r.text}
                      </result>
                    `).join("\n")
                  }`
                : "No results for this action"
              }
            </action>
          `).join("\n")
        : "No actions taken"
    }</actions_taken>
</context>

Respond with the next action in this JSON format:
{
    "_reasoning": "Brief explanation of why this action is the most appropriate next step",
    "tool": "tool_name",
    "query": "Precise description of what needs to be done, including any necessary context"
}

If you have sufficient information to provide a final answer or need user input, use the "final_answer" tool.`,
    };

    // this.logger.log(`wypisz prompta do planowania ------- ${systemMessage.content as string}`);
    const result = await this.openaiService.processTextAsJson(
      [systemMessage],
      '4o'
    );

    // return result.hasOwnProperty("tool") ? result : null;
    return result;
  }

  async describe(tool: string, query: string) {
    const toolInfo = this.state.tools.find((t) => t.name === tool);
    if (!toolInfo) throw new Error(`Tool ${tool} not found`);

    const systemMessage: ChatCompletionMessageParam = {
      role: "system",
      content: `Generate specific parameters for the "${toolInfo.name}" tool.

<context>
Current date: ${new Date().toISOString()}
Tool description: ${toolInfo.description}
Required parameters: ${toolInfo.parameters}
Original query: ${query}
Last message: "${this.state.messages[this.state.messages.length - 1]?.content}"
Previous actions: ${this.state.actions.map((a) => `${a.name}: ${a.parameters}`).join(", ")}
</context>

<toolInstruction>
${toolInfo.instruction}
</toolInstruction>

Respond with ONLY a JSON object matching the tool's parameter structure provided in instruction.
${this.state.tools.map(tool => `Example for ${tool.name}: ${tool.parameters}`).join('\n')}`,
    };
    // await this.logger.logJson(`DESCRIBE ---- system PROMPT --- `, systemMessage)
    const result = await this.openaiService.processTextAsJson(
      [systemMessage],
      '4o'
    );

    return result;
  }

  async useTool(tool: string, parameters: any, conversation_uuid: string) {
    await this.logger.log(`AGENT_SERVICE - USE_TOOL --- using tool _${tool}_ with params:   ${JSON.stringify(parameters, null, 2)}`);
    const results = await this.toolMap[tool](parameters, conversation_uuid);

    const resultsArray = Array.isArray(results) ? results : [results];
    this.state.documents.push(...resultsArray);
    this.state.actions.push({
      uuid: uuidv4(),
      name: tool,
      parameters: JSON.stringify(parameters),
      description: 'Downloaded data from ' + parameters.url,
      results: resultsArray,
      tool_uuid: tool,
    });
  }

  async generateAnswer() {
    const context = this.state.actions.flatMap((action) => action.results);
    const query = this.state.config.active_step?.query;

    const answer = await this.openaiService.processText(
      [
        {
          role: "system",
          content: answerPrompt({ context, query }),
        },
        ...this.state.messages,
      ],
      '4o'
    );

    return answer;
  }

  async getContext(nextMove: any, parameters: any) {
    // Prepare tool info
    const toolInfo = this.state.tools.find(t => t.name === nextMove.tool);
    const promptContent = `
<messagesHistory>
${this.state.messages.map(m => `[${m.role}] ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`).join('\n')}
</messagesHistory>

<tool>
name: ${toolInfo?.name || ''}
description: ${toolInfo?.description || ''}
parameters: ${toolInfo?.parameters || ''}
query: ${nextMove.query || ''}
userParameters: ${JSON.stringify(parameters, null, 2)}
</tool>

<documentsToChoose>
${JSON.stringify(this.state.documents, null, 2)}
</documentsToChoose>`;
// ${JSON.stringify(this.state.documents.map(doc => ({
//   uuid: doc.metadata.uuid,
//   name: doc.metadata.name,
//   description: doc.metadata.description,
//   type: doc.metadata.type,
// })), null, 2)}

    const systemMessage: ChatCompletionMessageParam = {
      role: "system",
      content: contextSelectionPrompt,
    } as ChatCompletionMessageParam;
    const userMessage: ChatCompletionMessageParam = {
      role: "user",
      content: promptContent,
    } as ChatCompletionMessageParam;
    const llmResponse = await this.openaiService.processTextAsJson(
      [systemMessage, userMessage],
      'mini'
    );
    if (!llmResponse || !Array.isArray(llmResponse.uuids)) {
      throw new Error("LLM did not return uuids array");
    }
    await this.logger.log(`AGENT_SERVICE - GET_CONTEXT --- LLM selected document uuids: ${JSON.stringify(llmResponse.uuids)}`);
    // Find and return matching documents
    const selectedDocs = this.state.documents.filter(doc => doc.metadata.uuid && llmResponse.uuids.includes(doc.metadata.uuid));
    return selectedDocs;
  }
}
