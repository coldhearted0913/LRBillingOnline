# Security Practices

## Credential Management

### Environment Variables
- All sensitive credentials are stored in `.env.local` file
- `.env.local` is listed in `.gitignore` and **never committed** to version control
- Use `.env.example` (if present) as a template for required variables

### AWS Credentials
- AWS Access Key ID and Secret Access Key are stored as environment variables
- Never hardcode credentials in source code
- Use AWS IAM user with minimal required permissions
- Rotate credentials periodically

### Database Credentials
- PostgreSQL connection string stored in `DATABASE_URL` environment variable
- Database schema and migrations are version controlled (without sensitive data)
- Use Prisma ORM to prevent SQL injection attacks

## Authentication
- NextAuth.js for secure session management
- bcrypt for password hashing (10 salt rounds)
- JWT tokens for stateless authentication
- Session timeout on inactivity

## API Security
- All API routes protected by authentication middleware
- Role-based access control (RBAC) at both UI and API level
- Input validation using Zod schemas
- SQL injection prevention via Prisma ORM

## Best Practices
1. Never commit `.env.local` or any file with real credentials
2. Use environment variables for all configuration
3. Keep dependencies updated for security patches
4. Regular security audits and dependency checks
5. Implement rate limiting in production
