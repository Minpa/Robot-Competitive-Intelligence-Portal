import { describe, it, expect } from 'vitest';
import { isRelevantTopicVideo } from '../topic-video-relevance.js';

describe('isRelevantTopicVideo', () => {
  describe('hand', () => {
    it('accepts robot dexterous hand demo videos', () => {
      expect(isRelevantTopicVideo('hand', 'Robot dexterous hand grasping demo', 'A humanoid robot hand demo')).toBe(true);
      expect(isRelevantTopicVideo('hand', 'Tactile gripper for robotic manipulation', 'robot fingers demo')).toBe(true);
    });

    it('accepts brand-context titles without an explicit "robot" word', () => {
      const accepted: Array<[string, string | null]> = [
        ['Atlas Goes Hands On', 'Boston Dynamics Atlas manipulation'],
        ['Boston Dynamics Atlas | Dexterous manipulation of car parts', null],
        ['Tesla Optimus hand: 22 DoF tendon-driven', null],
        ['Sanctuary AI Phoenix hydraulic hand picks up objects', null],
        ['Shadow Hand teleoperation demo', null],
        ['Sharpa Wave: tactile dexterous hand', null],
        ['Tesollo DG-5F plays the piano', 'five-finger robot hand'],
        ['Inspire Robots RH56 dexterous hand on Unitree G1', null],
        ['ORCA Hand: open-source 3D printed dexterous hand (ETH Zurich)', null],
        ['LEAP Hand: anthropomorphic hand for in-hand manipulation (CMU)', null],
        ['DexCap: learning dexterous manipulation from human hand data', 'teleoperation of robot hand'],
        ['灵巧手 实机演示 | 人形机器人', null],
        ['Toyota Research Institute dexterous hand', null],
      ];
      for (const [title, desc] of accepted) {
        expect(isRelevantTopicVideo('hand', title, desc), title).toBe(true);
      }
    });

    it('rejects when there is no robot context', () => {
      expect(isRelevantTopicVideo('hand', 'Dexterous hand exercises for pianists', 'finger tactile grasp training')).toBe(false);
      expect(isRelevantTopicVideo('hand', 'Dexterous hand exercises for pianists', 'finger tactile training')).toBe(false);
    });

    it('rejects excluded content types', () => {
      expect(isRelevantTopicVideo('hand', 'Robot hand gripper — CEO keynote', 'robot dexterous hand demo')).toBe(false);
    });

    it('rejects non-robot "hand" usages, crafts, games, medical and finance titles', () => {
      const rejected: Array<[string, string | null]> = [
        ['How to draw a robot hand step by step', null],
        ['LEGO robot hand build', null],
        ['Hands-on with Unitree G1 humanoid', null],
        ['Second hand robot vacuum — worth it?', null],
        ['Robotic hand massager review', null],
        ['Bionic prosthetic hand for amputee — fitting day', null],
        ['Robot hand gripper — CEO keynote', null],
        ['Forex trading robot manipulation strategy', null],
        ['Minecraft robot hand mod', null],
        ['Robot humanoid walking demo', null],
        ['Unitree G1 unboxing and hand test', null],
        ['Robot hand toy for kids', null],
      ];
      for (const [title, desc] of rejected) {
        expect(isRelevantTopicVideo('hand', title, desc), title).toBe(false);
      }
    });

    it('applies the exclude list to the title only (description boilerplate must not reject)', () => {
      expect(isRelevantTopicVideo('hand', 'Robot dexterous hand grasping demo', 'see our interview on the blog')).toBe(true);
    });

    it('does not treat Toyota as a toy', () => {
      expect(isRelevantTopicVideo('hand', 'Toyota Research robot hand grasping demo', null)).toBe(true);
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
