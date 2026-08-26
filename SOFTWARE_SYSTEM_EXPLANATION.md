Software System Explanation – Smartboard OPS Management
=======================================================

This document explains the software architecture and functionality required to implement the Smartboard OPS Management System, referencing the database schema previously designed. The system is a web‑based application with role‑based access control, designed to be used by administrators, managers, and technicians in a smartboard import and distribution company.

1\. Technology Stack (Suggested)
--------------------------------

*   **Backend**: PHP (Laravel), Python (Django/Flask), or Node.js (Express) – any modern framework with MVC and ORM support.
    
*   **Frontend**: HTML, CSS, JavaScript (React/Vue/Angular optional) – responsive UI for desktop and barcode scanners.
    
*   **Database**: MySQL 8+ (InnoDB) with triggers and stored procedures as defined.
    
*   **Authentication**: Session‑based or JWT, with role checks.
    
*   **Barcode Integration**: Use USB barcode scanners that emulate keyboard input; no special hardware drivers needed.
    

2\. System Modules
------------------

### 2.1 Authentication & User Management

*   **Purpose**: Login, logout, password management, user CRUD (admin only).
    
*   **Database Tables**: users
    
*   **Roles**: admin, manager, technician
    
    *   **Admin**: Manage users, system configuration (catalogs), view all data, generate reports.
        
    *   **Manager**: Create/edit jobs, clients, view inventory and reports; cannot manage users or catalogs.
        
    *   **Technician**: Execute assemblies, scan components, update job/assembly statuses, perform repairs.
        
*   **Implementation**: Middleware checks role before allowing access to routes/controllers. Session stores user ID and role.
    

### 2.2 System Configuration (Catalogs)

*   **Purpose**: Maintain lists for dropdown selections and standardisation.
    
*   **Database Tables**:
    
    *   smartboard\_models
        
    *   ops\_models
        
    *   ram\_specs
        
    *   storage\_specs
        
    *   network\_card\_models
        
    *   main\_software\_catalog
        
    *   additional\_software\_catalog
        
*   **Functionality**: CRUD for each catalog; only admins can modify. Managers and technicians can view.
    
*   **UI**: Simple forms with validation (e.g., unique names, required fields).
    

### 2.3 Client & Location Management

*   **Purpose**: Manage clients and their districts/provinces.
    
*   **Database Tables**: provinces, districts, clients
    
*   **Functionality**:
    
    *   Pre‑populate provinces and districts (admin).
        
    *   Add/edit clients with name, address, district (dropdown from districts), contact info.
        
    *   When creating a job, the client’s district is automatically used; no separate province selection needed (derived via join).
        

### 2.4 Inventory Management

*   **Purpose**: Track all physical components: OPS, RAM, storage, network cards.
    
*   **Database Tables**:
    
    *   inventory\_ops, inventory\_rams, inventory\_storage, inventory\_network\_cards
        
    *   inventory\_batches (for batch imports)
        
*   **Functionality**:
    
    *   Add single items via form with barcode scan (serial number) and selection of spec/model from catalogs.
        
    *   Add batch: create a batch record, then add multiple items with arbitrary serials (manual or upload CSV/list).
        
    *   View inventory with filters (status, type, spec, batch).
        
    *   Update status manually (e.g., mark faulty, retire).
        
    *   Statuses automatically updated via triggers when items are assigned/unassigned during assembly or replacement.
        
*   **UI**: Tables with search and filter; barcode input focus for quick scanning.
    

### 2.5 Main Software Key Management

*   **Purpose**: Track purchased license keys for main software (Windows, Office, IQ, Antivirus).
    
*   **Database Tables**: main\_software\_catalog, main\_software\_keys
    
*   **Functionality**:
    
    *   Add new key: select software from catalog, enter license key, license type (lifetime/subscription), dates if subscription.
        
    *   View keys with filters by type, status, expiry.
        
    *   Status auto‑updated when assigned or replaced.
        
    *   No pre‑owned keys; keys are added when purchased.
        
*   **UI**: Simple form and list.
    

### 2.6 Job Management

*   **Purpose**: Define client requirements before assembly.
    
*   **Database Tables**:
    
    *   jobs, job\_storage\_requirements, job\_main\_software\_requirements, job\_additional\_software
        
