import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExcelUploadService, ExcelUploadData } from '../services/excel-upload.service';
import { ReliabilityService } from '../services/reliability.service';
import { ProductivityService } from '../services/productivity.service';
import { AuthService } from '../services/auth.service';
import { ReliabilityDocService } from '../services/reliability-doc.service';
import * as XLSX from 'xlsx';

interface ColumnMapping {
  acceptedColumn: string;
  uploadedColumn: string;
  displayName: string;
}

@Component({
  selector: 'app-excel-column-mapping',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './excel-column-mapping.html',
  styleUrls: ['./excel-column-mapping.css']
})
export class ExcelColumnMappingComponent implements OnInit {
  uploadData: ExcelUploadData | null = null;
  expectedColumns: string[] = [];
  uploadedColumns: string[] = [];
  columnMappings: ColumnMapping[] = [];
  error = '';
  successMessage = '';
  isUploading = false;
  previewData: any[] = [];

  constructor(
    private excelUploadService: ExcelUploadService,
    private reliabilityService: ReliabilityService,
    private productivityService: ProductivityService,
    private authService: AuthService,
    private router: Router,
    private reliabilityDocService: ReliabilityDocService
  ) {}

  ngOnInit(): void {
    this.uploadData = this.excelUploadService.getUploadData();
    
    if (!this.uploadData) {
      this.error = 'No Excel data found. Please go back and upload a file.';
      return;
    }

    this.expectedColumns = this.uploadData.expectedColumns;
    this.uploadedColumns = this.uploadData.headers;
    this.initializeMappings();
    this.generatePreview();
  }

  initializeMappings(): void {
    // Create mapping objects for each expected column
    this.columnMappings = this.expectedColumns.map(column => {
      // Try to find a matching uploaded column
      const matchingColumn = this.findMatchingColumn(column);
      
      return {
        acceptedColumn: column,
        uploadedColumn: matchingColumn || '',
        displayName: this.getDisplayName(column)
      };
    });
  }

  findMatchingColumn(expectedColumn: string): string | null {
    const expectedLower = expectedColumn.toLowerCase();
    
    // Try exact match first
    for (const uploadedCol of this.uploadedColumns) {
      if (uploadedCol.toLowerCase() === expectedLower) {
        return uploadedCol;
      }
    }

    // Try partial match
    for (const uploadedCol of this.uploadedColumns) {
      const uploadedLower = uploadedCol.toLowerCase();
      if (expectedLower.includes(uploadedLower) || uploadedLower.includes(expectedLower)) {
        return uploadedCol;
      }
    }

    // Try keyword matching
    const keywords = this.getKeywords(expectedColumn);
    for (const keyword of keywords) {
      for (const uploadedCol of this.uploadedColumns) {
        if (uploadedCol.toLowerCase().includes(keyword.toLowerCase())) {
          return uploadedCol;
        }
      }
    }

    return null;
  }

  getKeywords(column: string): string[] {
    const keywordMap: { [key: string]: string[] } = {
      // Reliability keywords
      'workerId': ['worker', 'id', 'workerid'],
      'daId': ['da', 'daid', 'da id'],
      'totalTasks': ['task', 'tasks', 'totaltasks', 'total tasks'],
      'totalOpportunities': ['opportunity', 'opportunities', 'totalopportunities', 'total opportunities'],
      'totalSegmentsMatching': ['segment', 'segments', 'matching', 'totalsegmentsmatching', 'total segments matching'],
      'totalLabelMatching': ['label', 'labels', 'totallabelmatching', 'total label matching'],
      'totalDefects': ['defect', 'defects', 'totaldefects', 'total defects'],
      'overallReliabilityScore': ['score', 'reliability', 'overall', 'overallreliabilityscore', 'overall reliability score'],
      // Productivity keywords
      'associateName': ['associate', 'name', 'associatename', 'associate name', 'employee', 'team member'],
      'month': ['month'],
      'week': ['week'],
      'productivityPercentage': ['productivity', 'percentage', '%', 'productivitypercentage', 'productivity percentage', 'performance']
    };

    return keywordMap[column] || [column];
  }

