# AGENTS.md

## Purpose
This file provides guidance for AI agents and Copilot working in this repository.

## Project Overview
- **Site**: J. Allan MacDonald author website (jallanmacdonald.com)
- **Type**: Monorepo with Astro static site + AWS CDK infrastructure
- **Hosting**: AWS S3 + CloudFront via GitHub Actions

## Key Locations
- Site source: `apps/site/src/` (Astro pages/layouts)
- Infrastructure: `infra/` (AWS CDK TypeScript)
- Scripts: `scripts/` (validation, hooks setup)
- Build output: `apps/site/dist/` (do not edit)

## Local Development
```bash
pnpm --dir apps/site install   # Install site dependencies
pnpm run dev                    # Start dev server at localhost:4321
./scripts/validate.sh           # Run all validation (required before push)
```

## Local Validation Hooks
Set up git hooks (once per clone): `./scripts/setup-githooks.sh`
- Pre-commit: `./scripts/validate.sh --quick`
- Pre-push: `./scripts/validate.sh`

## Content Conventions
- Pages in `apps/site/src/pages/`
- Layouts in `apps/site/src/layouts/`
- Static assets in `apps/site/public/assets/`
- Posts under `apps/site/src/pages/posts/`

## Editing Rules
- Do not edit `apps/site/dist/` (generated output)
- Run `./scripts/validate.sh` before pushing
- Pre-push hook enforces validation
- Keep `.github/copilot-instructions.md` in sync with this file

## Related Repositories
This repo is part of a personal multi-repo ecosystem:
- **thelongwaymac** - Travel blog using same Astro + CDK pattern (blueprint)
- **jmaclabs** - Technical portfolio site (jmaclabs.com, GitHub Pages/Jekyll)
- **homesite** - Private Flask app for personal finance/travel (self-hosted Docker)
