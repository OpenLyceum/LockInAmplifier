import { expect, type Locator, type Page, test } from "@playwright/test";

async function openScreen(page: Page, screen: number): Promise<void> {
  await page.goto(`/?ea&initialScreen=${screen}&seed=1234`);
  await expect(page.locator("#sim")).toBeVisible();
}

async function tabTo(page: Page, control: Locator): Promise<void> {
  await expect(control).toBeEnabled();
  for (let attempts = 0; attempts < 60; attempts++) {
    if (await control.evaluate((element) => element === document.activeElement)) {
      return;
    }
    await page.keyboard.press("Tab");
  }
  await expect(control).toBeFocused();
}

test("Phase Detection: Auto Phase aligns the output, with Y near zero", async ({ page }) => {
  await openScreen(page, 4);
  const y = page.getByText(/^Y: -?[\d.]+ mV$/);
  await expect(y).not.toHaveText(/^Y: -?0\.0 mV$/);
  const pause = page.getByRole("button", { name: "Pause", exact: true });
  await tabTo(page, pause);
  await page.keyboard.press("Enter");
  await tabTo(page, page.getByRole("button", { name: "Auto Phase", exact: true }));
  await page.keyboard.press("Enter");
  await expect(y).toHaveText(/^Y: -?0\.0 mV$/);

  await tabTo(page, page.getByRole("slider", { name: "Reference phase θ" }));
  await page.keyboard.press("PageUp");
  await expect(y).not.toHaveText(/^Y: -?0\.0 mV$/);
  await page.keyboard.press("Alt+Shift+A");
  await expect(y).toHaveText(/^Y: -?0\.0 mV$/);
});

test("Filtering: changing the time-constant detent updates ENBW", async ({ page }) => {
  await openScreen(page, 3);
  const tau = page.getByRole("slider", { name: "Time constant τ" });
  await tabTo(page, tau);
  await expect(tau).toHaveAttribute("aria-valuetext", /^30 ms\s*$/);
  await expect(page.getByText("Equivalent noise bandwidth: 8.333 Hz")).toBeAttached();
  await page.keyboard.press("ArrowRight");
  await expect(tau).toHaveAttribute("aria-valuetext", /^100 ms\s*$/);
  await expect(page.getByText("Equivalent noise bandwidth: 2.500 Hz")).toBeAttached();
});

test("Virtual Experiment: choose RC, record a row and download the notebook", async ({ page }) => {
  await openScreen(page, 5);
  const experiment = page.getByRole("button", { name: /^Experiment Chopped light/ });
  await tabTo(page, experiment);
  await page.keyboard.press("Enter");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Experiment Unknown RC filter" })).toBeAttached();
  await tabTo(page, page.getByRole("button", { name: "RECORD", exact: true }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Delete recorded row 1" })).toBeAttached();

  await tabTo(page, page.getByRole("button", { name: "Export CSV" }));
  const download = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  expect((await download).suggestedFilename()).toBe("lock-in-lab.csv");
});

test("Preferences: the mains query selects 50 Hz and the radio group changes it", async ({ page }) => {
  await page.goto("/?ea&initialScreen=1&mainsFrequency=50");
  await expect(page.locator("#sim")).toBeVisible();
  await tabTo(page, page.getByRole("button", { name: "Preferences", exact: true }));
  await page.keyboard.press("Enter");
  await tabTo(page, page.getByRole("tab", { name: "Overview" }));
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Simulation" })).toBeFocused();

  const fifty = page.getByRole("radio", { name: "50 Hz", exact: true });
  await expect(fifty).toBeChecked();
  await tabTo(page, fifty);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "60 Hz", exact: true })).toBeChecked();
});
