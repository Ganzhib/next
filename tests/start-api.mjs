import {existsSync} from 'node:fs';
if(existsSync('.env'))process.loadEnvFile('.env');
const connection=new URL(process.env.DATABASE_URL);connection.pathname='/next_test';process.env.DATABASE_URL=connection.toString();
process.env.APP_ORIGIN='http://127.0.0.1:5180';process.env.PORT='3002';
await import('../server/index.ts');
