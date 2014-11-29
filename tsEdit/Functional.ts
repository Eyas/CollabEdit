
module Functional {

    export interface Maybe<T> {
        hasValue: boolean;
        value(): T;
        map<U>(fn: (v: T) => U): Maybe<U>;
        mapRecurse<U>(fn: (v: T) => Maybe<U>): Maybe<U>;
    }

    export class Some<T> implements Maybe<T> {
        hasValue: boolean = true;
        value(): T { return this._value; }
        map<U>(fn: (v: T) => U): Some<U> {
            return new Some<U>(fn(this._value));
        }
        mapRecurse<U>(fn: (v: T) => Maybe<U>): Maybe<U> {
            return fn(this._value);
        }

        toString(): string {
            return "Some(" + this._value.toString() + ")";
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
    }

    export var None: Maybe<typeof undefined> = new Nothing<typeof undefined>();

}