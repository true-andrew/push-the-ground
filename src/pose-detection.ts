import * as tf from '@tensorflow/tfjs';
import * as posedetection from '@tensorflow-models/pose-detection';

export class PoseDetector {
    detector: posedetection.PoseDetector | undefined;

    constructor() {}

    async initDetector() {
        await tf.ready(); // Ensure TensorFlow.js is ready
        await tf.setBackend('webgl'); // Set the backend to webgl for better performance
        this.detector = await posedetection.createDetector(posedetection.SupportedModels.MoveNet);
        console.log("Detector loaded");
    }
}

interface DefinedPoint extends posedetection.Keypoint {
    name: string;
    score: number;
}

interface PushUpPoints {
    leftElbow: DefinedPoint;
    rightElbow: DefinedPoint;
    leftShoulder: DefinedPoint;
    rightShoulder: DefinedPoint;
}

function isAllPointsDetected(points: Partial<PushUpPoints>): points is PushUpPoints {
    return Object.values(points).every(point => point !== undefined);
}

function isDefinedPoint(keypoint: posedetection.Keypoint): keypoint is DefinedPoint {
    return keypoint.name !== undefined && keypoint.score !== undefined;
}

export class PushUpDetector extends PoseDetector {
    pushUpCount = 0;
    isDown = false;
    wasDown = false;

    async init() {
        await this.initDetector();
    }

    async detectPose(video: HTMLVideoElement) {
        if (!this.detector) {
            throw new Error("Detector not initialized");
        }

        const poses = await this.detector.estimatePoses(video);

        if (poses.length > 0) {
            const pose = poses[0];

            const points: Partial<PushUpPoints> = {};

            for (const keypoint of pose.keypoints) {
                if (isDefinedPoint(keypoint)) {
                    if (keypoint.name === 'left_elbow') {
                        points.leftElbow = keypoint;
                    } else if (keypoint.name === 'right_elbow') {
                        points.rightElbow = keypoint;
                    } else if (keypoint.name === 'left_shoulder') {
                        points.leftShoulder = keypoint;
                    } else if (keypoint.name === 'right_shoulder') {
                        points.rightShoulder = keypoint;
                    }
                }
            }

            // Ensure all keypoints are detected
            if (!isAllPointsDetected(points)) {
                return undefined;
            }

            if (this.isDownPosition(points)) {
                if (!this.isDown) {
                    this.isDown = true;
                    console.log("Push-up down position detected");
                }
            } else if (this.isUpPosition(points)) {
                if (this.isDown) {
                    this.isDown = false;
                    console.log("Push-up up position detected");
                }
            }
        }

        if (this.wasDown && !this.isDown) {
            this.pushUpCount++;
        }

        this.wasDown = this.isDown;
    }

    isDownPosition(points: PushUpPoints): boolean {
        const { leftElbow, rightElbow, leftShoulder, rightShoulder } = points;
        const minScore = 0.5;

        // Ensure all keypoints are detected with sufficient confidence
        if (
            leftElbow.score > minScore &&
            rightElbow.score > minScore &&
            leftShoulder.score > minScore &&
            rightShoulder.score > minScore
        ) {
            // Calculate the average shoulder height
            const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;

            // Calculate dynamic thresholds based on shoulder height
            const downThreshold = avgShoulderY + 0.1 * avgShoulderY; // 10% below shoulder height

            // Check if elbows are near the shoulders and aligned horizontally
            const leftElbowShoulderDiff = Math.abs(leftElbow.y - leftShoulder.y);
            const rightElbowShoulderDiff = Math.abs(rightElbow.y - rightShoulder.y);

            // Check if the elbows are below the shoulders
            const leftElbowBelowShoulder = leftElbow.y > downThreshold;
            const rightElbowBelowShoulder = rightElbow.y > downThreshold;

            // Check if the elbows and shoulders are horizontally aligned and elbows are below shoulders
            return (
                leftElbowShoulderDiff < 30 &&
                rightElbowShoulderDiff < 30 &&
                leftElbowBelowShoulder &&
                rightElbowBelowShoulder
            );
        }

        return false;
    }

    isUpPosition(points: PushUpPoints): boolean {
        const { leftElbow, rightElbow, leftShoulder, rightShoulder } = points;
        const minScore = 0.5; // Minimum confidence score for keypoints

        // Ensure all keypoints are detected with sufficient confidence
        if (
            leftElbow.score > minScore && rightElbow.score > minScore &&
            leftShoulder.score > minScore && rightShoulder.score > minScore
        ) {
            // Calculate the average shoulder height
            const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;

            // Calculate dynamic thresholds based on shoulder height
            const upThreshold = avgShoulderY - 0.1 * avgShoulderY; // 10% above shoulder height

            // Check if elbows are farther from the shoulders vertically
            const leftElbowShoulderDiff = Math.abs(leftElbow.y - leftShoulder.y);
            const rightElbowShoulderDiff = Math.abs(rightElbow.y - rightShoulder.y);

            // Check if the elbows are above the shoulders
            const leftElbowAboveShoulder = leftElbow.y < upThreshold;
            const rightElbowAboveShoulder = rightElbow.y < upThreshold;

            // Check if the elbows are farther from the shoulders vertically and above shoulders
            return (
                leftElbowShoulderDiff > 30 &&
                rightElbowShoulderDiff > 30 &&
                leftElbowAboveShoulder &&
                rightElbowAboveShoulder
            );
        }

        return false;
    }

    resetCounter() {
        this.pushUpCount = 0;
    }
}
