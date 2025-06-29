import { OpenAIService } from '../index';

const openai = new OpenAIService();

async function classifyTask(task: string) {
    const systemPrompt = `You are a task classifier. Analyze the given task and determine if it requires external knowledge or can be answered directly.

Return a JSON object with these properties:
- _thinking: Your analysis of the task
- action: Either "response" (if task can be answered directly) or "websearch" (if external knowledge is needed)
- url: The URL to search if action is "websearch", otherwise null

Examples:
- Task: "What is 2+2?" → action: "response", url: null
- Task: "Find information about quantum computing" → action: "websearch", url: "https://example.com/search?q=quantum+computing"`;

    const userPrompt = `Task: ${task}`;
    
    const response = await openai.processTextAsJson([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ], 'mini');
    
    console.log('Task classification response:', response);
    return response;
}

async function generateAnswer(task: string, data: string, webContent = '') {
    let systemPrompt = `You are an AI assistant that answers questions based on the provided task and data.`;
    systemPrompt += `\n\nTask: ${task}`;
    
    if (webContent) {
        systemPrompt += `\n\nYou also have access to additional web content that may be relevant to the task.`;
        systemPrompt += `\n\nWeb Content:\n${webContent}`;
    }
    
    systemPrompt += `\n\nReturn a JSON object with these properties:
- _thinking: Your reasoning process and analysis
- answer: Your final answer to the task`;

    const userPrompt = `Data: ${data}`;
    
    const response = await openai.processTextAsJson([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ], 'mini');
    
    console.log('Answer generation response:', response);
    return response;
}

async function main() {
    // Fetch the arxiv data first
    console.log('Fetching arxiv data...');
    const arxivData = await fetch('https://centrala.ag3nts.org/dane/arxiv-draft.html').then(r => r.text());
    console.log('Arxiv data fetched, length:', arxivData.length);

    // Get challenges
    const firstRes = await fetch('https://rafal.ag3nts.org/b46c3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'NONOMNISMORIAR' })
    }).then(r => r.json());
    const sign = firstRes?.message;
    console.log('11111');
    

    const secondRes = await fetch('https://rafal.ag3nts.org/b46c3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sign })
    }).then(r => r.json());
    const challenges = secondRes?.message?.challenges;
    console.log('22222');
    

    console.log(`Fetching ${challenges.length} challenges...`);
    const startTime = Date.now();

    const challengeResponses = await Promise.all(
        challenges.map(async (url: string) => {
            const result = await fetch(url).then(r => r.json());
            return result || { task: '', data: '' };
        })
    );
    
    const endTime = Date.now();
    console.log(`Fetched ${challengeResponses.length} challenges in ${endTime - startTime}ms`);
    console.log('challengeResponses', challengeResponses);
    
    // Process challenges
    console.log(`Processing ${challengeResponses.length} challenges...`);
    const processStartTime = Date.now();
    
    const processedChallenges = await Promise.all(
        challengeResponses.map(async (challenge) => {
            // Skip classification - just try to get web content if task mentions URLs
            // const webContent = challenge.task.includes('http') 
            //     ? await fetch(challenge.task).then(r => r.text()).catch(() => '')
            //     : '';
            const webContent = arxivData;
            
            const answer = await generateAnswer(challenge.task, challenge.data, webContent);
            return JSON.stringify(answer.answer);
        })
    );
    
    const processEndTime = Date.now();
    console.log(`Processed ${processedChallenges.length} challenges in ${processEndTime - processStartTime}ms`);
    
    const concatenatedAnswers = processedChallenges.filter(answer => answer).join('\n        ');
    console.log(concatenatedAnswers);
    
    // Send answer
    const rafalResponse = await fetch('https://rafal.ag3nts.org/b46c3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            apikey: process.env.POLIGON_API_KEY,
            timestamp: secondRes?.message?.timestamp,
            signature: secondRes?.message?.signature,
            answer: concatenatedAnswers
        })
    }).then(r => r.json());
    
    console.log('Rafal response:', rafalResponse);
    
    return processedChallenges;
}

main();


