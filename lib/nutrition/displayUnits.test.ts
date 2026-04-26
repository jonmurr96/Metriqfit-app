import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatFoodQuantity,
  formatMacroDisplay,
  toGrams,
  toOunces,
  detectFoodCategory,
  getDefaultFoodMeasurement,
} from './displayUnits.ts';

describe('displayUnits', () => {
  describe('formatFoodQuantity', () => {
    it('shows grams for metric everything', () => {
      const p = formatFoodQuantity(150, 'protein', 'metric');
      assert.strictEqual(p.value, '150');
      assert.strictEqual(p.unit, 'g');
    });

    it('shows oz for imperial_mixed protein', () => {
      const p = formatFoodQuantity(150, 'protein', 'imperial_mixed');
      assert.strictEqual(p.unit, 'oz');
      assert.ok(parseFloat(p.value) > 5);
    });

    it('shows grams for imperial_mixed carbs', () => {
      const c = formatFoodQuantity(200, 'carb', 'imperial_mixed');
      assert.strictEqual(c.value, '200');
      assert.strictEqual(c.unit, 'g');
    });

    it('shows grams for imperial_mixed fat', () => {
      const f = formatFoodQuantity(50, 'fat', 'imperial_mixed');
      assert.strictEqual(f.value, '50');
      assert.strictEqual(f.unit, 'g');
    });

    it('rounds large oz to whole number', () => {
      const p = formatFoodQuantity(500, 'protein', 'imperial_mixed');
      assert.strictEqual(p.unit, 'oz');
      assert.strictEqual(p.value, '18'); // 500/28.3495 ≈ 17.64 -> rounds to 18
    });

    it('keeps one decimal for small oz', () => {
      const p = formatFoodQuantity(85, 'protein', 'imperial_mixed');
      assert.strictEqual(p.unit, 'oz');
      assert.ok(p.value.includes('.') || p.value === '3');
    });
  });

  describe('toGrams', () => {
    it('converts oz back to grams', () => {
      const grams = toGrams(5, 'oz');
      assert.ok(Math.abs(grams - 141.75) < 1);
    });

    it('passes through grams', () => {
      assert.strictEqual(toGrams(100, 'g'), 100);
    });
  });

  describe('toOunces', () => {
    it('converts grams to ounces', () => {
      assert.ok(Math.abs(toOunces(28.3495) - 1) < 0.001);
    });
  });

  describe('detectFoodCategory', () => {
    it('detects protein', () => {
      assert.strictEqual(detectFoodCategory('Grilled Chicken Breast'), 'protein');
      assert.strictEqual(detectFoodCategory('Salmon fillet'), 'protein');
      assert.strictEqual(detectFoodCategory('Whey protein powder'), 'protein');
    });

    it('detects carbs', () => {
      assert.strictEqual(detectFoodCategory('White rice'), 'carb');
      assert.strictEqual(detectFoodCategory('Sweet potato'), 'carb');
    });

    it('detects fat', () => {
      assert.strictEqual(detectFoodCategory('Avocado oil'), 'fat');
      assert.strictEqual(detectFoodCategory('Almond butter'), 'fat');
    });

    it('returns unknown for ambiguous items', () => {
      assert.strictEqual(detectFoodCategory('Mystery ingredient'), 'unknown');
    });
  });

  describe('formatMacroDisplay', () => {
    it('shows grams for metric macros', () => {
      const p = formatMacroDisplay(27, 'protein', 'metric');
      assert.strictEqual(p.value, '27');
      assert.strictEqual(p.unit, 'g');
    });

    it('shows grams for imperial_mixed protein macro (macros always stay in grams)', () => {
      const p = formatMacroDisplay(27, 'protein', 'imperial_mixed');
      assert.strictEqual(p.unit, 'g');
      assert.strictEqual(p.value, '27');
    });

    it('shows grams for imperial_mixed carbs macro', () => {
      const c = formatMacroDisplay(84, 'carbs', 'imperial_mixed');
      assert.strictEqual(c.value, '84');
      assert.strictEqual(c.unit, 'g');
    });

    it('shows grams for imperial_mixed fat macro', () => {
      const f = formatMacroDisplay(6, 'fat', 'imperial_mixed');
      assert.strictEqual(f.value, '6');
      assert.strictEqual(f.unit, 'g');
    });
  });

  describe('getDefaultFoodMeasurement', () => {
    it('maps imperial to imperial_mixed', () => {
      assert.strictEqual(getDefaultFoodMeasurement('imperial'), 'imperial_mixed');
    });

    it('maps metric to metric', () => {
      assert.strictEqual(getDefaultFoodMeasurement('metric'), 'metric');
    });

    it('falls back to metric for null', () => {
      assert.strictEqual(getDefaultFoodMeasurement(null), 'metric');
    });
  });
});
