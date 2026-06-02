import {
  fetchPushPublicKey,
  subscribePushNotifications,
  unsubscribePushNotifications,
} from '@/api/social';

let serviceWorkerRegistration = null;

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

const normalizeSubscriptionPayload = (subscription) => {
  const payload = subscription.toJSON();
  const endpoint = payload?.endpoint;
  const p256dh = payload?.keys?.p256dh;
  const auth = payload?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error('Invalid push subscription payload');
  }

  return {
    endpoint,
    expirationTime: payload.expirationTime ?? null,
    keys: {
      p256dh,
      auth,
    },
  };
};

export const supportsWebPush = () => {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    typeof Notification !== 'undefined'
  );
};

export const ensureWebPushSubscription = async () => {
  if (!supportsWebPush()) {
    return { ok: false, reason: 'unsupported' };
  }

  if (Notification.permission === 'denied') {
    return { ok: false, reason: 'denied' };
  }

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

  if (permission !== 'granted') {
    return { ok: false, reason: 'not-granted' };
  }

  const publicKey = await fetchPushPublicKey();
  if (!publicKey) {
    return { ok: false, reason: 'missing-public-key' };
  }

  if (!serviceWorkerRegistration) {
    serviceWorkerRegistration = await navigator.serviceWorker.ready;
  }
  const registration = serviceWorkerRegistration;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const payload = normalizeSubscriptionPayload(subscription);
  await subscribePushNotifications(payload);

  return { ok: true, subscription };
};

export const removeWebPushSubscription = async () => {
  if (!supportsWebPush()) {
    return { ok: false, reason: 'unsupported' };
  }

  const registration =
    serviceWorkerRegistration ||
    (await navigator.serviceWorker.getRegistration()) ||
    (await navigator.serviceWorker.ready);

  if (!registration) {
    return { ok: false, reason: 'missing-registration' };
  }

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    return { ok: true };
  }

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => undefined);

  if (endpoint) {
    await unsubscribePushNotifications(endpoint).catch(() => undefined);
  }

  return { ok: true };
};
