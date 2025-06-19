import { writeFile, appendFile, mkdir } from 'fs/promises';
import { join } from 'path';

export class Logger {
    private readonly logFilePath: string;
    private readonly tempLogFilePath: string;
    private readonly separator = '--------------------------------------------';
    private readonly errorHeader = ' ERROR 🚨 ';

    constructor(directory?: string) {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-');
        const baseLogsPath = join(process.cwd(), 'data', 'logs');
        const logsPath = directory ? join(baseLogsPath, directory) : baseLogsPath;
        this.logFilePath = join(logsPath, `${timestamp}.log`);
        this.tempLogFilePath = join(baseLogsPath, 'temp.log');
        this.initializeLogFiles(logsPath);
    }

    private async initializeLogFiles(logsPath: string): Promise<void> {
        try {
            await mkdir(logsPath, { recursive: true });
            const initialContent = `Log file created at ${new Date().toISOString()}\n${this.separator}`;
            await writeFile(this.logFilePath, initialContent);
            await writeFile(this.tempLogFilePath, initialContent);
        } catch (error) {
            console.error('Failed to initialize log files:', error);
        }
    }

    private async appendToBothFiles(content: string): Promise<void> {
        try {
            await appendFile(this.logFilePath, content);
            await appendFile(this.tempLogFilePath, content);
        } catch (error) {
            console.error('Failed to append message to log files:', error);
        }
    }

    public async log(message: string): Promise<void> {
        const timestamp = new Date().toISOString();
        const content = `\n[${timestamp}] ${message}\n`;
        await this.appendToBothFiles(content);
    }

    public async logJson(message: string, jsonObject: any): Promise<void> {
        const formattedJson = JSON.stringify(jsonObject, null, 2);
        await this.log(`${message}\n${formattedJson}`);
    }

    public async error(message: string, error?: any): Promise<void> {
        const errorMessage = error ? `${message} --- ${error.message || error}` : message;
        const content = `\n🚨 ${errorMessage}\n`;
        await this.appendToBothFiles(content);
    }

    public async success(message: string, error?: any): Promise<void> {
        const errorMessage = error ? `${message} --- ${error.message || error}` : message;
        const content = `\n🔵 ${errorMessage}\n`;
        await this.appendToBothFiles(content);
    }
} 