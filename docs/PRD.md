# Product Requirements Document (PRD)

## 1. User Personas

### 1.1 Super Admin
*   **Role Description**: System-level administrator with unrestricted access to all tenants and system configurations.
*   **Key Responsibilities**:
    *   Monitor overall system health and tenant activity.
    *   Manage tenant subscriptions and status (suspend/activate).
    *   Oversee platform-wide metrics.
*   **Goals**: Ensure payment compliance, maintain system stability, and handle tenant-level support requests.
*   **Pain Points**: Use of multiple tools to manage accounts; lack of visibility into "who is using what."

### 1.2 Tenant Admin
*   **Role Description**: Administrator for a specific organization (Tenant).
*   **Key Responsibilities**:
    *   Onboard and offboard team members (users).
    *   Assign roles and permissions within the organization.
    *   Create and manage projects.
*   **Goals**: Efficiently manage team productivity, ensure data security within their org, and organize workflows.
*   **Pain Points**: Difficulty tracking which user has access to which project; hitting plan limits unexpectedly.

### 1.3 End User (Team Member)
*   **Role Description**: Regular employee or contractor working within a tenant organization.
*   **Key Responsibilities**:
    *   Complete assigned tasks on time.
    *   Update task statuses and add comments.
    *   Collaborate on projects.
*   **Goals**: Clear view of assigned work ("My Tasks"), minimal friction in updating status, mobile access.
*   **Pain Points**: Cluttered interfaces, unclear deadlines, notification overload.

---

## 2. Functional Requirements

### 2.1 Authentication Module
*   **FR-001**: The system shall allow new tenants to register by providing an Organization Name, unique Subdomain, and Admin details.
*   **FR-002**: The system shall authenticate users via Email and Password, returning a JWT token valid for 24 hours.
*   **FR-003**: The system shall prohibit users from logging in if their associated Tenant account is suspended.
*   **FR-004**: The system shall allow users to log out, invalidating their client-side session.

### 2.2 Tenant Management Module
*   **FR-005**: The system shall allow the Super Admin to view a paginated list of all registered tenants.
*   **FR-006**: The system shall allow the Super Admin to update a tenant's status (Active/Suspended) and Subscription Plan.
*   **FR-007**: The system shall allow Tenant Admins to view their own organization's subscription details and usage limits.

### 2.3 User Management Module
*   **FR-008**: The system shall allow Tenant Admins to invite/create new users, enforcing the max-user limit of their subscription plan.
*   **FR-009**: The system shall allow Tenant Admins to deactivate or delete users from their organization.
*   **FR-010**: The system shall prevent a Tenant Admin from deleting their own account to avoid orphaned tenants.

### 2.4 Project Management Module
*   **FR-011**: The system shall allow users to create new Projects, enforcing the max-project limit of their subscription plan.
*   **FR-012**: The system shall allow users to filter Projects by status (Active, Archived, Completed) and search by name.
*   **FR-013**: The system shall support "soft delete" or related data cleanup (cascading delete of tasks) when a Project is deleted.

### 2.5 Task Management Module
*   **FR-014**: The system shall allow users to create Tasks within a Project, assigning them to a specific team member.
*   **FR-015**: The system shall allow users to update the Status (Todo -> In Progress -> Completed) and Priority of a task.
*   **FR-016**: The system shall allow users to view a list of "My Tasks" assigned specifically to them across all projects.

---

## 3. Non-Functional Requirements

### 3.1 Security
*   **NFR-001**: All user passwords must be hashed using Bcrypt (salt rounds >= 10) before storage.
*   **NFR-002**: All API endpoints (except Auth) must strictly validate the `tenant_id` from the JWT token to ensure data isolation.

### 3.2 Performance
*   **NFR-003**: API response time for read operations (e.g., getting tasks) should not exceed 200ms for the 95th percentile under normal load.
*   **NFR-004**: Database queries filtering by `tenant_id` must use database indexes to ensure scalability.

### 3.3 Availability & Reliability
*   **NFR-005**: The system must expose a `/api/health` endpoint for container orchestration health checks.
*   **NFR-006**: Critical operations (like Tenant Registration) must be wrapped in Database Transactions to insure atomicity.

### 3.4 Usability
*   **NFR-007**: The Frontend application must be responsive, adapting layout for Desktop, Tablet, and Mobile viewports.