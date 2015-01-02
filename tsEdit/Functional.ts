
module Functional {

    export interface Maybe<T> {
        hasValue: boolean;
        value(): T;
        map<U>(fn: (v: T) => U): Maybe<U>;
        mapRecurse<U>(fn: (v: T) => Maybe<U>): Maybe<U>;
    }

    class Just<T> implements Maybe<T> {
        hasValue: boolean = true;
        value(): T { return this._value; }
        map<U>(fn: (v: T) => U): Just<U> {
            return new Just<U>(fn(this._value));
        }
        mapRecurse<U>(fn: (v: T) => Maybe<U>): Maybe<U> {
            return fn(this._value);
        }

        toString(): string {
            return "Just(" + this._value.toString() + ")";
        }

        valueOf(): any {
            return this._value.valueOf();
        }

        constructor(value: T) {
            if (value === null || value === undefined) {
                throw new Error("Trying to instantiate Some with null or undefined value.");
            }
            this._value = value;
        }
        private _value: T;
    }

    class Nothing<T> implements Maybe<T> {
        hasValue: boolean = false;
        value(): T { throw new Error("Trying to access value of nothing."); }
        map<U>(fn: (v: T) => U): Nothing<U> {
            return new Nothing<U>();
        }
        mapRecurse<U>(fn: (v: T) => Maybe<U>): Maybe<U> {
            return new Nothing<U>();
        }

        toString(): string {
            return "Nothing";
        }

        valueOf(): any {
            return undefined;
        }
    }

    export var None: Maybe<typeof undefined> = new Nothing<typeof undefined>();
    export function Some<T>(some: T): Maybe<T> {
        return new Just<T>(some);
    }

}
