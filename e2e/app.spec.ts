import { test, expect } from '@playwright/test'
import { captureScreenshot, assertNoConsoleErrors } from './helpers'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Navigate to the app and wipe all persisted state so every test starts clean. */
async function freshStart(page: Parameters<typeof captureScreenshot>[0]) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.removeItem('darktodo_items')
    localStorage.removeItem('darktodo_theme')
  })
  await page.reload()
  // Wait for the app shell to be visible
  await page.waitForSelector('[data-testid="app-container"]')
}

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe('DarkTodo', () => {

  // 1 ─ Happy path: add a task via Enter key ──────────────────────────────────
  test('adds a new task via Enter key and shows it with an unchecked checkbox', async ({ page }) => {
    await freshStart(page)

    const input = page.getByTestId('todo-input')
    await input.fill('Buy groceries')
    await input.press('Enter')

    const items = page.getByTestId('todo-item')
    await expect(items).toHaveCount(1)
    await expect(items.first().getByTestId('todo-text')).toHaveText('Buy groceries')

    // Checkbox should be unchecked – no indigo background
    const checkbox = items.first().getByTestId('todo-checkbox')
    await expect(checkbox).not.toHaveClass(/bg-indigo-600/)

    // Input should be cleared
    await expect(input).toHaveValue('')

    await captureScreenshot(page, '01-task-added')
  })

  // 2 ─ Happy path: mark todo as complete ─────────────────────────────────────
  test('checking a todo strikes it through and decrements the active count', async ({ page }) => {
    await freshStart(page)

    // Add a task
    const input = page.getByTestId('todo-input')
    await input.fill('Write report')
    await input.press('Enter')

    const countEl = page.getByTestId('active-count')
    await expect(countEl).toContainText('1')

    // Complete the task
    const item = page.getByTestId('todo-item').first()
    await item.getByTestId('todo-checkbox').click()

    // Text should be struck-through
    const text = item.getByTestId('todo-text')
    await expect(text).toHaveClass(/line-through/)

    // Counter decrements
    await expect(countEl).toContainText('0')

    // The item appears in the Completed filter view
    await page.getByTestId('filter-completed').click()
    await expect(page.getByTestId('todo-item')).toHaveCount(1)

    await captureScreenshot(page, '02-task-completed')
  })

  // 3 ─ Happy path: dark mode toggle persists across reload ───────────────────
  test('toggles dark mode and preference persists after page reload', async ({ page }) => {
    await freshStart(page)
    // Default is dark – switch to light first so we have a known starting point
    const toggle = page.getByTestId('theme-toggle')
    const container = page.getByTestId('app-container')

    // Confirm dark-mode default (#0F172A → rgb(15, 23, 42))
    await expect(container).toHaveCSS('background-color', 'rgb(15, 23, 42)')

    // Toggle → light mode (#FFFFFF → rgb(255, 255, 255))
    await toggle.click()
    await expect(container).toHaveCSS('background-color', 'rgb(255, 255, 255)')

    await captureScreenshot(page, '03-light-mode')

    // Toggle → dark mode again
    await toggle.click()
    await expect(container).toHaveCSS('background-color', 'rgb(15, 23, 42)')

    await captureScreenshot(page, '03-dark-mode')

    // Reload – dark should persist
    await page.reload()
    await page.waitForSelector('[data-testid="app-container"]')
    await expect(page.getByTestId('app-container')).toHaveCSS('background-color', 'rgb(15, 23, 42)')
  })

  // 4 ─ Data persistence: todos survive a page refresh ────────────────────────
  test('persists all todos and their completion states across page refresh', async ({ page }) => {
    await freshStart(page)

    const input = page.getByTestId('todo-input')

    await input.fill('Task Alpha')
    await input.press('Enter')
    await input.fill('Task Beta')
    await input.press('Enter')
    await input.fill('Task Gamma')
    await input.press('Enter')

    // Complete the second task
    await page.getByTestId('todo-item').nth(1).getByTestId('todo-checkbox').click()

    // Reload
    await page.reload()
    await page.waitForSelector('[data-testid="todo-item"]')

    const items = page.getByTestId('todo-item')
    await expect(items).toHaveCount(3)
    await expect(items.nth(0).getByTestId('todo-text')).toHaveText('Task Alpha')
    await expect(items.nth(1).getByTestId('todo-text')).toHaveText('Task Beta')
    await expect(items.nth(2).getByTestId('todo-text')).toHaveText('Task Gamma')

    // Second item should still be completed (struck-through)
    await expect(items.nth(1).getByTestId('todo-text')).toHaveClass(/line-through/)
    // Others should not be struck-through
    await expect(items.nth(0).getByTestId('todo-text')).not.toHaveClass(/line-through/)
    await expect(items.nth(2).getByTestId('todo-text')).not.toHaveClass(/line-through/)

    await captureScreenshot(page, '04-persistence')
  })

  // 5 ─ Edge case: submitting an empty input does nothing ─────────────────────
  test('does not add a todo when the input is empty', async ({ page }) => {
    await freshStart(page)

    // Press Enter on empty input
    await page.getByTestId('todo-input').press('Enter')
    await expect(page.getByTestId('todo-item')).toHaveCount(0)

    // Click Add button with empty input
    await page.getByTestId('add-button').click()
    await expect(page.getByTestId('todo-item')).toHaveCount(0)

    // Empty state should still show
    await expect(page.getByTestId('empty-state')).toBeVisible()

    await captureScreenshot(page, '05-empty-state-dark')
  })

  // 6 ─ Edge case: Clear Completed removes only completed tasks ───────────────
  test('Clear Completed removes only completed tasks and leaves active ones', async ({ page }) => {
    await freshStart(page)

    const input = page.getByTestId('todo-input')

    await input.fill('Active task')
    await input.press('Enter')
    await input.fill('Done task one')
    await input.press('Enter')
    await input.fill('Done task two')
    await input.press('Enter')

    // Complete last two
    const items = page.getByTestId('todo-item')
    await items.nth(1).getByTestId('todo-checkbox').click()
    await items.nth(2).getByTestId('todo-checkbox').click()

    await expect(page.getByTestId('clear-completed')).toBeVisible()
    await page.getByTestId('clear-completed').click()

    // Only the active task should remain
    const remaining = page.getByTestId('todo-item')
    await expect(remaining).toHaveCount(1)
    await expect(remaining.first().getByTestId('todo-text')).toHaveText('Active task')

    // Clear Completed button should disappear (no more completed tasks)
    await expect(page.getByTestId('clear-completed')).not.toBeVisible()

    await captureScreenshot(page, '06-clear-completed')
  })

  // 7 ─ Filter behaviour: All / Active / Completed ────────────────────────────
  test('filters show correct subsets of todos', async ({ page }) => {
    await freshStart(page)

    const input = page.getByTestId('todo-input')

    await input.fill('Incomplete one')
    await input.press('Enter')
    await input.fill('Incomplete two')
    await input.press('Enter')
    await input.fill('Completed one')
    await input.press('Enter')

    // Complete the third item
    await page.getByTestId('todo-item').nth(2).getByTestId('todo-checkbox').click()

    // ── Active filter: only shows incomplete items ──
    await page.getByTestId('filter-active').click()
    let visible = page.getByTestId('todo-item')
    await expect(visible).toHaveCount(2)
    await expect(visible.nth(0).getByTestId('todo-text')).toHaveText('Incomplete one')
    await expect(visible.nth(1).getByTestId('todo-text')).toHaveText('Incomplete two')

    // ── Completed filter: only shows completed items ──
    await page.getByTestId('filter-completed').click()
    visible = page.getByTestId('todo-item')
    await expect(visible).toHaveCount(1)
    await expect(visible.first().getByTestId('todo-text')).toHaveText('Completed one')

    await captureScreenshot(page, '07-completed-filter')

    // ── All filter: shows everything ──
    await page.getByTestId('filter-all').click()
    await expect(page.getByTestId('todo-item')).toHaveCount(3)

    await captureScreenshot(page, '07-all-filter')
  })

  // 8 ─ Delete behaviour: hover reveals delete button; click removes item ──────
  test('hovering a todo reveals delete button; clicking it removes the todo', async ({ page }) => {
    await freshStart(page)

    const input = page.getByTestId('todo-input')
    await input.fill('Item to keep')
    await input.press('Enter')
    await input.fill('Item to delete')
    await input.press('Enter')

    await expect(page.getByTestId('todo-item')).toHaveCount(2)

    // Hover over the second item to reveal its delete button
    const secondItem = page.getByTestId('todo-item').nth(1)
    await secondItem.hover()

    const deleteBtn = secondItem.getByTestId('delete-button')
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()

    // Only one item should remain
    const remaining = page.getByTestId('todo-item')
    await expect(remaining).toHaveCount(1)
    await expect(remaining.first().getByTestId('todo-text')).toHaveText('Item to keep')

    // Verify removed from localStorage
    const stored = await page.evaluate(() => localStorage.getItem('darktodo_items'))
    const parsed = JSON.parse(stored ?? '[]') as Array<{ text: string }>
    expect(parsed.length).toBe(1)
    expect(parsed[0].text).toBe('Item to keep')

    await captureScreenshot(page, '08-after-delete')
  })

  // ── Screenshot-only: light mode home screen ─────────────────────────────────
  test('captures the light-mode home screen with mixed todos', async ({ page }) => {
    await freshStart(page)

    // Switch to light mode
    await page.getByTestId('theme-toggle').click()

    const input = page.getByTestId('todo-input')
    await input.fill('Read a book')
    await input.press('Enter')
    await input.fill('Go for a walk')
    await input.press('Enter')
    await input.fill('Write some code')
    await input.press('Enter')

    // Complete first task
    await page.getByTestId('todo-item').first().getByTestId('todo-checkbox').click()

    await captureScreenshot(page, 'screen-01-light-home')
  })

  // ── Screenshot-only: dark mode home screen ──────────────────────────────────
  test('captures the dark-mode home screen with mixed todos', async ({ page }) => {
    await freshStart(page)

    const input = page.getByTestId('todo-input')
    await input.fill('Morning standup')
    await input.press('Enter')
    await input.fill('Review pull request')
    await input.press('Enter')
    await input.fill('Ship the feature')
    await input.press('Enter')

    // Complete first task
    await page.getByTestId('todo-item').first().getByTestId('todo-checkbox').click()

    await captureScreenshot(page, 'screen-02-dark-home')
  })

  // ── Screenshot-only: empty state in dark mode ───────────────────────────────
  test('captures the empty-state in dark mode', async ({ page }) => {
    await freshStart(page)
    // Default dark mode, no todos → empty state
    await expect(page.getByTestId('empty-state')).toBeVisible()
    await captureScreenshot(page, 'screen-03-empty-dark')
  })

  // ── Screenshot-only: completed filter view ──────────────────────────────────
  test('captures the completed-filter view', async ({ page }) => {
    await freshStart(page)

    const input = page.getByTestId('todo-input')
    await input.fill('Read documentation')
    await input.press('Enter')
    await input.fill('Fix the bug')
    await input.press('Enter')
    await input.fill('Deploy to staging')
    await input.press('Enter')

    // Complete all three
    const items = page.getByTestId('todo-item')
    await items.nth(0).getByTestId('todo-checkbox').click()
    await items.nth(1).getByTestId('todo-checkbox').click()
    await items.nth(2).getByTestId('todo-checkbox').click()

    await page.getByTestId('filter-completed').click()
    await captureScreenshot(page, 'screen-04-completed-filter')
  })

  // ── No console errors during basic usage ────────────────────────────────────
  test('produces no console errors during normal usage', async ({ page }) => {
    await freshStart(page)
    const input = page.getByTestId('todo-input')
    await input.fill('Check for errors')
    await input.press('Enter')
    await page.getByTestId('todo-item').first().getByTestId('todo-checkbox').click()
    await page.getByTestId('theme-toggle').click()
    await assertNoConsoleErrors(page)
  })
})
