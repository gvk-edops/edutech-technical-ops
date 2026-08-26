import con from "../config/db.config.js";

const dashboardData = async (req, res) => {
  try {
    // Get time range from query params (default: 6 months)
    const timeRange = req.query.timeRange || "6m";
    const promotionRange = req.query.promotionRange || "next_6_months";
    const incrementRange = req.query.incrementRange || "this_month";

    // Build the date filter based on time range
    let dateFilter = "";
    switch (timeRange) {
      case "3m":
        dateFilter =
          "AND e.career_start_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)";
        break;
      case "6m":
        dateFilter =
          "AND e.career_start_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)";
        break;
      case "1y":
        dateFilter =
          "AND e.career_start_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)";
        break;
      case "all":
        dateFilter = ""; // No date filter for all time
        break;
      default:
        dateFilter =
          "AND e.career_start_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)";
    }

    // Build promotion date range filter (for employees due for promotion)
    const getPromotionDateFilter = (range) => {
      switch (range) {
        case "all":
          return ""; // Show all eligible employees
        case "next_3_months":
          return "AND DATE_ADD(ec.current_class_promotion_date, INTERVAL COALESCE(next_step.min_years_required, 0) YEAR) <= DATE_ADD(CURDATE(), INTERVAL 3 MONTH)";
        case "next_6_months":
          return "AND DATE_ADD(ec.current_class_promotion_date, INTERVAL COALESCE(next_step.min_years_required, 0) YEAR) <= DATE_ADD(CURDATE(), INTERVAL 6 MONTH)";
        case "next_year":
          return "AND DATE_ADD(ec.current_class_promotion_date, INTERVAL COALESCE(next_step.min_years_required, 0) YEAR) <= DATE_ADD(CURDATE(), INTERVAL 1 YEAR)";
        default:
          return "AND DATE_ADD(ec.current_class_promotion_date, INTERVAL COALESCE(next_step.min_years_required, 0) YEAR) <= DATE_ADD(CURDATE(), INTERVAL 6 MONTH)";
      }
    };

    // Build increment date range filter (based on anniversary of current_class_promotion_date)
    const getIncrementDateFilter = (range) => {
      // We check if the anniversary falls within the range
      switch (range) {
        case "today":
          return `AND DATE_FORMAT(ec.current_class_promotion_date, '%m-%d') = DATE_FORMAT(CURDATE(), '%m-%d')`;
        case "this_week":
          return `AND DATE_FORMAT(ec.current_class_promotion_date, '%m-%d') >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), '%m-%d')
                  AND DATE_FORMAT(ec.current_class_promotion_date, '%m-%d') <= DATE_FORMAT(CURDATE(), '%m-%d')`;
        case "this_month":
          return `AND MONTH(ec.current_class_promotion_date) = MONTH(CURDATE())`;
        default:
          return `AND MONTH(ec.current_class_promotion_date) = MONTH(CURDATE())`;
      }
    };

    const promotionDateFilter = getPromotionDateFilter(promotionRange);
    const incrementDateFilter = getIncrementDateFilter(incrementRange);

    const [
      adminResult,
      employeeResult,
      documentsResult,
      jobRolesResult,
      // Employees by job role with gender breakdown
      employeesByRoleGenderResult,
      // Employees by class
      employeesByClassResult,
      // Monthly registrations by job role
      monthlyRegistrationsResult,
      // Recent employees
      recentEmployeesResult,
      // Upcoming retirements
      upcomingRetirementsResult,
      // Employment status
      employmentStatusResult,
      // Promotions in period
      promotionsResult,
      // Salary increments in period
      incrementsResult,
    ] = await Promise.all([
      // Total admins
      con.query("SELECT COUNT(*) AS count FROM admin"),
      // Total employees
      con.query("SELECT COUNT(*) AS count FROM employee"),
      // Total documents
      con.query("SELECT COUNT(*) AS count FROM employee_document"),
      // Total job roles
      con.query("SELECT COUNT(*) AS count FROM job_role"),
      // Employees by job role with gender breakdown (current positions)
      con.query(`
        SELECT 
          jr.name AS role,
          SUM(CASE WHEN e.gender = 'Male' THEN 1 ELSE 0 END) AS male,
          SUM(CASE WHEN e.gender = 'Female' THEN 1 ELSE 0 END) AS female,
          COUNT(*) AS total
        FROM employee e
        JOIN employee_career ec ON e.id = ec.fk_emp_id AND ec.end_date IS NULL
        JOIN job_role_class jrc ON ec.fk_job_role_class_id = jrc.id
        JOIN job_role jr ON jrc.fk_job_role_id = jr.id
        GROUP BY jr.id, jr.name
        ORDER BY jr.name
      `),
      // Employees by class with salary scale info
      con.query(`
        SELECT 
          jc.class_code AS name,
          jc.hierarchy_order,
          COUNT(DISTINCT ec.fk_emp_id) AS count,
          ss.code AS salaryCode,
          ss.starting_basic AS startingSalary,
          ss.final_basic AS finalSalary
        FROM employee_career ec
        JOIN job_role_class jrc ON ec.fk_job_role_class_id = jrc.id
        JOIN job_class jc ON jrc.fk_job_class_id = jc.id
        LEFT JOIN salary_scale ss ON jrc.fk_salary_scale_id = ss.id
        WHERE ec.end_date IS NULL
        GROUP BY jc.id, jc.class_code, jc.hierarchy_order, ss.code, ss.starting_basic, ss.final_basic
        ORDER BY jc.hierarchy_order
      `),
      // Monthly joined employees by job role (with dynamic time range)
      con.query(`
        SELECT 
          DATE_FORMAT(e.career_start_date, '%Y-%m') AS month,
          DATE_FORMAT(e.career_start_date, '%b %Y') AS monthLabel,
          jr.name AS role,
          COUNT(*) AS count
        FROM employee e
        JOIN employee_career ec ON e.id = ec.fk_emp_id
        JOIN job_role_class jrc ON ec.fk_job_role_class_id = jrc.id
        JOIN job_role jr ON jrc.fk_job_role_id = jr.id
        WHERE e.career_start_date IS NOT NULL
          ${dateFilter}
        GROUP BY DATE_FORMAT(e.career_start_date, '%Y-%m'), DATE_FORMAT(e.career_start_date, '%b %Y'), jr.id, jr.name
        ORDER BY month, jr.name
      `),
      // Recent employees (last 5)
      con.query(`
        SELECT e.id, e.name_with_init AS name, e.photo, e.created_at,
               jr.name AS jobRole, jc.class_code AS jobClass
        FROM employee e
        LEFT JOIN employee_career ec ON e.id = ec.fk_emp_id AND ec.end_date IS NULL
        LEFT JOIN job_role_class jrc ON ec.fk_job_role_class_id = jrc.id
        LEFT JOIN job_role jr ON jrc.fk_job_role_id = jr.id
        LEFT JOIN job_class jc ON jrc.fk_job_class_id = jc.id
        ORDER BY e.created_at DESC
        LIMIT 5
      `),
      // Upcoming retirements (next 6 months)
      con.query(`
        SELECT e.id, e.name_with_init AS name, e.photo, e.retirement_date,
               jr.name AS jobRole, jc.class_code AS jobClass
        FROM employee e
        LEFT JOIN employee_career ec ON e.id = ec.fk_emp_id AND ec.end_date IS NULL
        LEFT JOIN job_role_class jrc ON ec.fk_job_role_class_id = jrc.id
        LEFT JOIN job_role jr ON jrc.fk_job_role_id = jr.id
        LEFT JOIN job_class jc ON jrc.fk_job_class_id = jc.id
        WHERE e.retirement_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 6 MONTH)
        ORDER BY e.retirement_date ASC
        LIMIT 5
      `),
      // Employment status
      con.query(`
        SELECT permanent_status, COUNT(*) AS count 
        FROM employee 
        GROUP BY permanent_status
      `),
      // Employees due for promotion (eligible based on time in current class)
      con.query(`
        SELECT 
          e.id, e.name_with_init AS name, e.photo,
          ec.current_class_promotion_date,
          TIMESTAMPDIFF(YEAR, ec.current_class_promotion_date, CURDATE()) AS years_in_class,
          jr.name AS jobRole, 
          jc.class_code AS jobClass,
          next_step.min_years_required
        FROM employee e
        JOIN employee_career ec ON e.id = ec.fk_emp_id AND ec.end_date IS NULL
        JOIN job_role_class jrc ON ec.fk_job_role_class_id = jrc.id
        JOIN job_role jr ON jrc.fk_job_role_id = jr.id
        JOIN job_class jc ON jrc.fk_job_class_id = jc.id
        JOIN promotion_path pp ON ec.fk_promotion_path_id = pp.id AND pp.is_active = 1
        JOIN promotion_path_step current_step ON pp.id = current_step.fk_promotion_path_id 
          AND ec.current_path_step = current_step.step_order
        JOIN promotion_path_step next_step ON pp.id = next_step.fk_promotion_path_id 
          AND next_step.step_order = current_step.step_order + 1
        WHERE ec.current_class_promotion_date IS NOT NULL
          AND ec.eb_exam_status != 'Not Done'
          AND ec.fk_promotion_path_id IS NOT NULL
          AND TIMESTAMPDIFF(YEAR, ec.current_class_promotion_date, CURDATE()) >= COALESCE(next_step.min_years_required, 0)
          ${promotionDateFilter.replace("pp.minimum_years", "COALESCE(next_step.min_years_required, 0)")}
        ORDER BY ec.current_class_promotion_date ASC
        LIMIT 10
      `),
      // Employees with salary increments (anniversary of current_class_promotion_date)
      con.query(`
        SELECT 
          e.id, e.name_with_init AS name, e.photo,
          ec.current_class_promotion_date,
          TIMESTAMPDIFF(YEAR, ec.current_class_promotion_date, CURDATE()) + 1 AS years_in_class,
          jr.name AS jobRole, 
          jc.class_code AS jobClass,
          ss.code AS salaryScale,
          sip.annual_increment
        FROM employee e
        JOIN employee_career ec ON e.id = ec.fk_emp_id AND ec.end_date IS NULL
        JOIN job_role_class jrc ON ec.fk_job_role_class_id = jrc.id
        JOIN job_role jr ON jrc.fk_job_role_id = jr.id
        JOIN job_class jc ON jrc.fk_job_class_id = jc.id
        LEFT JOIN salary_scale ss ON jrc.fk_salary_scale_id = ss.id
        LEFT JOIN salary_increment_phase sip ON ec.fk_current_salary_phase_id = sip.id
        WHERE ec.current_class_promotion_date IS NOT NULL
          ${incrementDateFilter}
        ORDER BY ec.current_class_promotion_date DESC
        LIMIT 10
      `),
    ]);

    // Process monthly registrations into chart-friendly format
    const monthlyData = {};
    const roles = new Set();

    monthlyRegistrationsResult[0].forEach((row) => {
      if (!monthlyData[row.month]) {
        monthlyData[row.month] = { month: row.monthLabel };
      }
      monthlyData[row.month][row.role] = row.count;
      roles.add(row.role);
    });

    // Fill in missing months with 0s
    const sortedMonths = Object.keys(monthlyData).sort();
    const chartData = sortedMonths.map((month) => {
      const data = monthlyData[month];
      roles.forEach((role) => {
        if (!data[role]) data[role] = 0;
      });
      return data;
    });

    res.status(200).json({
      success: true,
      stats: {
        admins: adminResult[0][0].count,
        employees: employeeResult[0][0].count,
        documents: documentsResult[0][0].count,
        jobRoles: jobRolesResult[0][0].count,
      },
      employeesByRoleGender: employeesByRoleGenderResult[0],
      employeesByClass: employeesByClassResult[0],
      monthlyRegistrations: {
        data: chartData,
        roles: Array.from(roles),
      },
      recentEmployees: recentEmployeesResult[0],
      upcomingRetirements: upcomingRetirementsResult[0],
      employmentStatus: employmentStatusResult[0],
      promotions: promotionsResult[0],
      salaryIncrements: incrementsResult[0],
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export { dashboardData };
