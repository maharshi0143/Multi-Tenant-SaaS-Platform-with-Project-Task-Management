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

**Success Response (200):**
```json
{ "success": true, "message": "Tenant updated successfully" }
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

### 4.3 Update Project
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

### 4.4 Delete Project
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
