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
  private readonly _dataQueue: Array<
  (
    {
      op: 'read'
    } | {
      op: 'write'
      data: Data
    }
  ) &
  {
    resolve: (data: any) => void
    reject: (error: Error) => void
  }
  >

  private async _runDataQueue () {
    if (this._isDataQueueRunning) {
      return
    }

    this._isDataQueueRunning = true
    try {
      const { _dataQueue: dataQueue } = this

      while (dataQueue.length) {
        const entry = dataQueue.shift()
        if (!entry) { continue }

        const { resolve, reject } = entry
        switch (entry.op) {
          case 'read':
            await this._readData().then(resolve, reject)
            break

          case 'write':
            await this._writeData(entry.data).then(resolve, reject)
            break
        }
      }
    } finally {
      this._isDataQueueRunning = false
    }
  }

  private _pushToDataQueue (data: (
    {
      op: 'read'
    } | {
      op: 'write'
      data: Data
    }
  ) &
  {
    resolve: (data: any) => void
    reject: (error: Error) => void
  }) {
    this._dataQueue.push(data)
    this._runDataQueue()
  }

  public readData () {
    return new Promise<Data>((resolve, reject) => this._pushToDataQueue({ op: 'read', resolve, reject }))
  }

  public writeData (data: Data) {
    return new Promise<void>((resolve, reject) => this._pushToDataQueue({ op: 'write', data, resolve, reject }))
  }

  public async get (name: string, defaultValue?: any) {
    const data = await this.readData()

    if (data[name] !== undefined) {
      return data[name]
    } else if (defaultValue != null) {
      if (typeof (defaultValue) === 'function') {
        data[name] = await defaultValue()
      } else {
        data[name] = defaultValue
      }

      await this.writeData(data)
    }

    return data[name]
  }

  public async set (name: string, value: any) {
    const data = await this.readData()

    data[name] = value
    await this.writeData(data)
  }

  public async has (name: string) {
    const data = await this.readData()
    return data[name] !== undefined
  }

  public async delete (name: string) {
    const data = await this.readData()
    delete data[name]
    await this.writeData(data)
  }

  public newInstance (options?: Partial<Options>) {
    return new Manager({
      ...this.options,
      ...options
    })
  }
}

const run = async () => {
  const manager = new Manager({
    name: 'ok'
  })

  await manager.set('asd', 'asd')
  await manager.set('asd2', 'asd')
}

run()
