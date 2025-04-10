import axios from 'axios';
import { Document, DocumentService } from '../../types.js';
import { log } from 'console';

/**
 * Confluence configuration from environment variables
 */
interface ConfluenceConfig {
  baseUrl: string;
  username: string;
  apiToken: string;
  space: string;
}

/**
 * Get Confluence configuration from environment variables
 */
function getConfig(): ConfluenceConfig | null {
  const baseUrl = process.env.CONFLUENCE_BASE_URL;
  const username = process.env.CONFLUENCE_USERNAME;
  const apiToken = process.env.CONFLUENCE_API_TOKEN;
  const space = process.env.CONFLUENCE_SPACE;
  
  if (!baseUrl || !username || !apiToken || !space) {
    return null;
  }
    
  return {
    baseUrl,
    username,
    apiToken,
    space
  };
}

/**
 * Get document content from Confluence
 */
async function getConfluenceContent(confluenceId: string, config: ConfluenceConfig): Promise<string> {
  try {
    // Create base64 encoded auth string
    const authString = Buffer.from(`${config.username}:${config.apiToken}`).toString('base64');
    
    const response = await axios({
      method: 'GET',
      url: `${config.baseUrl}/wiki/rest/api/content/${confluenceId}`,
      params: {
        expand: 'body.storage'
      },
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${authString}`
      }
    });

    // Return the HTML content
    return response.data.body.storage.value || 'No content available';
  } catch (error) {
    console.error(`Error fetching content for document ${confluenceId}:`, error);
    return 'Error retrieving document content';
  }
}

/**
 * Create a Document object with getContent method for Confluence
 */
function createConfluenceDocument(item: any, config: ConfluenceConfig, keywords: string[]): Document {
  const confluenceId = item.id;
  console.log(item)
  
  return {
    id: `confluence_${confluenceId}`,
    name: item.title,
    description: `Confluence page in space ${item.space?.name || 'Unknown'}`,
    webViewLink: `${config.baseUrl}${item._links.webui}`,
    keywords,
    getContent: async () => {
      const content = await getConfluenceContent(confluenceId, config);
      return { content, mimeType: 'text/html' };
    }
  };
}

/**
 * Search Confluence for documents
 */
async function searchConfluence(keywords: string[], config: ConfluenceConfig): Promise<Document[]> {
  try {
    const searchTerm = keywords.map(keyword => `text ~ "${keyword}"`).join(' OR ');
    const cqlQuery = `(${searchTerm}) AND type = page`;
    
    // Create base64 encoded auth string
    const authString = Buffer.from(`${config.username}:${config.apiToken}`).toString('base64');
    
    const response = await axios({
      method: 'GET',
      url: `${config.baseUrl}/wiki/rest/api/content/search`,
      params: {
        cql: cqlQuery,
        limit: 10,
      },
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${authString}`
      }
    });

    const results = response.data.results;
    
    // Convert Confluence results to Document format
    return results.map((item: any) => createConfluenceDocument(item, config, keywords));
  } catch (error) {
    console.error('Error searching Confluence:', error);
    return [];
  }
}

/**
 * Create a new document in Confluence
 */
async function createNewConfluencePage(title: string, content: string, config: ConfluenceConfig): Promise<Document> {
  try {
    // Extract keywords from title and content
    const keywords = [
      ...title.split(/\s+/).filter(word => word.length > 3),
      ...content.split(/\s+/).filter(word => word.length > 3).slice(0, 20) // Take first 20 significant words
    ];

    // Create base64 encoded auth string
    const authString = Buffer.from(`${config.username}:${config.apiToken}`).toString('base64');
    
    // Create the page in Confluence
    const response = await axios({
      method: 'POST',
      url: `${config.baseUrl}/wiki/rest/api/content`,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      data: {
        type: 'page',
        title: title,
        space: {
          key: config.space
        },
        body: {
          storage: {
            value: content,
            representation: 'storage'
          }
        }
      }
    });

    // Get the created page's data
    const createdPage = response.data;
    
    // Create and return the document object
    return {
      id: `confluence_${createdPage.id}`,
      name: createdPage.title,
      description: `Confluence page in space ${config.space}`,
      webViewLink: `${config.baseUrl}${createdPage._links.webui}`,
      keywords,
      getContent: async () => {
        const content = await getConfluenceContent(createdPage.id, config);
        return { content, mimeType: 'text/html' };
      }
    };
  } catch (error) {
    console.error('Error creating Confluence document:', error);
    throw new Error(`Failed to create Confluence document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Confluence Service implementation
 */
const confluenceService: DocumentService = {
  id: 'confluence',
  
  getByKeywords: async (keywords: string[]): Promise<Document[]> => {
    const config = getConfig();
    
    if (!config) {
      console.log('Confluence is not configured');
      return [];
    }
    
    return await searchConfluence(keywords, config);
  },
  
  createDocument: async (title: string, content: string): Promise<Document> => {
    const config = getConfig();
    
    if (!config) {
      throw new Error('Confluence is not configured. Please set CONFLUENCE_BASE_URL, CONFLUENCE_USERNAME, and CONFLUENCE_API_TOKEN environment variables.');
    }
    
    return await createNewConfluencePage(title, content, config);
  }
};

export default confluenceService; 