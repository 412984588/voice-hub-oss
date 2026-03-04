/**
 * @voice-hub/audio-engine
 *
 * Discord 接收看门狗 - 检测音频接收中断
 */

/** 看门狗状态 */
enum WatchdogState {
  OK = "ok",
  WARNING = "warning",
  TIMEOUT = "timeout",
}

/** 看门狗配置 */
interface WatchdogConfig {
  /** 警告阈值（毫秒） */
  warningThresholdMs: number;
  /** 超时阈值（毫秒） */
  timeoutThresholdMs: number;
  /** 检查间隔（毫秒） */
  checkIntervalMs: number;
}

/** Discord 接收看门狗 */
export class DiscordReceiveWatchdog {
  private config: WatchdogConfig;
  private lastPacketTime: number;
  private state: WatchdogState = WatchdogState.OK;
  private timer: ReturnType<typeof setInterval> | null = null;
  private callbacks: {
    onWarning?: () => void;
    onTimeout?: () => void;
    onRecover?: () => void;
  } = {};

  constructor(config: WatchdogConfig) {
    this.config = config;
    this.lastPacketTime = Date.now();
  }

  /** 设置回调 */
  setCallbacks(callbacks: {
    onWarning?: () => void;
    onTimeout?: () => void;
    onRecover?: () => void;
  }): void {
    this.callbacks = callbacks;
  }

  /** 启动看门狗 */
  start(): void {
    if (this.timer) {
      return;
    }

    this.lastPacketTime = Date.now();

    this.timer = setInterval(() => {
      this.check();
    }, this.config.checkIntervalMs);
  }

  /** 停止看门狗 */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** 记录接收到数据包 */
  feed(): void {
    this.lastPacketTime = Date.now();

    if (this.state !== WatchdogState.OK) {
      this.state = WatchdogState.OK;
      this.callbacks.onRecover?.();
    }
  }

  /** 检查状态 */
  private check(): void {
    const now = Date.now();
    const elapsed = now - this.lastPacketTime;

    if (elapsed > this.config.timeoutThresholdMs) {
      if (this.state !== WatchdogState.TIMEOUT) {
        this.state = WatchdogState.TIMEOUT;
        this.callbacks.onTimeout?.();
      }
    } else if (elapsed > this.config.warningThresholdMs) {
      if (this.state !== WatchdogState.WARNING) {
        this.state = WatchdogState.WARNING;
        this.callbacks.onWarning?.();
      }
    } else {
      if (this.state !== WatchdogState.OK) {
        this.state = WatchdogState.OK;
        this.callbacks.onRecover?.();
      }
    }
  }

  /** 获取状态 */
  getState(): WatchdogState {
    return this.state;
  }

  /** 获取自上次包以来的时间（毫秒） */
  getTimeSinceLastPacket(): number {
    return Date.now() - this.lastPacketTime;
  }

  /** 重置看门狗 */
  reset(): void {
    this.lastPacketTime = Date.now();
    this.state = WatchdogState.OK;
  }
}
