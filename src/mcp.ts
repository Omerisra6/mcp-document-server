import { McpServer, ResourceTemplate, ReadResourceTemplateCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAllDocuments, searchDocuments } from "./localStorage.js";
import { z } from "zod";

export const createMCPServer = (): McpServer => {
  const server = new McpServer({
    name: "mcp-server",
    version: "1.0.0",
  }, { 
    capabilities: {
      resources: {},
      tools: {}
    }
  });


  const readCallback: ReadResourceTemplateCallback = async (uri, params) => {
    // Ensure keyword is properly formatted for JSON
    const rawKeyword = params.keyword;
    const keyword = typeof rawKeyword === 'string' 
      ? rawKeyword 
      : JSON.stringify(rawKeyword);
    
    console.log(`Searching for documents with keyword: ${keyword}`);
    try {
      const documents = await searchDocuments([keyword]);
      console.log(`Found ${documents.length} documents matching keyword: ${keyword}`);
      return {
        contents: documents.map(doc => ({
          uri: doc.webViewLink,
          text: JSON.stringify(doc),
          mimeType: "application/json"
        }))
      };
    } catch (error) {
      console.error(`Error searching for documents with keyword ${keyword}:`, error);
      throw error;
    }
  };

  server.tool('search', { keyword: z.string() }, async ({ keyword }) => {
    console.log(`Searching for documents with keyword: ${keyword}`);
    const documents = await searchDocuments(keyword);
    
    return {
      content: documents.map(doc => ({ type: "text", "text": doc.webViewLink }))
    }
  });

  return server;
} 