# MiniFT - Product Completion Roadmap

This document organizes the work needed to turn MiniFT into a more complete, professional, trustworthy product that can attract and retain users.

Time estimates assume a very small team: one developer working with an AI assistant. Each estimate includes implementation, review, testing, bug fixes, and small polish passes. Larger unknowns, third-party approvals, production incidents, or mobile store requirements can extend these timelines.

---

## Sprint 1: Activation and First Use

**Estimated duration:** 2-3 weeks

### Goal

Help a new user reach their first moment of value in under 3 minutes.

### Expected Outcome

A new user can register, understand what to do next, add or import basic data, and see a useful dashboard without feeling lost.

### Tasks

- [ ] Create post-registration onboarding.
- [ ] Show an initial checklist inside the dashboard.
- [ ] Confirm or create the primary account during onboarding.
- [ ] Let users choose their primary currency during onboarding.
- [ ] Guide users to add their first transaction.
- [ ] Guide users to create their first budget.
- [ ] Offer Gmail connection as an optional onboarding step.
- [ ] Add a "Try demo" option from the landing page.
- [ ] Create a low-friction demo workspace.
- [ ] Add a "Create sample data" option for new users.
- [ ] Improve empty states in dashboard, accounts, transactions, budgets, reports, and imports.
- [ ] Add contextual CTAs based on the user's current state.
- [ ] If there are no accounts, show a CTA to create an account.
- [ ] If there are no transactions, show a CTA to add or import a transaction.
- [ ] If there are expenses but no budgets, show a CTA to create a budget.
- [ ] Measure time-to-first-transaction.

### Success Criteria

- [ ] A new user understands the next step without external documentation.
- [ ] The dashboard does not feel empty after onboarding.
- [ ] A user can reach their first transaction in under 3 minutes.

---

## Sprint 2: Trust, Security, and Public Professionalism

**Estimated duration:** 1-2 weeks

### Goal

Make MiniFT feel safe, clear, and trustworthy before users share personal finance data.

### Expected Outcome

Users understand what data MiniFT processes, what permissions it requests, how sessions are protected, and how they can delete or export their data.

### Tasks

- [ ] Create a public `/security` page.
- [ ] Explain the use of `HttpOnly` cookies.
- [ ] Explain that MiniFT does not ask for banking credentials.
- [ ] Explain that Gmail uses read-only permission.
- [ ] Explain what email messages MiniFT attempts to process.
- [ ] Explain how integration tokens are protected.
- [ ] Add a section about account and data deletion.
- [ ] Add a FAQ page or FAQ section on the landing page.
- [ ] Add "Does MiniFT access my bank?".
- [ ] Add "What Gmail permissions does MiniFT use?".
- [ ] Add "Can I delete my data?".
- [ ] Add "Is MiniFT free?".
- [ ] Create a simple `/pricing` page.
- [ ] Create a `/changelog` page.
- [ ] Create a `/roadmap` page or link.
- [ ] Add real product screenshots to the landing page.
- [ ] Refine landing copy to focus on outcomes, not only features.
- [ ] Review current privacy, terms, and cookies copy.

### Success Criteria

- [ ] A user clearly understands what data they share.
- [ ] The landing page builds trust before registration.
- [ ] Gmail feels like a safe, non-invasive integration.

---

## Sprint 3: Retention and Insights

**Estimated duration:** 3-4 weeks

### Goal

Give users real reasons to come back every week.

### Expected Outcome

MiniFT automatically surfaces useful financial information instead of only displaying manually entered data.

### Tasks

- [ ] Create a weekly summary.
- [ ] Create a monthly summary.
- [ ] Detect categories with increased spending.
- [ ] Compare current spending against the previous month.
- [ ] Make budget progress more actionable.
- [ ] Add alerts when budgets reach 70%, 90%, and 100%.
- [ ] Create in-app notifications.
- [ ] Show pending imports on the dashboard.
- [ ] Create a simple monthly financial health status.
- [ ] Detect relevant recurring expenses.
- [ ] Detect changes in recurring expenses.
- [ ] Add savings goals.
- [ ] Create an exportable monthly report.
- [ ] Allow exporting a summary as PDF or image.
- [ ] Add a reminder if the user has not recorded activity for several days.

### Success Criteria

- [ ] The dashboard answers "How is my month going?".
- [ ] Users receive actionable signals.
- [ ] There are clear reasons to return weekly.

---

## Sprint 4: Automation and Importing

**Estimated duration:** 3-5 weeks

### Goal

