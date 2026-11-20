import { beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(key) {
      const k = String(key);
      return store.has(k) ? store.get(k) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    },
    clear() {
      store.clear();
    },
    key(index) {
      const keys = Array.from(store.keys());
      return index >= 0 && index < keys.length ? keys[index] : null;
    },
    get length() {
      return store.size;
    }
  };
}

const localStorageMock = createMemoryStorage();
const sessionStorageMock = createMemoryStorage();

const navigatorMock = {
  onLine: true,
  userAgent: 'vitest-node',
  platform: 'Win32',
  maxTouchPoints: 0,
  vibrate: () => false
};

const windowMock = {
  location: {
    href: 'http://localhost/',
    origin: 'http://localhost',
    pathname: '/',
    search: '',
    hash: ''
  },
  localStorage: localStorageMock,
  sessionStorage: sessionStorageMock,
  navigator: navigatorMock,
  gtag: undefined,
  dataLayer: [],
  innerWidth: 1024,
  innerHeight: 768,
  addEventListener: () => {},
  removeEventListener: () => {},
  matchMedia: (query) => ({
    matches: false,
    media: query,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  }),
  scrollTo: () => {}
};
windowMock.window = windowMock;

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
  writable: true
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageMock,
  configurable: true,
  writable: true
});

Object.defineProperty(globalThis, 'navigator', {
  value: navigatorMock,
  configurable: true,
  writable: true
});

Object.defineProperty(globalThis, 'window', {
  value: windowMock,
  configurable: true,
  writable: true
});

beforeEach(() => {
  localStorageMock.clear();
  sessionStorageMock.clear();
  navigatorMock.onLine = true;
  windowMock.location.href = 'http://localhost/';
  windowMock.location.search = '';
  windowMock.location.hash = '';
  windowMock.gtag = undefined;
  windowMock.dataLayer = [];
  setActivePinia(createPinia());
});
