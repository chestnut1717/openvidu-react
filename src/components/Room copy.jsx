// import React, { useEffect, useRef, useState } from "react";
// import { useLocation } from "react-router-dom";
// import { OpenVidu } from "openvidu-browser";
// import { Canvas, useFrame, useThree } from "@react-three/fiber";
// import {
//   Box3,
//   Color,
//   Euler,
//   Matrix4,
//   Vector3,
//   Mesh,
//   MeshStandardMaterial,
// } from "three";
// import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
// import { useGLTF } from "@react-three/drei";
// import "../Room.css"; // CSS 파일을 추가하여 스타일을 정의합니다.


// let video;
// let faceLandmarker;
// let lastVideoTime = -1;

// // 가면 회전
// let rotation = new Euler(0, 0, 0);
// // 가면 위치
// let position = new Vector3(0, 0, 0);
// // 코 위치
// let noseY = -1;
// let noseX = -1;

// // 비디오 크기
// let videoWidth = 640;
// let videoHeight = 480;
// let videoX = 0;
// let videoY = 0;
// let faceWidth = 1;
// let scaleFactor;

// // 마스크(GLB파일) 로드
// const Model = ({ url, targetSize }) => {
//   const { scene } = useGLTF(url);
//   const sceneRef = useRef(scene);
//   const { camera } = useThree();

//   useEffect(() => {
//     //
//     scene.traverse((child) => {
//       // gltf 파일 로드(가면 로드)
//       if (sceneRef.current) {
//         sceneRef.current.rotation.set(...rotation);

//         // 가면 초기 크기 설정
//         const box = new Box3().setFromObject(sceneRef.current);
//         const size = new Vector3();
//         box.getSize(size);

//         const maxSize = Math.max(size.x, size.y, size.z);
//         scaleFactor = targetSize / maxSize;

//         sceneRef.current.scale.set(scaleFactor, scaleFactor, scaleFactor);
//       }
//       // 가면에 디자인 있으면 디자인 입히기
//       if (child instanceof Mesh) {
//         const material = new MeshStandardMaterial({
//           // color: new Color(0xffffff), // 여우의 주황색 색상 적용
//           map: child.material.map, // 기존 텍스처 유지
//           roughness: 0.5, // 표면의 거칠기
//           // metalness: 0.2, // 금속성 부여
//         });
//         child.material = material;
//         child.material.needsUpdate = true;
//       }
//     });
//   }, [scene]);

//   // 화면에서 보이는 픽셀 단위를 three.js의 world로 전환
//   const getWorldPositionFromPixel = (pixelX, pixelY) => {
//     const ndcX = ((pixelX + videoX) / videoWidth) * 2 - 1;
//     const ndcY = -(((pixelY + videoY) / videoHeight) * 2 - 1);

//     const vector = new Vector3(ndcX, ndcY, 0.5);
//     vector.unproject(camera);

//     const dir = vector.sub(camera.position).normalize();
//     const distance = -camera.position.z / dir.z;
//     const pos = camera.position.clone().add(dir.multiplyScalar(distance));

//     return pos;
//   };

//   // 얼굴이 움직일 때마다 사람 얼굴 움직임
//   useFrame(() => {
//     scene.rotation.set(rotation.x, rotation.y, rotation.z); // 가면 방향 움직임
//     scene.position.set(position.x, position.y, position.z); // 가면 위치 움직임

//     const nosePosition = getWorldPositionFromPixel(noseX, noseY);
//     scene.position.copy(nosePosition);
//     scene.scale.set(faceWidth, faceWidth, faceWidth); // 가면 크기 움직임(사람이 앞뒤로 움직이면)
//   });

//   return <primitive object={scene} />;
// };


// const Room = () => {
//   const location = useLocation();
//   const { roomData, accessToken } = location.state;
//   const [session, setSession] = useState(null);
//   const [mainStreamManager, setMainStreamManager] = useState(null);
//   const [publisher, setPublisher] = useState(null);
//   const [subscribers, setSubscribers] = useState([]);
//   const [username, setUserName] = useState(null);
//   const [usernames, setUsernames] = useState({});
//   const mySessionId = roomData.webrtc.sessionId;
//   const canvasRef = useRef(null);
//   const OV = new OpenVidu();
//   const [gltfUrl, setGltfUrl] = useState("");
//   const [isgltfUrl, setIsGltfUrl] = useState(false);