Reduce data-entry friction and turn automation into a product advantage.

### Expected Outcome

MiniFT helps users capture transactions faster while keeping review and control in the user's hands.

### Tasks

- [ ] Improve the integrations page.
- [ ] Show supported banks or email formats.
- [ ] Show the latest Gmail sync time.
- [ ] Show recent sync errors with actionable explanations.
- [ ] Show the number of learned import rules.
- [ ] Create editable import rules.
- [ ] Allow mapping merchant to category.
- [ ] Allow mapping merchant to account.
- [ ] Improve the quick import review flow.
- [ ] Allow approving or rejecting imports in bulk.
- [ ] Add duplicate detection.
- [ ] Create CSV import.
- [ ] Create a downloadable CSV template.
- [ ] Add CSV pre-validation.
- [ ] Show a preview before importing CSV data.
- [ ] Add import history.
- [ ] Add import filters by status, account, merchant, and date.
- [ ] Evaluate future support for receipts or photos.

### Success Criteria

- [ ] Users can load data without doing everything manually.
- [ ] Imports are trustworthy and reviewable.
- [ ] Automation does not remove user control.

---

## Sprint 5: Product Metrics

**Estimated duration:** 1-2 weeks

### Goal

Measure real behavior to improve conversion, activation, and retention.

### Expected Outcome

MiniFT has enough product data to understand where users drop off and which features create value.

### Tasks

- [ ] Choose a privacy-friendly analytics tool.
- [ ] Evaluate PostHog.
- [ ] Evaluate Plausible.
- [ ] Evaluate Umami.
- [ ] Define a privacy-respecting tracking policy.
- [ ] Track registration started.
- [ ] Track registration completed.
- [ ] Track email verified.
- [ ] Track successful login.
- [ ] Track first account created.
- [ ] Track first transaction created.
- [ ] Track first budget created.
- [ ] Track Gmail connected.
- [ ] Track first import approved.
- [ ] Track D1, D7, and D30 retention.
- [ ] Track reports usage.
- [ ] Track critical frontend and backend errors.
- [ ] Create an internal metrics dashboard.
- [ ] Document product events in a dedicated file.

### Success Criteria

- [ ] Activation rate can be calculated.
- [ ] Time-to-first-transaction can be calculated.
- [ ] Basic retention can be measured.
- [ ] Product decisions do not depend only on intuition.

---

## Sprint 6: Product Quality

**Estimated duration:** 2-3 weeks

### Goal

Polish the experience so MiniFT feels stable, consistent, and ready for real users.

### Expected Outcome

The product handles errors, loading states, destructive actions, and empty states professionally.

### Tasks

- [ ] Create a global toast system.
- [ ] Standardize success messages.
- [ ] Standardize error messages.
- [ ] Improve skeleton/loading states.
- [ ] Review all critical forms.
- [ ] Add confirmations for destructive actions.
- [ ] Add CSV export for transactions.
- [ ] Add CSV export for accounts and summaries.
- [ ] Add account deletion.
- [ ] Add full user data export.
- [ ] Add date format preferences.
- [ ] Add first-day-of-week preferences.
- [ ] Review basic accessibility.
- [ ] Review keyboard navigation.
- [ ] Review contrast and form labels.
- [ ] Add Sentry or another runtime error tracking tool.
- [ ] Add rate limiting to sensitive auth endpoints.
- [ ] Document the production backup strategy.
- [ ] Create a simple status/health page.

### Success Criteria

- [ ] Errors are understandable to users.
- [ ] Important actions provide clear feedback.
- [ ] The product feels consistent and robust.

---

## Sprint 7: Mobile and PWA

**Estimated duration:** 2-3 weeks

### Goal

Improve the mobile experience and make frequent usage easier.

### Expected Outcome

MiniFT works well as an installable app and as a quick tool for recording or reviewing activity.

### Tasks

- [ ] Create `manifest.webmanifest`.
- [ ] Add complete PWA icons.
- [ ] Add mobile metadata.
- [ ] Review installability in Chrome and Android.
- [ ] Create a subtle install CTA or prompt.
- [ ] Improve the basic offline shell.
- [ ] Add fallback UI when the API is unavailable.
- [ ] Optimize forms for mobile.
- [ ] Add a quick action for a new expense.
- [ ] Evaluate a floating "+" button on mobile.
- [ ] Improve import review on mobile.
- [ ] Review mobile navigation on secondary routes.
- [ ] Validate layouts on small widths.
- [ ] Review the Capacitor Android experience.
- [ ] Document the mobile build process.

