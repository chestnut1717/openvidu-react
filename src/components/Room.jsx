import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { OpenVidu } from "openvidu-browser";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Box3,
  Euler,
  Matrix4,
  Vector3,
  Mesh,
  MeshStandardMaterial,
} from "three";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useGLTF } from "@react-three/drei";
import "../Room.css";

let video;
let faceLandmarker;
let lastVideoTime = -1;

// 가면 회전
let rotation = new Euler(0, 0, 0);
// 가면 위치
let position = new Vector3(0, 0, 0);
// 코 위치
let noseY = -1;
let noseX = -1;

// 비디오 크기
let videoWidth = 640;
let videoHeight = 480;
let videoX = 0;
let videoY = 0;
let faceWidth = 1;
let scaleFactor;


// 마스크(GLB파일) 로드
const Model = ({ url, targetSize }) => {
  const { scene } = useGLTF(url);
  const sceneRef = useRef(scene);
  const { camera } = useThree();

  if (scene) {
    scene.traverse((child) => {
      scene.rotation.set(...rotation);

      // 가면 초기 크기 설정
      const box = new Box3().setFromObject(scene);
      const size = new Vector3();
      box.getSize(size);

      const maxSize = Math.max(size.x, size.y, size.z);
      scaleFactor = targetSize / maxSize;

      scene.scale.set(scaleFactor, scaleFactor, scaleFactor);

      if (child instanceof Mesh) {
        const material = new MeshStandardMaterial({
          map: child.material.map,
          roughness: 0.5,
        });
        child.material = material;
        child.material.needsUpdate = true;
      }
    });
  }

  console.log("GLTF파일 로드 완료");

  const getWorldPositionFromPixel = (pixelX, pixelY) => {
    const ndcX = ((pixelX + videoX) / videoWidth) * 2 - 1;
    const ndcY = -(((pixelY + videoY) / videoHeight) * 2 - 1);

    const vector = new Vector3(ndcX, ndcY, 0.5);
    vector.unproject(camera);

    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));


    return pos;
  };

  useFrame(() => {
    if (scene) {
      scene.rotation.set(rotation.x, rotation.y, rotation.z);
      scene.position.set(position.x, position.y, position.z);

      const nosePosition = getWorldPositionFromPixel(noseX, noseY);
      scene.position.copy(nosePosition);
      scene.scale.set(faceWidth, faceWidth, faceWidth);
    }
  });

  return scene ? <primitive object={scene} /> : null;
};

