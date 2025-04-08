import { createMCPServer } from "./mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
// Get __dirname equivalent in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Capture original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
// Redirect console.log to stderr to avoid interfering with JSON-RPC messages
console.log = (...args) => {
    originalConsoleError('[INFO]:', ...args);
};
// Ensure the data directory exists
const ensureDataDirectory = async () => {
    const dataDir = path.join(__dirname, '../data');
    const documentsDir = path.join(dataDir, 'documents');
    try {
        await fs.mkdir(dataDir, { recursive: true });
        await fs.mkdir(documentsDir, { recursive: true });
        // Create documents.json if it doesn't exist
        const storageFile = path.join(dataDir, 'documents.json');
        try {
            await fs.access(storageFile);
        }
        catch {
            await fs.writeFile(storageFile, JSON.stringify([], null, 2));
        }
        console.log('Data directory structure ensured');
    }
    catch (error) {
        console.error('Error creating data directories:', error);
    }
};
// Handle uncaught exceptions and promises
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
async function startServer() {
    try {
        // Ensure data directories exist
        await ensureDataDirectory();
        // Create MCP server
        const server = createMCPServer();
        // Create stdio transport
        const transport = new StdioServerTransport();
        // Log startup (to stderr so it doesn't interfere with stdout)
        console.log('MCP stdio server starting...');
        // Connect the server to stdio transport
        await server.connect(transport);
        console.log('MCP stdio server connected and ready');
        // Handle process signals
        process.on('SIGINT', () => {
            console.log('Received SIGINT, shutting down...');
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            console.log('Received SIGTERM, shutting down...');
            process.exit(0);
        });
    }
    catch (error) {
        console.error('Error starting MCP stdio server:', error);
        process.exit(1);
    }
}
// Start the server
startServer().catch(error => {
    console.error('Unhandled error in MCP stdio server:', error);
    process.exit(1);
});
