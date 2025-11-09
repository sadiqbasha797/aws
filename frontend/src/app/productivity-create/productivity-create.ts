import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductivityService, ProductivityData } from '../services/productivity.service';
import { TeamMemberService } from '../services/team-member.service';
import { AuthService } from '../services/auth.service';
import { ExcelUploadService, ExcelUploadData } from '../services/excel-upload.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-productivity-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productivity-create.html',
  styleUrls: ['./productivity-create.css']
})
export class ProductivityCreateComponent implements OnInit {
  uploadMode: 'excel' | 'manual' = 'excel'; // Default to Excel mode

  // Manual entry form
  productivityForm: Partial<ProductivityData> = {
    teamManager: '',
    associateName: '',
    month: this.getCurrentMonth(),
    week: `Week ${this.getCurrentWeek()}`,
    productivityPercentage: 0,
    year: new Date().getFullYear()
  };

  // Excel upload form
  excelUploadForm = {
    year: new Date().getFullYear()
  };
  selectedExcelFile: File | null = null;
  excelPreviewData: any[] = [];

  currentUser: any = null;

  availableTeamMembers: any[] = [];
  isLoadingTeamMembers = false;
  loading = false;
  isUploadingExcel = false;
  error = '';
  successMessage = '';

  monthOptions = [
    { value: 'January', label: 'January' },
    { value: 'February', label: 'February' },
    { value: 'March', label: 'March' },
    { value: 'April', label: 'April' },
    { value: 'May', label: 'May' },
    { value: 'June', label: 'June' },
    { value: 'July', label: 'July' },
    { value: 'August', label: 'August' },
    { value: 'September', label: 'September' },
    { value: 'October', label: 'October' },
    { value: 'November', label: 'November' },
    { value: 'December', label: 'December' }
  ];

  weekOptions: number[] = Array.from({ length: 53 }, (_, i) => i + 1);
  yearOptions: number[] = [];

  constructor(
    private productivityService: ProductivityService,
    private teamMemberService: TeamMemberService,
    private router: Router,
    private authService: AuthService,
    private excelUploadService: ExcelUploadService
  ) {
    this.checkManagerAccess();
    this.generateYearOptions();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadTeamMembers();
  }

  private loadCurrentUser(): void {
    const token = this.authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.currentUser = payload;
        // Set teamManager from user info
        this.productivityForm.teamManager = payload.managerId || payload._id || payload.name?.toLowerCase() || '';
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
  }

  private checkManagerAccess(): void {
    const token = this.authService.getToken();
    let userRole = 'user';
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userRole = payload.role || 'user';
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
    
    if (userRole !== 'manager') {
      this.router.navigate(['/productivity']);
    }
  }

