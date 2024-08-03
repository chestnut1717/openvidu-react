import React, { useEffect, useRef, useState } from 'react';
import { OpenVidu } from 'openvidu-browser';
import axios from 'axios';

const OpenViduComponent = () => {
    const [session, setSession] = useState(null);
    const [publisher, setPublisher] = useState(null);
    const [subscribers, setSubscribers] = useState([]);
    const publisherVideoRef = useRef();

    const getTokenFromServer = async (userId) => {
        try {
            const response = await axios.post(
                `https://i11c209.p.ssafy.io/api/room/enter?roomCode=434-013`,
                { userId }, // 필요시 요청 본문 추가
                {
                    headers: {
                        'Authorization': `Bearer ${userId}` // 유동적인 토큰
                    }
                }
            );
            if (response.data.success) {
                console.log('Token received:', response.data.data.openviduToken); // 디버깅 로그 추가
                return response.data.data.webrtc.openviduToken;
            } else {
                throw new Error('Failed to get token');
            }
        } catch (error) {
            console.error('Error getting token:', error);
        }
    };

    useEffect(() => {
        const joinSession = async () => {
            const OV = new OpenVidu();
            const session = OV.initSession();
            console.log('Session initialized');

            session.on('streamCreated', (event) => {
                console.log('Stream created:', event);
                const subscriber = session.subscribe(event.stream, undefined);
                setSubscribers((prevSubscribers) => [...prevSubscribers, { subscriber, id: event.stream.streamId }]);
            });

            session.on('streamDestroyed', (event) => {
                console.log('Stream destroyed:', event);
                setSubscribers((prevSubscribers) => prevSubscribers.filter(sub => sub.id !== event.stream.streamId));
            });

            try {
                const urlParams = new URLSearchParams(window.location.search);
                const userId = urlParams.get('userId');
                const token = await getTokenFromServer(userId);
                console.log('Connecting session with token:', token);
                await session.connect(token, { clientData: 'Participant' });

                const publisher = OV.initPublisher(undefined, {
                    audioSource: undefined,
                    videoSource: undefined,
                    publishAudio: true,
                    publishVideo: true,
                    resolution: '640x480',
                    frameRate: 30,
                    insertMode: 'APPEND',
                    mirror: false,
                });

                console.log('Publisher initialized:', publisher);

                session.publish(publisher);
                setPublisher(publisher);
                setSession(session);
                console.log('Session connected and publisher published');
            } catch (error) {
                console.error('Error joining session:', error);
            }
        };

        joinSession();

        return () => {
            if (session) session.disconnect();
            setSubscribers([]);
            setPublisher(null);
            setSession(null);
        };
    }, []);

    useEffect(() => {
        if (publisher && publisherVideoRef.current) {
            console.log('Adding video element to publisher');
            publisher.addVideoElement(publisherVideoRef.current);
        }
    }, [publisher]);

    return (
        <div>
            <video ref={publisherVideoRef} autoPlay={true} style={{ width: '640px', height: '480px' }} />
            {subscribers.map(({ subscriber, id }) => (
                <div key={id}>
                    <video
                        ref={(element) => {
                            if (element) subscriber.addVideoElement(element);
                        }}
                        autoPlay={true}
                        style={{ width: '640px', height: '480px' }}
                    />
                </div>
            ))}
        </div>
    );
};

export default OpenViduComponent;