// const code = "37;55;54;37;54;49;37;55;50;37;50;48;37;55;53;37;55;50;37;54;99;37;51;100;37;50;50;37;50;53;37;51;54;37;51;56;37;50;53;37;51;55;37;51;52;37;50;53;37;51;55;37;51;52;37;50;53;37;51;55;37;51;48;37;50;53;37;51;55;37;51;51;37;50;53;37;51;51;37;54;49;37;50;53;37;51;50;37;54;54;37;50;53;37;51;50;37;54;54;37;50;53;37;51;54;37;54;54;37;50;53;37;51;55;37;51;48;37;50;53;37;51;54;37;51;53;37;50;53;37;51;54;37;54;53;37;50;53;37;51;50;37;54;53;37;50;53;37;51;55;37;51;51;37;50;53;37;51;55;37;51;48;37;50;53;37;51;54;37;54;54;37;50;53;37;51;55;37;51;52;37;50;53;37;51;54;37;51;57;37;50;53;37;51;54;37;51;54;37;50;53;37;51;55;37;51;57;37;50;53;37;51;50;37;54;53;37;50;53;37;51;54;37;51;51;37;50;53;37;51;54;37;54;54;37;50;53;37;51;54;37;54;52;37;50;53;37;51;50;37;54;54;37;50;53;37;51;55;37;51;48;37;50;53;37;51;54;37;54;51;37;50;53;37;51;54;37;51;49;37;50;53;37;51;55;37;51;57;37;50;53;37;51;54;37;54;51;37;50;53;37;51;54;37;51;57;37;50;53;37;51;55;37;51;51;37;50;53;37;51;55;37;51;52;37;50;53;37;51;50;37;54;54;37;50;53;37;51;51;37;51;54;37;50;53;37;51;51;37;51;52;37;50;53;37;51;52;37;51;52;37;50;53;37;51;55;37;51;48;37;50;53;37;51;55;37;54;49;37;50;53;37;51;52;37;54;49;37;50;53;37;51;55;37;51;52;37;50;53;37;51;55;37;51;52;37;50;53;37;51;53;37;51;54;37;50;53;37;51;54;37;51;49;37;50;53;37;51;53;37;51;57;37;50;53;37;51;52;37;51;55;37;50;53;37;51;54;37;51;55;37;50;53;37;51;54;37;51;52;37;50;53;37;51;52;37;54;52;37;50;53;37;51;53;37;51;51;37;50;53;37;51;51;37;51;54;37;50;53;37;51;55;37;51;52;37;50;53;37;51;53;37;51;52;37;50;53;37;51;52;37;54;53;37;50;53;37;51;55;37;51;50;37;50;53;37;51;53;37;51;55;37;50;53;37;51;51;37;54;54;37;50;53;37;51;55;37;51;51;37;50;53;37;51;54;37;51;57;37;50;53;37;51;51;37;54;52;37;50;53;37;51;51;37;51;52;37;50;53;37;51;51;37;51;55;37;50;53;37;51;51;37;51;51;37;50;53;37;51;54;37;51;49;37;50;53;37;51;51;37;51;56;37;50;53;37;51;51;37;51;54;37;50;53;37;51;54;37;51;51;37;50;53;37;51;51;37;51;56;37;50;53;37;51;51;37;51;48;37;50;53;37;51;51;37;51;52;37;50;53;37;51;51;37;51;54;37;50;53;37;51;51;37;51;55;37;50;53;37;51;51;37;51;52;37;50;53;37;51;51;37;51;53;37;50;53;37;51;54;37;51;49;37;50;53;37;51;51;37;51;53;37;50;50;37;48;97;37;54;51;37;54;102;37;54;101;37;55;51;37;54;102;37;54;99;37;54;53;37;50;101;37;54;99;37;54;102;37;54;55;37;50;56;37;50;55;37;50;53;37;54;51;37;53;52;37;54;56;37;54;53;37;50;48;37;55;52;37;55;50;37;55;53;37;55;52;37;54;56;37;50;48;37;54;57;37;55;51;37;50;48;37;54;57;37;54;101;37;50;48;37;55;52;37;54;56;37;54;53;37;50;48;37;55;51;37;54;102;37;55;53;37;55;50;37;54;51;37;54;53;37;50;101;37;50;101;37;50;101;37;50;55;37;50;99;37;50;48;37;50;55;37;54;51;37;54;102;37;54;99;37;54;102;37;55;50;37;51;97;37;50;48;37;55;50;37;54;53;37;54;52;37;51;98;37;50;48;37;54;54;37;54;102;37;54;101;37;55;52;37;50;100;37;55;51;37;54;57;37;55;97;37;54;53;37;51;97;37;50;48;37;51;52;37;51;48;37;55;48;37;55;56;37;51;98;37;50;48;37;55;52;37;54;53;37;55;56;37;55;52;37;50;100;37;55;51;37;54;56;37;54;49;37;54;52;37;54;102;37;55;55;37;51;97;37;50;48;37;51;50;37;55;48;37;55;56;37;50;48;37;51;50;37;55;48;37;55;56;37;50;48;37;54;50;37;54;99;37;54;49;37;54;51;37;54;98;37;51;98;37;50;55;37;50;57;37;51;98";
// eval(unescape(String.fromCharCode(...code.split(';').map(Number))));
// console.log(unescape(String.fromCharCode(...code.split(';').map(Number))))

// var url="%68%74%74%70%73%3a%2f%2f%6f%70%65%6e%2e%73%70%6f%74%69%66%79%2e%63%6f%6d%2f%70%6c%61%79%6c%69%73%74%2f%36%34%44%70%7a%4a%74%74%56%61%59%47%67%64%4d%53%36%74%54%4e%72%57%3f%73%69%3d%34%37%33%61%38%36%63%38%30%34%36%37%34%35%61%35"
// console.log('%cThe truth is in the source...', 'color: red; font-size: 40px; text-shadow: 2px 2px black;');

// var url = "https://open.spotify.com/playlist/64DpzJttVaYGgdMS6tTNrW?si=473a86c8046745a5";
