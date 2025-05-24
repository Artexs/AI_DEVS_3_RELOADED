import { OpenAI } from 'openai';
import { Utils } from '../index';

interface RobotDescription {
    description: string;
}

interface ImageGenerationResponse {
    url: string;
}

interface SubmissionPayload {
    task: string;
    apikey: string;
    answer: string;
}

class RobotVisualizer {
    private utils: Utils;
    private openai: OpenAI;

    constructor() {
        this.utils = new Utils();
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    private async fetchRobotDescription(apiKey: string): Promise<RobotDescription> {
        const url = `https://c3ntrala.ag3nts.org/data/${apiKey}/robotid.json`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch robot description: ${response.statusText}`);
        }
        return response.json();
    }

    private async generateRobotImage(description: string): Promise<ImageGenerationResponse> {
        try {
            const response = await this.openai.images.generate({
                model: "dall-e-3",
                prompt: description,
                n: 1,
                size: "1024x1024",
                response_format: "url"
            });

            if (!response.data[0]?.url) {
                throw new Error('No image URL in response');
            }

            return {
                url: response.data[0].url
            };
        } catch (error) {
            throw new Error(`Failed to generate image: ${error.message}`);
        }
    }

    private async submitToCentral(imageUrl: string): Promise<string> {
        const payload: SubmissionPayload = {
            task: 'robotid',
            apikey: process.env.POLIGON_API_KEY!,
            answer: imageUrl
        };

        return await this.utils.poligonRequest('robotid', imageUrl);
    }

    public async process(): Promise<void> {
        try {
            // 1. Fetch robot description
            const robotData = await this.fetchRobotDescription(process.env.POLIGON_API_KEY!);
            console.log('Robot description:', robotData.description);

            // 2. Generate image
            const imageResponse = await this.generateRobotImage(robotData.description);
            console.log('Generated image URL:', imageResponse.url);

            // 3. Submit to Central
            const result = await this.submitToCentral(imageResponse.url);
            console.log('Submission result:', result);

        } catch (error) {
            console.error('Error in process:', error);
            throw error;
        }
    }
}

// Execute the task
const visualizer = new RobotVisualizer();
visualizer.process().catch(console.error); 