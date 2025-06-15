import { sql } from "drizzle-orm";
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { existsSync } from 'fs';
import path from 'path';
import { MessageArray, MessageManager, MessageRole } from '../index';

// Define the table schemas
const conversations = sqliteTable('conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
});

const messages = sqliteTable('messages', {
  id: integer('id').primaryKey(),
  conversation_uuid: text('conversation_uuid').notNull().references(() => conversations.uuid),
  llmRole: text('llmRole').notNull(),
  content: text('content').notNull(),
});

export class DatabaseService {
  private db;

  constructor(dbPath: string = 'database.db') {
    const absolutePath = path.resolve(dbPath);
    console.log(`Using database at: ${absolutePath}`);

    const dbExists = existsSync(absolutePath);
    const sqlite = new Database(absolutePath);
    this.db = drizzle(sqlite);

    if (!dbExists) {
      console.log('Database does not exist. Initializing...');
      this.initializeDatabase();
    } else {
      console.log('Database already exists.');
    }
  }

  private initializeDatabase() {
    this.db.run(sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT NOT NULL UNIQUE
      )
    `);

    this.db.run(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_uuid TEXT NOT NULL,
        llmRole TEXT NOT NULL CHECK (llmRole IN ('system', 'user', 'assistant')),
        content TEXT NOT NULL,
        FOREIGN KEY (conversation_uuid) REFERENCES conversations(uuid)
      )
    `);
  }

  async addMessage(conversation_uuid: string, llmRole: 'system' | 'user' | 'assistant', content: string) {
    const allowed = ['system', 'user', 'assistant'];
    if (!allowed.includes(llmRole)) {
      throw new Error(`Invalid llmRole: ${llmRole}. Allowed: system, user, assistant`);
    }

    // Try to insert conversation uuid, ignore if exists
    try {
      await this.db
        .insert(conversations)
        .values({ uuid: conversation_uuid })
        .run();
    } catch (error: any) {
    }

    // Always add message
    await this.db
      .insert(messages)
      .values({ conversation_uuid, llmRole, content })
      .run();
  }

  private async getByUuid(conversation_uuid: string) {
    return await this.db
      .select()
      .from(messages)
      .where(sql`conversation_uuid = ${conversation_uuid}`)
      .orderBy(messages.id)
      .all();
  }

  async getMessageHistory(conversation_uuid: string): Promise<MessageArray> {
    const dbMessages = await this.getByUuid(conversation_uuid);
    const messageManager = new MessageManager();
    
    // Add messages in order
    for (const msg of dbMessages) {
      messageManager.addMessage(msg.llmRole as MessageRole, msg.content);
    }
    
    return messageManager.getMessages();
  }

  async getAll() {
    return await this.db
      .select()
      .from(messages)
      .all();
  }
} 