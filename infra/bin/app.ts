#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { JAllanMacDonaldDnsStack } from "../lib/dns-stack";
import { GitHubOidcStack } from "../lib/github-oidc-stack";
import { JAllanMacDonaldSiteStack } from "../lib/site-stack";

const app = new cdk.App();

const domainName = process.env.DOMAIN_NAME ?? "jallanmacdonald.com";
const siteSubdomain = process.env.SITE_SUBDOMAIN ?? "www";
const stackName = process.env.STACK_NAME ?? "JAllanMacDonaldSiteStack";
const githubOwner = process.env.GITHUB_OWNER;
const githubRepo = process.env.GITHUB_REPO;
const githubBranch = process.env.GITHUB_BRANCH ?? "main";
const githubProviderArn = process.env.GITHUB_OIDC_PROVIDER_ARN;
const githubOidcEnabled = process.env.GITHUB_OIDC_ENABLED === "true";

const dnsStack = new JAllanMacDonaldDnsStack(app, "JAllanMacDonaldDnsStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
  domainName,
  siteSubdomain,
});

new JAllanMacDonaldSiteStack(app, stackName, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  domainName,
  siteSubdomain,
  hostedZone: dnsStack.zone,
  certificate: dnsStack.certificate,
});

if (githubOidcEnabled && githubOwner && githubRepo) {
  new GitHubOidcStack(app, "JAllanMacDonaldGitHubOidcStack", {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
    githubOwner,
    githubRepo,
    githubBranch,
    providerArn: githubProviderArn,
  });
}
