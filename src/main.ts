import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './core/filters/global-exception.filter';
import { PrismaExceptionFilter } from './core/filters/prisma-exception.filter';
import { PrismaService } from './database/prisma.service';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const logger = new Logger('Bootstrap');

    // 🚨 GLOBAL EXCEPTION FILTERS
    // PrismaExceptionFilter va PRIMERO: captura errores de Prisma y los convierte en HTTP
    // GlobalExceptionFilter va SEGUNDO: captura todo lo demás
    app.useGlobalFilters(
        new PrismaExceptionFilter(),
        new GlobalExceptionFilter(),
    );

    // ============================================================
    // 🔐 SECURITY HEADERS - HELMET
    // ============================================================
    // Helmet configura múltiples headers HTTP de seguridad:
    // - X-Content-Type-Options: Previene MIME sniffing
    // - X-Frame-Options: Previene clickjacking (tu sitio en un iframe malicioso)
    // - X-XSS-Protection: Activa filtro XSS del navegador
    // - Strict-Transport-Security: Fuerza HTTPS
    // - Content-Security-Policy: Controla qué recursos puede cargar la página
    // ============================================================
    app.use(helmet({
        // Content Security Policy - Controla qué scripts/styles/imágenes se pueden cargar
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],                    // Solo recursos del mismo origen
                styleSrc: ["'self'", "'unsafe-inline'"],    // Permite estilos inline (necesario para algunos frameworks)
                imgSrc: ["'self'", "data:", "https:"],      // Imágenes: mismo origen, data URLs, y HTTPS
                scriptSrc: ["'self'"],                      // Scripts solo del mismo origen
                connectSrc: ["'self'", "https:"],           // APIs: mismo origen y HTTPS
            },
        },
        // HSTS - Fuerza HTTPS por 1 año
        hsts: {
            maxAge: 31536000,       // 1 año en segundos
            includeSubDomains: true, // Aplica a subdominios
            preload: true,           // Permite incluir en lista preload de navegadores
        },
        // X-Frame-Options - Previene que tu sitio sea embebido en iframes
        frameguard: { action: 'deny' },
        // Oculta el header X-Powered-By para no revelar que usamos Express
        hidePoweredBy: true,
        // Previene que el navegador "adivine" el tipo MIME
        noSniff: true,
        // Activa protección XSS del navegador
        xssFilter: true,
    }));

    // Global prefix
    app.setGlobalPrefix('api');

    // ============================================================
    // 🌐 CORS - Cross-Origin Resource Sharing
    // ============================================================
    // Controla qué dominios pueden hacer requests a tu API
    const isProduction = process.env.NODE_ENV === 'production';
    const allowedOrigins = isProduction
        ? [process.env.FRONTEND_URL || 'https://tu-dominio.com']  // Solo tu frontend en producción
        : [
            'http://localhost:3000',
            'http://localhost:3002',
            process.env.FRONTEND_URL,
        ].filter(Boolean);

    // Cache for custom domain CORS validation
    const customDomainCache = new Map<string, boolean>();
    const prisma = app.get(PrismaService);

    app.enableCors({
        origin: async (origin, callback) => {
            // Permitir requests sin origin (mobile apps, Postman, etc.)
            if (!origin) {
                callback(null, true);
                return;
            }

            if (allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            // Check if origin is a custom domain for any store
            try {
                const originHost = new URL(origin).hostname;

                // Check cache
                if (customDomainCache.has(originHost)) {
                    callback(null, customDomainCache.get(originHost)!);
                    return;
                }

                // Query database for custom domain
                const store = await prisma.store.findUnique({
                    where: { customDomain: originHost },
                    select: { id: true },
                });

                const isAllowed = !!store;
                customDomainCache.set(originHost, isAllowed);

                // Clear cache entry after 5 minutes
                setTimeout(() => customDomainCache.delete(originHost), 5 * 60 * 1000);

                if (isAllowed) {
                    callback(null, true);
                    return;
                }
            } catch {
                // If URL parsing fails or DB query fails, fall through
            }

            if (!isProduction) {
                // En desarrollo, loggear pero permitir
                logger.warn(`CORS: Permitiendo origen no listado en desarrollo: ${origin}`);
                callback(null, true);
            } else {
                // En producción, bloquear orígenes no autorizados
                logger.warn(`CORS: Origen bloqueado: ${origin}`);
                callback(new Error('No permitido por CORS'), false);
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Store-Id'],
    });

    // ============================================================
    // 📏 LÍMITES DE PAYLOAD
    // ============================================================
    // Limita el tamaño de los requests para prevenir ataques DoS
    // Si alguien intenta enviar un JSON de 1GB, el servidor lo rechazará
    // ============================================================
    // Nota: Express ya tiene límite por defecto, pero podemos configurarlo
    // en el middleware del body-parser si es necesario

    // ============================================================
    // ✅ VALIDATION PIPE
    // ============================================================
    // whitelist: Elimina propiedades que no están en el DTO (previene inyección de campos)
    // forbidNonWhitelisted: Lanza error si envían campos extra (más estricto)
    // transform: Convierte tipos automáticamente (string "1" → number 1)
    // ============================================================
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // ============================================================
    // 📚 SWAGGER DOCUMENTATION
    // ============================================================
    // Solo habilitar en desarrollo o si se configura explícitamente
    const enableSwagger = !isProduction || process.env.ENABLE_SWAGGER === 'true';

    if (enableSwagger) {
        const config = new DocumentBuilder()
            .setTitle('ShopSuite API')
            .setDescription('Multi-tenant SaaS E-commerce Platform API')
            .setVersion('1.0')
            .addBearerAuth()
            .addTag('auth', 'Authentication endpoints')
            .addTag('users', 'User management')
            .addTag('stores', 'Store management')
            .addTag('products', 'Product management')
            .addTag('orders', 'Order management')
            .addTag('storefront', 'Public storefront API')
            .build();

        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api/docs', app, document);
    }

    const port = process.env.PORT || 3001;
    await app.listen(port);

    logger.log(`🚀 ShopSuite API running on http://localhost:${port}`);
    logger.log(`🔐 Security headers: ENABLED`);
    logger.log(`🌐 CORS origins: ${allowedOrigins.join(', ')}`);
    logger.log(`🔒 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    if (enableSwagger) {
        logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
    }
}

bootstrap();
