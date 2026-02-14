
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Version Consistency', () => {
    const packageJsonPath = path.resolve(__dirname, '../package.json');
    const appJsPath = path.resolve(__dirname, '../js/app.js');
    const swJsPath = path.resolve(__dirname, '../sw.js');
    const indexHtmlPath = path.resolve(__dirname, '../index.html');

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const currentVersion = packageJson.version;

    it('should have the same version in js/app.js', () => {
        const appJsContent = fs.readFileSync(appJsPath, 'utf-8');
        // Look for version: 'x.y.z'
        const match = appJsContent.match(/version:\s*'([^']+)'/);
        expect(match).toBeDefined();
        expect(match[1]).toBe(currentVersion);
    });

    it('should have the same version in sw.js cache name', () => {
        const swJsContent = fs.readFileSync(swJsPath, 'utf-8');
        // Look for CACHE_NAME = 'hyaena-vX.Y.Z'
        const match = swJsContent.match(/CACHE_NAME\s*=\s*'hyaena-v([^']+)'/);
        expect(match).toBeDefined();
        expect(match[1]).toBe(currentVersion);
    });

    it('should have the same version in index.html footer', () => {
        const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');
        // Look for vX.Y.Z in text
        const match = indexHtmlContent.match(/Hyaena v([\d\.]+)/);
        expect(match).toBeDefined();
        expect(match[1]).toBe(currentVersion);
    });

    it('should have the same version in index.html script tags', () => {
        const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');
        // Look for .js?v=X.Y.Z
        // We just check one instance or all
        const matches = [...indexHtmlContent.matchAll(/\.js\?v=([\d\.]+)/g)];
        expect(matches.length).toBeGreaterThan(0);
        matches.forEach(match => {
            expect(match[1]).toBe(currentVersion);
        });
    });
});
