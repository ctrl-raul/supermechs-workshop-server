export const arrayRandomItem = function<T> (array: Array<T>): T {
  return array[arrayRandomIndex(array)];
};

export const arrayRandomIndex = function (array: Array<any>): number {
  return Math.floor(Math.random() * array.length);
};
