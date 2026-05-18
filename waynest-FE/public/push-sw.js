const DEFAULT_TITLE = 'Waynest';
const DEFAULT_ICON = '/images/waynest-icon.svg';
const DEFAULT_HREF = '/notifications';

const normalizePayload = (raw) => {
  if (!raw || typeof raw !== 'object') {
    return {
      title: DEFAULT_TITLE,
      body: '',
      href: DEFAULT_HREF,
      tag: undefined,
      data: {},
    };
  }

  const title =
    typeof raw.title === 'string' && raw.title.trim()
      ? raw.title.trim()
      : DEFAULT_TITLE;
  const body = typeof raw.body === 'string' ? raw.body : '';
  const href =
    typeof raw.href === 'string' && raw.href.trim() ? raw.href : DEFAULT_HREF;
  const tag =
    typeof raw.notificationId === 'string' && raw.notificationId
      ? `notif:${raw.notificationId}`
      : typeof raw.tag === 'string' && raw.tag
        ? raw.tag
        : undefined;

  return {
    title,
    body,
    href,
    tag,
    data: raw,
  };
};

self.addEventListener('push', (event) => {
  const payload = normalizePayload(
    event.data ? event.data.json() : { title: DEFAULT_TITLE },
  );

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      const hasVisibleClient = clientsList.some(
        (client) => client.visibilityState === 'visible',
      );

      if (hasVisibleClient) {
        clientsList.forEach((client) => {
          client.postMessage({ type: 'push:notification', payload });
        });
        return;
      }

      await self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: DEFAULT_ICON,
        badge: DEFAULT_ICON,
        tag: payload.tag,
        data: {
          href: payload.href,
          payload: payload.data,
        },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const href = event.notification?.data?.href || DEFAULT_HREF;

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clientsList) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            await client.navigate(href);
          }
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(href);
      }
    })(),
  );
});
