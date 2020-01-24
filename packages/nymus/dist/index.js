"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var t = require("@babel/types");
var babel = require("@babel/core");
var code_frame_1 = require("@babel/code-frame");
var Module_1 = require("./Module");
var plugin_transform_typescript_1 = require("@babel/plugin-transform-typescript");
function formatError(input, err, options) {
    if (options === void 0) { options = {}; }
    var location = err.location || (err.loc && { start: err.loc, end: err.loc });
    if (!location) {
        return err.message;
    }
    return code_frame_1.codeFrameColumns(input, location, __assign(__assign({}, options), { message: err.message }));
}
exports.formatError = formatError;
function createModuleAst(messages, options) {
    if (options === void 0) { options = {}; }
    return __awaiter(this, void 0, void 0, function () {
        var module, _a, _b, _c, key, message, componentName;
        var e_1, _d;
        return __generator(this, function (_e) {
            module = new Module_1.default(options);
            try {
                for (_a = __values(Object.entries(messages)), _b = _a.next(); !_b.done; _b = _a.next()) {
                    _c = __read(_b.value, 2), key = _c[0], message = _c[1];
                    componentName = t.toIdentifier(key);
                    module.addMessage(componentName, message);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return [2 /*return*/, t.program(module.buildModuleAst())];
        });
    });
}
exports.createModuleAst = createModuleAst;
function createModule(messages, options) {
    if (options === void 0) { options = {}; }
    return __awaiter(this, void 0, void 0, function () {
        var module, _a, _b, _c, key, message, componentName, tsAst, declarations, code_1, ts, host, readFile_1, program, _d, code, ast;
        var e_2, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    module = new Module_1.default(options);
                    try {
                        for (_a = __values(Object.entries(messages)), _b = _a.next(); !_b.done; _b = _a.next()) {
                            _c = __read(_b.value, 2), key = _c[0], message = _c[1];
                            componentName = t.toIdentifier(key);
                            module.addMessage(componentName, message);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_b && !_b.done && (_e = _a.return)) _e.call(_a);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    return [4 /*yield*/, createModuleAst(messages, options)];
                case 1:
                    tsAst = _f.sent();
                    if (!(!options.typescript && options.declarations)) return [3 /*break*/, 3];
                    code_1 = (babel.transformFromAstSync(tsAst) || {}).code;
                    if (!code_1) {
                        throw new Error('Failed to generate code');
                    }
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('typescript'); })];
                case 2:
                    ts = _f.sent();
                    host = ts.createCompilerHost({});
                    readFile_1 = host.readFile;
                    host.readFile = function (filename) {
                        return filename === 'messages.ts' ? code_1 : readFile_1(filename);
                    };
                    host.writeFile = function (fileName, contents) {
                        declarations = contents;
                    };
                    program = ts.createProgram(['messages.ts'], {
                        noResolve: true,
                        types: [],
                        emitDeclarationOnly: true,
                        declaration: true
                    }, host);
                    program.emit();
                    _f.label = 3;
                case 3: return [4 /*yield*/, babel.transformFromAstAsync(tsAst, undefined, {
                        ast: options.ast,
                        plugins: __spread((options.typescript ? [] : [plugin_transform_typescript_1.default]))
                    })];
                case 4:
                    _d = (_f.sent()) || {}, code = _d.code, ast = _d.ast;
                    if (!code) {
                        throw new Error('Failed to generate code');
                    }
                    return [2 /*return*/, {
                            code: code,
                            ast: ast,
                            declarations: declarations
                        }];
            }
        });
    });
}
exports.default = createModule;
