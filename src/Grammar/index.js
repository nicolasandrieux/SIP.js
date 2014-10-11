var options = require('../../pegjs.json');
var fs = require('fs');
var grammar = fs.readFileSync('./src/Grammar/src/Grammar.pegjs').toString();
var PEG = require('pegjs');
var Grammar = PEG.buildParser(grammar, options);

module.exports = Grammar;
