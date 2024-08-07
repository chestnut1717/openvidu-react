import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { OpenVidu } from "openvidu-browser";
import "../Room.css"; // CSS 파일을 추가하여 스타일을 정의합니다.

const Room = () => {
  const location = useLocation();
  const { roomData, accessToken } = location.state;
  const [session, setSession] = useState(null);
  const [mainStreamManager, setMainStreamManager] = useState(null);
  const [publisher, setPublisher] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [username, setUserName] = useState(null);
  const [usernames, setUsernames] = useState({});
  const mySessionId = roomData.webrtc.sessionId;
  const OV = new OpenVidu();

  useEffect(() => {
    const joinSession = async () => {
      const session = OV.initSession();

      session.on("streamCreated", (event) => {
        const subscriber = session.subscribe(event.stream, undefined);
        setSubscribers((prevSubscribers) => [...prevSubscribers, subscriber]);
      });

      session.on("connectionCreated", (event) => {
        console.log("----- connectionCreated event -----");
        console.log(event.connection);
        console.log(event.connection.data);
        const connectionId = event.connection.connectionId;
        const connectionData = JSON.parse(event.connection.data);
        setUsernames((prevUsernames) => ({
          ...prevUsernames,
          [connectionId]: connectionData.memberName,
        }));
        console.log("-------------------");
      });

      session.on("streamDestroyed", (event) => {
        setSubscribers((prevSubscribers) =>
          prevSubscribers.filter(
            (subscriber) => subscriber !== event.stream.streamManager
          )
        );
      });

      try {
        await session.connect(roomData.webrtc.openviduToken);

        const publisher = OV.initPublisher(undefined, {
          audioSource: undefined,
          videoSource: undefined,
          publishAudio: true,
          publishVideo: true,
          resolution: "640x480",
          frameRate: 30,
          insertMode: "APPEND",
          mirror: false,
        });

        session.publish(publisher);

        setSession(session);
        setMainStreamManager(publisher);
        setPublisher(publisher);
      } catch (error) {
        console.error("There was an error connecting to the session:", error);
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
      <h2>Current Users:</h2>
      <ul>
        {Object.keys(usernames).map((connectionId) => (
          <li key={connectionId}>{usernames[connectionId]}</li>
        ))}
      </ul>
      <div id="video-container">
        {mainStreamManager && (
          <div className="video-wrapper">
            <video
              autoPlay={true}
              ref={(video) => video && mainStreamManager.addVideoElement(video)}
            />
            <div className="username-overlay">
              {usernames[session.connection.connectionId]}
            </div>
          </div>
        )}
        {subscribers.map((sub, index) => (
          <div key={index} className="video-wrapper">
            <video
              autoPlay={true}
              ref={(video) => video && sub.addVideoElement(video)}
            />
            <div className="username-overlay">
              {usernames[sub.stream.connection.connectionId]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Room;