### Success Criteria

- [ ] MiniFT can be installed as a PWA.
- [ ] Recording an expense on mobile is fast.
- [ ] Reviewing imports on mobile is comfortable.

---

## Sprint 8: Monetization

**Estimated duration:** 2-4 weeks

### Goal

Prepare MiniFT to become a sustainable product.

### Expected Outcome

There is a clear strategy for plans, limits, and premium features, even if billing is implemented later.

### Tasks

- [ ] Define the Free plan.
- [ ] Define the Pro plan.
- [ ] Define Free plan limits.
- [ ] Define premium features.
- [ ] Evaluate whether Gmail automation should be premium.
- [ ] Evaluate whether advanced reports should be premium.
- [ ] Evaluate whether advanced multi-currency features should be premium.
- [ ] Create a `/pricing` page.
- [ ] Add a subscription model in the backend.
- [ ] Evaluate Stripe.
- [ ] Create billing placeholders in settings.
- [ ] Create account states: free, trial, pro, cancelled.
- [ ] Define a trial period if needed.
- [ ] Create non-invasive upgrade messages.
- [ ] Avoid blocking core features too early.

### Success Criteria

- [ ] There is a clear offer for free and paid users.
- [ ] Monetization does not damage trust.
- [ ] The product can grow toward real revenue.

---

## Sprint 9: Support, Feedback, and Community

**Estimated duration:** 1-2 weeks

### Goal

Create channels to learn from real users and show that the product is alive.

### Expected Outcome

Users can report issues, suggest improvements, and understand where MiniFT is going.

### Tasks

- [ ] Add a feedback widget or form.
- [ ] Create a public support email.
- [ ] Add a support link in settings.
- [ ] Add a support link in the footer.
- [ ] Create a public roadmap page.
- [ ] Create a visible changelog.
- [ ] Add a short post-onboarding survey.
- [ ] Ask what financial goal the user has.
- [ ] Ask how the user plans to enter transactions.
- [ ] Document common support questions.
- [ ] Create a weekly feedback review process.
- [ ] Evaluate Discord, GitHub Discussions, or a simple form.

### Success Criteria

- [ ] Users can ask for help easily.
- [ ] Feedback reaches an actionable place.
- [ ] The product communicates steady progress.

---

## Sprint 10: Production and Operations

**Estimated duration:** 2-3 weeks

### Goal

Make sure MiniFT can operate reliably outside the local environment.

### Expected Outcome

Deployment is secure, observable, and maintainable.

### Tasks

- [ ] Review production environment variables.
- [ ] Confirm `AUTH_COOKIE_SECURE=true` in production.
- [ ] Confirm `AUTH_COOKIE_SAME_SITE=none` when cross-origin auth applies.
- [ ] Confirm explicit CORS origins.
- [ ] Avoid wildcard CORS in production.
- [ ] Review public Swagger/OpenAPI exposure.
- [ ] Decide whether Swagger remains public, protected, or disabled in production.
- [ ] Add a `DOCS_ENABLED` flag.
- [ ] Add enough structured logging.
- [ ] Add uptime monitoring.
- [ ] Add alerts for backend downtime.
- [ ] Add alerts for Gmail sync failures.
- [ ] Document PostgreSQL backups.
- [ ] Document PostgreSQL restore.
- [ ] Review migrations before production releases.
- [ ] Review rate limiting boundaries.
- [ ] Review Railway and Cloudflare secrets.
- [ ] Review privacy requirements for Gmail and Google verification.
- [ ] Prepare a release checklist.

### Success Criteria

- [ ] The system is safe for real users.
- [ ] Failures are visible when they happen.
- [ ] Public API documentation has an intentional policy.

---

## Recommended Order

1. Activation and first use.
2. Trust and public security.
3. Retention and insights.
4. Automation and importing.
5. Product metrics.
6. Product quality.
7. Mobile/PWA.
8. Monetization.
9. Support/feedback.
10. Production/operations.

---

## Approximate Timeline

Assuming steady part-time work, this roadmap is roughly **19-31 weeks** of work.

If working nearly full-time with focused scope control, it could be closer to **12-18 weeks**.

If learning, design iteration, production deployment, user feedback, and third-party approvals are included, plan for **5-8 months**.

---

## North Star Metrics

- Activation rate.
- Time-to-first-transaction.
- D1 retention.
- D7 retention.
- D30 retention.
- Percentage of users who create a budget.
- Percentage of users who connect Gmail.
- Percentage of imports approved.
- Number of transactions per active user.
- Weekly active users.
