import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import bcrypt from "bcryptjs"

const adapter = new PrismaLibSql({ url: "file:./dev.db" })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding database...")

  const passwordHash = await bcrypt.hash("tydms", 12)

  // Clear existing users except super admin
  await prisma.user.deleteMany({
    where: { email: { not: "super" } },
  })

  // Upsert super admin
  const user1 = await prisma.user.upsert({
    where: { email: "super" },
    update: {
      passwordHash,
      username: "天央姬",
      role: "super_admin",
      status: "active",
      bio: "天央图书馆超级管理员",
    },
    create: {
      email: "super",
      username: "天央姬",
      passwordHash,
      bio: "天央图书馆超级管理员",
      role: "super_admin",
      status: "active",
    },
  })

  console.log("Super admin: 天央姬 (super)")

  // Clear all data from other tables
  await prisma.resourceFile.deleteMany()
  await prisma.resourceTag.deleteMany()
  await prisma.recommendation.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.collectionResource.deleteMany()
  await prisma.favoriteCollection.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.tag.deleteMany()
  await prisma.resource.deleteMany()
  await prisma.collection.deleteMany()

  console.log("All user data cleared")
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
