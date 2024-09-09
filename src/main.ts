import { setupCamera } from './camera';
import { PushUpDetector } from './pose-detection';

Telegram.WebApp.ready();

const loaderText = document.getElementById('loader-text')!;
const overlay = document.getElementById('overlay')!;
const startButton = document.getElementById('startButton')!;
const header = document.getElementById('header')!;
const footer = document.getElementById('footer')!;
const counterElement = document.getElementById('counter')!;
const finishButton = document.getElementById('finishButton')!;
const pushUpDetector = new PushUpDetector();

let pushUpCount = 0;

const main = async () => {
    await setupCamera();

    await pushUpDetector.init();

    loaderText.style.display = 'none';
    startButton.style.display = 'block';
};

startButton.addEventListener('click', () => {
    header.classList.add('visible');
    footer.classList.add('visible');
    overlay.style.display = 'none';

    const video = document.getElementById('video') as HTMLVideoElement;
    pushUpDetector.detectPose(video);

    pushUpDetector.onPushUpDetected = (count: number) => {
        pushUpCount = count;
        counterElement.textContent = count.toString();
        counterElement.classList.remove('counter-increment');
        void counterElement.offsetWidth; // Trigger reflow
        counterElement.classList.add('counter-increment');
    };
});

finishButton.addEventListener('click', async () => {
    // Send the number of push-ups to your API
    const response = await fetch('YOUR_API_ENDPOINT', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pushUpCount })
    });

    if (response.ok) {
        alert('Push-up count sent successfully!');
    } else {
        alert('Failed to send push-up count.');
    }

    // Show a dialog with the title
    alert(`You have completed ${pushUpCount} push-ups!`);
});

main();
