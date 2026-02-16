import { Test, TestingModule } from '@nestjs/testing';
import { SanitizationService } from './sanitization.service';

// ============================================================
// 🧪 SANITIZATION SERVICE - UNIT TESTS
// ============================================================
// Estos tests son CRÍTICOS porque verifican que tu defensa
// contra XSS (Cross-Site Scripting) funciona correctamente.
//
// Si un test falla, significa que hay una vulnerabilidad
// de seguridad que debe ser corregida ANTES de ir a producción.
// ============================================================

describe('SanitizationService', () => {
    let service: SanitizationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SanitizationService],
        }).compile();

        service = module.get<SanitizationService>(SanitizationService);
    });

    // ============================================================
    // PLAIN TEXT SANITIZATION
    // ============================================================
    describe('sanitizePlainText', () => {
        it('should remove all HTML tags', () => {
            const input = '<script>alert("XSS")</script>Hello';
            const result = service.sanitizePlainText(input);
            expect(result).toBe('Hello');
        });

        it('should remove event handlers', () => {
            const input = '<img onerror="alert(1)" src="x">Test';
            const result = service.sanitizePlainText(input);
            expect(result).toBe('Test');
        });

        it('should handle nested tags', () => {
            const input = '<div><script>evil()</script><p>Safe text</p></div>';
            const result = service.sanitizePlainText(input);
            expect(result).toBe('Safe text');
        });

        it('should preserve plain text', () => {
            const input = 'Normal text without HTML';
            const result = service.sanitizePlainText(input);
            expect(result).toBe('Normal text without HTML');
        });

        it('should handle null/undefined gracefully', () => {
            expect(service.sanitizePlainText(null as any)).toBe(null);
            expect(service.sanitizePlainText(undefined as any)).toBe(undefined);
        });

        it('should trim whitespace', () => {
            const input = '  Hello World  ';
            const result = service.sanitizePlainText(input);
            expect(result).toBe('Hello World');
        });
    });

    // ============================================================
    // RICH TEXT SANITIZATION
    // ============================================================
    describe('sanitizeRichText', () => {
        it('should allow basic formatting tags', () => {
            const input = '<p><strong>Bold</strong> and <em>italic</em></p>';
            const result = service.sanitizeRichText(input);
            expect(result).toContain('<strong>Bold</strong>');
            expect(result).toContain('<em>italic</em>');
        });

        it('should remove script tags completely', () => {
            const input = '<p>Safe</p><script>alert("XSS")</script><p>Also safe</p>';
            const result = service.sanitizeRichText(input);
            expect(result).not.toContain('script');
            expect(result).not.toContain('alert');
        });

        it('should remove dangerous attributes', () => {
            const input = '<p onclick="evil()">Click me</p>';
            const result = service.sanitizeRichText(input);
            expect(result).not.toContain('onclick');
            expect(result).toBe('<p>Click me</p>');
        });

        it('should allow safe links with https', () => {
            const input = '<a href="https://example.com">Link</a>';
            const result = service.sanitizeRichText(input);
            expect(result).toContain('href="https://example.com"');
        });

        it('should remove javascript: URLs', () => {
            const input = '<a href="javascript:alert(1)">Malicious</a>';
            const result = service.sanitizeRichText(input);
            expect(result).not.toContain('javascript:');
        });

        it('should add target blank to links for security', () => {
            const input = '<a href="https://example.com">External</a>';
            const result = service.sanitizeRichText(input);
            expect(result).toContain('target="_blank"');
            // sanitize-html añade target pero no rel en la config actual
        });

        it('should handle iframes (remove them)', () => {
            const input = '<iframe src="https://evil.com"></iframe>Safe content';
            const result = service.sanitizeRichText(input);
            expect(result).not.toContain('iframe');
            expect(result).toBe('Safe content');
        });
    });

    // ============================================================
    // NUMBER SANITIZATION
    // ============================================================
    describe('sanitizeNumber', () => {
        it('should return valid numbers as-is', () => {
            expect(service.sanitizeNumber(42)).toBe(42);
            expect(service.sanitizeNumber(3.14)).toBe(3.14);
            expect(service.sanitizeNumber(-10)).toBe(-10);
        });

        it('should parse string numbers', () => {
            expect(service.sanitizeNumber('42')).toBe(42);
            expect(service.sanitizeNumber('3.14')).toBe(3.14);
        });

        it('should return default for invalid input', () => {
            expect(service.sanitizeNumber('not a number')).toBe(0);
            expect(service.sanitizeNumber(null, 100)).toBe(100);
            expect(service.sanitizeNumber(undefined, 50)).toBe(50);
        });

        it('should handle Infinity/NaN', () => {
            expect(service.sanitizeNumber(Infinity)).toBe(0);
            expect(service.sanitizeNumber(NaN)).toBe(0);
        });

        it('should handle edge cases in strings', () => {
            expect(service.sanitizeNumber('100.50')).toBe(100.5);
            expect(service.sanitizeNumber('-50')).toBe(-50);
        });
    });

    // ============================================================
    // SLUG SANITIZATION
    // ============================================================
    describe('sanitizeSlug', () => {
        it('should convert to lowercase', () => {
            expect(service.sanitizeSlug('HELLO')).toBe('hello');
        });

        it('should replace spaces with hyphens', () => {
            expect(service.sanitizeSlug('hello world')).toBe('hello-world');
        });

        it('should remove special characters', () => {
            expect(service.sanitizeSlug('hello@world!')).toBe('helloworld');
        });

        it('should handle accents', () => {
            expect(service.sanitizeSlug('Café Latté')).toBe('cafe-latte');
        });

        it('should collapse multiple hyphens', () => {
            expect(service.sanitizeSlug('hello---world')).toBe('hello-world');
        });

        it('should remove leading/trailing hyphens', () => {
            expect(service.sanitizeSlug('-hello-world-')).toBe('hello-world');
        });

        it('should handle complex product names', () => {
            expect(service.sanitizeSlug('iPhone 15 Pro Max (256GB) - Negro'))
                .toBe('iphone-15-pro-max-256gb-negro');
        });
    });

    // ============================================================
    // EMAIL SANITIZATION
    // ============================================================
    describe('sanitizeEmail', () => {
        it('should convert to lowercase', () => {
            expect(service.sanitizeEmail('JOHN@EXAMPLE.COM')).toBe('john@example.com');
        });

        it('should trim whitespace', () => {
            expect(service.sanitizeEmail('  john@example.com  ')).toBe('john@example.com');
        });

        it('should remove internal spaces', () => {
            expect(service.sanitizeEmail('john @ example . com')).toBe('john@example.com');
        });
    });

    // ============================================================
    // OBJECT SANITIZATION
    // ============================================================
    describe('sanitizeObject', () => {
        it('should sanitize multiple fields based on rules', () => {
            const input = {
                name: '<script>alert(1)</script>Product Name',
                description: '<p><strong>Bold</strong></p><script>x</script>',
                slug: 'My Product!',
                email: ' TEST@EMAIL.COM ',
                price: 100,
            };

            const result = service.sanitizeObject(input, {
                plainText: ['name'],
                richText: ['description'],
                slug: ['slug'],
                email: ['email'],
            });

            expect(result.name).toBe('Product Name');
            expect(result.description).toContain('<strong>Bold</strong>');
            expect(result.description).not.toContain('script');
            expect(result.slug).toBe('my-product');
            expect(result.email).toBe('test@email.com');
            expect(result.price).toBe(100); // No modificado
        });

        it('should not modify unspecified fields', () => {
            const input = { name: 'Test', unrelated: '<script>x</script>' };
            const result = service.sanitizeObject(input, { plainText: ['name'] });
            expect(result.unrelated).toBe('<script>x</script>');
        });
    });
});
