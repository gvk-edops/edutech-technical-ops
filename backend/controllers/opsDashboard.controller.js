import pool from "../config/db.config.js";

export const getOperationsOverview = async (req, res) => {
  try {
    const [
      jobStatus,
      inventoryStatus,
      inventoryByType,
      repairStatus,
      borrowingStatus,
      recentJobs,
    ] = await Promise.all([
      pool.query("SELECT status, COUNT(*) AS count FROM jobs GROUP BY status"),
      pool.query(`
          SELECT status, SUM(total) AS count
          FROM (
            SELECT status, COUNT(*) AS total FROM inventory_ops GROUP BY status
            UNION ALL
            SELECT status, COUNT(*) AS total FROM inventory_rams GROUP BY status
            UNION ALL
            SELECT status, COUNT(*) AS total FROM inventory_storage GROUP BY status
            UNION ALL
            SELECT status, COUNT(*) AS total FROM inventory_network_cards GROUP BY status
          ) inventory
          GROUP BY status
        `),
      pool.query(`
          SELECT component_type, COUNT(*) AS count
          FROM (
            SELECT 'OPS' AS component_type FROM inventory_ops
            UNION ALL
            SELECT 'RAM' AS component_type FROM inventory_rams
            UNION ALL
            SELECT 'Storage' AS component_type FROM inventory_storage
            UNION ALL
            SELECT 'Network cards' AS component_type FROM inventory_network_cards
          ) components
          GROUP BY component_type
          ORDER BY FIELD(component_type, 'OPS', 'RAM', 'Storage', 'Network cards')
        `),
      pool.query(
        "SELECT status, COUNT(*) AS count FROM repair_jobs GROUP BY status",
      ),
      pool.query(
        "SELECT status, COUNT(*) AS count FROM technician_borrowings GROUP BY status",
      ),
      pool.query(`
          SELECT j.id, j.job_number, j.job_type, j.status, j.required_date,
                 c.name AS client_name, d.name AS district_name,
                 COUNT(au.id) AS units_assembled
          FROM jobs j
          JOIN clients c ON c.id = j.client_id
          JOIN districts d ON d.id = j.district_id
          LEFT JOIN assembled_units au ON au.job_id = j.id
          GROUP BY j.id
          ORDER BY j.id DESC
          LIMIT 8
        `),
    ]);

    const toMap = ([rows]) =>
      Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));

    const jobs = toMap(jobStatus);
    const inventory = toMap(inventoryStatus);
    const repairs = toMap(repairStatus);
    const borrowings = toMap(borrowingStatus);

    res.json({
      success: true,
      stats: {
        totalJobs: Object.values(jobs).reduce((sum, value) => sum + value, 0),
        activeJobs: (jobs.created || 0) + (jobs.assembly_in_progress || 0),
        readyForDelivery: jobs.ready_for_delivery || 0,
        availableInventory: inventory.in_stock || 0,
        activeRepairs: (repairs.open || 0) + (repairs.in_progress || 0),
        outstandingBorrowings: borrowings.borrowed || 0,
      },
      breakdowns: { jobs, inventory, repairs, borrowings },
      componentTotals: Object.fromEntries(
        inventoryByType[0].map((row) => [
          row.component_type,
          Number(row.count),
        ]),
      ),
      recentJobs: recentJobs[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
