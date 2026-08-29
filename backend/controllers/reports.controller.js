import pool from '../config/db.config.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const getAssemblyDetailsQuery = `
  SELECT 
    au.id AS unit_id,
    DATE(au.assembly_completed_at) AS assembly_date,
    j.job_number,
    sm.model_name AS smartboard_model,
    om.model_name AS ops_model,
    io.serial_number AS ops_serial,
    io.motherboard_serial,
    GROUP_CONCAT(DISTINCT CONCAT(rs.capacity_gb, 'GB (', ir.serial_number, ')') SEPARATOR '\\n') AS ram_details,
    GROUP_CONCAT(DISTINCT CONCAT(ss.capacity_gb, 'GB ', ss.storage_type, ' (', ist.serial_number, ')') SEPARATOR '\\n') AS storage_details,
    GROUP_CONCAT(DISTINCT CONCAT(msc.name, ' - Key: ', msk.license_key) SEPARATOR '\\n') AS software_keys,
    GROUP_CONCAT(DISTINCT asc_cat.name SEPARATOR '\\n') AS installed_softwares,
    u.full_name AS assembled_by,
    au.notes AS remarks
  FROM assembled_units au
  JOIN jobs j ON au.job_id = j.id
  LEFT JOIN smartboard_models sm ON j.smartboard_model_id = sm.id
  JOIN inventory_ops io ON au.ops_inventory_id = io.id
  JOIN ops_models om ON io.ops_model_id = om.id
  JOIN users u ON au.technician_id = u.id
  LEFT JOIN assembly_rams ar ON au.id = ar.assembled_unit_id
  LEFT JOIN inventory_rams ir ON ar.ram_inventory_id = ir.id
  LEFT JOIN ram_specs rs ON ir.ram_spec_id = rs.id
  LEFT JOIN assembly_storage ast ON au.id = ast.assembled_unit_id
  LEFT JOIN inventory_storage ist ON ast.storage_inventory_id = ist.id
  LEFT JOIN storage_specs ss ON ist.storage_spec_id = ss.id
  LEFT JOIN assembly_main_software ams ON au.id = ams.assembled_unit_id AND ams.is_active = 1
  LEFT JOIN main_software_keys msk ON ams.software_key_id = msk.id
  LEFT JOIN main_software_catalog msc ON msk.software_catalog_id = msc.id
  LEFT JOIN assembly_additional_software aas ON au.id = aas.assembled_unit_id
  LEFT JOIN additional_software_catalog asc_cat ON aas.software_id = asc_cat.id
  WHERE au.status IN ('assembled', 'ready_for_delivery', 'delivered')
  GROUP BY au.id
  ORDER BY au.assembly_completed_at DESC
