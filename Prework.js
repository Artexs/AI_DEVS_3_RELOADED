require('dotenv').config();
const axios = require('axios');
const { OpenAI } = require('openai');

// Configuration
const ROBOT_URL = 'https://xyz.ag3nts.org/';
const USERNAME = 'tester';
const PASSWORD = '574e112a';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Function to extract question from HTML
function extractQuestion(html) {
    // Simple regex to extract the question
    const questionMatch = html.match(/<div[^>]*class="question"[^>]*>(.*?)<\/div>/i);
    if (questionMatch && questionMatch[1]) {
        return questionMatch[1].trim();
    }
    throw new Error('Could not extract question from page');
}

// Function to get answer from LLM
async function getAnswerFromLLM(question) {
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // or another appropriate model
        messages: [
            { role: "system", content: "You are a helpful assistant. Answer the question directly and concisely without explanations." },
            { role: "user", content: question }
        ],
        max_tokens: 100
    });
    
    return response.choices[0].message.content.trim();
}

// Main function to automate the login process
async function automateLogin() {
    try {
        // Step 1: Fetch the login page to get the question
        console.log('Fetching login page...');
        const { data: html } = await axios.get(ROBOT_URL);
        
        // Step 2: Extract the question
        const question = extractQuestion(html);
        console.log('Extracted question:', question);
        
        // Step 3: Get answer from LLM
        console.log('Getting answer from LLM...');
        const answer = await getAnswerFromLLM(question);
        console.log('LLM answer:', answer);
        
        // Step 4: Submit login form
        console.log('Submitting login form...');
        const formData = new URLSearchParams();
        formData.append('username', USERNAME);
        formData.append('password', PASSWORD);
        formData.append('answer', answer);
        
        const { data: response } = await axios.post(ROBOT_URL, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            maxRedirects: 0,
            validateStatus: status => status >= 200 && status < 400
        });
        
        // Step 5: Check for redirect URL in response
        if (response.includes('redirect') || response.includes('location')) {
            // Extract URL from response
            const urlMatch = response.match(/href=['"]([^'"]+)['"]/);
            if (urlMatch && urlMatch[1]) {
                const secretPageUrl = new URL(urlMatch[1], ROBOT_URL).toString();
                console.log('Secret page URL:', secretPageUrl);
                
                // Step 6: Visit the secret page
                const { data: secretPageData } = await axios.get(secretPageUrl);
                console.log('Secret page content:');
                console.log(secretPageData);
                
                // Look for flag in the content
                const flagMatch = secretPageData.match(/FLAG{[^}]+}/i);
                if (flagMatch) {
                    console.log('Found flag:', flagMatch[0]);
                    return flagMatch[0];
                }
                
                return secretPageData;
            }
        }
        
        return response;
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Response data:', err.response.data);
            console.error('Response status:', err.response.status);
        }
        throw err;
    }
}

// Run the automation
automateLogin()
    .then(result => {
        console.log('Operation completed successfully');
    })
    .catch(error => {
        console.error('Operation failed');
    });
