    -- ENABLE UUID SUPPORT
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- 1. CREATE ENUM TYPES (MANDATORY REQUIREMENT)
    CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'trial');
    CREATE TYPE subscription_plan AS ENUM ('free', 'pro', 'enterprise');
    CREATE TYPE user_role AS ENUM ('super_admin', 'tenant_admin', 'user');
    CREATE TYPE project_status AS ENUM ('active', 'archived', 'completed');
    CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'completed');
    CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');

    -- 2. TENANTS TABLE
    CREATE TABLE tenants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        subdomain VARCHAR(255) UNIQUE NOT NULL,
        status tenant_status DEFAULT 'trial', -- Requirement: Use ENUM
        subscription_plan subscription_plan DEFAULT 'free', -- Requirement: Use ENUM
        max_users INTEGER DEFAULT 5,
        max_projects INTEGER DEFAULT 3,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. USERS TABLE
    CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- Requirement: CASCADE
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role user_role NOT NULL, -- Requirement: Use ENUM
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, email) -- Requirement: Unique per tenant
    );
    CREATE INDEX idx_users_tenant_id ON users(tenant_id);

    -- 4. PROJECTS TABLE
    CREATE TABLE projects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status project_status DEFAULT 'active', -- Requirement: Use ENUM
        created_by UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
    );
    CREATE INDEX idx_projects_tenant_id ON projects(tenant_id); -- Requirement: Index

    -- 5. TASKS TABLE
    CREATE TABLE tasks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status task_status DEFAULT 'todo', -- Requirement: Use ENUM
        priority task_priority DEFAULT 'medium', -- Requirement: Use ENUM
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        due_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX idx_tasks_tenant_project ON tasks(tenant_id, project_id); -- Requirement: Composite Index

    -- 6. AUDIT LOGS TABLE
    CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(100), -- e.g., 'user', 'project', 'task'
        entity_id UUID,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 7. SESSIONS TABLE (OPTIONAL - Only needed if not JWT-only)
    CREATE TABLE sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX idx_sessions_token ON sessions(token); -- Requirement: Index