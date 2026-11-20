import { test, expect } from '@playwright/test'
test('private game routes require a verified platform identity', async ({ request }) => {
  for (const action of ['profile', 'room?code=ABCDEF123456', 'dossier?code=ABCDEF123456']) {
    const response = await request.get('/api/nightwatch/' + action)
    expect(response.status()).toBe(401)
  }
})
