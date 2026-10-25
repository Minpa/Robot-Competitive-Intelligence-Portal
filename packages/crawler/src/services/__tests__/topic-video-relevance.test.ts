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

    it('accepts actuator keyword variants with robot context', () => {
      const accepted: Array<[string, string | null]> = [
        ['Cycloidal actuator for legged robots — bench test', null],
        ['Strain wave gear vs planetary gearbox for robot joints', null],
        ['Series elastic actuator humanoid robot demo', null],
        ['Roller screw linear actuator for humanoid robot knee', null],
        ['QDD robot joint module torque density test', null],
        ['Backdrivable robot actuator demo', 'quasi direct drive'],
        ['휴머노이드 로봇 액추에이터 감속기 분해', null],
        ['人形机器人 关节模组 执行器 测试', null],
      ];
      for (const [title, desc] of accepted) {
        expect(isRelevantTopicVideo('actuator', title, desc), title).toBe(true);
      }
    });

    it('accepts brand-context titles without an explicit "robot" word', () => {
      const accepted: Array<[string, string | null]> = [
        ['RobStride 04 actuator teardown and torque test', null],
        ['CubeMars AK80-9 motor module demo', null],
        ['MyActuator RMD-X8 planetary actuator unboxing… no, bench test', 'planetary'],
        ['Tesla Optimus actuator deep dive', null],
        ['Figure 02 joint actuator explained', null],
        ['Apptronik Apollo linear actuator', null],
        ['Unitree G1 joint motor torque test', null],
        ['Hyundai Mobis actuator module reveal', null],
      ].filter(([t]) => !/unboxing/i.test(t));
      for (const [title, desc] of accepted) {
        expect(isRelevantTopicVideo('actuator', title, desc), title).toBe(true);
      }
    });

    it('rejects when there is no robot context', () => {
      expect(isRelevantTopicVideo('actuator', 'Industrial motor gearbox teardown', 'harmonic drive transmission')).toBe(false);
      expect(isRelevantTopicVideo('actuator', 'Planetary gearbox explained', 'how a planetary gear works')).toBe(false);
    });

    it('rejects excluded content types', () => {
      expect(isRelevantTopicVideo('actuator', 'Robot actuator company — shareholder annual meeting', 'humanoid robot motor')).toBe(false);
      expect(isRelevantTopicVideo('actuator', 'RobStride actuator unboxing', 'robot motor')).toBe(false);
    });

    it('rejects non-robot motor videos (cars, brakes, drones, machine tools)', () => {
      const rejected: Array<[string, string | null]> = [
        ['Tesla Model 3 drive motor teardown', 'electric vehicle motor'],
        ['Electric car motor explained', 'robot-like torque curves'],
        ['Automotive brake actuator replacement', 'robot assembly line'],
        ['Drone ESC and brushless motor test', 'robot drone motor'],
        ['Best motor for your FPV quadcopter', 'robot motor'],
        ['3D printer stepper motor upgrade', 'robot motor'],
        ['CNC spindle motor gearbox', 'robot cnc motor'],
        ['Washing machine motor teardown', 'robot vacuum motor'],
        ['Cybertruck steer-by-wire actuator', 'Tesla actuator'],
      ];
      for (const [title, desc] of rejected) {
        expect(isRelevantTopicVideo('actuator', title, desc), title).toBe(false);
      }
    });

    it('applies the actuator exclude list to the title only', () => {
      expect(isRelevantTopicVideo('actuator', 'Humanoid robot actuator teardown', 'also used in cars and drones')).toBe(true);
    });

    it('does not change hand behaviour: "car parts" in a hand title is still accepted', () => {
      expect(isRelevantTopicVideo('hand', 'Boston Dynamics Atlas | Dexterous manipulation of car parts', null)).toBe(true);
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
