import { describe, expect, it } from 'vitest';
import { hrefFor, parseHash } from '../../src/app/router';

describe('S4 router', () => {
  it('S4 EC-4: hrefFor and the hash parser round-trip values with & = + % # / comma emoji and 200 characters', () => {
    const hostile = ['R&D', 'a=b', 'C++', '100%', '#1', 'a/b', 'Engineer, senior', 'Zoë 🚀', 'x'.repeat(200), ' spaced  out ', '%E0'];
    const filters = { team: hostile, role: ['Senior engineer'], category: ['Data'] };
    const href = hrefFor('skills', null, filters);
    expect(href).not.toContain('+');
    expect(href.slice(href.indexOf('?') + 1)).not.toMatch(/[ #,]/);
    expect(parseHash(href)).toEqual({ screen: 'skills', param: null, filters });
    for (const team of hostile) {
      expect(parseHash(hrefFor('team', team, { role: [team] }))).toEqual({ screen: 'team', param: team, filters: { role: [team] } });
    }
    // '+' is never a space
    expect(parseHash('#/skills?role=a+b').filters).toEqual({ role: ['a+b'] });
  });

  it('S4 EC: the router ignores unknown filters and survives malformed hashes', () => {
    expect(parseHash('')).toEqual({ screen: 'overview', param: null, filters: {} });
    expect(parseHash('#/')).toEqual({ screen: 'overview', param: null, filters: {} });
    expect(parseHash('#/team')).toEqual({ screen: 'team', param: null, filters: {} });
    expect(parseHash('#/team/Data%20Platform')).toEqual({ screen: 'team', param: 'Data Platform', filters: {} });
    expect(parseHash('#/person/E0001').screen).toBe('person');
    expect(parseHash('#/person/').screen).toBe('not-found');
    expect(parseHash('#/skills/extra').screen).toBe('not-found');
    expect(parseHash('#/nowhere').screen).toBe('not-found');
    expect(parseHash('#/team/%E0').screen).toBe('not-found');
    expect(parseHash('#/skills?team=%E0').screen).toBe('not-found');
    const r = parseHash('#/skills?foo=1&__proto__=x&constructor=y&team=&team=A&team=A&role&category=Data');
    expect(r.filters).toEqual({ team: ['A'], category: ['Data'] });
    expect(Object.getPrototypeOf(r.filters)).toBe(Object.prototype);
    expect(hrefFor('overview')).toBe('#/');
    expect(hrefFor('skills', null, { team: ['Data Platform'] })).toBe('#/skills?team=Data%20Platform');
  });
});
