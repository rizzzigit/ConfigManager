"use strict";
exports.__esModule = true;
exports.Manager = exports.Format = void 0;
var tslib_1 = require("tslib");
var fs_1 = tslib_1.__importDefault(require("fs"));
var path_1 = tslib_1.__importDefault(require("path"));
var Format;
(function (Format) {
    Format["JSON"] = "json";
    Format["YAML"] = "yaml";
    Format["LB"] = "lb";
})(Format = exports.Format || (exports.Format = {}));
var Manager = /** @class */ (function () {
    function Manager(options) {
        this.options = tslib_1.__assign(tslib_1.__assign({ defaultFormat: Format.JSON }, options), (function (path, name) {
            var full = path_1["default"].join(path, name).split('/');
            if (full.length > 1) {
                return {
                    path: full.slice(0, -1).join('/'),
                    name: full.slice(-1).join('/')
                };
            }
            else {
                return {
                    path: full.join('/'),
                    name: 'index'
                };
            }
        })((options === null || options === void 0 ? void 0 : options.path) || path_1["default"].join(process.cwd(), '.config'), (options === null || options === void 0 ? void 0 : options.name) || 'index'));
        this._isDataQueueRunning = false;
        this._dataQueue = [];
    }
    Manager.prototype.file = function (format) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _a, path, name, files, _b, _c, _i, files_1, file, filePath, fileStats, formatK;
            return tslib_1.__generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _a = this.options, path = _a.path, name = _a.name;
                        if (format != null) {
                            return [2 /*return*/, {
                                    path: path_1["default"].join(path, "".concat(name, ".").concat(format)),
                                    format: format
                                }];
                        }
                        if (!fs_1["default"].existsSync(path)) return [3 /*break*/, 6];
                        _b = this._readDirCache;
                        if (_b) return [3 /*break*/, 2];
                        _c = this;
                        return [4 /*yield*/, fs_1["default"].promises.readdir(path)];
                    case 1:
                        _b = (_c._readDirCache = _d.sent());
                        _d.label = 2;
                    case 2:
                        files = _b;
                        _i = 0, files_1 = files;
                        _d.label = 3;
                    case 3:
                        if (!(_i < files_1.length)) return [3 /*break*/, 6];
                        file = files_1[_i];
                        filePath = path_1["default"].join(path, file);
                        if (!file.startsWith(name)) {
                            return [3 /*break*/, 5];
                        }
                        return [4 /*yield*/, fs_1["default"].promises.stat(filePath)];
                    case 4:
                        fileStats = _d.sent();
                        if (!fileStats.isFile()) {
                            return [3 /*break*/, 5];
                        }
                        for (formatK in Format) {
                            if (file === "".concat(name, ".").concat(Format[formatK])) {
                                return [2 /*return*/, {
                                        path: filePath,
                                        format: Format[formatK]
                                    }];
                            }
                        }
                        _d.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6: return [2 /*return*/, {
                            path: path_1["default"].join(path, "".concat(name, ".").concat(this.options.defaultFormat)),
                            format: this.options.defaultFormat
                        }];
                }
            });
        });
    };
    Manager.prototype.serialize = function (format, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _a, _b, _c;
            return tslib_1.__generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _a = format;
                        switch (_a) {
                            case Format.LB: return [3 /*break*/, 1];
                            case Format.JSON: return [3 /*break*/, 3];
                            case Format.YAML: return [3 /*break*/, 4];
                        }
                        return [3 /*break*/, 6];
                    case 1: return [4 /*yield*/, Promise.resolve().then(function () { return tslib_1.__importStar(require('@rizzzi/lb-serializer')); })];
                    case 2: return [2 /*return*/, (_d.sent()).serialize(data)];
                    case 3: return [2 /*return*/, Buffer.from(JSON.stringify(data, undefined, '  '), 'utf-8')];
                    case 4:
                        _c = (_b = Buffer).from;
                        return [4 /*yield*/, Promise.resolve().then(function () { return tslib_1.__importStar(require('yaml')); })];
                    case 5: return [2 /*return*/, _c.apply(_b, [(_d.sent()).stringify(data), 'utf-8'])];
                    case 6: throw new Error("Unknown type: ".concat(format));
                }
            });
        });
    };
    Manager.prototype.deserialize = function (format, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _a;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = format;
                        switch (_a) {
                            case Format.LB: return [3 /*break*/, 1];
                            case Format.JSON: return [3 /*break*/, 3];
                            case Format.YAML: return [3 /*break*/, 4];
                        }
                        return [3 /*break*/, 6];
                    case 1: return [4 /*yield*/, Promise.resolve().then(function () { return tslib_1.__importStar(require('@rizzzi/lb-serializer')); })];
                    case 2: return [2 /*return*/, (_b.sent()).deserialize(data)];
                    case 3: return [2 /*return*/, JSON.parse(data.toString('utf-8'))];
                    case 4: return [4 /*yield*/, Promise.resolve().then(function () { return tslib_1.__importStar(require('yaml')); })];
                    case 5: return [2 /*return*/, (_b.sent()).parse(data.toString('utf-8'))];
                    case 6: throw new Error("Unknown type: ".concat(format));
                }
            });
        });
    };
    Manager.prototype._readData = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _a, path, format, data, _b, _c, _d;
            return tslib_1.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (this._dataCache) {
                            return [2 /*return*/, this._dataCache];
                        }
                        return [4 /*yield*/, this.file()];
                    case 1:
                        _a = _e.sent(), path = _a.path, format = _a.format;
                        if (!fs_1["default"].existsSync(path)) return [3 /*break*/, 4];
                        _c = this.deserialize;
                        _d = [format];
                        return [4 /*yield*/, fs_1["default"].promises.readFile(path)];
                    case 2: return [4 /*yield*/, _c.apply(this, _d.concat([_e.sent()]))];
                    case 3:
                        _b = (_e.sent()) || {};
                        return [3 /*break*/, 5];
                    case 4:
                        _b = {};
                        _e.label = 5;
                    case 5:
                        data = _b;
                        return [2 /*return*/, (this._dataCache = data)];
                }
            });
        });
    };
    Manager.prototype._writeData = function (data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var defaultFormat, oldPath, newPath, dir, _a, _b, _c;
            return tslib_1.__generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        defaultFormat = this.options.defaultFormat;
                        return [4 /*yield*/, this.file()];
                    case 1:
                        oldPath = (_d.sent()).path;
                        return [4 /*yield*/, this.file(defaultFormat)];
                    case 2:
                        newPath = (_d.sent()).path;
                        if (!(oldPath !== newPath)) return [3 /*break*/, 4];
                        this._readDirCache = undefined;
                        return [4 /*yield*/, fs_1["default"].promises.unlink(oldPath)];
                    case 3:
                        _d.sent();
                        _d.label = 4;
                    case 4:
                        this._dataCache = data;
                        dir = path_1["default"].dirname(newPath);
                        if (!!fs_1["default"].existsSync(dir)) return [3 /*break*/, 6];
                        return [4 /*yield*/, fs_1["default"].promises.mkdir(dir, { recursive: true })];
                    case 5:
                        _d.sent();
                        _d.label = 6;
                    case 6:
                        _b = (_a = fs_1["default"].promises).writeFile;
                        _c = [newPath];
                        return [4 /*yield*/, this.serialize(defaultFormat, data)];
                    case 7: return [4 /*yield*/, _b.apply(_a, _c.concat([_d.sent()]))];
                    case 8:
                        _d.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Manager.prototype._runDataQueue = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var dataQueue, _loop_1, this_1;
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        dataQueue = this._dataQueue;
                        if (this._isDataQueueRunning) {
                            return [2 /*return*/];
                        }
                        this._isDataQueueRunning = true;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 5, 6]);
                        _loop_1 = function () {
                            var entry, resolve, reject, data;
                            return tslib_1.__generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        entry = dataQueue.shift();
                                        if (!entry) {
                                            return [2 /*return*/, "continue"];
                                        }
                                        resolve = entry.resolve, reject = entry.reject;
                                        return [4 /*yield*/, this_1._readData()];
                                    case 1:
                                        data = _b.sent();
                                        return [4 /*yield*/, (function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                                var _a;
                                                var _this = this;
                                                return tslib_1.__generator(this, function (_b) {
                                                    switch (_b.label) {
                                                        case 0:
                                                            _a = entry.op;
                                                            switch (_a) {
                                                                case 'get': return [3 /*break*/, 1];
                                                                case 'set': return [3 /*break*/, 3];
                                                                case 'has': return [3 /*break*/, 5];
                                                                case 'delete': return [3 /*break*/, 7];
                                                            }
                                                            return [3 /*break*/, 9];
                                                        case 1: return [4 /*yield*/, (function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                                                var name, defaultValue, _a, _b;
                                                                return tslib_1.__generator(this, function (_c) {
                                                                    switch (_c.label) {
                                                                        case 0:
                                                                            name = entry.name, defaultValue = entry.defaultValue;
                                                                            if (!(data[name] !== undefined)) return [3 /*break*/, 1];
                                                                            return [2 /*return*/, data[name]];
                                                                        case 1:
                                                                            if (!(defaultValue != null)) return [3 /*break*/, 6];
                                                                            if (!(typeof (defaultValue) === 'function')) return [3 /*break*/, 3];
                                                                            _a = data;
                                                                            _b = name;
                                                                            return [4 /*yield*/, defaultValue()];
                                                                        case 2:
                                                                            _a[_b] = _c.sent();
                                                                            return [3 /*break*/, 4];
                                                                        case 3:
                                                                            data[name] = defaultValue;
                                                                            _c.label = 4;
                                                                        case 4: return [4 /*yield*/, this._writeData(data)];
                                                                        case 5:
                                                                            _c.sent();
                                                                            _c.label = 6;
                                                                        case 6: return [2 /*return*/, data[name]];
                                                                    }
                                                                });
                                                            }); })()];
                                                        case 2: return [2 /*return*/, _b.sent()];
                                                        case 3: return [4 /*yield*/, (function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                                                var name, value;
                                                                return tslib_1.__generator(this, function (_a) {
                                                                    switch (_a.label) {
                                                                        case 0:
                                                                            name = entry.name, value = entry.value;
                                                                            data[name] = value;
                                                                            return [4 /*yield*/, this._writeData(data)];
                                                                        case 1:
                                                                            _a.sent();
                                                                            return [2 /*return*/];
                                                                    }
                                                                });
                                                            }); })()];
                                                        case 4: return [2 /*return*/, _b.sent()];
                                                        case 5: return [4 /*yield*/, (function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                                                var name;
                                                                return tslib_1.__generator(this, function (_a) {
                                                                    name = entry.name;
                                                                    return [2 /*return*/, data[name] !== undefined];
                                                                });
                                                            }); })()];
                                                        case 6: return [2 /*return*/, _b.sent()];
                                                        case 7: return [4 /*yield*/, (function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                                                var name;
                                                                return tslib_1.__generator(this, function (_a) {
                                                                    switch (_a.label) {
                                                                        case 0:
                                                                            name = entry.name;
                                                                            delete data[name];
                                                                            return [4 /*yield*/, this._writeData(data)];
                                                                        case 1:
                                                                            _a.sent();
                                                                            return [2 /*return*/];
                                                                    }
                                                                });
                                                            }); })()];
                                                        case 8: return [2 /*return*/, _b.sent()];
                                                        case 9: return [2 /*return*/];
                                                    }
                                                });
                                            }); })().then(resolve, reject)];
                                    case 2:
                                        _b.sent();
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _a.label = 2;
                    case 2:
                        if (!dataQueue.length) return [3 /*break*/, 4];
                        return [5 /*yield**/, _loop_1()];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 2];
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        this._isDataQueueRunning = false;
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    Manager.prototype.get = function (name, defaultValue) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._dataQueue.push({ op: 'get', name: name, defaultValue: defaultValue, resolve: resolve, reject: reject });
            _this._runDataQueue();
        });
    };
    Manager.prototype.set = function (name, value) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._dataQueue.push({ op: 'set', name: name, value: value, resolve: resolve, reject: reject });
            _this._runDataQueue();
        });
    };
    Manager.prototype.has = function (name) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._dataQueue.push({ op: 'has', name: name, resolve: resolve, reject: reject });
            _this._runDataQueue();
        });
    };
    Manager.prototype["delete"] = function (name) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._dataQueue.push({ op: 'delete', name: name, resolve: resolve, reject: reject });
            _this._runDataQueue();
        });
    };
    Manager.prototype.newInstance = function (options) {
        return new Manager(tslib_1.__assign(tslib_1.__assign({}, this.options), options));
    };
    return Manager;
}());
exports.Manager = Manager;
