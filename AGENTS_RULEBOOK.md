# LifePhone Agent Rulebook

Este archivo es obligatorio para cualquier agente de IA que lea, modifique o genere contenido en este repositorio.

## 1. SDD y TDD son obligatorios

- Consultar primero `specs/`, en particular [specs/README.md](specs/README.md), el Spec de la tarea y las reglas de `.harness/`.
- No iniciar implementación sin un criterio de aceptación verificable.
- Escribir o actualizar las pruebas antes del código de producción y confirmar el estado rojo cuando se trate de una funcionalidad nueva.
- Mantener Vitest y TypeScript en verde. Ejecutar `npm test` y `npm run typecheck` después de cada cambio relevante.
- Ejecutar siempre `bash .harness/scripts/init.sh` antes de marcar una tarea como terminada.
- No marcar tareas como `done` ni crear commits si el arnés, Vitest o typecheck fallan.
- No romper, eliminar, desactivar ni saltarse `mi-arnes-ia`, sus hooks, sus reglas o sus tareas para hacer pasar una validación.

## 2. No crear UI huérfana

- Está prohibido crear componentes, pantallas, rutas, estilos o flujos visuales sin un Spec previo y pruebas de comportamiento asociadas.
- La interfaz debe consumir repositorios y casos de uso tipados; no debe contener SQL, claves `service_role`, reglas RLS duplicadas ni autorización improvisada.
- Toda nueva superficie visual debe declarar estados de carga, vacío, error, acceso denegado y sesión expirada cuando corresponda.
- Si la especificación y la implementación divergen, detenerse y actualizar el Spec y sus pruebas antes de continuar.

## 3. Aislamiento estricto de Supabase

- RLS es la autoridad final de seguridad. Los guards de Expo solo mejoran la experiencia y nunca sustituyen RLS.
- Resolver roles con `check_user_role` y el perfil autenticado; nunca confiar en un rol enviado por el cliente, URL, AsyncStorage o estado local.
- `store_user` nunca puede consultar, insertar, actualizar ni eliminar filas de `expansion_leads`.
- No agregar una política permisiva para `store_user` sobre el CRM de expansión, aunque la interfaz o una prueba local parezcan necesitarla.
- Propagar los errores de autorización de Supabase, incluido `42501`; no convertir una denegación en una respuesta vacía exitosa.
- Nunca incluir claves `service_role`, tokens, credenciales, datos reales o secretos en código, pruebas, logs o commits.

## 4. Blobatar para avatares

- La generación visual de avatares de tiendas y perfiles debe usar la librería oficial `@blobatar/react-native` junto con `react-native-svg`.
- El avatar debe ser determinista: usar el nombre de la tienda o del usuario como `seed` estable y no generar una identidad aleatoria en cada render.
- Pasar siempre la prop `size` de forma explícita por las limitaciones de diseño de React Native; nunca depender del tamaño por defecto.
- La integración de Blobatar requiere un Spec frontend, pruebas de render/seed/tamaño y validación del arnés antes de incorporarse a una pantalla.
- No dibujar reemplazos SVG manuales ni añadir otra librería de avatares sin actualizar la especificación y verificar la dependencia instalada.

## 5. Procedimiento de cambio

1. Leer `specs/`, `.harness/rules/`, `agents.md` y la tarea activa.
2. Formular el contrato y escribir la prueba.
3. Ejecutar la prueba roja.
4. Implementar el cambio mínimo.
5. Ejecutar:

   ```bash
   npm test
   npm run typecheck
   bash .harness/scripts/init.sh
   ```

6. Revisar diff, secretos, aislamiento de roles y documentación.
7. Actualizar el Spec y el estado de la tarea únicamente con todas las verificaciones en verde.

La continuidad del arnés y el cumplimiento de estos límites son requisitos de aceptación, no recomendaciones.