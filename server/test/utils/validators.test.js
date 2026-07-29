const { expect } = require('chai');

const { isRecurrenceRule, isTimezone } = require('../../utils/validators');

describe('validators', () => {
  describe('#isTimezone()', () => {
    it('should accept UTC', () => {
      expect(isTimezone('UTC')).to.equal(true);
    });

    it('should accept modern IANA timezone aliases', () => {
      expect(isTimezone('Europe/Kyiv')).to.equal(true);
    });

    it('should reject invalid timezone strings', () => {
      expect(isTimezone('Not/A_Timezone')).to.equal(false);
    });
  });

  describe('#isRecurrenceRule()', () => {
    it('should accept supported custom rules', () => {
      expect(isRecurrenceRule('FREQ=MONTHLY;BYDAY=1MO')).to.equal(true);
    });

    it('should reject conflicting COUNT and UNTIL fields', () => {
      expect(isRecurrenceRule('FREQ=DAILY;COUNT=2;UNTIL=20260801T000000Z')).to.equal(false);
    });
  });
});
