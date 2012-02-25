hx.binary = (function(){

    var md5Offsets = [
        [7, 12, 17, 22],
        [5,  9, 14, 20],
        [4, 11, 16, 23],
        [6, 10, 15, 21]
    ],

    md5Extra = [
        [0,1],
        [1,5],
        [5,3],
        [0,7]
    ],

    rotateLeft = function(v, o) {
        return (v << o) | (v >>> (32 - o));
    },

    add = function(x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        return (((x >> 16) + (y >> 16) + (lsw >> 16)) << 16) | (lsw & 0xFFFF);
    },

    longToString = function(l) {
        var r = '', i;
        for(i = 0; i < 4; i++)
            r += String.fromCharCode((l >> (i * 8)) & 255);
        return r;
    },

    stringToWords = function(string, littleEndian) {
        var ret = [],
            length = string.length / 4,
            i = 0, j, x;
        for(;i < length; i++) {
            x = 0;
            for(j = 4; j--;)
                x |= string.charCodeAt(i * 4 + j) << ((littleEndian ? j : 3 - j) * 8);
            ret.push(x);
        }
        return ret;
    },

    fromCharCode = String.fromCharCode,

    charCodeAt = function(string, index) {
        return string.charCodeAt(index)
    },

    math = Math,
    floor = math.floor,
    ceil = math.ceil,
    pow = math.pow,

    makeCharacterPool = function(spec) {
        var ret = [],
            v, r, i;

        while(spec.length) {
            ret.push(fromCharCode(v = charCodeAt(spec, 0)));
            if(spec.match(/^.[\da-f]{2}/)) {
                r = parseInt(spec.substr(1, 2), 16);
                for(i = 1; i <= r; i++)
                    ret.push(fromCharCode(v + i));
                spec = spec.substr(3);
            } else
                spec = spec.substr(1);
        }

        return ret;

    },
    baseEncoder = function(characterPool, paddingCharacter, caseSensitive) {

        if(typeof characterPool === 'string')
            characterPool = characterPool.split('');

        // characterPool must be an array with a power-of-two count of characters (2, 4, 8 etc to a max of 256)
        if(!characterPool instanceof Array)
            return !1;

        var log = math.log,
            i = characterPool.length,
            bitsPerCharacter = log(i) / log(2),
            bytesPerBlock,
            charsPerBlock = bitsPerCharacter,
            reverseLookup = {},
            encode = function(original) {

                var blockCount = ceil(original.length / bytesPerBlock),
                    i = -1, j,
                    high, low, middle, offset, end, byte1, ret = '';

                while(++i < blockCount)
                    for(j = 0; j < charsPerBlock; j++) {
                        low = floor(middle = j * bitsPerCharacter / 8);
                        high = floor(middle + bitsPerCharacter / 8);
                        offset = (middle - low) * 8;
                        end = (bitsPerCharacter + offset) % 8;
                        ret += isNaN(byte1 = charCodeAt(original, i * bytesPerBlock + low))
                            ? paddingCharacter
                            : characterPool[
                                (low < middle
                                    ? ((byte1 & (pow(2, 8 - offset) - 1 - (end > offset ? pow(2, 8 - end) - 1 : 0))) << end) % 255
                                    : 0)
                                |
                                    (offset + bitsPerCharacter > 8 || !j
                                    ? charCodeAt(original, i * bytesPerBlock + high) >>> (8 - end)
                                    : 0)
                            ];
                    }

                return ret;

            };

        encode.encode = function(x){return encode(x)};
        encode.decode = function(encoded) {

                if(!encoded)
                    return '';

                var encodedLength = encoded.length,
                    blockCount = encodedLength / charsPerBlock,
                    i = -1,
                    bytes,
                    j, charIndex,
                    low, middle, high, offset, end,
                    padding = 0;

                if(blockCount !== floor(blockCount))
                    return !1;

                while(encoded.substr(encodedLength - 1 - padding, 1) === paddingCharacter)
                    padding++;

                bytes = Array(blockCount * bytesPerBlock - ceil(padding * bitsPerCharacter / 8));

                while(++i < blockCount)
                    for(j = 0; j < charsPerBlock; j++) {
                        charIndex = reverseLookup[encoded.charAt(i * charsPerBlock + j)]
                        if(charIndex !== undefined)
                        {
                            low = floor(middle = i * bytesPerBlock + j * bitsPerCharacter / 8);
                            high = floor(middle + bitsPerCharacter / 8);
                            offset = (middle - low) * 8;
                            end = (bitsPerCharacter + offset) % 8;
                            if(low === high)
                                bytes[low] |= (charIndex << (8 - bitsPerCharacter - offset));
                            else {
                                bytes[low] |= (charIndex >>> end);
                                if(high < bytes.length)
                                    bytes[high] |= ((charIndex << (8 - end)) & 255);
                            }
                        }
                    }

                while(bytes[bytes.length - 1] === undefined)
                    bytes.pop();

                return fromCharCode.apply(0, bytes);
            };

        if(bitsPerCharacter > 8 || bitsPerCharacter <= 0 || bitsPerCharacter !== floor(bitsPerCharacter))
            return !1;

        while(charsPerBlock % 8)
            charsPerBlock += bitsPerCharacter;

        bytesPerBlock = charsPerBlock / 8;
        charsPerBlock /= bitsPerCharacter;

        // make a lookup table for faster decoding
        while(i--)
            if(caseSensitive)
                reverseLookup[characterPool[i]] = i;
            else
                reverseLookup[characterPool[i].toUpperCase()] =
                reverseLookup[characterPool[i].toLowerCase()] = i;

        return encode;

    },

    utf8 = function(string) {
        return unescape(encodeURIComponent(string));
    },

    base64 = baseEncoder(makeCharacterPool("A19a19009+/"), '=', 1),
    base16 = baseEncoder(makeCharacterPool("009a05")),

    base64ToWords = function(string) {
        return stringToWords(base64.decode(string));
    },

    sha1Matrix = base64ToWords("WoJ5mW7Z66GPG7zcymLB1g=="),

    md5Matrix = base64ToWords(
        "12qkeOjHt1YkIHDbwb3O7vV8D69Hh8YqqDBGE/1GlQFpgJjYi0T3r///W7GJXNe+a5ARI" +
        "v2YcZOmeUOOSbQIIfYeJWLAQLNAJl5aUem2x6rWLxBdAkQUU9ih5oHn0/vIIeHN5sM3B9" +
        "b01Q2HRVoU7anj6QX876P4Z28C2Y0qTIr/+jlCh3H2gW2dYSL95TgMpL7qREvez6n2u0t" +
        "gvr+8cCibfsbqoSf61O8whQSIHQXZ1NA55tuZ5R+ifPjErFZl9CkiREMq/5erlCOn/JOg" +
        "OWVbWcOPDMyS/+/0fYWEXdFvqH5P/izm4KMBQxROCBGh91N+gr068jUq19K764bTkQ=="),

    startingPoint = base64.decode('Z0UjAe/Nq4mYutz+EDJUdsPS4fA=');

    utf8.encode = function(string) {
        return utf8(string);
    };

    utf8.decode = function(bytes) {
        return decodeURIComponent(escape(bytes));
    };


    return {

        base64 : base64,

        base16 : base16,

        base128 : baseEncoder(makeCharacterPool("03f°3f"), '~', true),
        base2 : baseEncoder(makeCharacterPool("001")),
        base8 : baseEncoder(makeCharacterPool("007"), '='),
        base4 : baseEncoder('.oO0', '', true),
        base32 : baseEncoder(makeCharacterPool('a19105'), '0'),

        utf8 : utf8,

        sha1 : function(string, raw) {

            string += fromCharCode(128);

            var H = stringToWords(startingPoint),
                len = string.length,
                l = len / 4 + 2,
                l2 = (len - 1) * 8,
                N = ceil(l / 16),
                M = Array(N),
                i = 0, j, s, T,
                W = Array(80),
                w = Array(5),
                ret = '',
                max = 0xffffffff;

            for(; i < N; i++) {
                M[i] = Array(16);
                for(j = 0; j < 16; j++)
                    M[i][j] =
                        (charCodeAt(string, i * 64 + j * 4) << 24) |
                        (charCodeAt(string, i * 64 + j * 4 + 1) << 16) |
                        (charCodeAt(string, i * 64 + j * 4 + 2) << 8) |
                        (charCodeAt(string, i * 64 + j * 4 + 3));
            }

            M[N - 1][14] = floor(l2 / pow(2, 32));
            M[N - 1][15] = l2 & max;

            for(i = 0; i < N; i++) {

                for(j = 16; j--;)
                    W[j] = M[i][j];

                for(j = 16; j < 80; j++)
                    W[j] = rotateLeft(W[j - 3] ^ W[j - 8] ^ W[j - 14] ^ W[j - 16], 1);

                for(j = 5; j--;)
                    w[j] = H[j];

                for(j = 0; j < 80; j++) {
                    s = floor(j / 20);
                    T = (rotateLeft(w[0], 5) + (
                        (s === 0) ? (w[1] & w[2]) ^ (~w[1] & w[3]) :
                        (s === 2) ? (w[1] & w[2]) ^ (w[1] & w[3]) ^ (w[2] & w[3]) :
                        w[1] ^ w[2] ^ w[3]
                    ) + w[4] + sha1Matrix[s] + W[j]) & max;
                    w[4] = w[3];
                    w[3] = w[2];
                    w[2] = rotateLeft(w[1], 30);
                    w[1] = w[0];
                    w[0] = T;
                }

                for(j = 5; j--;)
                    H[j] = add(H[j], w[j]);
            }

            for(j = 0; j < 5; j++)
                for(i = 3; i >= 0; i--)
                    ret += fromCharCode((H[j] >>> (i * 8)) & 255);

            return raw ? ret : base16(ret);

        },

        md5 : function(string, raw) {

            var words = stringToWords(string + fromCharCode(128), true),
                stringLength = string.length,
                quadrants = stringToWords(startingPoint),
                accumulator = [], quarter, k, ret='',
                q = [], i, j, length = words.length;

            if(!(length % 16))
                words.push(0);

            while((length = words.length) % 16)
                words.push(0);

            words[length - 2] = stringLength << 3;
            words[length - 1] = stringLength >>> 29;

            for(k = 0; k < length; k += 16) {

                for(i = 4; i--;)
                    accumulator[i] = quadrants[i];

                for(quarter = 0; quarter < 4; quarter++)
                    for(i = 0; i < 16; i++) {
                        for(j = 4; j--;)
                            q[j] = quadrants[(16 + j - i) % 4];
                        quadrants[(16 - i) % 4] = add(
                            rotateLeft(
                                add(
                                    q[0],
                                    add(
                                        add(
                                            quarter === 3 ?  q[2] ^ (q[1]  |  ~q[3])         :
                                            quarter === 2 ?  q[1] ^  q[2]  ^   q[3]          :
                                            quarter       ? (q[1] &  q[3]) | ( q[2] & ~q[3]) :
                                                            (q[1] &  q[2]) | (~q[1] & q[3]),
                                            words[k + (md5Extra[quarter][0] + md5Extra[quarter][1] * (i % 16)) % 16]
                                            ),
                                        md5Matrix[quarter * 16 + i]
                                        )
                                    ),
                                md5Offsets[quarter][i % 4]
                                ),
                            q[1]
                        );
                    }
                i = 4;
                while(i--)
                    quadrants[i] = add(quadrants[i], accumulator[i]);
            }

            for(i = 0; i < 4; i++)
                ret += longToString(quadrants[i]);

            return raw ? ret : base16(ret);
        }

    };


})()