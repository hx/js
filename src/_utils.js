hx.utils = (function(){

    return {

        extend : function(main) {

            var i = 1, j,
                argv = arguments,
                argc = argv.length;

            for(; i < argc; ++i)
                for(j in argv[i])
                    main[j] = argv[i][j];

            return main;

        }

    }

})()