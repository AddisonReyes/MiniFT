# MiniFT — Plan de desarrollo

---

## Sprint 1: Landing Page (completado)

### Objetivo
Enriquecer la landing page para que sea más profesional, comunique mejor el
valor del producto, y permita explorar la app sin necesidad de iniciar sesión.

### Tareas
- [x] Expandir `FinanceSnapshot` con tabs interactivos (Overview, Budgets, Transactions, Reports)
- [x] Agregar sección "How it works" en `page.tsx`
- [x] Enriquecer feature cards con bullet points en `page.tsx`
- [x] Agregar CTA de cierre en `page.tsx`
- [x] Ajustar espaciado entre secciones
- [x] Verificación: `npm run lint` y `npm run build`

---

## Sprint 2: Internacionalización (i18n) — EN / ES

### Objetivo
Implementar soporte completo de idioma inglés (principal) y español (secundario)
en todo el frontend, con persistencia en localStorage y selector visible en el
navbar del AppShell y en la página de Settings.

### Enfoque técnico
- Librería: `react-i18next` + `i18next`
- Estrategia: client-side locale (compatible con `output: "export"`)
- Persistencia: `localStorage` vía `i18next-browser-languagedetector`
- Sin cambios de URL ni restructuración de carpetas

### Archivos nuevos
| Archivo | Descripción |
|---|---|
| `frontend/lib/i18n/config.ts` | Inicialización de i18next |
| `frontend/lib/i18n/en.json` | Strings en inglés (fuente de verdad) |
| `frontend/lib/i18n/es.json` | Strings en español |
| `frontend/components/locale-switcher.tsx` | Toggle EN / ES reutilizable |

### Archivos a modificar
| Archivo | Cambio |
|---|---|
| `frontend/package.json` | Instalar `i18next`, `react-i18next`, `i18next-browser-languagedetector` |
| `frontend/components/providers.tsx` | Agregar `I18nextProvider` |
| `frontend/app/layout.tsx` | `lang` dinámico en `<html>` |
| `frontend/components/app-shell.tsx` | Nav labels + "Workspace" + aria-labels traducidos; agregar LocaleSwitcher |
| `frontend/app/page.tsx` | Todo el copy de marketing traducido |
| `frontend/app/login/page.tsx` | Strings de auth traducidos |
| `frontend/app/register/page.tsx` | Strings de auth traducidos |
| `frontend/app/forgot-password/page.tsx` | Strings de auth traducidos |
| `frontend/app/verify-email/page.tsx` | Strings traducidos |
| `frontend/app/dashboard/page.tsx` | title + description + contenido |
| `frontend/app/transactions/page.tsx` | title + description + contenido |
| `frontend/app/accounts/page.tsx` | title + description + contenido |
| `frontend/app/budgets/page.tsx` | title + description + contenido |
| `frontend/app/reports/page.tsx` | title + description + contenido |
| `frontend/app/settings/page.tsx` | title + description + sección de idioma |
| `frontend/app/imports/page.tsx` | title + description + contenido |
| `frontend/components/marketing/finance-snapshot.tsx` | Labels del demo widget |
| `frontend/components/transactions/*.tsx` | Labels de formularios y filtros |
| `frontend/lib/error-message.ts` | Strings de error traducidos |
| `frontend/lib/format.ts` | Formatters locale-aware |

### Orden de implementación
- [x] Paso 1 — Instalar dependencias i18n
- [x] Paso 2 — Crear `lib/i18n/config.ts` + `en.json` + `es.json`
- [x] Paso 3 — Agregar `I18nextProvider` en `providers.tsx`
- [x] Paso 4 — Crear `locale-switcher.tsx`
- [x] Paso 5 — Integrar switcher en `AppShell` (navbar) y traducir nav labels
- [x] Paso 6 — Traducir landing page (`app/page.tsx` + `finance-snapshot.tsx`)
- [x] Paso 7 — Traducir páginas de auth (login, register, forgot-password, verify-email)
- [x] Paso 8 — Traducir páginas protegidas (dashboard, transactions, accounts, budgets, reports, settings, imports)
- [x] Paso 9 — Traducir componentes de transacciones (filtros, lista)
- [x] Paso 10 — Adaptar `lib/error-message.ts`
- [x] Paso 11 — `lang` dinámico vía `HtmlLangSync` en `providers.tsx`
- [x] Paso 12 — Sección "Language" con `LocaleSwitcher` en Settings page
- [x] Paso 13 — Verificación: `npm run lint` y `npm run build`

### Verificación final
```bash
cd frontend && npm run lint
cd frontend && npm run build
```

Checklist manual:
- [ ] Switcher visible en navbar desktop y en Settings
- [ ] Cambio de idioma persiste tras recargar la página
- [ ] `<html lang>` cambia dinámicamente al cambiar idioma
- [ ] Landing page completamente traducida en ambos idiomas
- [ ] Auth pages completamente traducidas
- [ ] Páginas protegidas (title, description, contenido) traducidas
- [ ] Modals y formularios traducidos
- [ ] Mensajes de error traducidos
- [ ] Formatos de fecha y moneda respetan el locale activo
