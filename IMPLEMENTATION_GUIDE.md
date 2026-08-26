Implementation Guide for Smartboard OPS Management System
=========================================================

This guide provides a structured approach to implementing the Smartboard OPS Management System based on the previously defined MySQL schema and requirements. It is intended for development teams or AI assistants (e.g., Claude) to build the system step by step.

1\. System Overview
-------------------

The system manages inventory, assembly, and repair of OPS units for smartboards. It supports role-based access (Admin, Manager, Technician), client/job management, inventory tracking, software key management, assembly wizard, and repair workflows. All actions are logged for auditability.

2\. Recommended Technology Stack
--------------------------------

*   **Backend Framework**: Laravel (PHP) or Django (Python) – both provide robust ORM, authentication, middleware, and routing.
    
*   **Frontend**: Blade (Laravel) or Jinja templates with Bootstrap, plus JavaScript (jQuery/Vue/React) for dynamic wizard and barcode handling.
    
*   **Database**: MySQL 8+ with InnoDB.
    
*   **Authentication**: Session-based using built-in auth (Laravel) or Django authentication.
    
*   **Barcode Input**: Standard keyboard‑emulating USB scanners; no special driver required.
    
*   **Additional Libraries**: Chart.js for dashboards, Maatwebsite/Laravel Excel or Django CSV for exports.
    

3\. Project Setup
-----------------

### 3.1 Database Creation

Run the provided SQL schema script to create the database and all tables, triggers, and indexes. The script is fully self-contained. Use a migration tool if preferred.

### 3.2 Backend Setup

1.  Initialize a new project (e.g., composer create-project laravel/laravel smartboard-ops or django-admin startproject smartboard\_ops).
    
2.  Configure database connection in .env.
    
3.  Create models for all tables. In Laravel, use Eloquent; in Django, define models and run migrations.
    
4.  Implement authentication scaffolding (Laravel ui or breeze; Django built-in auth).
    

4\. Database Implementation Notes
---------------------------------

*   The schema already includes triggers for automatic status updates. Ensure your database user has TRIGGER privileges.
    
*   All foreign keys are enforced; ensure cascading rules are set as per schema (e.g., ON DELETE CASCADE for junction tables).
    
*   Use unique indexes to prevent duplicate serials and keys.
    
*   The audit\_logs table is populated manually in application code; no trigger needed.
    

5\. Backend Development
-----------------------

### 5.1 Authentication & Authorization

*   Use middleware to protect routes:
    
    *   auth – requires login.
        
    *   role:admin – only admin.
        
    *   role:manager – manager or admin.
        
    *   role:technician – technician or admin.
        
*   Store user role in session/token. Use Laravel Gates/Policies or Django permissions.
    

### 5.2 Models & Relationships

Define Eloquent/Django models matching the tables. Pay attention to relationships:

*   Province has many District.
    
*   District has many Client.
    
*   Client has many Job.
    
*   Job belongs to Client, SmartboardModel, OpsModel, etc.
    
*   Job has many JobStorageRequirement, JobMainSoftwareRequirement, JobAdditionalSoftware.
    
*   AssembledUnit belongs to Job, InventoryOps, optional InventoryNetworkCard, User (technician).
    
*   AssembledUnit has many AssemblyRam, AssemblyStorage, AssemblyMainSoftware, AssemblyAdditionalSoftware.
    
*   AssemblyMainSoftware has a MainSoftwareKey and MainSoftwareCatalog.
    

### 5.3 Controllers / Views

Create controllers for each module:

*   **AuthController** – login, logout.
    
*   **UserController** (admin only) – CRUD users.
    
*   **CatalogControllers** – for smartboard models, ops models, ram specs, storage specs, network card models, main software catalog, additional software catalog.
    
*   **ClientController** – CRUD clients.
    
*   **InventoryControllers** – for each inventory type; batch import endpoints.
    
*   **SoftwareKeyController** – CRUD main software keys.
    
*   **JobController** – create/edit/view jobs, manage storage and software requirements.
    
*   **AssemblyController** – start assembly, wizard steps, save components, complete.
    
*   **RepairController** – create repair jobs, log replacements.
    
*   **ReportController** – generate summaries and exports.
    
*   **AuditLogController** – view logs (admin).
    

### 5.4 Business Logic

#### Job Creation

*   Validate that RAM total capacity and DDR version are provided.
    
*   For storage requirements, ensure roles are unique per job.
    
*   Software selections are optional but if selected must exist in catalog.
    

#### Assembly

*   On start, change job status to assembly\_in\_progress.
    
