-- This script sets up the database schema for the Automated Test Orchestrator.
-- Version: 6.0
-- Table: test_plans
-- Stores the master record for a single orchestration session.
CREATE TABLE test_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50) NOT NULL DEFAULT 'COMPONENT',
    status VARCHAR(50) NOT NULL,
    failure_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: test_plan_entry_points
-- Stores the initial component(s) used to define a test plan.
CREATE TABLE test_plan_entry_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_plan_id UUID NOT NULL,
    component_id VARCHAR(255) NOT NULL,
    CONSTRAINT fk_test_plan FOREIGN KEY(test_plan_id) REFERENCES test_plans(id) ON DELETE CASCADE
);

-- Table: plan_components
-- Stores a record of each component associated with a test plan, whether directly specified or discovered via dependency analysis.
CREATE TABLE plan_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_plan_id UUID NOT NULL,
    source_type VARCHAR(50) NOT NULL DEFAULT 'DISCOVERED',
    component_id VARCHAR(255) NOT NULL,
    component_name VARCHAR(255),
    component_type VARCHAR(255),
    CONSTRAINT fk_test_plan FOREIGN KEY(test_plan_id) REFERENCES test_plans(id) ON DELETE CASCADE
);

-- Table: mappings
-- A persistent lookup table that maps a production component to its corresponding test component.
CREATE TABLE mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    main_component_id VARCHAR(255) NOT NULL,
    main_component_name VARCHAR(255),
    test_component_id VARCHAR(255) NOT NULL,
    test_component_name VARCHAR(255),
    is_deployed BOOLEAN DEFAULT FALSE,
    is_packaged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_mapping UNIQUE (main_component_id, test_component_id)
);

-- Table: test_execution_results
-- Stores the result of each individual test run.
CREATE TABLE test_execution_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_plan_id UUID NOT NULL,
    plan_component_id UUID NOT NULL,
    test_component_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    message TEXT,
    test_cases JSONB,
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_test_plan FOREIGN KEY(test_plan_id) REFERENCES test_plans(id) ON DELETE CASCADE,
    CONSTRAINT fk_plan_component FOREIGN KEY(plan_component_id) REFERENCES plan_components(id) ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX idx_plan_components_test_plan_id ON plan_components(test_plan_id);

CREATE INDEX idx_test_execution_results_test_plan_id ON test_execution_results(test_plan_id);

CREATE INDEX idx_test_plan_entry_points_test_plan_id ON test_plan_entry_points(test_plan_id);

-- Table: roles
-- Defines the available roles in the system.
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table: permissions
-- Defines granular permissions available in the system.
CREATE TABLE permissions (
    id VARCHAR(100) PRIMARY KEY,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table: role_permissions
-- Join table connecting Roles to Permissions (Many-to-Many).
CREATE TABLE role_permissions (
    role_id UUID NOT NULL,
    permission_id VARCHAR(100) NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_permission FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Table: users
-- Stores user accounts and their role assignment.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    token_version INT DEFAULT 0,
    role_id UUID,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_role FOREIGN KEY(role_id) REFERENCES roles(id)
);

-- Table: refresh_tokens
-- Stores long-lived refresh tokens for session management.
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    replaced_by VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_refresh_token_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- Seed Data: Roles, Permissions & Admin User
-- =============================================
INSERT INTO
    roles (name, description)
VALUES
    ('ADMIN', 'Full system access'),
    ('DEVELOPER', 'Can create and execute test plans'),
    ('VIEWER', 'Read-only access to results');

INSERT INTO
    permissions (id, description)
VALUES
    ('users:read', 'View user list'),
    ('users:write', 'Manage users'),
    ('test-plans:read', 'View test plans'),
    (
        'test-plans:write',
        'Create and modify test plans'
    ),
    ('test-plans:execute', 'Run test executions');

INSERT INTO
    role_permissions (role_id, permission_id)
VALUES
    ('ADMIN', 'users:read'),
    ('ADMIN', 'users:write'),
    ('ADMIN', 'test-plans:read'),
    ('ADMIN', 'test-plans:write'),
    ('ADMIN', 'test-plans:execute'),
    ('DEVELOPER', 'test-plans:read'),
    ('DEVELOPER', 'test-plans:write'),
    ('DEVELOPER', 'test-plans:execute'),
    ('VIEWER', 'test-plans:read');

-- Default Admin User (Password: "admin", Hash: $2b$10$w3/eF5bH7L.x.x.x.x.x.x.x.x (This is an example bcrypt hash for 'admin'))
-- Using a dummy hash for now as explained in the prompt.
INSERT INTO
    users (email, password_hash, name, role_id)
VALUES
    (
        'admin@example.com',
        '$2b$10$YourGeneratedHashHereOrUseACLICommandToGenerate',
        'System Admin',
        'ADMIN'
    );