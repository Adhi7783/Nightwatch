import { test, expect } from 'deepspace/testing'

test('two signed-in investigators share reviews, notes, and evidence connections', async ({
  users,
}) => {
  const [host, partner, outsider] = await users(3)
  await host.page.goto('/')
  await partner.page.goto('/')
  await outsider.page.goto('/')
  // These are real fixture accounts. Identity setup is app data, not mocked auth.
  for (const [actor, name] of [
    [host, '__test-host'],
    [partner, '__test-partner'],
    [outsider, '__test-outsider'],
  ] as const) {
    await expect(actor.page.getByRole('button', { name: 'Nightwatch navigation' })).toBeVisible()
    if (await actor.page.getByLabel('Detective name', { exact: true }).isVisible()) {
      await actor.page.getByLabel('Detective name', { exact: true }).fill(name)
      await actor.page.getByRole('button', { name: 'Save detective identity' }).click()
    }
  }
  await host.page.getByRole('button', { name: 'Start a private case', exact: true }).click()
  await host.page.getByRole('button', { name: 'New case', exact: true }).click()
  await host.page.getByRole('button', { name: 'Skip briefing and continue' }).click()
  await host.page.getByRole('button', { name: /Invite \/ room details/ }).click()
  const code = (await host.page.locator('.code-display').innerText()).replaceAll('–', '')
  await host.page.getByRole('button', { name: 'Close dialog' }).click()
  await partner.page.getByRole('button', { name: 'Join investigation', exact: true }).click()
  await partner.page.getByLabel('Invitation code').fill(code)
  await partner.page.getByRole('button', { name: 'Join case', exact: true }).click()
  await partner.page.getByRole('button', { name: 'Skip briefing and continue' }).click()
  await expect(partner.page.getByText('Lobby. The host chooses when to begin.')).toBeVisible()
  await expect(partner.page.getByText('Explore the museum')).toHaveCount(0)
  await host.page.getByRole('button', { name: /Start investigation/ }).click()
  await expect(partner.page.getByText('Inspect, compare, and connect the evidence.')).toBeVisible()
  await host.page.getByRole('button', { name: /The Meridian Gallery/ }).click()
  await host.page.getByRole('button', { name: 'Share with the investigation' }).click()
  await partner.page
    .getByRole('navigation', { name: 'Investigation workspace' })
    .getByRole('button', { name: /Caseboard/ })
    .click()
  await partner.page.locator('[data-card-id="seal"] .board-card-body').click()
  await expect(partner.page.getByRole('heading', { name: 'The unbroken seal' })).toBeVisible()
  await partner.page.getByRole('checkbox', { name: 'Reviewed by me' }).check()
  await host.page
    .getByRole('navigation', { name: 'Investigation workspace' })
    .getByRole('button', { name: /Caseboard/ })
    .click()
  await host.page.locator('[data-card-id="seal"] .board-card-body').click()
  await expect(host.page.getByText(/Reviewed by __test-partner/)).toBeVisible()
  await partner.page.getByRole('button', { name: 'Connect to…', exact: true }).click()
  await partner.page
    .getByRole('combobox', { name: 'Connect to', exact: true })
    .selectOption('suspect:mara')
  await partner.page
    .getByRole('combobox', { name: 'Relationship', exact: true })
    .selectOption('contradicts')
  await partner.page.getByRole('button', { name: 'Save connection' }).click()
  await expect(host.page.getByRole('button', { name: /Contradicts Mara Voss/ })).toBeVisible()
  await host.page
    .getByRole('textbox', { name: 'Observation', exact: true })
    .fill('__test-note: the display stayed sealed.')
  await host.page.getByRole('button', { name: 'Save card note' }).click()
  await expect(partner.page.getByText('__test-note: the display stayed sealed.')).toBeVisible()
  await partner.page.reload()
  await partner.page.getByRole('button', { name: 'Resume', exact: true }).first().click()
  await partner.page
    .getByRole('navigation', { name: 'Investigation workspace' })
    .getByRole('button', { name: /Caseboard/ })
    .click()
  await partner.page.locator('[data-card-id="seal"] .board-card-body').click()
  await expect(partner.page.getByText('__test-note: the display stayed sealed.')).toBeVisible()
  // Full server security, concurrent layout, undo and solve/reveal are also exercised
  // by verify-sdk-live.mjs using native DeepSpace account sessions.
})
