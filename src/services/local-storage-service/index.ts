import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Document, DocumentService } from '../../types.js';

// Get the current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define path for local storage file
const STORAGE_FILE = path.join(__dirname, '../../../data/documents.json');
const DOCUMENTS_DIR = path.join(__dirname, '../../../data/documents');

// Initialize the storage directory if it doesn't exist
async function initializeStorage(): Promise<void> {
  try {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../../../data');
    await fs.mkdir(dataDir, { recursive: true });
    await fs.mkdir(DOCUMENTS_DIR, { recursive: true });
    
    // Create storage file if it doesn't exist
    try {
      await fs.access(STORAGE_FILE);
    } catch {
      // File doesn't exist, create it with an empty array
      await fs.writeFile(STORAGE_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error('Error initializing local storage:', error);
  }
}

// Initialize storage on module load
initializeStorage();

/**
 * Create a Document with getContent method
 */
function createDocument(doc: Omit<Document, 'getContent'>): Document {
  return {
    ...doc,
    getContent: async () => {
      try {
        const filePath = path.join(DOCUMENTS_DIR, `${doc.id}.md`);
        const content = await fs.readFile(filePath, 'utf8');
        return { content, mimeType: 'text/markdown' };
      } catch (error) {
        console.error(`Error retrieving content for document ${doc.id}:`, error);
        return { content: 'Error retrieving document content', mimeType: 'text/plain' };
      }
    }
  };
}

/**
 * Get all documents from local storage
 */
async function getAllDocuments(): Promise<Document[]> {
  try {
    const data = await fs.readFile(STORAGE_FILE, 'utf8');
    const rawDocs = JSON.parse(data);
    return rawDocs.map((doc: any) => createDocument({
      ...doc,
      source: 'local'
    }));
  } catch (error) {
    console.error('Error reading from local storage:', error);
    return [];
  }
}

/**
 * Save documents to local storage
 */
async function saveDocuments(documents: Omit<Document, 'getContent'>[]): Promise<void> {
  try {
    await fs.writeFile(STORAGE_FILE, JSON.stringify(documents, null, 2));
  } catch (error) {
    console.error('Error writing to local storage:', error);
  }
}

/**
 * Create a new document in local storage
 */
async function createNewDocument(title: string, content: string): Promise<Document> {
  try {
    const rawDocs = await getAllDocuments();
    const docsBare = rawDocs.map(({ getContent, ...rest }) => rest);
    
    // Generate a random ID
    const id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Extract keywords from title and content
    const keywords = [
      ...title.split(/\s+/).filter(word => word.length > 3),
      ...content.split(/\s+/).filter(word => word.length > 3).slice(0, 20) // Take first 20 significant words
    ];
    
    // Create document object
    const newDocument = {
      id,
      name: title,
      description: `Keywords: ${keywords.join(', ')}`,
      webViewLink: `file://${path.join(DOCUMENTS_DIR, `${id}.md`)}`,
      keywords,
      source: 'local' as const
    };
    
    // Save the document content to a markdown file
    await fs.writeFile(path.join(DOCUMENTS_DIR, `${id}.md`), content);
    
    // Add to documents list and save
    docsBare.push(newDocument);
    await saveDocuments(docsBare);
    
    return createDocument(newDocument);
  } catch (error) {
    console.error('Error creating document:', error);
    throw new Error('Failed to create document');
  }
}

/**
 * Local Storage Service implementation
 */
const localStorageService: DocumentService = {
  id: 'local-storage',
  
  getByKeywords: async (keywords: string[]): Promise<Document[]> => {
    const allDocs = await getAllDocuments();
    
    if (keywords.length === 0) {
      return allDocs;
    }
    
    return allDocs.filter(doc => {
      // Search in document name, description, and keywords
      const searchText = [
        doc.name,
        doc.description || '',
        ...doc.keywords
      ].join(' ').toLowerCase();
      
      return keywords.some(keyword => 
        searchText.includes(keyword.toLowerCase())
      );
    });
  },
  
  createDocument: async (title: string, content: string): Promise<Document> => {
    return await createNewDocument(title, content);
  }
};

// Export the service and additional utilities
export default localStorageService;
export { createNewDocument }; 