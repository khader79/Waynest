import { ProviderRole } from './entities/provider-membership.entity';

export type EffectiveProviderRole = 'OWNER' | 'ADMIN' | 'EDITOR';

/** Maps legacy MANAGER/STAFF to the product model (ADMIN/EDITOR). */
export function toEffectiveRole(role: ProviderRole): EffectiveProviderRole {
  switch (role) {
    case ProviderRole.OWNER:
      return 'OWNER';
    case ProviderRole.ADMIN:
    case ProviderRole.MANAGER:
      return 'ADMIN';
    case ProviderRole.EDITOR:
    case ProviderRole.STAFF:
      return 'EDITOR';
    default:
      return 'EDITOR';
  }
}

export function canEditProviderProfile(role: ProviderRole): boolean {
  const e = toEffectiveRole(role);
  return e === 'OWNER' || e === 'ADMIN' || e === 'EDITOR';
}

export function canManageMemberships(role: ProviderRole): boolean {
  const e = toEffectiveRole(role);
  return e === 'OWNER' || e === 'ADMIN';
}
