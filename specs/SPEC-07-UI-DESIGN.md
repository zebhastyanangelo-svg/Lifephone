# SPEC-07: Sistema de Diseño e Interfaz Gráfica (UI/UX) — LifePhone "Your Digital Mind"

> Estado: **baseline formal y estricto para la implementación TDD de los componentes UI.** Ningún componente,
> pantalla o estilo se implementa sin las pruebas descritas en §6 (AGENTS_RULEBOOK §2: no UI huérfana).

## 1. Objetivo y relación con los Specs previos

- **SPEC-04** fija el árbol Expo/PWA, la matriz de rutas por rol y el contrato de Blobatar (seed estable, `size`
  explícito, verificación de dependencias en `package.json`).
- **SPEC-05** implementó el núcleo de frontend agnóstico (`src/frontend/`): máquina de sesión, aterrizajes por
  rol, puente de rutas, estados de vista (`ViewState`) y `buildAvatarSpec`.
- **SPEC-06** tipó el manifiesto de pantallas (`SCREEN_TREE`, 11 entradas), la resolución de rutas por fase/rol y
  el `ScreenPageModel` (título, `ViewState`, `AvatarSpec`).

Este Spec define la **capa visual**: estética y *look & feel*, tokens de diseño, componentes base (`LifeButton`,
`LifeCard`, `LifeInput`, `LifeNav`/`LifeBottomNav`), la integración de **`@blobatar/react`** con sus animaciones
interactivas y el contrato de layout de **cada una de las 11 pantallas tipadas en SPEC-06**. Sirve de base
estricta antes de iniciar la implementación TDD de los componentes.

### 1.1 Fases

- **Fase 1 (este Spec):** documento, tokens y contratos de componentes. No se añade ninguna dependencia aquí.
- **Fase 2 (implementación TDD):** una tarea separada introduce el *component test tool* (SPEC-04 §8) y monta los
  componentes bajo `src/components/` con los tests de §6 en rojo primero.
- **Plataformas:** la superficie actual del repo es Vite/PWA; la integración primaria de avatares de este Spec usa
  `@blobatar/react` con `blobatar/motion.css`. La variante React Native (`@blobatar/react-native` +
  `react-native-svg`, AGENTS_RULEBOOK §4) queda como fase posterior separada con su propia verificación
  (SPEC-04 §7). El contrato `AvatarSpec` (seed/size/fallback) es agnóstico de plataforma y ya está implementado en
  SPEC-05 §7.

## 2. Estética y Look & Feel

### 2.1 Concepto visual

Estética futurista, minimalista y oscura inspirada en la identidad de marca de LifePhone ("Your Digital Mind").
Se prioriza la sensación de un sistema operativo digital avanzado: fondos casi negros, superficies de cristal
flotantes, un único acento de color vivo para estados activos y tipografía geométrica de trazos limpios.

Reglas globales de la identidad:

- Las superficies nunca compiten entre sí: la jerarquía se construye con **cristal + borde sutil + sombra
  difusa**, nunca con fondos saturados.
- El acento eléctrico/cian se reserva para: foco, selección, indicadores de actividad en tiempo real y trazos del
  isotipo. El contenido pasivo se dibuja en blanco puro o gris plata tenue.
- Todo estado (`loading` / `empty` / `error` / `forbidden`) debe ser reconocible con el isotipo + color + motion
  del sistema, no solo por el texto.

### 2.2 Design tokens (paleta)

Variables CSS canónicas — los componentes consumen tokens, jamás valores *hardcodeados*:

