Core Requirements
Focus: Backend API Development
Starting with user registration and authentication
Using existing configuration (TypeScript, Prisma, SvelteKit)
Test-driven development approach
Key Components to Build:
User registration endpoint
Authentication system
JWT token management
Password hashing/security
Development Approach:
Test-first methodology
Type-safe implementation
Using existing configuration files
Keep it simple but robust
Project Context
From the existing configuration:
Using SvelteKit for the framework
Prisma for database management
JWT for authentication
TypeScript for type safety
Vitest for testing
Development Flow Should Be:
Write tests first for each feature
Implement the feature
Verify implementation meets test requirements
Move to next feature
Initial Focus Areas:
User Authentication:
API Endpoints:
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
Testing Scope:
Unit tests for auth utilities
Integration tests for endpoints
Security testing for auth flow
