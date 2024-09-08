import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import * as posedetection from '@tensorflow-models/pose-detection';
import {  PushUpDetector } from './pose-detection.ts'; // Adjust the import path accordingly

vi.mock('@tensorflow/tfjs');
vi.mock('@tensorflow-models/pose-detection');

describe('PoseDetector', () => {
    let poseDetector: PushUpDetector;

    beforeEach(() => {
        poseDetector = new PushUpDetector();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize the detector', async () => {
        const readySpy = vi.spyOn(tf, 'ready').mockResolvedValue();
        const setBackendSpy = vi.spyOn(tf, 'setBackend').mockResolvedValue(true);
        const createDetectorSpy = vi.spyOn(posedetection, 'createDetector').mockResolvedValue({} as posedetection.PoseDetector);

        await poseDetector.init();

        expect(readySpy).toHaveBeenCalled();
        expect(setBackendSpy).toHaveBeenCalledWith('webgl');
        expect(createDetectorSpy).toHaveBeenCalledWith(posedetection.SupportedModels.MoveNet);
        expect(poseDetector.detector).toBeDefined();
    });

    it('should throw an error if detector is not initialized', async () => {
        await expect(poseDetector.detectPose(document.createElement('video'))).rejects.toThrow('Detector not initialized');
    });

    it('should detect push-up down position', async () => {
        const mockPose = {
            keypoints: [
                { name: 'left_elbow', score: 0.9, x: 0, y: 100 },
                { name: 'right_elbow', score: 0.9, x: 0, y: 100 },
                { name: 'left_shoulder', score: 0.9, x: 0, y: 50 },
                { name: 'right_shoulder', score: 0.9, x: 0, y: 50 },
            ]
        };

        const mockDetector = {
            estimatePoses: vi.fn().mockResolvedValue([mockPose])
        };

        poseDetector.detector = mockDetector as unknown as posedetection.PoseDetector;

        const video = document.createElement('video');
        await poseDetector.detectPose(video);

        expect(poseDetector.isDown).toBe(true);
        expect(poseDetector.pushUpCount).toBe(0);
    });

    it('should detect push-up up position and increment count', async () => {
        const mockPoseDown = {
            keypoints: [
                { name: 'left_elbow', score: 0.9, x: 0, y: 50 },
                { name: 'right_elbow', score: 0.9, x: 0, y: 50 },
                { name: 'left_shoulder', score: 0.9, x: 0, y: 50 },
                { name: 'right_shoulder', score: 0.9, x: 0, y: 50 },
            ]
        };

        const mockPoseUp = {
            keypoints: [
                { name: 'left_elbow', score: 0.9, x: 0, y: 50 },
                { name: 'right_elbow', score: 0.9, x: 0, y: 50 },
                { name: 'left_shoulder', score: 0.9, x: 0, y: 200 },
                { name: 'right_shoulder', score: 0.9, x: 0, y: 200 },
            ]
        };

        const mockDetector = {
            estimatePoses: vi.fn()
                .mockResolvedValueOnce([mockPoseDown])
                .mockResolvedValueOnce([mockPoseUp])
        };

        poseDetector.detector = mockDetector as unknown as posedetection.PoseDetector;

        const video = document.createElement('video');
        await poseDetector.detectPose(video); // Detect down position
        await poseDetector.detectPose(video); // Detect up position

        expect(poseDetector.isDown).toBe(false);
        expect(poseDetector.pushUpCount).toBe(1);
    });

    it('should not increment push-up count if down position is not detected', async () => {
        const mockPoseUp = {
            keypoints: [
                { name: 'left_elbow', score: 0.9, x: 0, y: 200 },
                { name: 'right_elbow', score: 0.9, x: 0, y: 200 },
                { name: 'left_shoulder', score: 0.9, x: 0, y: 50 },
                { name: 'right_shoulder', score: 0.9, x: 0, y: 50 },
            ]
        };

        const mockDetector = {
            estimatePoses: vi.fn().mockResolvedValue([mockPoseUp])
        };

        poseDetector.detector = mockDetector as unknown as posedetection.PoseDetector;

        const video = document.createElement('video');
        await poseDetector.detectPose(video); // Detect up position

        expect(poseDetector.isDown).toBe(false);
        expect(poseDetector.pushUpCount).toBe(0);
    });
});