| Token | Valor | Uso |
| --- | --- | --- |
| `--lp-bg-base` | `#050505` | Fondo raíz (negro absoluto). |
| `--lp-bg-surface` | `#0a0a0c` | Superficies sólidas secundarias (gris carbón). |
| `--lp-glass-bg` | `rgba(255, 255, 255, 0.03)` | Relleno translúcido de las superficies de cristal. |
| `--lp-glass-border` | `rgba(255, 255, 255, 0.08)` | Borde sutil de cristal. |
| `--lp-glass-blur` | `12px` | `backdrop-filter: blur(12px)` en toda superficie glass. |
| `--lp-primary` | `#ffffff` | Blanco puro: tipografía principal, trazos activos, botón primario. |
| `--lp-accent-electric` | `#0044ff` | Azul eléctrico: selección, foco profundo, indicadores. |
| `--lp-accent-cyan` | `#00f0ff` | Cian: foco de inputs, actividad en tiempo real, brillo del isotipo. |
| `--lp-text-muted` | `#94a3b8` | Gris plata tenue para subtítulos y metadatos. |
| `--lp-radius` | `12px` / `16px` (s / m) | Radios base de componentes. |
| `--lp-shadow-glass` | `0 8px 32px rgba(0, 0, 0, 0.45)` | Sombra difusa de tarjetas y barras flotantes. |
| `--lp-motion-fast` | `160ms ease-out` | Transiciones rápidas (hover, foco). |
| `--lp-motion-base` | `240ms ease-out` | Transiciones de layout y cristal. |

Cualquier desviación de estos valores exige actualizar el token y sus tests (§6), no parchear un componente.

### 2.3 Tipografía

- **Display** (títulos y logotipo): familia geométrica sans-serif moderna (propuesta: **Space Grotesk**) con
  `letter-spacing` amplio (`0.08em`–`0.16em`).
- **Texto / UI** (cuerpo): familia limpia y legible (propuesta: **Inter**) con `font-variant-numeric: tabular-nums`
  para precios, cantidades y métricas.
- Fallback: `system-ui, -apple-system, sans-serif`. Jerarquía: títulos `20–28px`; cuerpo `14–16px`;
  metadatos `12–13px` con `--lp-text-muted`.
- La inclusión real de las webfonts como dependencia se verifica en Fase 2 (análogo SPEC-04 §7); los tokens de
  tamaño/espaciado quedan definidos desde ahora.

### 2.4 Superficies glassmorphism

Receta única y tokenizada (sin variantes ad-hoc):

```css
.life-glass {
  background: var(--lp-glass-bg);
  border: 1px solid var(--lp-glass-border);
  border-radius: var(--lp-radius);
  backdrop-filter: blur(var(--lp-glass-blur));
  -webkit-backdrop-filter: blur(var(--lp-glass-blur));
  box-shadow: var(--lp-shadow-glass);
}
```

Reglas:

- El desenfoque se aplica **solo a superficies flotantes** (nav, tarjetas, modales, inputs); nunca a la capa raíz
  completa.
- Fallback para navegadores sin `backdrop-filter`: vía `@supports`, elevar `--lp-glass-bg` a
  `rgba(10, 10, 12, 0.92)` para no perder contraste.
- En móvil, priorizar el borde de 1px y reducir sombras pesadas.

### 2.5 Isotipo animado ("Volvatar", pulso *pum-pum*)

- El isotipo de marca (simétrico, líneas angulares y cruzadas) pulsa rítmicamente de forma sutil durante estados
  de **carga**, **sincronización con Supabase** y **autenticación**, y emite un destello de brillo cian al
  confirmar acciones exitosas o cambiar de pantalla.
- Implementación: `@keyframes lp-pulse` (`transform: scale(1) → scale(1.04)`, `opacity: 1 → 0.85`), respetando
  `prefers-reduced-motion` (animación desactivada).

## 3. Componentes base del sistema

Todos los componentes viven en `src/components/` (Fase 2), son puros (props tipadas, sin llamadas a Supabase ni
reglas de negocio) y consumen los tokens de §2. Cada uno tiene tests de comportamiento en §6.

### 3.1 `LifeButton`

