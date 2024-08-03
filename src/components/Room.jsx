import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { OpenVidu } from 'openvidu-browser';

const Room = () => {
  const location = useLocation();
  const { roomData, accessToken } = location.state;
  const [session, setSession] = useState(null);
  const [mainStreamManager, setMainStreamManager] = useState(null);
  const [publisher, setPublisher] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const mySessionId = roomData.webrtc.sessionId;
  const myUserName = 'Participant' + Math.floor(Math.random() * 100);
  const OV = new OpenVidu();

  useEffect(() => {
    const joinSession = async () => {
      const session = OV.initSession();

      session.on('streamCreated', (event) => {
        const subscriber = session.subscribe(event.stream, undefined);
        setSubscribers((prevSubscribers) => [...prevSubscribers, subscriber]);
      });

      session.on('streamDestroyed', (event) => {
        setSubscribers((prevSubscribers) =>
          prevSubscribers.filter((subscriber) => subscriber !== event.stream.streamManager)
        );
      });

      try {
        await session.connect(roomData.webrtc.openviduToken, { clientData: myUserName });

        const publisher = OV.initPublisher(undefined, {
          audioSource: undefined,
          videoSource: undefined,
          publishAudio: true,
          publishVideo: true,
          resolution: '640x480',
          frameRate: 30,
          insertMode: 'APPEND',
          mirror: false
        });

        session.publish(publisher);

        setSession(session);
        setMainStreamManager(publisher);
        setPublisher(publisher);
      } catch (error) {
        console.error('There was an error connecting to the session:', error);
      }
    };

    joinSession();

    return () => {
      if (session) session.disconnect();
    };
  }, []);

  return (
    <div>
      <h1>Room: {roomData.roomName}</h1>
      <div id="video-container">
        {mainStreamManager && (
          <div id="publisher">
            <video autoPlay={true} ref={(video) => video && mainStreamManager.addVideoElement(video)} />
          </div>
        )}
        {subscribers.map((sub, index) => (
          <div key={index} id="subscriber">
            <video autoPlay={true} ref={(video) => video && sub.addVideoElement(video)} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Room;