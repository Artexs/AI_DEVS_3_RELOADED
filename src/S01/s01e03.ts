import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';
import Utils from '../utils.ts';

const utils = new Utils();
const CENTRALA_URL = process.env.CENTRALA_URL;
const POLIGON_API_KEY = process.env.POLIGON_API_KEY;

async function fetchFile() {
    try {
        const jsonUrl = `${CENTRALA_URL}/data/${POLIGON_API_KEY}/json.txt`;
        const response = await utils.makeRequest(jsonUrl);
        // console.log('Response:', response);
        await writeFile('data/S01/s01e03_json.txt', response);
        // return response;
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Response data:', err.response.data);
            console.error('Response status:', err.response.status);
        }
        throw err;
    }
}

async function checkFixSumValuesInJSON() {
    try {
        // Read the JSON file
        const filePath = path.join(__dirname, '../../data/S01/s01e03_json.txt');
        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Process each item in test-data
        for (const item of jsonData['test-data']) {
            // Fix sum calculations
            if (item.question && item.question.includes('+')) {
                const [num1, num2] = item.question.split('+').map(num => parseInt(num.trim()));
                if (!isNaN(num1) && !isNaN(num2)) {
                    item.answer = num1 + num2;
                }
            }

            // Process LLM questions
            if (item.test && item.test.q) {
                const context = "Provide only the shortest possible answer - single word or name, no sentences.";
                const answer = await utils.getAnswerFromLLM(item.test.q, context);
                item.test.a = answer;
            }
        }

        // Write the updated data back to the file
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 4));
        console.log('File has been updated successfully!');
    } catch (error) {
        console.error('Error processing file:', error);
        throw error;
    }
}

async function sendAnswerToAPI() {
    try {
        // Read the modified JSON file
        const filePath = path.join(__dirname, '../../data/S01/s01e03_json.txt');
        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        jsonData.apikey = POLIGON_API_KEY;

        // Send the answer to the API using the utility function
        const response = await utils.poligonRequest("JSON", jsonData);
        console.log('API Response:', response);
    } catch (error) {
        console.error('Error sending answer to API:', error);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
        throw error;
    }
}
await fetchFile();
await checkFixSumValuesInJSON();
await sendAnswerToAPI(); 