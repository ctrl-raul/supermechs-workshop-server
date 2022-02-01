"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function env(name, default_value) {
    const value = process.env[name];
    if (typeof value === 'string') {
        return value;
    }
    if (typeof default_value === 'string') {
        return default_value;
    }
    throw new Error(`Missing: process.env['${name}']`);
}
exports.default = env;
