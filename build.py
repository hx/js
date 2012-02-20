#! /usr/bin/python

from glob import glob
from os import system

__author__ = "Neil E. Pearson"
__date__ = "$15/12/2011 8:35:00 PM$"

license = """

Hx JavaScript Library v 0.1
Written by Neil E. Pearson

Copyright 2012 Helium Studios

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

"""

targetFileName = 'hx'

sourceDir = 'src'



###################

license = "/**\n * @license\n * " + license.strip().replace("\n", "\n * ") + "\n * \n **/"

head = """

(function(window, prop) {

var nothing = {},
    noConflict,
    oldHx = prop in window
        ? window[prop]
        : nothing,
    hx;

window[prop] = hx = {
    
    noConflict : function() {
    
        if(!noConflict) {            
    
            if(oldHx === nothing)
                try {
                    delete window[prop];
                } catch(e) {
                    window[prop] = oldHx;
                }
            else
                window[prop] = oldHx;

            noConflict = true;
            
        }
        
        return hx;
    
    }
    
};

"""

tail = """

})(this, 'hx')

"""

if __name__ == '__main__':
    
    outFile = open(targetFileName + '.js', 'w')
    
    print "Writing license and head"
    outFile.write(license + head)
    
    for fileName in glob(sourceDir + "/*.js"):
        
        print "Writing module [ %s ]" % fileName[3:-3] 
        inFile = open(fileName, 'r')
        outFile.write("\n\n;" + inFile.read())
        inFile.close()
        
    print "Writing tail"
    outFile.write(tail)
    outFile.close()
    
    print "Minifying"
    system("java -jar compiler.jar --js %s.js --charset UTF-8 > %s.min.js" 
        % (targetFileName, targetFileName))
        
    print "Compressing"
    system("gzip -9c %s.min.js > %s.min.js.gz"
        % (targetFileName, targetFileName))
    
    print "Done"
        