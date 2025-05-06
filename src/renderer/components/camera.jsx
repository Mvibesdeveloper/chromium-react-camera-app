import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as bodyPix from '@tensorflow-models/body-pix';

export default function Camera() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState();
  const [flashOn, setFlashOn] = useState(false);
  const netRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devs => {
      const cams = devs.filter(d => d.kind === 'videoinput');
      setDevices(cams);
      setSelectedDeviceId(cams[0]?.deviceId);
    });
  }, []);

  useEffect(() => {
    tf.setBackend('webgl');
    bodyPix.load().then(net => netRef.current = net);
  }, []);

  useEffect(() => {
    if (!selectedDeviceId) return;
    navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: selectedDeviceId,
        width: { ideal: 1080 },
        height: { ideal: 1920 },
        dynamicRange: 'hdr10'
      }
    }).then(stream => {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      requestAnimationFrame(processFrame);
    });
  }, [selectedDeviceId]);

  const processFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    if (netRef.current) {
      const segmentation = await netRef.current.segmentPerson(video);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < segmentation.data.length; i++) {
        const isPerson = segmentation.data[i];
        if (!isPerson) {
          data[i * 4 + 0] = 100; // background blur color or darken
          data[i * 4 + 1] = 100;
          data[i * 4 + 2] = 100;
        } else {
          // light face smoothing via contrast/brightness
          data[i * 4 + 0] = Math.min(255, data[i * 4 + 0] * 1.1);
          data[i * 4 + 1] = Math.min(255, data[i * 4 + 1] * 1.1);
          data[i * 4 + 2] = Math.min(255, data[i * 4 + 2] * 1.1);
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }

    autoFlashByBrightness(ctx, canvas.width, canvas.height);
    if (flashOn) simulateFlash(ctx, canvas.width, canvas.height);
    requestAnimationFrame(processFrame);
  };

  const simulateFlash = (ctx, w, h) => {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(0, 0, w, h);
  };

  const autoFlashByBrightness = (ctx, w, h) => {
    const { data } = ctx.getImageData(0, 0, w, h);
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4 * 100) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      totalBrightness += (r + g + b) / 3;
    }
    const avg = totalBrightness / (data.length / (4 * 100));
    setFlashOn(avg < 40);
  };

  return (
    <div>
      <select onChange={e => setSelectedDeviceId(e.target.value)}>
        {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
      </select>
      <video ref={videoRef} style={{ display: 'none' }} />
      <canvas ref={canvasRef} />
      <button onClick={processFrame}>Capture Photo</button>
    </div>
  );
}
