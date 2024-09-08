export const setupCamera = async (video: HTMLVideoElement): Promise<HTMLVideoElement> => {
    video.srcObject = await navigator.mediaDevices.getUserMedia({video: true});

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
};