*   **Functionality** (Manager only):
    
    *   Create job: select client (auto‑fills district), smartboard model & count, OPS model, RAM DDR version and total capacity (e.g., DDR4 16GB), storage requirements (add multiple roles: primary, secondary, tertiary, additional each with a spec from storage\_specs), main software requirements (optional, many), additional software (optional, many).
        
    *   Job number auto‑generated (e.g., JOB-2025-0001).
        
    *   Edit job before assembly starts; cannot edit after assembly begins.
        
    *   View jobs with status, filter by client/date/status.
        
*   **UI**: Multi‑step form with dynamic rows for storage and software.
    

### 2.7 Assembly Wizard

*   **Purpose**: Step‑by‑step guided process for technician to assemble an OPS unit.
    
*   **Database Tables**:
    
    *   assembled\_units, assembly\_rams, assembly\_storage, assembly\_main\_software, assembly\_additional\_software
        
*   **Workflow**:
    
    1.  Technician selects a job (status created → becomes assembly\_in\_progress).
        
    2.  Creates a new assembled\_unit (one per OPS; if job has multiple smartboards, multiple units are created).
        
    3.  Step 1: Scan/select OPS serial (inventory\_ops) – system checks status in\_stock.
        
    4.  Step 2: Add RAM modules (scan serials). Total capacity must meet or exceed job’s ram\_capacity\_gb. The sum of DDR versions must match ram\_ddr\_version. Multiple modules allowed.
        
    5.  Step 3: Add storage devices (scan serials) and assign each a role matching the job’s job\_storage\_requirements. At least one primary is required if specified.
        
    6.  Step 4: Optional Wi‑Fi card – if job requires (or if technician decides) scan/select from inventory\_network\_cards.
        
    7.  Step 5: Main software – for each required software in job\_main\_software\_requirements, select an available key from main\_software\_keys (status purchased). The system creates assembly\_main\_software row with is\_active=1.
        
    8.  Step 6: Additional software – check boxes from additional\_software\_catalog as per job (or manually add if not in job but needed).
        
    9.  Final: Notes, complete assembly. assembled\_unit.status changes to assembled, timestamps set.
        
*   **Validation**: All required components must be selected; inventory items must be in\_stock; software keys must be available.
    
*   **Triggers** automatically update inventory statuses to assigned.
    
*   **UI**: Wizard with progress indicator, barcode scan fields with auto‑focus.
    

### 2.8 Delivery & Status Updates

*   **Purpose**: Track unit from assembled to delivered.
    
*   **Database Tables**: assembled\_units (status and timestamp fields).
    
*   **Functionality**: Manager or technician updates status: assembled → ready\_for\_delivery → delivered. Timestamps recorded.
    
*   **UI**: Simple buttons or status dropdown.
    

### 2.9 Repair & Replacement

*   **Purpose**: Handle faulty units, component swaps, and backup OPS.
    
*   **Database Tables**:
    
    *   repair\_jobs, repair\_component\_replacements, ops\_replacements
        
    *   Also updates assembled\_units, assembly\_main\_software (if software replaced)
        
*   **Functionality**:
    
    *   Create repair job for an assembled unit: record issue, assign technician, status open.
        
    *   During repair, technician can replace components: scan old and new serials (or select from inventory). Logged in repair\_component\_replacements.
        
        *   Supported component types: ops, ram, storage, wifi\_card, software\_key.
            
        *   For software key replacement: old key is deactivated (is\_active=0, unassigned\_at set) in assembly\_main\_software, new active row created; also logged in replacements.
            
    *   Triggers update old item status to faulty (or revoked for keys) and new item to assigned.
        
    *   Backup OPS assignment: ops\_replacements records temporary/permanent replacement of entire OPS unit.
        
*   **UI**: Repair job form, component replacement form with barcode scanning, list of open repairs.
    

### 2.10 Reporting & Dashboards

*   **Purpose**: Summaries by date, client, province, technician, status, inventory levels, software usage.
    
*   **Database Tables**: All, using joins and aggregate queries.
    
*   **Examples**:
    
    *   Jobs by month, province, client.
        
    *   Assembled units by technician and status.
        
    *   Inventory stock levels (count of in\_stock items by type).
        
    *   Software keys usage and expiry.
        
    *   Repair statistics.
        
*   **UI**: Dashboard with charts (using Chart.js or similar) and exportable tables (CSV/PDF).
    

