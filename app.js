// added .env support
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const log = require('./helpers/logger');

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var http = require('http');
var https = require('https');


// require the ws server
const sonoffServerEngine = require("./sonoff_server.js");

// load config from config.json.
const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, './config.json')));

// load https cert to config.
config.ssl_key = fs.readFileSync(path.resolve(__dirname, './certs/server.key'));
config.ssl_cert = fs.readFileSync(path.resolve(__dirname, './certs/server.crt'));


// Override config.json with env or .env if exists.
if (process.env.HTTP_PORT !== undefined)
    config.HTTP_PORT = parseInt(process.env.HTTP_PORT);
if (process.env.HTTPS_PORT !== undefined)
    config.HTTPS_PORT = parseInt(process.env.HTTPS_PORT);
if (process.env.WEBSOCKET_PORT !== undefined)
    config.WEBSOCKET_PORT = parseInt(process.env.WEBSOCKET_PORT);
if (process.env.SERVER_IP !== undefined)
    config.SERVER_IP = process.env.SERVER_IP;
if (process.env.CONNECTION_IS_ALIVE_CHECK_INTERVAL !== undefined)
    config.CONNECTION_IS_ALIVE_CHECK_INTERVAL = parseInt(process.env.CONNECTION_IS_ALIVE_CHECK_INTERVAL);




// Register body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Create http(s) server
var credentials = {
    key: config.ssl_key,
    cert: config.ssl_cert,
    rejectUnauthorized: false
};


// start Websocket server.
var sonoffServer = sonoffServerEngine.createServer(config);

// Start the http server.
var httpServer = http.createServer(app);

// Start the https server.
var httpsServer = https.createServer(credentials, app);

// Set servers listeners.
httpServer.listen(config.HTTP_PORT, function () {
    log.log(`HTTP server started on port: ${ config.HTTP_PORT } `);
});

httpsServer.listen(config.HTTPS_PORT, function () {
    log.log(`HTTPS server started on port: ${ config.HTTPS_PORT }`);
});






// -------------------------------------------------
// Register http & https routes.
// -------------------------------------------------

app.post('/dispatch/device', function (req, res) {
    log.log('REQ | %s | %s ', req.method, req.url);
    log.trace('REQ | %s', JSON.stringify(req.body));
    res.json({
        "error": 0,
        "reason": "ok",
        "IP": config.SERVER_IP,
        "port": config.WEBSOCKET_PORT
    });
});

// Register routes
app.get('/', function (req, res) {
    log.log('REQ | %s | %s ', req.method, req.url);
    res.json({'message':"This is the Sonoff Server, to see active devices go to /devices"});
});


//returns an simple 0 or 1 for a known device
app.get('/devices/:deviceId/status', function (req, res) {
    log.log('GET | %s | %s ', req.method, req.url);

    var d = sonoffServer.getDeviceState(req.params.deviceId);

    if (!d || d == "disconnected") {
        res.status(404).send('Sonoff device ' + req.params.deviceId + ' not found');
    } else {
        res.status(200).send(((d == 'on') ? '1' : '0'));
    }
});




//switch the device
app.get('/devices/:deviceId/:state', function (req, res) {
    log.log('GET | %s | %s ', req.method, req.url);
    var d = sonoffServer.getDeviceState(req.params.deviceId);

    if (!d || d == "disconnected") {
        res.status(400).json({'message': 'Sonoff device ' + req.params.deviceId + ' was not found'});

        // res.status(404).send('Sonoff device ' + req.params.deviceId + ' not found');
    } else {
        switch (req.params.state.toUpperCase()) {
            case "1":
            case "ON":
                res.status(200);
                sonoffServer.turnOnDevice(req.params.deviceId);
                break;
            case "0":
            case "OFF":
                res.status(200);
                sonoffServer.turnOffDevice(req.params.deviceId);
                break;
            default:
                res.status(404).json('Sonoff device ' + req.params.deviceId + ' can not be switched to "' + req.params.state + '", only "ON" and "OFF" are supported currently');
        }
    }
});




//get the known state of one known device
app.get('/devices/:deviceId', function (req, res) {
    log.log('GET | %s | %s ', req.method, req.url);
    var d = sonoffServer.getDeviceState(req.params.deviceId);
    if (!d || d == "disconnected") {
        res.status(404).send('Sonoff device ' + req.params.deviceId + ' not found');
    } else {
        res.json(sonoffServer.getConnectedDevices().find(d => d.id == req.params.deviceId));
    }
});




//get a list of known devices
app.get('/devices', function (req, res) {
    log.log('GET | %s | %s ', req.method, req.url);
    res.json(sonoffServer.getConnectedDevices());
});
