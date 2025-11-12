import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuditDocService, AuditDoc } from '../services/audit-doc.service';
import { AuthService } from '../services/auth.service';
import { ProcessService, Process } from '../services/process.service';

@Component({
  selector: 'app-audit-doc-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-doc-create.html',
  styleUrls: ['./audit-doc-create.css']
})
export class AuditDocCreateComponent implements OnInit {
  isEditMode = false;
  editingId = '';
  loading = false;
  error = '';
  successMessage = '';

  auditDocForm = {
    file: null as File | null,
    date: new Date().toISOString().split('T')[0],
    process: '',
    job_id: ''
  };

  selectedFile: File | null = null;
  existingAuditDoc: AuditDoc | null = null;
  availableProcesses: Process[] = [];

  constructor(
    private auditDocService: AuditDocService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private processService: ProcessService
  ) {}

  ngOnInit() {
    // Load available processes
    this.loadProcesses();
    
    // Check for process and job_id query parameters
    this.route.queryParams.subscribe(queryParams => {
      if (queryParams['process']) {
        this.auditDocForm.process = queryParams['process'];
      }
      if (queryParams['job_id']) {
        this.auditDocForm.job_id = queryParams['job_id'];
      }
    });
    
    // Check if we're in edit mode
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.editingId = params['id'];
        this.loadAuditDoc();
      }
    });
  }

  loadProcesses() {
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
      }
    });
  }

  loadAuditDoc() {
    this.loading = true;
    this.error = '';

    this.auditDocService.getAuditDoc(this.editingId).subscribe({
      next: (response) => {
        if (response.status === 'success' && response.data?.auditDoc) {
          this.existingAuditDoc = response.data.auditDoc;
          this.auditDocForm.date = new Date(response.data.auditDoc.date).toISOString().split('T')[0];
          this.auditDocForm.process = response.data.auditDoc.process || '';
          this.auditDocForm.job_id = response.data.auditDoc.job_id || '';
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading audit doc:', error);
        this.error = 'Failed to load audit document';
        this.loading = false;
      }
    });
  }

  onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedFile = target.files[0];
      this.auditDocForm.file = this.selectedFile;
    }
  }

  saveAuditDoc() {
    if (this.isEditMode) {
      // For edit mode, file is optional
      if (!this.auditDocForm.date) {
        this.error = 'Date is required';
        return;
      }
    } else {
      // For create mode, file is required
      if (!this.auditDocForm.file || !this.auditDocForm.date) {
        this.error = 'Please select a document file and date';
        return;
      }
    }

    if (this.loading) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.successMessage = '';

    const operation = this.isEditMode
      ? this.auditDocService.updateAuditDoc(
          this.editingId,
          this.auditDocForm.file,
          this.auditDocForm.date,
          this.auditDocForm.process || undefined,
          this.auditDocForm.job_id || undefined
        )
      : this.auditDocService.createAuditDoc(
          this.auditDocForm.file!,
          this.auditDocForm.date,
          this.auditDocForm.process || undefined,
          this.auditDocForm.job_id || undefined
        );

    operation.subscribe({
      next: (response) => {
        this.loading = false;
        if (response.status === 'success') {
          this.successMessage = this.isEditMode
            ? 'Audit document updated successfully'
            : 'Audit document created successfully';
          setTimeout(() => {
            // Navigate back to reliability page
            // If process is set, pass it as query param to show that process's audit docs
            const queryParams: any = {};
            if (this.auditDocForm.process) {
              queryParams.process = this.auditDocForm.process;
              queryParams.showAudit = 'true';
            }
            this.router.navigate(['/reliability'], { queryParams });
          }, 1000);
        } else {
          this.error = response.message || 'Operation failed';
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error saving audit doc:', error);
        this.error = error.error?.message || error.error?.details || 'Failed to save audit document';
      }
    });
  }

  cancel() {
    // Navigate back to reliability page
    // If process is set, pass it as query param to show that process's audit docs
    const queryParams: any = {};
    if (this.auditDocForm.process) {
      queryParams.process = this.auditDocForm.process;
      queryParams.showAudit = 'true';
    }
    this.router.navigate(['/reliability'], { queryParams });
  }
}

