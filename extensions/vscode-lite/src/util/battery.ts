import { EventEmitter } from "node:events";
import si from "systeminformation";

const POLL_INTERVAL_MS = 10_000;

export interface LiteBattery {
  isACConnected(): boolean;
  onChangeAC(listener: (connected: boolean) => void): { dispose(): void };
  dispose(): void;
}

export function createBatteryMonitor(): LiteBattery {
  const emitter = new EventEmitter();
  let disposed = false;
  let connected = true;
  let interval: NodeJS.Timeout | undefined;

  async function refreshBatteryStatus() {
    try {
      const info = await si.battery();
      if (disposed) {
        return;
      }

      const nextConnected = info.acConnected ?? connected;
      if (nextConnected !== connected) {
        connected = nextConnected;
        emitter.emit("change", connected);
      }
    } catch {
      // Ignore errors during battery probing
    }
  }

  interval = setInterval(refreshBatteryStatus, POLL_INTERVAL_MS);
  void refreshBatteryStatus();

  return {
    isACConnected() {
      return connected;
    },
    onChangeAC(listener) {
      emitter.on("change", listener);
      return {
        dispose() {
          emitter.off("change", listener);
        },
      };
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      if (interval) {
        clearInterval(interval);
        interval = undefined;
      }
      emitter.removeAllListeners();
    },
  };
}
