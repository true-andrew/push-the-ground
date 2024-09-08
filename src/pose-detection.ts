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

interface PushUpPoints {
    leftElbow: posedetection.Keypoint;
    rightElbow: posedetection.Keypoint;
    leftShoulder: posedetection.Keypoint;
    rightShoulder: posedetection.Keypoint;
    leftWrist: posedetection.Keypoint;
    rightWrist: posedetection.Keypoint;
    leftHip: posedetection.Keypoint;
    rightHip: posedetection.Keypoint;
    leftKnee: posedetection.Keypoint;
    rightKnee: posedetection.Keypoint;
    leftAnkle: posedetection.Keypoint;
    rightAnkle: posedetection.Keypoint;
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
            this.checkPushUp(pose);
        }

        setTimeout(() => {
            this.detectPose(video);
        }, 33);
    }

    checkPushUp(pose: posedetection.Pose) {
        const points: Partial<PushUpPoints> = {};

        for (const keypoint of pose.keypoints) {
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
                case 'left_ankle':
                    points.leftAnkle = keypoint;
                    break;
                case 'right_ankle':
                    points.rightAnkle = keypoint;
                    break;
            }
        }

        const {
            leftShoulder,
            rightShoulder,
            leftElbow,
            rightElbow,
            leftWrist,
            rightWrist,
            leftAnkle,
            rightAnkle
        } = points;

        if (leftShoulder && rightShoulder && leftElbow && rightElbow && leftWrist && rightWrist && leftAnkle && rightAnkle) {
            const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
            const avgElbowY = (leftElbow.y + rightElbow.y) / 2;
            const avgWristY = (leftWrist.y + rightWrist.y) / 2;
            const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;

            // Check if ankles are between wrists and shoulders
            if (avgAnkleY < avgWristY && avgAnkleY > avgShoulderY) {
                // Calculate dynamic thresholds
                const upperBodyHeight = avgShoulderY - avgWristY;
                const downThreshold = avgShoulderY - upperBodyHeight * 0.4; // 40% of upper body height
                const upThreshold = avgShoulderY - upperBodyHeight * 0.1; // 10% of upper body height

                // Determine if user is in the down position
                if (avgElbowY > downThreshold) {
                    if (!this.isDown) {
                        this.isDown = true;
                    }
                } else if (avgElbowY < upThreshold) {
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
        }
    }

    resetCounter() {
        this.pushUpCount = 0;
        this.isDown = false;
    }
}
