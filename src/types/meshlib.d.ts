declare module "meshlib" {
  export interface MeshModel {
    [key: string]: unknown
  }

  export function parse(
    fileContent: Buffer | string,
    options: unknown,
    callback: (error: Error | null, model: MeshModel | null) => void,
  ): void

  const meshlib: {
    parse: typeof parse
  }
  export default meshlib
}
