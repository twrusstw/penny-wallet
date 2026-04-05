import { TFile } from 'obsidian'

/**
 * Create an in-memory Obsidian App mock backed by a simple Map.
 * Pass initial files as { 'path/to/file.md': 'content' }.
 */
export function createMockApp(initialFiles: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initialFiles))

  const makeTFile = (path: string) => Object.assign(new TFile(), {
    path,
    basename: path.split('/').pop()!.replace(/\.md$/, ''),
  })

  const vault = {
    getAbstractFileByPath: (path: string) => {
      if (store.has(path)) return makeTFile(path)
      return null
    },
    getFileByPath: (path: string) => {
      if (store.has(path)) return makeTFile(path)
      return null
    },
    getFolderByPath: (path: string) => {
      const hasChildren = [...store.keys()].some(p => p.startsWith(path + '/'))
      return hasChildren ? { path } : null
    },
    getMarkdownFiles: () =>
      [...store.keys()]
        .filter(p => p.endsWith('.md'))
        .map(p => makeTFile(p)),
    read: async (file: InstanceType<typeof TFile>) => store.get(file.path) ?? '',
    modify: async (file: InstanceType<typeof TFile>, content: string) => {
      store.set(file.path, content)
    },
    create: async (path: string, content: string) => {
      if (store.has(path)) throw new Error(`File already exists: ${path}`)
      store.set(path, content)
      return makeTFile(path)
    },
    createFolder: async () => {},
    adapter: {
      exists: async (path: string) => store.has(path),
      read: async (path: string) => store.get(path) ?? '',
      write: async (path: string, content: string) => { store.set(path, content) },
      remove: async (path: string) => { store.delete(path) },
    },
  }

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app: { vault } as any,
    store, // expose for assertions
  }
}
