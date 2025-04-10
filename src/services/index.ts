import { DocumentService } from '../types.js';
import localStorageService from './local-storage-service/index.js';
import confluenceService from './confluence-service/index.js';

// Create registry of all available document services
const services: DocumentService[] = [
  localStorageService,
  confluenceService
];

/**
 * Get all available document services
 */
export function getAllServices(): DocumentService[] {
  return services;
}

/**
 * Get a document service by ID
 */
export function getServiceById(id: string): DocumentService | undefined {
  return services.find(service => service.id === id);
}

/**
 * Search for documents across all services
 */
export async function searchAllServices(keywords: string[]): Promise<Array<Awaited<ReturnType<DocumentService['getByKeywords']>>>[number]> {
  // Execute searches in parallel
  const results = await Promise.all(
    services.map(service => service.getByKeywords(keywords))
  );
  
  // Flatten and return all results
  return results.flat();
}

// Export the services
export { 
  localStorageService, 
  confluenceService
}; 