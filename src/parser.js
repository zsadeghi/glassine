const Enum = require('./enum');

/**
 * The different types of commands for Glassine.
 */
class CommandType extends Enum {

    /**
     * The tokens which correspond to this command in the definition document.
     *
     * @type {String[]}
     */
    #tokens;

    /**
     * @param {String} token
     * @param {String} tokens
     */
    constructor(token, ...tokens) {
        super();
        this.#tokens = [token, ...tokens];
    }

    tokens() {
        return this.#tokens;
    }

    /**
     * @param {String} token
     * @return {this}
     */
    static fromToken(token) {
        return this.values().find(value => value.tokens().indexOf(token) !== -1);
    }

}

/**
 * Indicates the origin of a given document.
 * @type {CommandType}
 */
CommandType.ORIGIN = new CommandType("FROM");

/**
 * Specifies a command that should be run inside the guest.
 * @type {CommandType}
 */
CommandType.RUN = new CommandType("RUN", "EXEC");

/**
 * Indicates a set of locations that should be copied into the guest OS.
 * @type {CommandType}
 */
CommandType.COPY = new CommandType("COPY");

/**
 * Indicates the working directory for the rest of the commands.
 * @type {CommandType}
 */
CommandType.WORKDIR = new CommandType("WORKDIR");

/**
 * Indicates the entrypoint of the running guest operating system.
 * @type {CommandType}
 */
CommandType.ENTRYPOINT = new CommandType("ENTRYPOINT", "CMD");

CommandType.close();

/**
 * Represents a command that should be communicated to the Firecracker engine.
 */
class Command {

    /**
     * @type {CommandType}
     */
    #type;

    /**
     * @type {String}
     */
    #value;

    /**
     * @type {Number}
     */
    #hash;

    /**
     * @param {CommandType} type
     * @param {String} value
     */
    constructor(type, value) {
        this.#type = type;
        this.#value = value.trim();
        let hash = this.type.ord();
        hash = (hash << 5) - hash;
        for (let i = 0; i < this.value.length; i++) {
            let chr = this.value.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        this.#hash = hash;
    }

    /**
     * @return {CommandType}
     */
    get type() {
        return this.#type;
    }

    /**
     * @return {String}
     */
    get value() {
        return this.#value;
    }

    /**
     * Returns the hash of this command. This is useful for tracking what a particular command set
     * represents.
     * @return {Number}
     */
    hashCode() {
        return this.#hash;
    }

    toString() {
        return this.#type.name() + " " + this.#value;
    }

    get [Symbol.toStringTag]() {
        return this.toString();
    }

}

/**
 * A parser that can read a Glassine definition file and derive the commands defined.
 */
class Parser {

    /**
     * @param {String} text
     * @return {Command[]}
     */
    parse(text) {
        /**
         * Line number, used for error reporting.
         * @type {number}
         */
        let line = 1;
        /**
         * Where we are in the text.
         * @type {number}
         */
        let cursor = 0;
        /**
         * The resulting array of commands.
         * @type {Command[]}
         */
        let result = [];
        while (cursor < text.length) {
            // Skip the spaces at the beginning of each line.
            while (cursor < text.length && text[cursor] === ' ') {
                cursor++;
            }
            // If the line has just ended, we need to move on.
            if (text[cursor] === '\n') {
                line++;
                cursor++;
                continue;
            }
            // If we have already reached the end of the text, we should bail.
            if (cursor >= text.length) {
                break;
            }
            /**
             * The command as read from the input.
             * @type {string}
             */
            let cmd = '';

            /**
             * The arguments to the command.
             * @type {string}
             */
            let args = '';

            /**
             * Whether we have been instructed to skip the rest of the line as well.
             * @type {boolean}
             */
            let skip = false;
            // Read from the text until the first whitespace character is read.
            while (cursor < text.length && text[cursor] !== ' ') {
                if (text[cursor] === '#') {
                    // If we see a '#' symbol, we will skip the rest  of the line.
                    while (cursor < text.length && text[cursor] !== '\n') {
                        cursor++;
                    }
                    skip = true;
                    break;
                } else if (text[cursor] === '\n') {
                    // If we have already seen the newline feed character, while having read a command,
                    // this is an error, because it indicates that we have not seen any arguments supplied
                    // to the command.
                    throw new Error(`Expected to see a value after <${cmd}> on line ${line}`);
                }
                // Append the text to the command.
                cmd += text[cursor];
                // Move the cursor.
                cursor++;
            }
            // If we have been instructed to skip the rest of the line, we shouldn't do anything else here.
            if (!skip) {
                // Skip all the whitespace characters.
                while (cursor < text.length && text[cursor] === ' ') {
                    cursor++;
                }
                // If after skipping the whitespaces we see a newline feed, this means we haven't
                // seen any arguments for the command and we should error.
                if (cursor >= text.length || text[cursor] === '\n') {
                    throw new Error(`Expected to see a value after <${cmd}> at line ${line}`);
                }
                // Read from the text until the end of the line.
                while (cursor < text.length && text[cursor] !== '\n') {
                    // The backspace character indicates that whatever comes after it should be read
                    // without interpretation. So, we skip the backspace, and append what comes after
                    // to the output.
                    if (text[cursor] === '\\') {
                        // If we have a backspace, but nothing comes after it, this is an error.
                        if (cursor === text.length - 1) {
                            throw new Error(`Invalid escaping on line ${line}`);
                        } else {
                            cursor++;
                        }
                    } else if (text[cursor] === '#') {
                        // If we see a '#' character, we should skip the rest of the line.
                        while (cursor < text.length && text[cursor] !== '\n') {
                            cursor++;
                        }
                        break;
                    }
                    // If the character we are appending is the newline feed, we should increase the
                    // number of lines read so far to keep track of where we are in the text.
                    if (text[cursor] === '\n') {
                        line++;
                    }
                    // Append the character that was read to the argument.
                    args += text[cursor];
                    // Move the cursor.
                    cursor++;
                }
            }
            // We are only interested in the trimmed down version of the argument.
            args = args.trim();
            // If we have a command, but no arguments, that is an error.
            if (cmd.length !== 0 && args.length === 0) {
                throw new Error(`Expected to see a value after <${cmd}> on line ${line}`);
            }
            // If we do have a command and an argument, we should add it to the list of the resulting
            // commands.
            if (cmd.length !== 0 && args.length !== 0) {
                // Attempt to find the command corresponding to the token that we have read from the
                // text.
                let type = CommandType.fromToken(cmd);
                if (typeof type === 'undefined') {
                    throw new Error(`Invalid command <${cmd}> on line ${line}`);
                }
                // Push the result into the array.
                result.push(new Command(type, args));
            }
        }
        // If the document was not empty, we expect the very first command to specify the origin
        // of the definition.
        if (result.length > 0 && result[0].type !== CommandType.ORIGIN) {
            throw new Error("Input definition has no origin.");
        }
        // If the document is nonempty, it should not specify more than one origin.
        if (result.length > 0 && result.filter(cmd => cmd.type === CommandType.ORIGIN).length > 1) {
            throw new Error("Input definition has multiple origins.");
        }
        // If the document is nonempty, it should not specify more than one entry point.
        if (result.length > 0 && result.filter(cmd => cmd.type === CommandType.ENTRYPOINT).length > 1) {
            throw new Error("Input definition has multiple origins.");
        }
        // Return the resulting array of commands.
        return result;
    }

}

module.exports = Parser;