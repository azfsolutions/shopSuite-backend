import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { Public } from '../decorators';

// ============================================================
// 🏥 HEALTH CHECK CONTROLLER
// ============================================================
// El Health Check es CRÍTICO en producción porque:
//
// 1. LOAD BALANCERS: AWS ALB, Nginx, etc. usan /health para
//    saber si tu servidor está vivo. Si no responde, lo sacan
//    del pool y redirigen tráfico a otros servidores.
//
// 2. KUBERNETES: Los readiness/liveness probes llaman a /health.
//    Si falla, K8s reinicia el pod automáticamente.
//
// 3. MONITORING: Herramientas como UptimeRobot, Better Uptime,
//    etc. hacen ping a /health cada minuto para alertarte
//    si tu API cae.
//
// 4. CI/CD: Después de deploy, puedes verificar que la nueva
//    versión está funcionando antes de enviar tráfico.
//
// ¿QUÉ DEBE VERIFICAR?
// - Que el servidor responde (básico)
// - Que la DB está conectada (crítico)
// - Opcionalmente: Redis, servicios externos, etc.
// ============================================================

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    version: string;
    checks: {
        database: 'connected' | 'disconnected';
    };
}

@ApiTags('health')
@Controller('health')
export class HealthController {
    constructor(private readonly prisma: PrismaService) { }

    @Public()
    @Get()
    @ApiOperation({ summary: 'Health check endpoint' })
    @ApiResponse({ status: 200, description: 'Service is healthy' })
    @ApiResponse({ status: 503, description: 'Service is unhealthy' })
    async check(): Promise<HealthStatus> {
        // Verificar conexión a la base de datos
        let databaseStatus: 'connected' | 'disconnected' = 'disconnected';

        try {
            // Query simple para verificar que la DB responde
            await this.prisma.$queryRaw`SELECT 1`;
            databaseStatus = 'connected';
        } catch (error) {
            // La DB no responde - esto es crítico
            databaseStatus = 'disconnected';
        }

        // Determinar estado general
        const isHealthy = databaseStatus === 'connected';

        return {
            status: isHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()), // Segundos desde que inició
            version: process.env.npm_package_version || '1.0.0',
            checks: {
                database: databaseStatus,
            },
        };
    }

    // ============================================================
    // READY CHECK - Para Kubernetes readiness probe
    // ============================================================
    // Diferencia entre liveness y readiness:
    // - Liveness: ¿El servidor está vivo? Si no, mátalo y reinicia
    // - Readiness: ¿El servidor puede recibir tráfico? Si no, no le envíes
    //
    // Ejemplo: El servidor está vivo pero la DB está desconectada.
    // Liveness: OK (no reiniciar, el problema es la DB)
    // Readiness: FAIL (no enviar tráfico hasta que la DB vuelva)
    // ============================================================
    @Public()
    @Get('ready')
    @ApiOperation({ summary: 'Readiness check for load balancers' })
    async ready(): Promise<{ ready: boolean }> {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return { ready: true };
        } catch {
            return { ready: false };
        }
    }

    // ============================================================
    // LIVE CHECK - Para Kubernetes liveness probe
    // ============================================================
    // Solo verifica que el proceso Node.js responde.
    // No verifica dependencias externas.
    // ============================================================
    @Public()
    @Get('live')
    @ApiOperation({ summary: 'Liveness check - is the process alive?' })
    async live(): Promise<{ alive: boolean }> {
        return { alive: true };
    }
}
