# scte35-scheduler-demo
AWS Elemental MediaLive SCTE35 Scheduler Demo

## Prerequisites
You need to install the following SW in your local machine:
* git
* Node.js
* AWS CLI (you need to configure with your account)

You also need to setup a media pipeline:
* MediaLive channel (Channel ID is required for scheduling)
* An endpoint as the destination of the above channel (Endpoint URL is required for playback)


## Install
```
$ git clone git@github.com:kuu/scte35-scheduler-demo.git
$ cd scte35-scheduler-demo
$ npm i
```

## Run
```
$ npm start
```
Once the server is started, open `http://localhost:8000` in your browser.
* (Only tested with local macOS + Chrome)
