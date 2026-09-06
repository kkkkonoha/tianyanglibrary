const VERSION_PATTERN = /v?(\d+\.\d+(?:\.\d+)?)/

export function parseApkVersion(name: string): string | null {
  const match = VERSION_PATTERN.exec(name)
  return match ? match[1] : null
}

export function getApkFilename(version: string) {
  return `天央图书馆-v${version}.apk`
}

export function isManagedApkFilename(name: string) {
  return /^天央图书馆-v\d+\.\d+(?:\.\d+)?\.apk$/u.test(name)
}

export function compareApkVersions(a: string | null, b: string | null) {
  const aParts = a ? a.split(".").map(Number) : [0]
  const bParts = b ? b.split(".").map(Number) : [0]
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const difference = (bParts[i] ?? 0) - (aParts[i] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}
