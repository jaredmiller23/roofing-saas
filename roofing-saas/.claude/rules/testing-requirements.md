# Testing Requirements & E2E Patterns

**Applies to**: `**/tests/**`, `**/e2e/**`, `**/*.spec.ts`
**Last Updated**: December 10, 2025

## Test Structure

### Directory Layout
```
tests/
├── e2e/
│   ├── auth/
│   │   └── login.spec.ts
│   ├── contacts/
│   │   └── contact-crud.spec.ts
│   └── global-setup.ts
├── fixtures/
│   └── auth.fixture.ts
└── playwright.config.ts
```

## Playwright Patterns

### Test File Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup - navigate, login, etc.
  });

  test('should do specific thing', async ({ page }) => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Authentication Setup
```typescript
// Use storageState for authenticated tests
test.use({
  storageState: 'tests/.auth/user.json',
});
```

### Page Object Pattern (Recommended for Complex Features)
```typescript
// tests/pages/contacts.page.ts
export class ContactsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/contacts');
  }

  async createContact(data: ContactData) {
    await this.page.click('[data-testid="new-contact-btn"]');
    await this.page.fill('[name="name"]', data.name);
    // ...
  }

  async getContactRow(name: string) {
    return this.page.locator(`tr:has-text("${name}")`);
  }
}
```

### Data Attributes for Testing
```typescript
// In components, add data-testid:
<Button data-testid="submit-btn">Submit</Button>

// In tests, select by data-testid:
await page.click('[data-testid="submit-btn"]');
```

## What to Test

### Must Test (Critical Paths)
1. **Authentication**: Login, logout, session persistence
2. **CRUD Operations**: Create, read, update, delete for core entities
3. **Pipeline Flows**: Stage transitions, drag-and-drop
4. **Form Validation**: Required fields, error messages
5. **Navigation**: All main routes accessible

### Should Test (Important)
1. **Filters**: Filter application and clearing
2. **Search**: Search functionality across entities
3. **Pagination**: Page navigation, per-page limits
4. **Mobile Views**: Responsive layout verification

### Nice to Test
1. **Edge Cases**: Empty states, long text, special characters
2. **Error Handling**: API failures, network issues
3. **Performance**: Page load times

## Assertions

### Common Patterns
```typescript
// Visibility
await expect(page.locator('h1')).toBeVisible();

// Text content
await expect(page.locator('.title')).toHaveText('Expected Text');

// URL
await expect(page).toHaveURL('/contacts');

// Count
await expect(page.locator('tr.contact-row')).toHaveCount(10);

// Attribute
await expect(page.locator('button')).toBeDisabled();
```

### Wait Strategies
```typescript
// Wait for network idle (after navigation)
await page.goto('/contacts', { waitUntil: 'networkidle' });

// Wait for specific element
await page.waitForSelector('[data-testid="contacts-table"]');

// Wait for response
await page.waitForResponse(resp => resp.url().includes('/api/contacts'));
```

## Running Tests

### Commands
```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- tests/e2e/contacts/

# Run with UI mode (debugging)
npm run test:e2e -- --ui

# Run headed (see browser)
npm run test:e2e -- --headed

# Generate report
npm run test:e2e -- --reporter=html
```

### CI/CD Integration
Tests should pass before merge. The Playwright config handles:
- Parallel execution
- Retries on failure
- Screenshot on failure
- Trace on failure

## Database State

### Test Isolation
Each test should:
1. Set up its own data (or use shared fixtures)
2. Clean up after itself (or use transactions)
3. Not depend on other tests' data

### Fixture Pattern
```typescript
// tests/fixtures/contacts.fixture.ts
export async function createTestContact(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('contacts')
    .insert({
      name: `Test Contact ${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      // ...
    })
    .select()
    .single();
  return data;
}

export async function cleanupTestContact(supabase: SupabaseClient, id: string) {
  await supabase.from('contacts').delete().eq('id', id);
}
```

## Debug Tips

### Screenshot on Demand
```typescript
await page.screenshot({ path: 'debug-screenshot.png' });
```

### Trace for CI Failures
```typescript
// In playwright.config.ts
use: {
  trace: 'on-first-retry',
}
```

### Console Logs
```typescript
page.on('console', msg => console.log(msg.text()));
```
