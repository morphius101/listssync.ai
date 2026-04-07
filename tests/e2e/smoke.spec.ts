import { test, expect } from '@playwright/test';

const sharedChecklist = {
  id: 'chk_test_1',
  name: 'Warehouse Closeout',
  status: 'in-progress',
  progress: 50,
  remarks: 'Lock the back door before leaving.',
  createdAt: '2026-04-01T12:00:00.000Z',
  updatedAt: '2026-04-01T12:00:00.000Z',
  tasks: [
    {
      id: 'task_1',
      description: 'Take final inventory photos',
      details: 'Aisles 1-3 only',
      completed: true,
      photoRequired: true,
      photoUrl: null,
    },
    {
      id: 'task_2',
      description: 'Secure loading dock',
      details: 'Confirm gate is locked',
      completed: false,
      photoRequired: false,
      photoUrl: null,
    },
  ],
};

test('landing page responds and shows core marketing copy', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/ListsSync/i);
  await expect(page.getByRole('heading', { name: /ListsSync/i })).toBeVisible();
  await expect(page.getByText(/photo verification/i)).toBeVisible();
});

test('unknown API routes return JSON 404 instead of SPA HTML', async ({ request }) => {
  const response = await request.get('/api/definitely-not-a-real-route');
  expect(response.status()).toBe(404);
  expect(response.headers()['content-type']).toContain('application/json');
  await expect(response.json()).resolves.toEqual({ message: 'Not Found' });
});

test('shared email-link flow auto-loads without code modal', async ({ page }) => {
  await page.route('**/api/verification/status/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        verified: true,
        expired: false,
        recipientId: 'recipient_email_1',
        checklistId: sharedChecklist.id,
        targetLanguage: 'es',
        maskedEmail: 'r*****@example.com',
      }),
    });
  });

  await page.route('**/api/shared/checklist**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        checklist: {
          ...sharedChecklist,
          translatedTo: 'es',
          translatedAt: sharedChecklist.updatedAt,
        },
        targetLanguage: 'es',
        translationApplied: true,
      }),
    });
  });

  await page.goto('/shared/email-token-123?lang=es');

  await expect(page.getByText('Verified Access', { exact: true })).toBeVisible();
  await expect(page.getByText(/auto-translated/i)).toBeVisible();
  await expect(page.getByText(/warehouse closeout/i)).toBeVisible();
  await expect(page.getByText(/verification required/i)).toHaveCount(0);
});

test('shared SMS/manual flow still requires code entry when unverified', async ({ page }) => {
  await page.route('**/api/verification/status/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        verified: false,
        expired: false,
        recipientId: 'recipient_sms_1',
        checklistId: sharedChecklist.id,
        targetLanguage: 'en',
        maskedPhone: '****-****-1212',
      }),
    });
  });

  await page.goto('/shared/sms-token-123');

  await expect(page.getByRole('heading', { name: 'Verification Required' })).toBeVisible();
  await expect(page.getByText(/code sent to: \*\*\*\*-\*\*\*\*-1212/i)).toBeVisible();
  await expect(page.getByPlaceholder(/enter verification code/i)).toBeVisible();
});

test('shared checklist does not claim translation when server falls back to original language', async ({ page }) => {
  await page.route('**/api/verification/status/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        verified: true,
        expired: false,
        recipientId: 'recipient_email_2',
        checklistId: sharedChecklist.id,
        targetLanguage: 'fr',
        maskedEmail: 'r*****@example.com',
      }),
    });
  });

  await page.route('**/api/shared/checklist**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        checklist: sharedChecklist,
        targetLanguage: 'en',
        translationApplied: false,
      }),
    });
  });

  await page.goto('/shared/email-token-fallback?lang=fr');

  await expect(page.getByText('Verified Access', { exact: true })).toBeVisible();
  await expect(page.getByText(/auto-translated/i)).toHaveCount(0);
  await expect(page.getByText(/warehouse closeout/i)).toBeVisible();
});
