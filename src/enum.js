/**
 * Holds information about the latest ordinal for the enum type.
 * @type {{FunctionConstructor: number}}
 */
const values = {};

/**
 * Holds information about whether or not this enum type is closed.
 * @type {{FunctionConstructor: Boolean}}
 */
const closed = {};

/**
 * Base class for all enums. All enums must define their constants statically, and
 * call {@link Enum#close} once they are done.
 */
class Enum {

    /**
     * @type {Number}
     */
    #ord;

    /**
     * @type {String}
     */
    #name;

    constructor() {
        if (closed[this.constructor]) {
            throw new Error("Enum type " + this.constructor.name + " cannot be modified anymore.");
        }
        values[this.constructor] = values[this.constructor] || 0;
        this.#ord = values[this.constructor]++;
        this.#name = null;
    }

    /**
     * The ordinal for this particular enum constant.
     * @return {Number}
     */
    ord() {
        if (!closed[this.constructor]) {
            throw new Error("You cannot use unclosed enum " + this.constructor.name + ".");
        }
        return this.#ord;
    }

    /**
     * The name of this enum constant.
     * @return {String}
     */
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

    /**
     * Returns the name of this constant as the string representation.
     * @return {String}
     */
    toString() {
        return this.name();
    }

    get [Symbol.toStringTag]() {
        return this.name();
    }

    /**
     * Returns all the enum constants for the current enum type.
     * @return {this[]}
     */
    static values() {
        return Object.keys(this)
            .filter(key => this[key] instanceof this)
            .map(key => this[key]);
    }

    /**
     * Returns the enum constant corresponding to the provided constant name.
     * @param {String} name
     * @return {this}
     */
    static fromName(name) {
        return this.values().find(item => item.name() === name);
    }

    /**
     * Closes the definition of the current enum type.
     */
    static close() {
        closed[this] = true;
        Object.freeze(this);
    }

}

module.exports = Enum;