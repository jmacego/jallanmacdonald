import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";

export interface SiteStackProps extends cdk.StackProps {
  domainName: string;
  siteSubdomain?: string;
  siteDirectory?: string;
  hostedZone: route53.IHostedZone;
  certificate: acm.ICertificate;
}

export class JAllanMacDonaldSiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, { ...props, crossRegionReferences: true });

    cdk.Annotations.of(this).acknowledgeWarning(
      "@aws-cdk/core:addConstructMetadataFailed",
      "BucketDeployment uses a managed policy name in a way that cannot emit construct metadata."
    );

    const siteDomain = props.siteSubdomain
      ? `${props.siteSubdomain}.${props.domainName}`
      : undefined;
    const distributionDomains = [props.domainName, siteDomain].filter(
      (domain): domain is string => Boolean(domain)
    );

    const zone = props.hostedZone;
    const certificate = props.certificate;

    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      "OriginAccessIdentity"
    );
    siteBucket.grantRead(originAccessIdentity);

    const redirectSnippet = siteDomain
      ? `  if (host === "${siteDomain}") {\n` +
        `    var qs = request.querystring ? "?" + request.querystring : "";\n` +
        `    return {\n` +
        `      statusCode: 301,\n` +
        `      statusDescription: "Moved Permanently",\n` +
        `      headers: {\n` +
        `        location: { value: "https://${props.domainName}" + request.uri + qs }\n` +
        `      }\n` +
        `    };\n` +
        `  }\n`
      : "";

    const urlRewriteFunction = new cloudfront.Function(
      this,
      "UrlRewriteFunction",
      {
        code: cloudfront.FunctionCode.fromInline(
          "function handler(event) {\n" +
            "  var request = event.request;\n" +
            "  var host = request.headers.host ? request.headers.host.value : \"\";\n" +
            redirectSnippet +
            "  var uri = request.uri;\n" +
            "  if (uri.endsWith('/')) {\n" +
            "    request.uri = uri + 'index.html';\n" +
            "  } else if (!uri.includes('.')) {\n" +
            "    request.uri = uri + '/index.html';\n" +
            "  }\n" +
            "  return request;\n" +
            "}\n"
        ),
      }
    );

    const distribution = new cloudfront.Distribution(
      this,
      "SiteDistribution",
      {
        defaultRootObject: "index.html",
        domainNames: distributionDomains,
        certificate,
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessIdentity(siteBucket, {
            originAccessIdentity,
          }),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations: [
            {
              function: urlRewriteFunction,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ],
        },
      }
    );

    new s3deploy.BucketDeployment(this, "DeploySite", {
      sources: [
        s3deploy.Source.asset(
          props.siteDirectory ??
            path.join(__dirname, "..", "..", "apps", "site", "dist")
        ),
      ],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ["/*"],
    });

    new route53.ARecord(this, "SiteAliasRecord", {
      zone,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      ),
    });

    new route53.AaaaRecord(this, "SiteAliasRecordIpv6", {
      zone,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      ),
    });

    if (props.siteSubdomain) {
      new route53.ARecord(this, "SiteAliasRecordSubdomain", {
        zone,
        recordName: props.siteSubdomain,
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(distribution)
        ),
      });

      new route53.AaaaRecord(this, "SiteAliasRecordSubdomainIpv6", {
        zone,
        recordName: props.siteSubdomain,
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(distribution)
        ),
      });
    }

    new cdk.CfnOutput(this, "CloudFrontDomain", {
      value: distribution.distributionDomainName,
    });
  }
}
