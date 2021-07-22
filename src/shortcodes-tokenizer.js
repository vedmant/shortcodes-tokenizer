/** @module ShortcodesTokenizer */

/* tokens */
const ROOT = 'ROOT'
const TEXT = 'TEXT'
const OPEN = 'OPEN'
const CLOSE = 'CLOSE'
const SELF_CLOSING = 'SELF_CLOSING'
const CUSTOM = 'CUSTOM'

/* eslint-disable */

/* matches code name */
const RX_KEY = '[a-zA-Z][a-zA-Z0-9_-]*'

/* matches paramters */
const RX_PARAM =       RX_KEY + '=\\d+\\.\\d+' +         // floats
  '|' + RX_KEY + '=\\d+' +                // ints
  '|' + RX_KEY + '=[^"^\'\\]\\s]+' +      // no-quote strings
  '|' + RX_KEY + '="[^\\]"]*"' +          // double-qouted strings
  '|' + RX_KEY + '=\'[^\\]\']*\'' +       // single-qouted strings
  '|' + RX_KEY                            // flags
const RX_PARAMS = '(?:(?:' + RX_PARAM + ')(?:(?!\\s+/?\\])|\\s*|))+'

/* matches all code token types, used for quickly
   finding potentia code tokens */
const RX_ENCLOSURE   = '\\[\\/?[a-zA-Z][^\\]]+\\]'
/* matches opening code tokens [row] */
const RX_OPEN        = '\\[(' + RX_KEY + ')(\\s' + RX_PARAMS + ')?\\]'
/* matches self-closing code tokens [row/] */
const RX_SELFCLOSING = '\\[(' + RX_KEY + ')(\\s' + RX_PARAMS + ')?\\s?\\/\\]'
/* matches close code tokens [/row] */
const RX_CLOSE       = '\\[\\/(' + RX_KEY + ')\\]'

/* case-insensitive regular expressions */
const rxParams      = new RegExp(RX_PARAMS.substring(0, RX_PARAMS.length - 1), 'ig')
const rxEnclosure   = new RegExp(RX_ENCLOSURE, 'i')
const rxOpen        = new RegExp(RX_OPEN, 'i')
const rxClose       = new RegExp(RX_CLOSE, 'i')
const rxSelfclosing = new RegExp(RX_SELFCLOSING, 'i')

/* eslint-enable */

/**
 * Get token type based on token-string.
 *
 * Note: assuming that this is not a TEXT token
 *
 * @param {string} str
 * @returns {string} token type
 */
function getTokenType(str) {
  if (str[1] === '/') {
    return CLOSE
  }
  if (str[str.length - 2] === '/') {
    return SELF_CLOSING
  }
  return OPEN
}

/**
 * Casts input string to native types.
 *
 * @param {string} value
 * @returns {*} mixed value
 */
