# MiniFT - Roadmap de producto terminado

Este documento organiza las mejoras necesarias para convertir MiniFT en un producto mas terminado, profesional, confiable y capaz de atraer y retener usuarios.

---

## Sprint 1: Activacion y primer uso

### Objetivo

Lograr que un usuario nuevo llegue a su primer momento de valor en menos de 3 minutos.

### Resultado esperado

Un usuario debe poder registrarse, entender que hacer, agregar o importar datos basicos y ver un dashboard util sin sentirse perdido.

### Tareas

- [ ] Crear onboarding post-registro.
- [ ] Mostrar checklist inicial dentro del dashboard.
- [ ] Confirmar o crear cuenta principal durante onboarding.
- [ ] Permitir elegir moneda principal durante onboarding.
- [ ] Guiar al usuario para agregar su primera transaccion.
- [ ] Guiar al usuario para crear su primer presupuesto.
- [ ] Ofrecer conectar Gmail como paso opcional.
- [ ] Agregar opcion "Probar demo" desde landing.
- [ ] Crear workspace demo accesible sin friccion.
- [ ] Agregar opcion "Crear datos de ejemplo" para usuarios nuevos.
- [ ] Mejorar empty states en dashboard, accounts, transactions, budgets, reports e imports.
- [ ] Agregar CTAs contextuales segun estado del usuario.
- [ ] Si no hay cuentas, mostrar CTA para crear cuenta.
- [ ] Si no hay transacciones, mostrar CTA para agregar o importar transaccion.
- [ ] Si hay gastos pero no presupuestos, mostrar CTA para crear presupuesto.
- [ ] Medir tiempo hasta primera transaccion.

### Criterios de exito

- [ ] Un usuario nuevo entiende el siguiente paso sin documentacion externa.
- [ ] El dashboard no se siente vacio despues del onboarding.
- [ ] El usuario puede llegar a su primera transaccion en menos de 3 minutos.

---

## Sprint 2: Confianza, seguridad y profesionalismo publico

### Objetivo

Hacer que MiniFT se perciba como un producto seguro, claro y confiable.

### Resultado esperado

El usuario debe entender que datos procesa MiniFT, que permisos solicita, como protege la sesion y como puede borrar o exportar sus datos.

### Tareas

- [ ] Crear pagina publica `/security`.
- [ ] Explicar uso de cookies `HttpOnly`.
- [ ] Explicar que MiniFT no solicita credenciales bancarias.
- [ ] Explicar que Gmail usa permiso read-only.
- [ ] Explicar que correos intenta procesar MiniFT.
- [ ] Explicar como se protegen tokens de integracion.
- [ ] Agregar seccion sobre eliminacion de cuenta y datos.
- [ ] Agregar pagina o seccion FAQ en landing.
- [ ] Agregar pregunta "MiniFT accede a mi banco?".
- [ ] Agregar pregunta "Que permisos usa Gmail?".
- [ ] Agregar pregunta "Puedo borrar mis datos?".
- [ ] Agregar pregunta "MiniFT es gratis?".
- [ ] Crear pagina `/pricing`, aunque sea simple.
- [ ] Crear pagina `/changelog`.
- [ ] Crear pagina o link `/roadmap`.
- [ ] Agregar screenshots reales del producto en landing.
- [ ] Revisar copy de landing para enfocarlo en resultados, no solo features.
- [ ] Revisar textos legales actuales de privacy, terms y cookies.

### Criterios de exito

- [ ] Un usuario entiende claramente que datos comparte.
- [ ] La landing transmite confianza antes del registro.
- [ ] Gmail se percibe como una integracion segura, no invasiva.

---

## Sprint 3: Retencion e insights

### Objetivo

Dar razones reales para que el usuario vuelva cada semana.

### Resultado esperado

MiniFT debe entregar informacion util automaticamente, no solo mostrar datos cargados manualmente.

### Tareas

- [ ] Crear resumen semanal.
- [ ] Crear resumen mensual.
- [ ] Detectar categorias con aumento de gasto.
- [ ] Comparar gasto actual contra mes anterior.
- [ ] Mostrar progreso de presupuestos de forma mas accionable.
- [ ] Agregar alertas al alcanzar 70%, 90% y 100% de un presupuesto.
- [ ] Crear notificaciones in-app.
- [ ] Mostrar importaciones pendientes en dashboard.
- [ ] Crear financial health simple del mes.
- [ ] Detectar gastos recurrentes relevantes.
- [ ] Detectar cambios en gastos recurrentes.
- [ ] Agregar objetivos de ahorro.
- [ ] Crear reporte mensual exportable.
- [ ] Permitir exportar resumen como PDF o imagen.
- [ ] Agregar recordatorio si el usuario no registra movimientos por varios dias.

### Criterios de exito

- [ ] El dashboard responde "como va mi mes".
- [ ] El usuario recibe senales accionables.
- [ ] Hay motivos claros para volver semanalmente.

---

## Sprint 4: Automatizacion e importacion

### Objetivo

Reducir friccion de entrada de datos y convertir la automatizacion en una ventaja competitiva.

### Resultado esperado

