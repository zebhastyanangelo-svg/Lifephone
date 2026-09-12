import { buildAvatarSpec, type AvatarSpec } from './avatarSeed';
import type { ViewState } from './viewState';
import { resolveScreenEntry, type ExpoScreenKey } from './screenTree';

export type ScreenPageModel = {
  screen: ExpoScreenKey;
  title: string;
  viewState: ViewState; // loading | empty | error | forbidden, propagado tal cual
  avatar: AvatarSpec | null;
};

/**
 * Modelo de página listo para render (SPEC-06 §6-§7): chrome (título), ViewState y Blobatar.
 * El avatar solo se emite cuando la pantalla declara proveedor y hay un nombre visible no vacío;
 * el seed (nombre de tienda o de perfil, nunca datos sensibles) y el size explícito del manifest
 * se delegan en buildAvatarSpec para que listas, headers y perfiles muestren la misma dimensión.
 */
export function buildPageModel(input: {
  screen: ExpoScreenKey;
  viewState: ViewState;
  avatarDisplayName?: string | null;
}): ScreenPageModel {
  const entry = resolveScreenEntry(input.screen);
  const displayName =
    typeof input.avatarDisplayName === 'string' ? input.avatarDisplayName.trim() : '';
  const hasDisplayName = displayName.length > 0;
  const avatar =
    entry.avatar !== null && hasDisplayName
      ? buildAvatarSpec(displayName, entry.avatar.size)
      : null;

  return {
    screen: entry.screen,
    title: entry.title,
    viewState: input.viewState,
    avatar
  };
}