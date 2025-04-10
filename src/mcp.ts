import { McpServer, ResourceTemplate, ReadResourceTemplateCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchAllServices, getServiceById } from "./services/index.js";
import { z } from "zod";

export const createMCPServer = (): McpServer => {
  const server = new McpServer({
    name: "mcp-document-server",
    version: "1.0.0",
  }, { 
    capabilities: {
      resources: {},
      tools: {}
    }
  });

  // Register unified search tool
  server.tool('search', { keyword: z.string() }, async ({ keyword }) => {
    console.log(`Searching for documents with keyword: ${keyword}`);
    const documents = await searchAllServices([keyword]);

    if (documents.length === 0) {
      return {
        content: [{ type: "text", text: `No documents found for keyword: ${keyword}` }]
      };
    }

    const content = await Promise.all(documents.map(async (doc) => {
      const { content } = await doc.getContent();
      return {
        type: "text",
        text: content,
      } as const;
    }));

    return {
      content
    };
  });

  server.tool('create_document', { 
    title: z.string(),
    content: z.string(),
    serviceId: z.union([z.literal('local-storage'), z.literal('confluence')])
  }, async ({ title, content, serviceId }) => {
    console.log(`Creating document: ${title}${serviceId ? ` in service ${serviceId}` : ''}`);

    if (!serviceId) {
      throw new Error('Service ID is required');
    }
    
    try {
      let doc;
      
      // If service ID is provided, use that specific service
      const service = getServiceById(serviceId);
      
      if (!service) {
        throw new Error(`Service with ID ${serviceId} not found`);
      }
      
      if (!service.createDocument) {
        throw new Error(`Service ${serviceId} does not support document creation`);
      }
      
      doc = await service.createDocument(title, content);
      
      
      return {
        content: [{ 
          type: "text", 
          text: `Document created successfully: ${doc.name}`
        }]
      };
    } catch (error: any) {
      console.error('Error creating document:', error);
      return {
        content: [{ type: "text", text: `Error creating document: ${error.message || 'Unknown error'}` }]
      };
    }
  });

  return server;
} 