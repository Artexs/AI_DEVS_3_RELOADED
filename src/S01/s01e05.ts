import { Utils, OpenAIService } from '../index';

const CENSORSHIP_SYSTEM_PROMPT = `You are a data censorship system. Your task is to censor personal information in text while maintaining the original format.
Replace the following with the word "CENZURA":
1. Full name (first and last name together)
2. Age
3. City name
4. Street name with house number (together)

Keep all punctuation marks, spaces, and text structure exactly as in the original.
Do not modify any other parts of the text.`;

async function main() {
    const utils = new Utils();
    const openaiService = new OpenAIService();
    const apiKey = process.env.POLIGON_API_KEY;

    if (!apiKey) {
        throw new Error('POLIGON_API_KEY is not set in environment variables');
    }

    try {
        // Fetch data from the source
        const dataUrl = `https://c3ntrala.ag3nts.org/data/${apiKey}/cenzura.txt`;
        const rawData = await utils.fetch(dataUrl);

        // Use LLM to censor the data
        const censoredData = await openaiService.processText(
            rawData,
            CENSORSHIP_SYSTEM_PROMPT,
            { model: "gpt-4o-mini" }
        );

        // Send the censored data to the API
        const response = await utils.poligonRequest("CENZURA", censoredData);
        console.log('Response:', response);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
