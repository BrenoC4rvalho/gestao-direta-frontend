
You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.
- Do not write arrow functions in templates (they are not supported).

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

# AGENTS.md — Gestão Direta Frontend

## Project Context

This project is the frontend of **Gestão Direta**, a financial management SaaS for small rural producers.

The application is built with:

* Angular
* Tailwind CSS
* Lucide Angular
* Standalone Components
* Reactive Forms
* Angular Signals
* HttpClient
* Angular Router

The interface must be mobile first, clean, professional, agricultural, financial and consistent with the project design system.

## Mandatory Rules

* Follow `design-system.md`.
* Use Angular standalone components.
* Use Tailwind CSS for styling.
* Use Lucide Angular for icons.
* Use Reactive Forms for forms.
* Use Angular Signals for UI state and stores.
* Use mobile first layout from the beginning.
* Reuse shared components whenever possible.
* Do not duplicate UI patterns inside feature folders.
* Do not use Angular Material.
* Do not use Bootstrap.
* Do not use PrimeNG.
* Do not add unrelated UI libraries.
* Do not create public registration.
* Do not create Financial Report.
* Do not create Rural Credit.
* Do not create extra screens unless explicitly requested.
* Do not implement everything at once.
* Before modifying files, present a plan.
* After modifying files, list changed files and test commands.

## Visual Rules

Use the Gestão Direta color palette.

### Brand Colors

* Primary: `#15803D`
* Accent: `#22C55E`
* Success: `#16A34A`
* Warning: `#F59E0B`
* Danger: `#DC2626`
* Info: `#2563EB`

### Light Mode

* Background: `#F8FAF7`
* Background Secondary: `#ECFDF5`
* Surface: `#FFFFFF`
* Border: `#DDE5DD`
* Text Primary: `#1F2937`
* Text Secondary: `#6B7280`
* Button Primary: `#15803D`
* Button Primary Hover: `#166534`
* Highlight Soft: `#DCFCE7`

### Dark Mode

* Background: `#0B1410`
* Background Secondary: `#111C17`
* Surface: `#16231D`
* Border: `#263A30`
* Text Primary: `#E5E7EB`
* Text Secondary: `#9CA3AF`
* Button Primary: `#22C55E`
* Button Primary Hover: `#4ADE80`
* Highlight Soft: `#143D25`

## Architecture

Use this structure:

```text
src/app
├── core
│   ├── guards
│   ├── interceptors
│   ├── services
│   ├── stores
│   ├── models
│   └── constants
│
├── shared
│   ├── components
│   ├── ui
│   ├── directives
│   ├── pipes
│   ├── validators
│   └── utils
│
├── layouts
│   ├── auth-layout
│   └── app-layout
│
└── features
    ├── auth
    ├── dashboard
    ├── farms
    ├── users
    ├── farm-users
    └── financial
        ├── categories
        ├── transactions
        └── upcoming-bills
```

## Shared Components

Before creating feature pages, create reusable shared components when needed.

Priority shared components:

* `app-button`
* `app-input`
* `app-select`
* `app-card`
* `app-badge`
* `app-status-badge`
* `app-confirm-dialog`
* `app-toast-container`
* `app-skeleton`
* `app-drawer`
* `app-page-header`
* `app-empty-state`
* `app-error-state`
* `app-filter-bar`

## Mobile First Rules

* Start all layouts from mobile.
* Use responsive Tailwind prefixes such as `sm:`, `md:`, `lg:`, `xl:`.
* Tables must become card lists on mobile.
* Drawers must become full-screen panels on mobile.
* Buttons may be full width on mobile.
* Filters may collapse into a filter panel on mobile.
* Avoid horizontal scroll when possible.

## Backend Integration Rules

The backend uses HttpOnly cookie authentication with the cookie:

```text
gd_session
```

All authenticated requests must use:

```ts
withCredentials: true
```

Create an HTTP interceptor to ensure credentials are included.

Handle:

* `401`: clear session and redirect to login.
* `403`: show permission feedback.
* validation errors: show field-level messages when possible.

## Icons

Use Lucide Angular.

Recommended icons:

* Dashboard: `LayoutDashboard`
* Farms: `Tractor`
* Users: `Users`
* Farm users: `UserRoundCog`
* Categories: `Tags`
* Transactions: `ReceiptText`
* Upcoming bills: `CalendarClock`
* Profile: `User`
* Logout: `LogOut`
* Create: `Plus`
* Search: `Search`
* Filter: `Filter`
* Actions: `MoreVertical`
* Income: `TrendingUp`
* Expense: `TrendingDown`
* Balance: `Wallet`
* Alert: `TriangleAlert`
* Paid: `CircleCheck`
* Pending: `Clock`
* Canceled: `CircleX`

## Current Scope

Only build these main areas:

* Login
* Dashboard
* Farms
* Users
* Farm users
* Categories
* Transactions
* Upcoming bills
* Profile
* Change password

Do not build:

* Public registration
* Financial Report
* Rural Credit
* Extra marketing pages
* Unrequested features

## Workflow

For each task:

1. Analyze the request.
2. Present a plan before changing files.
3. Wait for approval.
4. Implement only the approved step.
5. Keep code clean and readable.
6. Run or suggest test/build commands.
7. Report changed files.
8. Suggest a commit message.

Never implement multiple large modules in one step.

Assets and Visual References

The project has official brand assets and visual references that must be reused.

Brand assets

Use these files for the real application UI:

public/assets/brand/logo_horizontal.svg
public/assets/brand/logo_mark.svg
public/assets/img/login-farm-illustration.png

Usage rules:

Use logo_horizontal.svg when there is enough horizontal space, such as login page, desktop sidebar and larger headers.
Use logo_mark.svg for compact areas, mobile header, favicon-like marks, collapsed sidebar or icon-only contexts.
Use login-farm-illustration.png only on the login page or authentication layout.
Do not replace the logo with generated text.
Do not recreate the logo using CSS or icons.
Do not distort, stretch or recolor the logo.
Keep logo proportions intact.

Angular usage examples:

<img src="/assets/brand/logo_horizontal.svg" alt="Gestão Direta" />
<img src="/assets/brand/logo_mark.svg" alt="Gestão Direta" />
<img src="/assets/img/login-farm-illustration.png" alt="Ilustração rural" />
Visual references

Use these files only as visual reference for layout, spacing, hierarchy and composition:

references/dashboard_mobile.png
references/dashboard_web.png
references/login_mobile.png
references/login_web.png
references/movimentacoes_web.png

Reference usage rules:

Use login_mobile.png and login_web.png as reference for the login screen.
Use dashboard_mobile.png and dashboard_web.png as reference for the dashboard screen.
Use movimentacoes_web.png as reference for the financial transactions desktop screen.
Do not import reference images into production UI.
Do not render reference images directly inside pages.
Recreate the design using Angular components and Tailwind CSS.
Maintain mobile first behavior even when using desktop references.
