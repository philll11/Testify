// src/inversify.types.ts

export const TYPES = {
    // Test Plan
    ITestPlanService: Symbol.for('ITestPlanService'),
    TestPlanController: Symbol.for('TestPlanController'),

    // Mapping
    IMappingService: Symbol.for('IMappingService'),
    MappingsController: Symbol.for('MappingsController'),

    // Credentials
    ICredentialService: Symbol.for('ICredentialService'),
    CredentialsController: Symbol.for('CredentialsController'),
    ISecureCredentialService: Symbol.for('ISecureCredentialService'),

    // Test Results
    ITestExecutionResultService: Symbol.for('ITestExecutionResultService'),
    TestExecutionResultsController: Symbol.for('TestExecutionResultsController'),

    // Config
    PlatformConfig: Symbol.for('PlatformConfig'),

    // Auth
    IAuthService: Symbol.for('IAuthService'),
    IJwtService: Symbol.for('IJwtService'),
    ICryptographyService: Symbol.for('ICryptographyService'),
    IUserRepository: Symbol.for('IUserRepository'),
    IRoleRepository: Symbol.for('IRoleRepository'),
    IRefreshTokenRepository: Symbol.for('IRefreshTokenRepository'),
    AuthController: Symbol.for('AuthController'),
    AuthMiddleware: Symbol.for('AuthMiddleware'),

    // Repositories
    ITestPlanRepository: Symbol.for('ITestPlanRepository'),
    ITestPlanEntryPointRepository: Symbol.for('ITestPlanEntryPointRepository'),
    IPlanComponentRepository: Symbol.for('IPlanComponentRepository'),
    IMappingRepository: Symbol.for('IMappingRepository'),
    ITestExecutionResultRepository: Symbol.for('ITestExecutionResultRepository'),

    // Infrastructure
    PostgresPool: Symbol.for('PostgresPool'),
    IIntegrationPlatformServiceFactory: Symbol.for('IIntegrationPlatformServiceFactory'),
    IPlatformConfig: Symbol.for('IPlatformConfig'),
};