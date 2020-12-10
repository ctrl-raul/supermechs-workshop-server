"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arrayRandomIndex = exports.arrayRandomItem = void 0;
const arrayRandomItem = function (array) {
    return array[exports.arrayRandomIndex(array)];
};
exports.arrayRandomItem = arrayRandomItem;
const arrayRandomIndex = function (array) {
    return Math.floor(Math.random() * array.length);
};
exports.arrayRandomIndex = arrayRandomIndex;
//# sourceMappingURL=arrayRandom.js.map