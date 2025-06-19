import { Utils, Logger } from '../../index';
import { IDoc } from '../../types/types';
import { document } from '../metadata';
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

export class FileOperationsTool {
    private readonly utils: Utils;
    private readonly logger: Logger;

    constructor(logger: Logger) {
        this.utils = new Utils();
        this.logger = logger;
    }

    async fileOperations(parameters: Record<string, any>, conversation_uuid: string): Promise<IDoc[]> {
        const { operation, path } = parameters;
        const paths = [].concat(path);
        await this.logger.log(`FILE_OPERATIONS_TOOL --- params: ${JSON.stringify(parameters)}`);

        if (!operation) {
            return [document(`Missing required parameter: operation is required, current parameters: ${JSON.stringify(parameters)}`, 'gpt-4o', {
                name: 'error',
                description: 'Parameter validation error',
                source: 'FileOperationsTool',
                content_type: 'error',
                conversation_uuid,
            })];
        }

        if (paths.length === 0) {
            return [document(`Missing required parameter: 'paths' (array of strings) is required, current parameters: ${JSON.stringify(parameters)}`, 'gpt-4o', {
                name: 'error',
                description: 'Parameter validation error',
                source: 'FileOperationsTool',
                content_type: 'error',
                conversation_uuid,
            })];
        }

        try {
            if (operation === 'list') {
                return await this.listDirectories(paths, conversation_uuid);
            } else if (operation === 'read') {
                return await this.readFiles(paths, conversation_uuid);
            } else {
                return [document(`Invalid operation: ${operation}. Supported operations: list, read`, 'gpt-4o', {
                    name: operation,
                    description: 'Invalid operation error',
                    source: 'FileOperationsTool',
                    content_type: 'error',
                    conversation_uuid,
                })];
            }
        } catch (error) {
            return [document(`Error performing ${operation} on paths: ${error}`, 'gpt-4o', {
                name: 'batch_operation',
                description: 'Operation error',
                source: 'FileOperationsTool',
                content_type: 'error',
                conversation_uuid,
            })];
        }
    }

    private async listDirectories(paths: string[], conversation_uuid: string): Promise<IDoc[]> {
        const results: IDoc[] = [];

        for (const relativePath of paths) {
            const fullPath = join(__dirname, '../../../', relativePath);
            await this.logger.log(`FILE_OPERATIONS_TOOL --- listing directory: ${relativePath} -> ${fullPath}`);

            if (!existsSync(fullPath)) {
                results.push(document(`Path does not exist: ${fullPath}`, 'gpt-4o', {
                    name: relativePath,
                    description: 'Path not found error',
                    source: fullPath,
                    content_type: 'error',
                    conversation_uuid,
                }));
                continue;
            }

            try {
                const items = readdirSync(fullPath);
                const fileList = items.map(item => {
                    const itemPath = join(fullPath, item);
                    const stats = statSync(itemPath);
                    return {
                        name: item,
                        type: stats.isDirectory() ? 'directory' : 'file',
                        size: stats.isFile() ? stats.size : null,
                        modified: stats.mtime.toISOString()
                    };
                });

                const result = JSON.stringify(fileList, null, 2);
                results.push(document(result, 'gpt-4o', {
                    name: relativePath,
                    description: `Directory listing for: ${relativePath}`,
                    source: fullPath,
                    content_type: 'complete',
                    conversation_uuid,
                }));
            } catch (error) {
                results.push(document(`Error listing directory: ${error}`, 'gpt-4o', {
                    name: relativePath,
                    description: 'Directory listing error',
                    source: fullPath,
                    content_type: 'error',
                    conversation_uuid,
                }));
            }
        }

        await this.logger.log(`FILE_OPERATIONS_TOOL --- processed ${results.length} directories`);
        return results;
    }

    private async readFiles(paths: string[], conversation_uuid: string): Promise<IDoc[]> {
        const results: IDoc[] = [];

        for (const relativePath of paths) {
            const fullPath = join(__dirname, '../../../', relativePath);
            await this.logger.log(`FILE_OPERATIONS_TOOL --- reading file: ${relativePath} -> ${fullPath}`);

            if (!existsSync(fullPath)) {
                results.push(document(`Path does not exist: ${fullPath}`, 'gpt-4o', {
                    name: relativePath,
                    description: 'Path not found error',
                    source: fullPath,
                    content_type: 'error',
                    conversation_uuid,
                }));
                continue;
            }

            try {
                const stats = statSync(fullPath);
                
                if (!stats.isFile()) {
                    results.push(document(`Path is not a file: ${fullPath}`, 'gpt-4o', {
                        name: relativePath,
                        description: 'Not a file error',
                        source: fullPath,
                        content_type: 'error',
                        conversation_uuid,
                    }));
                    continue;
                }

                const content = readFileSync(fullPath, 'utf-8');
                results.push(document(content, 'gpt-4o', {
                    name: relativePath,
                    description: `File content for: ${relativePath}`,
                    source: fullPath,
                    content_type: 'complete',
                    conversation_uuid,
                }));
            } catch (error) {
                results.push(document(`Error reading file: ${error}`, 'gpt-4o', {
                    name: relativePath,
                    description: 'File reading error',
                    source: fullPath,
                    content_type: 'error',
                    conversation_uuid,
                }));
            }
        }

        await this.logger.log(`FILE_OPERATIONS_TOOL --- processed ${results.length} files`);
        return results;
    }
} 