import { expect, test, type Page } from "@playwright/test";

async function expectSocialMetadata(
  page: Page,
  {
    canonicalUrl,
    imageUrl,
    ogType,
  }: {
    canonicalUrl: string;
    imageUrl: string;
    ogType: "website" | "article";
  },
) {
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonicalUrl);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", ogType);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", imageUrl);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", imageUrl);
}

test("home page exposes its primary heading and navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Pointless Magical Relics" })).toBeVisible();
  await expect(page.getByRole("link", { name: "About the Author" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Posts" })).toBeVisible();
});

test("post page exposes book-cover social metadata", async ({ page }) => {
  await page.goto("/posts/welcome/");

  await expect(page.getByRole("heading", { name: "Welcome!" })).toBeVisible();
  await expectSocialMetadata(page, {
    canonicalUrl: "https://jallanmacdonald.com/posts/welcome/",
    imageUrl: "https://jallanmacdonald.com/assets/pointless-magical-relics-kindle-cover.jpg",
    ogType: "article",
  });
});
