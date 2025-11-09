import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReliabilityService, ReliabilityData } from '../services/reliability.service';
import { TeamMemberService } from '../services/team-member.service';
import { AuthService } from '../services/auth.service';
import { ExcelUploadService, ExcelUploadData } from '../services/excel-upload.service';
import { ProcessService, Process } from '../services/process.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-reliability-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reliability-create.html',
  styleUrls: ['./reliability-create.css']
})
export class ReliabilityCreateComponent implements OnInit {
  uploadMode: 'excel' | 'manual' = 'excel'; // Default to Excel mode

  // Manual entry form
  reliabilityForm: Partial<ReliabilityData> = {
    workerId: '',
    daId: '',
    managerId: '',
    processname: '',
    job_id: '',
    totalTasks: 0,
    totalOpportunities: 0,
    totalSegmentsMatching: 0,
    totalLabelMatching: 0,
    totalDefects: 0,
    overallReliabilityScore: 0,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  };

  // Excel upload form
  excelUploadForm = {
    processname: '',
    job_id: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  };
  selectedExcelFile: File | null = null;
  excelPreviewData: any[] = [];

  availableTeamMembers: any[] = [];
  isLoadingTeamMembers = false;
  availableProcesses: Process[] = [];
  loading = false;
  isUploadingExcel = false;
  error = '';
  successMessage = '';

  monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  yearOptions: number[] = [];

  constructor(
    private reliabilityService: ReliabilityService,
    private teamMemberService: TeamMemberService,
    private router: Router,
    private authService: AuthService,
    private excelUploadService: ExcelUploadService,
    private processService: ProcessService
  ) {
    this.checkManagerAccess();
    this.generateYearOptions();
  }

  ngOnInit(): void {
    this.loadTeamMembers();
    this.loadProcesses();
  }

  private checkManagerAccess(): void {
    const token = this.authService.getToken();
    let userRole = 'user';
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userRole = payload.role || 'user';
        this.reliabilityForm.managerId = payload.managerId || payload._id || payload.name?.toLowerCase() || '';
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
    
    if (userRole !== 'manager') {
      this.router.navigate(['/reliability']);
    }
  }

  private generateYearOptions(): void {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 2; year <= currentYear + 1; year++) {
      this.yearOptions.push(year);
    }
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

  loadProcesses(): void {
    this.processService.getAllProcesses({ limit: 1000 }).subscribe({
      next: (response) => {
        if (response.status === 'success' && response.data?.processes) {
          this.availableProcesses = response.data.processes;
          // Sort processes by name
          this.availableProcesses.sort((a, b) => a.name.localeCompare(b.name));
        }
      },
      error: (error) => {
        console.error('Error loading processes:', error);
        this.error = 'Failed to load processes. Please try again.';
      }
    });
  }

  getAvailableProcessNames(): string[] {
    return this.availableProcesses.map(p => p.name);
  }

  switchToManualMode() {
    this.uploadMode = 'manual';
    if (this.excelUploadForm.processname) {
      this.reliabilityForm.processname = this.excelUploadForm.processname;
    }
    if (this.excelUploadForm.job_id) {
      this.reliabilityForm.job_id = this.excelUploadForm.job_id;
    }
    this.reliabilityForm.year = this.excelUploadForm.year;
    this.reliabilityForm.month = this.excelUploadForm.month;
  }

  switchToExcelMode() {
    this.uploadMode = 'excel';
    if (this.reliabilityForm.processname) {
      this.excelUploadForm.processname = this.reliabilityForm.processname;
    }
    if (this.reliabilityForm.job_id) {
      this.excelUploadForm.job_id = this.reliabilityForm.job_id;
    }
    if (this.reliabilityForm.year) {
      this.excelUploadForm.year = this.reliabilityForm.year;
    }
    if (this.reliabilityForm.month) {
      this.excelUploadForm.month = this.reliabilityForm.month;
    }
  }

