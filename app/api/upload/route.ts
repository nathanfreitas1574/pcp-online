import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File
  if (!file) return NextResponse.json({ error: "Nenhum arquivo" }, { status: 400 })

  // Salvar em /public/uploads/
  const uploadDir = join(process.cwd(), "public", "uploads")
  if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext = file.name.split(".").pop() ?? "jpg"
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
  const filePath = join(uploadDir, fileName)

  await writeFile(filePath, buffer)

  return NextResponse.json({ url: `/uploads/${fileName}` }, { status: 201 })
}
