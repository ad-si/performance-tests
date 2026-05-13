import { execFile } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import pug from "pug"

const execFileAsync = promisify(execFile)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const templateFile = path.join(__dirname, "..", "templates", "report.pug")

interface GitInfo {
  branch: string
  commit: string
}

const getGitInfo = async (): Promise<GitInfo> => {
  const [{ stdout: commit }, { stdout: branch }] = await Promise.all([
    execFileAsync("git", ["rev-parse", "HEAD"]),
    execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"]),
  ])

  return { commit: commit.trim(), branch: branch.trim() }
}

export const generateReport = async (outputFile: string): Promise<void> => {
  const template = await readFile(templateFile, "utf-8")
  const render = pug.compile(template, { pretty: true })
  const gitInfo = await getGitInfo()

  await mkdir(path.dirname(outputFile), { recursive: true })
  await writeFile(outputFile, render({ gitInfo }))
}
