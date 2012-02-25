hx.Colour = hx.Color = (function(){

    var extend = hx.utils.extend,
        slice = Array.prototype.slice,

        constrain = function(val, min, max) {
            return Math.max(Math.min(parseFloat(val), max), min);
        },

        rgbChannels = {red : 0, green : 0, blue : 0},

        hsl2rgb = function(h, s, l) {

            s = constrain(s, 0, 1);
            l = constrain(l, 0, 1);

            if(!s)
                return [s = Math.round(l * 255), s, s];

            while(h < 0)
                h += 360;

            h %= 360;

            var ret, i = 3, x;

            switch(Math.floor(h / 60)) {
                case 0: ret = [255, h / 60 * 256, 0];               break;
                case 1: ret = [(1 - (h - 60) / 60) * 256, 255, 0];  break;
                case 2: ret = [0, 255, (h - 120) / 60 * 256];       break;
                case 3: ret = [0, (1 - (h - 180) / 60) * 256, 255]; break;
                case 4: ret = [(h - 240) / 60 * 256, 0, 255];       break;
                case 5: ret = [255, 0, (1 - (h - 300) / 60) * 256];
            }

            while(i--) {
                x = ret[i];
                x += (1 - s) * (127 - x);
                x = l < .5
                    ? l * 2 * x
                    : l * 2 * (255 - x) + 2 * x - 255;
                ret[i] = constrain(x, 0, 255);
            }

            return ret;

        },

        rgb2hsl = function(r, g, b) {

            var max = Math.max(r, g, b),
                min = Math.min(r, g, b),
                del = max - min,
                l = (max + min) / 510,
                ret = [0, 0, l], h;

            r = constrain(r, 0, 255);
            g = constrain(g, 0, 255);
            b = constrain(b, 0, 255);

            if(del) {

                if(l % 1)
                    ret[1] = del / (l < .5 ? max + min : 510 - max - min);

                switch(max) {
                    case r:     h =     (g - b) / del;  break;
                    case g:     h = 2 + (b - r) / del;  break;
                    default:    h = 4 + (r - g) / del;
                }

                h *= 60;

                while(h < 0)
                    h += 360;

                ret[0] = h % 360;

            }

            return ret;

        },

        rgbaMethod = function(channel, limit) {

            var isAlpha = channel === 'a';

            return function(val, offset) {

                var _ = this._,
                    ret = _[channel],
                    hsl;

                if(val != null) {

                    if(typeof val == 'string') {

                        if(val.match(/%$/))
                            val = parseFloat(val) / 100 * limit;

                        else
                            val = parseFloat(val);
                    }

                    _[channel] = constrain(val + (offset ? ret : 0), 0, limit);

                    if(!isAlpha) {
                        hsl = rgb2hsl(_.r, _.g, _.b);
                        if((_.l = hsl[2]) % 1)
                            if(_.s = hsl[1])
                                _.h = hsl[0]
                    }

                    return this;

                }

                return !isAlpha ? Math.round(ret) : ret;

            }
        },

        hslMethod = function(property, limit) {

            return function(val, offset) {

                var t = this,
                    _ = t._,
                    ret = _[property];

                if(val != null) {

                    if(typeof val == 'string') {

                        if(val.match(/%$/))
                            val = parseFloat(val) / 100 * limit;

                        else
                            val = parseFloat(val);
                    }

                    if(offset)
                        val += ret;

                    if(limit == 360) {
                        while(val < 0)
                            val += 360;
                        val %= 360;
                    } else
                        val = constrain(val, 0, limit);

                    return t.rgb(hsl2rgb(
                        property == 'h' ? val : _.h,
                        property == 's' ? val : _.s,
                        property == 'l' ? val : _.l
                    ));

                }

                return ret;

            }

        },

        Gradient = extend(function(definition) {

            if(!(this instanceof Gradient))
                return new Gradient(definition);

            this.stops = [];
            this.from = 'top';

            if(definition) {

                var t = this,

                // can't use regular split() because of commas in rgb() type colour
                // defs, so have to go the long way.

                    parts = [''],
                    i = 0, x = 0,
                    l = definition.length,
                    chr, brackets = 0;

                for(; i < l; ++i) {

                    switch(chr = definition.substr(i, 1)) {

                        case '(':
                            ++brackets;
                            break;

                        case ')':
                            --brackets
                            break;

                        case !brackets && ',':
                            parts[x] = parts[x].replace(/^\s+|\s+$/g, '');
                            parts[++x] = '';
                            continue;
                    }

                    parts[x] += chr;
                }

                for(i = 0, l = parts.length; i < l; ++i)
                    if(parts[i].match(/^(top|bottom|left|right)$/i))
                        t.from = parts[i].toLowerCase();
                    else if(x = parts[i].match(/^\s*(.*?)\s+(\d+)%?\s*$/))
                        t.addStop(x[1], parseInt(x[2]) / 100);

            }

        }, {

            prototype : {

                addStop : function(colour, position) {

                    var stops = this.stops;

                    stops.push(extend((colour instanceof Colour) ? colour : Colour(colour), {position: position}));

                    stops.sort(gradientStopComparer);

                    return this;

                },

                hasAlpha : function() {

                    var stops = this.stops,
                        i = stops.length;

                    while(i--)
                        if(stops[i].alpha() != 1)
                            return true;

                }
            }

        }),

        screen = function(a, b) {
            return 1 - (1 - a) * (1 - b);
        },

        multiply = function(a, b) {
            return a * b;
        },

        overlay = function(a, b) {
            return a > .5
                ? screen(a, 2 * b - 1)
                : multiply(a, 2 * b);
        },

        Colour = extend(function(original) {

            if(!(this instanceof Colour))
                return new Colour(original);

            this._ = {
                r: 0, // red
                g: 0, // green
                b: 0, // blue
                a: 1, // alpha
                h: 0, // hue
                s: 1, // sat
                l: 0  // lum
            };

            this.set.apply(this, arguments);

        }, {

            prototype : {

                set : function() {

                    var t = this,
                        argv = slice.call(arguments),
                        m;

                    if(argv.length > 1)
                        return t.rgb.apply(t, argv);

                    argv = argv[0];

                    if(argv instanceof Colour)
                        for(m in argv._)
                            t._[m] = argv._[m];

                    else if(typeof argv === 'string') {

                        if(m = argv.match(/^\s*#?([\da-f]{3,8})\s*$/))
                            return t[m[1].length <= 6 ? 'hex' : 'hexa'](m[1]);

                        if(m = argv.match(/^\s*(rgba?|hsla?)\s*\(\s*(.*?)\s*\)\s*$/i))
                            return t[m[1].toLowerCase()](m[2].split(/\s*,\s*/));

                    }

                    else if(argv instanceof Array)
                        t.set.apply(t, argv);

                    return t;

                },

                hex : function(val, allowTransparent) {
                    var t = this;
                    if(typeof val === 'string') {
                        val = parseInt(val.replace(/[^\da-f]/ig, '').replace(/^(.)(.)(.)$/, '$1$1$2$2$3$3'), 16);
                        return t
                            .red(val >> 16 & 255)
                            .green(val >> 8 & 255)
                            .blue(val & 255)
                            .alpha((val >> 24 & 255) / 255 || (allowTransparent ? 0 : 1));
                    }
                    return (val === false ? '' : '#')
                        + byte2hex(t.red())
                        + byte2hex(t.green())
                        + byte2hex(t.blue());
                },

                hexa : function(val) {
                    var t = this,
                        a = t.alpha();
                    if(typeof val === 'string')
                        return t.hex(val, true);
                    return (val === false ? '' : '#')
                        + (a < 1 ? byte2hex(a * 255) : '')
                        + t.hex(false)
                },

                hue : hslMethod('h', 360),

                sat : hslMethod('s', 1),

                lum : hslMethod('l', 1),

                red : rgbaMethod('r', 255),

                green : rgbaMethod('g', 255),

                blue : rgbaMethod('b', 255),

                alpha : rgbaMethod('a', 1),

                toString : function(format) {

                    var t = this,
                        parts;

                    switch(format = (format || 'hex').toLowerCase()) {

                        case 'hex':
                        case 'hexa':
                            return t[format]();

                        case 'rgb':
                        case 'rgba':
                        case 'hsl':
                        case 'hsla':
                            parts = t[format]();
                            if(format.substr(0, 1) === 'h') {
                                parts[1] = Math.round(parts[1] * 100) + '%';
                                parts[2] = Math.round(parts[2] * 100) + '%';
                            }
                            if(parts[3])
                                parts[3] = Math.round(parts[3] * 100) / 100;

                            return format + '(' + parts.join(',') + ')';

                        default:
                            return '';
                    }

                },

                blend : function(source, opacity, blendingMethod) {

                    if(!(source instanceof Colour))
                        source = new Colour(source);

                    if(opacity == null)
                        opacity = 1;

                    var t = this,
                        alpha = t.alpha(),
                        sourceAlpha = source.alpha() * constrain(opacity, 0, 1),
                        resultAlpha,
                        channel,
                        sourceChannel,
                        i;

                    t.alpha(resultAlpha = sourceAlpha + alpha * (1 - sourceAlpha));

                    for(i in rgbChannels) {

                        channel = t[i]() / 255;
                        sourceChannel = source[i]() / 255;

                        if(blendingMethod)
                            sourceChannel = blendingMethod(channel, sourceChannel);

                        t[i](255 * (sourceChannel * sourceAlpha + channel * alpha * (1 - sourceAlpha)) / resultAlpha);

                    }

                    return t;

                },

                shade : function(amount) {

                    var t = this,
                        white = Colour('fff'),
                        black = Colour('000'),
                        opacity = Math.abs(amount);

                    return Gradient()
                        .addStop(t.duplicate().blend(amount > 0 ? black : white, opacity, overlay), 0)
                        .addStop(t.duplicate(), .5)
                        .addStop(t.duplicate().blend(amount < 0 ? black : white, opacity, overlay), 1);

                },

                duplicate : function() {
                    return new Colour(this);
                }

            },

            blendingMethods : {

                darken : Math.min,

                lighten : Math.max,

                screen : screen,

                multiply : multiply,

                overlay : overlay,

                hardLight : function(a, b) { return overlay(b, a) },

                softLight : function(a, b) {
                    return b > .5
                        ? a + (2 * b - 1) * ((a > .25
                            ? Math.sqrt(a)
                            : ((16 * a - 12) * a + 4) * a
                        ) - a)
                        : a - (1 - 2 * b) * a * (1 - a)
                },

                difference : function(a, b) { return Math.abs(a - b) },

                exclusion : function(a, b) { return a + b - 2 * a * b },

                linearDodge : function(a, b) { return a + b },

                linearBurn : function(a, b) { return a + b - 1 },

                linearLight : function(a, b) { return a + 2 * b - 1 },

                colorBurn : function(a, b) {
                    return !(a % 1)
                        ? a
                        : b > 0
                            ? 1 - Math.min(1, (1 - a) / b)
                            : b;
                },

                colorDodge : function(a, b) {
                    return !(a % 1)
                        ? a
                        : b < 1
                            ? a / (1 - b)
                            : b;
                }

            },

            Gradient : Gradient

        }),

        addCompoundMethods = function(methods) {

            methods = methods.split(',');

            var name = '', nameA,
                i = 0, l = methods.length,
                prototype = Colour.prototype;

            for(; i < l; ++i)
                name += methods[i].substr(0, 1);

            nameA = name + 'a';

            prototype[nameA] = function() {

                var t = this,
                    ret, i;

                if(arguments.length)
                    return t[name].apply(t, arguments);

                for(ret = [], i = 0; i < l; ++i)
                    ret.push(t[methods[i]]());

                ret.push(t.alpha());

                return ret;

            };

            prototype[name] = function() {

                var t = this, i = l,
                    argv = slice.call(arguments),
                    argc = argv.length;

                if(argc) {

                    if(argv[0] instanceof Array)
                        return t[name].apply(t, argv[0]);

                    if(argc >= l) {
                        while(i--)
                            t[methods[i]](argv[i]);

                        t.alpha(argc > l ? argv[l] : 1)
                    }

                    return t;
                }

                return t[nameA]().slice(0, l);
            }


        },

        byte2hex = function(val) {
            return Math.round(val | 0x100).toString(16).substr(1);
        },

        gradientStopComparer = function(a, b) {
            return a.position - b.position;
        };

    addCompoundMethods('red,green,blue');
    addCompoundMethods('hue,sat,lum');

    return Colour;

})();