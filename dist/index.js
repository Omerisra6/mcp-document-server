import { searchDocuments } from './localStorage.js';
export * from './types.js';
export * from './localStorage.js';
export * from './mcp.js';
const main = async () => {
    const documents = await searchDocuments('machine');
    console.log(documents);
};
main();
