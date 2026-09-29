// Respiratory audit — print a saved scenario's table: node … view.ts <name> [everyS] (FU-6 Task 1; reconstruction).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { table } from './runner.ts';
const [name, every] = process.argv.slice(2);
const { scenario, rows, log } = JSON.parse(readFileSync(join(process.env.RESULTS as string, `${name}.json`), 'utf8'));
console.log(log.join('\n'));
console.log(table(scenario, rows, Number(every ?? scenario.printEvery ?? 60)));
