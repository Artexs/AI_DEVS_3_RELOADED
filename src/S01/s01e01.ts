import Utils from '../utils.js';
import { URLSearchParams } from 'url';

interface ErrorWithResponse extends Error {
    response?: {
        data: unknown;
        status: number;
    };
}

const utils = new Utils();

const ROBOT_URL: string = process.env.ROBOT_URL || '';
const USERNAME: string = 'tester';
const PASSWORD: string = '574e112a';

async function main(): Promise<void> {
    try {
        const html: string = await utils.makeRequest(ROBOT_URL);

        const context: string = "You are a helpful assistant. Your task is to find a question in the provided HTML, extract it, and provide only the numeric answer as a plain number. For example, if the answer is nineteen forty-five, respond with just: 1945. If the answer is one thousand nine hundred thirty-two, respond with just: 1932. If the answer is four hundred seventy-six, respond with just: 476. Do not include any explanations, words, punctuation or additional text - only output the number itself.";
        const answer: string = await utils.getAnswerFromLLM(html, context, 'gpt-4o-mini');

        const formData: URLSearchParams = new URLSearchParams();
        formData.append('username', USERNAME);
        formData.append('password', PASSWORD);
        formData.append('answer', answer);
        const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

        const loginResult: string = await utils.makeRequest(ROBOT_URL, formData.toString(), headers);
        console.log('Login response:', loginResult);

        const flagMatch: RegExpMatchArray | null = loginResult.match(/{{.*?}}/);
        console.log('------------------------------------------------------------------------------');

        if (flagMatch) {
            console.log('Flaga:', flagMatch[0]);
        }
        else {
            console.log('No flag found in the response');
        }
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

// Commented out Express server code
// import express from 'express';
// const app = express();
// const port = 53816;
// app.listen(port, () => {
//     console.log(`Server listening on port ${port}`);
// });