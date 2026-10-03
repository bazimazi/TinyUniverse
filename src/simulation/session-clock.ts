export interface ClockStep { seconds: number; needsCatchUp: boolean }

// Long gaps run at the offline rate and cap, rather than the selected live speed.
export class SessionClock {
  private wallTimestamp: number;
  private frameTimestamp: number;

  constructor(wallTimestamp: number, frameTimestamp: number) {
    this.wallTimestamp = wallTimestamp;
    this.frameTimestamp = frameTimestamp;
  }

  reset(wallTimestamp: number, frameTimestamp: number): void {
    this.wallTimestamp = wallTimestamp;
    this.frameTimestamp = frameTimestamp;
  }

  sample(wallTimestamp: number, frameTimestamp: number): ClockStep {
    const seconds = Math.max(0, (frameTimestamp - this.frameTimestamp) / 1000);
    const wallSeconds = Math.max(0, (wallTimestamp - this.wallTimestamp) / 1000);
    this.wallTimestamp = wallTimestamp;
    // A click can arrive after a queued animation frame's timestamp.
    this.frameTimestamp = Math.max(this.frameTimestamp, frameTimestamp);
    return Math.max(seconds, wallSeconds) > 5 ? { seconds: 0, needsCatchUp: true } : { seconds, needsCatchUp: false };
  }
}
