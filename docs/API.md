# API Documentation

This document outlines the API endpoints for the **SaaS Platform**. All API responses follow a consistent format:
```json
{
  "success": true,
  "message": "Optional message",
  "data": { ... }
}
```

## Base URL
`http://localhost:5000/api`

---

## 1. Authentication Module

### 1.1 Tenant Registration
**POST** `/auth/register-tenant`  
**Auth**: None (Public)  
**Description**: Register a new tenant organization and its first admin user.

**Request Body:**
```json
{
  "tenantName": "Acme Corp",
  "subdomain": "acme",
  "adminEmail": "admin@acme.com",
  "adminPassword": "SecurePassword123",
  "adminFullName": "John Doe"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Tenant registered successfully",
  "data": {
    "tenantId": "uuid",
    "subdomain": "acme",
    "adminUser": { "id": "uuid", "email": "admin@acme.com", "fullName": "John Doe", "role": "tenant_admin" }
  }
}
```

### 1.2 User Login
**POST** `/auth/login`  
**Auth**: None (Public)  
**Description**: Authenticate a user. Requires `tenantSubdomain` for regular users.

**Request Body:**
```json
{
  "email": "user@acme.com",
  "password": "UserPassword123",
  "tenantSubdomain": "acme" 
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "role": "user", "tenantId": "uuid" },
    "token": "jwt-token-string",
    "expiresIn": 86400
  }
}
```

### 1.3 Get Current User
**GET** `/auth/me`  
**Auth**: Bearer Token  
**Description**: Get details of the currently authenticated user.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@acme.com",
    "tenant": { "name": "Acme Corp", "subscriptionPlan": "pro" }
  }
}
```

### 1.4 Logout
**POST** `/auth/logout`  
**Auth**: Bearer Token  
**Description**: Logs out the user (client should discard token).

**Success Response (200):**
```json
{ "success": true, "message": "Logged out successfully" }
```

### 1.5 Forgot Password
**POST** `/auth/forgot-password`
**Auth**: None (Public)
**Description**: Sends a password reset link to the user's email.

**Request Body:**
```json
{ "email": "user@acme.com" }
```

**Success Response (200):**
```json
{ "success": true, "message": "Reset link sent to your registered email." }
```


---

## 2. Tenant Management Module

### 2.1 Get Tenant Details
**GET** `/tenants/:tenantId`  
**Auth**: Bearer Token (User must belong to tenant OR be Super Admin)  
**Description**: Get detailed information and stats about a tenant.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Acme Corp",
    "subscriptionPlan": "pro",
    "stats": { "totalUsers": 10, "totalProjects": 5 }
  }
}
```

### 2.2 Update Tenant
**PUT** `/tenants/:tenantId`  
**Auth**: Bearer Token (Tenant Admin or Super Admin)  
**Description**: Update tenant details. Tenant Admins can only update `name`.

**Request Body:**
```json
{ "name": "Acme Corporation Global" }
```

{ "success": true, "message": "Tenant updated successfully" }
```

### 2.4 Upgrade Tenant Subscription
**POST** `/tenants/upgrade`
**Auth**: Bearer Token (Tenant Admin)
**Description**: Upgrade the tenant's subscription plan.

**Request Body:**
```json
{ "plan": "pro" }
```

**Success Response (200):**
```json
{ "success": true, "message": "Subscription upgraded successfully" }
```


### 2.3 List All Tenants (Super Admin)
**GET** `/tenants`  
**Auth**: Bearer Token (Super Admin ONLY)  
**Description**: List all registered tenants with pagination.

**Query Params**: `page`, `limit`, `status`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "tenants": [ ... ],
    "pagination": { "currentPage": 1, "totalPages": 5 }
  }
}
```

---

## 3. User Management Module

### 3.1 Add User to Tenant
**POST** `/tenants/:tenantId/users`  
**Auth**: Bearer Token (Tenant Admin)  
**Description**: Create a new user in the tenant.

**Request Body:**
```json
{
  "email": "newuser@acme.com",
  "password": "Password123",
  "fullName": "Jane Doe",
  "role": "user"
}
```

**Success Response (201):**
```json
{ "success": true, "message": "User created successfully", "data": { "id": "uuid" } }
```

### 3.2 List Tenant Users
**GET** `/tenants/:tenantId/users`  
**Auth**: Bearer Token (User in Tenant)  
**Description**: List all users in the tenant.

**Success Response (200):**
```json
{
  "success": true,
  "data": { "users": [ ... ], "total": 15 }
}
```

### 3.3 Update User
**PUT** `/users/:userId`  
**Auth**: Bearer Token (Tenant Admin)  
**Description**: Update user details.

**Request Body:**
```json
{ "fullName": "Jane Smith", "role": "tenant_admin" }
```

**Success Response (200):**
```json
{ "success": true, "message": "User updated successfully" }
```

