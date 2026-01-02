-- 1. SEED SUPER ADMIN
INSERT INTO users (id, email, password_hash, full_name, role, tenant_id, is_active)
VALUES (
    uuid_generate_v4(), 
    'superadmin@system.com', 
    -- 🛑 CRITICAL: This exact string is the bcrypt hash for 'Admin@123'
    '$2b$10$8IyGdVtY1CwDnuz9qYmxbuHBoAXBCMWaxDT2zXn6H9PWfZ1jBOE9u', 
    'System Super Admin', 
    'super_admin', 
    NULL, 
    true
) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 2. SEED SAMPLE TENANT
INSERT INTO tenants (id, name, subdomain, status, subscription_plan, max_users, max_projects)
VALUES (
    '9b326198-a580-4deb-9530-50ac4ed43cf2', 
    'Demo Company', 
    'demo', 
    'active', 
    'pro', 
    25, 
    15
) ON CONFLICT (id) DO NOTHING;

-- 3. SEED TENANT ADMIN (Mandatory: admin@demo.com)
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active)
VALUES (
    uuid_generate_v4(),
    '9b326198-a580-4deb-9530-50ac4ed43cf2', 
    'admin@demo.com', 
    '$2b$10$JemTVcs9Ps3E9Uz0/psQpewsGdaKlgLwie4R/PDu/t./h995770n.', -- Hash for Demo@123
    'Demo Admin', 
    'tenant_admin', 
    true
) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 4. SEED REGULAR USERS


-- 5. SEED PROJECTS
INSERT INTO projects (id, tenant_id, name, description, status) VALUES
('073d5938-14d2-46fe-b982-3229514b712e', '9b326198-a580-4deb-9530-50ac4ed43cf2', 'Project Alpha', 'First demo project', 'active'),
('b8459e82-da4c-4a30-a666-25af666a0a37', '9b326198-a580-4deb-9530-50ac4ed43cf2', 'Project Beta', 'Second demo project', 'active')
ON CONFLICT (id) DO NOTHING;

-- 6. SEED TASKS
-- Fixed IDs used to support conflict resolution
INSERT INTO tasks (id, project_id, tenant_id, title, priority, status) VALUES
('11111111-1111-1111-1111-111111111111', '073d5938-14d2-46fe-b982-3229514b712e', '9b326198-a580-4deb-9530-50ac4ed43cf2', 'Initial Setup', 'high', 'completed'),
('22222222-2222-2222-2222-222222222222', 'b8459e82-da4c-4a30-a666-25af666a0a37', '9b326198-a580-4deb-9530-50ac4ed43cf2', 'Final Review', 'medium', 'todo')
ON CONFLICT (id) DO NOTHING;