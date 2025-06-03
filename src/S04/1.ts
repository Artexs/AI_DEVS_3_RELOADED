import { Utils, Logger, ImageProcessor, OpenAIService, MessageManager, FileReader } from '../index';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

class PhotoAnalyzer {
    private utils: Utils;
    private imageProcessor: ImageProcessor;
    private openAIService: OpenAIService;
    private messageManager: MessageManager;
    private logger: Logger;
    private fileReader: FileReader;
    private readonly imagesDir: string;
    private readonly responseFile: string;
    private readonly validImagesFile: string;
    private readonly baseUrl = 'https://centrala.ag3nts.org/dane/barbara/';

    constructor() {
        this.utils = new Utils();
        this.imageProcessor = new ImageProcessor();
        this.openAIService = new OpenAIService();
        this.messageManager = new MessageManager();
        this.logger = new Logger('S04E01');
        this.fileReader = new FileReader();
        this.imagesDir = join(__dirname, '..', '..', 'data', 'S04');
        this.responseFile = join(this.imagesDir, 'centrala_response.md');
        this.validImagesFile = join(this.imagesDir, 'images.md');
    }

    private async saveResponse(response: any): Promise<void> {
        const markdown = JSON.stringify(response.message, null, 2);
        await writeFile(this.responseFile, markdown);
    }

