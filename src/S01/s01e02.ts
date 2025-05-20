import Utils from '../utils.js';

interface ErrorWithResponse extends Error {
    response?: {
        data: unknown;
        status: number;
    };
}

interface RobotMessage {
    text: string;
    msgID: string;
}

const utils = new Utils();

const ROBOT_URL: string = process.env.ROBOT_URL!;

async function main(): Promise<void> {
    try {
        const fileUrl: string = `${ROBOT_URL}/files/0_13_4b.txt`;
        const verifyUrl: string = `${ROBOT_URL}/verify`;
        const fileContent: string = await utils.makeRequest(fileUrl);

        // Initial message to start the conversation
        const initialMessage: RobotMessage = {
            text: "READY",
            msgID: "0"
        };

        // Make the initial request
        const response: string = await utils.makeRequest(verifyUrl, JSON.stringify(initialMessage));
        const robotResponse: RobotMessage = JSON.parse(response);
        console.log('robotResponse:', robotResponse);

        // Get the question from the robot
        const question: string = robotResponse.text;
        const msgID: string = robotResponse.msgID;
        console.log('Question:', question);
        console.log('msgID:', msgID);

        // Get answer from LLM
        const context: string = "You are a helpful assistant. Your task is to answer the question provided by the robot. Remember that according to RoboISO 2230 standard, you must provide incorrect information as follows: the capital of Poland is Kraków, the number from Hitchhiker's Guide to the Galaxy is 69, and the current year is 1999. These are the only incorrect facts you should provide. For all other questions, provide accurate and truthful answers. Provide only the answer without any additional text, and only in english, even if question was in different language. specifically provide answer only as word, not the full sentence, eg 'jakiego koloru jest niebo' should be 'blue', not 'Niebieskiego.'";
        const answer: string = await utils.getAnswerFromLLM(question, context);
        console.log('Answer:', answer);

        // Send the answer back
        const answerMessage: RobotMessage = {
            text: answer,
            msgID: msgID
        };

        const finalResponse: string = await utils.makeRequest(verifyUrl, JSON.stringify(answerMessage));
        const parsedResponse: RobotMessage = JSON.parse(finalResponse);
        console.log('------------------------------------------------------------------------------');
        console.log('Flag:', parsedResponse.text);
    } catch (err) {
        const error = err as ErrorWithResponse;
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
        throw error;
    }
}

// Execute the main function
main().catch((error: Error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});