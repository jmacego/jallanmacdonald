type BuildSeoOptions = {
  currentPath?: string;
  siteUrl: string | URL;
  siteName: string;
  socialImage?: string;
  socialImageAlt?: string;
  defaultSocialImage?: string;
  defaultSocialImageAlt?: string;
  ogType?: string;
};

export function buildSeo({
  currentPath = "/",
  siteUrl,
  siteName,
  socialImage,
  socialImageAlt,
  defaultSocialImage,
  defaultSocialImageAlt,
  ogType = "website",
}: BuildSeoOptions) {
  const resolvedSiteUrl = typeof siteUrl === "string" ? new URL(siteUrl) : siteUrl;
  const canonicalUrl = new URL(currentPath, resolvedSiteUrl).toString();
  const resolvedSocialImage = socialImage ?? defaultSocialImage;
  const socialImageUrl = resolvedSocialImage
    ? new URL(resolvedSocialImage, resolvedSiteUrl).toString()
    : undefined;

  return {
    canonicalUrl,
    ogType,
    siteName,
    socialImageUrl,
    socialImageAlt: socialImageAlt ?? defaultSocialImageAlt,
    twitterCard: socialImageUrl ? "summary_large_image" : "summary",
  };
}
