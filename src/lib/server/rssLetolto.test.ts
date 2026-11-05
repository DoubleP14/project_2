import { describe, expect, it } from 'vitest';
import { tiltottIp, urlEllenorzes } from './rssLetolto';

describe('SSRF védelem: IP-címek', () => {
    it.each([
        '127.0.0.1', '10.0.0.1', '172.16.0.1', '172.31.255.255', '192.168.1.1',
        '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255',
        '192.0.0.1', '192.0.2.1', '198.18.0.1',
        '::1', '::', 'fc00::1', 'fd12::1', 'fe80::1', 'ff02::1',
        '::ffff:127.0.0.1', '::ffff:7f00:1', '64:ff9b::7f00:1',
        'nem-ip'
    ])('tiltott: %s', (ip) => {
        expect(tiltottIp(ip)).toBe(true);
    });

    it.each(['8.8.8.8', '1.1.1.1', '172.15.0.1', '172.32.0.1', '192.0.78.9', '100.128.0.1', '2606:4700:4700::1111', '::ffff:8.8.8.8'])(
        'engedélyezett: %s',
        (ip) => {
            expect(tiltottIp(ip)).toBe(false);
        }
    );
});

describe('SSRF védelem: URL-ek', () => {
    it.each(['https://telex.hu/rss', 'http://example.org:80/feed', 'https://example.org:443/feed'])('elfogadja: %s', (cim) => {
        expect(urlEllenorzes(cim).hostname).toBe(new URL(cim).hostname);
    });

    it.each([
        'file:///etc/passwd',
        'ftp://example.org/feed',
        'gopher://example.org',
        'http://127.0.0.1/admin',
        'http://[::1]/admin',
        'http://169.254.169.254/latest/meta-data',
        'http://2130706433/',
        'http://0x7f.0.0.1/',
        'https://example.org:5432/',
        'https://felhasznalo:jelszo@example.org/',
        'nem url'
    ])('elutasítja: %s', (cim) => {
        expect(() => urlEllenorzes(cim)).toThrow();
    });
});
