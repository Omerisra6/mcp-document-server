# MCP Simple Server

A simple server implementing the Model Context Protocol (MCP).

## Setup

1. Install dependencies:
```
npm install
```

2. Start the server:
```
npm start
```

The server will run on http://localhost:3001 by default.

## Using the Stdio Server

This project includes a stdio-based implementation of the MCP server that communicates via standard input/output instead of HTTP/SSE.

### Running the Stdio Server

```
npm run stdio
```

The stdio server accepts JSON-RPC messages via stdin and responds via stdout. All logs are sent to stderr to avoid interfering with the JSON-RPC messages.

### Using the MCP Inspector

If you want to use the MCP Inspector with the stdio server, we've created a bridge that connects the HTTP-based inspector to our stdio server:

```
npm run bridge
```

This will:
1. Start the stdio server as a child process
2. Create an HTTP server on port 3001
3. Forward JSON-RPC requests from HTTP to the stdio server
4. Return responses back to the HTTP clients

You can then connect the MCP Inspector to http://localhost:3001 and it will work with the stdio server.

### Using the Interactive CLI

An interactive command-line interface is provided for easy interaction with the stdio server:

```
npm run cli
```

This will start an interactive shell where you can enter search queries:

```
MCP CLI - Interactive interface to the MCP server
Type "exit" or press Ctrl+C to quit
Examples:
  documents/javascript - Search for documents with keyword "javascript"
  help - Show this help message
--------------------------------------------------
> 
```

You can enter simple keywords or full document URIs to search.

### Using the Sample Client

A sample client is included to demonstrate how to communicate with the stdio server programmatically:

```
npm run client <query>
```

For example:
```
npm run client javascript
```

This will:
1. Start the stdio server as a child process
2. Send a query for documents matching "javascript"
3. Display the results and exit

### Communicating Directly with the Stdio Server

You can also communicate directly with the stdio server by piping JSON-RPC messages:

```
echo '{"jsonrpc":"2.0","id":"1","method":"mcp.uri","params":{"uri":"documents/sample"}}' | node stdio-server.mjs
```

## Custom Domain Setup

You can access the server via a custom domain by mapping it in your hosts file.

### Automatic Setup

Run the included setup script with sudo permissions:

```
sudo ./hosts-setup.sh
```

This will add `mcp.local` to your hosts file pointing to `127.0.0.1` and flush your DNS cache.

### Manual Setup

1. Edit your hosts file:
   - On macOS/Linux: `/etc/hosts`
   - On Windows: `C:\Windows\System32\drivers\etc\hosts`

2. Add the following line:
```
127.0.0.1 mcp.local
```

3. Flush your DNS cache:
   - On macOS: `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`
   - On Windows: `ipconfig /flushdns`
   - On Linux: Depends on your distribution

4. Access the server at `http://mcp.local:3001`

## Environment Variables

You can customize the server by setting the following environment variables:

- `PORT`: The port to run the server on (default: 3001)
- `DOMAIN_NAME`: The custom domain name (default: mcp.local)
- `SERVER_IP`: The IP address to bind to (default: 127.0.0.1)

Example:
```
PORT=8080 DOMAIN_NAME=myapi.local npm start
``` 