MiniFT debe ayudar a capturar transacciones mas rapido, con revision segura y control del usuario.

### Tareas

- [ ] Mejorar pagina de integraciones.
- [ ] Mostrar bancos o correos soportados.
- [ ] Mostrar ultima sincronizacion de Gmail.
- [ ] Mostrar errores recientes de sincronizacion con explicacion accionable.
- [ ] Mostrar numero de reglas aprendidas.
- [ ] Crear reglas editables para importaciones.
- [ ] Permitir mapear merchant a categoria.
- [ ] Permitir mapear merchant a cuenta.
- [ ] Mejorar flujo de revision rapida de importaciones.
- [ ] Permitir aprobar o rechazar importaciones en lote.
- [ ] Agregar deteccion de duplicados.
- [ ] Crear importacion CSV.
- [ ] Crear template CSV descargable.
- [ ] Agregar validacion previa de CSV.
- [ ] Mostrar preview antes de importar CSV.
- [ ] Agregar historial de imports.
- [ ] Agregar filtros en imports por estado, cuenta, merchant y fecha.
- [ ] Evaluar soporte futuro para recibos o fotos.

### Criterios de exito

- [ ] El usuario puede cargar datos sin hacerlo todo manualmente.
- [ ] Las importaciones son confiables y revisables.
- [ ] La automatizacion no sacrifica control del usuario.

---

## Sprint 5: Metricas de producto

### Objetivo

Medir comportamiento real para mejorar conversion, activacion y retencion.

### Resultado esperado

MiniFT debe tener datos suficientes para saber donde abandonan los usuarios y que features generan valor.

### Tareas

- [ ] Elegir herramienta de analytics privacy-friendly.
- [ ] Evaluar PostHog.
- [ ] Evaluar Plausible.
- [ ] Evaluar Umami.
- [ ] Definir politica de tracking respetuosa de privacidad.
- [ ] Medir registro iniciado.
- [ ] Medir registro completado.
- [ ] Medir email verificado.
- [ ] Medir login exitoso.
- [ ] Medir primera cuenta creada.
- [ ] Medir primera transaccion creada.
- [ ] Medir primer presupuesto creado.
- [ ] Medir Gmail conectado.
- [ ] Medir primera importacion aprobada.
- [ ] Medir retorno D1, D7 y D30.
- [ ] Medir uso de reportes.
- [ ] Medir errores criticos frontend y backend.
- [ ] Crear dashboard interno de metricas.
- [ ] Documentar eventos en un archivo de producto.

### Criterios de exito

- [ ] Se puede calcular activation rate.
- [ ] Se puede calcular time-to-first-transaction.
- [ ] Se puede medir retencion basica.
- [ ] Las decisiones de producto no dependen solo de intuicion.

---

## Sprint 6: Calidad de producto

### Objetivo

Pulir la experiencia para que MiniFT se sienta estable, consistente y listo para usuarios reales.

### Resultado esperado

El producto debe manejar errores, cargas, acciones destructivas y estados vacios de forma profesional.

### Tareas

- [ ] Crear sistema global de toasts.
- [ ] Unificar mensajes de exito.
- [ ] Unificar mensajes de error.
- [ ] Mejorar skeleton/loading states.
- [ ] Revisar todos los formularios criticos.
- [ ] Agregar confirmaciones para acciones destructivas.
- [ ] Agregar exportacion CSV de transacciones.
- [ ] Agregar exportacion CSV de cuentas y resumen.
- [ ] Agregar eliminacion de cuenta.
- [ ] Agregar exportacion completa de datos del usuario.
- [ ] Agregar preferencias de formato de fecha.
- [ ] Agregar preferencias de primer dia de la semana.
- [ ] Revisar accesibilidad basica.
- [ ] Revisar navegacion por teclado.
- [ ] Revisar contraste y labels de formularios.
- [ ] Agregar Sentry o alternativa para errores runtime.
- [ ] Agregar rate limiting en endpoints sensibles de auth.
- [ ] Documentar estrategia de backups de produccion.
- [ ] Crear status/health page simple.

### Criterios de exito

- [ ] Los errores son entendibles para usuarios.
- [ ] Las acciones importantes dan feedback claro.
- [ ] El producto se siente consistente y robusto.

---

## Sprint 7: Mobile y PWA

### Objetivo

Mejorar la experiencia movil y facilitar el uso frecuente.

### Resultado esperado

MiniFT debe funcionar bien como app instalable y como herramienta rapida para registrar o revisar movimientos.

### Tareas

- [ ] Crear `manifest.webmanifest`.
- [ ] Agregar iconos PWA completos.
- [ ] Agregar metadata mobile.
- [ ] Revisar installability en Chrome y Android.
- [ ] Crear prompt o CTA discreto para instalar app.
- [ ] Mejorar shell offline basico.
- [ ] Agregar fallback cuando API no esta disponible.
- [ ] Optimizar formularios para mobile.
- [ ] Agregar accion rapida para nuevo gasto.
- [ ] Evaluar boton flotante "+" en mobile.
- [ ] Mejorar revision de imports en mobile.
- [ ] Revisar navegacion mobile en rutas secundarias.
- [ ] Validar layout en anchos pequenos.
- [ ] Revisar experiencia Capacitor Android.
- [ ] Documentar proceso de build mobile.

