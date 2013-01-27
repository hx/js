module('Utilities');

test('Extend', function() {

  expect(3);

  var hash1 = {foo: 'FOO'},
      hash2 = {bar: 'BAR'};

  deepEqual(hx.utils.extend(hash1, hash2), {foo: 'FOO', bar: 'BAR'}, "Result should have FOO and BAR");
  deepEqual(hash1, {foo: 'FOO', bar: 'BAR'}, 'Hash 1 should be affected');
  deepEqual(hash2, {bar: 'BAR'}, 'Hash 2 should be unaffected');

});