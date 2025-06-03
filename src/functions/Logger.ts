import { writeFile, appendFile, mkdir } from 'fs/promises';
import { join } from 'path';

export class Logger {
    private readonly logFilePath: string;
    private readonly separator = '--------------------------------------------';
    private readonly errorHeader = ' ERROR 🚨 ';

    constructor(directory?: string) {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-');
        const baseLogsPath = join(process.cwd(), 'data', 'logs');
        const logsPath = directory ? join(baseLogsPath, directory) : baseLogsPath;
        this.logFilePath = join(logsPath, `${timestamp}.log`);
        this.initializeLogFile(logsPath);
    }

    private async initializeLogFile(logsPath: string): Promise<void> {
        try {
            await mkdir(logsPath, { recursive: true });
            await writeFile(this.logFilePath, `Log file created at ${new Date().toISOString()}\n${this.separator}`);
        } catch (error) {
            console.error('Failed to initialize log file:', error);
        }
    }

    public async log(message: string): Promise<void> {
        try {
            const timestamp = new Date().toISOString();
            let content = `\n[${timestamp}] ${message}\n`;
            // content = `${content}\n${this.separator}\n`;
            await appendFile(this.logFilePath, content);
        } catch (error) {
            console.error('Failed to append message to log file:', error);
        }
    }

    public async error(message: string, error?: any): Promise<void> {
        try {
            const errorMessage = error ? `${message} --- ${error.message || error}` : message;
            let content = `\n🚨 ${errorMessage}\n`;
            await appendFile(this.logFilePath, content);
        } catch (err) {
            console.error('Failed to append error message to log file:', err);
        }
    }
} 