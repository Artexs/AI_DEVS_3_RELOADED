import { TextSplitter } from './index';
import * as fs from 'fs';
import * as path from 'path';

async function testTextSplitter() {
  const textSplitter = new TextSplitter();
  const filePath = path.join(__dirname, '../../materialy-szkoleniowe/S03/S03E01-en-1731912954.md');
  
  try {
    const result = await textSplitter.splitFile(filePath, 3000);
    
    console.table(result);
    
    // The chunks are automatically saved to a JSON file next to the original markdown file
    const jsonFilePath = path.join(path.dirname(filePath), `${path.basename(filePath, '.md')}.json`);
    console.log(`\nChunks saved to: ${jsonFilePath}`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testTextSplitter().catch(console.error);
