import { createWriteStream } from "node:fs"
import { mkdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { Transform, type TransformCallback } from "node:stream"

import { readdirp, type EntryInfo } from "readdirp"
import winston from "winston"

import type { MeshModel } from "meshlib"

import { generateReport } from "./reportGenerator.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, "..")

const modelsPath = path.join(projectRoot, "models")
const outputPath = path.join(projectRoot, "results")

interface TestResult {
  number: number
  fileName: string
  stlParsingTime: number
  numStlParsingErrors: number
  stlCleansingTime: number
  stlDeletedPolygons: number
  stlRecalculatedNormals: number
  optimizationTime: number
  numPolygons: number
  numPoints: number
  isTwoManifold: boolean
  twoManifoldCheckTime: number
  hullVoxelizationTime: number
  volumeFillTime: number
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
  ),
  transports: [new winston.transports.Console()],
})

let modelCounter = 0

const getDateTimeString = (): string =>
  new Date().toJSON().slice(0, -8).replace(":", "") + "Z"

const testModel = async (entry: EntryInfo): Promise<TestResult> => {
  logger.info(entry.path)

  const fileContent = await readFile(entry.fullPath)
  const begin = Date.now()

  const { default: meshlib } = await import("meshlib")

  const meshModel = await new Promise<MeshModel>((resolve, reject) => {
    meshlib.parse(fileContent, null, (error, model) => {
      if (error) reject(error)
      else if (!model) reject(new Error(`Model '${entry.path}' was not properly loaded`))
      else resolve(model)
    })
  })

  void meshModel

  const stlParsingTime = Date.now() - begin

  const testResult: TestResult = {
    number: ++modelCounter,
    fileName: entry.path,
    stlParsingTime,
    numStlParsingErrors: 0,
    stlCleansingTime: 0,
    stlDeletedPolygons: 0,
    stlRecalculatedNormals: 0,
    optimizationTime: 0,
    numPolygons: 0,
    numPoints: 0,
    isTwoManifold: false,
    twoManifoldCheckTime: 0,
    hullVoxelizationTime: 0,
    volumeFillTime: 0,
  }

  logger.debug(`Testing model '${entry.fullPath}'`)
  logger.debug(`model parsed in ${stlParsingTime} ms`)

  return testResult
}

class Tester extends Transform {
  constructor() {
    super({ objectMode: true })
  }

  override _transform(
    entry: EntryInfo,
    _encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    testModel(entry)
      .then((testResult) => {
        this.push(JSON.stringify(testResult))
        this.push("\n")
        callback()
      })
      .catch(callback)
  }
}

declare const describe: {
  skip: (name: string, fn: (this: Mocha.Suite) => void) => void
}

describe.skip("Performance", function () {
  this.timeout("1h")

  it("should test each model", async () => {
    const dateTime = getDateTimeString()
    const reportDirectory = path.join(outputPath, dateTime)

    await mkdir(reportDirectory, { recursive: true })

    logger.add(
      new winston.transports.File({
        level: "silly",
        filename: path.join(reportDirectory, "debug.log"),
      }),
    )

    const htmlPath = path.join(reportDirectory, "report.html")
    const jsonPath = path.join(reportDirectory, "data.jsonl")
    const jsonStream = createWriteStream(jsonPath, { encoding: "utf-8" })

    logger.info("Starting performance test")

    const reportPromise = generateReport(htmlPath)

    await new Promise<void>((resolve, reject) => {
      readdirp(modelsPath, { fileFilter: "*.stl" })
        .on("warn", (warning: Error) => logger.warn(warning.message))
        .on("error", reject)
        .pipe(new Tester())
        .pipe(jsonStream)
        .on("finish", resolve)
        .on("error", reject)
    })

    await reportPromise
    logger.info("Finished performance test!")
  })
})
