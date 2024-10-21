import https from 'https';
import url from 'url';
import { config } from '../config';

// Define log levels
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Configuration interface
interface LoggerConfig {
  webhookUrl: string;
  defaultLevel?: LogLevel;
}

class DiscordLogger {
  private webhookUrl: string;
  private defaultLevel: LogLevel;

  constructor(config: LoggerConfig) {
    this.webhookUrl = config.webhookUrl;
    this.defaultLevel = config.defaultLevel || 'info';
  }

  private sendToDiscord(message: string, level: LogLevel): Promise<string> {
    return new Promise((resolve, reject) => {
      const discordUrl = url.parse(this.webhookUrl);
      const data = JSON.stringify({
        content: `[${level.toUpperCase()}] ${message}`
      });

      const options: https.RequestOptions = {
        hostname: discordUrl.hostname,
        port: 443,
        path: discordUrl.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 204) {
            resolve('Message sent successfully');
          } else {
            reject(`Failed to send message. Status code: ${res.statusCode}`);
          }
        });
      });

      req.on('error', (error: Error) => {
        reject(`Error: ${error.message}`);
      });

      req.write(data);
      req.end();
    });
  }

  public async log(message: string, level?: LogLevel): Promise<void> {
    const logLevel = level || this.defaultLevel;
    try {
      const result = await this.sendToDiscord(message, logLevel);
      console.log(result);
    } catch (error) {
      console.error('Failed to send to Discord:', error);
    }
  }

  public debug(message: string): Promise<void> {
    return this.log(message, 'debug');
  }

  public info(message: string): Promise<void> {
    return this.log(message, 'info');
  }

  public warn(message: string): Promise<void> {
    return this.log(message, 'warn');
  }

  public error(message: string): Promise<void> {
    return this.log(message, 'error');
  }
}

// Usage example
const logger = new DiscordLogger({
  webhookUrl: config.discord_webhook_url || "",
  defaultLevel: 'info'
});

export default logger;