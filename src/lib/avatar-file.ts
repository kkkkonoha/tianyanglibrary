import { mkdir, writeFile } from "fs/promises"
import { join } from "path"
import sharp from "sharp"

export async function saveAvatarFile(file: File, key: string) {
  const buffer = Buffer.from(await file.arrayBuffer())
  let output: Uint8Array = buffer
  try {
    output = await sharp(buffer)
      .rotate()
      .resize(256, 256, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer()
  } catch {
    // 保持与已有头像上传逻辑一致：无法解码时保存原文件，由上传校验保证基本安全。
  }

  const dir = join(process.cwd(), "public", "uploads", "avatars")
  await mkdir(dir, { recursive: true })
  const filename = `avatar-${key}-${Date.now()}.webp`
  await writeFile(join(dir, filename), output)
  return `/uploads/avatars/${filename}`
}
