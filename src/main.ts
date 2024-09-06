import { setupCamera } from './camera';
import { loadDetector, detectPose } from './pose-detection';

const main = async () => {
    await loadDetector();
    const video = await setupCamera();
    detectPose(video);
};

main();