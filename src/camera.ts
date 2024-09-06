export const setupCamera = async (): Promise<HTMLVideoElement> => {
    const video = document.getElementById('video') as HTMLVideoElement;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
};
