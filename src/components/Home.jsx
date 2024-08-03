import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [accessToken, setAccessToken] = useState('');
  const navigate = useNavigate();

  const goToCreateRoom = () => {
    navigate('/create-room', { state: { accessToken } });
  };

  const goToJoinRoom = () => {
    navigate('/join-room', { state: { accessToken } });
  };

  return (
    <div>
      <h1>OpenVidu App</h1>
      <input
        type="text"
        value={accessToken}
        onChange={(e) => setAccessToken(e.target.value)}
        placeholder="Enter access token"
      />
      <button onClick={goToCreateRoom} disabled={!accessToken}>
        Create Room
      </button>
      <button onClick={goToJoinRoom} disabled={!accessToken}>
        Join Room
      </button>
    </div>
  );
};

export default Home;