Props: `variant: 'primary' | 'glass' | 'ghost'`, `size: 'sm' | 'md' | 'lg'`, `disabled`, `loading`, `icon?`,
`label`, `onPress`, `accessibilityLabel`.

- **Primary:** fondo `--lp-primary`, texto `#050505`, brillo sutil en hover (gradiente de blanco), radio
  `--lp-radius`. Es el único botón de conversión de cada pantalla.
- **Glass:** superficie `life-glass`, texto blanco, borde de cristal; el hover eleva el borde a
  `rgba(255, 255, 255, 0.16)`.
- **Loading:** muestra el isotipo con pulso *pum-pum* y deshabilita la acción.
- `disabled` ⇒ `opacity 0.45`, sin `pointer-events`, `aria-disabled`.
- Foco visible por teclado: anillo cian `0 0 0 2px rgba(0, 240, 255, 0.55)` con `:focus-visible`.

### 3.2 `LifeCard`

Props: `title?`, `description?`, `avatar?`, `footer?`, `interactive?: boolean`, `onPress?`, `children`.

- Base `life-glass`; variantes `plain`, `interactive` (hover: `translateY(-2px)` + borde más luminoso) y
  `selected` (borde + glow cian).
- Sombra difusa (`--lp-shadow-glass`) y transición `--lp-motion-base`.
- Sin lógica de negocio: recibe datos tipados y callbacks; el contenido (avatar, acciones) llega por props.

### 3.3 `LifeInput`

Props: `label`, `value`, `onChange`, `placeholder`, `type`, `error?`, `disabled?`, `leftIcon?`, `rightSlot?`,
`accessibilityLabel`.

- Fondo oscuro translúcido (`rgba(255, 255, 255, 0.04)`), sin bordes pesados tradicionales.
- Fuera de foco: borde `--lp-glass-border`. Con foco: borde + brillo cian
  (`box-shadow: 0 0 0 3px rgba(0, 240, 255, 0.18)`) — el borde *se ilumina* en cian al recibir foco.
- Estado `error`: borde eléctrico `#0044ff` y mensaje accesible (`aria-describedby`).
- Password (login): `visibility` toggle; el valor nunca se loguea.

### 3.4 `LifeNav` (desktop/tablet) y `LifeBottomNav` (móvil)

- Barras flotantes con `life-glass` fijadas al viewport (no rompen layout al hacer scroll).
- Ítems: icono + label; estado activo = icono iluminado en `--lp-accent-cyan`
  (`filter: drop-shadow(...)`) + indicador; inactivo = `--lp-text-muted`.
- **El ítem activo se deriva de `resolveScreenRoute`/`resolveScreenEntry` (SPEC-06)**, jamás de estado local
  divergente del guard (AGENTS_RULEBOOK §3: los guards de Expo mejoran la UX, no sustituyen RLS).
- Accesibles: `role="navigation"`, `aria-current="page"`, navegables por teclado y lector de pantalla.
- `LifeBottomNav`: vista estrecha, 4–5 ítems máx., icono dominante.
- **`LifeHeader`** (chrome de página): compone `title` + `Avatar` del `ScreenPageModel` (SPEC-06 §6); si
  `avatar === null`, no renderiza ningún avatar (sin ruido anónimo en headers).

### 3.5 Estados compartidos

`LoadingState`, `EmptyState`, `ErrorState`, `ForbiddenState` (SPEC-04 §5, SPEC-06 §6) montan 1:1 los `ViewState`
de SPEC-05 §6:

- `ErrorState` muestra **solo** el `message` ya traducido por `errorStateFromUnknown`; jamás mensajes crudos de
  Supabase (SPEC-04 §6).
- `ForbiddenState` en `access-denied` incluye acción de cierre de sesión (ruta de recuperación de `invalid_role`).
- `EmptyState` ofrece la acción primaria de la pantalla cuando existe (p. ej. "Explorar catálogo").

## 4. Integración de Blobatar (`@blobatar/react`)

