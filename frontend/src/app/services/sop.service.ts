import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from './environment';

export interface SOP {
  _id: string;
  title: string;
  process: string;
  documents: SOPDocument[];
  sopUrl?: string;
  createdBy: {
    userId: string;
    userType: 'TeamMember' | 'Manager';
    name: string;
    email: string;
  };
  updatedBy: {
    userId: string;
    userType: 'TeamMember' | 'Manager';
    name: string;
    email: string;
  };
  version: number;
  // Versioning fields (deprecated)
  parentSOPId?: string;
  versionNumber: number;
  isParentVersion: boolean;
  versionHistory: string[];
  // Soft delete fields
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: {
    userId: string;
    userType: 'TeamMember' | 'Manager';
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SOPDocument {
  _id: string;
  filename: string;
  originalName: string;
  s3Key: string;
  s3Url: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: {
    userId: string;
    userType: 'TeamMember' | 'Manager';
    name: string;
    email: string;
  };
}

export interface SOPListResponse {
  message: string;
  sops: SOP[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface SOPResponse {
  message: string;
  sop: SOP;
}

export interface SOPCreateRequest {
  title: string;
  process: string;
  sopUrl?: string;
}

export interface BinItem {
  _id: string;
  originalId: string;
  collectionName: string;
  data: any;
  deletedBy: {
    userId: string;
    userType: 'TeamMember' | 'Manager';
    name: string;
    email: string;
  };
  deletedAt: string;
  expiresAt: string;
  restoreLocation: {
    parentId?: string;
    position?: number;
    metadata: any;
  };
  deletionReason: string;
  isRestored: boolean;
  restoredAt?: string;
  restoredBy?: {
    userId: string;
    userType: 'TeamMember' | 'Manager';
    name: string;
    email: string;
  };
  daysUntilExpiry: number;
}

@Injectable({
  providedIn: 'root'
})
export class SOPService {
  private baseUrl = `${environment.baseUrl}/sops`;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // Get all SOPs with filtering and pagination
  getAllSOPs(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Observable<SOPListResponse> {
    let queryParams = '';
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
      queryParams = searchParams.toString();
    }
    
    const url = queryParams ? `${this.baseUrl}?${queryParams}` : this.baseUrl;
    return this.http.get<SOPListResponse>(url, { headers: this.getHeaders() });
  }

  // Get SOP by ID
  getSOPById(id: string): Observable<SOPResponse> {
    return this.http.get<SOPResponse>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Get current user's SOPs
  getMySOPs(): Observable<SOPListResponse> {
    return this.http.get<SOPListResponse>(`${this.baseUrl}/my`, { headers: this.getHeaders() });
  }

  // Get active SOPs
  getActiveSOPs(): Observable<SOPListResponse> {
    return this.http.get<SOPListResponse>(`${this.baseUrl}/active`, { headers: this.getHeaders() });
  }

  // Create new SOP (for managers)
  createSOP(sopData: SOPCreateRequest, documents?: FileList): Observable<SOPResponse> {
    const formData = new FormData();
    
    // Add SOP data
    Object.entries(sopData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });

    // Add documents if provided
    if (documents) {
      for (let i = 0; i < documents.length; i++) {
        formData.append('documents', documents[i]);
      }
    }

    return this.http.post<SOPResponse>(this.baseUrl, formData, { headers: this.getHeaders() });
  }

  // Update SOP (without documents)
  updateSOP(id: string, sopData: Partial<SOPCreateRequest>): Observable<SOPResponse> {
    return this.http.put<SOPResponse>(`${this.baseUrl}/${id}`, sopData, { headers: this.getHeaders() });
  }

  // Delete SOP
  deleteSOP(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Add documents to existing SOP
  addDocuments(id: string, documents: FileList): Observable<SOPResponse> {
    const formData = new FormData();
    
    for (let i = 0; i < documents.length; i++) {
      formData.append('documents', documents[i]);
    }

    return this.http.post<SOPResponse>(`${this.baseUrl}/${id}/documents`, formData, { headers: this.getHeaders() });
  }

  // Remove document from SOP
  removeDocument(sopId: string, documentId: string): Observable<SOPResponse> {
    return this.http.delete<SOPResponse>(`${this.baseUrl}/${sopId}/documents/${documentId}`, { headers: this.getHeaders() });
  }

  // Download document (returns blob)
  downloadDocument(key: string): Observable<Blob> {
    const encodedKey = encodeURIComponent(key);
    return this.http.get(`${environment.baseUrl}/files/download/${encodedKey}`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  // Get document view URL (returns presigned URL for viewing in new tab)
  getDocumentViewUrl(key: string): Observable<string> {
    const encodedKey = encodeURIComponent(key);
    return this.http.get<{url: string}>(`${environment.baseUrl}/files/url/${encodedKey}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.url)
    );
  }

  // Get file extension from filename
  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  // Get file icon based on file type
  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'fas fa-image';
    if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
    if (mimeType.includes('word')) return 'fas fa-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fas fa-file-excel';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fas fa-file-powerpoint';
    if (mimeType.includes('text')) return 'fas fa-file-alt';
    return 'fas fa-file';
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Check if user can edit SOP (managers can edit all, team members can only add documents)
  canEditSOP(sop: SOP): boolean {
    return this.getUserRole() === 'manager';
  }

  private getUserRole(): string {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role || 'user';
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
    return 'user';
  }

  // Check if user can add documents to SOP
  canAddDocuments(sop: SOP): boolean {
    // Both managers and team members can add documents
    return true;
  }

  // Versioning Methods
  createSOPVersion(sopId: string, sopData: SOPCreateRequest, documents?: FileList): Observable<SOPResponse> {
    const formData = new FormData();
    
    // Add SOP data
    Object.entries(sopData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });

    // Add documents if provided
    if (documents) {
      for (let i = 0; i < documents.length; i++) {
        formData.append('documents', documents[i]);
      }
    }

    return this.http.post<SOPResponse>(`${this.baseUrl}/${sopId}/versions`, formData, { headers: this.getHeaders() });
  }

  getSOPVersions(sopId: string): Observable<{message: string, versions: SOP[], count: number}> {
    return this.http.get<{message: string, versions: SOP[], count: number}>(`${this.baseUrl}/${sopId}/versions`, { headers: this.getHeaders() });
  }

  softDeleteSOP(sopId: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.baseUrl}/${sopId}/soft`, { headers: this.getHeaders() });
  }

  // Bin Methods
  getBinItems(collection?: string): Observable<{message: string, items: BinItem[], count: number}> {
    let url = `${this.baseUrl}/bin/items`;
    if (collection) {
      url += `?collection=${collection}`;
    }
    return this.http.get<{message: string, items: BinItem[], count: number}>(url, { headers: this.getHeaders() });
  }

  restoreFromBin(binId: string): Observable<{message: string, item: any}> {
    return this.http.post<{message: string, item: any}>(`${this.baseUrl}/bin/${binId}/restore`, {}, { headers: this.getHeaders() });
  }

  // Helper method to check if user can create versions
  canCreateVersion(sop: SOP): boolean {
    // Anyone can create new versions
    return true;
  }

  // Helper method to format version display
  getVersionDisplay(sop: SOP): string {
    return `Version ${sop.versionNumber}${sop.isParentVersion ? ' (Current)' : ''}`;
  }

  // Helper method to get days until bin expiry
  getDaysUntilExpiry(expiresAt: string): number {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }
}
