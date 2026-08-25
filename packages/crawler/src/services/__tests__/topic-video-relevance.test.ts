import { describe, it, expect } from 'vitest';
import { isRelevantTopicVideo } from '../topic-video-relevance.js';

describe('isRelevantTopicVideo', () => {
  describe('hand', () => {
    it('accepts robot dexterous hand demo videos', () => {
      expect(isRelevantTopicVideo('hand', 'Robot dexterous hand grasping demo', 'A humanoid robot hand demo')).toBe(true);
      expect(isRelevantTopicVideo('hand', 'Tactile gripper for robotic manipulation', 'robot fingers demo')).toBe(true);
    });

    it('rejects when there is no robot context', () => {
      expect(isRelevantTopicVideo('hand', 'Dexterous hand exercises for pianists', 'finger tactile grasp training')).toBe(false);
    });

    it('rejects excluded content types', () => {
      expect(isRelevantTopicVideo('hand', 'Robot hand gripper — CEO keynote', 'robot dexterous hand demo')).toBe(false);
    });

    it('rejects unrelated text', () => {
      expect(isRelevantTopicVideo('hand', 'Robot vacuum cleaner review', 'household robot cleaning')).toBe(false);
    });
  });

  describe('rfm', () => {
    it('accepts robot foundation model / VLA demo videos', () => {
      expect(isRelevantTopicVideo('rfm', 'Robot foundation model demo', 'humanoid robot vision language action model')).toBe(true);
      expect(isRelevantTopicVideo('rfm', 'Humanoid robot imitation learning demo', 'robot reinforcement learning policy')).toBe(true);
    });

    it('rejects when there is no robot context', () => {
      expect(isRelevantTopicVideo('rfm', 'Foundation model for language translation', 'vision language action demo')).toBe(false);
    });

    it('rejects excluded content types', () => {
      expect(isRelevantTopicVideo('rfm', 'Robot foundation model — earnings call', 'robot VLA demo')).toBe(false);
    });

    it('rejects unrelated text', () => {
      expect(isRelevantTopicVideo('rfm', 'Robot vacuum cleaner review', 'household robot cleaning')).toBe(false);
    });
  });

  describe('actuator', () => {
    it('accepts humanoid robot actuator / motor demo videos', () => {
      expect(isRelevantTopicVideo('actuator', 'Humanoid robot actuator teardown', 'robot joint motor harmonic drive')).toBe(true);
      expect(isRelevantTopicVideo('actuator', 'Robot joint torque test', 'humanoid robot quasi-direct drive actuator')).toBe(true);
    });

    it('rejects when there is no robot context', () => {
      expect(isRelevantTopicVideo('actuator', 'Industrial motor gearbox teardown', 'harmonic drive transmission')).toBe(false);
    });

    it('rejects excluded content types', () => {
      expect(isRelevantTopicVideo('actuator', 'Robot actuator company — shareholder annual meeting', 'humanoid robot motor')).toBe(false);
    });

    it('rejects unrelated text', () => {
      expect(isRelevantTopicVideo('actuator', 'Robot vacuum cleaner review', 'household robot cleaning')).toBe(false);
    });
  });

  describe('expo', () => {
    it('accepts robot exhibition/trade show demo videos', () => {
      expect(isRelevantTopicVideo('expo', 'CES robot demo booth walkthrough', 'humanoid robot exhibition')).toBe(true);
      expect(isRelevantTopicVideo('expo', 'IROS robot trade show highlights', 'humanoid robot booth demo')).toBe(true);
    });

    it('rejects when there is no robot context', () => {
      expect(isRelevantTopicVideo('expo', 'CES 2026 exhibition highlights', 'consumer electronics booth trade show')).toBe(false);
    });

    it('rejects excluded content types', () => {
      expect(isRelevantTopicVideo('expo', 'CES robot exhibition — fireside interview', 'humanoid robot booth demo')).toBe(false);
    });

    it('rejects unrelated text', () => {
      expect(isRelevantTopicVideo('expo', 'Robot vacuum cleaner review', 'household robot cleaning')).toBe(false);
    });
  });

  describe('production', () => {
    it('accepts humanoid robot mass production demo videos', () => {
      expect(isRelevantTopicVideo('production', 'Humanoid robot mass production factory tour', 'robot factory')).toBe(true);
      expect(isRelevantTopicVideo('production', '휴머노이드 로봇 양산 현장', 'robot 생산라인 factory tour')).toBe(true);
    });

    it('rejects when there is no robot context', () => {
      expect(isRelevantTopicVideo('production', 'Electric vehicle mass production line', 'factory tour manufacturing plant')).toBe(false);
    });

    it('rejects excluded content types', () => {
      expect(isRelevantTopicVideo('production', 'Humanoid robot mass production — podcast interview', 'robot factory tour')).toBe(false);
    });

    it('rejects unrelated text', () => {
      expect(isRelevantTopicVideo('production', 'Robot vacuum cleaner review', 'household robot cleaning')).toBe(false);
    });
  });
});