### 4.1 Contrato determinista (SPEC-04 §7 / SPEC-05 §7)

- Cada usuario o tienda recibe un avatar geométrico **único y determinista** derivado de su identidad autenticada
  (correo o ID de Supabase). Resolución: identidad autenticada → `profiles.full_name` (o `store_name` del
  contexto store) → `buildAvatarSpec(displayName, size)`.
- **El seed nunca contiene el correo en bruto**, tokens, IDs de URL ni datos sensibles (SPEC-04 §7,
  AGENTS_RULEBOOK §4). La unicidad por usuario se garantiza por la derivación desde la identidad autenticada + RLS;
  el seed transporta únicamente el nombre visible estable.
- `size` siempre explícito y positivo, tomado del manifiesto (p. ej. `HEADER_AVATAR_SIZE = 40`; lista/header
  32–40; perfil 96). Nunca se depende del tamaño por defecto de la librería.
- `isFallback === true` ⇒ se renderiza el monograma/avatar anónimo del sistema (`AvatarFallback`), sin invocar a
  Blobatar y sin generar una identidad aleatoria en cada render.

### 4.2 Componente compartido `Avatar`

Uso (superficie web/PWA) — **API real verificada** (`@blobatar/react@^2.7.0` + `blobatar@^2.7.0`, Fase 2):

```tsx
import { Blobatar } from '@blobatar/react';
import 'blobatar/motion.css';

type AvatarProps = {
  spec: AvatarSpec;
  motion?: 'idle' | 'hover' | 'always'; // mapeo estético → prop real `animate`
  ariaLabel?: string;
};

function Avatar({ spec, motion = 'hover', ariaLabel }: AvatarProps) {
  if (spec.isFallback) return <AvatarFallback spec={spec} ariaLabel={ariaLabel} />;
  return (
    <Blobatar
      name={spec.seed}       // prop real: el seed determinista (no `seed`)
      size={spec.size}
      animate={motion === 'idle' ? false : motion} // false | 'hover' | 'always'
      aria-label={ariaLabel}
    />
  );
}
```

- **Único componente compartido** (SPEC-04 §7): copiar la integración en cada pantalla está prohibido.
- `blobatar/motion.css` habilita la respiración idle del avatar: `hover` (animado al apuntar) y `always`
  (permanente, avatar protagonista). `idle` mapea a `animate={false}` → imagen estática (óptimo en listas).
  El pulso *pum-pum* de carga/sincronización sigue siendo responsabilidad del **isotipo de marca** (§2.5),
  no del avatar.
- El `Avatar` se usa en: `LifeHeader`, `LifeCard` de perfil/tienda, filas de listas y perfiles — siempre con el
  `size` del manifiesto para que listas y perfiles rendericen idénticos.
- **Verificación en Fase 2 (realizada):** la API real expone `name` (no `seed`) y `animate` con valores
  `false | 'hover' | 'always'` (no `motion` ni `pulse`). El componente **y este Spec** se ajustaron en la misma
  tarea (norma de este §). Cualquier cambio futuro de versión/API se re-verifica igual en `package.json` antes
  del render (análogo SPEC-04 §7).

## 5. Estructura de las 11 pantallas (mapeo UX → `SCREEN_TREE`)

### 5.0 Mapeo conceptual → manifiesto tipado de SPEC-06

