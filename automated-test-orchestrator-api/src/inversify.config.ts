// src/inversify.config.ts

import 'reflect-metadata';
import { Container } from 'inversify';
import type { Pool } from 'pg';
import { TYPES } from './inversify.types.js';


// Import Routers
import { TestPlanController } from './routes/test_plans.controller.js';
import { MappingsController } from './routes/mappings.controller.js';
import { CredentialsController } from './routes/credentials.controller.js';
import { TestExecutionResultsController } from './routes/test_execution_results.controller.js';
import { AuthController } from './routes/auth.controller.js';

// Import Services
import { TestPlanService } from './application/test_plan_service.js';

import { MappingService } from './application/mapping_service.js';
import { CredentialService } from './application/credential_service.js';
import { TestExecutionResultService } from './application/test_execution_result_service.js';
import { AuthService } from './application/auth_service.js';

// Import Ports
import { ICredentialService } from './ports/i_credential_service.js';
import { ISecureCredentialService } from './ports/i_secure_credential_service.js';
import { ITestPlanService } from './ports/i_test_plan_service.js';
import { IMappingService } from './ports/i_mapping_service.js';
import { ITestExecutionResultService } from './ports/i_test_execution_result_service.js';
import { IAuthService } from './ports/i_auth_service.js';
import { IJwtService } from './ports/i_jwt_service.js';
import { ICryptographyService } from './ports/i_cryptography_service.js';
import { ITestPlanRepository } from './ports/i_test_plan_repository.js';
import { ITestPlanEntryPointRepository } from './ports/i_test_plan_entry_point_repository.js';
import { IPlanComponentRepository } from './ports/i_plan_component_repository.js';
import { IMappingRepository } from './ports/i_mapping_repository.js';
import { ITestExecutionResultRepository } from './ports/i_test_execution_result_repository.js';
import { IIntegrationPlatformServiceFactory } from './ports/i_integration_platform_service_factory.js';
import { IUserRepository } from './ports/i_user_repository.js';
import { IRoleRepository } from './ports/i_role_repository.js';
import { IRefreshTokenRepository } from './ports/i_refresh_token_repository.js';

// Import Infrastructure Adapters
import globalPool from './infrastructure/database.js';
import { TestPlanRepository } from './infrastructure/repositories/test_plan_repository.js';
import { TestPlanEntryPointRepository } from './infrastructure/repositories/test_plan_entry_point_repository.js';
import { PlanComponentRepository } from './infrastructure/repositories/plan_component_repository.js';
import { MappingRepository } from './infrastructure/repositories/mapping_repository.js';
import { TestExecutionResultRepository } from './infrastructure/repositories/test_execution_result_repository.js';
import { PostgresUserRepository } from './infrastructure/repositories/postgres_user_repository.js';
import { PostgresRoleRepository } from './infrastructure/repositories/postgres_role_repository.js';
import { PostgresRefreshTokenRepository } from './infrastructure/repositories/postgres_refresh_token_repository.js';
import { IntegrationPlatformServiceFactory } from './infrastructure/integration_platform_service_factory.js';
import { InMemorySecureCredentialService } from './infrastructure/in_memory_secure_credential_service.js';
import { JwtService } from './infrastructure/auth/jwt_service.js';
import { CryptographyService } from './infrastructure/auth/cryptography_service.js';
import { IPlatformConfig, PlatformConfig } from './infrastructure/config.js';
import { AuthMiddleware } from './middleware/auth_middleware.js';


// Create the Inversify container
const container = new Container();

// --- Configuration Binding ---
container.bind<IPlatformConfig>(TYPES.IPlatformConfig).to(PlatformConfig).inSingletonScope();

// --- Database Pool Binding ---
container.bind<Pool>(TYPES.PostgresPool).toConstantValue(globalPool);

// --- Controller Bindings ---
container.bind<TestPlanController>(TYPES.TestPlanController).to(TestPlanController).inSingletonScope();
container.bind<MappingsController>(TYPES.MappingsController).to(MappingsController).inSingletonScope();
container.bind<CredentialsController>(TYPES.CredentialsController).to(CredentialsController).inSingletonScope();
container.bind<TestExecutionResultsController>(TYPES.TestExecutionResultsController).to(TestExecutionResultsController).inSingletonScope();
container.bind<AuthController>(TYPES.AuthController).to(AuthController).inSingletonScope();

// --- Middleware Bindings ---
container.bind<AuthMiddleware>(TYPES.AuthMiddleware).to(AuthMiddleware).inSingletonScope();

// --- Repository Bindings ---
container.bind<ITestPlanRepository>(TYPES.ITestPlanRepository).to(TestPlanRepository).inSingletonScope();
container.bind<IPlanComponentRepository>(TYPES.IPlanComponentRepository).to(PlanComponentRepository).inSingletonScope();
container.bind<ITestPlanEntryPointRepository>(TYPES.ITestPlanEntryPointRepository).to(TestPlanEntryPointRepository).inSingletonScope();
container.bind<IMappingRepository>(TYPES.IMappingRepository).to(MappingRepository).inSingletonScope();
container.bind<ITestExecutionResultRepository>(TYPES.ITestExecutionResultRepository).to(TestExecutionResultRepository).inSingletonScope();
container.bind<IUserRepository>(TYPES.IUserRepository).to(PostgresUserRepository).inSingletonScope();
container.bind<IRoleRepository>(TYPES.IRoleRepository).to(PostgresRoleRepository).inSingletonScope();
container.bind<IRefreshTokenRepository>(TYPES.IRefreshTokenRepository).to(PostgresRefreshTokenRepository).inSingletonScope();


// --- Service Bindings ---
container.bind<ITestPlanService>(TYPES.ITestPlanService).to(TestPlanService).inSingletonScope();
container.bind<IMappingService>(TYPES.IMappingService).to(MappingService).inSingletonScope();
container.bind<ICredentialService>(TYPES.ICredentialService).to(CredentialService).inSingletonScope();
container.bind<ITestExecutionResultService>(TYPES.ITestExecutionResultService).to(TestExecutionResultService).inSingletonScope();
container.bind<ICryptographyService>(TYPES.ICryptographyService).to(CryptographyService).inSingletonScope();
container.bind<IJwtService>(TYPES.IJwtService).to(JwtService).inSingletonScope();
container.bind<IAuthService>(TYPES.IAuthService).to(AuthService).inSingletonScope();

// --- Infrastructure Adapter Bindings ---
container.bind<ISecureCredentialService>(TYPES.ISecureCredentialService).to(InMemorySecureCredentialService).inSingletonScope();
container.bind<IIntegrationPlatformServiceFactory>(TYPES.IIntegrationPlatformServiceFactory).to(IntegrationPlatformServiceFactory).inSingletonScope();

export default container;