//   const handleChangeMask = (newUrl) => {
//     if (gltfUrl !== newUrl) {
//       setIsGltfUrl(false);
//       setGltfUrl(newUrl);
//       console.log(gltfUrl);
//     }
//   };

//   useEffect(() => {
//     // 모델이 변경될 때마다 다시 로드
//     if (gltfUrl) {
//       setIsGltfUrl(true);
//     }
//   }, [gltfUrl]);

//   const targetSize = 2.996335351172754; // 매우 중요!!! => 무조건 있어야 함(크기의 중심)
//   // 캠 크기 설정
//   const [size, setSize] = useState(720);

//   // 초기 mediapipe 설정
//   // mediapipe : 얼굴인식 하기위한 라이브러리
//   const setup = async () => {
//     const vision = await FilesetResolver.forVisionTasks(
//       "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
//     );
//     faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
//       baseOptions: {
//         modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
//         delegate: "GPU",
//       },
//       outputFaceBlendshapes: true,
//       outputFacialTransformationMatrixes: true,
//       runningMode: "VIDEO",
//     });

//     // 비디오 element 추출 => 어느 element에서 비디오 추출할 것인지
//     video = document.getElementById("local-video-undefined");
//     console.log(video);
//     navigator.mediaDevices
//       .getUserMedia({
//         video: { width: size, height: size },
//       })
//       .then((stream) => {
//         video.srcObject = stream;
//         video.addEventListener("loadeddata", predict);
//         console.log("setup 성공");
//       })
//       .catch((err) => {
//         console.error("Error accessing media devices.", err);
//       });
//   };

//   const predict = () => {
//     if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
//       requestAnimationFrame(predict);
//       return;
//     }

//     const nowInMs = Date.now();
//     if (lastVideoTime !== video.currentTime) {
//       lastVideoTime = video.currentTime;
//       const result = faceLandmarker.detectForVideo(video, nowInMs);

//       if (result.faceLandmarks && result.faceLandmarks.length > 0) {
//         const matrix = result.facialTransformationMatrixes[0];
//         rotation = new Euler().setFromRotationMatrix(
//           new Matrix4().fromArray(matrix.data)
//         );

//         // 가면 위치를 변경하기 위해 얼굴 center 추출
//         const landmarks = result.faceLandmarks[0];
//         const centerX = landmarks[1].x;
//         const centerY = landmarks[1].y;

//         position.set((centerX - 0.5) * 2, -(centerY - 0.5) * 2, -1);

//         // 얼굴의 크기를 가늠하기 위해 양쪽 미간의 길이를 기준으로 scale을 커지고 작아지게 함
//         // 미간 크기 작아지면 => facewidth 작아짐 / 커지면 => facewidth 커짐
//         const leftEye = landmarks[2];
//         const rightEye = landmarks[5];
//         if (leftEye && rightEye) {
//           const dx = rightEye.x - leftEye.x;
//           const dy = rightEye.y - leftEye.y;
//           faceWidth = (Math.sqrt(dx * dx + dy * dy) * 100) / 4;
//         }

//         drawLandmarks(landmarks);
//       }
//     }

//     // 재귀적으로 호출(비디오 계속적으로 나오니깐)
//     requestAnimationFrame(predict);
//   };

//   // mediapipe가 매 영상 프레임마다 얼굴에서 코 위치 추출하는 로직
//   const drawLandmarks = (landmarks) => {
//     const canvas = canvasRef.current;
//     if (canvas) {
//       const context = canvas.getContext("2d");
//       if (context) {
//         const noseTipIndex = 1;
//         if (landmarks[noseTipIndex]) {
//           const noseTip = landmarks[noseTipIndex];
//           noseX = noseTip.x * canvas.width;
//           noseY = noseTip.y * canvas.height;
//         }
//       }
//     }
//   };

//   useEffect(() => {
//     window.addEventListener('load', function() {

//   });
//     setup();
//     const joinSession = async () => {
//       const session = OV.initSession();
    
//       session.on("streamCreated", (event) => {
//         const subscriber = session.subscribe(event.stream, undefined);
//         setSubscribers((prevSubscribers) => [...prevSubscribers, subscriber]);
//       });
    
//       session.on("connectionCreated", (event) => {
//         console.log("----- connectionCreated event -----");
//         console.log(event.connection);
//         console.log(event.connection.data);
//         const connectionId = event.connection.connectionId;
//         const connectionData = JSON.parse(event.connection.data);
//         setUsernames((prevUsernames) => ({
//           ...prevUsernames,
//           [connectionId]: connectionData.memberName,
//         }));
//         console.log("-------------------");
//       });
      
