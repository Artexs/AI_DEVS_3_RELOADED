import { Utils } from '../index';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import neo4j, { Driver } from 'neo4j-driver';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

const utils = new Utils();

interface DatabaseResponse {
    reply: any[];
    error: string;
}

interface User {
    id: number;
    username: string;
}

interface Connection {
    user1_id: number;
    user2_id: number;
}

async function queryDatabase(query: string): Promise<DatabaseResponse> {
    const response = await utils.sendToCentralaGlobal('database', { query }, 'apidb');
    return response as unknown as DatabaseResponse;
}

async function downloadAndSaveTables() {
    try {
        // Get users table data
        const usersResponse = await queryDatabase("SELECT * FROM users");
        await writeFile(
            join(process.cwd(), 'data', 'S03', 'users.json'),
            JSON.stringify(usersResponse.reply, null, 2)
        );
        console.log('Users data saved');

        // Get connections table data
        const connectionsResponse = await queryDatabase("SELECT * FROM connections");
        await writeFile(
            join(process.cwd(), 'data', 'S03', 'connections.json'),
            JSON.stringify(connectionsResponse.reply, null, 2)
        );
        console.log('Connections data saved');

    } catch (error) {
        console.error('Error downloading tables:', error);
        throw error;
    }
}

async function loadTablesFromFiles(): Promise<{ users: User[], connections: Connection[] }> {
    try {
        const usersData = await readFile(join(process.cwd(), 'data', 'S03', 'users.json'), 'utf-8');
        const connectionsData = await readFile(join(process.cwd(), 'data', 'S03', 'connections.json'), 'utf-8');

        return {
            users: JSON.parse(usersData),
            connections: JSON.parse(connectionsData)
        };
    } catch (error) {
        console.error('Error loading tables from files:', error);
        throw error;
    }
}

class Neo4jService {
    private driver: Driver;

    constructor(uri: string, username: string, password: string) {
        this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
    }

    async close() {
        await this.driver.close();
    }

    async runQuery(cypher: string, params: Record<string, any> = {}) {
        const session = this.driver.session();
        try {
            return await session.run(cypher, params);
        } finally {
            await session.close();
        }
    }

    async createUserNode(user: User) {
        const cypher = `
            CREATE (u:User {userId: $userId, username: $username})
            RETURN u
        `;
        return this.runQuery(cypher, {
            userId: neo4j.int(user.id),
            username: user.username
        });
    }

    async createConnection(fromId: number, toId: number) {
        // if (typeof fromId !== 'number' || typeof toId !== 'number' || isNaN(fromId) || isNaN(toId)) {
        //     console.error('Invalid connection IDs:', { fromId, toId });
        //     throw new Error('Invalid connection IDs');
        // }
        const cypher = `
            MATCH (a:User {userId: $fromId}), (b:User {userId: $toId})
            CREATE (a)-[:KNOWS]->(b)
        `;
        return this.runQuery(cypher, {
            fromId: neo4j.int(fromId),
            toId: neo4j.int(toId)
        });
    }

    async findShortestPath(fromName: string, toName: string) {
        const cypher = `
            MATCH (rafal:User {username: $fromName}), (barbara:User {username: $toName})
            MATCH p = allShortestPaths((rafal)-[:KNOWS*]-(barbara))
            RETURN [n IN nodes(p) | n.username] as path
        `;
        const result = await this.runQuery(cypher, { fromName, toName });
        return result.records[0]?.get('path') || [];
    }
}

async function loadDataToNeo4j() {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const pass = process.env.NEO4J_PASSWORD || 'neo4j';
    const neo4jService = new Neo4jService(
        uri,
        user,
        pass
    );

    try {
        // // Load data from files
        // const { users, connections } = await loadTablesFromFiles();

        // // Create user nodes
        // for (const user of users) {
        //     await neo4jService.createUserNode(user);
        // }
        // console.log('User nodes created');

        // // Create connections
        // for (const connection of connections) {
        //     await neo4jService.createConnection(connection.user1_id, connection.user2_id);
        // }
        // console.log('Connections created');

        // Find shortest path
        const path = await neo4jService.findShortestPath('Rafał', 'Barbara');
        console.log('Shortest path:', path.join(','));

        // Report the answer
        const answer = await utils.sendToCentralaGlobal('connections', {
            task: 'connections',
            answer: path.join(',')
        });
        console.log('Answer reported:', answer);

    } catch (error) {
        console.error('Error loading data to Neo4j:', error);
        throw error;
    } finally {
        await neo4jService.close();
    }
}

// Execute only Neo4j part
loadDataToNeo4j().catch(console.error);
