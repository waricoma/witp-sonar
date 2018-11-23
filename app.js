'use strict';

const scanner = require('node-wifi-scanner');
const dgram = require('dgram');
const receiver = dgram.createSocket('udp4');
const detectSSid = require('detect-ssid');
const uuidv1 = require('uuid/v1');
const uuidv4 = require('uuid/v4');
const uuidv5 = require('uuid/v5');
const request = require('request');
const {app, BrowserWindow, ipcMain} = require('electron');
const aboutWindow = require('about-window');
// const autoUpdater = require('electron-updater').autoUpdater;

const serverPoint = 'https://nnn.ed.jp';
const udpPort = 2586;

ipcMain.on('start',(ev, startInf)=>{
  receiver.on('listening', ()=>{
    receiver.setBroadcast(true);
    let address = receiver.address();
    console.log(`UDP Server listening on ${address.address}:${address.port}`);

    let oneMUuid = uuidv5(uuidv4(), uuidv1());
    let oneMCheck = 0;

    setInterval(()=>{
      if(oneMCheck === 12){
        oneMCheck = 0;
        oneMUuid = uuidv5(uuidv4(), uuidv1());
      }
      if(oneMCheck === 0){
        // request({}, ()=>{

        // });
      }
      detectSSid((err, ssidname)=>{
        if (err) {
          console.error(err);
          return false;
        }
        if(ssidname === ''){
          console.error('WIFI: ✕');
          return false;
        }
        scanner.scan((err, networks)=>{
          if (err) {
            console.error(err);
            return false;
          }
          let lowestRssi = 0;
          const nearestAPs = networks.filter((network, networkI)=>{
            if(network.ssid !== ssidname) return false;
            if(networkI === 0){
              lowestRssi = network.rssi;
              return true;
            }else if(network.rssi < lowestRssi){
              lowestRssi = network.rssi;
              return true;
            }
            return false;
          });
          const nearestAP = nearestAPs[nearestAPs.length-1];
          const reqObj = {
            from: 'witp-sonar',
            mac: nearestAP.mac,
            rssi: nearestAP.rssi,
            oneMUuid: oneMUuid,
            userId: startInf.token
          };
          const reqMsg = new Buffer(JSON.stringify(reqObj));
          const reqLen = reqMsg.length;
          receiver.send(reqMsg, 0, reqLen, udpPort, '0.0.0.0');

          request({
            url: 'http://localhost:2587/report',
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            json: true,
            form: reqObj
          }, (error, response, body)=>{});
        });
      });
      oneMCheck++;
    }, 3000);
  });

  receiver.on('message', (message, remote)=>{
    console.log(`${remote.address}:${remote.port} - ${message}`);
    try {
      console.log(JSON.parse(`${message}`));
    }catch (err) {
      console.error(err);
      return false;
    }
  });
  receiver.bind(udpPort, '0.0.0.0');
});

let mainWindow = null;
app.on('ready', ()=>{
  mainWindow = new BrowserWindow({width: 450, height: 270});
  mainWindow.loadURL(`file://${__dirname}/ui/index.html`);
  mainWindow.on('closed', ()=>{ mainWindow = null; });
  //mainWindow.webContents.openDevTools();
});
/*
app.on('will-finish-launching', () => {
  app.on('open-url', (e, url) => {
    e.preventDefault();
    handleOpenUri(url);
  });
});
*/
