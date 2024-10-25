import { tracker } from "clients/google-analytics";
import { EventEmitter } from "stream";
import { v4 as uuidv4 } from "uuid";

// Session Tracker Options Type
type SessionTrackerOptions = {
  pingTimeout?: number;
  inactivityThreshold?: number;
  cleanupInterval?: number;
};

// Base session data
type SessionData = {
  id: string;
  socketId: string;
  userUUID: string;
  startTime: number;
  lastPing: number;
  totalTime: number;
  isActive: boolean;
  pings: PingData[];
};

// Ping data structure
type PingData = {
  timestamp: number;
  duration: number;
};

// Session metrics for end session
type SessionMetrics = {
  sessionId: string;
  userUUID: string;
  startTime: number;
  endTime: number;
  totalTime: number;
  averageTimeBetweenPings: number;
};

// Session metrics for get metrics
type CurrentSessionMetrics = {
  sessionId: string;
  userUUID: string;
  startTime: number;
  totalTime: number;
  isActive: boolean;
  lastPing: number;
};

export class SessionTracker extends EventEmitter {
  private sessions: Map<string, SessionData>;
  private options: Required<SessionTrackerOptions>;

  constructor(options: SessionTrackerOptions = {}) {
    super();
    this.sessions = new Map<string, SessionData>();
    this.options = {
      pingTimeout: options.pingTimeout || 30000,
      inactivityThreshold: options.inactivityThreshold || 300000,
      cleanupInterval: options.cleanupInterval || 60000,
    };

    setInterval(
      () => this.cleanupInactiveSessions(),
      this.options.cleanupInterval,
    );
  }

  createSession(socketId: string, userUUID: string): SessionData {
    const session: SessionData = {
      id: uuidv4(),
      socketId,
      userUUID,
      startTime: Date.now(),
      lastPing: Date.now(),
      totalTime: 0,
      isActive: true,
      pings: [],
    };

    this.sessions.set(socketId, session);
    // tracker.sendEvent(user.uuid, "CLIENT_START", {});
    return session;
  }

  handlePing(socketId: string): SessionData | null {
    const session = this.sessions.get(socketId);
    if (!session) return null;

    const currentTime = Date.now();
    const timeSinceLastPing = currentTime - session.lastPing;

    if (timeSinceLastPing <= this.options.pingTimeout) {
      session.totalTime += timeSinceLastPing;
      session.pings.push({
        timestamp: currentTime,
        duration: timeSinceLastPing,
      });
    }

    session.lastPing = currentTime;

    tracker.sendEvent(session.userUUID, "CLIENT_PING", {
      sessionId: session.id,
      userUUID: session.userUUID,
      duration: timeSinceLastPing,
    });

    return session;
  }

  endSession(socketId: string): SessionMetrics | null {
    const session = this.sessions.get(socketId);
    if (!session) return null;

    const endTime = Date.now();
    const finalDuration = endTime - session.lastPing;

    if (finalDuration <= this.options.pingTimeout) {
      session.totalTime += finalDuration;
    }

    session.isActive = false;
    this.sessions.delete(socketId);

    const sessionMetrics: SessionMetrics = {
      sessionId: session.id,
      userUUID: session.userUUID,
      startTime: session.startTime,
      endTime,
      totalTime: session.totalTime,
      averageTimeBetweenPings: this.calculateAveragePingTime(session),
    };

    // tracker.sendEvent(session.userUUID, "CLIENT_END", { ...sessionMetrics });
    return sessionMetrics;
  }

  calculateAveragePingTime(session: SessionData): number {
    if (session.pings.length < 2) return 0;

    const totalDuration = session.pings.reduce(
      (sum, ping) => sum + ping.duration,
      0,
    );
    return Math.round(totalDuration / session.pings.length);
  }

  cleanupInactiveSessions(): void {
    const currentTime = Date.now();

    for (const [socketId, session] of this.sessions) {
      const inactiveTime = currentTime - session.lastPing;
      if (inactiveTime > this.options.inactivityThreshold) {
        this.endSession(socketId);
      }
    }
  }

  getSessionMetrics(socketId: string): CurrentSessionMetrics | null {
    const session = this.sessions.get(socketId);
    if (!session) return null;

    return {
      sessionId: session.id,
      userUUID: session.userUUID,
      startTime: session.startTime,
      totalTime: session.totalTime,
      isActive: session.isActive,
      lastPing: session.lastPing,
    };
  }
}
