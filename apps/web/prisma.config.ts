import { defineConfig } from "prisma/config"
import fs from "fs"
import path from "path"

let databaseUrl = process.env.DATABASE_URL
let directUrl = process.env.DIRECT_URL

try {
  const envPath = path.resolve(process.cwd(), ".env")
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8")
    const match = envContent.match(/^DATABASE_URL=["']?(.*?)["']?$/m)
    if (match && match[1]) {
      databaseUrl = match[1]
    }
    const directMatch = envContent.match(/^DIRECT_URL=["']?(.*?)["']?$/m)
    if (directMatch && directMatch[1]) {
      directUrl = directMatch[1]
    }
  }
} catch (e) {
  // Ignore
}

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: directUrl || databaseUrl || "postgresql://postgres:postgres@localhost:5432/postgres",
  },
})
