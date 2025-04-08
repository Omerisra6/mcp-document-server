import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Document } from './types.js';

// Get the current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define path for local storage file
const STORAGE_FILE = path.join(__dirname, '../data/documents.json');

// Initialize the storage directory if it doesn't exist
async function initializeStorage(): Promise<void> {
  try {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../data');
    await fs.mkdir(dataDir, { recursive: true });
    
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
 * Get all documents from local storage
 * @returns Array of documents
 */
export async function getAllDocuments(): Promise<Document[]> {
  try {
    const data = await fs.readFile(STORAGE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading from local storage:', error);
    return [];
  }
}

/**
 * Save documents to local storage
 * @param documents Array of documents to save
 */
async function saveDocuments(documents: Document[]): Promise<void> {
  try {
    await fs.writeFile(STORAGE_FILE, JSON.stringify(documents, null, 2));
  } catch (error) {
    console.error('Error writing to local storage:', error);
  }
}

/**
 * Search for documents in local storage based on keywords
 * @param keywords Array of keywords to search for
 * @returns Array of matching documents
 */
export async function searchDocuments(keywords: string | string[]): Promise<Document[]> {
  if (typeof keywords === 'string') {
    keywords = [keywords];
  }

  try {
    const data = await fs.readFile(STORAGE_FILE, 'utf8');

    const documents: Document[] = JSON.parse(data);
    
    // Filter documents that match any of the keywords
    if (keywords.length === 0) {
      return documents;
    }
    
    return documents.filter(doc => {
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
  } catch (error) {
    console.error('Error searching documents:', error);
    return [];
  }
}

/**
 * Create a new document in local storage
 * @param title Title of the document
 * @param content Content of the document in markdown format
 * @returns Metadata of the created document
 */
export async function createDocument(title: string, content: string): Promise<Document> {
  try {
    const documents = await getAllDocuments();
    
    // Generate a random ID
    const id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Extract keywords from title and content
    const keywords = [
      ...title.split(/\s+/).filter(word => word.length > 3),
      ...content.split(/\s+/).filter(word => word.length > 3).slice(0, 20) // Take first 20 significant words
    ];
    
    // Create document object
    const newDocument: Document = {
      id,
      name: title,
      description: `Keywords: ${keywords.join(', ')}`,
      // Create a fake web link for consistency with Google Docs interface
      webViewLink: `file://${path.join(__dirname, '../data/documents', `${id}.md`)}`,
      keywords
    };
    
    // Save the document content to a markdown file
    const documentsDir = path.join(__dirname, '../data/documents');
    await fs.mkdir(documentsDir, { recursive: true });
    await fs.writeFile(path.join(documentsDir, `${id}.md`), content);
    
    // Add to documents list and save
    documents.push(newDocument);
    await saveDocuments(documents);
    
    return newDocument;
  } catch (error) {
    console.error('Error creating document:', error);
    throw new Error('Failed to create document');
  }
} 