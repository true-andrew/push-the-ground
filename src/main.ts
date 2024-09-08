import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { setupCamera } from './camera';
import { PushUpDetector } from './pose-detection';
import gsap from 'gsap';

Telegram.WebApp.ready();

const main = async () => {
    // Set up Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // Use devicePixelRatio for better rendering quality
    renderer.shadowMap.enabled = true; // Enable shadow mapping
    document.body.appendChild(renderer.domElement);

    // Set up video element
    const video = await setupCamera();
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;

    // Create a plane to display the video with a custom shader material
    const videoAspectRatio = video.videoWidth / video.videoHeight;
    const geometry = new THREE.PlaneGeometry(videoAspectRatio, 1); // Adjust plane geometry to match video aspect ratio
    const material = new THREE.MeshBasicMaterial({map: videoTexture});
    const plane = new THREE.Mesh(geometry, material);
    plane.receiveShadow = true; // Plane receives shadows
    scene.add(plane);

    // Position the camera to fit the plane to the full screen
    const fitPlaneToScreen = () => {
        const aspectRatio = window.innerWidth / window.innerHeight;
        if (aspectRatio > videoAspectRatio) {
            camera.position.z = 0.5 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / aspectRatio;
        } else {
            camera.position.z = 0.5 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        }
    };
    fitPlaneToScreen();

    // Add OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;

    // Add ambient light and point light for better text appearance
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // Resize handler to maintain aspect ratio and cover the screen
    const onWindowResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        fitPlaneToScreen();
    };
    window.addEventListener('resize', onWindowResize, false);
    onWindowResize(); // Initial call to set sizes

    // Load font for 3D text
    const fontLoader = new FontLoader();
    let textMesh: THREE.Mesh;
    let font: THREE.Font;

    const fontConfig = {
        font: 'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
        size: 0.1,
        depth: 0.01,
    };

    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (_font) => {
        font = _font;

        const textGeometry = new TextGeometry('0', {
            font: font,
            size: 0.1,
            depth: 0.01,
        });
        const textMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
        });
        textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(0, -0.35, 0.1); // Position at the bottom of the plane
        textMesh.rotateX(-0.3);
        textMesh.castShadow = true; // Text casts shadows
        scene.add(textMesh);
    });

    // Animation loop
    const animate = () => {
        controls.update(); // Required for damping to work
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };

    animate();

    // Start pose detection
    const pushUpDetector = new PushUpDetector();
    await pushUpDetector.init();
    pushUpDetector.detectPose(video);

    // Update the push-up counter and position at the bottom of the video
    pushUpDetector.onPushUpDetected = (count: number) => {
        if (textMesh) {
            scene.remove(textMesh);
            const textGeometry = new TextGeometry(count.toString(), {
                font: font,
                size: fontConfig.size,
                depth: fontConfig.depth,
            });
            textMesh = new THREE.Mesh(textGeometry, textMesh.material);
            textMesh.position.set(0, -0.4, 0.1); // Position at the bottom of the plane
            textMesh.rotateX(-0.5);
            scene.add(textMesh);

            // If the number of push-ups is a multiple of 10, scale and rotate the text
            if (count % 10 === 0) {
                gsap.to(textMesh.scale, {
                    duration: 1,
                    x: 1.5,
                    y: 1.5,
                    z: 1.5,
                    onComplete: () => {
                        gsap.to(textMesh.scale, {duration: 1, x: 1, y: 1, z: 1});
                    }
                });
                gsap.to(textMesh.rotation, {
                    duration: 1,
                    y: textMesh.rotation.y + Math.PI * 2,
                    onComplete: () => {
                        textMesh.rotation.y = 0;
                    }
                });
            }
        }
    }

    // Set up MediaRecorder to capture canvas stream
    const canvasStream = renderer.domElement.captureStream();
    const mediaRecorder = new MediaRecorder(canvasStream);
    const recordedChunks = [];

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'pushups.webm';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Create a button to start and stop recording
    const recordButton = document.createElement('button');
    recordButton.textContent = 'Start Recording';
    recordButton.style.position = 'absolute';
    recordButton.style.top = '10px';
    recordButton.style.left = '10px';
    document.body.appendChild(recordButton);
    let recording = false;

    recordButton.addEventListener('click', () => {
        if (!recording) {
            mediaRecorder.start();
            recordButton.textContent = 'Stop Recording';
        } else {
            mediaRecorder.stop();
            recordButton.textContent = 'Start Recording';
        }
        recording = !recording;
    });


    // Integrate with Telegram bot
    const shareButton = document.createElement('button');
    shareButton.textContent = 'Share result';
    shareButton.style.position = 'absolute';
    shareButton.style.top = '10px';
    shareButton.style.right = '10px';
    document.body.appendChild(shareButton);

    shareButton.addEventListener('click', async () => {
        TelegramGameProxy.shareScore()

        return;
        const chatId = Telegram.WebApp.initDataUnsafe.user.id;

        // Send metadata to the bot
        Telegram.WebApp.sendData(JSON.stringify({
            chatId: chatId,
            pushUpCount: pushUpDetector.pushUpCount
        }));
    });

};

main();
