import FS from 'fs'
import Path from 'path'

export enum Format {
  JSON = 'json',
  YAML = 'yaml',
  LB = 'lb'
}

export interface Options {
  path: string
  name: string

  defaultFormat: Format
}

export interface Data {
  [key: string]: any
}

export class Manager {
  public constructor (options?: Partial<Options>) {
    this.options = {
      defaultFormat: Format.JSON,
      ...options,
      ...((path, name) => {
        const full = Path.join(path, name).split('/')

        if (full.length > 1) {
          return {
            path: full.slice(0, -1).join('/'),
            name: full.slice(-1).join('/')
          }
        } else {
          return {
            path: full.join('/'),
            name: 'index'
          }
        }
      })(options?.path || Path.join(process.cwd(), '.config'), options?.name || 'index')
    }

    this._isDataQueueRunning = false
    this._dataQueue = []
  }

  public readonly options: Options

  private _readDirCache?: Array<string>
  public async file (format?: Format): Promise<{
    path: string
    format: Format
  }> {
    const { options: { path, name } } = this

    if (format != null) {
      return {
        path: Path.join(path, `${name}.${format}`),
        format
      }
    }

    if (FS.existsSync(path)) {
      const files = this._readDirCache || (this._readDirCache = await FS.promises.readdir(path))

      for (const file of files) {
        const filePath = Path.join(path, file)
        if (!file.startsWith(name)) {
          continue
        }

        const fileStats = await FS.promises.stat(filePath)
        if (!fileStats.isFile()) {
          continue
        }

        for (const formatK in Format) {
          if (file === `${name}.${Format[<keyof typeof Format> formatK]}`) {
            return {
              path: filePath,
              format: Format[<keyof typeof Format> formatK]
            }
          }
        }
      }
    }

    return {
      path: Path.join(path, `${name}.${this.options.defaultFormat}`),
      format: this.options.defaultFormat
    }
  }

  public async serialize (format: Format, data: any) {
    switch (format) {
      case Format.LB: return (await import('@rizzzi/lb-serializer')).serialize(data)
      case Format.JSON: return Buffer.from(JSON.stringify(data, undefined, '  '), 'utf-8')
      case Format.YAML: return Buffer.from((await import('yaml')).stringify(data), 'utf-8')

      default: throw new Error(`Unknown type: ${format}`)
    }
  }

  public async deserialize (format: Format, data: Buffer) {
    switch (format) {
      case Format.LB: return (await import('@rizzzi/lb-serializer')).deserialize(data)
      case Format.JSON: return JSON.parse(data.toString('utf-8'))
      case Format.YAML: return (await import('yaml')).parse(data.toString('utf-8'))

      default: throw new Error(`Unknown type: ${format}`)
    }
  }

  private _dataCache?: Data
  private async _readData (): Promise<Data> {
    if (this._dataCache) {
      return this._dataCache
    }

    const { path, format } = await this.file()
    const data = FS.existsSync(path)
      ? (await this.deserialize(format, await FS.promises.readFile(path))) || {}
      : {}

    return (this._dataCache = data)
  }

  private async _writeData (data: Data) {
    const { options: { defaultFormat } } = this
    const { path: oldPath } = await this.file()
    const { path: newPath } = await this.file(defaultFormat)

    if (oldPath !== newPath) {
      this._readDirCache = undefined
      await FS.promises.unlink(oldPath)
    }

    this._dataCache = data
    const dir = Path.dirname(newPath)

    if (!FS.existsSync(dir)) {
      await FS.promises.mkdir(dir, { recursive: true })
    }
    await FS.promises.writeFile(newPath, await this.serialize(defaultFormat, data))
  }

  private _isDataQueueRunning: boolean
  private readonly _dataQueue: Array<(
    {
      op: 'get'
      name: string
      defaultValue?: any
    } | {
      op: 'set'
      name: string
      value: any
    } | {
      op: 'has'
      name: string
    } | {
      op: 'delete'
      name: string
    }
  ) & {
    resolve: (data: any) => void
    reject: (error: Error) => void
  }>

  private async _runDataQueue () {
    const { _dataQueue: dataQueue } = this

    if (this._isDataQueueRunning) {
      return
    }

    this._isDataQueueRunning = true
    try {
      while (dataQueue.length) {
        const entry = dataQueue.shift()
        if (!entry) {
          continue
        }

        const { resolve, reject } = entry
        const data = await this._readData()

        await (async () => {
          switch (entry.op) {
            case 'get':
              return await (async () => {
                const { name, defaultValue } = entry

                if (data[name] !== undefined) {
                  return data[name]
                } else if (defaultValue != null) {
                  if (typeof (defaultValue) === 'function') {
                    data[name] = await defaultValue()
                  } else {
                    data[name] = defaultValue
                  }

                  await this._writeData(data)
                }

                return data[name]
              })()
            case 'set':
              return await (async () => {
                const { name, value } = entry

                data[name] = value
                await this._writeData(data)
              })()
            case 'has':
              return await (async () => {
                const { name } = entry

                return data[name] !== undefined
              })()
            case 'delete':
              return await (async () => {
                const { name } = entry

                delete data[name]
                await this._writeData(data)
              })()
          }
        })().then(resolve, reject)
      }
    } finally {
      this._isDataQueueRunning = false
    }
  }

  public get (name: string, defaultValue?: any) {
    return new Promise<any>((resolve, reject) => {
      this._dataQueue.push({ op: 'get', name, defaultValue, resolve, reject })
      this._runDataQueue()
    })
  }

  public set (name: string, value: any) {
    return new Promise<void>((resolve, reject) => {
      this._dataQueue.push({ op: 'set', name, value, resolve, reject })
      this._runDataQueue()
    })
  }

  public has (name: string) {
    return new Promise<boolean>((resolve, reject) => {
      this._dataQueue.push({ op: 'has', name, resolve, reject })
      this._runDataQueue()
    })
  }

  public delete (name: string) {
    return new Promise<void>((resolve, reject) => {
      this._dataQueue.push({ op: 'delete', name, resolve, reject })
      this._runDataQueue()
    })
  }

  public newInstance (options?: Partial<Options>) {
    return new Manager({
      ...this.options,
      ...options
    })
  }
}
