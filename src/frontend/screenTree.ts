import type { ExpoRoute } from './expoRouteAccess';

/**
 * Logical routes of the Expo Router tree (SPEC-04 §2, SPEC-06 §2).
 * `ExpoRoute` is the protected surface bridged by resolveExpoRouteAccess;
 * the auth/recovery paths are appended here as part of the screen manifest.
 */
export type ScreenPath = ExpoRoute | '/sign-in' | '/access-denied' | '/admin/roles';

export type ExpoScreenKey =
  | 'sign-in'
  | 'access-denied'
  | 'expansion-index'
  | 'lead-detail'
  | 'products-index'
  | 'orders-index'
  | 'order-detail'
  | 'catalog-index'
  | 'cart'
  | 'my-orders-index'
  | 'my-orders-detail'
  | 'admin-roles-index'
  | 'reports-index';

export type ScreenArea = 'auth' | 'expansion' | 'products' | 'orders' | 'catalog' | 'admin';
export type AvatarProvider = 'profile' | 'store';

export type ScreenMeta = {
  screen: ExpoScreenKey;
  path: ScreenPath;
  /** Target `app/` segment for the Phase 2 `.tsx` mount (SPEC-04 §2). */
  segment: string;
  title: string;
  area: ScreenArea;
  protected: boolean;
  /** Blobatar contract (SPEC-04 §7): provider of the stable identity seed + explicit size. */
  avatar: { provider: AvatarProvider; size: number } | null;
};

/** Explicit size for header/list avatars; every instance propagates it (SPEC-04 §7). */
export const HEADER_AVATAR_SIZE = 40;

export const SCREEN_PATHS: readonly ScreenPath[] = [
  '/sign-in',
  '/access-denied',
  '/expansion',
  '/expansion/[leadId]',
  '/products',
  '/orders',
  '/orders/[orderId]',
  '/catalog',
  '/cart',
  '/my-orders',
  '/my-orders/[orderId]',
  '/admin/roles',
  '/reports'
];

export function isScreenPath(value: string): value is ScreenPath {
  return (SCREEN_PATHS as readonly string[]).includes(value);
}

/** The protected logical routes that carry a guard decision (everything except auth/recovery). */
export type ProtectedRoutePath = Exclude<ScreenPath, '/sign-in' | '/access-denied'>;

export function isProtectedScreenPath(value: string): value is ProtectedRoutePath {
  return isScreenPath(value) && value !== '/sign-in' && value !== '/access-denied';
}

const profileAvatar = { provider: 'profile' as const, size: HEADER_AVATAR_SIZE };
const storeAvatar = { provider: 'store' as const, size: HEADER_AVATAR_SIZE };

/** Canonical typed inventory of the SPEC-04 screen tree (SPEC-06 §2). */
export const SCREEN_TREE: readonly ScreenMeta[] = [
  {
    screen: 'sign-in',
    path: '/sign-in',
    segment: '(auth)/sign-in',
    title: 'Iniciar sesión',
    area: 'auth',
    protected: false,
    avatar: null
  },
  {
    screen: 'access-denied',
    path: '/access-denied',
    segment: '(protected)/access-denied',
    title: 'Acceso denegado',
    area: 'auth',
    protected: true,
    avatar: null
  },
  {
    screen: 'expansion-index',
    path: '/expansion',
    segment: '(protected)/(admin)/expansion/index',
    title: 'Expansión',
    area: 'expansion',
    protected: true,
    avatar: profileAvatar
  },
  {
    screen: 'lead-detail',
    path: '/expansion/[leadId]',
    segment: '(protected)/(admin)/expansion/[leadId]',
    title: 'Detalle de lead',
    area: 'expansion',
    protected: true,
    avatar: profileAvatar
  },
  {
    screen: 'products-index',
    path: '/products',
    segment: '(protected)/(admin)/products/index',
    title: 'Productos',
    area: 'products',
    protected: true,
    avatar: profileAvatar
  },
  {
    screen: 'orders-index',
    path: '/orders',
    segment: '(protected)/(orders)/orders/index',
    title: 'Pedidos',
    area: 'orders',
    protected: true,
    avatar: profileAvatar
  },
  {
    screen: 'order-detail',
    path: '/orders/[orderId]',
    segment: '(protected)/(orders)/orders/[orderId]',
    title: 'Detalle de pedido',
    area: 'orders',
    protected: true,
    avatar: profileAvatar
  },
  {
    screen: 'catalog-index',
    path: '/catalog',
    segment: '(protected)/(store)/catalog/index',
    title: 'Catálogo',
    area: 'catalog',
    protected: true,
    avatar: storeAvatar
  },
  {
    screen: 'cart',
    path: '/cart',
    segment: '(protected)/(store)/cart',
    title: 'Carrito',
    area: 'catalog',
    protected: true,
    avatar: storeAvatar
  },
  {
    screen: 'my-orders-index',
    path: '/my-orders',
    segment: '(protected)/(store)/my-orders/index',
    title: 'Mis pedidos',
    area: 'orders',
    protected: true,
    avatar: storeAvatar
  },
  {
    screen: 'my-orders-detail',
    path: '/my-orders/[orderId]',
    segment: '(protected)/(store)/my-orders/[orderId]',
    title: 'Detalle de mi pedido',
    area: 'orders',
    protected: true,
    avatar: storeAvatar
  },
  {
    screen: 'admin-roles-index',
    path: '/admin/roles',
    segment: '(protected)/(admin)/admin/roles',
    title: 'Administradores',
    area: 'admin',
    protected: true,
    avatar: profileAvatar
  },
  {
    screen: 'reports-index',
    path: '/reports',
    segment: '(protected)/(admin)/reports/index',
    title: 'Reportes',
    area: 'expansion',
    protected: true,
    avatar: profileAvatar
  }
];

export function resolveScreenEntry(screen: ExpoScreenKey): ScreenMeta {
  const entry = SCREEN_TREE.find((e) => e.screen === screen);
  if (!entry) {
    throw new RangeError(`Unknown Expo screen key: ${screen}`);
  }
  return entry;
}

export function screenForPath(path: string): ExpoScreenKey | null {
  const entry = SCREEN_TREE.find((e) => e.path === path);
  return entry ? entry.screen : null;
}