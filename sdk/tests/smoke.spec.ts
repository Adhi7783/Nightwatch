import { test, expect } from '@playwright/test'
test('Nightwatch offers native sign-in before private investigation', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Some truths take two.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible()
})
