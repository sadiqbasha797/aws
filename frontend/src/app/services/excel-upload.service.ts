import { Injectable } from '@angular/core';

export interface ExcelColumnMapping {
  acceptedColumn: string;
  uploadedColumn: string;
}

export interface ExcelUploadData {
  file: File;
  rawData: any[][]; // Raw Excel data (rows and columns)
  headers: string[]; // Uploaded column headers
  expectedColumns: string[]; // Accepted/Expected column names
  columnMapping?: { [key: string]: string }; // Mapping from accepted to uploaded columns
  uploadType: 'reliability' | 'productivity'; // Type of upload
  metadata: {
    // For reliability
    processname?: string;
    job_id?: string;
    year: number;
    month?: number;
    // For productivity
    teamManager?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ExcelUploadService {
  private uploadData: ExcelUploadData | null = null;

  setUploadData(data: ExcelUploadData): void {
    this.uploadData = data;
  }

  getUploadData(): ExcelUploadData | null {
    return this.uploadData;
  }

  clearUploadData(): void {
    this.uploadData = null;
  }
}

