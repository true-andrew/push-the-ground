import testVideo from '../assets/pushups.mp4'

export const setupCamera = async (): Promise<HTMLVideoElement> => {
    const video = document.getElementById('video') as HTMLVideoElement;
    video.setAttribute('playsinline', 'true');

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });

    video.srcObject = stream;
    video.play();
    //
    //
    // video.src = testVideo;
    // video.controls = true;
    //
    // document.body.appendChild(video);
    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
};