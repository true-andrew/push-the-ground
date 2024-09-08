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
    leftWrist: DefinedPoint;
    rightWrist: DefinedPoint;
    leftHip: DefinedPoint;
    rightHip: DefinedPoint;
    leftKnee: DefinedPoint;
    rightKnee: DefinedPoint;
}

function isAllPointsDetected(points: Partial<PushUpPoints>): points is PushUpPoints {
    const values = Object.values(points);
    return values.length > 0 && values.every(point => point !== undefined);
}

function isDefinedPoint(keypoint: posedetection.Keypoint): keypoint is DefinedPoint {
    return keypoint.name !== undefined && keypoint.score !== undefined;
}

export class PushUpDetector extends PoseDetector {
    pushUpCount = 0;
    isDown = false;
    onPushUpDetected: ((count: number) => void) | undefined;

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
                    switch (keypoint.name) {
                        case 'left_elbow':
                            points.leftElbow = keypoint;
                            break;
                        case 'right_elbow':
                            points.rightElbow = keypoint;
                            break;
                        case 'left_shoulder':
                            points.leftShoulder = keypoint;
                            break;
                        case 'right_shoulder':
                            points.rightShoulder = keypoint;
                            break;
                        case 'left_wrist':
                            points.leftWrist = keypoint;
                            break;
                        case 'right_wrist':
                            points.rightWrist = keypoint;
                            break;
                        case 'left_hip':
                            points.leftHip = keypoint;
                            break;
                        case 'right_hip':
                            points.rightHip = keypoint;
                            break;
                        case 'left_knee':
                            points.leftKnee = keypoint;
                            break;
                        case 'right_knee':
                            points.rightKnee = keypoint;
                            break;
                    }
                }
            }

            // Ensure all keypoints are detected
            if (!isAllPointsDetected(points)) {
                return;
            }

            const { leftShoulder, rightShoulder, leftElbow, rightElbow, leftHip, rightHip, leftKnee, rightKnee, leftWrist, rightWrist } = points;

            const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
            const avgElbowY = (leftElbow.y + rightElbow.y) / 2;
            const avgHipY = (leftHip.y + rightHip.y) / 2;
            const avgKneeY = (leftKnee.y + rightKnee.y) / 2;
            const avgWristY = (leftWrist.y + rightWrist.y) / 2;

            // Calculate dynamic thresholds
            const upperBodyHeight = avgHipY - avgShoulderY;
            const downThreshold = avgShoulderY + upperBodyHeight * 0.4; // 40% of upper body height
            const upThreshold = avgShoulderY + upperBodyHeight * 0.1; // 10% of upper body height

            // Check for hips and knees alignment
            const hipKneeDiff = Math.abs(avgHipY - avgKneeY);
            const hipKneeThreshold = upperBodyHeight * 0.1; // Allowable deviation for hips and knees alignment

            // Check for hands position
            const shoulderWristDiff = Math.abs(avgShoulderY - avgWristY);
            const shoulderWristThreshold = upperBodyHeight * 0.3; // Allowable deviation for hands position

            // Determine if user is in the down position
            if (avgElbowY > downThreshold && hipKneeDiff < hipKneeThreshold && shoulderWristDiff < shoulderWristThreshold) {
                if (!this.isDown) {
                    this.isDown = true;
                }
            } else if (avgElbowY < upThreshold && hipKneeDiff < hipKneeThreshold && shoulderWristDiff < shoulderWristThreshold) {
                if (this.isDown) {
                    this.isDown = false;
                    this.pushUpCount++;
                    console.log(`Push-up count: ${this.pushUpCount}`);
                    if (this.onPushUpDetected) {
                        this.onPushUpDetected(this.pushUpCount);
                    }
                }
            }
        }

        setTimeout(() => {
            this.detectPose(video);
        }, 33);
    }

    resetCounter() {
        this.pushUpCount = 0;
        this.isDown = false;
    }
}
