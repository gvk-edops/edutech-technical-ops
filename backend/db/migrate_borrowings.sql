-- Update ENUMs for inventory tables
ALTER TABLE inventory_ops MODIFY COLUMN status ENUM('in_stock','assigned','faulty','retired','reserved','borrowed') NOT NULL DEFAULT 'in_stock';
ALTER TABLE inventory_rams MODIFY COLUMN status ENUM('in_stock','assigned','faulty','retired','reserved','borrowed') NOT NULL DEFAULT 'in_stock';
ALTER TABLE inventory_storage MODIFY COLUMN status ENUM('in_stock','assigned','faulty','retired','reserved','borrowed') NOT NULL DEFAULT 'in_stock';
ALTER TABLE inventory_network_cards MODIFY COLUMN status ENUM('in_stock','assigned','faulty','retired','reserved','borrowed') NOT NULL DEFAULT 'in_stock';

-- Create technician_borrowings table
CREATE TABLE IF NOT EXISTS technician_borrowings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    technician_id INT UNSIGNED NOT NULL,
    component_type ENUM('ops', 'ram', 'storage', 'network_card') NOT NULL,
    inventory_id INT UNSIGNED NOT NULL,
    borrowed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    returned_at DATETIME NULL,
    status ENUM('borrowed', 'returned', 'consumed') NOT NULL DEFAULT 'borrowed',
    notes TEXT NULL,
    CONSTRAINT fk_borrowings_technician FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Add indexes
CREATE INDEX idx_borrowings_status ON technician_borrowings(status);
CREATE INDEX idx_borrowings_tech ON technician_borrowings(technician_id);
CREATE INDEX idx_borrowings_comp ON technician_borrowings(component_type, inventory_id);
