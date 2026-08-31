import { describe, it, expect } from 'vitest';
import { PROJECTS, PROJECT_CODES, getProject } from './mockData';

describe('project registry', () => {
  it('carries the four projects the programme runs', () => {
    expect(PROJECT_CODES).toEqual(['CBM', 'Church', 'HelpAge', 'Caritas']);
  });

  it('keeps codes unique, since they are what the database stores', () => {
    expect(new Set(PROJECTS.map(p => p.code)).size).toBe(PROJECTS.length);
  });

  it('gives every project a label, a badge class and print colours', () => {
    // A project missing any of these renders blank or unstyled somewhere
    // rather than failing loudly, so it is worth asserting on the shape.
    for (const p of PROJECTS) {
      expect(p.label.trim()).not.toBe('');
      expect(p.badgeClass).toMatch(/bg-\S+/);
      expect(p.printStyle).toMatch(/background:#[0-9a-f]{6}/i);
    }
  });

  it('gives every project a distinct badge colour', () => {
    // Two projects sharing a colour is the defect this registry replaced:
    // Help Age and Caritas both rendered in Church's green.
    expect(new Set(PROJECTS.map(p => p.badgeClass)).size).toBe(PROJECTS.length);
  });

  it('puts every project on the CBM form set', () => {
    for (const p of PROJECTS) expect(p.forms).toBe('cbm');
  });

  it('PROJECT_CODES stays in step with PROJECTS', () => {
    expect(PROJECT_CODES).toEqual(PROJECTS.map(p => p.code));
  });
});

describe('getProject', () => {
  it('finds each project by its code', () => {
    for (const p of PROJECTS) {
      expect(getProject(p.code)).toEqual(p);
    }
  });

  it('falls back to the first project rather than returning undefined', () => {
    // Callers read .label and .badgeClass straight off the result, so a miss
    // has to return something renderable. Old rows, a typo in an imported
    // sheet, or a project removed from the registry all land here.
    expect(getProject('NoSuchProject')).toEqual(PROJECTS[0]);
    expect(getProject(undefined)).toEqual(PROJECTS[0]);
    expect(getProject(null)).toEqual(PROJECTS[0]);
    expect(getProject('')).toEqual(PROJECTS[0]);
  });

  it('does not match on label, only on code', () => {
    // Import matches labels deliberately and separately; everywhere else the
    // stored value is the code, and quietly accepting a label here would hide
    // rows written with the wrong value.
    expect(getProject('Help Age')).toEqual(PROJECTS[0]);
  });
});
