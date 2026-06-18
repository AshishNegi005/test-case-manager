require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./database');

const seed = async () => {
  console.log('Seeding database...');

  const password = await bcrypt.hash('Test@1234', 12);

  // Create demo users
  const adminRes = await db.query(`
    INSERT INTO users (username, email, password, role)
    VALUES ('admin', 'admin@demo.com', $1, 'admin')
    ON CONFLICT (email) DO UPDATE SET role = 'admin', password = $1
    RETURNING id
  `, [password]);

  const leadRes = await db.query(`
    INSERT INTO users (username, email, password, role)
    VALUES ('testlead', 'testlead@demo.com', $1, 'test-lead')
    ON CONFLICT (email) DO UPDATE SET role = 'test-lead', password = $1
    RETURNING id
  `, [password]);

  const testerRes = await db.query(`
    INSERT INTO users (username, email, password, role)
    VALUES ('tester', 'tester@demo.com', $1, 'tester')
    ON CONFLICT (email) DO UPDATE SET role = 'tester', password = $1
    RETURNING id
  `, [password]);

  const readonlyRes = await db.query(`
    INSERT INTO users (username, email, password, role)
    VALUES ('readonly', 'readonly@demo.com', $1, 'read-only')
    ON CONFLICT (email) DO UPDATE SET role = 'read-only', password = $1
    RETURNING id
  `, [password]);

  const adminId = adminRes.rows[0].id;
  const leadId = leadRes.rows[0].id;
  const testerId = testerRes.rows[0].id;
  const readonlyId = readonlyRes.rows[0].id;

  // Create a demo project
  const projRes = await db.query(`
    INSERT INTO projects (name, description, version, status, created_by)
    VALUES ('E-Commerce Platform', 'Testing for main e-commerce web app', 'v2.1.0', 'active', $1)
    ON CONFLICT DO NOTHING
    RETURNING id
  `, [adminId]);

  if (projRes.rows.length === 0) {
    console.log('Demo data already seeded, skipping...');
    process.exit(0);
  }

  const projectId = projRes.rows[0].id;

  // Assign members
  await db.query(`INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,'admin') ON CONFLICT DO NOTHING`, [projectId, adminId]);
  await db.query(`INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,'test-lead') ON CONFLICT DO NOTHING`, [projectId, leadId]);
  await db.query(`INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,'tester') ON CONFLICT DO NOTHING`, [projectId, testerId]);
  await db.query(`INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,'read-only') ON CONFLICT DO NOTHING`, [projectId, readonlyId]);

  // Create test suite
  const suiteRes = await db.query(`
    INSERT INTO test_suites (project_id, name, description, created_by)
    VALUES ($1, 'Login & Auth Suite', 'All authentication related test cases', $2)
    RETURNING id
  `, [projectId, adminId]);

  const suiteId = suiteRes.rows[0].id;

  // Create test cases
  const testCases = [
    { title: 'Valid Login', description: 'Verify login with valid credentials', priority: 'critical', type: 'functional', tags: ['auth','login'] },
    { title: 'Invalid Password', description: 'Verify error on wrong password', priority: 'high', type: 'functional', tags: ['auth','security'] },
    { title: 'SQL Injection in Login', description: 'Test SQL injection prevention', priority: 'critical', type: 'functional', tags: ['security'] },
    { title: 'Product Search', description: 'Search products by keyword', priority: 'high', type: 'ui', tags: ['search','product'] },
    { title: 'Add to Cart', description: 'Add item to shopping cart', priority: 'high', type: 'functional', tags: ['cart','checkout'] },
    { title: 'Checkout Flow', description: 'Complete purchase flow end to end', priority: 'critical', type: 'regression', tags: ['checkout','payment'] },
    { title: 'API - Get Products', description: 'GET /api/products returns 200', priority: 'medium', type: 'api', tags: ['api','products'] },
    { title: 'API - Create Order', description: 'POST /api/orders creates order', priority: 'high', type: 'api', tags: ['api','orders'] },
    { title: 'Mobile Responsive', description: 'Check responsive design on mobile', priority: 'medium', type: 'ui', tags: ['mobile','ui'] },
    { title: 'Load Testing', description: 'Performance under 1000 concurrent users', priority: 'high', type: 'integration', tags: ['performance'] },
  ];

  const caseIds = [];
  for (const tc of testCases) {
    const res = await db.query(`
      INSERT INTO test_cases (project_id, title, description, priority, type, tags, created_by, assigned_to)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [projectId, tc.title, tc.description, tc.priority, tc.type, tc.tags, adminId, testerId]);

    const caseId = res.rows[0].id;
    caseIds.push(caseId);

    await db.query(`
      INSERT INTO test_steps (test_case_id, step_number, action, expected_result)
      VALUES ($1, 1, 'Navigate to login page', 'Login page is displayed'),
             ($1, 2, 'Enter valid credentials', 'Fields accept input'),
             ($1, 3, 'Click Submit', 'User is redirected to dashboard')
    `, [caseId]);
  }

  // Link first 5 cases to suite
  for (const caseId of caseIds.slice(0, 5)) {
    await db.query(`INSERT INTO test_suite_cases (suite_id, test_case_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [suiteId, caseId]);
  }

  // Create sample executions
  const statuses = ['pass', 'fail', 'pass', 'pass', 'blocked', 'pass', 'fail', 'pass', 'skipped', 'pass'];
  for (let i = 0; i < caseIds.length; i++) {
    await db.query(`
      INSERT INTO test_executions (test_case_id, project_id, suite_id, executed_by, status, comments, executed_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${i} days')
    `, [caseIds[i], projectId, suiteId, testerId, statuses[i], `Execution comment for test case ${i + 1}`]);
  }

  // Create a second project
  const proj2Res = await db.query(`
    INSERT INTO projects (name, description, version, status, created_by)
    VALUES ('Mobile Banking App', 'QA for mobile banking application', 'v1.5.2', 'active', $1)
    RETURNING id
  `, [adminId]);

  const project2Id = proj2Res.rows[0].id;
  await db.query(`INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,'admin') ON CONFLICT DO NOTHING`, [project2Id, adminId]);
  await db.query(`INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,'test-lead') ON CONFLICT DO NOTHING`, [project2Id, leadId]);

  console.log('\nDemo credentials:');
  console.log('Admin:     admin@demo.com / Test@1234');
  console.log('Test Lead: testlead@demo.com / Test@1234');
  console.log('Tester:    tester@demo.com / Test@1234');
  console.log('Read-Only: readonly@demo.com / Test@1234');
  console.log('\nSeeding completed!');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