### Criterios de exito

- [ ] MiniFT se puede instalar como PWA.
- [ ] Registrar un gasto en mobile es rapido.
- [ ] Revisar importaciones en mobile es comodo.

---

## Sprint 8: Monetizacion

### Objetivo

Preparar MiniFT para convertirse en un producto sostenible.

### Resultado esperado

Debe existir una estrategia clara de planes, limites y features premium, aunque el cobro se implemente despues.

### Tareas

- [ ] Definir plan Free.
- [ ] Definir plan Pro.
- [ ] Definir limites del plan Free.
- [ ] Definir features premium.
- [ ] Evaluar si Gmail automation sera premium.
- [ ] Evaluar si reportes avanzados seran premium.
- [ ] Evaluar si multi-moneda avanzada sera premium.
- [ ] Crear pagina `/pricing`.
- [ ] Agregar modelo de subscription en backend.
- [ ] Evaluar Stripe.
- [ ] Crear placeholders de billing en settings.
- [ ] Crear estados de cuenta: free, trial, pro, cancelled.
- [ ] Definir periodo trial si aplica.
- [ ] Crear mensajes de upgrade no invasivos.
- [ ] Evitar bloquear features basicas demasiado pronto.

### Criterios de exito

- [ ] Hay una propuesta clara para usuarios gratis y pagos.
- [ ] La monetizacion no rompe la confianza.
- [ ] El producto puede crecer hacia ingresos reales.

---

## Sprint 9: Soporte, feedback y comunidad

### Objetivo

Crear canales para aprender de usuarios reales y mostrar que el producto esta vivo.

### Resultado esperado

Los usuarios deben poder reportar problemas, sugerir mejoras y entender hacia donde va MiniFT.

### Tareas

- [ ] Agregar feedback widget o formulario.
- [ ] Crear email publico de soporte.
- [ ] Agregar link de soporte en settings.
- [ ] Agregar link de soporte en footer.
- [ ] Crear pagina publica de roadmap.
- [ ] Crear changelog visible.
- [ ] Agregar encuesta breve post-onboarding.
- [ ] Preguntar que objetivo financiero tiene el usuario.
- [ ] Preguntar como piensa cargar transacciones.
- [ ] Documentar preguntas frecuentes de soporte.
- [ ] Crear proceso para revisar feedback semanalmente.
- [ ] Evaluar Discord, GitHub Discussions o formulario simple.

### Criterios de exito

- [ ] Los usuarios pueden pedir ayuda facilmente.
- [ ] El feedback llega a un lugar accionable.
- [ ] El producto comunica evolucion constante.

---

## Sprint 10: Produccion y operacion

### Objetivo

Asegurar que MiniFT pueda operar de forma confiable fuera del entorno local.

### Resultado esperado

El despliegue debe ser seguro, observable y mantenible.

### Tareas

- [ ] Revisar variables de entorno de produccion.
- [ ] Confirmar `AUTH_COOKIE_SECURE=true` en produccion.
- [ ] Confirmar `AUTH_COOKIE_SAME_SITE=none` cuando aplique cross-origin.
- [ ] Confirmar CORS explicito.
- [ ] Evitar wildcard CORS en produccion.
- [ ] Revisar exposicion publica de Swagger/OpenAPI.
- [ ] Decidir si Swagger queda publico, protegido o desactivado en produccion.
- [ ] Agregar flag `DOCS_ENABLED`.
- [ ] Agregar logs estructurados suficientes.
- [ ] Agregar monitoreo de uptime.
- [ ] Agregar alertas de backend caido.
- [ ] Agregar alertas de fallos de Gmail sync.
- [ ] Documentar backups de PostgreSQL.
- [ ] Documentar restore de PostgreSQL.
- [ ] Revisar migraciones antes de produccion.
- [ ] Revisar limites de rate limiting.
- [ ] Revisar secretos en Railway y Cloudflare.
- [ ] Revisar politicas de privacidad para Gmail y Google verification.
- [ ] Preparar checklist de release.

### Criterios de exito

- [ ] El sistema es seguro para usuarios reales.
- [ ] Hay visibilidad cuando algo falla.
- [ ] La documentacion publica de API tiene una decision consciente.

---

## Orden recomendado

1. Activacion y primer uso.
2. Confianza y seguridad publica.
3. Retencion e insights.
4. Automatizacion e importacion.
5. Metricas de producto.
6. Calidad de producto.
7. Mobile/PWA.
8. Monetizacion.
9. Soporte/feedback.
10. Produccion/operacion.

---

## Metricas norte

- Activation rate.
- Time-to-first-transaction.
- D1 retention.
- D7 retention.
- D30 retention.
- Porcentaje de usuarios que crean presupuesto.
- Porcentaje de usuarios que conectan Gmail.
- Porcentaje de importaciones aprobadas.
- Numero de transacciones por usuario activo.
- Usuarios activos semanales.