### 3.4 Delete User
**DELETE** `/users/:userId`  
**Auth**: Bearer Token (Tenant Admin)  
**Description**: Remove a user from the tenant.

**Success Response (200):**
```json
{ "success": true, "message": "User account has been removed" }
```

---

## 4. Project Management Module

### 4.1 Create Project
**POST** `/projects`  
**Auth**: Bearer Token  
**Description**: Create a new project. Checks subscription limits.

**Request Body:**
```json
{ "name": "Website Redesign", "description": "Q3 Redesign" }
```

**Success Response (201):**
```json
{ "success": true, "data": { "id": "uuid", "name": "Website Redesign" } }
```

### 4.2 List Projects
**GET** `/projects`  
**Auth**: Bearer Token  
**Description**: List all projects for the current tenant.

**Query Params**: `status`, `search`, `page`

**Success Response (200):**
```json
{ "success": true, "data": { "projects": [ ... ] } }
```

### 4.3 Get Project Details
**GET** `/projects/:projectId`
**Auth**: Bearer Token
**Description**: Get detailed information about a specific project, including its tasks.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Website Redesign",
    "tasks": [ ... ]
  }
}
```

### 4.4 Update Project
**PUT** `/projects/:projectId`  
**Auth**: Bearer Token (Creator or Tenant Admin)  
**Description**: Update project details.

**Request Body:**
```json
{ "status": "completed" }
```

**Success Response (200):**
```json
{ "success": true, "message": "Project updated successfully" }
```

### 4.5 Delete Project
**DELETE** `/projects/:projectId`  
**Auth**: Bearer Token (Creator or Tenant Admin)  
**Description**: Delete a project and its tasks.

**Success Response (200):**
```json
{ "success": true, "message": "Project deleted successfully" }
```

---

## 5. Task Management Module

### 5.1 Create Task
**POST** `/projects/:projectId/tasks`  
**Auth**: Bearer Token  
**Description**: Add a task to a project.

**Request Body:**
```json
{
  "title": "Design Mockups",
  "priority": "high",
  "dueDate": "2024-12-31",
  "assignedTo": "user-uuid"
}
```

**Success Response (201):**
```json
{ "success": true, "data": { "id": "uuid", "title": "Design Mockups" } }
```

### 5.2 List Project Tasks
**GET** `/projects/:projectId/tasks`  
**Auth**: Bearer Token  
**Description**: Get all tasks for a specific project.

**Success Response (200):**
```json
{ "success": true, "data": { "tasks": [ ... ] } }
```

### 5.3 Update Task Status
**PATCH** `/tasks/:taskId/status`  
**Auth**: Bearer Token  
**Description**: Quickly update task status.

**Request Body:**
```json
{ "status": "in_progress" }
```

**Success Response (200):**
```json
{ "success": true, "data": { "status": "in_progress" } }
```

### 5.4 Update Task
**PUT** `/tasks/:taskId`  
**Auth**: Bearer Token  
**Description**: Update all task fields.

**Request Body:**
```json
{ "title": "Final Designs", "priority": "medium" }
```

**Success Response (200):**
```json
{ "success": true, "message": "Task updated successfully" }
```


### 5.5 Delete Task
**DELETE** `/tasks/:taskId`
**Auth**: Bearer Token
**Description**: Permanently remove a task.

**Success Response (200):**
```json
{ "success": true, "message": "Task deleted" }
```

### 5.6 List All Tasks
**GET** `/tasks`
**Auth**: Bearer Token
**Description**: List all tasks for the tenant, with optional filters.

**Query Params**: `assignedTo`, `status`, `priority`, `search`, `page`, `limit`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "tasks": [ ... ],
    "total": 50,
    "pagination": { "page": 1, "totalPages": 5 }
  }
}
```

---

## 6. Audit Logs Module

### 6.1 Get Audit Logs
**GET** `/audit`
**Auth**: Bearer Token
**Description**: View audit history for the tenant.

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "action": "LOGIN",
      "entity_type": "user",
      "userName": "John Doe",
      "created_at": "timestamp"
    }
  ]
}
```

---

## 7. Dashboard Module

### 7.1 Get Dashboard Stats
**GET** `/dashboard/stats`
**Auth**: Bearer Token
**Description**: Get high-level statistics for the dashboard. Response varies for Super Admin vs Tenant User.

**Success Response (200) - Tenant User:**
```json
{
  "success": true,
  "data": {
    "totalProjects": 5,
    "totalTasks": 20,
    "completedTasks": 15,
    "pendingTasks": 5
  }
}
```

**Success Response (200) - Super Admin:**
```json
{
  "success": true,
  "data": {
    "totalTenants": 10,
    "totalProjects": 50,
    "totalUsers": 100,
    "totalTasks": 500
  }
}
```

