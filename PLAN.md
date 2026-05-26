# MiniFT Landing Page — Plan de mejoras

## Objetivo

Enriquecer la landing page para que sea más profesional, comunique mejor el
valor del producto, y permita explorar la app sin necesidad de iniciar sesión.

## Alcance

- Mantener paleta, tipografía y tono actuales (DESIGN.md).
- No modificar rutas protegidas ni lógica de auth.
- Solo tocar: `frontend/app/page.tsx` y `frontend/components/marketing/`.

---

## Archivos a modificar

| Archivo | Tipo de cambio |
|---|---|
| `frontend/components/marketing/finance-snapshot.tsx` | Ampliar con tabs interactivos |
| `frontend/app/page.tsx` | Agregar secciones y enriquecer contenido |

---

## Tareas

### Tarea 1 — `FinanceSnapshot` con tabs navegables

**Archivo:** `frontend/components/marketing/finance-snapshot.tsx`

- Convertir a `"use client"` (necesita estado para el tab activo).
- Agregar un componente de tabs con 4 opciones:
  - **Overview** — contenido actual: cash flow summary + activity list.
  - **Budgets** — 4-5 categorías con barra de progreso y monto usado/cap.
  - **Transactions** — lista de 6 transacciones mock con decoración de filtro de mes.
  - **Reports** — representación visual de Income vs Expenses (últimos 3 meses mock).
- Todos los datos son hardcodeados (sin API calls).
- El tab activo se controla con `useState`.
- Mantener el prop `showActivity` existente para compatibilidad.

**Datos mock:**

```ts
// Budgets
{ category: "Food", used: 320, cap: 500 },
{ category: "Transport", used: 95, cap: 200 },
{ category: "Entertainment", used: 60, cap: 100 },
{ category: "Health", used: 140, cap: 150 },

// Transactions
{ label: "Salary", type: "income", account: "Main account", amount: "+$4,200" },
{ label: "Groceries", type: "expense", category: "Food", amount: "-$184" },
{ label: "Netflix", type: "expense", category: "Entertainment", amount: "-$18" },
{ label: "Gym", type: "expense", category: "Health", amount: "-$45" },
{ label: "Savings move", type: "transfer", account: "Internal", amount: "$750" },
{ label: "Freelance", type: "income", account: "Business", amount: "+$800" },

// Reports (últimos 3 meses)
{ month: "Feb", income: 4200, expenses: 1620 },
{ month: "Mar", income: 5000, expenses: 1980 },
{ month: "Apr", income: 4200, expenses: 1845 },
```

---

### Tarea 2 — Sección "How it works"

**Archivo:** `frontend/app/page.tsx`

- Insertar entre el hero y los feature cards.
- Layout: 1 columna en mobile → 3 columnas en `md+`.
- Cada paso contiene: número en pill (signal) + título + descripción de 1-2 líneas.
- Pasos:
  1. **Connect your accounts** — Cash, bank, credit, or loan. Set them up once.
  2. **Log your transactions** — Manually or via recurring rules for scheduled flows.
  3. **Read your month** — Budgets, reports, and cash flow at a glance.
- Separador visual sutil (`border-line/40`) entre secciones.

---

### Tarea 3 — Feature cards enriquecidas

**Archivo:** `frontend/app/page.tsx`

- Mantener las 4 cards existentes (Accounts, Budgets, Recurring, Reports).
- Agregar 2-3 bullet points debajo de la descripción actual en cada card.
- Ejemplo para "Budgets":
  - Set monthly caps per category
  - Track spend in real time
  - Get warned before you overshoot

---

### Tarea 4 — CTA de cierre

**Archivo:** `frontend/app/page.tsx`

- Insertar antes de `<SiteFooter />`.
- Sección centrada con:
  - Headline: `"Ready to read your finances clearly?"`
  - Subtext: `"Free to use. No card required."`
  - Botón primario: `"Create your workspace"` → `/register`
- Background: panel elevado (`bg-background-elevated`).

---

## Orden de implementación

- [x] Escribir este PLAN.md
- [x] Tarea 1 — Expandir `FinanceSnapshot` con tabs interactivos
- [x] Tarea 2 — Agregar sección "How it works" en `page.tsx`
- [x] Tarea 3 — Enriquecer feature cards en `page.tsx`
- [x] Tarea 4 — Agregar CTA de cierre en `page.tsx`
- [x] Verificación: `npm run lint` y `npm run build`
- [ ] Revisión visual desktop y mobile

---

## Verificación final

```bash
cd frontend && npm run lint
cd frontend && npm run build
```

Checklist manual:
- [x] Desktop: hero split layout correcto, tabs del demo funcionan.
- [x] Mobile: tabs apiladas correctamente, secciones nuevas no rompen el layout.
- [x] Todos los links del landing siguen apuntando a `/register` y `/login`.
- [x] No hay llamadas a API ni imports de rutas protegidas.