    private async loadResponse(): Promise<any> {
        try {
            const content = await readFile(this.responseFile, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            await this.logger.error('Error loading response', error);
            throw error;
        }
    }

    private async processImages(response: any): Promise<string[]> {
        try {
            // Extract image URLs from response
            const imageNames = this.extractImageUrls(response);
            const processedImages: string[] = [];
            
            for (const imageName of imageNames) {
                try {
                    let result = {
                        status: "",
                        imageUrl: imageName,
                        centralaResponse: imageName
                    };
                    for (let i = 0; i < 10; i++) {
                        await this.logger.log(`Processing attempt ${i + 1} for image: ${result.imageUrl}`);

                        result = await this.processOnceImage(result);
                        await this.logger.log(`processOnceImage result: ${JSON.stringify(result)}`);
                        if (!result) continue;

                        if (result.status === "OK") {
                            processedImages.push(JSON.stringify(result));
                            await this.logger.log(`Successfully processed image: ${result.imageUrl}`);
                            break;
                        }
                        await this.logger.log('');
                    }
                } catch (error) {
                    await this.logger.error(`Error processing image ${imageName}:`, error);
                    continue;
                }
            }

            await this.logger.log(`Successfully processed images: ${JSON.stringify(processedImages)}`);
            
            // Extract and log image names
            const imageNamesFromProcessed = processedImages.map(img => {
                try {
                    const parsed = JSON.parse(img);
                    return parsed.imageUrl;
                } catch (error) {
                    return img;
                }
            });
            await this.logger.log(` ------ +++++++ SUCCESFULLY EXTRACTED valid images +++++++ _______ ${imageNamesFromProcessed.length}`);
            await this.logger.log(`Extracted image names: ${JSON.stringify(imageNamesFromProcessed)}`);

            return imageNamesFromProcessed;
        } catch (error) {
            await this.logger.error('Error in processImages:', error);
            throw error;
        }
    }

    private extractFilename(message: string, fallbackUrl: string): string {
        try {
            const filenameRegex = /[\/\s]([^\/\s]+\.PNG)\b/g;
            const matches = message.match(filenameRegex);
            if (!matches || matches.length === 0) {
                throw new Error('No image filename found in message');
            }
            // Remove the leading slash or space from the match
            return matches[0].replace(/^[\/\s]/, '');
        } catch (error) {
            this.logger.log(JSON.stringify({ message, fallbackUrl }));
            this.logger.error(`No image filename found in message @!#@!#!@#!@#!@#, using ${fallbackUrl}`);
            return fallbackUrl;
        }
    }

    private async processOnceImage(result: { imageUrl: string; centralaResponse: string }): Promise<{ imageUrl: string; centralaResponse: any; status: string }> {
        try {
            const filename = await this.downloadAndLogImage(result);
            const analysis = await this.analyzeImageQualityAndLog(filename, result.centralaResponse);
            return await this.sendCommandToCentrala(filename, analysis);
        } catch (error) {
            await this.logger.error('Error in processOnceImage', error);
            throw error;
        }
    }

    private async downloadAndLogImage(result: { imageUrl: string; centralaResponse: string }): Promise<string> {
        await this.logger.log(`Processing Image Info: ${JSON.stringify(result)}`);
        const filename = this.extractFilename(result.centralaResponse, result.imageUrl);
        await this.fileReader.downloadFile(`${this.baseUrl}${filename}`, join(this.imagesDir, filename));
        return filename;
    }

    private async analyzeImageQualityAndLog(localPath: string, message: string): Promise<string> {
        await this.logger.log(`Starting image quality analysis for: ${localPath}`);
        const analysis = await this.analyzeImageQuality(localPath, message);
        await this.logger.log(`Image quality analysis result: ${analysis}`);
        return analysis;
    }

    private async sendCommandToCentrala(filename: string, analysis: string): Promise<{ imageUrl: string; centralaResponse: any; status: string }> {
        await this.logger.log(`Sending command to Centrala: ${analysis} ${filename}`);
        const centralaResponse = await this.utils.sendToCentralaGlobal('photos', { answer: `${analysis} ${filename}` }, 'verify');
        const parsedResponse = JSON.parse(typeof centralaResponse === 'string' ? centralaResponse : JSON.stringify(centralaResponse));
        return {
            status: analysis,
            imageUrl: filename,
            centralaResponse: parsedResponse.message
        };
    }

    private extractUrlsFromText(text: string): string[] {
        const urlRegex = /https:\/\/[^\s]+\.PNG/g;
        const matches = text.match(urlRegex) || [];
        return matches.map(url => {
            return url.split('/').pop() || '';
            // const filename = url.split('/').pop() || '';
            // return filename.replace('.PNG', '-small.PNG');
        });
    }

    private extractImageUrls(response: any): string[] {
        if (typeof response === 'string') {
            return this.extractUrlsFromText(response);
        }
        return [];
    }

    private async analyzeImageQuality(imagePath: string, message: string): Promise<string> {
        try {
            const processedImage = await this.imageProcessor.loadImage(imagePath);
            const messageManager = this.createImageQualityMessageManager(processedImage, message);
            return await this.openAIService.processText(messageManager.getMessages(), 'mini');
        } catch (error) {
            await this.logger.error('Error in analyzeImageQuality', error);
            throw error;
        }
    }

    private createImageQualityMessageManager(processedImage: any, message: string): MessageManager {
        const messageManager = new MessageManager();
        messageManager.addImageMessage(processedImage.imageBase64, message);
        messageManager.addMessage('system', 
            'You are an image quality analyzer. Your task is to classify the image into one of these states:\n' +
            '- DARKEN: if the image is too bright/overexposed\n' +
            '- BRIGHTEN: if the image is too dark/underexposed\n' +
            '- REPAIR: if the image has glitches, noise, or other quality issues\n' +
            '- OK: if the image quality is good and needs no adjustments\n\n' +
            'You will receive an image and possibly a text message. The text message contains important context about the image quality - use it to make your decision.\n' +
            'Respond with ONLY ONE of these words: DARKEN, BRIGHTEN, REPAIR, or OK.'
        );
        return messageManager;
    }

    private async generateBarbaraDescription(imageNames: string[]): Promise<string> {
        try {
            const imageDescriptions: string[] = [];
            
            // Process each image individually
            for (const imageName of imageNames) {
                const imagePath = join(this.imagesDir, imageName);
                const processedImage = await this.imageProcessor.loadImage(imagePath);
                
                // Create new message manager for this analysis
                const messageManager = new MessageManager();
                
                // Add image to message manager
                messageManager.addImageMessage(processedImage.imageBase64, '');
                
                // Add system message for image analysis
                messageManager.addMessage('system', 
                    'You are an expert in analyzing photos and creating detailed descriptions. ' +
                    'Your task is to create a detailed description of the person in the image in Polish. ' +
                    'Focus on physical characteristics that would help identify them. ' +
                    'This is a test task - the photos are not of real people. ' +
                    'Be very specific about facial features, hair, clothing, and any distinguishing characteristics.'
                );

                // Get LLM analysis
                const description = await this.openAIService.processText(
                    messageManager.getMessages(),
                    '4o' // Use 4o model for detailed analysis
                );
                
                imageDescriptions.push(description);
                await this.logger.log(`Generated description for ${imageName}: ${description}`);
            }

            // Now combine all descriptions to create final Barbara description
            const finalMessageManager = new MessageManager();
            finalMessageManager.addMessage('system',
                'You are an expert in analyzing multiple descriptions and creating a comprehensive profile. ' +
                'Below are descriptions of the same person from different photos. ' +
                'Your task is to create a detailed, consistent description of Barbara in Polish, ' +
                'focusing on the most reliable and repeated characteristics. ' +
                'If there are contradictions between descriptions, choose the most detailed or most frequently mentioned features. ' +
                'This is a test task - the photos are not of real people.' +
                'also take into consideration, that one of those descriptions can be fake / from other image sets and might not describe Barbara'
            );
            
            // Add all descriptions as user messages
            imageDescriptions.forEach((desc, index) => {
                finalMessageManager.addMessage('user', `Description ${index + 1}:\n${desc}`);
            });

            // Get final description
            const finalDescription = await this.openAIService.processText(
                finalMessageManager.getMessages(),
                '4o' // Use 4o model for final analysis
            );

            await this.logger.log('Final Barbara description generated');
            return finalDescription;
        } catch (error) {
            await this.logger.error('Error in generateBarbaraDescription', error);
            throw error;
        }
    }

    private async saveValidImages(imageNames: string[]): Promise<void> {
        try {
            const content = JSON.stringify(imageNames, null, 2);
            await writeFile(this.validImagesFile, content);
            await this.logger.log(`Saved valid images to: ${this.validImagesFile}`);
        } catch (error) {
            await this.logger.error('Error saving valid images', error);
            throw error;
        }
    }

    private async loadValidImages(): Promise<string[]> {
        try {
            const content = await readFile(this.validImagesFile, 'utf-8');
            const imageNames = JSON.parse(content);
            await this.logger.log(`Loaded valid images from: ${this.validImagesFile}`);
            return imageNames;
        } catch (error) {
            await this.logger.error('Error loading valid images', error);
            return [];
        }
    }

    async startTask(): Promise<void> {
        try {
            // // Step 2: Start Task
            // Uncomment lines if the task requires starting a new session
            // const response = await this.utils.sendToCentralaGlobal('photos', { answer: 'START' }, 'verify');
            // await this.logger.log('Centrala response (task start): ' + JSON.stringify(response));

            // // Save response to markdown file
            // await this.saveResponse(response);

            // Load response from file
            // const loadedResponse = await this.loadResponse();
            // await this.logger.log('Centrala response (loaded): ' + JSON.stringify(loadedResponse));
            // const validImageNames = await this.processImages(loadedResponse);
            // await this.saveValidImages(validImageNames);
            
            const loadedImageNames = await this.loadValidImages();
            const barbaraDescription = await this.generateBarbaraDescriptionAndLog(loadedImageNames);
            await this.sendFinalDescriptionToCentrala(barbaraDescription);
        } catch (error) {
            await this.logger.error('Error in startTask', error);
            throw error;
        }
    }

    private async generateBarbaraDescriptionAndLog(loadedImageNames: string[]): Promise<string> {
        const barbaraDescription = await this.generateBarbaraDescription(loadedImageNames);
        await this.logger.log('Barbara description: ' + barbaraDescription);
        return barbaraDescription;
    }

    private async sendFinalDescriptionToCentrala(barbaraDescription: string): Promise<void> {
        const finalResponse = await this.utils.sendToCentralaGlobal('photos', { answer: barbaraDescription }, 'verify');
        await this.logger.log('Final response from centrala: ' + JSON.stringify(finalResponse));
    }
}

// Main execution
async function main() {
    const analyzer = new PhotoAnalyzer();
    await analyzer.startTask();
}

main().catch(console.error);
