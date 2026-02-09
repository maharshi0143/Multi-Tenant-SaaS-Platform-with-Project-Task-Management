-- UP
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'trial');
CREATE TYPE subscription_plan AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE user_role AS ENUM ('super_admin', 'tenant_admin', 'user');
CREATE TYPE project_status AS ENUM ('active', 'archived', 'completed');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'completed');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');

-- DOWN
-- DROP TYPE IF EXISTS task_priority;
-- DROP TYPE IF EXISTS task_status;
-- DROP TYPE IF EXISTS project_status;
-- DROP TYPE IF EXISTS user_role;
-- DROP TYPE IF EXISTS subscription_plan;
-- DROP TYPE IF EXISTS tenant_status;
