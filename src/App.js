import React, {useState, useEffect, useRef} from "react";
import Bars from "./components/Bars.js";
import Player from "./components/Player.js";
import styles from './app.module.css';

const DEFAULT_TIMELINE_LENGTH = 60;
const MIN_TIMELINE_LENGTH = 30;
const MAX_TIMELINE_LENGTH = 120;
const DEFAULT_REGION = 'ap-northeast-1';
const DEFAULT_CHANNEL_ID = '99999';

const isValidUrl = (url) => {
  try {
    new URL(url);
  } catch {
    return false;
  }
  return true;
}

export default function App() {
  const [isScheduling, setIsScheduling] = useState(false);
  const [len, setLen] = useState(DEFAULT_TIMELINE_LENGTH);
  const [timelineLen, setTimelineLen] = useState(len);
  const [timeline, setTimeline] = useState([]);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [channelId, setChannelId] = useState(DEFAULT_CHANNEL_ID);
  const [url, setUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const preRef = useRef(null);
  const [socket, setSocket] = useState(null);
  useEffect(() => {
    if (socket && isScheduling) {
      return;
    }
    if (socket && !isScheduling) {
      socket.send(JSON.stringify({
        command: 'stop',
      }, null, 2));
      socket.close();
      preRef.current.textContent = '';
      return setSocket(null);
    }
    if (!socket && !isScheduling) {
      return;
    }
    const sock = new WebSocket('ws://127.0.0.1:5001');

    sock.addEventListener('open', () => {
        console.log('Socket opened');
        sock.send(JSON.stringify({
          command: 'start',
          timelineLen,
          timeline,
          region,
          channelId,
        }, null, 2));
    });
  
    sock.addEventListener('close', () => {
      console.log('Connection closed by server');
      sock.close();
      setSocket(null);
    });

    sock.addEventListener('error', error => {
      console.error(error.stack);
      sock.close();
      setSocket(null);
    });

    sock.addEventListener('message', ({data}) => {
      preRef.current.textContent = data;
    });

    setSocket(sock);
  }, [isScheduling]);

  return (<div>
    <h1>SCTE35 Event Scheduler</h1>
    <div>
      <h2>Timeline Editor</h2>
      <p>
        Timeline length:
        <input
          disabled={isScheduling}
          type='text'
          pattern='[0-9]*'
          value={len}
          onChange={(event) => {
            let num = Number.parseInt(event.target.value, 10);
            if (Number.isNaN(num)) {
              num = 0;
            }
            setLen(num);
          }}
          onKeyDown={({key}) => {
            if (key !== 'Enter') {
              return;
            }
            let num = len;
            if (Number.isNaN(num)) {
              num = DEFAULT_TIMELINE_LENGTH;
            } else if (num > MAX_TIMELINE_LENGTH) {
              num = MAX_TIMELINE_LENGTH;
            } else if (num < MIN_TIMELINE_LENGTH) {
              num = MIN_TIMELINE_LENGTH;
            }
            setTimelineLen(num);
          }}
        />
      </p>
      <div><Bars timelineLen={timelineLen} onTimelineUpdated={setTimeline} disabled={isScheduling} /></div>
      <p>
        Region:
        <select
          disabled={isScheduling}
          value={region}
          onChange={(event) => {
            setRegion(event.target.value);
          }}
        >
          <option value="us-east-1">IAD</option>
          <option value="us-west-2">PDX</option>
          <option value="ap-northeast-1">NRT</option>
          <option value="eu-west-1">DUB</option>
          <option value="us-west-1">SFO</option>
          <option value="eu-central-1">FRA</option>
          <option value="ap-southeast-1">SIN</option>
        </select>
        MediaLive Channel ID:
        <input
          disabled={isScheduling}
          type='text'
          pattern='[0-9]*'
          value={channelId}
          onChange={(event) => {
            setChannelId(event.target.value);
          }}
        />
      </p>
      <button
        disabled={isScheduling}
        onClick={() => {
          if (timeline.length === 0) {
            return alert('No timeline is specified.');
          }
          if (Number.parseInt(channelId, 10).toString(10) !== channelId) {
            return alert(`INVALID CHANNEL ID: "${channelId}"`);
          }
          console.log('Start Scheduling');
          console.log(`Timeline Length: ${timelineLen}`);
          console.log(`Timeline: ${JSON.stringify(timeline, null, 2)}`);
          console.log(`Region: ${region}`);
          console.log(`Channel ID: ${channelId}`);
          setIsScheduling(true);
        }}
      >
        Start Scheduling
      </button>
      <button
        style={{display: isScheduling ? 'block' : 'none'}}
        onClick={() => {
          console.log('Stop Scheduling');
          setIsScheduling(false);
        }}
      >
        Stop Scheduling
      </button>
    </div>
    <div>
      <h2>Schedule API call</h2>
      <pre ref={preRef} style={styles.pre}></pre>
    </div>
    <p>
      Endpoint URL (.m3u8):
      <input
        style={{width: '500px'}}
        type='text'
        value={url}
        onChange={(event) => {
          setUrl(event.target.value);
        }}
      />
    </p>
    <button
      onClick={() => {
        if (isPlaying) {
          return setIsPlaying(false);
        }
        if (!isValidUrl(url)) {
          return alert(`INVALID URL:"${url}"`);
        }
        console.log(`Endpoint URL: ${url}`);
        setIsPlaying(true);
      }}
    >
      {isPlaying ? 'Stop' : 'Playback'}
    </button>
    {isPlaying && (
      <Player
        url={url}
      />
    )}
  </div>);
}
