import React, { useEffect, useMemo, useRef } from "react"
import Hls from "hls.js"

export default function Player({url, width, height}) {
  const isSupportBrowser = useMemo(() => Hls.isSupported(), []);
  const videoRef = useRef(null);
  const preRef = useRef(null);
  function onManifestLoaded(_, data) {
    preRef.current.textContent = data.details.m3u8;
  }
  useEffect(() => {
    if (isSupportBrowser) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.LEVEL_LOADED, onManifestLoaded);
      return () => {
        hls.removeAllListeners();
        hls.stopLoad();
        hls.off(Hls.Events.LEVEL_LOADED, onManifestLoaded);
      }
    }
  }, [url])
  return (
    <>
      <div className="content">
        {isSupportBrowser && (
          <div className="videoContainer" >
            <video ref={videoRef} width={width} height={height} controls></video>
            <pre ref={preRef}></pre>
          </div>
        )}
      </div>
    </>
  )
}