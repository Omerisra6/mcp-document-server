# MCP Document Server

A simple server implementing the Model Context Protocol (MCP) for document search and retrieval.

## Features

- Document storage and retrieval using MCP
- Semantic search capabilities
- Compatible with Cursor and other MCP clients
- Pluggable document service architecture:
  - Local document storage with JSON
  - Confluence integration for searching workspace documents
- Support for HTML

## Setup

1. Install dependencies:
```
npm install
```

2. Build the TypeScript code:
```
npm run build
```

3. Start the server:
```
npm run stdio
```

## Using with Cursor

This server is designed to be used with Cursor. You can search for documents using the `search` tool with a keyword parameter.

### Example:
```
search({
  keyword: "data"
})
```

### Creating Documents

You can create new documents directly from Cursor:

```
create_document({
  title: "New Confluence Page",
  content: "This is a page created in Confluence",
  serviceId: "confluence"
})
```

## Document Services

The architecture is based on pluggable document services. Each service implements a common interface for searching and retrieving documents.

### Local Storage Service

The local storage service stores documents on the local filesystem:
- Documents are stored in `data/documents/` directory (created automatically when needed)
- Metadata is stored in `data/documents.json` (created automatically when needed)
- Supports both Markdown and HTML formats for document content

### Confluence Service

The Confluence service searches for documents in your Confluence workspace using the Confluence REST API with CQL (Confluence Query Language) for powerful searches. To enable this feature, set the following environment variables:

```bash
# Confluence configuration
export CONFLUENCE_BASE_URL="https://your-domain.atlassian.net/wiki"
export CONFLUENCE_USERNAME="your-email@example.com"
export CONFLUENCE_API_TOKEN="your-api-token"
export CONFLUENCE_SPACE="your-space-key"
```

You can set these variables before starting the server:

```bash
CONFLUENCE_BASE_URL="https://your-domain.atlassian.net/wiki" \
CONFLUENCE_USERNAME="your-email@example.com" \
CONFLUENCE_API_TOKEN="your-api-token" \
CONFLUENCE_SPACE="your-space-key" \
npm run stdio
```

### Authentication Details

The service uses Basic Authentication with your email and API token. The credentials are sent in the Authorization header as a Base64-encoded string:

```
Authorization: Basic <base64-encoded-email:token>
```

## Managing Documents

The local storage service automatically creates a `data/documents` directory and `data/documents.json` file on first use. These files are not included in the repository and will be generated as needed.

## Extending the Server

### Adding New Document Services

The MCP server is designed with extensibility in mind. You can easily add new document services by implementing the `DocumentService` interface:

```typescript
interface DocumentService {
  id: string;
  getByKeywords: (keywords: string[]) => Promise<Document[]>;
  createDocument?: (title: string, content: string) => Promise<Document>;
}
```

To add a new service:

1. Create a new directory in `src/services/` for your service
2. Implement the `DocumentService` interface
3. Register your service in `src/services/index.ts`

Some potential document services to implement:

- **Google Drive**: Connect to Google Drive API for document storage and retrieval
- **OneDrive/SharePoint**: Integrate with Microsoft's document services
- **Notion**: Add Notion workspace support
- **GitHub Wiki**: Connect to GitHub wikis for documentation
- **Custom Database**: Store documents in SQL or NoSQL databases
