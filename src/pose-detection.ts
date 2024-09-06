import * as tf from '@tensorflow/tfjs';
import * as posedetection from '@tensorflow-models/pose-detection';
import JSConfetti from 'js-confetti'

const jsConfetti = new JSConfetti()

let detector: posedetection.PoseDetector;
let pushUpCount = 0;
let isDown = false;
let wasDown = false;
const countElement = document.getElementById("count");
const resetButton = document.getElementById("reset");

resetButton?.addEventListener("click", () => {
    pushUpCount = 0;
    countElement.innerText = "0";
});

export const loadDetector = async () => {
    await tf.ready(); // Ensure TensorFlow.js is ready
    await tf.setBackend('webgl'); // Set the backend to webgl for better performance
    detector = await posedetection.createDetector(posedetection.SupportedModels.MoveNet);
    console.log("Detector loaded");
};

const isDownPosition = (pose: posedetection.Pose): boolean => {
    const minScore = 0.5; // Minimum confidence score for keypoints

    // Extract keypoints
    const leftElbow = pose.keypoints.find(k => k.name === 'left_elbow');
    const rightElbow = pose.keypoints.find(k => k.name === 'right_elbow');
    const leftShoulder = pose.keypoints.find(k => k.name === 'left_shoulder');
    const rightShoulder = pose.keypoints.find(k => k.name === 'right_shoulder');

    // Ensure all keypoints are detected with sufficient confidence
    if (
        leftElbow && rightElbow && leftShoulder && rightShoulder &&
        leftElbow.score > minScore && rightElbow.score > minScore &&
        leftShoulder.score > minScore && rightShoulder.score > minScore
    ) {
        // Check if elbows are near the shoulders and aligned horizontally
        const leftElbowShoulderDiff = Math.abs(leftElbow.y - leftShoulder.y);
        const rightElbowShoulderDiff = Math.abs(rightElbow.y - rightShoulder.y);


        // Check if the elbows and shoulders are horizontally aligned
        return leftElbowShoulderDiff < 30 && rightElbowShoulderDiff < 30;
    }

    return false;
};

const isUpPosition = (pose: posedetection.Pose): boolean => {
    const minScore = 0.5; // Minimum confidence score for keypoints

    // Extract keypoints
    const leftElbow = pose.keypoints.find(k => k.name === 'left_elbow');
    const rightElbow = pose.keypoints.find(k => k.name === 'right_elbow');
    const leftShoulder = pose.keypoints.find(k => k.name === 'left_shoulder');
    const rightShoulder = pose.keypoints.find(k => k.name === 'right_shoulder');

    // Ensure all keypoints are detected with sufficient confidence
    if (
        leftElbow && rightElbow && leftShoulder && rightShoulder &&
        leftElbow.score > minScore && rightElbow.score > minScore &&
        leftShoulder.score > minScore && rightShoulder.score > minScore
    ) {
        // Check if elbows are farther from the shoulders vertically
        const leftElbowShoulderDiff = Math.abs(leftElbow.y - leftShoulder.y);
        const rightElbowShoulderDiff = Math.abs(rightElbow.y - rightShoulder.y);

        // Check if the elbows are farther from the shoulders vertically
        return leftElbowShoulderDiff > 100 && rightElbowShoulderDiff > 100;
    }

    return false;
};

export const detectPose = async (video: HTMLVideoElement) => {
    const poses = await detector.estimatePoses(video);
    if (poses.length > 0) {
        const pose = poses[0];

        if (isDownPosition(pose)) {
            if (!isDown) {
                isDown = true;
                console.log("Push-up down position detected");
            }
        } else if (isUpPosition(pose)) {
            if (isDown) {
                isDown = false;
                console.log("Push-up up position detected");
            }
        }

        // Increment the counter only when transitioning from down to up
        if (wasDown && !isDown) {
            pushUpCount++;
            countElement.innerText = `${pushUpCount}`;

            if (pushUpCount % 10 === 0) {
                jsConfetti.addConfetti({
                    emojis: ['💪', '🆒', '😎', '🔥', '❤️‍🔥'],
                    emojiSize: 100,
                });
            }
            console.log(`Push-ups: ${pushUpCount}`);
        }

        wasDown = isDown;
    } else {
        console.log("No poses detected");
    }

    requestAnimationFrame(() => detectPose(video));
};
