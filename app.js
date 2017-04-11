/*jslint node: true*/
/*jslint nomen: true */
"use strict";

var express = require('express'),
    path = require('path'),
    favicon = require('serve-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),

    routes = require('./routes/index'),
    search = require('./routes/search'),
    analiz = require('./routes/analysis'),
    webcams = require('./routes/webcams'),

    app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

function freshRequire(path) {
    delete require.cache[require.resolve(path)];
    return require(path);
}
// access to the options
app.locals.options = {};
app.locals.reloadOptions = function () {
    app.locals.options.winapis = freshRequire('./config/winapis.json');
    console.log("loaded apis: %j", Object.keys(app.locals.options.winapis));
    app.locals.options.windumps = freshRequire('./config/windumps.json');
    console.log("loaded dumps: %j", Object.keys(app.locals.options.windumps));
};
app.locals.reloadOptions();

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('node-sass-middleware')({
    src: path.join(__dirname, 'public'),
    dest: path.join(__dirname, 'public'),
    indentedSyntax: true,
    sourceMap: true
}));
app.use(express['static'](path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/search', search);
app.use('/analyse', analiz);
app.use('/cams', webcams);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
