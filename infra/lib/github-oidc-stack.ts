import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";

export interface GitHubOidcStackProps extends cdk.StackProps {
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  providerArn?: string;
}

export class GitHubOidcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: GitHubOidcStackProps) {
    super(scope, id, props);

    const provider = props.providerArn
      ? iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
          this,
          "GitHubProvider",
          props.providerArn
        )
      : new iam.OpenIdConnectProvider(this, "GitHubProvider", {
          url: "https://token.actions.githubusercontent.com",
          clientIds: ["sts.amazonaws.com"],
        });

    const providerArn = props.providerArn ?? provider.openIdConnectProviderArn;
    const subject = `repo:${props.githubOwner}/${props.githubRepo}:ref:refs/heads/${props.githubBranch}`;

    const role = new iam.Role(this, "GitHubDeployRole", {
      roleName: `${props.githubRepo}-github-deploy`,
      assumedBy: new iam.FederatedPrincipal(
        providerArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          StringLike: {
            "token.actions.githubusercontent.com:sub": subject,
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
      description: "GitHub Actions deploy role for jallanmacdonald.com",
    });

    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess")
    );

    new cdk.CfnOutput(this, "GitHubDeployRoleArn", {
      value: role.roleArn,
      description: "IAM role ARN to use in GitHub Actions",
    });
  }
}
