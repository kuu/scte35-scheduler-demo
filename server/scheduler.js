const {execSync} = require('child_process');
const {join} = require('path');
const {writeFileSync} = require('fs');

const OFFSET = 20;
const PROGRAM_START = 16;
const PROGRAM_END = 17;

function formatDate(dt) {
  const y = dt.getUTCFullYear();
  const m = `00${dt.getUTCMonth() + 1}`.slice(-2);
  const d = `00${dt.getUTCDate()}`.slice(-2);
  const h = `00${dt.getUTCHours()}`.slice(-2);
  const min = `00${dt.getUTCMinutes()}`.slice(-2);
  const sec = `00${dt.getUTCSeconds()}`.slice(-2);
  const msec = `000${dt.getUTCMilliseconds()}`.slice(-3);
  return `${y}-${m}-${d}T${h}:${min}:${sec}.${msec}Z`;
}

function addTime(date, seconds) {
  return new Date(date.getTime() + seconds * 1000);
}

function createSpliceInsertAction(eventId, start, length) {
  return {
    "ActionName": `splice_insert()-${eventId}`,
    "ScheduleActionSettings": {
        "Scte35SpliceInsertSettings": {
            "SpliceEventId": eventId,
            "Duration": length * 90000
        }
    },
    "ScheduleActionStartSettings": {
        "FixedModeScheduleActionStartSettings": {
            "Time": formatDate(start)
        }
    }
  };
}

function createTimeSignaAction(eventId, type, time) {
  return {
    "ActionName": `time_signal(Program ${type === 16 ? 'Start' : 'End'})-${eventId}`,
    "ScheduleActionSettings": {
      "Scte35TimeSignalSettings": {
        "Scte35Descriptors": [
            {   
                "Scte35DescriptorSettings": {
                    "SegmentationDescriptorScte35DescriptorSettings": {
                        "SegmentationCancelIndicator": "SEGMENTATION_EVENT_NOT_CANCELED",
                        "SegmentationEventId": eventId,
                        "SegmentationTypeId": type,
                        "SegmentationUpid": "00",
                        "SegmentationUpidType": 1,
                        "DeliveryRestrictions": {
                            "NoRegionalBlackoutFlag": "NO_REGIONAL_BLACKOUT",
                            "ArchiveAllowedFlag": "ARCHIVE_NOT_ALLOWED",
                            "WebDeliveryAllowedFlag": "WEB_DELIVERY_NOT_ALLOWED",
                            "DeviceRestrictions": "NONE",
                        }
                    }
                }
            }
        ]
      }
    },
    "ScheduleActionStartSettings": {
        "FixedModeScheduleActionStartSettings": {
            "Time": formatDate(time)
        }
    }
  }
}

function createTimeSignalProgramStartEndActions(eventId, start, length) {
  const end = addTime(start, length);
  return [
    createTimeSignaAction(eventId, PROGRAM_START, start),
    createTimeSignaAction(eventId, PROGRAM_END, end),
  ];
}

function createJson(context) {
  const {eventId, timelineLen, timeline} = context;
  let id = eventId;
  const now = new Date();
  const start = addTime(now, OFFSET);
  const next = addTime(now, timelineLen);
  const list = [];
  for (const {type, offset, length} of timeline) {
    if (type === 'avail') {
      list.push(createSpliceInsertAction(id++, addTime(start, offset), length));
    } else {
      list.push(createTimeSignalProgramStartEndActions(id++, addTime(start, offset), length));
    }
  }
  context.eventId = id;
  return [{"ScheduleActions": list.flat()}, next];
}

function createCommand(context) {
  const [json, nextTime] = createJson(context);
  const jsonText = JSON.stringify(json, null, 2);
  writeFileSync(join(__dirname, 'schedule.json'), jsonText);
  return [`aws medialive --region ${context.region} batch-update-schedule --channel-id ${context.channelId} --creates file://${__dirname}/schedule.json`, nextTime, jsonText]
}

function executeCommand(context) {
  execSync(`aws medialive --region ${context.region} delete-schedule --channel-id ${context.channelId}`);
  const [command, nextTime, jsonText] = createCommand(context);
  const out = execSync(command);
  return [out, nextTime, jsonText];
}

function tick(context, cb) {
  const [, nextTime, jsonText] = executeCommand(context);
  console.log(`--- Scheduled. next wake-up time: ${nextTime}, next event id: ${context.eventId}`);
  cb(jsonText);
  context.timerId = setTimeout(tick, nextTime.getTime() - Date.now(), context, cb);
}

function createScheduler(region, channelId, timeline, timelineLen, cb) {
  const context = {
    region,
    channelId,
    timeline,
    timelineLen,
    eventId: 1,
    timerId: -1,
  };
  tick(context, cb);
  return context;
}

function deleteScheduler(context) {
  execSync(`aws medialive --region ${context.region} delete-schedule --channel-id ${context.channelId}`);
  clearTimeout(context.timerId);
}

module.exports = {createScheduler, deleteScheduler};