| # | Pantalla (concepto UX) | `ExpoScreenKey` / ruta (SPEC-06) | Roles | Área | Avatar | `ViewState` |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Login | `sign-in` → `/sign-in` | anónimo | auth | — | loading, error |
| 2 | Dashboard por rol (landing) | landing por rol (SPEC-05 §4.1): `expansion-index` (`/expansion`), `orders-index` (`/orders`), `catalog-index` (`/catalog`) | todos según rol | expansion / orders / catalog | profile / store | loading, empty, error |
| 3 | Catálogo | `catalog-index` (`/catalog`) y `products-index` (`/products`) | `store_user` ∥ staff interno | catalog / products | store / profile | loading, empty, error |
| 4 | Pedidos | `orders-index` → `/orders` | staff (`super_admin`, `admin`, `staff_orders`, `read_only`) | orders | profile | loading, empty, error |
| 5 | Detalle | `order-detail` (`/orders/[orderId]`), `my-orders-detail` (`/my-orders/[orderId]`), `lead-detail` (`/expansion/[leadId]`), + detalle de producto dentro del catálogo | según rol y área | orders / expansion / catalog | profile / store | loading, error, forbidden |
| 6 | Carrito / Checkout | `cart` → `/cart` | `store_user` | catalog | store | loading, empty, error |
| 7 | Mis Órdenes | `my-orders-index` / `my-orders-detail` → `/my-orders[/:orderId]` | `store_user` | orders | store | loading, empty, error |
| 8 | Geolocalización / Concesionarios | vista de mapa/sedes dentro de `expansion` (leads con `state`/`city`) — sin ruta propia en `SCREEN_TREE` todavía | staff interno | expansion | profile | loading, empty, error |
| 9 | Administración de Usuarios | **planificado** → `/admin/users` (requiere ampliar `SCREEN_TREE` + guard, SPEC-06) | `super_admin` (y `admin` parcial según matriz SPEC-04) | admin | profile | loading, empty, error, forbidden |
| 10 | Ajustes / Perfil | **planificado** → `/settings` (requiere ampliar `SCREEN_TREE`, SPEC-06) | autenticados | settings | profile / store | loading, error |
| 11 | Errores / Fallback | `access-denied` → `/access-denied` + estados compartidos + 404 no-encontrado | sin rol válido / ruta desconocida | auth | — | forbidden, error, empty |

> **Nota normativa:** las filas **8, 9 y 10** aún no son entradas del manifiesto tipado (`SCREEN_TREE`). Su montaje
> queda **bloqueado** hasta que un cambio de SPEC-06 añada la(s) clave(s), su ruta en el guard y sus tests. Hasta
> entonces: (8) se expresa como vista dentro de `expansion`; (9) y (10) quedan registradas como pendientes. No se
> crea UI huérfana (AGENTS_RULEBOOK §2).

### 5.1 Login (`sign-in`)

- Layout centrado en viewport sobre `--lp-bg-base`; `LifeCard` glass; isotipo **Volvatar** en pulso *pum-pum*
  como núcleo visual superior; `LifeInput` de email y contraseña; `LifeButton primary` "Iniciar sesión".
- Estados: `loading` deshabilita el botón (verificación de sesión); `error` usa `ErrorState` con mensaje seguro
  vía `errorStateFromUnknown`. Sin avatar (manifiesto `null`) y sin acceso a datos protegidos antes de sesión.

### 5.2 Dashboard por rol (`expansion-index` / `orders-index` / `catalog-index`)

- `super_admin`/`admin`/`read_only` → **Expansión**: tarjetas de métricas
  (`getExpansionMetrics`: total en negociación, aprobados activos) + listado de leads en `LifeCard` glass.
- `staff_orders` → **Pedidos** (`orders-index`). `store_user` → **Catálogo** (`catalog-index`).
- `LifeHeader` con título + avatar (profile para back-office, store para tienda). Métricas siempre a través del
  repositorio tipado; jamás RLS o lógica de negocio en la pantalla.

### 5.3 Catálogo (`catalog-index` / `products-index`)

- Cuadrícula responsive de `LifeCard` de producto: nombre, SKU, precio en dígitos tabulares, stock y acción
  principal.
- `catalog-index` (store): solo productos `is_active` (SPEC-03 §2), lectura.
- `products-index` (interno): gestión con mutaciones **solo si `mutationVisibility` lo permite** (SPEC-05);
  `read_only` no ve controles de mutación.
