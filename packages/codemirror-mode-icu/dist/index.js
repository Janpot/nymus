"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mode = function (_a, _b) {
    var _c = (_a === void 0 ? {} : _a).indentUnit, indentUnit = _c === void 0 ? 2 : _c;
    var _d = (_b === void 0 ? {} : _b).apostropheMode, apostropheMode = _d === void 0 ? 'DOUBLE_OPTIONAL' : _d;
    function peek(stream, offset) {
        if (offset === void 0) { offset = 0; }
        return stream.string.charAt(stream.pos + offset) || undefined;
    }
    function eatEscapedStringStart(stream, inPlural) {
        var nextChar = stream.peek();
        if (nextChar === "'") {
            if (apostropheMode === 'DOUBLE_OPTIONAL') {
                var nextAfterNextChar = peek(stream, 1);
                if (nextAfterNextChar === "'" ||
                    nextAfterNextChar === '{' ||
                    (inPlural && nextAfterNextChar === '#')) {
                    stream.next();
                    return true;
                }
            }
            else {
                stream.next();
                return true;
            }
        }
        return false;
    }
    function eatEscapedStringEnd(stream) {
        var nextChar = peek(stream, 0);
        if (nextChar === "'") {
            var nextAfterNextChar = peek(stream, 1);
            if (!nextAfterNextChar || nextAfterNextChar !== "'") {
                stream.next();
                return true;
            }
        }
        return false;
    }
    function pop(stack) {
        if (stack.length > 1) {
            stack.pop();
            return true;
        }
        return false;
    }
    return {
        startState: function () {
            return {
                stack: [
                    {
                        type: 'text'
                    }
                ]
            };
        },
        copyState: function (state) {
            return {
                stack: state.stack.map(function (frame) { return Object.assign({}, frame); })
            };
        },
        token: function (stream, state) {
            var current = state.stack[state.stack.length - 1];
            var isInsidePlural = !!state.stack.find(function (frame) {
                return frame.type === 'argument' &&
                    frame.formatType &&
                    ['selectordinal', 'plural'].includes(frame.formatType);
            });
            if (current.type === 'escaped') {
                if (eatEscapedStringEnd(stream)) {
                    pop(state.stack);
                    return 'string-2';
                }
                stream.match("''") || stream.next();
                return 'string-2';
            }
            if (current.type === 'text') {
                if (eatEscapedStringStart(stream, isInsidePlural)) {
                    state.stack.push({ type: 'escaped' });
                    return 'string-2';
                }
                if (isInsidePlural && stream.eat('#')) {
                    return 'keyword';
                }
                if (stream.eat('{')) {
                    state.stack.push({
                        type: 'argument',
                        indentation: stream.indentation() + indentUnit,
                        argPos: 0
                    });
                    return 'bracket';
                }
                if (stream.peek() === '}') {
                    if (pop(state.stack)) {
                        stream.next();
                        return 'bracket';
                    }
                }
                stream.next();
                return 'string';
            }
            if (current.type === 'argument') {
                var inId = current.argPos === 0;
                var inFn = current.argPos === 1;
                var inFormat = current.argPos === 2;
                if (stream.match(/\s*,\s*/)) {
                    current.argPos += 1;
                    return null;
                }
                if (inId && stream.eatWhile(/[a-zA-Z0-9_]/)) {
                    return 'def';
                }
                if (inFn &&
                    stream.match(/(selectordinal|plural|select|number|date|time)\b/)) {
                    current.formatType = stream.current();
                    return 'keyword';
                }
                if (inFormat && stream.match(/offset\b/)) {
                    return 'keyword';
                }
                if (inFormat && stream.eat('=')) {
                    return 'operator';
                }
                if (inFormat &&
                    current.formatType &&
                    ['selectordinal', 'plural'].includes(current.formatType) &&
                    stream.match(/zero|one|two|few|many/)) {
                    return 'keyword';
                }
                if (inFormat && stream.match('other')) {
                    return 'keyword';
                }
                if (inFormat && stream.match(/[0-9]+\b/)) {
                    return 'number';
                }
                if (inFormat && stream.eatWhile(/[a-zA-Z0-9_]/)) {
                    return 'variable';
                }
                if (inFormat && stream.eat('{')) {
                    state.stack.push({ type: 'text' });
                    return 'bracket';
                }
                if (stream.eat('}')) {
                    pop(state.stack);
                    return 'bracket';
                }
            }
            if (!stream.eatSpace()) {
                stream.next();
            }
            return null;
        },
        blankLine: function (state) {
            var current = state.stack[state.stack.length - 1];
            if (current.type === 'text') {
                return 'cm-string';
            }
            return undefined;
        },
        indent: function (state, textAfter) {
            var current = state.stack[state.stack.length - 1];
            if (!current || current.type === 'text' || current.type === 'escaped') {
                return 0;
            }
            if (textAfter[0] === '}') {
                return current.indentation - indentUnit;
            }
            return current.indentation;
        }
    };
};
exports.default = mode;
