# Contributing to GateX Protocol

Thank you for your interest in contributing to GateX Protocol!

## Development Setup

1. Fork and clone the repository
2. Run `pnpm install` to install dependencies
3. Copy `.env.example` to `.env` and configure
4. Start infrastructure: `docker-compose up -d`
5. Run migrations: `pnpm db:migrate`
6. Start dev servers: `pnpm dev`

## Code Style

- Use TypeScript for all new code
- Follow existing code style (use Prettier)
- Write tests for new features
- Update documentation as needed

## Pull Request Process

1. Create a feature branch
2. Make your changes
3. Run tests: `pnpm test`
4. Run linter: `pnpm lint`
5. Ensure CI passes
6. Submit PR with clear description

## Project Structure

- `apps/` - Applications (merchant, facilitator)
- `packages/` - Shared packages (common, evm, config)
- `scripts/` - Utility scripts
- `.github/` - CI/CD workflows

## Questions?

Open an issue for questions or discussions.