`;

export const getAssemblyDetails = async (req, res) => {
  try {
    const [rows] = await pool.query(getAssemblyDetailsQuery);
    res.json({ Status: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ Status: false, Error: 'Error fetching report' });
  }
};

export const exportAssemblyDetailsExcel = async (req, res) => {
  try {
    const [rows] = await pool.query(getAssemblyDetailsQuery);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Assembly & Repair Report');

    worksheet.columns = [
      { header: 'Assembly Date', key: 'assembly_date', width: 15 },
      { header: 'Job Number', key: 'job_number', width: 20 },
      { header: 'Smartboard Model', key: 'smartboard_model', width: 25 },
      { header: 'OPS Model', key: 'ops_model', width: 20 },
      { header: 'OPS Serial', key: 'ops_serial', width: 20 },
      { header: 'Motherboard Serial', key: 'motherboard_serial', width: 25 },
      { header: 'RAM Details', key: 'ram_details', width: 40 },
      { header: 'Storage Details', key: 'storage_details', width: 40 },
      { header: 'Software Keys', key: 'software_keys', width: 40 },
      { header: 'Installed Additional Software', key: 'installed_softwares', width: 30 },
      { header: 'Assembled By', key: 'assembled_by', width: 20 },
      { header: 'Remarks', key: 'remarks', width: 30 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    rows.forEach(row => {
      const dataRow = worksheet.addRow({
        assembly_date: row.assembly_date ? new Date(row.assembly_date).toLocaleDateString() : '',
        job_number: row.job_number,
        smartboard_model: row.smartboard_model || 'N/A',
        ops_model: row.ops_model,
        ops_serial: row.ops_serial,
        motherboard_serial: row.motherboard_serial,
        ram_details: row.ram_details,
        storage_details: row.storage_details,
        software_keys: row.software_keys,
        installed_softwares: row.installed_softwares,
        assembled_by: row.assembled_by,
        remarks: row.remarks
      });
      dataRow.alignment = { wrapText: true, vertical: 'middle' };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Assembly_Report.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ Status: false, Error: 'Failed to generate Excel' });
  }
};

export const exportAssemblyDetailsPDF = async (req, res) => {
  try {
    const [rows] = await pool.query(getAssemblyDetailsQuery);

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Assembly_Report.pdf"');
    doc.pipe(res);

    doc.fontSize(20).text('Assembly & Repair Report', { align: 'center' });
    doc.moveDown();

    rows.forEach((row, index) => {
      if (index !== 0) {
          doc.addPage();
      }
      doc.fontSize(16).text(`Job Number: ${row.job_number} | Assembly Date: ${row.assembly_date ? new Date(row.assembly_date).toLocaleDateString() : 'N/A'}`, { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(12);
      doc.text(`Assembled By: ${row.assembled_by}`);
      doc.text(`Smartboard Model: ${row.smartboard_model || 'N/A'}`);
      doc.text(`OPS Model: ${row.ops_model} (Serial: ${row.ops_serial})`);
      doc.text(`Motherboard Serial: ${row.motherboard_serial}`);
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('RAM Details:');
      doc.font('Helvetica').text(row.ram_details || 'None');
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Storage Details:');
      doc.font('Helvetica').text(row.storage_details || 'None');
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Main Software & Keys:');
      doc.font('Helvetica').text(row.software_keys || 'None');
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Additional Software:');
      doc.font('Helvetica').text(row.installed_softwares || 'None');
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Remarks:');
      doc.font('Helvetica').text(row.remarks || 'No remarks provided.');
      doc.moveDown();
    });

    if (rows.length === 0) {
        doc.fontSize(12).text('No assemblies found for the report.', { align: 'center' });
    }

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ Status: false, Error: 'Failed to generate PDF' });
  }
};

export const getUnitHistory = async (req, res) => {
  const { serial } = req.query;
  if (!serial) return res.status(400).json({ Status: false, Error: "Serial number required" });
  
  try {
    const unitQuery = `
      SELECT
        au.id AS unit_id, au.status, au.assembly_completed_at, au.notes,
        j.job_number, io.serial_number AS ops_serial, io.motherboard_serial,
        sm.model_name AS smartboard_model, u.full_name AS technician_name
      FROM assembled_units au
      JOIN jobs j ON au.job_id = j.id
      JOIN inventory_ops io ON au.ops_inventory_id = io.id
      LEFT JOIN smartboard_models sm ON j.smartboard_model_id = sm.id
      JOIN users u ON au.technician_id = u.id
      WHERE io.serial_number = ? OR io.motherboard_serial = ? OR j.job_number = ?
      LIMIT 1
    `;
    const [units] = await pool.query(unitQuery, [serial, serial, serial]);
    if (units.length === 0) return res.json({ Status: true, data: null });
    
    const unit = units[0];
    
    const repairQuery = `
      SELECT rj.repair_number, rj.reported_issue, rj.status, rj.created_at, u.full_name AS technician
      FROM repair_jobs rj
      LEFT JOIN users u ON rj.technician_id = u.id
      WHERE rj.assembled_unit_id = ?
      ORDER BY rj.created_at DESC
    `;
    const [repairs] = await pool.query(repairQuery, [unit.unit_id]);
    
    res.json({ Status: true, data: { ...unit, repairs } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ Status: false, Error: 'Error fetching unit history' });
  }
};

export const getTechnicianPerformance = async (req, res) => {
  try {
    const query = `
      SELECT u.id AS technician_id, u.full_name, COUNT(au.id) AS assemblies_completed
      FROM users u
      LEFT JOIN assembled_units au ON u.id = au.technician_id AND au.status IN ('assembled', 'ready_for_delivery', 'delivered')
      WHERE u.role IN ('technician', 'admin', 'manager')
      GROUP BY u.id
      ORDER BY assemblies_completed DESC
    `;
    const [rows] = await pool.query(query);
    res.json({ Status: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ Status: false, Error: 'Error fetching technician performance' });
  }
};

export const getInventoryConsumption = async (req, res) => {
  try {
    const ramQuery = `
      SELECT rs.capacity_gb, rs.ddr_version, COUNT(ar.id) as used_count
      FROM assembly_rams ar
      JOIN inventory_rams ir ON ar.ram_inventory_id = ir.id
      JOIN ram_specs rs ON ir.ram_spec_id = rs.id
      GROUP BY rs.id
    `;
    const [ramUsage] = await pool.query(ramQuery);

    const storageQuery = `
      SELECT ss.storage_type, ss.capacity_gb, COUNT(ast.id) as used_count
      FROM assembly_storage ast
      JOIN inventory_storage ist ON ast.storage_inventory_id = ist.id
      JOIN storage_specs ss ON ist.storage_spec_id = ss.id
      GROUP BY ss.id
    `;
    const [storageUsage] = await pool.query(storageQuery);

    res.json({ Status: true, data: { ramUsage, storageUsage } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ Status: false, Error: 'Error fetching inventory consumption' });
  }
};

export const getJobProgress = async (req, res) => {
  try {
    const query = `
      SELECT j.id, j.job_number, j.smartboard_count AS total_units,
      COUNT(au.id) AS completed_units, c.name AS client_name, j.status
      FROM jobs j
      JOIN clients c ON j.client_id = c.id
      LEFT JOIN assembled_units au ON j.id = au.job_id AND au.status IN ('assembled', 'ready_for_delivery', 'delivered')
      WHERE j.status NOT IN ('completed', 'cancelled')
      GROUP BY j.id
      ORDER BY j.created_at DESC
    `;
    const [rows] = await pool.query(query);
    res.json({ Status: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ Status: false, Error: 'Error fetching job progress' });
  }
};