function castValue(value) {
  return value.replace(/(^['"]|['"]$)/g, '')
}

/**
 * Token class is used both as a token during tokenization/lexing
 * and as a node in the resulting AST.
 */
export class Token {
  constructor(type, body = null, pos = 0) {
    this.id = [...Array(10)].map(i=>(~~(Math.random()*36)).toString(36)).join('')
    this.name = null
    this.type = type
    this.body = body
    this.pos = pos
    this.children = []
    this.params = {}
    this.isClosed = type === SELF_CLOSING
    this.init()
  }

  /**
   * @access private
   */
  init() {
    if (! [TEXT, ROOT, CUSTOM].includes(this.type)) {
      // console.log(this)
      const match = this.matchBody()
      this.initName(match)
      if (match[2]) {
        this.initParams(match[2])
      }
    }
  }

  /**
   * @access private
   */
  initName(match) {
    this.name = match[1]
  }

  /**
   * @access private
   */
  initParams(paramStr) {
    // console.log(paramStr, rxParams)
    const match = paramStr.match(rxParams)
    // console.log('initParams finished')
    this.params = match.reduce((params, paramToken) => {
      paramToken = paramToken.trim()
      let equal = paramToken.indexOf('=')
      if (!~equal) {
        params[paramToken] = true
      } else {
        params[paramToken.substring(0, equal)] = castValue(paramToken.substring(equal + 1))
      }
      return params
    }, {})
  }

  /**
   * @return {string}
   */
  buildParams() {
    let result = ''

    for (const key of Object.keys(this.params)) {
      const value = this.params[key]
      const typeOfValue = typeof value
      if (typeOfValue === 'string') {
        result = `${result} ${key}="${value}"`
      } else if (typeOfValue === 'boolean') {
        const value_ = value ? 'yes' : 'no'
        result = `${result} ${key}=${value_}`
      } else {
        result = `${result} ${key}=${value}`
      }
    }

    return result
  }

  /**
   * Convert token to string.
   *
   * @param {object|string|null} [params=null]
   * @param {number} level
   * @return {string}
   */
  toString(params = null, level = 1) {
    if (params instanceof Object) {
      this.params = params
    }

    const computedParams = typeof params === 'string'
      ? ` ${params.trim()}`
      : this.buildParams()

    if (this.type === TEXT) {
      return this.body.trim() + '\n'
    }

    if (this.children.length) {
      const children = this.children.reduce((s, t) =>  s + '  '.repeat(level) + t.toString(null, level + 1), '')
      return `[${this.name}${computedParams}]\n${children}${'  '.repeat(level - 1)}[/${this.name}]\n`
    }

    return `[${this.name}${computedParams}]\n`
  }

  /**
   * @access private
   */
  matchBody() {
    let rx
    if (this.type === CLOSE) {
      rx = rxClose
    } else if (this.type === OPEN) {
      rx = rxOpen
    } else if (this.type === SELF_CLOSING) {
      rx = rxSelfclosing
    } else {
      throw new SyntaxError('Unknown token: ' + this.type)
    }

    // console.log(this.body, rx.toString())
    let match = this.body.match(rx)
    // console.log('matched')
    if (match === null) {
      throw new SyntaxError('Invalid ' + this.type + ' token: ' + this.body)
    }
    return match
  }

  /**
   * Determines if this token can close the param token.
   *
   * @access public
   * @param {Token} token another token
   * @returns {boolean}
   */
  canClose(token) {
    return this.name === token.name
  }
}

/**
 * Creates a new tokenizer.
 *
 * Pass in input as first param or later using `input()`
 *
 * @param {string} [input=null] Optional input to tokenize
 * @param {Object} [options] options object
 * @param {boolean} [options.strict=true] strict mode
 * @param {boolean} [options.skipWhiteSpace=false] will ignore tokens containing only white space (basically all \s)
 */
export default class ShortcodesTokenizer {
  constructor(input = null, options = {strict: true, skipWhiteSpace: false}) {
    if (typeof options === 'boolean') {
      options = {strict: options, skipWhiteSpace: false}
    }
    this.options = Object.assign({strict: true, skipWhiteSpace: false}, options)
    this.buf = null
    this.originalBuf = null
    this.pos = 0
    if (input) {
      this.input(input)
    }
  }

  /**
   * Sets input buffer with a new input string.
   *
   * @param {string} input template string
   * @throws {Error} Invalid input
   * @returns {this} returns this for chaining
   */
  input(input) {
    if (typeof input !== 'string') {
      throw new Error('Invalid input')
    }

    this.buf = this.originalBuf = input
    this.pos = 0
    return this
  }

  /**
   * Resets input buffer and position to their origial values.
   *
   * @returns {this} returns this for chaining
   */
  reset() {
    this.buf = this.originalBuf
    this.pos = 0
    return this
  }

  /**
   * Creates a token generator.
   *
   * @throws {Error} Invalid input
   * @returns {Token[]} An array of Token instances
   */
  tokens(input = null) {
    if (input) {
      this.input(input)
    }

    if (typeof this.buf !== 'string') {
      throw new Error('Invalid input')
    }

    let tokens = []
    let allTokens = []
    while ((tokens = this._next()) !== null) {
      tokens = Array.isArray(tokens) ? tokens : [tokens]
      allTokens.push(...tokens)
    }
    return allTokens
  }

  /**
   * Uses the tokens generator to build an AST from the tokens.
   *
   * @see tokens
   * @returns {array} an array of AST roots
   */
  ast(input = null) {
    let tokens = this.tokens(input)
    let stack = []
    const root = new Token(ROOT)
    let parent = root
    let token

    for (token of tokens) {
      if (token.type === TEXT) {
        if (this.options.skipWhiteSpace && token.body.replace(/\s+/g, '').length === 0) {
          continue
        }
        parent.children.push(token)
      } else if (token.type === OPEN) {
        parent.children.push(token)
        stack.push(parent)
        parent = token
      } else if (token.type === CLOSE) {
        // Just closing parent token
        if (token.canClose(parent)) {
          parent.isClosed = true
          parent = stack.pop()
        } else {
          parent = this.handleSelfClosingTokens(parent, token, stack)
        }
      } else if (token.type === SELF_CLOSING) {
        parent.children.push(token)
      } else {
        /* istanbul ignore next */
        throw new SyntaxError('Unknown token: ' + token.type)
      }
    }

    if (parent !== root) {
      // console.log({lastParent: JSON.parse(JSON.stringify(parent))})
      this.handleSelfClosingTokens(parent, token, stack)
    }

    return root.children
  }

  handleSelfClosingTokens(parent, token, stack) {
    const openIdx = this.findOpenIdx(token, stack)
    const openToken = stack[openIdx]
    openToken.isClosed = true

    stack.push(parent)

    // Close all tokens after opening token
    for (let i = openIdx + 1; i < stack.length; i++) {
      parent = stack[i]
      this.closeTokenAndMoveChildren(parent, openToken)
      if (! openToken.children.find(o => o === parent)) {
        openToken.children.push(parent)
      }
    }
    stack.splice(openIdx + 1)

    // Remove openToken form stack
    stack.pop()
    // Set previous parent
    parent = stack.pop()

    return parent
  }

  findOpenIdx(token, stack) {
    // Search if element in stack can be closed
    let openIdx = null
    for (let i = stack.length - 1; i >= 0; i --) {
      if (stack[i].canClose(token)) {
        openIdx = i
        break
      }
    }

    if (openIdx === null) {
      // If no opening token found, it will be ROOT token
      openIdx = 0
    }

    return openIdx
  }

  closeTokenAndMoveChildren(token, openToken) {
    token.isClosed = true
    token.type = SELF_CLOSING

    token.children.forEach(c => {
      if (!openToken.children.find(p => p === c)) {
        // console.log('push', {c})
        openToken.children.push(c)
      }
    })

    token.children = []
  }

  /**
   * Build template by given token.
   *
   * @param {Token} token
   * @param {object|string|null} [params=null]

   * @throws {Error} Unexpected token type.
   * @returns {string}
   */
  buildTemplate(token, params = null) {
    if (!token) {
      return ''
    }

    if (!(token instanceof Token)) {
      throw new Error('Expected Token instance.')
    }

    const build = (value) => {
      const childs = value.children.map(
        child => (child.children.length ? build(child) : child.toString())
      )

      return value.toString(params).replace('{slot}', childs.join(''))
    }

    return build(token)
  }

  /**
   * Internal function used to retrieve the next token from the current
   * position in the input buffer.
   *
   * @private
   * @returns {Token} returns the next Token from the input buffer
   */
  _next() {
    if (!this.buf) {
      return null
    }

    let match = this.buf.match(rxEnclosure)

    // all text
    if (match === null) {
      let token = new Token(TEXT, this.buf, this.pos)
      this.pos += this.buf.length
      this.buf = null
      return token
    }

    let tokens = []

    // first part is text
    if (match.index !== 0) {
      tokens.push(new Token(
        TEXT,
        this.buf.substring(0, match.index),
        this.pos
      ))
    }

    // matching token
    tokens.push(new Token(
      getTokenType(match[0]),
      match[0],
      this.pos + match.index
    ))

    // shorten buffer
    this.buf = this.buf.substring(match.index + match[0].length)
    this.pos += match.index + match[0].length
    if (this.buf.length === 0) {
      this.buf = null
    }

    return tokens
  }
}

Object.assign(ShortcodesTokenizer, {
  TEXT,
  OPEN,
  CLOSE,
  SELF_CLOSING,
  rxParams,
  rxEnclosure,
  rxOpen,
  rxClose,
  rxSelfclosing
})
