'use client';

import {
  AlertTriangle,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Clock3,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type LogLevel = 'info' | 'error' | 'warning' | 'success' | 'debug';
type LevelFilter = LogLevel | 'all';
type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'unconfigured';

interface LogEntry {
  id: number;
  level: LogLevel;
  message: string;
  timestamp: string;
  source: string;
}

const MAX_LOGS = 500;
const levels: LogLevel[] = ['error', 'warning', 'info', 'success', 'debug'];
const logLevelSet = new Set<string>(levels);

const isLogLevel = (value: unknown): value is LogLevel =>
  typeof value === 'string' && logLevelSet.has(value);

const isLevelFilter = (value: string): value is LevelFilter =>
  value === 'all' || isLogLevel(value);

const parseLog = (payload: string, id: number): LogEntry => {
  try {
    const parsed: unknown = JSON.parse(payload);
    if (typeof parsed === 'object' && parsed !== null) {
      const record = parsed as Record<string, unknown>;
      const timestamp =
        typeof record.timeStamp === 'string' &&
        !Number.isNaN(Date.parse(record.timeStamp))
          ? record.timeStamp
          : new Date().toISOString();

      return {
        id,
        level: isLogLevel(record.type) ? record.type : 'info',
        message:
          typeof record.message === 'string' ? record.message : payload,
        timestamp,
        source:
          typeof record.source === 'string' && record.source.trim()
            ? record.source
            : 'unknown-service',
      };
    }
  } catch {
    // Plain-text messages are also accepted from the socket.
  }

  return {
    id,
    level: 'info',
    message: payload,
    timestamp: new Date().toISOString(),
    source: 'unknown-service',
  };
};

const formatTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const connectionLabels: Record<ConnectionState, string> = {
  connecting: 'Connecting',
  connected: 'Live',
  disconnected: 'Disconnected',
  unconfigured: 'Not configured',
};

const levelIcons: Record<LogLevel, typeof CircleHelp> = {
  error: CircleAlert,
  warning: AlertTriangle,
  info: CircleHelp,
  success: CircleCheck,
  debug: CircleHelp,
};

export default function LoggersPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [connectionError, setConnectionError] = useState('');
  const [paused, setPaused] = useState(false);
  const [receivedCount, setReceivedCount] = useState(0);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [search, setSearch] = useState('');
  const [reconnectKey, setReconnectKey] = useState(0);
  const pausedRef = useRef(paused);
  const nextId = useRef(0);
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URI;

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!socketUrl) {
      setConnection('unconfigured');
      setConnectionError('Set NEXT_PUBLIC_SOCKET_URI to connect to the logger service.');
      return;
    }

    let disposed = false;
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (disposed) return;
      setConnection('connecting');
      setConnectionError('');

      try {
        socket = new WebSocket(socketUrl);
      } catch {
        setConnection('disconnected');
        setConnectionError('Could not open a connection to the logger service.');
        retryTimer = setTimeout(connect, 3000);
        return;
      }

      socket.onopen = () => {
        if (disposed) return;
        setConnection('connected');
        setConnectionError('');
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        if (disposed || typeof event.data !== 'string') return;
        if (pausedRef.current) {
          setReceivedCount((count) => count + 1);
          return;
        }

        const log = parseLog(event.data, nextId.current++);
        setLogs((current) => [log, ...current].slice(0, MAX_LOGS));
        setReceivedCount((count) => count + 1);
      };

      socket.onerror = () => {
        if (!disposed) {
          setConnection('disconnected');
          setConnectionError('Connection interrupted. Reconnecting…');
          socket?.close();
        }
      };

      socket.onclose = () => {
        if (disposed) return;
        setConnection('disconnected');
        retryTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    };
  }, [reconnectKey, socketUrl]);

  const filteredLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
      const matchesSearch =
        !normalizedSearch ||
        log.message.toLowerCase().includes(normalizedSearch) ||
        log.source.toLowerCase().includes(normalizedSearch);
      return matchesLevel && matchesSearch;
    });
  }, [levelFilter, logs, search]);

  const errorCount = logs.filter((log) => log.level === 'error').length;
  const warningCount = logs.filter((log) => log.level === 'warning').length;
  const sourceCount = new Set(logs.map((log) => log.source)).size;

  const clearLogs = () => {
    setLogs([]);
    setReceivedCount(0);
  };

  return (
    <>
      <div className="page-heading logger-page-heading">
        <div>
          <div className="eyebrow">Observability</div>
          <h1>Loggers</h1>
          <p>Monitor application events streaming from your backend services.</p>
        </div>
        <div className={`logger-connection logger-connection-${connection}`} role="status">
          <span className="logger-connection-dot" />
          {connectionLabels[connection]}
        </div>
      </div>

      {connectionError && (
        <div className="inline-error logger-connection-error" role="status">
          <span>{connectionError}</span>
        </div>
      )}

      <section className="logger-stats" aria-label="Log summary">
        <div className="logger-stat">
          <span>Captured</span>
          <strong>{receivedCount.toLocaleString()}</strong>
          <small>{paused ? 'Capture paused' : `Up to ${MAX_LOGS} displayed`}</small>
        </div>
        <div className="logger-stat logger-stat-error">
          <span>Errors</span>
          <strong>{errorCount.toLocaleString()}</strong>
          <small>In the current buffer</small>
        </div>
        <div className="logger-stat logger-stat-warning">
          <span>Warnings</span>
          <strong>{warningCount.toLocaleString()}</strong>
          <small>In the current buffer</small>
        </div>
        <div className="logger-stat">
          <span>Services</span>
          <strong>{sourceCount.toLocaleString()}</strong>
          <small>Sources in the current buffer</small>
        </div>
      </section>

      <section className="panel logger-panel" aria-label="Live log stream">
        <div className="logger-toolbar">
          <div className="logger-stream-heading">
            <div className="logger-stream-icon"><Radio size={17} /></div>
            <div>
              <h2>Live stream</h2>
              <p>
                {connection === 'connected'
                  ? 'Listening for events from your services.'
                  : 'Waiting for the logger service connection.'}
              </p>
            </div>
          </div>
          <div className="logger-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setPaused((value) => !value)}
              disabled={connection === 'unconfigured'}
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setReconnectKey((key) => key + 1)}
              disabled={connection === 'unconfigured'}
              aria-label="Reconnect to logger service"
              title="Reconnect"
            >
              <RefreshCw size={14} />
              Reconnect
            </button>
            <button
              type="button"
              className="button button-secondary logger-clear-button"
              onClick={clearLogs}
              disabled={logs.length === 0 && receivedCount === 0}
            >
              <Trash2 size={14} />
              Clear
            </button>
          </div>
        </div>

        <div className="logger-filters">
          <label className="logger-search">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Search logs</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search messages or services…"
            />
          </label>
          <label className="logger-level-filter">
            <span>Level</span>
            <select
              value={levelFilter}
              onChange={(event) =>
                setLevelFilter(
                  isLevelFilter(event.target.value) ? event.target.value : 'all',
                )
              }
            >
              <option value="all">All levels</option>
              {levels.map((level) => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="logger-results">
          <div className="logger-results-heading">
            <span aria-live="polite">{filteredLogs.length.toLocaleString()} events</span>
            <span>{paused ? 'Stream paused' : 'Newest first'}</span>
          </div>
          {filteredLogs.length > 0 ? (
            <ol className="logger-list">
              {filteredLogs.map((log) => {
                const LevelIcon = levelIcons[log.level];
                return (
                  <li className="logger-entry" key={log.id}>
                    <time className="logger-time" dateTime={log.timestamp}>
                      <Clock3 size={13} />
                      {formatTime(log.timestamp)}
                    </time>
                    <span className={`logger-level logger-level-${log.level}`}>
                      <LevelIcon size={12} />
                      {log.level}
                    </span>
                    <span className="logger-source" title={log.source}>{log.source}</span>
                    <p className="logger-message">{log.message}</p>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="logger-empty">
              <div className="logger-empty-icon"><Radio size={19} /></div>
              <strong>{logs.length ? 'No matching events' : 'No log events yet'}</strong>
              <p>
                {logs.length
                  ? 'Try another search or severity level.'
                  : connection === 'connected'
                    ? 'New backend events will appear here as they arrive.'
                    : 'Events will appear here when the logger service is connected.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
