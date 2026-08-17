import { expect, test, type Locator, type Page } from '@playwright/test';

const requiredEnvironment = ['DEMO_EMAIL', 'DEMO_PASSWORD', 'DEMO_FARM_NAME'] as const;
const elementTimeout = 10_000;

function getRequiredEnvironment(): Record<(typeof requiredEnvironment)[number], string> {
  const missing = requiredEnvironment.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) throw new Error(`Defina as variáveis obrigatórias: ${missing.join(', ')}`);
  return {
    DEMO_EMAIL: process.env['DEMO_EMAIL'] as string,
    DEMO_PASSWORD: process.env['DEMO_PASSWORD'] as string,
    DEMO_FARM_NAME: process.env['DEMO_FARM_NAME'] as string,
  };
}

async function pause(page: Page, milliseconds: number): Promise<void> {
  await page.waitForTimeout(milliseconds);
}

async function presentClick(page: Page, target: Locator): Promise<void> {
  await target.waitFor({ state: 'visible', timeout: elementTimeout });
  await target.scrollIntoViewIfNeeded({ timeout: elementTimeout });
  const box = await target.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 14 });
    await pause(page, 450);
  }
  await target.click({ timeout: elementTimeout });
}

async function presentFill(page: Page, target: Locator, value: string): Promise<void> {
  await target.waitFor({ state: 'visible', timeout: elementTimeout });
  await presentClick(page, target);
  await target.fill('', { timeout: elementTimeout });
  await target.pressSequentially(value, { delay: 72 });
  await pause(page, 500);
}

async function waitForPage(page: Page, heading: RegExp): Promise<void> {
  await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
  await pause(page, 2_500);
}
test.setTimeout(10 * 60 * 1000);

test('grava apresentação profissional do Gestão Direta', async ({ page }) => {
  const environment = getRequiredEnvironment();
  const activityName = '[DEMO] Manejo de pastagem — apresentação';
  const initialDescription = 'Atividade demonstrativa criada durante a apresentação do sistema.';
  const updatedDescription = 'Atividade demonstrativa atualizada durante a apresentação do sistema.';

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /entrar na sua conta/i })).toBeVisible();
  await expect(page.getByTestId('login-form')).toBeVisible({ timeout: elementTimeout });
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: elementTimeout });
  await pause(page, 3_000);
  await presentFill(page, page.locator('input[type="email"]'), environment.DEMO_EMAIL);
  await presentFill(
    page,
    page.locator('input[autocomplete="current-password"]'),
    environment.DEMO_PASSWORD,
  );
  await pause(page, 900);
  await presentClick(page, page.getByRole('button', { name: /^entrar$/i }));
  await page.waitForURL(/\/dashboard$/);
  await waitForPage(page, /^olá,/i);

  const farmSelector = page.locator('select#global-farm-select');
  await expect(farmSelector).toBeVisible();
  await expect(farmSelector.locator('option', { hasText: environment.DEMO_FARM_NAME })).toHaveCount(1);
  await pause(page, 1_500);
  await farmSelector.selectOption({ label: environment.DEMO_FARM_NAME });
  await pause(page, 3_000);

  await presentClick(page, page.getByRole('link', { name: /^cadastro$/i }));
  await waitForPage(page, /^cadastro$/i);
  await presentClick(page, page.getByRole('link', { name: /^atividades produtivas$/i }));
  await expect(page.getByRole('link', { name: /^atividades produtivas$/i })).toHaveAttribute('aria-current', 'page');
  await pause(page, 3_000);

  const search = page.locator('input#filter-search');
  await presentFill(page, search, 'manejo');
  await presentClick(page, page.getByRole('button', { name: /^aplicar filtros$/i }));
  await pause(page, 2_000);
  await presentClick(page, page.getByRole('button', { name: /^limpar filtros$/i }));
  await pause(page, 1_500);

  await presentClick(page, page.getByRole('button', { name: /^nova atividade produtiva$/i }));
  await expect(page.getByRole('heading', { name: /^nova atividade produtiva$/i })).toBeVisible();
  await pause(page, 1_000);
  await presentFill(page, page.locator('input#production-activity-name'), activityName);
  await presentFill(page, page.locator('textarea#production-activity-description'), initialDescription);
  await pause(page, 900);
  await presentClick(page, page.getByRole('button', { name: /^salvar$/i }));
  await expect(page.getByText('Atividade produtiva criada com sucesso.')).toBeVisible();
  const activityTable = page.getByRole('table', { name: /Atividades produtivas cadastradas/i });
  const activityRow = activityTable.getByRole('row').filter({ hasText: activityName });
  await expect(activityRow).toBeVisible();
  await pause(page, 3_000);
  await expect(activityRow).toBeVisible();
  await presentClick(page, activityRow.getByRole('button', { name: /^editar atividade produtiva$/i }));
  await expect(page.getByRole('heading', { name: /^editar atividade produtiva$/i })).toBeVisible();
  await pause(page, 1_000);
  await presentFill(page, page.locator('textarea#production-activity-description'), updatedDescription);
  await presentClick(page, page.getByRole('button', { name: /^salvar$/i }));
  await expect(page.getByText('Atividade produtiva atualizada com sucesso.')).toBeVisible();
  await expect(page.getByText(updatedDescription).first()).toBeVisible();
  await pause(page, 3_000);

  await presentClick(page, page.getByRole('link', { name: /^categorias$/i }));
  await waitForPage(page, /^cadastro$/i);
  await pause(page, 1_500);
  await presentClick(page, page.getByRole('link', { name: /^movimentações$/i }));
  await waitForPage(page, /^movimentações financeiras$/i);
  await presentClick(page, page.getByRole('link', { name: /^agenda financeira$/i }));
  await waitForPage(page, /^agenda financeira$/i);
  await presentClick(page, page.getByRole('link', { name: /^olá,/i }));
  await waitForPage(page, /^olá,/i);
  await pause(page, 5_000);
});
