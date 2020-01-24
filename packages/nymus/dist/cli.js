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
Object.defineProperty(exports, "__esModule", { value: true });
var yargs = require("yargs");
var fs = require("fs");
var path = require("path");
var index_1 = require("./index");
var util_1 = require("util");
var globby = require("globby");
var fsReadFile = util_1.promisify(fs.readFile);
var fsWriteFile = util_1.promisify(fs.writeFile);
var argv = yargs
    .usage('Usage: $0 [options] [file...]')
    .example('$0 --locale en ./string-en.json', '')
    .option('locale', {
    type: 'string',
    description: 'The locale to use for formatters',
    alias: 'l',
    requiresArg: true
})
    .option('typescript', {
    type: 'boolean',
    description: 'Emit typescript instead of javascript',
    alias: 't'
})
    .option('declarations', {
    type: 'boolean',
    description: 'Emit type declarations (.d.ts)',
    alias: 'd'
}).argv /*
.option('output-dir', {
type: 'string',
description: 'The directory where transformed files should be stored',
alias: 'o'
})
.option('source-root', {
type: 'string',
description:
  'The directory where the source files are considered relative from'
}) */;
function getOutputDirectory(srcPath) {
    return path.dirname(srcPath);
}
function transformFile(srcPath, options) {
    return __awaiter(this, void 0, void 0, function () {
        var content, messages, _a, code, declarations;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, fsReadFile(srcPath, { encoding: 'utf-8' })];
                case 1:
                    content = _b.sent();
                    messages = JSON.parse(content);
                    return [4 /*yield*/, index_1.default(messages, options)];
                case 2:
                    _a = _b.sent(), code = _a.code, declarations = _a.declarations;
                    return [2 /*return*/, { code: code, declarations: declarations }];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var resolvedFiles;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (argv._.length <= 0) {
                        throw new Error('missing input');
                    }
                    return [4 /*yield*/, globby(argv._)];
                case 1:
                    resolvedFiles = _a.sent();
                    return [4 /*yield*/, Promise.all(resolvedFiles.map(function (resolvedFile) { return __awaiter(_this, void 0, void 0, function () {
                            var _a, code, declarations, outputDirectory, fileName, extension, fileBaseName, outputExtension, outputPath, declarationsPath;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0: return [4 /*yield*/, transformFile(resolvedFile, __assign(__assign({}, argv), { 
                                            // force this for now
                                            react: true }))];
                                    case 1:
                                        _a = _b.sent(), code = _a.code, declarations = _a.declarations;
                                        outputDirectory = getOutputDirectory(resolvedFile);
                                        fileName = path.basename(resolvedFile);
                                        extension = path.extname(resolvedFile);
                                        fileBaseName = extension.length <= 0 ? fileName : fileName.slice(0, -extension.length);
                                        outputExtension = argv.typescript ? '.ts' : '.js';
                                        outputPath = path.join(outputDirectory, fileBaseName + outputExtension);
                                        declarationsPath = path.join(outputDirectory, fileBaseName + '.d.ts');
                                        return [4 /*yield*/, Promise.all([
                                                fsWriteFile(outputPath, code, { encoding: 'utf-8' }),
                                                declarations
                                                    ? fsWriteFile(declarationsPath, declarations, { encoding: 'utf-8' })
                                                    : null
                                            ])];
                                    case 2:
                                        _b.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.log(error.message);
    process.exit(1);
});
