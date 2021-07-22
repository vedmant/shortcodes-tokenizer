import test from 'ava'
import Tokenizer, { Token } from '../src/shortcodes-tokenizer'

test('should create a simple OPEN token', async t => {
  let input = '[basket]'
  let basketToken = new Token(Tokenizer.OPEN, input)
  const tokenizer = new Tokenizer()

  t.is(tokenizer.tokens(input), [basketToken])
})

test('should throw an error when not passing a string', async t => {
  const tokenizer = new Tokenizer()
  t.throws(() => {
    tokenizer.tokens.bind(tokenizer)
  }, {message: 'Invalid input'})
  t.throws(() => {
    tokenizer.tokens.bind(tokenizer, {})
  }, {message: 'Invalid input'})
  t.throws(() => {
    tokenizer.tokens.bind(tokenizer, 1)
  }, {message: 'Invalid input'})
})