- Filtros rápidos como chips glass (sin desenfoque pesado en la rejilla completa).

### 5.4 Pedidos (`orders-index`)

- Listado tabular glass de `store_orders` con badges de estado tokenizados (SPEC-03 §3: `requested`, `confirmed`,
  `preparing`, `shipped`, `completed`, `cancelled`) e indicadores de color limpios — sin inventar semánticas
  fuera del dominio.
- Acciones según rol y `mutationVisibility`; remapeo de tenant según SPEC-06 §4.

### 5.5 Detalle (`order-detail`, `my-orders-detail`, `lead-detail`, detalle de producto)

- `order-detail`/`my-orders-detail`: `LifeCard` con `order_items`, precios *snapshot* (`unit_price`, SPEC-03 §3),
  timeline de estados y acciones habilitadas por rol.
- `lead-detail`: CRM interno con `store_name`, `owner_name`, `location.state/city` y transiciones de estado
  (SPEC-02 §3); `store_user` nunca accede (RLS SPEC-01 §5).
- Detalle de producto (catálogo): especificaciones + acción de compra o edición según rol.

### 5.6 Carrito / Checkout (`cart`)

- Ítems en `LifeCard`, edición de cantidades positivas (sin duplicados de producto), `LifeButton primary`
  "Solicitar pedido".
- Envío por repositorio/transacción atómica — nunca un loop client-side de inserts (SPEC-03 §4). `loading` con
  pulso *pum-pum*; errores de stock/red en `ErrorState` (retry solo en lecturas idempotentes).

### 5.7 Mis Órdenes (`my-orders-index` / `my-orders-detail`)

- Línea de tiempo visual de la transición `requested → confirmed → preparing → shipped → completed` (o
  `cancelled`) según SPEC-03 §3, visible solo para las órdenes del propio `store_user`
  (`store_profile_id = auth.uid()`, SPEC-01/SPEC-03).
- Sin órdenes ⇒ `EmptyState` con acción primaria al catálogo. Mismo tamaño de avatar del manifiesto en compacta.

### 5.8 Geolocalización / Concesionarios (vista dentro de `expansion`)

- Mapa + tarjetas de sedes derivadas de `expansion_leads` (`state`, `city`); marcadores con avatar determinista
  de la tienda (seed = `store_name`).
- No se monta como ruta propia hasta extender `SCREEN_TREE` (SPEC-06); si se independiza, exige update del
  manifiesto + guard + tests antes de implementar.

### 5.9 Administración de Usuarios (planificado — bloqueado)

- Diseño base: tabla de `profiles` con rol asignado y `LifeButton` para cambiar rol dentro de la matriz de
  SPEC-04; cambios de rol **solo** por roles autorizados, jamás auto-asignación desde cliente; RLS y
  `check_user_role` intactos.
- **No implementable** hasta ampliar `SCREEN_TREE` y el guard en un cambio de SPEC-06.

### 5.10 Ajustes / Perfil (planificado — bloqueado)

- Edición del nombre visible (fuente del seed de avatar), cuenta autenticada, cierre de sesión y preferencias
  (por ahora solo tema oscuro de la marca).
- Al cambiar el nombre, el avatar se regenera de forma determinista con el nuevo seed; nunca aleatorio.

### 5.11 Errores / Fallback

- `access-denied`: `ForbiddenState` con acción de cierre de sesión (recuperación de `invalid_role`, SPEC-05 §3).
- `LoadingState`/`EmptyState`/`ErrorState` compartidos disponibles en las 11 pantallas según su `ViewState`.
- 404 no-encontrado: superficie glass con isotipo y enlace al landing por rol. Sin mensajes crudos de Supabase ni
  rastros internos (SPEC-04 §6).

## 6. Estructura de código y TDD previo a la implementación

### 6.1 Ubicación propuesta (Fase 2)