*   Create new AssembledUnit with ops\_inventory\_id selected (must be in\_stock and match job's ops\_model\_id).
    
*   Step 1 (OPS): scan/select OPS serial; set ops\_inventory\_id. Update OPS status to assigned (trigger handles this).
    
*   Step 2 (RAM): Add multiple RAM modules. Validate each module's ram\_spec\_id matches job's DDR version. Check total capacity >= job requirement. Use assembly\_rams table.
    
*   Step 3 (Storage): For each required storage role in job\_storage\_requirements, select a storage inventory item matching spec. Insert into assembly\_storage with role. Ensure no duplicate roles; optionally allow additional roles not in job.
    
*   Step 4 (Wi-Fi): If job/technician decides, select a network card from inventory (optional). Set wifi\_card\_inventory\_id.
    
*   Step 5 (Main Software): For each job\_main\_software\_requirements, find an available key (main\_software\_keys with software\_catalog\_id matching and status purchased). Create assembly\_main\_software row with is\_active=1. Update key status to assigned (trigger).
    
*   Step 6 (Additional Software): For each job\_additional\_software entry, create assembly\_additional\_software. Also allow technician to add extra software from catalog if needed.
    
*   Finalize: set assembled\_unit.status = 'assembled', set timestamps. Job status can remain assembly\_in\_progress until all units done, then ready\_for\_delivery.
    

#### Status Transitions

*   assembly\_in\_progress → assembled → ready\_for\_delivery → delivered.
    
*   delivered unit can go to in\_repair, then returned or retired.
    
*   ops\_replacements handles backup OPS assignment.
    

#### Repair

*   Create repair\_job with assembled\_unit\_id, issue, technician.
    
*   When replacing component:
    
    *   Insert into repair\_component\_replacements with component\_type and old/new IDs.
        
    *   For hardware: the trigger updates old item status to faulty, new to assigned.
        
    *   For software key: manually update assembly\_main\_software: deactivate old record (is\_active=0, unassigned\_at=NOW()), create new active record with new key. Also insert into replacements.
        
*   Update assembled\_unit.status if needed.
    

### 5.5 Audit Logging

*   Create a helper function logAction($user, $action, $entityType, $entityId, $details, $ip).
    
*   Call it in controllers after significant actions: user login/logout, job creation/update, assembly steps, inventory changes, software key assignments, repairs, status changes.
    
*   Use request()->ip() or similar.
    

### 5.6 API Endpoints (if using SPA)

If building a REST API, map the above controllers to endpoints. For traditional server-rendered app, use routes and views.

6\. Frontend Development
------------------------

### 6.1 Layout & Navigation

*   Master layout with navigation menu based on user role.
    
*   Use Bootstrap for responsive design.
    

### 6.2 Key Screens

#### Dashboard

*   Show summary cards: pending jobs, in-progress assemblies, ready for delivery, inventory low stock, software keys expiring soon.
    
*   Use Chart.js for charts (optional).
    

#### Job Management

*   List jobs with filters (status, client, date).
    
*   Create/Edit job form:
    
    *   Client dropdown (with district auto-filled).
        
    *   Smartboard model, count.
        
    *   OPS model dropdown.
        
    *   RAM DDR version and total capacity.
        
    *   Storage requirements: dynamic row adder (role dropdown, spec dropdown).
        
    *   Main software requirements: multi-select from catalog.
        
    *   Additional software: multi-select from catalog.
        
*   After creation, job appears in technician queue.
    

#### Inventory Management

*   Tabs for each inventory type (OPS, RAM, Storage, Network Cards).
    
*   Table with search/filter by status, spec, batch.
    
*   Add single item form: serial number, spec/model selection, brand, notes.
    
*   Batch import: upload CSV or text area with serials; select batch type; system creates batch and items.
    

#### Software Keys

*   List keys with filters.
    
*   Add key form: software catalog dropdown, license key, license type, dates if subscription.
    

#### Assembly Wizard

*   Step-by-step wizard for technician.
    
*   Use JavaScript to handle barcode focus and validation.
    
*   Show job requirements summary.
    
*   Step 1: OPS scan – input field for serial, button to verify and add.
    
*   Step 2: RAM – list of added RAM modules, total capacity indicator; add via scan.
    
*   Step 3: Storage – for each required role, an input and role indicator; add device.
    
*   Step 4: Wi-Fi – optional scan.
    
*   Step 5: Main Software – for each required software, a dropdown of available keys.
    
*   Step 6: Additional Software – checkboxes pre-filled from job.
    
*   Final step: notes, complete button.
    

#### Repair

*   List repair jobs.
    
*   Create repair job form (select assembled unit, issue).
    
*   Repair details page: show components, replacement form with old/new serial scan and component type.
    

#### Reports

*   Forms to select date range, client, province, technician.
    
*   Output tables and export CSV.
    

### 6.3 Barcode Integration

*   Use autofocus on current input; after scan (which sends Enter key), JavaScript moves focus to next input.
    
*   For batch import, allow scanning multiple serials separated by newline.
    

### 6.4 Role-based UI

*   In Blade/Django templates, wrap admin-only sections with @if(auth()->user()->role == 'admin') or equivalent.
    
*   Hide/disable buttons for non-authorized roles.
    

7\. Integration & Testing
-------------------------

### 7.1 Unit Tests

*   Test model relationships.
    
*   Test business logic: assembly total RAM validation, storage role uniqueness, software key assignment.
    
*   Test triggers: verify status changes after insert/delete/replacement.
    

### 7.2 Integration Tests

*   Simulate full workflow: create job → assemble → deliver → repair.
    
*   Test role restrictions (e.g., technician cannot create job).
    
*   Test barcode scan flow manually with USB scanner.
    

### 7.3 User Acceptance Testing

*   Use sample data for provinces/districts/clients.
    
*   Test with actual scanner and multiple roles.
    

8\. Deployment
--------------

### 8.1 Environment Setup

*   Use a web server (Apache/Nginx) with PHP-FPM or a WSGI server (Gunicorn) for Django.
    
*   Configure .env for production database credentials.
    
*   Set APP\_ENV=production, APP\_DEBUG=false.
    

### 8.2 Database Migration

*   Run schema script on production MySQL server.
    
*   Ensure TRIGGER privileges are granted.
    

### 8.3 SSL & Security

*   Use HTTPS.
    
*   Set secure cookie flags.
    
*   Implement rate limiting on login.
    

### 8.4 Backup

*   Regular database backups.
    

9\. Additional Notes
--------------------

*   The database triggers handle status updates automatically, but the application should also be prepared to handle any trigger failures (e.g., wrap in transactions).
    
*   The audit\_logs table is essential for compliance; ensure all key actions are logged.
    
*   The system can be extended to support notifications (email/SMS) for job status changes.
    
*   For large deployments, consider pagination and server-side processing for tables.