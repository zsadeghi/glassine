const values = {};
const closed = {};

class Enum {

    #ord;
    #name;

    constructor() {
        if (closed[this.constructor]) {
            throw new Error("Enum type " + this.constructor.name + " cannot be modified anymore.");
        }
        values[this.constructor] = values[this.constructor] || 0;
        this.#ord = values[this.constructor]++;
        this.#name = null;
    }

    ord() {
        if (!closed[this.constructor]) {
            throw new Error("You cannot use unclosed enum " + this.constructor.name + ".");
        }
        return this.#ord;
    }

    name() {
        if (!closed[this.constructor]) {
            throw new Error("You cannot use unclosed enum " + this.constructor.name + ".");
        }
        if (this.#name === null) {
            this.#name = Object.keys(this.constructor)
                .find(key => this.constructor[key] instanceof this.constructor && this.constructor[key].ord() === this.ord());
        }
        return this.#name;
    }

    toString() {
        return this.name();
    }

    get [Symbol.toStringTag]() {
        return this.name();
    }
    
    static values() {
        return Object.keys(this)
            .filter(key => this[key] instanceof this)
            .map(key => this[key]);
    }

    static fromName(name) {
        return this.values().find(item => item.name() === name);
    }

    static close() {
        closed[this] = true;
        Object.freeze(this);
    }

}

module.exports = Enum;