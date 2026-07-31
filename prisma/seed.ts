import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import bcrypt from "bcryptjs"

const adapter = new PrismaLibSql({ url: "file:./dev.db" })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding database...")

  const passwordHash = await bcrypt.hash("password123", 12)

  const user1 = await prisma.user.upsert({
    where: { email: "super@library.local" },
    update: {},
    create: {
      email: "super@library.local",
      username: "超级管理员",
      passwordHash,
      bio: "天央图书馆超级管理员",
      role: "super_admin",
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: "admin@library.local" },
    update: {},
    create: {
      email: "admin@library.local",
      username: "管理员",
      passwordHash,
      bio: "天央图书馆管理员",
      role: "admin",
    },
  })

  const user3 = await prisma.user.upsert({
    where: { email: "member@library.local" },
    update: {},
    create: {
      email: "member@library.local",
      username: "动漫爱好者",
      passwordHash,
      bio: "喜欢看漫画和轻小说",
    },
  })

  console.log(`Created users: ${user1.username}, ${user2.username}, ${user3.username}`)

  const tags = {
    轻小说: await prisma.tag.upsert({ where: { name: "轻小说" }, create: { name: "轻小说" }, update: {} }),
    奇幻: await prisma.tag.upsert({ where: { name: "奇幻" }, create: { name: "奇幻" }, update: {} }),
    科幻: await prisma.tag.upsert({ where: { name: "科幻" }, create: { name: "科幻" }, update: {} }),
    校园: await prisma.tag.upsert({ where: { name: "校园" }, create: { name: "校园" }, update: {} }),
    热血: await prisma.tag.upsert({ where: { name: "热血" }, create: { name: "热血" }, update: {} }),
  }

  const resource1 = await prisma.resource.create({
    data: {
      title: "涼宮ハルヒの憂鬱",
      description: "「ただの人間には興味ありません。この中に宇宙人、未来人、異世界人、超能力者がいたら、あたしのところに来なさい。以上。」",
      type: "BOOK",
      uploaderId: user2.id,
      tags: { create: [{ tagId: tags.轻小说.id }, { tagId: tags.校园.id }] },
    },
  })

  const resource2 = await prisma.resource.create({
    data: {
      title: "魔法少女まどか☆マギカ",
      description: "鹿目まどかは平凡な中学生。ある日、謎の転校生・暁美ほむらと出会い、彼女の日常は一変する。",
      type: "COMIC",
      uploaderId: user2.id,
      tags: { create: [{ tagId: tags.奇幻.id }] },
    },
  })

  const resource3 = await prisma.resource.create({
    data: {
      title: "STEINS;GATE",
      description: "岡部倫太郎、通称オカリン。彼が偶然発明した「電話レンジ(仮)」は、過去にメールを送ることができる装置だった。",
      type: "BOOK",
      uploaderId: user3.id,
      tags: { create: [{ tagId: tags.轻小说.id }, { tagId: tags.科幻.id }] },
    },
  })

  console.log(`Created resources: ${resource1.title}, ${resource2.title}, ${resource3.title}`)

  await prisma.recommendation.create({
    data: { userId: user3.id, resourceId: resource1.id, note: "神作，一生推！" },
  })

  const collection = await prisma.collection.create({
    data: {
      title: "入门必看杰作",
      description: "入坑必看的经典作品作为目录收藏",
      creatorId: user2.id,
    },
  })

  await prisma.collectionResource.create({
    data: { collectionId: collection.id, resourceId: resource1.id },
  })

  await prisma.collectionResource.create({
    data: { collectionId: collection.id, resourceId: resource2.id },
  })

  await prisma.activity.createMany({
    data: [
      { type: "UPLOAD", userId: user2.id, resourceId: resource1.id },
      { type: "UPLOAD", userId: user2.id, resourceId: resource2.id },
      { type: "UPLOAD", userId: user3.id, resourceId: resource3.id },
      { type: "RECOMMEND", userId: user3.id, resourceId: resource1.id, metadata: "神作，一生推！" },
      { type: "CREATE_COLLECTION", userId: user2.id, collectionId: collection.id },
      { type: "ADD_TO_COLLECTION", userId: user2.id, resourceId: resource1.id, collectionId: collection.id },
      { type: "ADD_TO_COLLECTION", userId: user2.id, resourceId: resource2.id, collectionId: collection.id },
    ],
  })

  console.log("Seed completed!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
