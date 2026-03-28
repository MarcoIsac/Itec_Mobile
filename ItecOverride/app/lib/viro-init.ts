import { ViroARTrackingTargets } from '@reactvision/react-viro';

import { VIRO_TARGETS } from './posters';

const TARGETS_READY_KEY = '__itec_override_viro_targets_ready__';

export const ensureViroTargets = () => {
  const scope = globalThis as Record<string, unknown>;
  if (scope[TARGETS_READY_KEY] === true) {
    return;
  }

  ViroARTrackingTargets.createTargets(VIRO_TARGETS);
  scope[TARGETS_READY_KEY] = true;
};
