-- 1. SEED SUPER ADMIN
INSERT INTO users (id, email, password_hash, full_name, role, tenant_id, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'superadmin@system.com', 
    -- bcrypt hash for 'Admin@123'
    '$2b$10$8IyGdVtY1CwDnuz9qYmxbuHBoAXBCMWaxDT2zXn6H9PWfZ1jBOE9u', 
    'System Super Admin', 
    'super_admin', 
    NULL, 
    true
) ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

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
    '00000000-0000-0000-0000-000000000101',
    '9b326198-a580-4deb-9530-50ac4ed43cf2', 
    'admin@demo.com', 
    '$2b$10$JemTVcs9Ps3E9Uz0/psQpewsGdaKlgLwie4R/PDu/t./h995770n.', -- Hash for Demo@123
    'Demo Admin', 
    'tenant_admin', 
    true
) ON CONFLICT (tenant_id, email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 4. SEED REGULAR USERS
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active)
VALUES
    ('00000000-0000-0000-0000-000000000102', '9b326198-a580-4deb-9530-50ac4ed43cf2', 'user1@demo.com', '$2a$10$tn7tmGwUvkUudCkZ/pG9xO9Mub5n4tqt//.nFLD7ddORHQCtwtAUC', 'Demo User One', 'user', true),
    ('00000000-0000-0000-0000-000000000103', '9b326198-a580-4deb-9530-50ac4ed43cf2', 'user2@demo.com', '$2a$10$tn7tmGwUvkUudCkZ/pG9xO9Mub5n4tqt//.nFLD7ddORHQCtwtAUC', 'Demo User Two', 'user', true)
ON CONFLICT (tenant_id, email) DO UPDATE SET password_hash = EXCLUDED.password_hash;


-- 5. SEED PROJECTS
INSERT INTO projects (id, tenant_id, name, description, status, created_by) VALUES
('073d5938-14d2-46fe-b982-3229514b712e', '9b326198-a580-4deb-9530-50ac4ed43cf2', 'Project Alpha', 'First demo project', 'active', '00000000-0000-0000-0000-000000000101'),
('b8459e82-da4c-4a30-a666-25af666a0a37', '9b326198-a580-4deb-9530-50ac4ed43cf2', 'Project Beta', 'Second demo project', 'active', '00000000-0000-0000-0000-000000000101')
ON CONFLICT (id) DO NOTHING;

-- 6. SEED TASKS (5 tasks)
-- Fixed IDs used to support conflict resolution
INSERT INTO tasks (id, project_id, tenant_id, title, priority, status, assigned_to, due_date) VALUES
('11111111-1111-1111-1111-111111111111', '073d5938-14d2-46fe-b982-3229514b712e', '9b326198-a580-4deb-9530-50ac4ed43cf2', 'Initial Setup', 'high', 'completed', '00000000-0000-0000-0000-000000000102', CURRENT_DATE + INTERVAL '7 days'),
('22222222-2222-2222-2222-222222222222', 'b8459e82-da4c-4a30-a666-25af666a0a37', '9b326198-a580-4deb-9530-50ac4ed43cf2', 'Final Review', 'medium', 'todo', '00000000-0000-0000-0000-000000000103', CURRENT_DATE + INTERVAL '14 days'),
('33333333-3333-3333-3333-333333333333', '073d5938-14d2-46fe-b982-3229514b712e', '9b326198-a580-4deb-9530-50ac4ed43cf2', 'UI Mockups', 'high', 'in_progress', '00000000-0000-0000-0000-000000000103', CURRENT_DATE + INTERVAL '10 days'),
('44444444-4444-4444-4444-444444444444', 'b8459e82-da4c-4a30-a666-25af666a0a37', '9b326198-a580-4deb-9530-50ac4ed43cf2', 'API Integration', 'medium', 'todo', '00000000-0000-0000-0000-000000000102', CURRENT_DATE + INTERVAL '12 days'),
('55555555-5555-5555-5555-555555555555', '073d5938-14d2-46fe-b982-3229514b712e', '9b326198-a580-4deb-9530-50ac4ed43cf2', 'QA Testing', 'low', 'todo', NULL, CURRENT_DATE + INTERVAL '21 days')
ON CONFLICT (id) DO NOTHING;