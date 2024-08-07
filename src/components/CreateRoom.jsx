import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const CreateRoom = () => {
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { accessToken } = location.state;

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        "https://i11c209.p.ssafy.io/api/room/create",
        {
          roomName: "방이름",
          roomPersonCount: 6,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );
      const roomData = response.data.data;
      console.log(roomData);
      navigate(`/room/${roomData.roomId}`, { state: { roomData } });
    } catch (error) {
      console.error("Error creating room:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Create Room</h1>
      <button onClick={handleCreateRoom} disabled={loading}>
        {loading ? "Creating..." : "Create Room"}
      </button>
    </div>
  );
};

export default CreateRoom;