  private generateYearOptions(): void {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 2; year <= currentYear + 1; year++) {
      this.yearOptions.push(year);
    }
  }

  private getCurrentMonth(): string {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return months[new Date().getMonth()];
  }

  private getCurrentWeek(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  }

  loadTeamMembers(): void {
    this.isLoadingTeamMembers = true;
    this.teamMemberService.getAllTeamMembers().subscribe({
      next: (response) => {
        if (response.status === 'success' && response.data?.teamMembers) {
          this.availableTeamMembers = response.data.teamMembers.filter((m: any) => m.isActive);
        }
        this.isLoadingTeamMembers = false;
      },
      error: (error) => {
        console.error('Error loading team members:', error);
        this.isLoadingTeamMembers = false;
        this.error = 'Failed to load team members. Please try again.';
      }
    });
  }

  createProductivity(): void {
    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.productivityService.createProductivityData(this.productivityForm as Omit<ProductivityData, '_id' | 'createdAt' | 'updatedAt'>).subscribe({
      next: (response) => {
        this.router.navigate(['/productivity']);
      },
      error: (error) => {
        console.error('Error creating productivity data:', error);
        this.error = error.error?.message || 'Failed to create productivity data. Please try again.';
        this.loading = false;
      }
    });
  }

  private validateForm(): boolean {
    if (!this.productivityForm.associateName || !this.productivityForm.month || !this.productivityForm.week) {
      this.error = 'Please fill in all required fields';
      return false;
    }

    if (this.availableTeamMembers.length > 0 && !this.availableTeamMembers.find(m => m.name === this.productivityForm.associateName)) {
      this.error = 'Please select a valid associate from the dropdown';
      return false;
    }

    if ((this.productivityForm.productivityPercentage || 0) < 0 || (this.productivityForm.productivityPercentage || 0) > 500) {
      this.error = 'Productivity percentage must be between 0 and 500';
      return false;
    }

    return true;
  }

  switchToManualMode() {
    this.uploadMode = 'manual';
    if (this.excelUploadForm.year) {
      this.productivityForm.year = this.excelUploadForm.year;
    }
  }

  switchToExcelMode() {
    this.uploadMode = 'excel';
    if (this.productivityForm.year) {
      this.excelUploadForm.year = this.productivityForm.year;
    }
  }

  // Excel upload methods
  onExcelFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12',
      'text/csv'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      this.error = 'Please select a valid Excel or CSV file (.xlsx, .xls, or .csv)';
      return;
    }

    this.selectedExcelFile = file;
    this.error = '';
    this.parseExcelFile(file);
  }

  parseExcelFile(file: File) {
    const reader = new FileReader();
    
    reader.onload = (e: any) => {
      try {
        let jsonData: any[][];
        
        if (file.name.endsWith('.csv')) {
          // Parse CSV
          const text = e.target.result;
          const lines = text.split('\n').filter((line: string) => line.trim());
          jsonData = lines.map((line: string) => {
            // Simple CSV parsing (handles quoted values)
            const values: string[] = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current.trim());
            return values;
          });
        } else {
          // Parse Excel
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        }
        
        if (jsonData.length < 2) {
          this.error = 'Excel/CSV file must contain at least a header row and one data row';
          this.selectedExcelFile = null;
          return;
        }

        // Get original headers (case preserved)
        const originalHeaders = (jsonData[0] as any[]).map((h: any) => String(h || '').trim());
        const headers = originalHeaders.map((h: string) => h.toLowerCase());
        
        const headerMap: any = {};
        headers.forEach((header: string, index: number) => {
          const headerLower = header.toLowerCase();
          if (headerLower.includes('associate name') || headerLower.includes('associatename')) {
            headerMap['associateName'] = index;
          } else if (headerLower.includes('month')) {
            headerMap['month'] = index;
          } else if (headerLower.includes('week')) {
            headerMap['week'] = index;
          } else if (headerLower.includes('productivity') && (headerLower.includes('percentage') || headerLower.includes('%'))) {
            headerMap['productivityPercentage'] = index;
          }
        });

        const requiredFields = ['associateName', 'month', 'week', 'productivityPercentage'];
        const missingFields = requiredFields.filter(field => !headerMap[field]);
        
        // If columns don't match, navigate to mapping page
        if (missingFields.length > 0) {
          const expectedColumns = [
            'associateName',
            'month',
            'week',
            'productivityPercentage'
          ];

          const uploadData: ExcelUploadData = {
            file: file,
            rawData: jsonData as any[][],
            headers: originalHeaders,
            expectedColumns: expectedColumns,
            uploadType: 'productivity',
            metadata: {
              year: this.excelUploadForm.year,
              teamManager: this.productivityForm.teamManager || ''
            }
          };

          this.excelUploadService.setUploadData(uploadData);
          this.router.navigate(['/productivity/excel-upload']);
          return;
        }

        const parsedData: any[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;

          const hasData = row.some((cell: any) => cell !== null && cell !== undefined && cell !== '');
          if (!hasData) continue;

          const rowData: any = {};
          
          Object.keys(headerMap).forEach(key => {
            const colIndex = headerMap[key];
            let value = row[colIndex];
            
            if (key === 'associateName' || key === 'month') {
              rowData[key] = String(value || '').trim();
            } else if (key === 'week') {
              // Ensure week is in "Week X" format
              let weekStr = String(value || '').trim();
              if (!weekStr.toLowerCase().startsWith('week')) {
                const weekNum = parseInt(weekStr);
                if (!isNaN(weekNum)) {
                  weekStr = `Week ${weekNum}`;
                }
              }
              rowData[key] = weekStr;
            } else if (key === 'productivityPercentage') {
              // Handle percentage values
              if (typeof value === 'string') {
                value = value.replace(/[%\s,]/g, ''); // Remove %, spaces, and commas
              }
              const numValue = parseFloat(value);
              rowData[key] = isNaN(numValue) ? 0 : numValue;
            } else {
              rowData[key] = value;
            }
          });

          if (rowData.associateName && rowData.month && rowData.week && rowData.productivityPercentage !== undefined) {
            parsedData.push(rowData);
          }
        }

        if (parsedData.length === 0) {
          this.error = 'No valid data rows found in Excel/CSV file';
          this.selectedExcelFile = null;
          return;
        }

        this.excelPreviewData = parsedData.slice(0, 5);
      } catch (error: any) {
        console.error('Error parsing Excel/CSV file:', error);
        this.error = `Error parsing file: ${error.message || 'Invalid file format'}`;
        this.selectedExcelFile = null;
      }
    };

    reader.onerror = () => {
      this.error = 'Error reading file';
      this.selectedExcelFile = null;
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }

  uploadExcelBulkData() {
    if (!this.selectedExcelFile) {
      this.error = 'Please select an Excel or CSV file';
      return;
    }

    if (!this.excelUploadForm.year) {
      this.error = 'Please select a year';
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e: any) => {
      try {
        let jsonData: any[][];
        
        if (this.selectedExcelFile!.name.endsWith('.csv')) {
          // Parse CSV
          const text = e.target.result;
          const lines = text.split('\n').filter((line: string) => line.trim());
          jsonData = lines.map((line: string) => {
            const values: string[] = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current.trim());
            return values;
          });
        } else {
          // Parse Excel
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        }
        
        const headers = (jsonData[0] as any[]).map((h: any) => String(h || '').trim().toLowerCase());
        
        const headerMap: any = {};
        headers.forEach((header: string, index: number) => {
          const headerLower = header.toLowerCase();
          if (headerLower.includes('associate name') || headerLower.includes('associatename')) {
            headerMap['associateName'] = index;
          } else if (headerLower.includes('month')) {
            headerMap['month'] = index;
          } else if (headerLower.includes('week')) {
            headerMap['week'] = index;
          } else if (headerLower.includes('productivity') && (headerLower.includes('percentage') || headerLower.includes('%'))) {
            headerMap['productivityPercentage'] = index;
          }
        });

        const allData: any[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;
          
          const hasData = row.some((cell: any) => cell !== null && cell !== undefined && cell !== '');
          if (!hasData) continue;

          const rowData: any = {
            year: this.excelUploadForm.year
          };
          
          Object.keys(headerMap).forEach(key => {
            const colIndex = headerMap[key];
            let value = row[colIndex];
            
            if (key === 'associateName' || key === 'month') {
              rowData[key] = String(value || '').trim();
            } else if (key === 'week') {
              let weekStr = String(value || '').trim();
              if (!weekStr.toLowerCase().startsWith('week')) {
                const weekNum = parseInt(weekStr);
                if (!isNaN(weekNum)) {
                  weekStr = `Week ${weekNum}`;
                }
              }
              rowData[key] = weekStr;
            } else if (key === 'productivityPercentage') {
              if (typeof value === 'string') {
                value = value.replace(/[%\s,]/g, '');
              }
              const numValue = parseFloat(value);
              rowData[key] = isNaN(numValue) ? 0 : numValue;
            } else {
              rowData[key] = value;
            }
          });

          if (rowData.associateName && rowData.month && rowData.week && rowData.productivityPercentage !== undefined) {
            allData.push(rowData);
          }
        }

        if (allData.length === 0) {
          this.error = 'No valid data to upload';
          return;
        }

        this.isUploadingExcel = true;
        this.error = '';
        
        this.productivityService.bulkCreateProductivityData(allData).subscribe({
          next: (response) => {
            this.isUploadingExcel = false;
            if (response.status === 'success') {
              this.successMessage = `Successfully uploaded ${allData.length} records`;
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
              this.error = response.message || 'Upload failed';
            }
          },
          error: (error) => {
            this.isUploadingExcel = false;
            console.error('Error uploading bulk data:', error);
            this.error = error.error?.message || 'Failed to upload data. Please try again.';
          }
        });
      } catch (error: any) {
        this.isUploadingExcel = false;
        this.error = `Error processing file: ${error.message}`;
      }
    };

    if (this.selectedExcelFile.name.endsWith('.csv')) {
      reader.readAsText(this.selectedExcelFile);
    } else {
      reader.readAsArrayBuffer(this.selectedExcelFile);
    }
  }

  cancel(): void {
    this.router.navigate(['/productivity']);
  }
}

