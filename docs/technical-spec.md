# Technical Specification

## 1. Project Folder Structure
The application follows a modular structure to ensure maintainability and a clear separation between the backend, frontend, and database layers.

### 📁 Root Directory
* `docker-compose.yml`: Orchestrates the `database`, `backend`, and `frontend` services.
* `database/`: Contains master SQL initialization and seeding files.
* `docs/`: System documentation, PRD, and architecture diagrams.
* `submission.json`: Credentials file for automated evaluation.

### 📁 Backend Service (`/backend`)
* `migrations/`: JavaScript runners that execute `init.sql` to build the schema.
* `seeds/`: JavaScript runners that execute `seedData.sql` to populate mandatory accounts.
* `src/config/`: Database connection pool and environment configuration.
* `src/controllers/`: Business logic for the 19 API endpoints.
* `src/middleware/`: JWT verification, RBAC checks, and Tenant Isolation logic.
* `src/routes/`: Express route definitions organized by module (Auth, Tenants, etc.).
* `src/server.js`: Main entry point for the Express API.
* `src/app.js`: Express app configuration (CORS, Middlewares).

### 📁 Frontend Service (`/frontend`)
* `src/pages/`: React views for Registration, Login, Dashboard, and Management.
* `src/components/`: Reusable UI elements such as Sidebar, Task Cards, and Modals.
* `src/services/`: API client services (Axios) for backend communication.
* `src/context/`: Global state management for authentication and tenant data.

---

## 2. Development & Deployment Setup

### 🛠️ Prerequisites
* **Docker Desktop**: Mandatory for container orchestration.
* **Node.js v18+**: For local dependency management (if running outside Docker).
* **PostgreSQL v15**: Required for local database testing (if running outside Docker).

### 🚀 Deployment Instructions
The system is designed for a **one-command deployment**.

1. **Clone the repository** to your local machine.
2. **Environment Setup**: Ensure the `.env` file in the backend folder contains the required database credentials and a `JWT_SECRET` of at least 32 characters.
3. **Execute Deployment**: Run the following command from the root directory:
   ```bash
   docker-compose up --build -d
   ```
4. **Access the Application**:
   * Frontend: `http://localhost:3000`
   * Backend API: `http://localhost:5000`
   * Health Check: `http://localhost:5000/api/health`

### 🧪 How to Run Tests
The project includes a suite of automated tests to verify API functionality and business logic.

#### Running Tests in Docker (Recommended)
You can run tests directly inside the backend container to ensure environment consistency:
```bash
# 1. Ensure services are running
docker-compose up -d

# 2. Execute tests inside the backend container
docker-compose exec backend npm test
```

#### Running Tests Locally
If you prefer running tests on your host machine:
1. Ensure your local PostgreSQL instance is running.
2. Configure `.env` to point to `localhost`.
3. Run:
   ```bash
   cd backend
   npm install
   npm test
   ```