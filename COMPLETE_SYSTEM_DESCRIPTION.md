\# Complete System Description – Smartboard OPS Assembly & Management System

\## 1. Overview

The system is designed to manage the import, inventory, assembly, and repair of OPS (Open Pluggable Specification) units used in smartboards. It supports the full lifecycle from creating a client job specification, assembling OPS units from inventoried components, delivering to clients, handling repairs and replacements, and tracking all activities through an audit log. The system is role‑based, with three user roles: \*\*Admin\*\*, \*\*Manager\*\*, and \*\*Technician\*\*.

The database is normalised and uses MySQL with InnoDB storage, enforcing referential integrity via foreign keys and automating certain status updates through triggers. It also maintains a complete audit trail of user actions.

\---

\## 2. User Roles & Access Control

\- \*\*Admin\*\* – Full system access: manages users, system configuration (catalogs), and can perform any action.

\- \*\*Manager\*\* – Creates jobs, manages clients, views all inventory/assemblies/repairs, and generates reports.

\- \*\*Technician\*\* – Executes assembly tasks, scans inventory items during assembly, updates assembly statuses, and performs repairs.

Roles are stored as an \`ENUM\` in the \`users\` table. Application‑level logic enforces permissions based on this role.

\---

\## 3. Location Hierarchy

\- \*\*Provinces\*\* – Top‑level administrative regions (e.g., Western, Central).

\- \*\*Districts\*\* – Sub‑divisions of provinces (e.g., Colombo, Kandy). Each district belongs to one province (\`districts.province\_id\`).

\- \*\*Clients\*\* – Organisations or institutes that receive smartboards/OPS units. Each client is linked to a \*\*district\*\* (not directly to a province; province is derived from the district).

When creating a job, the system stores the \`district\_id\` only; the province is always retrieved via join with \`districts\` to ensure consistency with the client’s location.

\---

\## 4. System Configuration (Catalogs)

To support dropdown selections and standardisation, the system includes several \*\*catalog tables\*\*:

| Catalog Table | Purpose |

|---------------|---------|

| \`smartboard\_models\` | List of smartboard models (brand, model name, description). |

| \`ops\_models\` | OPS model specifications, including processor series (\`i\`/\`ultra\`), core (e.g., i5, i7), number of cores, base speed, cache. |

| \`ram\_specs\` | Possible RAM specifications: DDR version + capacity (e.g., DDR4 8GB). |

| \`storage\_specs\` | Possible storage specifications: form factor (M.2, 2.5"), interface (NVMe, SATA), type (SSD/HDD), capacity. |

| \`network\_card\_models\` | Wi‑Fi/network card model names and descriptions. |

| \`main\_software\_catalog\` | Main software types (Windows, Office, IQ Whiteboard, Antivirus) with name and version. |

| \`additional\_software\_catalog\` | Additional (non‑key‑tracked) software packages (e.g., VLC, Chrome) with name and version. |

These catalogs are managed by \*\*Admin\*\* and used by managers/technicians when creating jobs or adding inventory.

\---

\## 5. Inventory Management

Inventory items are physical components that are scanned via barcode (serial number) or entered in batches. All inventory tables share a similar structure, with a \`status\` field to track availability.

\### 5.1 Inventory Tables

| Table | Key Fields | Description |

|-------|------------|-------------|

| \`inventory\_ops\` | \`serial\_number\`, \`motherboard\_serial\`, \`ops\_model\_id\`, \`status\` | OPS units. Both serial numbers are unique because the top‑cover serial can be swapped; motherboard serial ensures actual identity. |

| \`inventory\_rams\` | \`serial\_number\`, \`ram\_spec\_id\`, \`brand\`, \`status\` | RAM modules; linked to a RAM spec (DDR + capacity). |

| \`inventory\_storage\` | \`serial\_number\`, \`storage\_spec\_id\`, \`brand\`, \`status\` | SSD/HDD units; linked to a storage spec (form factor, interface, type, capacity). |

| \`inventory\_network\_cards\` | \`serial\_number\`, \`model\_id\`, \`status\` | Wi‑Fi/network cards; linked to a network card model. |

\### 5.2 Status Values

\- \`in\_stock\` – available for use.

\- \`assigned\` – currently part of an assembled unit.

\- \`faulty\` – defective, not usable.

\- \`retired\` – permanently removed from circulation.

\- \`reserved\` – held for a specific job but not yet assigned.

\### 5.3 Batch Import

The \`inventory\_batches\` table groups items added together (e.g., a batch of RAM with arbitrary serials). Technicians can use barcode scanners or upload lists; the system creates one batch record and many item records.

\---

\## 6. Main Software Keys

The system tracks \*\*license keys for main software\*\* (Windows, Office, IQ Whiteboard, Antivirus). Keys are not pre‑owned; they are purchased as needed and then assigned during assembly or replacement.

\### 6.1 \`main\_software\_keys\` Table

\- Links to \`main\_software\_catalog\` (which software and version).

\- Stores the actual \`license\_key\` (unique).

\- \`license\_type\` – \`lifetime\` or \`subscription\`.

\- For subscriptions: \`subscription\_start\_date\`, \`subscription\_end\_date\`.

\- \`status\` – \`purchased\`, \`assigned\`, \`revoked\`, \`expired\`.

The system ensures that a key can only be assigned to one active assembly at a time.

\---

\## 7. Jobs

A \*\*job\*\* is created by a \*\*Manager\*\*. It defines the client, location, smartboard model & count, OPS model, RAM total requirement, storage requirements (multiple roles), and the required software (main and additional, optional).

\### 7.1 Key Tables for Jobs

\- \*\*\`jobs\`\*\* – Core job data:

\- \`client\_id\`, \`district\_id\`

\- \`smartboard\_model\_id\`, \`smartboard\_count\`

\- \`ops\_model\_id\`

\- \`ram\_ddr\_version\`, \`ram\_capacity\_gb\` – \*\*total RAM required\*\* (e.g., DDR4, 16GB). The technician may use one 16GB module or two 8GB modules.

\- \`status\` – workflow status (\`created\`, \`assembly\_in\_progress\`, etc.).

\- \`created\_by\`, \`created\_at\`.

\- \*\*\`job\_storage\_requirements\`\*\* – Multiple storage slots with roles:

\- Each row links a job to a \`storage\_spec\_id\` and assigns a role (\`primary\`, \`secondary\`, \`tertiary\`, \`additional\`).

\- This allows a job to specify, for example, a 256GB NVMe primary, a 1TB HDD secondary, and an optional tertiary.

\- \*\*\`job\_main\_software\_requirements\`\*\* – Many‑to‑many between jobs and \`main\_software\_catalog\`. Defines which main software packages (and versions) are required, e.g., Windows 11 Pro, Office 2021, IQ 6.0, etc. Optional – a job may have none.

\- \*\*\`job\_additional\_software\`\*\* – Many‑to‑many between jobs and \`additional\_software\_catalog\`. Defines additional software packages to be installed (no license keys).

\*\*Note:\*\* The job’s \`ram\_capacity\_gb\` is the total capacity needed; the technician must ensure the sum of installed RAM modules meets or exceeds this value. The application should enforce this during assembly.

\---

\## 8. Assembly Process

The assembly process is a \*\*step‑by‑step wizard\*\* performed by a Technician. The system creates one \`assembled\_units\` record per OPS.

\### 8.1 \`assembled\_units\` Table

Core fields:

\- \`job\_id\` – links to the job.

\- \`ops\_inventory\_id\` – the OPS serial chosen.

\- \`wifi\_card\_inventory\_id\` – optional (only if a separate Wi‑Fi card is being installed; otherwise null, assuming the OPS has a built‑in card).

\- \`technician\_id\` – the technician performing assembly.

\- \`status\` – tracks assembly lifecycle: \`assembly\_in\_progress\` → \`assembled\` → \`ready\_for\_delivery\` → \`delivered\`, etc.

\- Timestamps for each stage.

\### 8.2 Component Assignment

\- \*\*RAM\*\* – stored in \`assembly\_rams\` (many‑to‑many). The technician can add one or more RAM modules. The total capacity should match or exceed the job’s \`ram\_capacity\_gb\`.

\- \*\*Storage\*\* – stored in \`assembly\_storage\` with a \`role\` (\`primary\`, \`secondary\`, \`tertiary\`, \`additional\`). Multiple storage devices can be added, each with a role matching the job’s storage requirements.

\- \*\*Wi‑Fi Card\*\* – optional foreign key in \`assembled\_units\`; null if not required.

\- \*\*Main Software\*\* – stored in \`assembly\_main\_software\`:

\- Each row links an assembled unit to a \`main\_software\_catalog\` entry and a specific \`main\_software\_keys\` record.

\- \`is\_active\` flag indicates the currently active key. When a key is replaced (e.g., during repair), the old record is set \`is\_active = 0\` and a new active record is created – preserving history.

\- \*\*Additional Software\*\* – stored in \`assembly\_additional\_software\` (many‑to‑many with catalog). No keys, just installation record.

\### 8.3 Automatic Status Updates (Triggers)

The database includes triggers to automatically update inventory and software key statuses:

\- When a RAM module is inserted into \`assembly\_rams\`, its status is set to \`assigned\`.

\- When it is removed, status returns to \`in\_stock\`.

\- Similar triggers exist for storage and main software keys.

\- When a repair component replacement is logged, the old item is set to \`faulty\` (or \`revoked\` for software) and the new item to \`assigned\`.

This ensures data consistency without relying solely on application code.

\---

\## 9. Repairs & Replacements

\### 9.1 Repair Jobs

\`repair\_jobs\` table records a repair request for an existing assembled unit. Fields include:

\- \`assembled\_unit\_id\` – which unit is being repaired.

\- \`client\_id\` – client reporting the issue.

\- \`reported\_issue\` – description of the problem.

\- \`status\` – \`open\`, \`in\_progress\`, \`completed\`, \`closed\`.

\- \`technician\_id\` – assigned technician.

\- Dates and notes.

\### 9.2 Component Replacement Log

\`repair\_component\_replacements\` logs any component swapped during a repair. It supports:

\- \`component\_type\` – \`ops\`, \`ram\`, \`storage\`, \`wifi\_card\`, or \`software\_key\`.

\- \`old\_inventory\_id\` and \`new\_inventory\_id\` – references to the respective inventory/software key tables.

\- \`replacement\_date\`, \`technician\_id\`, notes.

When a software key is replaced, this table also records the change, and the \`assembly\_main\_software\` table is updated to deactivate the old key and activate the new one.

\### 9.3 Backup OPS Assignments

\`ops\_replacements\` table tracks when a temporary or permanent backup OPS is assigned to a client. It records:

\- \`original\_assembled\_unit\_id\` – the original unit that is being replaced.

\- \`replacement\_ops\_inventory\_id\` – the backup OPS.

\- \`status\` – \`assigned\`, \`returned\`, or \`permanent\`.

\- Dates and technician.

This allows the system to handle both temporary loaners and permanent swaps.

\---

\## 10. Audit Log

The \`audit\_logs\` table records all significant user actions for accountability and traceability. Fields:

\- \`user\_id\` – who performed the action.

\- \`action\` – description (e.g., "Created job #123", "Assigned RAM to unit #45").

\- \`entity\_type\` and \`entity\_id\` – reference to the affected record.

\- \`details\` – JSON or text with additional context.

\- \`ip\_address\`, \`created\_at\`.

Application code inserts records into this table on key operations (job creation, assembly updates, inventory changes, etc.). It is not automatically populated by database triggers (though it could be extended).

\---

\## 11. Reporting & Queries

The schema is designed to support common reports:

\- Jobs by client, district, province, date range, status.

\- Assembled units by technician, date, status.

\- Inventory levels by type, status, batch.

\- Software key usage and expiry.

\- Repair history for a unit or client.

Appropriate indexes (e.g., on \`jobs.client\_id\`, \`jobs.district\_id\`, \`assembled\_units.status\`, \`repair\_jobs.status\`) ensure efficient querying.

\---

\## 12. Summary of Workflow

1\. \*\*Admin\*\* configures catalogs (smartboard models, OPS models, RAM/storage specs, software catalogs, network card models).

2\. \*\*Manager\*\* creates a client (linked to a district) if not already exists.

3\. \*\*Manager\*\* creates a job, specifying:

\- Client, smartboard model/count, OPS model.

\- RAM total (DDR + capacity).

\- Storage roles (primary, secondary, etc.).

\- Required main software (optional) and additional software (optional).

4\. \*\*Technician\*\* adds inventory items (OPS, RAM, storage, network cards) via barcode scan or list, grouping them into batches.

5\. \*\*Technician\*\* starts assembly for a job:

\- Selects an OPS by scanning its serial.

\- Adds RAM module(s) (total must match job requirement).

\- Adds storage device(s) with correct roles.

\- Optionally selects a Wi‑Fi card.

\- Selects main software keys (purchased or available) for each required software.

\- Checks additional software to install.

\- Completes assembly; status updates automatically via triggers.

6\. \*\*Manager/Technician\*\* marks unit as ready for delivery, then delivered.

7\. If a unit requires repair:

\- \*\*Technician/Manager\*\* creates a repair job.

\- Components/software can be replaced; the system logs changes and updates statuses.

\- Backup OPS may be assigned via \`ops\_replacements\`.

8\. \*\*Audit log\*\* captures every significant action for traceability.

\---

This system structure is fully implemented in the provided MySQL schema. It provides a robust, flexible, and scalable solution for managing OPS assembly, inventory, and repairs in a smartboard distribution company.