### 2.11 Audit Log

*   **Purpose**: Track all significant user actions.
    
*   **Database Table**: audit\_logs
    
*   **Functionality**: Automatically insert record on:
    
    *   User login/logout (optional)
        
    *   Create/update/delete of jobs, clients, inventory, keys
        
    *   Assembly start/complete
        
    *   Repair actions
        
    *   Status changes
        
*   **UI**: Admin can view filtered logs.
    

3\. Role‑Based Access Control Implementation
--------------------------------------------

*   Each HTTP request is authenticated and authorised based on the user’s role stored in the session/JWT.
    
*   Middleware functions:
    
    *   auth – ensure user is logged in.
        
    *   adminOnly, managerOnly, technicianOnly – restrict access.
        
*   UI hides or disables buttons based on role.
    
*   Database does not enforce row‑level security; application logic does.
    

4\. Typical Workflows
---------------------

### 4.1 Manager Creates Job

1.  Log in as manager.
    
2.  Navigate to “Jobs” → “Create Job”.
    
3.  Select client (or create new), smartboard model, count.
    
4.  Select OPS model, RAM DDR version and total capacity.
    
5.  Add storage requirements: e.g., primary: 256GB NVMe SSD; secondary: 1TB HDD. (Each from dropdown of storage\_specs).
    
6.  Select main software: Windows 11 Pro (catalog), Office 2021, IQ 6.0, Antivirus. (Optional)
    
7.  Select additional software: Chrome, VLC. (Optional)
    
8.  Submit → job created with status created.
    

### 4.2 Technician Assembles Unit

1.  Log in as technician.
    
2.  Open job from list (status created), click “Start Assembly” → job status becomes assembly\_in\_progress.
    
3.  Create new assembled unit (if job has multiple units, repeat for each).
    
4.  Step 1: Scan OPS serial (or select from available inventory). System validates model matches job’s OPS model.
    
5.  Step 2: Add RAM: scan serial of 8GB DDR4 module; if job requires 16GB, add second 8GB. System shows total capacity. When total >= required, allow next step.
    
6.  Step 3: Add storage: scan primary SSD, assign role primary. Scan HDD, assign role secondary. Ensure roles match job requirements.
    
7.  Step 4: Wi‑Fi – optional; scan if needed.
    
8.  Step 5: Main software: for Windows, select an available Windows key; for Office, select key; etc. System creates active software assignment.
    
9.  Step 6: Additional software – check boxes based on job (pre‑checked).
    
10.  Add notes, complete assembly. Status set to assembled.
    

### 4.3 Repair

1.  Client reports faulty unit.
    
2.  Manager/technician creates repair job with issue description, linking to the assembled unit.
    
3.  Technician opens repair, diagnoses.
    
4.  If RAM faulty: in replacement form, select component type ram, scan old RAM serial (or select from unit’s assigned RAM), scan new RAM serial (must be in\_stock). Submit.
    
5.  Trigger updates old RAM status to faulty, new to assigned. Log entry in repair\_component\_replacements.
    
6.  If software key needs replacement (e.g., Windows key revoked), technician deactivates old key in assembly\_main\_software and assigns new key; also logs replacement.
    
7.  Repair status updated to completed.
    

5\. Barcode Scanner Integration
-------------------------------

*   Barcode scanners act as keyboard input; when a text field is focused, scanning a barcode types the serial and presses Enter.
    
*   For assembly steps, the UI automatically focuses the next input field after a scan, allowing rapid serial entry without mouse.
    
*   Batch import: user can scan multiple serials into a text area, one per line, or upload a CSV file.
    

6\. Error Handling & Validation
-------------------------------

*   All forms validate required fields, foreign key existence, and business rules (e.g., inventory must be in\_stock, software key must be available).
    
*   Database constraints (foreign keys, unique indexes) provide an additional layer of protection.
    
*   Triggers maintain consistent statuses; application should also handle exceptions gracefully.
    

7\. Conclusion
--------------

The software is a modular web application that maps directly to the normalised database schema. It provides an intuitive interface for managers to specify requirements, technicians to assemble using barcode scanning, and administrators to oversee the entire operation. Role‑based access, audit logging, and automated status updates ensure data integrity and accountability. This design is ready for implementation using any modern web framework.