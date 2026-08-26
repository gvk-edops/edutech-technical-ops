-- =====================================================
-- Database: smartboard_ops_management
-- =====================================================
CREATE DATABASE IF NOT EXISTS smartboard_ops_management
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE smartboard_ops_management;

-- =====================================================
-- 1. USERS
-- =====================================================
CREATE TABLE users (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(100) NULL,
    role            ENUM('admin','manager','technician') NOT NULL DEFAULT 'technician',
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- 2. PROVINCES
-- =====================================================
CREATE TABLE provinces (
    id      TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name    VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- =====================================================
-- 3. DISTRICTS
-- =====================================================
CREATE TABLE districts (
    id          TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    province_id TINYINT UNSIGNED NOT NULL,
    UNIQUE KEY uq_district_name_province (name, province_id),
    CONSTRAINT fk_districts_province FOREIGN KEY (province_id) REFERENCES provinces(id)
) ENGINE=InnoDB;

-- =====================================================
-- 4. CLIENTS
-- =====================================================
CREATE TABLE clients (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    address         TEXT NULL,
    district_id     TINYINT UNSIGNED NOT NULL,
    contact_person  VARCHAR(100) NULL,
    phone           VARCHAR(20)  NULL,
    email           VARCHAR(100) NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_clients_district FOREIGN KEY (district_id) REFERENCES districts(id)
) ENGINE=InnoDB;

-- =====================================================
-- 5. SMARTBOARD MODEL CATALOG
-- =====================================================
CREATE TABLE smartboard_models (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    model_name  VARCHAR(100) NOT NULL UNIQUE,
    brand       VARCHAR(50)  NULL,
    description TEXT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- 6. OPS MODEL CATALOG
-- =====================================================
CREATE TABLE ops_models (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    model_name      VARCHAR(100) NOT NULL UNIQUE,
    processor_series ENUM('i','ultra') NOT NULL,
    processor_core  VARCHAR(20)  NOT NULL,
    processor_count TINYINT UNSIGNED NULL,
    base_speed_ghz  DECIMAL(4,2) NULL,
    cache_mb        DECIMAL(5,1) NULL,
    description     TEXT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- 7. RAM SPECIFICATION CATALOG
-- =====================================================
CREATE TABLE ram_specs (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    brand       VARCHAR(100) NULL,
    ddr_version VARCHAR(10) NOT NULL,
    capacity_gb SMALLINT UNSIGNED NOT NULL,
    description VARCHAR(100) NULL,
    UNIQUE KEY uq_ram_spec (ddr_version, capacity_gb)
) ENGINE=InnoDB;

-- =====================================================
-- 8. STORAGE SPECIFICATION CATALOG
-- =====================================================
CREATE TABLE storage_specs (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    form_factor  VARCHAR(50) NOT NULL,
    interface    VARCHAR(20) NOT NULL,
    storage_type ENUM('SSD','HDD') NOT NULL,
    capacity_gb  INT UNSIGNED NOT NULL,
    description  VARCHAR(100) NULL,
    UNIQUE KEY uq_storage_spec (form_factor, interface, storage_type, capacity_gb)
) ENGINE=InnoDB;

-- =====================================================
-- 9. NETWORK CARD MODEL CATALOG
-- =====================================================
CREATE TABLE network_card_models (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    model_name  VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(150) NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- 10. MAIN SOFTWARE CATALOG
-- =====================================================
CREATE TABLE main_software_catalog (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    software_type ENUM('windows','office','iq_whiteboard','antivirus') NOT NULL,
    name          VARCHAR(100) NOT NULL,
    version       VARCHAR(50)  NULL,
    description   TEXT NULL,
    UNIQUE KEY uq_main_sw (software_type, name, version)
) ENGINE=InnoDB;

-- =====================================================
-- 11. ADDITIONAL SOFTWARE CATALOG
-- =====================================================
CREATE TABLE additional_software_catalog (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    version     VARCHAR(50)  NULL,
    description TEXT NULL,
    UNIQUE KEY uq_add_sw (name, version)
) ENGINE=InnoDB;

-- =====================================================
-- 12. INVENTORY BATCHES
-- =====================================================
CREATE TABLE inventory_batches (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    batch_type   ENUM('ops','ram','storage','network_card') NOT NULL,
    description  VARCHAR(255) NULL,
    created_by   INT UNSIGNED NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_batches_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- 13. INVENTORY: OPS UNITS
-- =====================================================
CREATE TABLE inventory_ops (
    id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    serial_number      VARCHAR(100) NOT NULL UNIQUE,
    motherboard_serial VARCHAR(100) NOT NULL UNIQUE,
    ops_model_id       INT UNSIGNED NOT NULL,
    status             ENUM('in_stock','assigned','faulty','retired','reserved') NOT NULL DEFAULT 'in_stock',
    batch_id           INT UNSIGNED NULL,
    notes              TEXT NULL,
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ops_batch   FOREIGN KEY (batch_id) REFERENCES inventory_batches(id) ON DELETE SET NULL,
    CONSTRAINT fk_ops_model   FOREIGN KEY (ops_model_id) REFERENCES ops_models(id)
) ENGINE=InnoDB;

-- =====================================================
-- 14. INVENTORY: RAM MODULES
-- =====================================================
CREATE TABLE inventory_rams (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    brand         VARCHAR(50)  NULL,
    ram_spec_id   INT UNSIGNED NOT NULL,
    status        ENUM('in_stock','assigned','faulty','retired','reserved') NOT NULL DEFAULT 'in_stock',
    batch_id      INT UNSIGNED NULL,
    notes         TEXT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ram_batch FOREIGN KEY (batch_id) REFERENCES inventory_batches(id) ON DELETE SET NULL,
    CONSTRAINT fk_ram_spec  FOREIGN KEY (ram_spec_id) REFERENCES ram_specs(id)
) ENGINE=InnoDB;

-- =====================================================
-- 15. INVENTORY: STORAGE
-- =====================================================
CREATE TABLE inventory_storage (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    serial_number     VARCHAR(100) NOT NULL UNIQUE,
    brand             VARCHAR(50)  NULL,
    storage_spec_id   INT UNSIGNED NOT NULL,
    status            ENUM('in_stock','assigned','faulty','retired','reserved') NOT NULL DEFAULT 'in_stock',
    batch_id          INT UNSIGNED NULL,
    notes             TEXT NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_storage_batch FOREIGN KEY (batch_id) REFERENCES inventory_batches(id) ON DELETE SET NULL,
    CONSTRAINT fk_storage_spec  FOREIGN KEY (storage_spec_id) REFERENCES storage_specs(id)
) ENGINE=InnoDB;

-- =====================================================
-- 16. INVENTORY: NETWORK / WIFI CARDS
-- =====================================================
CREATE TABLE inventory_network_cards (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    model_id      INT UNSIGNED NOT NULL,
    status        ENUM('in_stock','assigned','faulty','retired','reserved') NOT NULL DEFAULT 'in_stock',
    batch_id      INT UNSIGNED NULL,
    notes         TEXT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_netcard_batch FOREIGN KEY (batch_id) REFERENCES inventory_batches(id) ON DELETE SET NULL,
    CONSTRAINT fk_netcard_model FOREIGN KEY (model_id) REFERENCES network_card_models(id)
) ENGINE=InnoDB;

-- =====================================================
-- 17. MAIN SOFTWARE KEYS
-- =====================================================
CREATE TABLE main_software_keys (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    software_catalog_id     INT UNSIGNED NOT NULL,
    license_key             VARCHAR(255) NOT NULL UNIQUE,
    license_type            ENUM('lifetime','subscription') NOT NULL DEFAULT 'lifetime',
    subscription_start_date DATE NULL,
    subscription_end_date   DATE NULL,
    status                  ENUM('purchased','assigned','revoked','expired') NOT NULL DEFAULT 'purchased',
    notes                   TEXT NULL,
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_msw_key_catalog FOREIGN KEY (software_catalog_id) REFERENCES main_software_catalog(id)
) ENGINE=InnoDB;

-- =====================================================
-- 18. JOBS
-- =====================================================
CREATE TABLE jobs (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_number              VARCHAR(50) NOT NULL UNIQUE,
    client_id               INT UNSIGNED NOT NULL,
    district_id             TINYINT UNSIGNED NOT NULL,
    smartboard_model_id     INT UNSIGNED NOT NULL,
    smartboard_count        INT UNSIGNED NOT NULL DEFAULT 1,
    ops_model_id            INT UNSIGNED NOT NULL,
    ram_ddr_version         VARCHAR(10) NOT NULL,
    ram_capacity_gb         SMALLINT UNSIGNED NOT NULL,   -- total required RAM, e.g., 16
    status                  ENUM('created','assembly_in_progress','ready_for_delivery','completed','cancelled') NOT NULL DEFAULT 'created',
    created_by              INT UNSIGNED NOT NULL,
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_jobs_client      FOREIGN KEY (client_id) REFERENCES clients(id),
    CONSTRAINT fk_jobs_district    FOREIGN KEY (district_id) REFERENCES districts(id),
    CONSTRAINT fk_jobs_smartboard  FOREIGN KEY (smartboard_model_id) REFERENCES smartboard_models(id),
    CONSTRAINT fk_jobs_ops_model   FOREIGN KEY (ops_model_id) REFERENCES ops_models(id),
    CONSTRAINT fk_jobs_created_by  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- =====================================================
-- 19. JOB STORAGE REQUIREMENTS (many-to-many, flexible roles)
-- =====================================================
CREATE TABLE job_storage_requirements (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_id          INT UNSIGNED NOT NULL,
    storage_spec_id INT UNSIGNED NOT NULL,
    role            ENUM('primary','secondary','tertiary','additional') NOT NULL,
    UNIQUE KEY uq_job_storage_role (job_id, role),
    CONSTRAINT fk_job_storage_job  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_job_storage_spec FOREIGN KEY (storage_spec_id) REFERENCES storage_specs(id)
) ENGINE=InnoDB;

-- =====================================================
-- 20. JOB MAIN SOFTWARE REQUIREMENTS
-- =====================================================
CREATE TABLE job_main_software_requirements (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_id              INT UNSIGNED NOT NULL,
    software_catalog_id INT UNSIGNED NOT NULL,
    UNIQUE KEY uq_job_main_sw (job_id, software_catalog_id),
    CONSTRAINT fk_job_main_sw_job      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_job_main_sw_software FOREIGN KEY (software_catalog_id) REFERENCES main_software_catalog(id)
) ENGINE=InnoDB;

-- =====================================================
-- 21. JOB ADDITIONAL SOFTWARE REQUIREMENTS
-- =====================================================
CREATE TABLE job_additional_software (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_id      INT UNSIGNED NOT NULL,
    software_id INT UNSIGNED NOT NULL,
    UNIQUE KEY uq_job_add_sw (job_id, software_id),
    CONSTRAINT fk_job_add_sw_job      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_job_add_sw_software FOREIGN KEY (software_id) REFERENCES additional_software_catalog(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- 22. ASSEMBLED UNITS
-- =====================================================
CREATE TABLE assembled_units (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_id                  INT UNSIGNED NOT NULL,
    ops_inventory_id        INT UNSIGNED NOT NULL,
    wifi_card_inventory_id  INT UNSIGNED NULL,
    technician_id           INT UNSIGNED NOT NULL,
    notes                   TEXT NULL,
    status                  ENUM('assembly_in_progress','assembled','ready_for_delivery','delivered','in_repair','returned','retired') NOT NULL DEFAULT 'assembly_in_progress',
    assembly_started_at     DATETIME NULL,
    assembly_completed_at   DATETIME NULL,
    ready_for_delivery_at   DATETIME NULL,
    delivered_at            DATETIME NULL,
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_assembled_ops (ops_inventory_id),
    CONSTRAINT fk_asm_job        FOREIGN KEY (job_id) REFERENCES jobs(id),
    CONSTRAINT fk_asm_ops        FOREIGN KEY (ops_inventory_id) REFERENCES inventory_ops(id),
    CONSTRAINT fk_asm_wifi       FOREIGN KEY (wifi_card_inventory_id) REFERENCES inventory_network_cards(id),
    CONSTRAINT fk_asm_technician FOREIGN KEY (technician_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- =====================================================
-- 23. ASSEMBLY RAM MODULES
-- =====================================================
CREATE TABLE assembly_rams (
    id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    assembled_unit_id  INT UNSIGNED NOT NULL,
    ram_inventory_id   INT UNSIGNED NOT NULL,
    UNIQUE KEY uq_asm_ram (assembled_unit_id, ram_inventory_id),
    CONSTRAINT fk_asm_ram_unit FOREIGN KEY (assembled_unit_id) REFERENCES assembled_units(id) ON DELETE CASCADE,
    CONSTRAINT fk_asm_ram_inv  FOREIGN KEY (ram_inventory_id) REFERENCES inventory_rams(id)
) ENGINE=InnoDB;

-- =====================================================
-- 24. ASSEMBLY STORAGE DEVICES
-- =====================================================
CREATE TABLE assembly_storage (
    id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    assembled_unit_id     INT UNSIGNED NOT NULL,
    storage_inventory_id  INT UNSIGNED NOT NULL,
    role                  ENUM('primary','secondary','tertiary','additional') NOT NULL DEFAULT 'additional',
    notes                 TEXT NULL,
    UNIQUE KEY uq_asm_storage (assembled_unit_id, storage_inventory_id),
    CONSTRAINT fk_asm_storage_unit FOREIGN KEY (assembled_unit_id) REFERENCES assembled_units(id) ON DELETE CASCADE,
    CONSTRAINT fk_asm_storage_inv  FOREIGN KEY (storage_inventory_id) REFERENCES inventory_storage(id)
) ENGINE=InnoDB;

-- =====================================================
-- 25. ASSEMBLY MAIN SOFTWARE
-- =====================================================
CREATE TABLE assembly_main_software (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    assembled_unit_id   INT UNSIGNED NOT NULL,
    software_catalog_id INT UNSIGNED NOT NULL,
    software_key_id     INT UNSIGNED NOT NULL,
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    assigned_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unassigned_at       DATETIME NULL,
    notes               TEXT NULL,
    UNIQUE KEY uq_asm_main_sw_active (assembled_unit_id, software_catalog_id, is_active),
    CONSTRAINT fk_asm_main_sw_unit     FOREIGN KEY (assembled_unit_id) REFERENCES assembled_units(id) ON DELETE CASCADE,
    CONSTRAINT fk_asm_main_sw_catalog  FOREIGN KEY (software_catalog_id) REFERENCES main_software_catalog(id),
    CONSTRAINT fk_asm_main_sw_key      FOREIGN KEY (software_key_id) REFERENCES main_software_keys(id)
) ENGINE=InnoDB;

-- =====================================================
-- 26. ASSEMBLY ADDITIONAL SOFTWARE
-- =====================================================
CREATE TABLE assembly_additional_software (
    id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    assembled_unit_id  INT UNSIGNED NOT NULL,
    software_id        INT UNSIGNED NOT NULL,
    installed_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_asm_add_sw (assembled_unit_id, software_id),
    CONSTRAINT fk_asm_add_sw_unit     FOREIGN KEY (assembled_unit_id) REFERENCES assembled_units(id) ON DELETE CASCADE,
    CONSTRAINT fk_asm_add_sw_software FOREIGN KEY (software_id) REFERENCES additional_software_catalog(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- 27. REPAIR JOBS
-- =====================================================
CREATE TABLE repair_jobs (
    id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_number      VARCHAR(50) NOT NULL UNIQUE,
    assembled_unit_id  INT UNSIGNED NOT NULL,
    client_id          INT UNSIGNED NOT NULL,
    reported_issue     TEXT NOT NULL,
    status             ENUM('open','in_progress','completed','closed') NOT NULL DEFAULT 'open',
    technician_id      INT UNSIGNED NULL,
    start_date         DATE NULL,
    end_date           DATE NULL,
    notes              TEXT NULL,
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_repair_unit       FOREIGN KEY (assembled_unit_id) REFERENCES assembled_units(id),
    CONSTRAINT fk_repair_client     FOREIGN KEY (client_id) REFERENCES clients(id),
    CONSTRAINT fk_repair_technician FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- 28. COMPONENT REPLACEMENTS WITHIN REPAIR JOBS
-- =====================================================
CREATE TABLE repair_component_replacements (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_job_id     INT UNSIGNED NOT NULL,
    component_type    ENUM('ops','ram','storage','wifi_card','software_key') NOT NULL,
    old_inventory_id  INT UNSIGNED NULL COMMENT 'ID in corresponding inventory table or software_keys',
    new_inventory_id  INT UNSIGNED NULL,
    replacement_date  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    technician_id     INT UNSIGNED NULL,
    notes             TEXT NULL,
    CONSTRAINT fk_rep_replace_job FOREIGN KEY (repair_job_id) REFERENCES repair_jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_rep_replace_tech FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_rep_replace_type (component_type),
    INDEX idx_rep_replace_old (old_inventory_id),
    INDEX idx_rep_replace_new (new_inventory_id)
) ENGINE=InnoDB;

-- =====================================================
-- 29. BACKUP / REPLACEMENT OPS ASSIGNMENTS
-- =====================================================
CREATE TABLE ops_replacements (
    id                              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    original_assembled_unit_id      INT UNSIGNED NOT NULL,
    replacement_ops_inventory_id    INT UNSIGNED NOT NULL,
    reason                          VARCHAR(255) NULL,
    assigned_at                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    returned_at                     DATETIME NULL,
    status                          ENUM('assigned','returned','permanent') NOT NULL DEFAULT 'assigned',
    technician_id                   INT UNSIGNED NULL,
    notes                           TEXT NULL,
    CONSTRAINT fk_ops_repl_unit   FOREIGN KEY (original_assembled_unit_id) REFERENCES assembled_units(id),
    CONSTRAINT fk_ops_repl_ops    FOREIGN KEY (replacement_ops_inventory_id) REFERENCES inventory_ops(id),
    CONSTRAINT fk_ops_repl_tech   FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- 30. AUDIT LOG
-- =====================================================
CREATE TABLE audit_logs (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id      INT UNSIGNED NULL,
    action       VARCHAR(100) NOT NULL,
    entity_type  VARCHAR(50)  NULL,
    entity_id    INT UNSIGNED NULL,
    details      TEXT NULL,
    ip_address   VARCHAR(45) NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC STATUS UPDATES
-- =====================================================

-- Trigger: When RAM is assigned to assembly, set status='assigned'
DELIMITER //
CREATE TRIGGER trg_assembly_rams_insert
AFTER INSERT ON assembly_rams
FOR EACH ROW
BEGIN
    UPDATE inventory_rams SET status = 'assigned' WHERE id = NEW.ram_inventory_id;
END//
DELIMITER ;

-- Trigger: When RAM is removed from assembly, set status back to 'in_stock'
DELIMITER //
CREATE TRIGGER trg_assembly_rams_delete
AFTER DELETE ON assembly_rams
FOR EACH ROW
BEGIN
    UPDATE inventory_rams SET status = 'in_stock' WHERE id = OLD.ram_inventory_id;
END//
DELIMITER ;

-- Trigger: When storage is assigned to assembly, set status='assigned'
DELIMITER //
CREATE TRIGGER trg_assembly_storage_insert
AFTER INSERT ON assembly_storage
FOR EACH ROW
BEGIN
    UPDATE inventory_storage SET status = 'assigned' WHERE id = NEW.storage_inventory_id;
END//
DELIMITER ;

-- Trigger: When storage is removed from assembly, set status back to 'in_stock'
DELIMITER //
CREATE TRIGGER trg_assembly_storage_delete
AFTER DELETE ON assembly_storage
FOR EACH ROW
BEGIN
    UPDATE inventory_storage SET status = 'in_stock' WHERE id = OLD.storage_inventory_id;
END//
DELIMITER ;

-- Trigger: When a software key is assigned, set its status to 'assigned'
DELIMITER //
CREATE TRIGGER trg_assembly_main_software_insert
AFTER INSERT ON assembly_main_software
FOR EACH ROW
BEGIN
    UPDATE main_software_keys SET status = 'assigned' WHERE id = NEW.software_key_id;
END//
DELIMITER ;

-- Trigger: When software key is deactivated/unassigned, set status back to 'available' or 'revoked'
-- (application should decide, but we can default to 'available')
DELIMITER //
CREATE TRIGGER trg_assembly_main_software_update
AFTER UPDATE ON assembly_main_software
FOR EACH ROW
BEGIN
    IF NEW.is_active = 0 AND OLD.is_active = 1 THEN
        UPDATE main_software_keys SET status = 'available' WHERE id = OLD.software_key_id;
    END IF;
END//
DELIMITER ;

-- Trigger: When a repair component replacement is logged, update statuses
DELIMITER //
CREATE TRIGGER trg_repair_component_replacements_insert
AFTER INSERT ON repair_component_replacements
FOR EACH ROW
BEGIN
    -- Set old component to 'faulty'
    IF NEW.component_type = 'ops' AND NEW.old_inventory_id IS NOT NULL THEN
        UPDATE inventory_ops SET status = 'faulty' WHERE id = NEW.old_inventory_id;
    ELSEIF NEW.component_type = 'ram' AND NEW.old_inventory_id IS NOT NULL THEN
        UPDATE inventory_rams SET status = 'faulty' WHERE id = NEW.old_inventory_id;
    ELSEIF NEW.component_type = 'storage' AND NEW.old_inventory_id IS NOT NULL THEN
        UPDATE inventory_storage SET status = 'faulty' WHERE id = NEW.old_inventory_id;
    ELSEIF NEW.component_type = 'wifi_card' AND NEW.old_inventory_id IS NOT NULL THEN
        UPDATE inventory_network_cards SET status = 'faulty' WHERE id = NEW.old_inventory_id;
    ELSEIF NEW.component_type = 'software_key' AND NEW.old_inventory_id IS NOT NULL THEN
        UPDATE main_software_keys SET status = 'revoked' WHERE id = NEW.old_inventory_id;
    END IF;

    -- Set new component to 'assigned'
    IF NEW.component_type = 'ops' AND NEW.new_inventory_id IS NOT NULL THEN
        UPDATE inventory_ops SET status = 'assigned' WHERE id = NEW.new_inventory_id;
    ELSEIF NEW.component_type = 'ram' AND NEW.new_inventory_id IS NOT NULL THEN
        UPDATE inventory_rams SET status = 'assigned' WHERE id = NEW.new_inventory_id;
    ELSEIF NEW.component_type = 'storage' AND NEW.new_inventory_id IS NOT NULL THEN
        UPDATE inventory_storage SET status = 'assigned' WHERE id = NEW.new_inventory_id;
    ELSEIF NEW.component_type = 'wifi_card' AND NEW.new_inventory_id IS NOT NULL THEN
        UPDATE inventory_network_cards SET status = 'assigned' WHERE id = NEW.new_inventory_id;
    ELSEIF NEW.component_type = 'software_key' AND NEW.new_inventory_id IS NOT NULL THEN
        UPDATE main_software_keys SET status = 'assigned' WHERE id = NEW.new_inventory_id;
    END IF;
END//
DELIMITER ;

-- =====================================================
-- INDEXES FOR COMMON QUERIES / REPORTING
-- =====================================================
CREATE INDEX idx_jobs_client_date ON jobs (client_id, created_at);
CREATE INDEX idx_jobs_district_date ON jobs (district_id, created_at);
CREATE INDEX idx_assembled_status ON assembled_units (status);
CREATE INDEX idx_assembled_dates ON assembled_units (assembly_completed_at, delivered_at);
CREATE INDEX idx_repair_status_date ON repair_jobs (status, created_at);
CREATE INDEX idx_inventory_ops_status ON inventory_ops (status);
CREATE INDEX idx_inventory_rams_status ON inventory_rams (status);
CREATE INDEX idx_inventory_storage_status ON inventory_storage (status);
CREATE INDEX idx_inventory_net_status ON inventory_network_cards (status);
CREATE INDEX idx_assembly_main_sw_unit ON assembly_main_software (assembled_unit_id, is_active);
CREATE INDEX idx_audit_created_at ON audit_logs (created_at);