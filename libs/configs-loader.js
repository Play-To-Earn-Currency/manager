import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

export default function () {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const fullPath = resolve(__dirname, "../configs.txt");
        const data = readFileSync(fullPath, 'utf-8');
        const config = {};

        data.split('\n').forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const [key, value] = trimmedLine.split('=');
                if (key && value !== undefined) {
                    try {
                        config[key.trim()] = JSON.parse(value.trim());
                    } catch (_) {
                        config[key.trim()] = value.trim();
                    }
                }
            }
        });

        return config;
    } catch (error) {
        console.error('Cannot load configurations: ' + error);
        return null;
    }
}