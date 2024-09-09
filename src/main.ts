import { setupCamera } from './camera';
import { PushUpDetector } from './pose-detection';

const loaderText = document.getElementById('loader-text')!;
const overlay = document.getElementById('overlay')!;
const startButton = document.getElementById('startButton')!;
const header = document.getElementById('header')!;
const footer = document.getElementById('footer')!;
const counterElement = document.getElementById('counter')!;
const finishButton = document.getElementById('finishButton')!;
const pushUpDetector = new PushUpDetector();
const urlParams = new URLSearchParams(window.location.search);
const chatId = urlParams.get('chat_id');
const userId = urlParams.get('user_id');
const messageId = urlParams.get('message_id');

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

    await fetch('http://localhost:3000/send-pushups', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chatId: chatId,
            userId: userId,
            pushUpCount: pushUpCount,
            messageId: messageId,
        }),
    });
    // Send the number of push-ups to your API

    pushUpDetector.resetCounter();
    header.classList.remove('visible');
    footer.classList.remove('visible');
    overlay.style.display = 'flex';
    startButton.style.display = 'flex';
});


main();
