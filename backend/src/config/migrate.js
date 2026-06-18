require('dotenv').config();
const db = require('./database');

const migrate = async () => {
  console.log('Running migrations...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'tester' CHECK (role IN ('admin','test-lead','tester','read-only')),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      version VARCHAR(20),
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS project_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(20) DEFAULT 'tester',
      assigned_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(project_id, user_id)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS test_suites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_test_suites_project ON test_suites(project_id);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS test_cases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
      type VARCHAR(30) DEFAULT 'functional' CHECK (type IN ('functional','integration','regression','smoke','ui','api')),
      preconditions TEXT,
      postconditions TEXT,
      tags TEXT[],
      status VARCHAR(20) DEFAULT 'active',
      created_by UUID REFERENCES users(id),
      assigned_to UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_test_cases_project ON test_cases(project_id);
    CREATE INDEX IF NOT EXISTS idx_test_cases_priority ON test_cases(priority);
    CREATE INDEX IF NOT EXISTS idx_test_cases_type ON test_cases(type);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS test_steps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
      step_number INTEGER NOT NULL,
      action TEXT NOT NULL,
      expected_result TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_test_steps_case ON test_steps(test_case_id);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS test_suite_cases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      suite_id UUID REFERENCES test_suites(id) ON DELETE CASCADE,
      test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
      added_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(suite_id, test_case_id)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS test_executions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      suite_id UUID REFERENCES test_suites(id) ON DELETE SET NULL,
      executed_by UUID REFERENCES users(id),
      status VARCHAR(20) NOT NULL CHECK (status IN ('pass','fail','blocked','skipped','pending')),
      comments TEXT,
      defect_id VARCHAR(100),
      defect_description TEXT,
      executed_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_executions_project ON test_executions(project_id);
    CREATE INDEX IF NOT EXISTS idx_executions_testcase ON test_executions(test_case_id);
    CREATE INDEX IF NOT EXISTS idx_executions_status ON test_executions(status);
    CREATE INDEX IF NOT EXISTS idx_executions_date ON test_executions(executed_at);
  `);

  // Comments on test cases
  await db.query(`
    CREATE TABLE IF NOT EXISTS test_case_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      comment TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_comments_case ON test_case_comments(test_case_id);
  `);

  // Test case version history
  await db.query(`
    CREATE TABLE IF NOT EXISTS test_case_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      title VARCHAR(255),
      description TEXT,
      priority VARCHAR(20),
      type VARCHAR(30),
      preconditions TEXT,
      postconditions TEXT,
      tags TEXT[],
      steps JSONB,
      changed_by UUID REFERENCES users(id),
      change_reason VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_versions_case ON test_case_versions(test_case_id);
  `);

  // CI/CD API keys
  await db.query(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      key_prefix VARCHAR(10) NOT NULL,
      key_hash VARCHAR(255) NOT NULL,
      created_by UUID REFERENCES users(id),
      is_active BOOLEAN DEFAULT true,
      last_used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_api_keys_project ON api_keys(project_id);
  `);

  // Test run scheduling
  await db.query(`
    CREATE TABLE IF NOT EXISTS scheduled_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      suite_id UUID REFERENCES test_suites(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      cron_expression VARCHAR(50) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      last_run_at TIMESTAMP,
      next_run_at TIMESTAMP,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_schedules_project ON scheduled_runs(project_id);
  `);

  console.log('Migrations completed successfully!');
  process.exit(0);
};

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