//       session.on("streamDestroyed", (event) => {
//         setSubscribers((prevSubscribers) =>
//           prevSubscribers.filter(
//             (subscriber) => subscriber !== event.stream.streamManager
//           )
//         );
//       });
    
//       try {
//         await session.connect(roomData.webrtc.openviduToken);
    
//         // 스트림 결합을 위해 매 프레임 그리기 시작
//         requestAnimationFrame(drawToCanvas);

//         const canvas = canvasRef.current;
//         let videoTrack = undefined;
    
//         if (canvas) {
//           const ctx = canvas.getContext("2d");
//           if (ctx) {
//             videoTrack = ctx.captureStream().getVideoTracks()[0];
//           }
//         }
    
//         const publisher = OV.initPublisher(undefined, {
//           audioSource: undefined,
//           videoSource: videoTrack, // ctx가 존재하지 않으면 undefined 사용
//           publishAudio: true,
//           publishVideo: true,
//           resolution: "640x480",
//           frameRate: 30,
//           insertMode: "APPEND",
//           mirror: false,
//         });
    
//         session.publish(publisher);
    
//         setSession(session);
//         setMainStreamManager(publisher);
//         setPublisher(publisher);
//       } catch (error) {
//         console.error("There was an error connecting to the session:", error);
//       }
//     };
    
//     joinSession();
    
//     return () => {
//       if (session) session.disconnect();
//     };
    
//   }, []);

  
//   return (
//     <div>
//       <h1>Room: {roomData.roomName}</h1>
//       <h2>Current Users:</h2>
//             {/* 선택지 */}
//             <div className="flex gap-5">
//         <button
//           className="text-xl bg-blue-500 text-white px-4 py-2 rounded-sm"
//           onClick={() => handleChangeMask("/mask/fox/fox.glb")}
//         >
//           여우가면
//         </button>
//         <button
//           className="text-xl bg-blue-500 text-white px-4 py-2 rounded-sm"
//           onClick={() => handleChangeMask("/mask/catwoman_mask/scene.glb")}
//         >
//           고양이가면
//         </button>
//         <button
//           className="text-xl bg-blue-500 text-white px-4 py-2 rounded-sm"
//           onClick={() => handleChangeMask("/mask/party_mask/party_mask_1.glb")}
//         >
//           파티 가면
//         </button>
//         <button
//           className="text-xl bg-blue-500 text-white px-4 py-2 rounded-sm"
//           onClick={() => handleChangeMask("")}
//         >
//           벗기기
//         </button>
//       </div>
//       <ul>
//         {Object.keys(usernames).map((connectionId) => (
//           <li key={connectionId}>{usernames[connectionId]}</li>
//         ))}
//       </ul>
//       <div id="video-container">
//         {mainStreamManager && (
//           <div className="video-wrapper" style={{ position: "relative" }}>
//             <video
//               autoPlay={true}
//               ref={(video) => video && mainStreamManager.addVideoElement(video)}
//             />
//             <canvas
//               ref={canvasRef}
//               width={videoWidth}
//               height={videoHeight}
//               style={{
//                 position: "absolute",
//                 top: 0,
//                 left: 0,
//                 width: "100%",
//                 height: "100%",
//                 pointerEvents: "none",
//               }}
//             />
//             <Canvas
//             id="hello"
//               style={{
//                 position: "absolute",
//                 top: 0,
//                 left: 0,
//                 width: "100%",
//                 height: "100%",
//                 pointerEvents: "none",
//               }}
//             >
//               <ambientLight intensity={0.5} />
//               <pointLight position={[1, 1, 1]} />
//               <pointLight position={[-1, 0, 1]} />
//               {isgltfUrl && <Model url={gltfUrl} targetSize={targetSize} />}
//             </Canvas>

//             <div className="username-overlay">
//               {usernames[session.connection.connectionId]}
//             </div>
            
//           </div>

//         )}
//         {subscribers.map((sub, index) => (
//           <div key={index} className="video-wrapper">
//                         <video
//               autoPlay={true}
//               style={{ position: "relative" }}
//               ref={(video) => video && mainStreamManager.addVideoElement(video)}
//             />


//             {/* <div className="username-overlay">
//               {usernames[sub.stream.connection.connectionId]}
//             </div> */}
//           </div>
//         ))}

//       </div>


//     </div>
//   );
// };

// export default Room;

