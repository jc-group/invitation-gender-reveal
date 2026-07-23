export type PhotoVisibilityStatus = 'approved' | 'pending';

export interface DemoEventConfig {
  routeSlug: string;
  publicSlug: string;
  eventId: string;
  isActive: boolean;
  photoVisibilityStatus: PhotoVisibilityStatus;
}

const DEMO_EVENTS: DemoEventConfig[] = [
  {
    routeSlug: 'pantalla',
    publicSlug: 'revelacion-bebe-2026',
    eventId: 'cb3f9352-1dde-4088-a889-da03eafcaaa9',
    isActive: true,
    // ponytail: demo muestra fotos inmediatamente; en produccion usar "pending" + moderacion.
    photoVisibilityStatus: 'approved',
  },
];

export const DEFAULT_EVENT_ROUTE_SLUG = 'pantalla';

export function resolveDemoEventByRouteSlug(routeSlug: string): DemoEventConfig | null {
  const normalized = routeSlug.trim().toLowerCase();
  return DEMO_EVENTS.find((event) => event.routeSlug === normalized) ?? null;
}

export function resolveDemoEventByPublicSlug(publicSlug: string): DemoEventConfig | null {
  const normalized = publicSlug.trim().toLowerCase();
  return DEMO_EVENTS.find((event) => event.publicSlug === normalized) ?? null;
}

export function getDefaultDemoEvent(): DemoEventConfig {
  return DEMO_EVENTS[0];
}
