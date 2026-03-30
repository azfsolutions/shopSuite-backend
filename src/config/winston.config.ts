import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

export const winstonConfig: WinstonModuleOptions = {
    transports: [
        new winston.transports.Console({
            level: isProduction ? 'info' : 'debug',
            format: isProduction
                ? winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json(),
                )
                : winston.format.combine(
                    winston.format.timestamp({ format: 'HH:mm:ss' }),
                    winston.format.colorize(),
                    winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                        const ctx = context ? `[${context}]` : '';
                        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                        return `${timestamp} ${level} ${ctx} ${message}${metaStr}`;
                    }),
                ),
        }),
    ],
};
