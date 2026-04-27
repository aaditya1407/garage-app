if (!Array.prototype.findLast) {
  Array.prototype.findLast = function findLast<T>(
    this: T[],
    predicate: (value: T, index: number, obj: T[]) => unknown,
    thisArg?: unknown
  ) {
    for (let index = this.length - 1; index >= 0; index -= 1) {
      const value = this[index];
      if (predicate.call(thisArg, value, index, this)) {
        return value;
      }
    }
    return undefined;
  };
}

if (!Array.prototype.findLastIndex) {
  Array.prototype.findLastIndex = function findLastIndex<T>(
    this: T[],
    predicate: (value: T, index: number, obj: T[]) => unknown,
    thisArg?: unknown
  ) {
    for (let index = this.length - 1; index >= 0; index -= 1) {
      if (predicate.call(thisArg, this[index], index, this)) {
        return index;
      }
    }
    return -1;
  };
}

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = function structuredCloneFallback<T>(value: T): T {
    if (value === undefined || value === null) {
      return value;
    }
    return JSON.parse(JSON.stringify(value));
  };
}

if (typeof globalThis.WeakRef === 'undefined') {
  globalThis.WeakRef = class WeakRefFallback<T extends object> {
    private readonly value: T;

    constructor(value: T) {
      this.value = value;
    }

    deref() {
      return this.value;
    }

    get [Symbol.toStringTag]() {
      return 'WeakRef';
    }
  } as unknown as typeof WeakRef;
}
