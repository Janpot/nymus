"use strict";
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
var DEFAULTS = {
    number: {
        currency: {
            style: 'currency'
        },
        percent: {
            style: 'percent'
        }
    },
    date: {
        short: {
            month: 'numeric',
            day: 'numeric',
            year: '2-digit'
        },
        medium: {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        },
        long: {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        },
        full: {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }
    },
    time: {
        short: {
            hour: 'numeric',
            minute: 'numeric'
        },
        medium: {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        },
        long: {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            timeZoneName: 'short'
        },
        full: {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            timeZoneName: 'short'
        }
    }
};
function mergeFormats() {
    var formattersList = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        formattersList[_i] = arguments[_i];
    }
    return {
        number: Object.assign.apply(Object, __spread([{},
            DEFAULTS.number], formattersList.map(function (formatters) { return formatters.number; }))),
        date: Object.assign.apply(Object, __spread([{},
            DEFAULTS.date], formattersList.map(function (formatters) { return formatters.date; }))),
        time: Object.assign.apply(Object, __spread([{},
            DEFAULTS.time], formattersList.map(function (formatters) { return formatters.time; })))
    };
}
exports.mergeFormats = mergeFormats;