  onDaIdChange(): void {
    const selectedMember = this.availableTeamMembers.find(m => m.da_id === this.reliabilityForm.daId);
    if (selectedMember) {
      this.reliabilityForm.workerId = selectedMember.workerId || '';
    }
  }

  calculateScore(): void {
    if (this.reliabilityForm.totalOpportunities && this.reliabilityForm.totalOpportunities > 0) {
      const segmentAccuracy = this.reliabilityForm.totalSegmentsMatching 
        ? (this.reliabilityForm.totalSegmentsMatching / this.reliabilityForm.totalOpportunities) * 100 
        : 0;
      const labelAccuracy = this.reliabilityForm.totalLabelMatching 
        ? (this.reliabilityForm.totalLabelMatching / this.reliabilityForm.totalOpportunities) * 100 
        : 0;
      const defectRate = this.reliabilityForm.totalDefects 
        ? (this.reliabilityForm.totalDefects / this.reliabilityForm.totalOpportunities) * 100 
        : 0;
      
      const baseScore = (segmentAccuracy + labelAccuracy) / 2;
      this.reliabilityForm.overallReliabilityScore = Math.max(0, Math.min(100, baseScore - defectRate));
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
      'application/vnd.ms-excel.sheet.macroEnabled.12'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      this.error = 'Please select a valid Excel file (.xlsx or .xls)';
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
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          this.error = 'Excel file must contain at least a header row and one data row';
          this.selectedExcelFile = null;
          return;
        }

        // Get original headers (case preserved)
        const originalHeaders = (jsonData[0] as any[]).map((h: any) => String(h || '').trim());
        const headers = originalHeaders.map((h: string) => h.toLowerCase());
        
        const headerMap: any = {};
        headers.forEach((header: string, index: number) => {
          const headerLower = header.toLowerCase();
          if (headerLower.includes('worker id') || headerLower.includes('workerid')) {
            headerMap['workerId'] = index;
          } else if (headerLower.includes('da id') || headerLower.includes('daid')) {
            headerMap['daId'] = index;
          } else if (headerLower.includes('total tasks') || headerLower.includes('totaltasks')) {
            headerMap['totalTasks'] = index;
          } else if (headerLower.includes('total opportunities') || headerLower.includes('totalopportunities')) {
            headerMap['totalOpportunities'] = index;
          } else if (headerLower.includes('total segments matching') || headerLower.includes('totalsegmentsmatching')) {
            headerMap['totalSegmentsMatching'] = index;
          } else if (headerLower.includes('total label matching') || headerLower.includes('totallabelmatching')) {
            headerMap['totalLabelMatching'] = index;
          } else if (headerLower.includes('total defects') || headerLower.includes('totaldefects')) {
            headerMap['totalDefects'] = index;
          } else if (headerLower.includes('overall reliability score') || headerLower.includes('overallreliabilityscore')) {
            headerMap['overallReliabilityScore'] = index;
          }
        });

        const requiredFields = ['workerId', 'daId', 'totalTasks', 'totalOpportunities', 'totalDefects', 'overallReliabilityScore'];
        const missingFields = requiredFields.filter(field => !headerMap[field]);
        
        // If columns don't match, navigate to mapping page
        if (missingFields.length > 0) {
          const expectedColumns = [
            'workerId',
            'daId',
            'totalTasks',
            'totalOpportunities',
            'totalSegmentsMatching',
            'totalLabelMatching',
            'totalDefects',
            'overallReliabilityScore'
          ];

          const uploadData: ExcelUploadData = {
            file: file,
            rawData: jsonData as any[][],
            headers: originalHeaders,
            expectedColumns: expectedColumns,
            uploadType: 'reliability',
            metadata: {
              processname: this.excelUploadForm.processname,
              job_id: this.excelUploadForm.job_id,
              year: this.excelUploadForm.year,
              month: this.excelUploadForm.month
            }
          };

          this.excelUploadService.setUploadData(uploadData);
          this.router.navigate(['/reliability/excel-upload']);
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
            
            if (key === 'workerId' || key === 'daId') {
              rowData[key] = String(value || '').trim();
            } else if (key.includes('Score')) {
              // Handle percentage scores - Excel stores percentages as decimals (100% = 1.0)
              if (typeof value === 'string') {
                value = value.replace(/[%\s,]/g, ''); // Remove %, spaces, and commas
              }
              let numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                // If value is <= 1, it might be a decimal percentage (1.0 = 100%), so multiply by 100
                // But also check if it's already > 1 (like 100.0), then use as-is
                if (numValue > 0 && numValue <= 1) {
                  numValue = numValue * 100;
                }
                rowData[key] = numValue;
              } else {
                rowData[key] = 0;
              }
            } else if (key.includes('total') || key.includes('Matching')) {
              if (typeof value === 'string') {
                value = value.replace(/[%\s,]/g, '');
              }
              const numValue = parseFloat(value);
              rowData[key] = isNaN(numValue) ? 0 : numValue;
            } else {
              rowData[key] = value;
            }
          });

          // Apply final conversion for overallReliabilityScore to ensure it's correct
          if (rowData.overallReliabilityScore !== undefined) {
            let score = Number(rowData.overallReliabilityScore);
            // Convert 1.0 to 100 (Excel percentage format), and values between 0 and 1
            if (score > 0 && score <= 1) {
              score = score * 100;
              rowData.overallReliabilityScore = score;
            }
          }

          if (rowData.workerId && rowData.daId && rowData.totalTasks !== undefined && rowData.totalOpportunities !== undefined) {
            parsedData.push(rowData);
          }
        }

        if (parsedData.length === 0) {
          this.error = 'No valid data rows found in Excel file';
          this.selectedExcelFile = null;
          return;
        }

        this.excelPreviewData = parsedData.slice(0, 5);
      } catch (error: any) {
        console.error('Error parsing Excel file:', error);
        this.error = `Error parsing Excel file: ${error.message || 'Invalid file format'}`;
        this.selectedExcelFile = null;
      }
    };

    reader.onerror = () => {
      this.error = 'Error reading Excel file';
      this.selectedExcelFile = null;
    };

    reader.readAsArrayBuffer(file);
  }

  uploadExcelBulkData() {
    if (!this.selectedExcelFile) {
      this.error = 'Please select an Excel file';
      return;
    }

    if (!this.excelUploadForm.processname || !this.excelUploadForm.job_id) {
      this.error = 'Please fill in Process Name and Job ID';
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const headers = (jsonData[0] as any[]).map((h: any) => String(h || '').trim().toLowerCase());
        
        const headerMap: any = {};
        headers.forEach((header: string, index: number) => {
          const headerLower = header.toLowerCase();
          if (headerLower.includes('worker id') || headerLower.includes('workerid')) {
            headerMap['workerId'] = index;
          } else if (headerLower.includes('da id') || headerLower.includes('daid')) {
            headerMap['daId'] = index;
          } else if (headerLower.includes('total tasks') || headerLower.includes('totaltasks')) {
            headerMap['totalTasks'] = index;
          } else if (headerLower.includes('total opportunities') || headerLower.includes('totalopportunities')) {
            headerMap['totalOpportunities'] = index;
          } else if (headerLower.includes('total segments matching') || headerLower.includes('totalsegmentsmatching')) {
            headerMap['totalSegmentsMatching'] = index;
          } else if (headerLower.includes('total label matching') || headerLower.includes('totallabelmatching')) {
            headerMap['totalLabelMatching'] = index;
          } else if (headerLower.includes('total defects') || headerLower.includes('totaldefects')) {
            headerMap['totalDefects'] = index;
          } else if (headerLower.includes('overall reliability score') || headerLower.includes('overallreliabilityscore')) {
            headerMap['overallReliabilityScore'] = index;
          }
        });

        const allData: any[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;
          
          const hasData = row.some((cell: any) => cell !== null && cell !== undefined && cell !== '');
          if (!hasData) continue;

          const rowData: any = {
            processname: this.excelUploadForm.processname,
            job_id: this.excelUploadForm.job_id,
            year: this.excelUploadForm.year,
            month: this.excelUploadForm.month
          };
          
          Object.keys(headerMap).forEach(key => {
            const colIndex = headerMap[key];
            let value = row[colIndex];
            
            if (key === 'workerId' || key === 'daId') {
              rowData[key] = String(value || '').trim();
            } else if (key.includes('Score')) {
              // Handle percentage scores - Excel stores percentages as decimals (100% = 1.0)
              if (typeof value === 'string') {
                value = value.replace(/[%\s,]/g, ''); // Remove %, spaces, and commas
              }
              let numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                // If value is <= 1, it might be a decimal percentage (1.0 = 100%), so multiply by 100
                // But also check if it's already > 1 (like 100.0), then use as-is
                if (numValue > 0 && numValue <= 1) {
                  numValue = numValue * 100;
                }
                rowData[key] = numValue;
              } else {
                rowData[key] = 0;
              }
            } else if (key.includes('total') || key.includes('Matching')) {
              if (typeof value === 'string') {
                value = value.replace(/[%\s,]/g, '');
              }
              const numValue = parseFloat(value);
              rowData[key] = isNaN(numValue) ? 0 : numValue;
            } else {
              rowData[key] = value;
            }
          });

          if (rowData.workerId && rowData.daId && rowData.totalTasks !== undefined && rowData.totalOpportunities !== undefined) {
            allData.push(rowData);
          }
        }

        if (allData.length === 0) {
          this.error = 'No valid data to upload';
          return;
        }

        this.isUploadingExcel = true;
        this.error = '';
        
        this.reliabilityService.bulkCreateReliabilityData(allData).subscribe({
          next: (response) => {
            this.isUploadingExcel = false;
            if (response.status === 'success') {
              this.successMessage = `Successfully uploaded ${allData.length} records`;
              setTimeout(() => {
                this.router.navigate(['/reliability']);
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
                this.router.navigate(['/reliability']);
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
        this.error = `Error processing Excel file: ${error.message}`;
      }
    };

    reader.readAsArrayBuffer(this.selectedExcelFile);
  }

  createReliability(): void {
    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.reliabilityService.createReliabilityData(this.reliabilityForm as Omit<ReliabilityData, '_id' | 'createdAt' | 'updatedAt'>).subscribe({
      next: (response) => {
        this.router.navigate(['/reliability']);
      },
      error: (error) => {
        console.error('Error creating reliability data:', error);
        this.error = error.error?.message || 'Failed to create reliability data. Please try again.';
        this.loading = false;
      }
    });
  }

  private validateForm(): boolean {
    if (!this.reliabilityForm.workerId || !this.reliabilityForm.daId || !this.reliabilityForm.processname || !this.reliabilityForm.job_id) {
      this.error = 'Please fill in all required fields';
      return false;
    }

    if (this.availableTeamMembers.length > 0 && !this.availableTeamMembers.find(m => m.da_id === this.reliabilityForm.daId)) {
      this.error = 'Please select a valid DA ID from the dropdown';
      return false;
    }

    if (this.reliabilityForm.totalOpportunities === 0) {
      this.error = 'Total opportunities must be greater than 0';
      return false;
    }

    if ((this.reliabilityForm.overallReliabilityScore || 0) < 0 || (this.reliabilityForm.overallReliabilityScore || 0) > 100) {
      this.error = 'Overall reliability score must be between 0 and 100';
      return false;
    }

    return true;
  }

  cancel(): void {
    this.router.navigate(['/reliability']);
  }
}
