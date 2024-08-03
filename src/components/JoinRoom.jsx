import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const JoinRoom = () => {
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { accessToken } = location.state;

  const handleJoinRoom = async () => {
    setLoading(true);
    setError("");
    console.log("여기까지 온거지?");
    console.log(accessToken);
  
    try {
      const response = await axios.post(
        `https://i11c209.p.ssafy.io/api/room/enter?roomCode=${roomCode}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      const roomData = response.data.data;
      navigate(`/room/${roomData.roomId}`, { state: { roomData } });
    } catch (error) {
      console.error("Error joining room:", error);
      setError(error.response ? error.response.data.errorMsg : "Network Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Join Room</h1>
      <input
        type="text"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
        placeholder="Enter room code"
      />
      <button onClick={handleJoinRoom} disabled={loading}>
        {loading ? "Joining..." : "Join Room"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default JoinRoom;
