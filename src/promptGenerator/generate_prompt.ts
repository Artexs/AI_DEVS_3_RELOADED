/// <reference types="bun-types" />
import * as fs from 'fs';
import * as path from 'path';
import { createInterface } from 'readline';

interface PromptData {
    corePurpose: string;
    actions: string[];
    limitations: string[];
    outputFormat: string;
    examples: Array<{
        user: string;
        ai: string;
    }>;
    conflictResolution: string;
}

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

async function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function gatherPromptInformation(): Promise<PromptData> {
    console.log('\n=== Prompt Engineering Assistant ===\n');
    
    const corePurpose = await question('1. What is the single, primary objective of this prompt? ');
    
    console.log('\n2. What exact actions should the AI perform? (Enter each action on a new line, type "done" when finished)');
    const actions: string[] = [];
    while (true) {
        const action = await question('Action (or "done"): ');
        if (action.toLowerCase() === 'done') break;
        if (action.trim()) actions.push(action);
    }
    
    console.log('\n3. What are the absolute constraints the AI must follow? (Enter each constraint on a new line, type "done" when finished)');
    const limitations: string[] = [];
    while (true) {
        const limitation = await question('Constraint (or "done"): ');
        if (limitation.toLowerCase() === 'done') break;
        if (limitation.trim()) limitations.push(limitation);
    }
    
    const outputFormat = await question('\n4. What is the exact format and content of the AI\'s output? ');
    
    console.log('\n5. Let\'s create examples. For each example, provide both user input and expected AI response.');
    const examples: Array<{ user: string; ai: string }> = [];
    while (true) {
        const userInput = await question('\nUser input (or "done" to finish): ');
        if (userInput.toLowerCase() === 'done') break;
        const aiResponse = await question('Expected AI response: ');
        if (userInput.trim() && aiResponse.trim()) {
            examples.push({ user: userInput, ai: aiResponse });
        }
    }
    
    const conflictResolution = await question('\n6. How should this prompt override or interact with the AI\'s base behavior? ');
    
    return {
        corePurpose,
        actions,
        limitations,
        outputFormat,
        examples,
        conflictResolution
    };
}

function generatePrompt(data: PromptData): string {
    const metaPromptPath = path.join(__dirname, '..', 'AI_devs-3-META-PROMPT.md');
    
    if (!fs.existsSync(metaPromptPath)) {
        throw new Error(`Meta prompt file not found at: ${metaPromptPath}`);
    }
    
    const metaPrompt = fs.readFileSync(metaPromptPath, 'utf-8');
    
    const prompt = `
[Title: AI Assistant Prompt]

[Purpose: ${data.corePurpose}]

<prompt_objective>
${data.corePurpose}
</prompt_objective>

<prompt_rules>
${data.actions.map(action => `- ${action}`).join('\n')}

${data.limitations.map(limitation => `- ${limitation}`).join('\n')}

Output Format:
${data.outputFormat}

Conflict Resolution:
${data.conflictResolution}
</prompt_rules>

<prompt_examples>
${data.examples.map(example => `USER: ${example.user}\nAI: ${example.ai}\n`).join('\n')}
</prompt_examples>

[The AI will now follow these instructions precisely and respond accordingly to user queries.]
`;

    return JSON.stringify({
        messages: [
            {
                role: "system",
                content: metaPrompt
            },
            {
                role: "user",
                content: prompt
            }
        ]
    }, null, 2);
}

async function main() {
    try {
        const promptData = await gatherPromptInformation();
        const generatedPrompt = generatePrompt(promptData);
        
        console.log('\n=== Generated Prompt ===\n');
        console.log(generatedPrompt);
        
        // Save to file
        const outputPath = path.join(__dirname, '..', 'generated_prompt.json');
        fs.writeFileSync(outputPath, generatedPrompt);
        console.log(`\nPrompt saved to: ${outputPath}`);
        
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : 'An unknown error occurred');
        process.exit(1);
    } finally {
        rl.close();
    }
}

main(); 