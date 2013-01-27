module('Binary');

test('MD5 hashing', function() {

  expect(3);

  $.each({
    '':
      "d41d8cd98f00b204e9800998ecf8427e",
    'foo':
      "acbd18db4cc2f85cedef654fccc4a4d8",
    'The quick brown fox jumped over the lazy dog.':
      "5c6ffbdd40d9556b73a21e63c3e0e904"
  }, function(original, digest) {
    equal(hx.binary.md5(original), digest,
      "MD5 of '" + original + "' should be " + digest);
  });

})

test('SHA1 hashing', function() {

  expect(3);

  $.each({
    '':
      "da39a3ee5e6b4b0d3255bfef95601890afd80709",
    'foo':
      "0beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a33",
    'The quick brown fox jumped over the lazy dog.':
      "c0854fb9fb03c41cce3802cb0d220529e6eef94e"
  }, function(original, digest) {
    equal(hx.binary.sha1(original), digest,
      "SHA1 of '" + original + "' should be " + digest)
  });
  
})

test('Base64 encoding/decoding', function() {

  expect(6);

  $.each({
    '':
      "",
    'foo':
      "Zm9v",
    'The quick brown fox jumped over the lazy dog.':
      "VGhlIHF1aWNrIGJyb3duIGZveCBqdW1wZWQgb3ZlciB0aGUgbGF6eSBkb2cu"
  }, function(original, encoded) {
    equal(hx.binary.base64(original), encoded,
      "'" + original + "' should base64-encode to '" + encoded + "'");
    equal(hx.binary.base64.decode(encoded), original,
      "'" + encoded + "' should base64-decode to '" + original + "'");
  });

})
