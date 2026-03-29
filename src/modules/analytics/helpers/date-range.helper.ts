import { AnalyticsPeriod } from '../dto/analytics-query.dto';

export interface DateRange {
    start: Date;
    end: Date;
    previousStart: Date;
    previousEnd: Date;
}

export function getDateRange(period: AnalyticsPeriod, startDate?: string, endDate?: string): DateRange {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now);
    let previousStart: Date;
    let previousEnd: Date;

    switch (period) {
        case 'today':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            previousEnd = new Date(start);
            previousEnd.setMilliseconds(-1);
            previousStart = new Date(previousEnd.getFullYear(), previousEnd.getMonth(), previousEnd.getDate());
            break;
        case 'week':
            start = new Date(now);
            start.setDate(now.getDate() - 7);
            previousEnd = new Date(start);
            previousEnd.setMilliseconds(-1);
            previousStart = new Date(previousEnd);
            previousStart.setDate(previousEnd.getDate() - 7);
            break;
        case 'month':
            start = new Date(now);
            start.setDate(now.getDate() - 30);
            previousEnd = new Date(start);
            previousEnd.setMilliseconds(-1);
            previousStart = new Date(previousEnd);
            previousStart.setDate(previousEnd.getDate() - 30);
            break;
        case 'year':
            start = new Date(now);
            start.setFullYear(now.getFullYear() - 1);
            previousEnd = new Date(start);
            previousEnd.setMilliseconds(-1);
            previousStart = new Date(previousEnd);
            previousStart.setFullYear(previousEnd.getFullYear() - 1);
            break;
        case 'custom':
            start = startDate ? new Date(startDate) : new Date(now.setDate(now.getDate() - 30));
            end = endDate ? new Date(endDate) : new Date();
            const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            previousEnd = new Date(start);
            previousEnd.setMilliseconds(-1);
            previousStart = new Date(previousEnd);
            previousStart.setDate(previousEnd.getDate() - diffDays);
            break;
        default:
            start = new Date(now.setDate(now.getDate() - 30));
            previousEnd = new Date(start);
            previousEnd.setMilliseconds(-1);
            previousStart = new Date(previousEnd.setDate(previousEnd.getDate() - 30));
    }

    return { start, end, previousStart, previousEnd };
}
