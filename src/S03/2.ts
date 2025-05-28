import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { config } from 'dotenv';
import { Utils, VectorService, Report } from '../index';

config();

const REPORTS_DIR = '/home/artek/Desktop/AI_DEVS_3_RELOADED/AI_DEVS_3/data/pliki_z_fabryki/weapons_tests/do-not-share';
const utils = new Utils();

const readReports = (): Report[] => {
  const files = readdirSync(REPORTS_DIR);
  return files
    .filter(file => file.endsWith('.txt'))
    .map(file => {
      const content = readFileSync(join(REPORTS_DIR, file), 'utf-8');
      const date = file.split('.')[0].replace(/_/g, '-');
      return {
        name: file,
        content,
        date
      };
    });
};

const searchReports = async (query: string): Promise<string | undefined> => {
  const vectorService = new VectorService('weapons_reports');
  await vectorService.initialize();
  
  const reports = readReports();
  await vectorService.uploadReports(reports);
  
  return vectorService.search(query);
};

const main = async () => {
  const query = "W raporcie, z którego dnia znajduje się wzmianka o kradzieży prototypu broni?";
  const result = await searchReports(query);
  
  const response = await utils.sendToCentrala('wektory', result);
  console.log('Response from Centrala:', response);
};

main().catch(console.error);