const Room = () => {
  const location = useLocation();
  const { roomData } = location.state;
  const [session, setSession] = useState(null);
  const [mainStreamManager, setMainStreamManager] = useState(null);
  const [publisher, setPublisher] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [usernames, setUsernames] = useState({});
  const canvasRef = useRef(null);
  const videoRef = useRef(null); // 비디오 요소에 대한 ref 추가
  const OV = new OpenVidu();
  const outputCanvasRef = useRef(null); // 최종 출력 캔버스
  const [gl, setGL] = useState(null); // WebGL renderer reference
  const [gltfUrl, setGltfUrl] = useState("");
  const [isgltfUrl, setIsGltfUrl] = useState(false);
  

  const targetSize = 2.996335351172754;
  const [size] = useState(720);
  
  const handleChangeMask = (newUrl) => {
    if (gltfUrl !== newUrl) {
      setIsGltfUrl(false);
      setGltfUrl(newUrl);
      console.log(gltfUrl);
    }
  };

  useEffect(() => {
    // 모델이 변경될 때마다 다시 로드
    if (gltfUrl) {
      setIsGltfUrl(true);
    }
  }, [gltfUrl]);
  useEffect(() => {
    const initialize = async () => {
      await setup(); // setup 함수가 완료된 후에
      joinSession(); // joinSession 함수를 호출
    };

    initialize(); // 초기화 함수 실행

    return () => {
      if (session) session.disconnect();
    };
  }, []); // 빈 배열로 의존성 배열 설정, 컴포넌트 마운트 시 한 번만 실행

  // subscriber이 변하면 outputCanvas에 적힌 내용을 tracking함
  useEffect(() => {
    subscribers.forEach((subscriber, index) => {
      if (subscriber && outputCanvasRef.current) {
        subscriber.addVideoElement(outputCanvasRef.current);
      }
    });
  }, [subscribers]);
  
  // mediapipe를 통해 faceLandmarker 예측
  const predict = () => {
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      console.log("video", video);
      // console.log("predict 재귀를 타는가?");
      requestAnimationFrame(predict);
      return;
    }

    const nowInMs = Date.now();
    if (video.currentTime) {
      lastVideoTime = video.currentTime;
      const result = faceLandmarker.detectForVideo(video, nowInMs);

      if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        const matrix = result.facialTransformationMatrixes[0];
        rotation = new Euler().setFromRotationMatrix(
          new Matrix4().fromArray(matrix.data)
        );

        const landmarks = result.faceLandmarks[0];
        const centerX = landmarks[1].x;
        const centerY = landmarks[1].y;

        position.set((centerX - 0.5) * 2, -(centerY - 0.5) * 2, -1);

        const leftEye = landmarks[2];
        const rightEye = landmarks[5];
        if (leftEye && rightEye) {
          const dx = rightEye.x - leftEye.x;
          const dy = rightEye.y - leftEye.y;
          faceWidth = (Math.sqrt(dx * dx + dy * dy) * 100) / 4;
        }

        drawLandmarks(landmarks);
      }
    }

    requestAnimationFrame(predict);
  };

  // mediapipe가 매 영상 프레임마다 얼굴에서 코 위치 추출하는 로직
  const drawLandmarks = (landmarks) => {
    const canvas = canvasRef.current;
    console.log("drawLandmark canvas", canvas);
    if (canvas) {
      const context = canvas.getContext("2d");
      if (context) {
        console.log('context 존재')
        const noseTipIndex = 1;
        if (landmarks[noseTipIndex]) {
          const noseTip = landmarks[noseTipIndex];
          noseX = noseTip.x * canvas.width;
          noseY = noseTip.y * canvas.height;
          console.log("코코코코코코코", noseX);
        }
      }
    } else {
      console.log("input canvas가 존재하지 않음")
    }
    
  };

  const setup = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "GPU",
      },
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      runningMode: "VIDEO",
    });
    console.log("mediapipe 로드 완료")

    video = videoRef.current; // useRef를 통해 비디오 요소 참조
    if (!video) {
      console.error("Video element not found.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      video.srcObject = stream;
      video.addEventListener("loadeddata", () => {
        console.log("이벤트 감지");
        predict();
        console.log("그리냐?");
        drawComposite();
      });
    } catch (err) {
      console.error("Error accessing media devices.", err);
    }
  };

  const drawComposite = () => {
    const video = videoRef.current;
    const outputCanvas = outputCanvasRef.current;

    console.log("알고있니 gl");
    if (video && outputCanvas) {
      console.log("여긴 넘어오나 1");
      const ctx = outputCanvas.getContext("2d");

      // 주기적으로 비디오와 캔버스의 내용을 합성하여 출력 캔버스에 그리기
      const draw = () => {
        ctx.clearRect(0, 0, videoWidth, videoHeight);
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
        ctx.drawImage(gl.domElement, 0, 0, videoWidth, videoHeight);

        requestAnimationFrame(draw);
      };
      draw();
    }
  };

  useEffect(() => {
    if (gl) {
      console.log("gl dom element", gl.domElement);
      drawComposite();
    }
  }, [gl]);

  const joinSession = async () => {
    const session = OV.initSession();

    session.on("streamCreated", (event) => {
      const subscriber = session.subscribe(event.stream, undefined);
      setSubscribers((prevSubscribers) => [...prevSubscribers, subscriber]);
    });

    session.on("connectionCreated", (event) => {
      const connectionId = event.connection.connectionId;
      const connectionData = JSON.parse(event.connection.data);
      setUsernames((prevUsernames) => ({
        ...prevUsernames,
        [connectionId]: connectionData.memberName,
      }));
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
      console.log("Session connected successfully");
      console.log(session);

      // 비디오 캡처 후 퍼블리싱
      console.log("여기까지오냐? 1");

      if (videoRef.current) {
        console.log("여기까지오냐? 2");
        console.log(videoRef.current);

        // 합성된 캔버스 스트림 캡처 후 퍼블리싱
        const stream = outputCanvasRef.current.captureStream();
        console.log("여기까지오냐? 3");
        console.log(stream);

        const videoTrack = stream.getVideoTracks()[0];
        console.log("여기까지오냐? 4");
        console.log(videoTrack);

        const publisher = OV.initPublisher(undefined, {
          audioSource: undefined,
          videoSource: videoTrack,
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

        console.log("OpenVidu session published.");
      }
    } catch (error) {
      console.error("Error connecting to the session:", error);
    }
  };



  return (
    <div>
      <h1>Room: {roomData.roomName}</h1>
      <h2>방코드 : {roomData.roomCode}</h2>
      <h2>Current Users:</h2>
                  {/* 선택지 */}
                  <div className="flex gap-5">
        <button
          className="text-xl bg-blue-500 text-white px-4 py-2 rounded-sm"
          onClick={() => handleChangeMask("/mask/fox/fox.glb")}
        >
          여우가면
        </button>
        <button
          className="text-xl bg-blue-500 text-white px-4 py-2 rounded-sm"
          onClick={() => handleChangeMask("/mask/catwoman_mask/scene.glb")}
        >
          고양이가면
        </button>
        <button
          className="text-xl bg-blue-500 text-white px-4 py-2 rounded-sm"
          onClick={() => handleChangeMask("/mask/party_mask/party_mask_1.glb")}
        >
          파티 가면
        </button>
        <button
          className="text-xl bg-blue-500 text-white px-4 py-2 rounded-sm"
          onClick={() => handleChangeMask("")}
        >
          벗기기
        </button>
      </div>
      <ul>
        {Object.keys(usernames).map((connectionId) => (
          <li key={connectionId}>{usernames[connectionId]}</li>
        ))}
      </ul>
      <div id="video-container">
        <div className="video-wrapper" style={{ position: "relative" }}>
          {/* 웹캠 영상을 보여주는 비디오 요소 */}
          <video
            ref={videoRef}
            autoPlay
            muted
            style={{ width: "100%", zIndex: 1 }}
            id="local-video-undefined"
          />

          {/* AR 처리를 위한 캔버스 */}
          <canvas
            ref={canvasRef}
            width={videoWidth}
            height={videoHeight}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 2,
               display: "none",
               border: "10px solid"
            }}
          />
          {/* 최종 합성된 비디오를 위한 출력 캔버스 */}
          <canvas
            ref={outputCanvasRef}
            width={videoWidth}
            height={videoHeight}
            style={{ display: "none", border: "10px solid" }} // 이 캔버스는 화면에 표시하지 않음
          />

          {/* Three.js를 사용한 AR 모델 렌더링 */}
          <Canvas
            onCreated={({ gl }) => {
              setGL(gl); // GL 컨텍스트 설정
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none", 
              zIndex: 3, // Three.js 캔버스가 가장 위에 렌더링되도록 설정
            }}
          >
            <ambientLight intensity={0.5} />
            <pointLight position={[1, 1, 1]} />
            <pointLight position={[-1, 0, 1]} />
            {isgltfUrl && <Model url={gltfUrl} targetSize={targetSize} />}
          </Canvas>
        </div>

        {subscribers.map((sub, index) => (
          <div key={index} className="video-wrapper">
            <video
              autoPlay={true}
              ref={(video) => video && sub.addVideoElement(video)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Room;
