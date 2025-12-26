# Research Document: Multi-Tenant SaaS Architecture

## 1. Multi-Tenancy Analysis
Multi-tenancy is the architectural approach where a single instance of software serves multiple tenants (customers). For this SaaS platform, we evaluated three primary database isolation patterns to determine the optimal balance between cost, complexity, and security.

### Comparison of Approaches

| Architecture Pattern | Description | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **1. Shared Database + Shared Schema** | All tenants share the same database and tables. A `tenant_id` column is added to every table to associate records with a specific tenant. | • **Lowest Cost**: Uses a single database instance, minimizing infrastructure overhead.<br>• **Easiest Maintenance**: Schema updates are applied once for all tenants.<br>• **Resource Efficiency**: Optimal connection pooling and resource utilization. | • **Complex Isolation**: Requires strict application-level filtering (developer error can lead to data leaks).<br>• **Noisy Neighbor Risk**: Heavy usage by one tenant can degrade performance for others.<br>• **Backup Complexity**: Difficult to backup/restore a SINGLE tenant's data. |
| **2. Shared Database + Separate Schema** | All tenants share one database, but each tenant has their own schema (namespace) with identical tables. | • **Better Security**: Database-level isolation prevents accidental data leaks in SQL queries.<br>• **Customizability**: Easier to offer custom columns/tables for premium tenants.<br>• **Manageable Backups**: Easier to backup specific schemas. | • **Migration Overhead**: Schema migrations must run N times (once per tenant).<br>• **Connection Limits**: High number of metadata objects can strain the database server.<br>• **Complexity**: Application must switch search paths dynamically. |
| **3. Separate Database** | Each tenant has their own dedicated database instance. | • **Maximum Security**: Physical isolation of data.<br>• **Fault Isolation**: Failure in one DB doesn't affect others.<br>• **Scalability**: Can host large enterprise tenants on dedicated hardware. | • **Highest Cost**: High infrastructure and licensing costs.<br>• **Operational Nightmare**: Managing, monitoring, and updating hundreds of databases is resource-intensive.<br>• **Resource Waste**: aggregated resource usage is inefficient. |

### Justification of Chosen Approach: Shared Database + Shared Schema
We selected the **Shared Database, Shared Schema** approach for the following reasons:
1.  **Project Scope & Simplicity**: For a project management SaaS, the data structure is uniform across tenants. The complexity of managing separate schemas or databases outweighs the benefits for this use case.
2.  **Infrastructure Efficiency**: Running a single PostgreSQL instance reduces cost and is ideal for deployment in containerized environments (Docker).
3.  **Application-Level Security**: Since we are using a robust backend framework (Node.js/Express) with middleware, we can effectively enforce isolation by injecting `tenant_id` into every query based on the validated JWT, mitigating the primary risk of data leakage.

---

## 2. Technology Stack Justification

### Backend: Node.js & Express
*   **Reasoning**: Node.js was chosen for its non-blocking, event-driven architecture, which handles concurrent I/O operations (like API requests) efficiently. Express.js provides a minimalist yet flexible framework for building RESTful APIs.
*   **Alternatives Considered**: Python (Django/Flask) or Java (Spring Boot) were considered. However, using JavaScript on both frontend and backend enables code reuse (utilities, types) and allows a single developer to move seamlessly between stacks.

### Frontend: React.js
*   **Reasoning**: React's component-based architecture is ideal for building dynamic dashboards where state changes frequently (e.g., moving tasks, real-time status updates). The Virtual DOM ensures high performance.
*   **Alternatives Considered**: Vue.js or Angular. React was preferred due to its massive ecosystem, excellent documentation, and the availability of high-quality UI libraries.

### Database: PostgreSQL
*   **Reasoning**: PostgreSQL is the industry standard for open-source relational databases. It offers strong ACID compliance, robust support for JSON data types (useful for audit logs or flexible metadata), and reliable foreign key constraints which are critical for maintaining data integrity in a multi-tenant system.
*   **Alternatives Considered**: MongoDB (NoSQL) was considered for flexibility, but a relational model better suits the strictly structured data of users, projects, and tasks with their mandatory relationships.

### Authentication: JSON Web Tokens (JWT)
*   **Reasoning**: JWT provides a stateless authentication mechanism. The server does not need to query a session table for every request, reducing database load. The token payload serves as a secure, tamper-proof vessel for carrying the user's `tenant_id` and `role`, simplifying authorization checks.
*   **Security**: We enforce a short expiry (24 hours) to mitigate the risks associated with token theft.

### Containerization: Docker
*   **Reasoning**: Docker ensures consistency across development, testing, and production environments. By defining the application and its dependencies (Database, Backend, Frontend) in code (`docker-compose.yml`), we eliminate "it works on my machine" issues and enable one-command deployment.

---

## 3. Security Considerations
Implementing a multi-tenant architecture requires a "defense in depth" strategy. We have implemented the following five layers of security:

1.  **Strict Data Isolation (Tenant Context)**
    *   **Strategy**: Every sensitive database table (`projects`, `tasks`, `users`) includes a mandatory `tenant_id` column.
    *   **Implementation**: Authorization middleware extracts the `tenant_id` from the secure JWT payload and appends it to every database query (e.g., `WHERE tenant_id = $1`). Accessing data without a valid tenant context is impossible at the API level.

2.  **Secure Authentication & Authorization (RBAC)**
    *   **Strategy**: We use a Role-Based Access Control system with three distinct levels: `Super Admin`, `Tenant Admin`, and `User`.
    *   **Implementation**: Middleware functions (`authorizeRole`) verify strict permissions before a controller action is executed. For example, only a `Tenant Admin` can add users to their organization.

3.  **Password Security (Hashing)**
    *   **Strategy**: Plain text passwords are never stored. In the event of a database compromise, user credentials must remain protected.
    *   **Implementation**: We use **Bcrypt** with a work factor (salt rounds) of 10. This makes brute-force attacks computationally expensive and renders rainbow table attacks ineffective.

4.  **API Security Headers & CORS**
    *   **Strategy**: Prevent common web vulnerabilities like Cross-Site Scripting (XSS) and Clickjacking.
    *   **Implementation**: We configure **CORS** (Cross-Origin Resource Sharing) to explicitly whitelist only trusted frontend domains (e.g., `http://localhost:3000` or the Docker service name). `Helmet` middleware is used to set secure HTTP headers (Strict-Transport-Security, X-Frame-Options).

5.  **Input Validation & Sanitization**
    *   **Strategy**: Never trust client input. Malicious SQL or script injection attempts must be neutralized before processing.
    *   **Implementation**: All API inputs are validated for type and format. We use parameterized queries (PreparedStatement style in `pg`) for all database interactions, which mathematically prevents SQL Injection attacks by treating user input as data, not executable code.