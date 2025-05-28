import { Utils, LangfuseService } from '../index';

const utils = new Utils();
const langfuse = new LangfuseService();

interface DatabaseResponse {
    reply: any[];
    error: string;
}

async function queryDatabase(query: string): Promise<DatabaseResponse> {
    const response = await utils.sendToCentralaGlobal('database', { query }, 'apidb');
    return response as unknown as DatabaseResponse;
}

interface TableStructure {
    table: string;
    structure: string;
}

async function exploreDatabase() {
    try {
        // Get list of tables
        const tablesResponse = await queryDatabase("SHOW TABLES");
        console.log('Tables response:', tablesResponse);
        
        const tables = tablesResponse.reply.map((t: any) => t.Tables_in_banan);
        console.log('Found tables:', tables);
        
        // Get structure for each table
        const tableStructures = await Promise.all(
            tables.map(async (table: string) => {
                const structure = await queryDatabase(`SHOW CREATE TABLE ${table}`);
                return { 
                    table, 
                    structure: structure.reply[0]['Create Table'] 
                } as TableStructure;
            })
        );
        
        // Prepare context for LLM
        const context = tableStructures.map(({ table, structure }) => 
            `Table: ${table}\nStructure:\n${structure}\n`
        ).join('\n');
        
        console.log('Context for LLM:', context);
        
        // Make LLM request with the context
        const llmResponse = await langfuse.processPrompt(
            's03e03_prepare_query',
            context,
            { model: 'gpt-4o' }
        );
        
        console.log('LLM Response:', llmResponse);
        
        // Execute the generated SQL query
        const finalQuery = llmResponse;
        const result = await queryDatabase(finalQuery);
        
        // Extract DC_IDs and send to centrala
        const dcIds = result.reply.map((row: any) => parseInt(row.dc_id));
        console.log("RESPONSE IS:... ", dcIds)
        const answer = await utils.sendToCentralaGlobal('database', { answer: dcIds });
        console.log('Final answer sent to centrala:', answer);
        
        return answer;
    } catch (error) {
        console.error('Error exploring database:', error);
        throw error;
    }
}

// Execute the exploration
exploreDatabase().catch(console.error);
// const prompt = `You are a SQL expert. I need to find IDs of active datacenters that are managed by inactive managers. Here are the tables and their structures:

// 1. First, show me all tables:
// SHOW TABLES;

// 2. Then, show me the structure of each table:
// SHOW CREATE TABLE users;
// SHOW CREATE TABLE datacenters;
// SHOW CREATE TABLE connections;

// Based on these table structures, generate a SQL query that will:
// 1. Find all active datacenters
// 2. Join with users table to find their managers
// 3. Filter for managers who are inactive/on vacation
// 4. Return only the DC_IDs of matching datacenters

// Return ONLY the raw SQL query without any explanations or markdown formatting.`

// 1405, 4278, 9294



// import { Utils, LangfuseService } from '../index';

// const utils = new Utils();
// const langfuse = new LangfuseService();

// async function queryDatabase(query: string) {
//     const response = await utils.sendToCentralaGlobal('database', { query }, 'apidb');
//     // Log raw response for debugging
//     // console.log('Raw response:', response);
//     return response;
// }

// async function exploreTables() {
//     try {
//         // Get list of tables
//         const tablesResponse = await queryDatabase("SHOW TABLES");
//         console.log('Tables response:', tablesResponse);
        
//         const tables = tablesResponse.reply.map((t: any) => t.Tables_in_banan);
        
//         console.log('\n=== Database Inspection ===\n');
        
//         let context = `tablesResponse: ${JSON.stringify(tablesResponse)}\n\n=== Table Details ===\n`;
        
//         for (const table of tables) {
//             console.log(`\n--- Table: ${table} ---`);
            
//             // Get row count
//             const countResponse = await queryDatabase(`SELECT COUNT(*) as count FROM ${table}`);
//             console.log(`Total rows: ${countResponse.reply[0].count}`);
            
//             // Get table structure
//             const structureResponse = await queryDatabase(`desc ${table}`);
//             console.log('\nStructure:');
//             console.table(structureResponse.reply);
            
//             // Get sample data
//             const sampleResponse = await queryDatabase(`SELECT * FROM ${table}`);
//             console.log('\nSample data:');
//             console.table(sampleResponse.reply);

//             const responsesString = `countResponse: ${JSON.stringify(countResponse)}\nstructureResponse: ${JSON.stringify(structureResponse)}\nsampleResponse: ${JSON.stringify(sampleResponse)}`;
//             // console.log('\n=== All Responses ===\n', responsesString);
            
//             context += `\n--- ${table} ---\n${responsesString}\n`;
//         }

//         // console.log('\n=== Final Context ===\n', context);
        
//         // Make LLM request with the context
//         const llmResponse = await langfuse.processPrompt(
//             's03e03_extract_data',
//             context,
//             { model: 'gpt-4o-mini' }
//         );
        
//         console.log('\n=== LLM Response ===\n', llmResponse);
//         return { context, llmResponse };
//     } catch (error) {
//         console.error('Error exploring tables:', error);
//         throw error;
//     }
// }

// // Execute the exploration
// exploreTables().catch(console.error);
// const prompt = `You are a SQL expert. I need to find IDs of active datacenters that are managed by inactive managers. Here are the tables and their structures:

// 1. First, show me all tables:
// SHOW TABLES;

// 2. Then, show me the structure of each table:
// SHOW CREATE TABLE users;
// SHOW CREATE TABLE datacenters;
// SHOW CREATE TABLE connections;

// Based on these table structures, generate a SQL query that will:
// 1. Find all active datacenters
// 2. Join with users table to find their managers
// 3. Filter for managers who are inactive/on vacation
// 4. Return only the DC_IDs of matching datacenters

// Return ONLY the raw SQL query without any explanations or markdown formatting.`

// // 1405, 4278, 9294
