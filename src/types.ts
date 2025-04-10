export interface Document {
  id: string;
  name: string;
  description?: string;
  webViewLink: string;
  keywords: string[];
  getContent: () => Promise<{content: string, mimeType: string}>;
}

export interface DocumentService {
  id: string;
  getByKeywords: (keywords: string[]) => Promise<Document[]>;
  createDocument?: (title: string, content: string) => Promise<Document>;
} 