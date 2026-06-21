# Frontend Plan — Gestão Direta

## Stack

* Angular
* Tailwind CSS
* Lucide Angular
* Standalone Components
* Reactive Forms
* Angular Signals
* HttpClient
* Angular Router

## Main Principles

* Mobile first.
* Shared components first.
* No Angular Material.
* No Bootstrap.
* No PrimeNG.
* No public registration.
* No Financial Report.
* No Rural Credit.
* Reuse components whenever possible.

## Build Order

1. Project base

   * Tailwind configuration
   * Lucide Angular
   * design tokens
   * folder structure
   * AGENTS.md
   * design-system.md

2. Shared UI foundation

   * button
   * card
   * badge
   * skeleton
   * empty state
   * error state

3. Shared form components

   * input
   * select
   * textarea
   * form field validation pattern

4. Shared overlay components

   * drawer
   * confirm dialog
   * toast container

5. Layouts

   * auth layout
   * app layout
   * mobile header
   * desktop sidebar
   * responsive navigation

6. Authentication

   * login page
   * auth service
   * session store
   * credentials interceptor
   * auth guard
   * guest guard

7. Dashboard

   * summary cards
   * latest transactions
   * upcoming bills
   * selected farm context

8. Farms

   * list
   * create/edit
   * status actions

9. Users

   * list
   * create/edit
   * status/type actions

10. Farm users

* list by farm
* link user
* update role
* inactivate link

11. Categories

* list by farm
* admin global categories
* create/edit/inactivate category

12. Transactions

* filters
* summary cards
* responsive list/table
* create/edit drawer
* pay/cancel/inactivate actions

13. Upcoming bills

* list pending/overdue expenses
* mark as paid
* filters

14. Profile

* user profile
* change password

15. Polish

* responsive adjustments
* skeleton states
* empty states
* error states
* accessibility
* final visual consistency
