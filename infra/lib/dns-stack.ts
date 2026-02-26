import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import { Duration } from "aws-cdk-lib";

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

    // Microsoft 365 email routing
    new route53.MxRecord(this, "M365Mx", {
      zone: this.zone,
      values: [
        { hostName: "jallanmacdonald-com.mail.protection.outlook.com.", priority: 0 },
      ],
      ttl: Duration.seconds(3600),
    });

    new route53.TxtRecord(this, "M365SpfTxt", {
      zone: this.zone,
      values: ["v=spf1 include:spf.protection.outlook.com -all"],
      ttl: Duration.seconds(3600),
    });

    new route53.CnameRecord(this, "M365Autodiscover", {
      zone: this.zone,
      recordName: "autodiscover",
      domainName: "autodiscover.outlook.com",
      ttl: Duration.seconds(3600),
    });

    // Microsoft 365 DKIM
    new route53.CnameRecord(this, "M365DkimSelector1", {
      zone: this.zone,
      recordName: "selector1._domainkey",
      domainName: "selector1-jallanmacdonald-com._domainkey.JMacLabs.w-v1.dkim.mail.microsoft",
      ttl: Duration.seconds(3600),
    });

    new route53.CnameRecord(this, "M365DkimSelector2", {
      zone: this.zone,
      recordName: "selector2._domainkey",
      domainName: "selector2-jallanmacdonald-com._domainkey.JMacLabs.w-v1.dkim.mail.microsoft",
      ttl: Duration.seconds(3600),
    });

    new cdk.CfnOutput(this, "NameServers", {
      value: cdk.Fn.join(", ", this.zone.hostedZoneNameServers ?? []),
      description: "Route53 name servers for the registrar",
    });
  }
}
