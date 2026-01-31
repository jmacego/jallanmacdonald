import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";

export interface DnsStackProps extends cdk.StackProps {
  domainName: string;
  siteSubdomain?: string;
}

export class JAllanMacDonaldDnsStack extends cdk.Stack {
  public readonly zone: route53.IHostedZone;
  public readonly certificate: acm.ICertificate;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id, { ...props, crossRegionReferences: true });

    const siteDomain = props.siteSubdomain
      ? `${props.siteSubdomain}.${props.domainName}`
      : undefined;

    this.zone = new route53.PublicHostedZone(this, "HostedZone", {
      zoneName: props.domainName,
    });

    this.certificate = new acm.Certificate(this, "SiteCertificate", {
      domainName: props.domainName,
      subjectAlternativeNames: siteDomain ? [siteDomain] : [],
      validation: acm.CertificateValidation.fromDns(this.zone),
    });

    new cdk.CfnOutput(this, "NameServers", {
      value: cdk.Fn.join(", ", this.zone.hostedZoneNameServers ?? []),
      description: "Route53 name servers for the registrar",
    });
  }
}
