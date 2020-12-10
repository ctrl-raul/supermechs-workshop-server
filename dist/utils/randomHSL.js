"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1() {
    const h = Math.floor(Math.random() * 360);
    const s = 80 + Math.round(20 * Math.random());
    const l = 80;
    return `hsl(${h}, ${s}%, ${l}%)`;
}
exports.default = default_1;
//# sourceMappingURL=randomHSL.js.map