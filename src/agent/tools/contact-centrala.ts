import { Utils, Logger } from '../../index';
import { IDoc } from '../../types/types';
import { document } from '../metadata';

export class ContactCentralaTool {
    private readonly utils: Utils;
    private readonly logger: Logger;

    constructor(logger: Logger) {
        this.utils = new Utils();
        this.logger = logger;
    }

    async sendAnswer(parameters: Record<string, any>, conversation_uuid: string): Promise<IDoc> {
        await this.logger.logJson('sendAnswer from contact centrala processing...', parameters)
        const { task, paramName, response, url } = parameters;
        // const param = { [paramName]: response };
        
        // await this.logger.log(`Sending answer for task: ${task} --- params: ${param}`);
        const urlSuffix = url.includes('/') 
                ? url.split('/').pop() 
                : url;
        const centralaAnswerJSON = await this.utils.sendToCentralaGlobal(task, { [paramName]: response }, urlSuffix);
        const centralaAnswer = JSON.stringify(centralaAnswerJSON);
        await this.logger.logJson('response from contact centrala processing...', centralaAnswerJSON)

        const respose = document(centralaAnswer, 'gpt-4o', {
            name: `centrala_response_${task}`,
            description: `Response from Centrala for task: ${task}`,
            source: 'centrala',
            content_type: 'complete',
            conversation_uuid,
        });
        return respose;
    }
}

