
module Functional {
    
    interface MaybeUtil<T> {
        Map<U>(f: (t: T)=>U): Maybe<U>;
        FlatMap<U>(f: (t: T)=>Maybe<U>): Maybe<U>;
        Filter(f: (t: T)=>boolean): Maybe<T>;
        GetOrElse(els: T): T;
    }
    
    export type Nothing<T> = MaybeUtil<T> & {
        None: void,
    };
    
    export var None: Nothing<any> = {
        None: undefined,
        Map: () => None,
        FlatMap: () => None,
        Filter: () => None,
        GetOrElse: (els: any) => els
    }
    
    export class Just<T> implements MaybeUtil<T> {
        constructor(value: T) {
            if (value === null || value === undefined) {
                throw new Error("Trying to instantiate Some with null or undefined value.");
            }
            this.Value = value;
        }
        Map<U>(f: (t: T)=>U): Just<U> { 
            return new Just(f(this.Value));
        }
        FlatMap<U>(f: (t: T)=>Maybe<U>): Maybe<U> {
            return f(this.Value);
        }
        Filter(f: (t: T)=>boolean): Maybe<T> {
            return f(this.Value) ? this : None;
        }
        GetOrElse(): T { return this.Value; }
        Value: T;
    }
    
    export type Maybe<T> = Nothing<T> | Just<T>;
    
    export function HasValue<T>(m: Maybe<T>): m is Just<T> {
        return !m.hasOwnProperty("None") && m.hasOwnProperty("Value");
    }
    
    export function Some<T>(t: T): Just<T> {
        return new Just(t);
    }

}
