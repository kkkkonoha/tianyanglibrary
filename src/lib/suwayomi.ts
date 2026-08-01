const SUWAYOMI_BASE = process.env.SUWAYOMI_URL ?? "http://127.0.0.1:4567"

// 已安装漫画源（Suwayomi 内的 sourceId）
export const COMIC_SOURCES = [
  { id: process.env.SUWAYOMI_SOURCE_ID ?? "524579092615598717", name: "再漫画", lang: "zh" },
  { id: "7057750772596492765", name: "漫画柜", lang: "zh" },
] as const

export const DEFAULT_SOURCE_ID = COMIC_SOURCES[0].id

export async function suwayomiGql<T>(query: string): Promise<T> {
  const res = await fetch(`${SUWAYOMI_BASE}/api/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; TianyangLibrary/1.0)",
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Suwayomi GraphQL ${res.status}`)
  const data = await res.json()
  if (data.errors?.length) throw new Error(data.errors[0].message)
  return data.data as T
}

export interface SuwayomiManga {
  id: string
  title: string
  author: string | null
  artist: string | null
  description: string | null
  status: string | null
  genre: string[] | null
  thumbnailUrl: string | null
  url: string
  inLibrary: boolean
  initialized: boolean
  sourceId: string
}

export interface SuwayomiChapter {
  id: string
  name: string
  chapterNumber: number
  scanlator: string | null
  isRead: boolean
  isBookmarked: boolean
  lastReadAt: number | null
  fetchedAt: number | null
}

export interface SuwayomiPage {
  url: string
  index: number
  imageUrl?: string
}

export async function searchManga(query: string, page = 1, sourceId = DEFAULT_SOURCE_ID): Promise<{ mangas: SuwayomiManga[]; hasNextPage: boolean }> {
  return suwayomiGql<any>(`
    mutation {
      fetchSourceManga(input: { source: "${sourceId}", query: "${query.replace(/"/g, '\\"')}", page: ${page}, type: SEARCH }) {
        hasNextPage
        mangas { id title author artist description genre thumbnailUrl url inLibrary sourceId }
      }
    }
  `).then((d) => d.fetchSourceManga)
}

export async function getManga(id: string): Promise<SuwayomiManga> {
  return suwayomiGql(`
    query {
      manga(id: ${id}) {
        id title author artist description genre thumbnailUrl url inLibrary sourceId
      }
    }
  `).then((d: any) => d.manga)
}

export async function fetchMangaChapters(id: string): Promise<SuwayomiChapter[]> {
  await suwayomiGql(`
    mutation {
      fetchMangaAndChapters(input: { id: ${id}, fetchManga: false, fetchChapters: true }) { manga { id } }
    }
  `)

  const d = await suwayomiGql<any>(`
    query {
      manga(id: ${id}) {
        chapters { nodes { id name chapterNumber scanlator isRead isBookmarked lastReadAt fetchedAt } }
      }
    }
  `)
  return d.manga.chapters.nodes
}

export async function getChapterPages(chapterId: string): Promise<SuwayomiPage[]> {
  const d = await suwayomiGql<any>(`
    mutation {
      fetchChapterPages(input: { chapterId: ${chapterId} }) { pages }
    }
  `)
  const pages: string[] = d.fetchChapterPages?.pages ?? []
  return pages.map((url, index) => ({ url, index }))
}