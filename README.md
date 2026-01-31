# jallanmacdonald

Author website for J. Allan MacDonald. Monorepo with Astro static site and AWS CDK infrastructure.

## Structure
- `apps/site` - Astro-powered static site (build output in `apps/site/dist`)
- `infra` - AWS CDK app (TypeScript) for S3 + CloudFront + Route53 + ACM

## Local development

### Prerequisites
- Node.js 20+
- pnpm 10+

### Install dependencies
```bash
pnpm --dir apps/site install
pnpm --dir infra install
```

### Run dev server
```bash
pnpm run dev
```

Site available at `http://localhost:4321`

### Local validation (required before push)
All local checks must pass before any push (lint + tests + build + CDK synth).

```bash
./scripts/validate.sh
```

Enable the pre-push hook:
```bash
./scripts/setup-githooks.sh
```

## Deploy

### GitHub Actions (recommended)
Deploys automatically on pushes to `main`.

1. Create a GitHub OIDC deploy role via CDK:
```bash
export GITHUB_OIDC_ENABLED=true
export GITHUB_OWNER=jmacego
export GITHUB_REPO=jallanmacdonald
pnpm --dir infra exec cdk deploy JAllanMacDonaldGitHubOidcStack
```

2. Set the GitHub Actions secret `AWS_ROLE_ARN` to the role ARN output from the stack.

### Manual deploy
Create a local `.env` by copying `.env.example`, then fill in real values.

```bash
pnpm run deploy:aws
```

## Environment variables

Required `.env` keys for manual deploys:
- `AWS_PROFILE=personal`
- `AWS_REGION=us-west-2`
- `AWS_DEFAULT_REGION=us-west-2`
- `DOMAIN_NAME=jallanmacdonald.com`
- `SITE_SUBDOMAIN=www`
- `STACK_NAME=JAllanMacDonaldSiteStack`

After deployment, update your domain registrar with the Route53 name servers from the stack output.