```text
src/
  components/
    LifeButton.tsx
    LifeCard.tsx
    LifeInput.tsx
    LifeNav.tsx
    LifeBottomNav.tsx
    LifeHeader.tsx
    Avatar.tsx
    AvatarFallback.tsx
    BrandMark.tsx
    states/
      LoadingState.tsx
      EmptyState.tsx
      ErrorState.tsx
      ForbiddenState.tsx
tests/ui/
  designTokens.test.ts
  lifeButton.test.tsx
  lifeCard.test.tsx
  lifeInput.test.tsx
  lifeNav.test.tsx
  avatar.test.tsx
  pageChrome.test.tsx
  screens/*.test.tsx
```

`BrandMark.tsx` es el isotipo de marca (SPEC-07 §2.5, subcomponente compartido por `LifeHeader` y el `loading`
de `LifeButton`).

Las pantallas consumen **repositorios/casos de uso tipados** y el `ScreenPageModel` de SPEC-06; nunca SQL,
`service_role`, RLS duplicada ni autorización improvisada (AGENTS_RULEBOOK §2).

### 6.2 Tests antes de implementar (rojo → verde)

1. `designTokens.test.ts` — los tokens de §2 están presentes y con valores exactos (incluido
   `backdrop-filter: blur(12px)`); no hay valores mágicos duplicados en los componentes.
2. `lifeButton.test.tsx` — render de label/icono, variantes primary/glass/ghost, `disabled`, `loading`
   (deshabilitado + isotipo *pum-pum*), foco visible por teclado, `accessibilityLabel`.
3. `lifeCard.test.tsx` — clase glass aplicada, título/contenido/footer, variantes `interactive`/`selected`,
   callback de card sin *bubbling* roto.
4. `lifeInput.test.tsx` — asociación `label`→`input`, el foco aplica el estado de brillo cian (p. ej.
   `data-focused`), estado `error` con mensaje accesible y `aria-describedby`, toggle de contraseña.
5. `lifeNav.test.tsx` — ítem activo derivado de `resolveScreenEntry` (SPEC-06), `aria-current="page"`, y filtrado
   por rol: ningún destino que el guard deniegue se renderiza como enlace.
6. `avatar.test.tsx` — passthrough determinista de `seed`→`name`/`size`, fallback anónimo sin invocar a
   Blobatar, `size` siempre explícito (nunca el default) y mapeo de `motion` (`idle`/`hover`/`always`) a la prop
   real `animate`.
7. `pageChrome.test.tsx` — `LifeHeader` renderiza título + avatar del `ScreenPageModel`; con `avatar === null`
   no se renderiza ningún avatar.
8. `screens/*.test.tsx` — smoke de las 11 pantallas con sus `ViewState` posibles (`loading`/`empty`/`error`/
   `forbidden`) y el remapeo por rol de SPEC-06 §4.

El montaje de pantallas usa el *component test tool* aprobado (SPEC-04 §8), una vez introducido y verificado en
Fase 2 junto con `@blobatar/react` en `package.json`.

## 7. Definition of Done

- [ ] SPEC presente y consistente con SPEC-04/05/06: no inventa rutas, guards ni reglas RLS.
- [ ] Tests de §6 escritos **antes** del código de los componentes y en verde (rojo → verde documentado).
- [ ] `npm test`, `npm run typecheck` y `bash .harness/scripts/init.sh` pasan.
- [ ] Seed de avatares solo con nombres visibles estables; nunca correo en bruto, tokens ni URLs (SPEC-04 §7).
- [ ] `@blobatar/react` y `blobatar/motion.css` verificados en `package.json` antes de cualquier render.
- [ ] Las 11 pantallas declaran su `ViewState`; ninguna muestra mensajes crudos de Supabase.
- [ ] Filas 9 y 10 bloqueadas hasta ampliar `SCREEN_TREE` (SPEC-06) con sus tests.
- [ ] Componentes puros y compartidos; sin RLS, SQL ni claves `service_role` en la UI.