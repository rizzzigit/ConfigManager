/// <reference types="node" />
export declare enum Format {
    JSON = "json",
    YAML = "yaml",
    LB = "lb"
}
export interface Options {
    path: string;
    name: string;
    defaultFormat: Format;
}
export interface Data {
    [key: string]: any;
}
export declare class Manager {
    constructor(options?: Partial<Options>);
    readonly options: Options;
    private _readDirCache?;
    file(format?: Format): Promise<{
        path: string;
        format: Format;
    }>;
    serialize(format: Format, data: any): Promise<Buffer>;
    deserialize(format: Format, data: Buffer): Promise<any>;
    private _dataCache?;
    private _readData;
    private _writeData;
    private _isDataQueueRunning;
    private readonly _dataQueue;
    private _runDataQueue;
    private _pushToDataQueue;
    readData(): Promise<Data>;
    writeData(data: Data): Promise<void>;
    get(name: string, defaultValue?: any): Promise<any>;
    set(name: string, value: any): Promise<void>;
    has(name: string): Promise<boolean>;
    delete(name: string): Promise<void>;
    newInstance(options?: Partial<Options>): Manager;
}
