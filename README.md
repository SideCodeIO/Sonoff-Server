# Private Sonoff Server - Sonoff Cloud based on node.js

- Current State => Tested and Working with Sonoff Duel.
- Compatible with Home Assistant (Hass.io) Sonoff Server integration (as a hass.io custom component)
Home Assistant component: https://github.com/SideCodeIO/Home-Assistant-Sonoff-Server-Integration

The idea was to have a private, locally/remote hosted server to manage all of your own Sonoff devices.
Does not require flashing and without firmware upgrade.
It is done by connecting to the device (via wifi, when it is in AP mode) 
and telling him that from now on, his server is in a new IP address (the private sonoff server, instead of the sonoff cloud servers).
  
  

A lot of this code is based on the findings and code from these sources:
* http://blog.nanl.de/2017/05/sonota-flashing-itead-sonoff-devices-via-original-ota-mechanism/
* https://blog.ipsumdomus.com/sonoff-switch-complete-hack-without-firmware-upgrade-1b2d6632c01
* https://github.com/mdopp/simple-sonoff-server
* https://github.com/granberro/simple-sonoff-server
* https://github.com/adam-golab/sonoff-server

# Installation

1. Before running the server you have to provide certificate for HTTPS. It doesn't have to be a valid certificate, you can create your own self-signed and it would be good enough for Sonoff devices to connect. You can do it via following commands
```bash
openssl req -x509 -newkey rsa:2048 -keyout certs/keytmp.pem -out certs/cert.pem -days 365
openssl rsa -in certs/keytmp.pem -out certs/key.pem
```
2. Install all npm packages by runnning:
```bash
npm install
```

# Configuration

Change the config.json to fit your environment and desired settings.

The "server" is the device, which should stay in contact with the SONOFF devices. In my case it was the CentOS based home server on an old laptop.

* "HTTP_PORT" can be any port.
* "HTTPS_PORT" can be any port.
* "WEBSOCKET_PORT" can be any port.

### Configuration - For Dev purposes.   

To work in dev mode (with nodemon) - run:
```bash
npm run dev
```
Also, there is a .dotenv support, instead of editing the configuration directly via the config.json,
It is possible to add a .env file, .env-example supplied. 


# Sonoff Dual known led states:
* 3 Fast blinks - Pairing mode.
* Steady fast blink - Wifi enabled and accessible Mode (needed for setting up a new device).
* 2 slow blinks - Wifi connected and looking for server, If takes too long, could mean that it can't establish a server connection (can't register device an open a websocket).
* 1 slow blink - Attempting to register with the server (handshake and open the websocket). 
* Steady light - Established a connection with the server, and ready for commands!.


# Setup a new device
There are two ways of setting up the devices. 
Either manually by doing a POST request (by wget or postman) while connected to the device wifi (ITEAD-1000xxxxx )
Or with the sonoff.setupdevice.js script.


### Option 1: Manual POST request
1. Put the SonOff/Wemos device in AP mode, press and hold button for 5s or specifically In Sonoff Dual, press for 5 seconds it will go into pairing mode, hold 5 seconds again it will go into AP mode).
1. Find the device (look for a new WIFI network) and connect to it (SSID: ITEAD-10000xxxxx Password: 12345678)
1. Add route if necessary `sudo route change 0.0.0.0 mask 0.0.0.0 10.10.7.1` (was not needed in my case).
1. (optional) Open a browser with this address: 10.10.7.1/device, you should see the device details, or in postman do a get request with this address.
1. Do a postman POST request:
    * set it to a post request with the address: http://10.10.7.1/ap 
    * Go to headers: add the following:
        * Key: Accept | Value: application/json
        * Key: Content-Type | Value: application/json
        
    * Go into body, set it to raw, paste in this:
    ```json
    {
      "version": 4,
      "ssid": "mamaliga",
      "password": "JC268626",
      "serverName": "192.168.2.112",
      "port": 8080
    }
    ```
    * click send and your done, the desired response is: 
    ```
    {
        "error": 0
    }
    ```

### Option 2: Manual Post request via wget
(thanks @andrewerrington)
1. Put the SonOff/Wemos device in AP mode, press and hold button for 5s or specifically In Sonoff Dual, press for 5 seconds it will go into pairing mode, hold 5 seconds again it will go into AP mode).
1. Find the device (look for a new WIFI network) and connect to it (SSID: ITEAD-10000xxxxx Password: 12345678)
1. Add route if necessary `sudo route change 0.0.0.0 mask 0.0.0.0 10.10.7.1`
1. (optional) use wget to read device info `wget -O- 10.10.7.1/device`
1. use wget to send local WiFi settings to device `wget -O- --post-data='{"version":4,"ssid":"yourSSID","password":"yourSSID_PASSWORD","serverName":"n.n.n.n","port":1081}' --header=Content-Type:application/json "http://10.10.7.1/ap"`

The device will automatically drop out of AP mode and tries to connect to WiFi and server.

### Option 3: sonoff.setupdevice.js
Start sonoff.setupdevice.js on a computer you like. It will connect to the SONOFF device, so you will lose internet connection. When the scripts runs, you must long-click the black button on the device, and it will be configured to use the "server" as its cloud. Which now runs in your own network.
To run this on a linux device, the network manager must be installed. On an raspberry pi I would suggest to do the setup process manually with wget.



# running the server
Start app.js by any of this methods.
```bash
npm run start 
node app.js
```
IF you are using PM2 (Node Process manager) (the --name can be anything you want):
```
pm2 start app.js --name "sonoff_server" --update-env
```
This Server keeps the connection to the sonoff devices, and must run permanently.

## Available Routes :
All routes can be accessed from the browser (either by http or https, make sure to add the port):

* /devices => list off all devices that are currently known to the server.
* /devices/THE_DEVICE_ID/status => shows the status of the device 
* /devices/THE_DEVICE_ID/on => turns the device "on" 
* /devices/THE_DEVICE_ID/off => turns the device "off" 

example, if you are using the default ports: 
* http://YOUR_IP_ADDRESS:8081/devices
* https://YOUR_IP_ADDRESS:8080/devices


