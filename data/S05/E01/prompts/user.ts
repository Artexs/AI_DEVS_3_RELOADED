import { RestMessage, Conversation } from '../../../../src/S05/1';
import { Logger } from '../../../../src/index';

export const getUserPrompt = async (availableMessages: RestMessage[], conversation: Conversation['rozmowa'], logger: Logger): Promise<string> => {
    const conversationContext = {
        start: [
            conversation.start,
            ...conversation.lines.map(line => line)
        ].join('\n'),
        end: conversation.end
    };

    await logger.log(`Conversation context: ${JSON.stringify(conversationContext, null, 2)}`);

    return `return me an id of the best match of single available message for the following conversation 

<availableMessages>
${JSON.stringify(availableMessages, null, 2)}
</availableMessages>

<conversation>
${JSON.stringify(conversationContext, null, 2)}
</conversation>`;
}; 