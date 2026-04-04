import { vi } from 'vitest'

class MockTFile {
  path: string
  basename: string
  constructor(path: string) {
    this.path = path
    this.basename = path.split('/').pop()!.replace(/\.md$/, '')
  }
}

/**
 * Create an in-memory Obsidian App mock backed by a simple Map.
 * Pass initial files as { 'path/to/file.md': 'content' }.
 */
export function createMockApp(initialFiles: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initialFiles))

  const makeTFile = (path: string) => {
    const f = new MockTFile(path)
    // Make instanceof TFile checks pass by importing the mocked class
    Object.setPrototypeOf(f, (globalThis as any).__MockTFile?.prototype ?? MockTFile.prototype)
    return f
  }

  const vault = {
    getAbstractFileByPath: (path: string) => {
      if (store.has(path)) return makeTFile(path)
      return null
    },
    getMarkdownFiles: () =>
      [...store.keys()]
        .filter(p => p.endsWith('.md'))
        .map(p => makeTFile(p)),
    read: vi.fn(async (file: MockTFile) => store.get(file.path) ?? ''),
    modify: vi.fn(async (file: MockTFile, content: string) => {
      store.set(file.path, content)
    }),
    create: vi.fn(async (path: string, content: string) => {
      if (store.has(path)) throw new Error(`File already exists: ${path}`)
      store.set(path, content)
      return makeTFile(path)
    }),
    createFolder: vi.fn(async () => {}),
    adapter: {
      exists: vi.fn(async (path: string) => store.has(path)),
      read: vi.fn(async (path: string) => store.get(path) ?? ''),
      write: vi.fn(async (path: string, content: string) => {
        store.set(path, content)
      }),
      remove: vi.fn(async (path: string) => {
        store.delete(path)
      }),
    },
  }

  return {
    app: { vault } as any,
    store, // expose for assertions
  }
}