  getDisplayName(column: string): string {
    const displayNames: { [key: string]: string } = {
      // Reliability display names
      'workerId': 'Worker ID',
      'daId': 'DA ID',
      'totalTasks': 'Total Tasks',
      'totalOpportunities': 'Total Opportunities',
      'totalSegmentsMatching': 'Total Segments Matching',
      'totalLabelMatching': 'Total Label Matching',
      'totalDefects': 'Total Defects',
      'overallReliabilityScore': 'Overall Reliability Score',
      // Productivity display names
      'associateName': 'Associate Name',
      'month': 'Month',
      'week': 'Week',
      'productivityPercentage': 'Productivity Percentage'
    };

    return displayNames[column] || column;
  }

  generatePreview(): void {
    if (!this.uploadData) return;

    const rawData = this.uploadData.rawData;
    const headerRow = rawData[0];
    const dataRows = rawData.slice(1).slice(0, 5); // First 5 data rows

    this.previewData = dataRows.map(row => {
      const previewRow: any = {};
      this.columnMappings.forEach(mapping => {
        if (mapping.uploadedColumn) {
          const uploadedIndex = this.uploadedColumns.indexOf(mapping.uploadedColumn);
          if (uploadedIndex >= 0 && uploadedIndex < row.length) {
            let value = row[uploadedIndex];
            const key = mapping.acceptedColumn;
            
            // Apply the same conversion logic as in processAndUpload
            if (key === 'workerId' || key === 'daId' || key === 'associateName') {
              previewRow[key] = String(value || '').trim();
            } else if (key === 'month') {
              // Normalize month for preview
              let monthStr = String(value || '').trim();
              const monthNum = parseInt(monthStr);
              if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
                previewRow[key] = monthNames[monthNum - 1];
              } else {
                previewRow[key] = monthStr;
              }
            } else if (key === 'week') {
              // Normalize week for preview
              let weekStr = String(value || '').trim();
              const weekLower = weekStr.replace(/\s+/g, '').toLowerCase();
              const weekMatch = weekLower.match(/week[^0-9]*(\d+)/) || weekLower.match(/^(\d+)$/);
              
              if (weekMatch) {
                const weekNum = parseInt(weekMatch[1]);
                if (weekNum >= 1 && weekNum <= 53) {
                  weekStr = `Week ${weekNum}`;
                }
              } else {
                const existingMatch = weekStr.match(/^week\s*(\d+)$/i);
                if (existingMatch) {
                  const weekNum = parseInt(existingMatch[1]);
                  if (weekNum >= 1 && weekNum <= 53) {
                    weekStr = `Week ${weekNum}`;
                  }
                }
              }
              previewRow[key] = weekStr;
            } else if (key.includes('Score') || key === 'productivityPercentage') {
              // Handle percentage scores - Excel stores percentages as decimals (100% = 1.0)
              if (typeof value === 'string') {
                value = value.replace(/[%\s,]/g, ''); // Remove %, spaces, and commas
              }
              let numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                // If value is <= 1, it might be a decimal percentage (1.0 = 100%), so multiply by 100
                // But also check if it's already > 1 (like 100.0), then use as-is
                // Convert 1.0 to 100 (Excel percentage format), and values between 0 and 1
                if (numValue > 0 && numValue <= 1) {
                  numValue = numValue * 100;
                }
                previewRow[key] = numValue;
              } else {
                previewRow[key] = 0;
              }
            } else if (key.includes('total') || key.includes('Matching')) {
              if (typeof value === 'string') {
                value = value.replace(/[%\s,]/g, '');
              }
              const numValue = parseFloat(value);
              previewRow[key] = isNaN(numValue) ? 0 : numValue;
            } else {
              previewRow[key] = value;
            }
          }
        }
      });
      return previewRow;
    });
  }

  validateMappings(): boolean {
    if (!this.uploadData) return false;

    const requiredColumns = this.uploadData.uploadType === 'reliability' 
      ? ['workerId', 'daId', 'totalTasks', 'totalOpportunities', 'totalDefects', 'overallReliabilityScore']
      : ['associateName', 'month', 'week', 'productivityPercentage'];
    
    for (const required of requiredColumns) {
      const mapping = this.columnMappings.find(m => m.acceptedColumn === required);
      if (!mapping || !mapping.uploadedColumn) {
        this.error = `Please map the required column: ${this.getDisplayName(required)}`;
        return false;
      }
    }

    // Check for duplicate mappings
    const mappedColumns = this.columnMappings
      .filter(m => m.uploadedColumn)
      .map(m => m.uploadedColumn);
    
    const duplicates = mappedColumns.filter((col, index) => mappedColumns.indexOf(col) !== index);
    if (duplicates.length > 0) {
      this.error = `Cannot map multiple columns to the same uploaded column: ${duplicates[0]}`;
      return false;
    }

    return true;
  }

  onMappingChange(): void {
    this.error = '';
    this.generatePreview();
  }

  processAndUpload(): void {
    if (!this.validateMappings()) {
      return;
    }

    if (!this.uploadData) {
      this.error = 'No upload data found';
      return;
    }

    this.isUploading = true;
    this.error = '';
    this.successMessage = '';

    try {
      const rawData = this.uploadData.rawData;
      const dataRows = rawData.slice(1); // Skip header row

      const allData: any[] = [];
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row || row.length === 0) continue;

        const hasData = row.some((cell: any) => cell !== null && cell !== undefined && cell !== '');
        if (!hasData) continue;

        const rowData: any = {
          year: this.uploadData.metadata.year
        };

        // Add metadata based on upload type
        if (this.uploadData.uploadType === 'reliability') {
          rowData.processname = this.uploadData.metadata.processname;
          rowData.job_id = this.uploadData.metadata.job_id;
          rowData.month = this.uploadData.metadata.month;
        } else if (this.uploadData.uploadType === 'productivity') {
          rowData.teamManager = this.uploadData.metadata.teamManager || '';
        }

        // Map each column
        this.columnMappings.forEach(mapping => {
          if (mapping.uploadedColumn) {
            const uploadedIndex = this.uploadedColumns.indexOf(mapping.uploadedColumn);
            if (uploadedIndex >= 0 && uploadedIndex < row.length) {
              let value = row[uploadedIndex];
              const key = mapping.acceptedColumn;

              if (key === 'workerId' || key === 'daId' || key === 'associateName') {
                rowData[key] = String(value || '').trim();
              } else if (key === 'month') {
                // Normalize month: handle numbers 1-12, abbreviated (Jan, Feb), and full names
                let monthStr = String(value || '').trim();
                const monthNum = parseInt(monthStr);
                if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
                  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
                  rowData[key] = monthNames[monthNum - 1];
                } else {
                  rowData[key] = monthStr; // Backend will normalize text formats
                }
              } else if (key === 'week') {
                // Normalize week: handle all formats (12, 3, week1, week 1, Week 1, WEEK 1, WEEK1, etc.)
                let weekStr = String(value || '').trim();
                const weekLower = weekStr.replace(/\s+/g, '').toLowerCase();
                
                // Extract number from any format
                const weekMatch = weekLower.match(/week[^0-9]*(\d+)/) || weekLower.match(/^(\d+)$/);
                
                if (weekMatch) {
                  const weekNum = parseInt(weekMatch[1]);
                  if (weekNum >= 1 && weekNum <= 53) {
                    weekStr = `Week ${weekNum}`;
                  }
                } else {
                  // If already in "Week X" format, validate
                  const existingMatch = weekStr.match(/^week\s*(\d+)$/i);
                  if (existingMatch) {
                    const weekNum = parseInt(existingMatch[1]);
                    if (weekNum >= 1 && weekNum <= 53) {
                      weekStr = `Week ${weekNum}`;
                    }
                  }
                }
                rowData[key] = weekStr;
              } else if (key.includes('Score') || key === 'productivityPercentage') {
                // Handle percentage scores - Excel stores percentages as decimals (100% = 1.0)
                if (typeof value === 'string') {
                  value = value.replace(/[%\s,]/g, ''); // Remove %, spaces, and commas
                }
                let numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                  // If value is <= 1, it might be a decimal percentage (1.0 = 100%), so multiply by 100
                  // But also check if it's already > 1 (like 100.0), then use as-is
                  // Convert 1.0 to 100 (Excel percentage format), and values between 0 and 1
                  if (numValue > 0 && numValue <= 1) {
                    numValue = numValue * 100;
                  }
                  rowData[key] = numValue;
                } else {
                  rowData[key] = 0;
                }
              } else if (key.includes('total') || key.includes('Matching')) {
                if (typeof value === 'string') {
                  value = value.replace(/[%\s,]/g, ''); // Remove %, spaces, and commas
                }
                const numValue = parseFloat(value);
                rowData[key] = isNaN(numValue) ? 0 : numValue;
              } else {
                rowData[key] = value;
              }
            }
          }
        });

        // Validate and process based on upload type
        if (this.uploadData.uploadType === 'reliability') {
          // Validate required fields - ensure they are not empty strings
          const workerId = String(rowData.workerId || '').trim();
          const daId = String(rowData.daId || '').trim();
          const processname = String(this.uploadData.metadata.processname || '').trim();
          const job_id = String(this.uploadData.metadata.job_id || '').trim();
          
          // Ensure numeric fields are numbers
          const totalTasks = Number(rowData.totalTasks) || 0;
          const totalOpportunities = Number(rowData.totalOpportunities) || 0;
          const totalSegmentsMatching = Number(rowData.totalSegmentsMatching) || 0;
          const totalLabelMatching = Number(rowData.totalLabelMatching) || 0;
          const totalDefects = Number(rowData.totalDefects) || 0;
          let overallReliabilityScore = Number(rowData.overallReliabilityScore) || 0;
          
          // Handle percentage scores - if Excel stored it as decimal (1.0 = 100%), convert to percentage
          // Convert 1.0 to 100 (Excel percentage format), and values between 0 and 1
          if (overallReliabilityScore > 0 && overallReliabilityScore <= 1) {
            overallReliabilityScore = overallReliabilityScore * 100;
          }
          
          if (workerId && daId && processname && job_id && totalOpportunities > 0) {
            // Ensure all required fields are properly set
            rowData.workerId = workerId;
            rowData.daId = daId.toUpperCase(); // Ensure uppercase for DA ID
            rowData.processname = processname;
            rowData.job_id = job_id;
            rowData.totalTasks = totalTasks;
            rowData.totalOpportunities = totalOpportunities;
            rowData.totalSegmentsMatching = totalSegmentsMatching;
            rowData.totalLabelMatching = totalLabelMatching;
            rowData.totalDefects = totalDefects;
            rowData.overallReliabilityScore = overallReliabilityScore;
            rowData.year = Number(this.uploadData.metadata.year) || new Date().getFullYear();
            rowData.month = Number(this.uploadData.metadata.month) || new Date().getMonth() + 1;
            allData.push(rowData);
          }
        } else if (this.uploadData.uploadType === 'productivity') {
          // Validate productivity fields
          const associateName = String(rowData.associateName || '').trim();
          let month = String(rowData.month || '').trim();
          let week = String(rowData.week || '').trim();
          const productivityPercentage = Number(rowData.productivityPercentage) || 0;
          
          // Normalize month if it's a number (1-12)
          const monthNum = parseInt(month);
          if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'];
            month = monthNames[monthNum - 1];
          }
          
          // Normalize week format (handle all formats)
          const weekLower = week.replace(/\s+/g, '').toLowerCase();
          const weekMatch = weekLower.match(/week[^0-9]*(\d+)/) || weekLower.match(/^(\d+)$/);
          
          if (weekMatch) {
            const weekNum = parseInt(weekMatch[1]);
            if (weekNum >= 1 && weekNum <= 53) {
              week = `Week ${weekNum}`;
            }
          } else {
            // If already in "Week X" format, validate
            const existingMatch = week.match(/^week\s*(\d+)$/i);
            if (existingMatch) {
              const weekNum = parseInt(existingMatch[1]);
              if (weekNum >= 1 && weekNum <= 53) {
                week = `Week ${weekNum}`;
              }
            }
          }
          
          if (associateName && month && week && productivityPercentage !== undefined) {
            // Get teamManager from metadata or auth service
            let teamManager = this.uploadData.metadata.teamManager || '';
            if (!teamManager) {
              const token = this.authService.getToken();
              if (token) {
                try {
                  const payload = JSON.parse(atob(token.split('.')[1]));
                  teamManager = payload.managerId || payload._id || '';
                } catch (error) {
                  console.error('Error parsing token:', error);
                }
              }
            }
            
            rowData.associateName = associateName;
            rowData.month = month;
            rowData.week = week;
            rowData.productivityPercentage = productivityPercentage;
            rowData.year = Number(this.uploadData.metadata.year) || new Date().getFullYear();
            rowData.teamManager = teamManager;
            allData.push(rowData);
          }
        }
      }

      if (allData.length === 0) {
        this.error = 'No valid data to upload after mapping';
        this.isUploading = false;
        return;
      }

      console.log(`Preparing to upload ${allData.length} records:`, allData.map((r, idx) => ({
        index: idx,
        associateName: r.associateName,
        month: r.month,
        week: r.week,
        year: r.year
      })));

      // Upload the data based on type
      if (this.uploadData.uploadType === 'reliability') {
        this.reliabilityService.bulkCreateReliabilityData(allData).subscribe({
          next: (response) => {
            // After data is uploaded successfully, upload the file to S3
            if (response.status === 'success' || response.status === 'partial') {
              // Upload file to S3 for storage
              if (this.uploadData?.file) {
                this.reliabilityDocService.createReliabilityDoc(
                  this.uploadData.file,
                  this.uploadData.metadata.processname,
                  this.uploadData.metadata.job_id,
                  this.uploadData.metadata.year,
                  this.uploadData.metadata.month
                ).subscribe({
                  next: (docResponse) => {
                    this.isUploading = false;
                    if (response.status === 'success') {
                      this.successMessage = `Successfully uploaded ${allData.length} records and saved file`;
                    } else {
                      const results = (response.results && typeof response.results === 'object' && 'success' in response.results) 
                        ? response.results as { success: number; failed: number }
                        : { success: 0, failed: 0 };
                      this.successMessage = `Upload completed: ${results.success || 0} succeeded, ${results.failed || 0} failed. File saved.`;
                      if (results.failed > 0) {
                        this.error = `${results.failed} record(s) failed. Please check the data and try again.`;
                      }
                    }
                    this.excelUploadService.clearUploadData();
                    setTimeout(() => {
                      this.router.navigate(['/reliability']);
                    }, 2000);
                  },
                  error: (docError) => {
                    // File upload failed, but data was uploaded - log error but don't fail the whole operation
                    console.error('Error uploading file to S3:', docError);
            this.isUploading = false;
            if (response.status === 'success') {
                      this.successMessage = `Successfully uploaded ${allData.length} records. Warning: File could not be saved.`;
                    } else {
                      const results = (response.results && typeof response.results === 'object' && 'success' in response.results) 
                        ? response.results as { success: number; failed: number }
                        : { success: 0, failed: 0 };
                      this.successMessage = `Upload completed: ${results.success || 0} succeeded, ${results.failed || 0} failed. Warning: File could not be saved.`;
                      if (results.failed > 0) {
                        this.error = `${results.failed} record(s) failed. Please check the data and try again.`;
                      }
                    }
              this.excelUploadService.clearUploadData();
              setTimeout(() => {
                this.router.navigate(['/reliability']);
                    }, 2000);
                  }
                });
              } else {
                // No file to upload, just proceed
                this.isUploading = false;
                if (response.status === 'success') {
                  this.successMessage = `Successfully uploaded ${allData.length} records`;
                } else {
              const results = (response.results && typeof response.results === 'object' && 'success' in response.results) 
                ? response.results as { success: number; failed: number }
                : { success: 0, failed: 0 };
              this.successMessage = `Upload completed: ${results.success || 0} succeeded, ${results.failed || 0} failed.`;
              if (results.failed > 0) {
                this.error = `${results.failed} record(s) failed. Please check the data and try again.`;
              }
                }
                this.excelUploadService.clearUploadData();
              setTimeout(() => {
                this.router.navigate(['/reliability']);
                }, response.status === 'success' ? 1500 : 2000);
              }
            } else {
              this.isUploading = false;
              // Show detailed error messages from failed records
              const results = response.results;
              if (results && typeof results === 'object' && 'failedRecords' in results && results.failedRecords && results.failedRecords.length > 0) {
                const errorMessages = results.failedRecords.map((failed: any, idx: number) => 
                  `Record ${failed.index + 1}: ${failed.error}`
                ).join('; ');
                this.error = `Upload failed: ${errorMessages}`;
              } else {
                this.error = response.message || 'Upload failed';
              }
            }
          },
          error: (error) => {
            this.isUploading = false;
            console.error('Error uploading bulk data:', error);
            
            // Extract detailed error messages from failed records
            const errorResults = error.error?.results;
            if (errorResults && typeof errorResults === 'object' && 'failedRecords' in errorResults && errorResults.failedRecords && errorResults.failedRecords.length > 0) {
              const errorMessages = errorResults.failedRecords.map((failed: any, idx: number) => 
                `Record ${failed.index + 1}: ${failed.error}`
              ).join('; ');
              this.error = `Upload failed: ${errorMessages}`;
            } else {
              this.error = error.error?.message || 'Failed to upload data. Please try again.';
            }
          }
        });
      } else if (this.uploadData.uploadType === 'productivity') {
        this.productivityService.bulkCreateProductivityData(allData).subscribe({
          next: (response) => {
            this.isUploading = false;
            if (response.status === 'success') {
              this.successMessage = `Successfully uploaded ${allData.length} records`;
              this.excelUploadService.clearUploadData();
              setTimeout(() => {
                this.router.navigate(['/productivity']);
              }, 1500);
            } else if (response.status === 'partial') {
              const results = (response.results && typeof response.results === 'object' && 'success' in response.results) 
                ? response.results as { success: number; failed: number }
                : { success: 0, failed: 0 };
              this.successMessage = `Upload completed: ${results.success || 0} succeeded, ${results.failed || 0} failed.`;
              if (results.failed > 0) {
                this.error = `${results.failed} record(s) failed. Please check the data and try again.`;
              }
              setTimeout(() => {
                this.router.navigate(['/productivity']);
              }, 2000);
            } else {
              // Show detailed error messages from failed records
              const results = response.results as any;
              if (results && typeof results === 'object' && 'failedRecords' in results && results.failedRecords && Array.isArray(results.failedRecords) && results.failedRecords.length > 0) {
                const errorMessages = results.failedRecords.map((failed: any, idx: number) => 
                  `Record ${failed.index + 1}: ${failed.error}`
                ).join('; ');
                this.error = `Upload failed: ${errorMessages}`;
              } else {
                this.error = response.message || 'Upload failed';
              }
            }
          },
          error: (error) => {
            this.isUploading = false;
            console.error('Error uploading bulk data:', error);
            
            // Extract detailed error messages from failed records
            const errorResults = error.error?.results as any;
            if (errorResults && typeof errorResults === 'object' && 'failedRecords' in errorResults && errorResults.failedRecords && Array.isArray(errorResults.failedRecords) && errorResults.failedRecords.length > 0) {
              const errorMessages = errorResults.failedRecords.map((failed: any, idx: number) => 
                `Record ${failed.index + 1}: ${failed.error}`
              ).join('; ');
              this.error = `Upload failed: ${errorMessages}`;
            } else {
              this.error = error.error?.message || 'Failed to upload data. Please try again.';
            }
          }
        });
      }
    } catch (error: any) {
      this.isUploading = false;
      this.error = `Error processing Excel file: ${error.message}`;
    }
  }

  isRequiredColumn(column: string): boolean {
    if (!this.uploadData) return false;
    const requiredColumns = this.uploadData.uploadType === 'reliability' 
      ? ['workerId', 'daId', 'totalTasks', 'totalOpportunities', 'totalDefects', 'overallReliabilityScore']
      : ['associateName', 'month', 'week', 'productivityPercentage'];
    return requiredColumns.includes(column);
  }

  isAllRequiredMapped(): boolean {
    if (!this.uploadData) return false;
    const requiredColumns = this.uploadData.uploadType === 'reliability' 
      ? ['workerId', 'daId', 'totalTasks', 'totalOpportunities', 'totalDefects', 'overallReliabilityScore']
      : ['associateName', 'month', 'week', 'productivityPercentage'];
    return requiredColumns.every(col => {
      const mapping = this.columnMappings.find(m => m.acceptedColumn === col);
      return mapping && mapping.uploadedColumn;
    });
  }

  getMappedColumns(): ColumnMapping[] {
    return this.columnMappings.filter(m => m.uploadedColumn);
  }

  formatPreviewValue(value: any, column: string): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    if (column.includes('Score') || column === 'productivityPercentage') {
      return typeof value === 'number' ? value.toFixed(2) + '%' : String(value);
    }

    if (column.includes('total') || column.includes('Matching')) {
      return typeof value === 'number' ? value.toString() : String(value);
    }

    return String(value);
  }

  goBack(): void {
    this.excelUploadService.clearUploadData();
    if (this.uploadData?.uploadType === 'productivity') {
      this.router.navigate(['/productivity/create']);
    } else {
      this.router.navigate(['/reliability/create']);
    }
  }
}

