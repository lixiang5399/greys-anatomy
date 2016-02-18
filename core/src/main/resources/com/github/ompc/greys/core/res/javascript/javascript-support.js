/**
 * 全局配置对象
 * @type {{factory_mapping: {}, path_mapping: {}, config: __greys_requirejs.config}}
 * @private
 */
__greys_requirejs = this.__greys_requirejs || {

        util: function () {

            // 导入相关包
            var File = java.io.File;
            var FileInputStream = java.io.FileInputStream;
            var InputStream = java.io.InputStream;
            var OutputStream = java.io.OutputStream;
            var URL = java.net.URL;
            var Charset = java.nio.charset.Charset;
            var Scanner = java.util.Scanner;

            /**
             * 打开输入流
             * @param path 资源路径
             * @return 资源输入流
             */
            function openStream(path) {

                // 路径是字符串
                if (typeof(path) == "string") {

                    // HTTP/HTTPS
                    if (/^(https{0,1}):\/\/.*/.test(path.toLowerCase())) {
                        return new URL(path).openStream();
                    }

                    // 其他情况当本地文件处理
                    else {
                        return new FileInputStream(new File(path));
                    }
                }

                // 路径是输入流
                else if (path instanceof InputStream) {
                    return path;
                }

                // 输入路径是URL
                else if (path instanceof URL) {
                    return str.openStream();
                }

                // 输入路径是文件
                else if (path instanceof File) {
                    return new FileInputStream(path);
                }

                // 其他情况返回null
                else {
                    return null;
                }

            }

            /**
             * 关闭
             * @param stream 流
             */
            function close(stream) {

                if (!stream) {
                    return;
                }

                if (stream instanceof InputStream
                    || stream instanceof OutputStream
                    || stream instanceof Scanner) {
                    try {
                        stream.close();
                    } catch (e) {
                        //
                    }
                }

            }

            /**
             * 获取文本内容
             * @param path      资源路径
             * @param charset   字符编码
             * @return 文本内容
             */
            function readTextFully(path, charset) {

                var input = openStream(path);

                // 修正charset
                charset = (charset && Charset.isSupported(charset))
                    ? charset
                    : Charset.defaultCharset().name();

                var scanner = new Scanner(input, charset);
                try {
                    var content = "";
                    while (scanner.hasNextLine()) {
                        content += scanner.nextLine() + "\n";
                    }
                    return content;
                } catch (e) {
                    throw e;
                } finally {
                    close(scanner);
                }

            }

            return {
                readTextFully: readTextFully
            }
        }(),

        // ID:模块映射
        module_mapping: {},

        // ID:路径映射
        path_mapping: {},

        // 配置
        config: function (cfg) {
            if (!cfg || !cfg.paths) {
                return;
            }
            for (var prop in cfg.paths) {
                this.path_mapping[prop] = cfg.paths[prop];
            }
        }

    }

/**
 * 加载远程资源函数
 * require(id)
 * require(dependencies,function)
 * @type {Function}
 * @private
 */
__greys_require = this.__greys_require || function () {

        /**
         * 获取&加载模块
         * @param id  ID
         * @returns 模块单例
         */
        function getOrLoadModuleIfNecessary(id) {
            var module = __greys_requirejs.module_mapping[id];
            if (!module) {
                var path = __greys_requirejs.path_mapping[id];
                if (path) {
                    // 这里不需要判断Function的返回值,我们期望模块的注册交给define函数完成
                    new Function(__greys_requirejs.util.readTextFully(path))();
                    // 因为define函数中应该完成了模块的注册,所以这里直接取一次
                    module = __greys_requirejs.module_mapping[id];
                }
            }
            return module;
        }

        // require(id)
        if (arguments.length == 1
            && typeof(arguments[0]) == 'string') {

            var id = arguments[0];
            var module = __greys_requirejs.module_mapping[id];
            if (!module) {
                module = getOrLoadModuleIfNecessary(id);
            }

            return module;

        }

        // require(config)
        else if (arguments.length == 1
            && typeof(arguments[0]) == 'object') {
            var config = arguments[0];
            __greys_requirejs.config(config);
            return this;
        }

        // require(dependencies, func)
        else if (arguments.length == 2
            && arguments[0] instanceof Array
            && arguments[1] instanceof Function) {
            var dependencies = arguments[0];
            var func = arguments[1];

            if (dependencies
                && func) {
                var funcArguments = [];
                for (var index in dependencies) {
                    var id = dependencies[index];
                    if (typeof(id) == 'string') {
                        funcArguments[index] = getOrLoadModuleIfNecessary(id);
                    } else {
                        funcArguments[index] = null;
                    }
                }
                func.apply(this, funcArguments);
            }

            return this;
        }

        return this;
    }

/**
 * 模块定义函数
 * define(id,dependencies,factory)
 * define(dependencies,factory)
 * define(factory)
 * @type {Function}
 * @private
 */
__greys_define = this.__greys_define || function () {

        var default_dependencies = [];

        // define(factory)
        if (arguments.length == 1
            && arguments[0] instanceof Function) {
            return this.__greys_define("", default_dependencies, arguments[0]);
        }

        // define(dependencies,factory)
        else if (arguments.length == 2
            && arguments[0] instanceof Array
            && arguments[1] instanceof Function) {
            return this.__greys_define("", arguments[0], arguments[1]);
        }

        // define(id,factory)
        else if (arguments.length == 2
            && typeof(arguments[0]) == 'string'
            && arguments[1] instanceof Function) {
            return this.__greys_define(arguments[0], default_dependencies, arguments[1]);
        }

        // define(id,dependencies,factory)
        else if (arguments.length == 3
            && typeof(arguments[0]) == 'string'
            && arguments[1] instanceof Array
            && arguments[2] instanceof Function) {

            var id = arguments[0];
            var dependencies = arguments[1];
            var factory = arguments[2];

            var module = null;
            __greys_require(dependencies, function () {

                // 构造模块
                module = factory.apply(this, arguments);

                // 模块定义声明了id,需要主动注册到模块集合中
                if (id.length != 0) {
                    __greys_requirejs.module_mapping[id] = module;
                }

            });

            return module;

        }

        // define()
        else {
            return;
        }

    }


/**
 * 加载JS资源
 * @type {Function}
 */
__greys_load = this.__greys_load || function () {

        // load(path)
        if (arguments.length == 1) {
            this.__greys_load(arguments[0], null);
        }

        // load(path,charset)
        else if (arguments.length == 2) {
            var path = arguments[0];
            var charset = arguments[1];
            eval(__greys_requirejs.util.readTextFully(path, charset));
        }

        // none
        else {
            return;
        }

    }


// 初始化load函数
load = this.load || this.__greys_load;


// 初始化require
if (!this.hasOwnProperty('require')
    && !this.hasOwnProperty('define')) {
    this.require = __greys_require;
    this.define = __greys_define;
}