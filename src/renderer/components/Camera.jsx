// 📸 Real-Time Mobile Camera with Enhanced AI Filters for Telegram Mini App

import React, { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as bodyPix from '@tensorflow-models/body-pix';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow-models/face-landmarks-detection/dist/face-landmarks-detection.esm';

export default function Camera() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const netRef = useRef(null);
  const faceNetRef = useRef(null);
  const [isTelegramMobile, setIsTelegramMobile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isTelegram = window.Telegram?.WebApp !== undefined;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsTelegramMobile(isTelegram && isMobile);
  }, []);

  useEffect(() => {
    const setup = async () => {
      await tf.setBackend('webgl');
      const net = await bodyPix.load();
      const faceNet = await faceLandmarksDetection.load(
        faceLandmarksDetection.SupportedPackages.mediapipeFacemesh
      );
      netRef.current = net;
      faceNetRef.current = faceNet;
      setLoading(false);
    };
    setup();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 720 },
          height: { ideal: 1280 }
        },
        audio: false
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      requestAnimationFrame(processFrame);
    } catch (err) {
      alert("Camera permission was denied or not supported: " + err.message);
    }
  };

  const processFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !netRef.current || !faceNetRef.current) return;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const segmentation = await netRef.current.segmentPerson(video);
    const faces = await faceNetRef.current.estimateFaces({ input: video });

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < segmentation.data.length; i++) {
      if (!segmentation.data[i]) {
        data[i * 4 + 0] = data[i * 4 + 0] * 0.25; // background darker
        data[i * 4 + 1] = data[i * 4 + 1] * 0.25;
        data[i * 4 + 2] = data[i * 4 + 2] * 0.25;
      }
    }

    faces.forEach(face => {
      face.keypoints.forEach(kp => {
        const x = Math.floor(kp.x);
        const y = Math.floor(kp.y);
        const i = (y * canvas.width + x) * 4;
        if (i >= 0 && i < data.length - 4) {
          data[i + 0] = Math.min(255, data[i + 0] * 1.2); // brighten skin tones
          data[i + 1] = Math.min(255, data[i + 1] * 1.2);
          data[i + 2] = Math.min(255, data[i + 2] * 1.2);
        }
      });
    });

    ctx.putImageData(imageData, 0, 0);
    requestAnimationFrame(processFrame);
  };

  if (!isTelegramMobile) {
    return <p>This feature is only available on mobile Telegram Mini Apps.</p>;
  }

  return (
    <div>
      <h2>🎥 Live Camera with Enhanced AI Filters</h2>
      {loading ? (
  <p>⏳ Loading AI models...</p>
) : (
  <>
    <button onClick={startCamera}>📸 Tap to Start Camera</button>
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{ width: '100%', maxHeight: '400px', marginTop: '10px' }}
    />
    <canvas ref={canvasRef} style={{ width: '100%' }} />
  </>
)}
