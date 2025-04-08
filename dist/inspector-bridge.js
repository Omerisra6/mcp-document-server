import { spawn } from 'child_process';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3001;
// Setup middleware
app.use(express.json());
app.use(express.text());
// Enable CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});
// Global stdio server process
let stdioServer = null;
let sseClients = [];
// Start stdio server function
function startStdioServer() {
    if (stdioServer) {
        if (!stdioServer.killed) {
            try {
                stdioServer.kill();
            }
            catch (e) {
                console.error('Error killing existing stdio server:', e);
            }
        }
        stdioServer = null;
    }
    console.log('Starting stdio server...');
    stdioServer = spawn('node', [path.join(__dirname, '../dist/stdio-server.js')], {
        stdio: ['pipe', 'pipe', 'pipe']
    });
    // Handle stdio server output
    if (stdioServer && stdioServer.stdout) {
        stdioServer.stdout.on('data', (data) => {
            const message = data.toString().trim();
            console.log('Server stdout:', message);
            // Try to validate and fix JSON if needed
            try {
                // Make sure the message is valid JSON
                const sanitizedMessage = message.replace(/'/g, '"');
                JSON.parse(sanitizedMessage); // Just to test if it's valid
                // Send to all SSE clients
                sseClients.forEach(client => {
                    client.write(`data: ${sanitizedMessage}\n\n`);
                });
            }
            catch (error) {
                console.error('Invalid JSON from stdio server:', message);
                console.error('JSON parse error:', error);
            }
        });
    }
    if (stdioServer && stdioServer.stderr) {
        stdioServer.stderr.on('data', (data) => {
            console.error('Server stderr:', data.toString());
        });
    }
    if (stdioServer) {
        stdioServer.on('error', (error) => {
            console.error('Stdio server error:', error);
        });
        stdioServer.on('close', (code) => {
            console.log(`Stdio server exited with code ${code}`);
            stdioServer = null;
        });
    }
    return stdioServer;
}
// SSE endpoint
app.get('/sse', (req, res) => {
    console.log('New SSE connection');
    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    // Start the stdio server if not already running
    if (!stdioServer) {
        startStdioServer();
    }
    // Add this client to the list
    sseClients.push(res);
    // Initial message
    res.write(`data: {"type":"connected"}\n\n`);
    // Handle client disconnect
    req.on('close', () => {
        console.log('SSE connection closed');
        const index = sseClients.indexOf(res);
        if (index !== -1) {
            sseClients.splice(index, 1);
        }
        // If no more clients, kill the stdio server
        if (sseClients.length === 0 && stdioServer && !stdioServer.killed) {
            console.log('No more clients, shutting down stdio server');
            stdioServer.kill();
            stdioServer = null;
        }
    });
});
// RPC endpoint
app.post('/rpc', (req, res) => {
    console.log('Received RPC request:', req.body);
    // Ensure stdio server is running
    if (!stdioServer) {
        startStdioServer();
    }
    // Make sure we have valid JSON
    let jsonRequest;
    if (typeof req.body === 'string') {
        jsonRequest = req.body;
    }
    else {
        jsonRequest = JSON.stringify(req.body);
    }
    // Send request to stdio server
    if (stdioServer && stdioServer.stdin && stdioServer.stdin.writable) {
        stdioServer.stdin.write(jsonRequest + '\n');
        // Wait a bit for the response to come through SSE
        setTimeout(() => {
            res.json({ success: true });
        }, 100);
    }
    else {
        res.status(500).json({
            error: 'Stdio server not available'
        });
    }
});
// Start the server
app.listen(port, () => {
    console.log(`Bridge server running at http://localhost:${port}`);
    console.log('Connect your MCP Inspector using:');
    console.log(`- Transport Type: HTTP`);
    console.log(`- Server URL: http://localhost:${port}`);
});
