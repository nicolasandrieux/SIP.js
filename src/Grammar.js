var Grammar = require('./Grammar/dist/Grammar');

module.exports = {
  parse: function parseCustom (input, startRule, SIP) {
    var options = {startRule: startRule, SIP: SIP};
    try {
      Grammar.parse(input, options);
    } catch (e) {
      options.data = -1;
    }
    return options.data;
  }
};