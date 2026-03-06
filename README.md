# **Testify**

Testify is an application designed to improve the reliability and efficiency of integration development by automating the discovery and execution of tests for any given component and its entire dependency tree.

## **Table of Contents**

- [Core Features](#core-features)
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)
- [Deployment & Distribution](#deployment--distribution)

## **Core Features**

- **Dual-Mode Operation:** Choose between **Component Mode** (for dependency analysis and coverage) or **Test Mode** (for direct execution of specific test processes).
- **Flexible Test Plan Creation:** Create test plans from a list of components, human-readable process names, or folder paths.
- **Automated Dependency Discovery:** Recursively discover all nested child components to build a complete dependency map.
- **Test Coverage Analysis:** Identify all available tests for every component in a plan and highlight coverage gaps.
- **Interactive & Full Test Execution:** Execute a specific subset of tests or intelligently run all available tests for a plan.
- **Consolidated Reporting:** View clear, Jest-like summary reports for every test execution.
- **Historical Analysis:** Query and analyze historical test plans and their detailed results.

## **Architecture Overview**

This repository contains two distinct, independent applications that work together:

1. `testify-backend`: The backend service, a **NestJS** application leveraging TypeScript, PostgreSQL, and Redis (BullMQ). This service contains all core business logic, the asynchronous execution engine, and exposes a REST API. It is designed to be run as a containerized application via Docker.

2. `testify-web`: The front-end web UI, a **React 18+** application driven by **Vite** and styled with Material-UI. It provides a visual dashboard for collection building, test orchestration, and administrative configuration. 

*(Note: The `testify-cli` exists in this repository as a legacy tool, but is currently deprecated and pending refactoring).*

## **Prerequisites**

Before you begin, ensure you have the following installed on your machine:
- **Git**
- **Docker Desktop** (Required for running the full stack, or at least the Database/Redis services)
- **Node.js** (LTS version, e.g., v20.x or higher) & **NPM** (If running services locally outside of Docker)

## **Getting Started**

Follow these steps to get the full Testify stack running via Docker.

### **1. Clone the Repository**
```sh
git clone <your-repository-url>
cd <repository-directory>
```

### **2. Set Up Environment Variables**
Navigate into the backend directory and copy the example environment file:
```sh
cd testify-backend

# For Windows (PowerShell)
copy .env.example .env

# For macOS/Linux
cp .env.example .env
```

### **3. Start the Docker Stack**
From the **root of the repository**, run Docker Compose to spin up the entire environment (NestJS Backend, React Frontend, PostgreSQL, and Redis):
```sh
docker compose up --build
```
- The Web UI will be available at `http://localhost:3432`
- The API service will be available at `http://localhost:3431`

## **Development Workflow**

To work on the applications locally (without Dockerizing the Node/React processes):

1. **Start Infrastructure:** Spin up the database and cache using `docker compose up postgres redis -d`
2. **Start Backend:** `cd testify-backend && npm ci && npm run start:dev`
3. **Start Frontend:** `cd testify-web && npm ci && npm run dev`

## **Running Tests**

### **Backend Tests**
```sh
cd testify-backend

# Run all unit tests
npm run test

# Run all end-to-end tests (requires Docker database to be running)
npm run test:e2e
```

## **Project Structure**
```
/
├── testify-backend/   # The NestJS API Service
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── testify-web/       # The Vite/React Web App
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml # Orchestrates the full application stack locally
└── testify-cli/       # (Legacy) The standalone Go CLI tool
```

## **Deployment & Distribution**

Both the `testify-backend` and `testify-web` applications are designed for containerized deployment. Multi-stage `Dockerfile`s are provided in their respective directories that create lightweight, production-optimized images. These images can be pushed to container registries (like Azure Container Registry) and deployed to container hosting services like **Azure App Service**.
