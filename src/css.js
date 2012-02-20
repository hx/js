hx.StyleSheet = (function(){
    
    var declarationPattern = /^\s*((?:-?[a-z])+)\s*:\s*(.*?)\s*(!important)?\s*;?\s*$/i,
        ruleSetSplitPattern = /}\s*/,
        ruleSetPattern = /^\s*(.*?)\s*\{\s*(.*?)\s*$/,
        selectorSplitPattern = /\s*,\s*/,
        commentPattern = /\/\*[\s\S]*?\*\//g,
        collapseWhiteSpacePattern = /\s+/g,
        declarationSplitPattern = /\s*;(?!\w+,)\s*/, // lookahead is to protect dataurls,
		colourReplacePattern = /#[\da-f]{3,8}|(rgb|hsl)(a)?\(.*?\)/ig,
		emptyString = '',
        space = ' ',
        comma = ',',
		hyphen = '-',
		
		left = 'left',
		top = 'top',
		right = 'right',
		bottom = 'bottom',
		
		linearGradientPattern = /^linear-gradient\((.*)\)$/,
		
        msie, moz, opera, webkit, chrome, safari, //firefox,
		version, match,
		userAgent = navigator.userAgent,
		webkitLegacyGradients,
		
		extend = hx.utils.extend,
		doc = document,

		Colour = hx.Color,
		
		StyleSheet = function(source) {
			
			var t = this;
			
			if(!(t instanceof StyleSheet))
				return new StyleSheet(source);
			
			t.ruleSets = [];
			
			if(typeof source === 'string')
				parse.call(this, source);
			
			else if(typeof source === 'object') {
				t.sheet = source;
				parse.call(this, getCssText(source));
			}
				
		},

		getCssText = function(object) {
			return object && object.innerHTML || (object.ownerNode && object.ownerNode.innerHTML) || object.cssText || emptyString;
		},
		
		Declaration = function(declarationString) {
            
            var parts = declarationString.match(declarationPattern),
                t = this;
                
            t.property = parts[1];
            t.value = parts[2];
            if(parts[3])
				t.important = true;
            
        },
        
        RuleSet = function(ruleSetString) {
            
            var t = this,
                parts = ruleSetString.match(ruleSetPattern),
                selectors = (parts[1] || emptyString).split(selectorSplitPattern),
                declarations = [],
                declarationStrings = (parts[2] || emptyString).split(declarationSplitPattern),
                l = declarationStrings.length, i, s;
				
			for(i = 0; i < l; ++i)
				if(s = declarationStrings[i])
					declarations.push(new Declaration(s));
                
            t.selectors = selectors;
            t.declarations = declarations;
            
        },
        
        parse = function(styleSheetString, insertBefore) {
            
            var ruleSets = styleSheetString
                    .replace(commentPattern, emptyString)
                    .replace(collapseWhiteSpacePattern, space)
					.split(ruleSetSplitPattern),
                l = ruleSets.length, i, r,
                newSet = insertBefore ? [] : insertBefore,
                rules = this.ruleSets;
                
            for(i = 0; i < l; ++i)
				if(r = ruleSets[i])
					(newSet || rules).push(new RuleSet(r));
            
            if(newSet)
                newSet.push.apply(this.ruleSet = newSet, rules);
            
            return this;
            
        },
		
		gradientToCss = function(gradient) {
		
			var stops = gradient.stops,
				lastStop = stops.length - 1,
				prefix = moz || webkit || msie || opera,
				from = gradient.from,
				backwards = (from === bottom || from === right),
				i = 0, l = stops.length,
                stopString = [], colour, position,
				format = gradient.hasAlpha() ? 'rgba' : 'hex';
				
			for(; i < l; ++i) {
				colour = stops[i].toString(format);
				position = Math.round(stops[i].position * 100) + '%';
				stopString.push(webkitLegacyGradients
					? 'color-stop(' + position + comma + colour + ')'
					: colour + space + position
				);
			}
			
			stopString = ( webkitLegacyGradients
				?	(from === right ? right : left) +
					space +
					(from === bottom ? bottom : top) +
					comma +
					(from === left ? left : right) +
					space +
					(from === top ? bottom : top)
				
				: from
			) + comma + stopString.join(comma);
			
            if(msie) {
				if(version < 9) {
					return "progid:DXImageTransform.Microsoft.gradient(startColorstr='" +
						stops[backwards ? lastStop : 0].hexa() + "',endColorstr='" +
						stops[backwards ? 0 : lastStop].hexa() + "',GradientType=" +
						((from === left || from === right) ? 1 : 0) + ')';
				}
                else if(version == 9)
					return 'url(data:image/svg+xml,'
						+ escape(gradientToSvg(gradient)) + ')';
				
            }
			
			if(webkitLegacyGradients)
				return '-webkit-gradient(linear,' + stopString + ')';
			
			return (prefix ? hyphen + prefix + hyphen : emptyString) +
				'linear-gradient(' + stopString + ')';
		
		},
		
		gradientToSvg = function(gradient) {
			
			var stops = gradient.stops,
                from = gradient.from,
                i, l = stops.length,
                ret = '<?xml version="1.0" ?>' +
					'<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none">' +
					'<linearGradient id="a" gradientUnits="userSpaceOnUse"',
				coords = {
					x1: from === right ? 1 : 0,
					y1: from === bottom ? 1 : 0,
					x2: from === left ? 1 : 0,
					y2: from === top ? 1 : 0
				}, i, stop;
				
			for(i in coords)
				ret += space + i + '="' + (coords[i] * 100) + '%"';
			
			ret += '>';
			
			for(i = 0; i < l; ++i) {
				stop = stops[i];
				ret += '<stop offset="' + Math.round(stop.position * 100) + '%" stop-color="' +
					stop.hex() + '" stop-opacity="' + stop.alpha() + '"/>';
			}
			
			return ret + '</linearGradient><rect x="0" y="0" width="1" height="1" fill="url(#a)" /></svg>'
			
		},
        
        adjustDeclarations = function(callback) {
            
            var ruleSets = this.ruleSets,
				declarations,
				i, l, k, d;
                
            for(i = 0, l = ruleSets.length; i < l; ++i) {
				declarations = ruleSets[i].declarations;
				for(k = declarations.length; k--;) {
					d = declarations[k];
					callback.call(d, d.property, d.value)
				}

			}

			return this;
            
        },

		adjustColours = function(callback) {
            
            adjustUserCallback = callback;
            return adjustDeclarations.call(this, function(undefined, value){
                this.value = value.replace(colourReplacePattern, adjustColoursReplaceCallback);
            });
            
		},
        
        adjustColoursReplaceCallback = function(original, method, alpha) {
            
            var colour = Colour(original);
            adjustUserCallback.call(adjustDeclaration, colour);
            return colour.toString(method ? method + alpha : colour.alpha() !== 1 ? 'hexa' : 'hex');
            
        },
        
        adjustUrlsCallback = function(property, value) {
            
            this.value = value.replace(/url\((?!=\w+\/\w+;)([^)]?)/, adjustUrlsReplaceCallback);
            
        },
        
        adjustUrlsReplaceCallback = function(undefined, url) {
            
            return 'url(' + adjustUserCallback(url);
            
        },
        
        adjustUserCallback,
        adjustDeclaration;
	
	StyleSheet.prototype = {
		
		backfit : function() {
            
            var t = this,
				ruleSets = t.ruleSets,
				i = ruleSets.length;
				
			while(i--)
				ruleSets[i].backfit();
			
			return t;
            
        },
		
		toString : function() {
			
			var ret = emptyString,
				ruleSets = this.ruleSets,
				i = 0, l = ruleSets.length;
			
			for(;i < l; ++i)
				ret += ruleSets[i].toString();
			
			return ret;
			
		},
		
		apply : function(sheet, position) {
			
			var t = this,
				output = '',
				cssText = 'cssText';
				
			position = position || 0;
			
			if(sheet)
				t.sheet = (sheet.rules || sheet.cssRules)
					? sheet
					: sheet.sheet || sheet.styleSheet;
			else
				sheet = t.sheet;
			
			if(!sheet) {
				
				doc.getElementsByTagName('head')[0]
					.appendChild(sheet = doc.createElement('style'));
				
				t.sheet = sheet = sheet.sheet || sheet.styleSheet;
				
			}
			
			if(position)
				output = getCssText(sheet);
			
			output = (position > 0 ? output : '') + t.toString() + (position < 0 ? output : '');
			
			if(cssText in sheet)
				sheet[cssText] = output;

			else if(sheet.styleSheet)
				sheet.styleSheet[cssText] = output;

			else if(sheet.sheet)
				sheet.innerHTML = output;

			else
				sheet.ownerNode.innerHTML = output;
			
			return t;
			
		},
        
        append : parse,
        
        prepend : function(source) {
            
            return parse.call(this, source, true);
            
        },

		adjustColours : adjustColours,
		adjustColors : adjustColours,
        
        adjustDeclarations : adjustDeclarations,
        
        adjustUrls : function(callback) {
            
            adjustUserCallback = callback;
            return adjustDeclarations.call(this, adjustUrlsCallback);
            
        }
		
	};

    Declaration.prototype = {
		
        toString : function() {
            var t = this;
            return t.property + ':' + t.value + (t.important ? '!important' : '') + ';';
        },
		
		backfit : function() {
			
			var t = this,
				property = (t.property || emptyString).toLowerCase(),
				value = t.value;
			
			if(property && value) {
				
				// linear gradient backgrounds
				
				if(property === 'background' && (match = value.match(linearGradientPattern))) {

					value = gradientToCss(Colour.Gradient(match[1]));

					if(msie && version <= 8)
						property = 'filter';

				}
				
				// border radii

				else if(match = property.match(/^(border)(?:-(\w+)-(\w+))?(-radius)/)) {
					
					if(webkit)
						property = hyphen + webkit + hyphen + property;
					
					else if(moz)
						property = hyphen + moz + hyphen + match[1] + match[4] +
						(match[2] ? hyphen + match[2] + match[3] : emptyString);
					
				}
				
				// box shadows
				
				else if(property === 'box-shadow' && (match = moz || webkit))
					
					property = hyphen + match + hyphen + property;

				// opacity

				else if(property === 'opacity' && msie && version < 9) {

					property = 'filter';
					value = 'alpha(opacity=' + (parseFloat(value || 0) * 100) + ')';

					/**
					 * @todo support multiple filters
					 */
				}

				t.property = property;
				t.value = value;
				
			}

			return t;
			
		}
		
    };
    
    RuleSet.prototype = {
        
		selector : function() {
            return this.selectors.join(comma);
        },
        
		append : function(other) {
            var declarations = this.declarations;
            declarations.splice(declarations.length, 0, other.declarations);
        },
		
		toString : function() {
			
			var t = this,
				declarations = t.declarations,
				i = 0, l = declarations.length,
				ret = t.selector() + '{';
				
			for(; i < l; ++i)
				ret += declarations[i].toString();
			
			return ret + '}';
			
		},
		
		backfit : function() {
			
			var declarations = this.declarations,
				i = declarations.length;
				
			while(i--)
				declarations[i].backfit();
			
			return this;
			
		}
    };
    
    if(match = userAgent.match(/MSIE (\d+\.?\d*)/))
		msie = 'ms';

	else if(match = userAgent.match(/(?:Chrome|Safari)\/(\d+\.?\d*)/)) {
		webkit = 'webkit';
		chrome = !!userAgent.match(/Chrome/);
		safari = !!userAgent.match(/Safari/);
	}
	
	else if(match = userAgent.match(/Opera\/(\d+\.?\d*)/))
		opera = 'o';
	
	else if(match = userAgent.match(/Firefox\/(\d+\.?\d*)/) || userAgent.match(/Mozilla\/(\d+\.?\d*)/)) {
		moz = 'moz';
//		firefox = !!userAgent.match(/Firefox/);
	}
	
	if(match)
		version = parseFloat(match[1]);
		
	if(match = userAgent.match(/Version\/(\d+\.?\d*)/))
		version = parseFloat(match[1]);
	
	webkitLegacyGradients = (chrome && version < 10) || (safari && version < 5.1);

	return extend(StyleSheet, {
		RuleSet: RuleSet,
		Declaration: Declaration
	});
    
})();