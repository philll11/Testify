# Architectural Refactor: Persistence Responsibility

## 1. Context & Problem Statement
The current application architecture places the responsibility of **Identity Generation** (UUIDs) and **Timestamp Management** (`createdAt`, `updatedAt`) within the **Application Service Layer**. This creates coupling between business logic and infrastructure concerns, leading to potential race conditions, inconsistencies, and reliance on potentially incorrect application-side logic.

## 2. Objective
We aim to shift the responsibility for **identity** and **audit trails** down to the **Infrastructure (Database) Layer**. The Application layer should only provide the business data it knows about.

**Desired State:**
*   **Database:** Generates UUIDs automatically (`DEFAULT gen_random_uuid()`).
*   **Database:** Manages timestamps automatically (`DEFAULT CURRENT_TIMESTAMP`).
*   **Application:** Sends only business data (payloads) to the repository and receives back the fully Hydrated Entity with DB-generated fields.

## 3. Principles & Guidelines

### A. Database is the Source of Truth
The database schema must be the final authority on an entity's existence and metadata.
*   All primary key columns must use `DEFAULT gen_random_uuid()`.
*   All audit columns must use `DEFAULT CURRENT_TIMESTAMP`.
*   `UPDATE` operations should use `CURRENT_TIMESTAMP` directly in the query.

### B. Segregation of Types (CQRS-lite)
We must stop using a single interface for both "Reading" and "Writing".
*   **Domain Entity (Read):** Represents the full, persisted state (includes `id`, `createdAt`, etc.).
*   **Create Payload (Write):** Represents the intent to create. Strictly **excludes** system fields (`id`, timestamps).
*   **Update Payload (Write):** Represents the intent to modify. Includes the `id` (to identify the resource) but **excludes** immutable system fields (`createdAt`).

### C. Repository Contract
Repositories should act as the gateway that effectively "exchanges" a Payload for an Entity.
*   Input: `CreateDomainDTO`
*   Action: `INSERT ... RETURNING *`
*   Output: `DomainEntity`

## 4. Implementation Scope
You are tasked with identifying **all Domain Entities** implementation within the `automated-test-orchestrator-api` that violate these principles.

**Your Analysis Task:**
1.  Scan the codebase (`src/domain`, `setup.sql`, `src/application`) to identify non-compliant entities.
2.  Systematically refactor these to align with the principles above.
3.  Ensure `setup.sql` reflects the new defaults.
4.  Ensure Service logic is stripped of ID/Date generation.

## 5. Candidate Domains
The following entities have been identified as candidates for refactoring:

### Core Orchestration
- [X] **`TestPlan`** (`test_plans`)
- [X] **`TestPlanEntryPoint`** (`test_plan_entry_points`)
- [X] **`PlanComponent`** (`plan_components`)
- [X] **`TestExecutionResult`** (`test_execution_results`)

### Configuration & Management
- [X] **`Mapping`** (`mappings`)
- [X] **`IntegrationPlatformCredentials`**

### Identity & Access (If applicable)
- [X] **`User`** (`users`)
- [X] **`Role`** (`roles`)
- [X] **`RefreshToken`** (`refresh_tokens`)
