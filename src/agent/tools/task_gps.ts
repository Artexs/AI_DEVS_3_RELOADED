import { Logger, Centrala } from '../../index';
import { IDoc } from '../../types/types';

interface GpsResponse {
    lat: number;
    lon: number;
}

interface DatabaseUser {
    username: string;
    id: number;
}

interface GpsResults {
    [username: string]: GpsResponse;
}

export class GpsTool {
    private readonly logger: Logger;
    private readonly centrala: Centrala;
    
    constructor(logger: Logger) {
        this.logger = logger;
        this.centrala = new Centrala();
    }

    async main(cityName: string, conversation_uuid: string): Promise<IDoc[]> {
        try {
            await this.logger.log(`GpsTool.main called with city: ${cityName}`);
            
            // Step 1: Get people from city
            const people = await this.people(cityName);
            await this.logger.log(`Found people: ${JSON.stringify(people)}`);
            
            // Step 2: Get database IDs for these people
            const dbUsers = await this.databaseId(people);
            await this.logger.log(`Database users: ${JSON.stringify(dbUsers)}`);
            
            // Step 3: Get GPS coordinates for these users
            const answer = await this.gps(dbUsers);
            const gpsResults = answer;
            // Step 4: Send results to Centrala
            const response = await this.centrala.sendToCentrala('gps', answer);
            
            // Step 5: Also log results for debugging
            console.log('GPS Results sent to Centrala:', JSON.stringify(gpsResults, null, 2));
            console.log('Response from Centrala:', JSON.stringify(response, null, 2));
            
            // Step 6: Check if task was successful
            const parsedResponse = typeof response === 'string' ? JSON.parse(response) : response;
            if (parsedResponse.code === 0 && parsedResponse.message && parsedResponse.message.includes('{{FLG')) {
                return [{
                    text: `TASK FINISHED SUCCESSFULLY, response from centrala: ${JSON.stringify(parsedResponse)}`,
                    metadata: {
                        name: 'gps_success',
                        description: 'GPS task completed successfully',
                        content_type: 'complete',
                        conversation_uuid
                    }
                }];
            }
            
            // Step 7: Return as IDoc[] if not successful
            return [{
                text: JSON.stringify(gpsResults),
                metadata: {
                    name: 'gps_results',
                    description: `GPS coordinates for ${Object.keys(gpsResults).length} users from ${cityName}`,
                    content_type: 'complete',
                    conversation_uuid
                }
            }];
            
        } catch (error: any) {
            await this.logger.log(`Error in main function: ${error.message}`);
            console.error('Error:', error.message);
            return [{
                text: `Error: ${error.message}`,
                metadata: {
                    name: 'gps_error',
                    description: 'Error during GPS processing',
                    content_type: 'complete',
                    conversation_uuid
                }
            }];
        }
    }

    private async people(cityName: string): Promise<string[]> {
        const response = await this.centrala.sendToCentralaGlobal('', { query: cityName }, 'places');
        const parsed = typeof response === 'string' ? JSON.parse(response) : response;
        
        if (!parsed?.message || typeof parsed.message !== 'string') {
            throw new Error('Invalid response format from places API');
        }
        
        return parsed.message.trim().split(/\s+/).filter(Boolean);
    }

    private async databaseId(usernames: string[]): Promise<DatabaseUser[]> {
        // Filter out BARBARA from usernames
        const filteredUsernames = usernames.filter(username => username !== 'BARBARA');
        
        if (!filteredUsernames.length) {
            return [];
        }

        const quotedUsernames = filteredUsernames.map(name => `'${name.replace(/'/g, "''")}'`).join(',');
        const query = `SELECT id, username FROM users WHERE username IN (${quotedUsernames})`;
        
        const response = await this.centrala.sendToCentralaGlobal('database', { query }, 'apidb');
        const parsed = typeof response === 'string' ? JSON.parse(response) : response;
        
        if (!parsed?.reply || !Array.isArray(parsed.reply)) {
            throw new Error('Invalid database response format');
        }
        
        return parsed.reply.map((row: any) => ({
            username: row.username,
            id: row.id
        }));
    }

    private async gps(users: DatabaseUser[]): Promise<GpsResults> {
        const results: GpsResults = {};

        for (const user of users) {
            try {
                const response = await this.centrala.sendToCentralaGlobal('', { userID: user.id.toString() }, 'gps');
                const parsed = typeof response === 'string' ? JSON.parse(response) : response;
                
                if (parsed?.message && typeof parsed.message === 'object' && parsed.message.lat && parsed.message.lon) {
                    results[user.username] = {
                        lat: parsed.message.lat,
                        lon: parsed.message.lon
                    };
                }
            } catch (error: any) {
                await this.logger.log(`Error getting GPS for user ${user.username}: ${error.message}`);
            }
        }

        return results;
    }
}
