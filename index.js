'use strict';

let ming = {};
let faux_fin = { end: () => null };

function isScalar(v) {
    return typeof v !== 'object' && !Array.isArray(v);
}

ming.onError = (err, req, res) => {
    res
        .status(500)
        .set('content-language', 'en')
        .json({ message: err.message })
        .end();
    return res;
};

ming.json = function json (fn, options) {
    return function (req, res, next) {
        let original = res.json;
        options = options || {};
        let mingError = options.mingError;

        function json_hook (json, jsonWithStatusCode) {
            if(jsonWithStatusCode) {
                res.statusCode = json;
                json = jsonWithStatusCode;
            }

            let originalJson = json;
            res.json = original;
            if (res.headersSent)
                return res;
            if (!mingError && res.statusCode >= 400)
                return original.call(this, json);

            // Run the minger
            try {
                json = fn(json, req, res);
            } catch (e) {
                return ming.onError(e, req, res);
            }
            if (res.headersSent)
                return res;

            // If no returned value from fn, then assume json has been mucked with.
            if (json === undefined)
                json = originalJson;

            // If null, then 204 No Content
            if (json === null)
                return res.status(204).end();

            // If scalar value, then text/plain
            if (isScalar(json)) {
                res.set('content-type', 'text/plain');
                return res.send(json);
            }

            return original.call(this, json);
        }
        res.json = json_hook;

        next && next();
    }
}

ming.jsonAsync = function json (fn, options) {
    return function (req, res, next) {
        let original = res.json;
        options = options || {};
        let mingError = options.mingError;

        function json_async_hook (json, jsonWithStatusCode) {
            if(jsonWithStatusCode) {
                res.statusCode = json;
                json = jsonWithStatusCode;
            }

            res.json = original;
            if (res.headersSent)
                return;
            if (!mingError && res.statusCode >= 400)
                return original.call(this, json);
            try {
                fn(json, req, res)
                .then(json => {
                    if (res.headersSent)
                        return;

                    // If null, then 204 No Content
                    if (json === null)
                        return res.status(204).end();

                    // If scalar value, then text/plain
                    if (isScalar(json)) {
                        res.set('content-type', 'text/plain');
                        return res.send(json);
                    }

                    return original.call(this, json);
                })
                .catch(e => ming.onError(e, req, res));
            } catch (e) {
                ming.onError(e, req, res);
            }

            return faux_fin;
        }
        res.json = json_async_hook;

        next && next();
    }
}

ming.headers = function headers (fn) {
    return function (req, res, next) {
        let original = res.end;
        function headers_hook () {
            res.end = original;
            if (!res.headersSent) {
                try {
                    fn(req, res);
                } catch (e) {
                    return ming.onError(e, req, res);
                }
                if (res.headersSent) {
                    console.error('sending response while in ming.headers is undefined behaviour');
                    return;
                }
            }
            return original.apply(this, arguments);
        }
        res.end = headers_hook;

        next && next();
    }
}

ming.headersAsync = function headersAsync (fn) {
    return function (req, res, next) {
        let original = res.end;
        let onError = e => {
            res.end = original;
            return ming.onError(e, req, res);
        };
        function headers_async_hook () {
            if (res.headersSent)
                return original.apply(this, args);
            let args = arguments;
            res.end = () => null;
            try {
                fn(req, res)
                .then(() => {
                    res.end = original;
                    if (res.headersSent)
                        return;
                    original.apply(this, args);
                })
                .catch(e => onError(e, req, res));
            } catch (e) {
                onError(e, req, res);
            }
        }
        res.end = headers_async_hook;

        next && next();
    }
}

module.exports = ming;
