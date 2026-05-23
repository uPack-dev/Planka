const { expect } = require('chai');

const { isTimezone } = require('../../utils/validators');

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
});
