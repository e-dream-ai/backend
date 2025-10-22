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
  clientType?: string;
  clientVersion?: string;
  startTime: number;
  lastPing: number;
  totalTimeInSeconds: number;
  isActive: boolean;
  pings: PingData[];
  webClientActive?: boolean;
};

// Ping data structure
type PingData = {
  timestamp: number;
  duration_seconds: number;
};

// Session metrics for end session
type SessionMetrics = {
  sessionId: string;
  userUUID: string;
  startTime: number;
  endTime: number;
  totalTimeInSeconds: number;
  averageTimeBetweenPings: number;
};

// Session metrics for get metrics
type CurrentSessionMetrics = {
  sessionId: string;
  userUUID: string;
  startTime: number;
  totalTimeInSeconds: number;
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

  createSession({
    socketId,
    userUUID,
    clientType,
    clientVersion,
  }: {
    socketId: string;
    userUUID: string;
    clientType?: string;
    clientVersion?: string;
  }): SessionData {
    const session: SessionData = {
      id: uuidv4(),
      socketId,
      userUUID,
      clientType,
      clientVersion,
      startTime: Date.now(),
      lastPing: Date.now(),
      totalTimeInSeconds: 0,
      isActive: true,
      pings: [],
      webClientActive: false,
    };

    this.sessions.set(socketId, session);

    tracker.sendEvent(session.userUUID, "CLIENT_START", {
      socket_session_id: session.id,
      start_time: session.startTime,
      app_type: session.clientType,
      app_version: session.clientVersion,
    });
    return session;
  }

  handlePing(socketId: string): SessionData | null {
    const session = this.sessions.get(socketId);
    if (!session) return null;

    const currentTime = Date.now();
    const timeSinceLastPing = currentTime - session.lastPing;

    if (timeSinceLastPing <= this.options.pingTimeout) {
      session.totalTimeInSeconds += timeSinceLastPing;
      session.pings.push({
        timestamp: currentTime,
        duration_seconds: Math.round(timeSinceLastPing / 1000),
      });
    }

    session.lastPing = currentTime;

    tracker.sendEvent(session.userUUID, "CLIENT_PING", {
      socket_session_id: session.id,
      duration_seconds: Math.round(timeSinceLastPing / 1000),
      app_type: session.clientType,
      app_version: session.clientVersion,
    });

    return session;
  }

  endSession(socketId: string): SessionMetrics | null {
    const session = this.sessions.get(socketId);
    if (!session) return null;

    const endTime = Date.now();

    // Calculate total session time in seconds
    const totalSessionTimeSeconds = Math.round(
      (endTime - session.startTime) / 1000,
    );

    session.isActive = false;
    this.sessions.delete(socketId);

    const sessionMetrics: SessionMetrics = {
      sessionId: session.id,
      userUUID: session.userUUID,
      startTime: session.startTime,
      endTime,
      totalTimeInSeconds: totalSessionTimeSeconds,
      averageTimeBetweenPings: this.calculateAveragePingTime(session),
    };

    tracker.sendEvent(session.userUUID, "CLIENT_END", {
      socket_session_id: session.id,
      start_time: sessionMetrics.startTime,
      end_time: endTime,
      duration_seconds: sessionMetrics.totalTimeInSeconds,
      app_type: session.clientType,
      app_version: session.clientVersion,
    });
    return sessionMetrics;
  }

  setWebClientActive(socketId: string, isActive: boolean): void {
    const session = this.sessions.get(socketId);
    if (!session) return;
    session.webClientActive = Boolean(isActive);
  }

  isWebClientActive(socketId: string): boolean {
    const session = this.sessions.get(socketId);
    return Boolean(session?.webClientActive);
  }

  anyWebClientActive(socketIds: Iterable<string>): boolean {
    for (const id of socketIds) {
      if (this.isWebClientActive(id)) return true;
    }
    return false;
  }

  calculateAveragePingTime(session: SessionData): number {
    if (session.pings.length < 2) return 0;

    const totalDuration = session.pings.reduce(
      (sum, ping) => sum + ping.duration_seconds,
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
      totalTimeInSeconds: session.totalTimeInSeconds,
      isActive: session.isActive,
      lastPing: session.lastPing,
    };
  }
}
