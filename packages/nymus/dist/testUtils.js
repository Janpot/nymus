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
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("./index");
var vm = require("vm");
var babelCore = require("@babel/core");
var React = require("react");
var ReactDOMServer = require("react-dom/server");
function importFrom(code, options, intlMock) {
    if (intlMock === void 0) { intlMock = Intl; }
    var cjs = (babelCore.transformSync(code, {
        plugins: ['@babel/plugin-transform-modules-commonjs']
    }) || {}).code;
    if (!cjs) {
        throw new Error("Compilation result is empty for \"" + code + "\"");
    }
    var exports = {};
    var requireFn = function (moduleId) {
        if (moduleId === 'react' && !options.react) {
            throw new Error('importing react is not allowed');
        }
        return require(moduleId);
    };
    vm.runInThisContext("\n    (require, exports, Intl) => {\n      " + cjs + "\n    }\n  ")(requireFn, exports, intlMock);
    return exports;
}
function createComponents(messages, options, intlMock) {
    if (options === void 0) { options = {}; }
    return __awaiter(this, void 0, void 0, function () {
        var code, components, _a, _b, component;
        var e_1, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, index_1.default(messages, options)];
                case 1:
                    code = (_d.sent()).code;
                    components = importFrom(code, options, intlMock);
                    try {
                        for (_a = __values(Object.values(components)), _b = _a.next(); !_b.done; _b = _a.next()) {
                            component = _b.value;
                            // create unique names to invalidate warning cache
                            // https://github.com/facebook/react/blob/db6ac5c01c4ad669db7ca264bc81ae5b3d6dfa01/src/isomorphic/classic/types/checkReactTypeSpec.js#L68
                            // https://github.com/facebook/react/issues/4302
                            // @ts-ignore
                            component.displayName = component.name + "<" + Math.random()
                                .toString()
                                .slice(2) + ">";
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    return [2 /*return*/, components];
            }
        });
    });
}
function createComponent(message, options, intlMock) {
    return __awaiter(this, void 0, void 0, function () {
        var Component;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, createComponents({ Component: message }, __assign(__assign({}, options), { react: true }), intlMock)];
                case 1:
                    Component = (_a.sent()).Component;
                    return [2 /*return*/, Component];
            }
        });
    });
}
exports.createComponent = createComponent;
function render(elm, props) {
    if (props === void 0) { props = {}; }
    return ReactDOMServer.renderToStaticMarkup(React.createElement(elm, props));
}
exports.render = render;
