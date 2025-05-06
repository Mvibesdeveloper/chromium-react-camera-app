import React, { useEffect, useRef } from 'react';

export default function App() {
  const videoRef = useRef();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      })
      .catch(err => {
        console.error('Error accessing camera:', err);
      });
  }, []);

  return (
    <div>
      <h1>Camera Test</h1>
      <video ref={videoRef} autoPlay playsInline style={{ width: '100%' }} />
    </div>
  );
}
